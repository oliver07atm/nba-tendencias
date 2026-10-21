import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describeStructure,runProbe,ATTRIBUTION} from '../scripts/lib/nbastat/probe.mjs';
import {githubQuotaStore} from '../scripts/lib/nbastat/github-quota.mjs';
import {emptyLedger,HOUR} from '../scripts/lib/nbastat/client.mjs';
const config=JSON.parse(readFileSync(new URL('../nbastat-source.json',import.meta.url)));
// FICTITIOUS wire shapes: these do NOT assert the provider's real field names.
const fixture={invented_game:{invented_points:123,invented_name:'FICTICIO'},invented_players:[{invented_id:990001,invented_status:'FICTICIO DNP'},{invented_id:990002,invented_minutes:0}],token:'NEVER_PRINT',authorization:'Bearer NEVER_PRINT'};
const setup=(extra={})=>{let state=emptyLedger(),calls=0;const times=[];return {options:{config,confirmation:'INSPECT_1369',token:'FICTITIOUS_PRIVATE_TOKEN',clock:()=>Date.parse('2031-01-01T00:00:00Z'),store:{readLedger:async()=>state,writeLedger:async next=>{state=next;times.push('reserve');},withLock:callback=>callback()},fetchImpl:async(url,options)=>{calls++;times.push('http');assert.equal(url.href,'https://nbastat.io/api/v1/games/1369/boxscore');assert.equal(options.headers.Authorization,'Bearer FICTITIOUS_PRIVATE_TOKEN');return new Response(JSON.stringify(fixture));},...extra},get calls(){return calls;},get state(){return state;},times};};
test('Probe requires explicit confirmation, permissions and token; zero network otherwise',async()=>{
 for(const change of [{confirmation:''},{token:''},{config:{...config,publicJsonPermission:'pending'}},{config:{...config,permissionEvidence:''}}]){
  const s=setup(change);await assert.rejects(runProbe(s.options));assert.equal(s.calls,0);assert.equal(s.state.attempts.length,0);
 }
 assert.equal(config.enabled,false);assert.equal(config.responseSchema,'unverified');
});
test('One fixed-game request reserves first; returns shape only, never player/stat/token values',async()=>{
 const s=setup(),result=await runProbe(s.options),serialized=JSON.stringify(result);
 assert.equal(s.calls,1);assert.deepEqual(s.times,['reserve','http']);assert.equal(result.qualityVerified,false);assert.equal(result.statisticsPublished,false);assert.equal(result.attribution,ATTRIBUTION);
 for(const forbidden of ['FICTITIOUS_PRIVATE_TOKEN','NEVER_PRINT','FICTICIO DNP','990001','123','Bearer'])assert.ok(!serialized.includes(forbidden));
 assert.ok(result.structure.fields.some(f=>f.path==='$.invented_players[*].invented_minutes'&&f.types.includes('number')));
});
test('Structural inspection redacts values, sensitive/dynamic keys and bounds depth',()=>{
 const malicious={...fixture,'<script>':'x','api_key':'secret','FICTITIOUS_PRIVATE_TOKEN':'secret',deep:{}};let p=malicious.deep;for(let i=0;i<20;i++)p=p.child={};
 const result=describeStructure(malicious,'FICTITIOUS_PRIVATE_TOKEN'),serialized=JSON.stringify(result);assert.equal(result.valuesIncluded,false);assert.equal(result.truncated,true);
 for(const forbidden of ['<script>','api_key','token','authorization','FICTITIOUS_PRIVATE_TOKEN','secret'])assert.ok(!serialized.includes(forbidden));
});
test('Rolling quota and 429 block next run; failures consume reservations without retries',async()=>{
 const now=Date.parse('2031-01-01T00:00:00Z'),ledger={version:1,attempts:Array(10).fill(now-100),blockedUntil:0};
 const blocked=setup({store:{readLedger:async()=>ledger,writeLedger:async()=>assert.fail(),withLock:f=>f()}});assert.equal((await runProbe(blocked.options)).status,'deferred');assert.equal(blocked.calls,0);
 const limited=setup({fetchImpl:async()=>new Response('PRIVATE BODY NEVER PRINT',{status:429,headers:{'Retry-After':'7200'}})});await assert.rejects(runProbe(limited.options),/HTTP_429/);assert.equal(limited.state.attempts.length,1);assert.equal(limited.state.blockedUntil,now+2*HOUR);assert.equal((await runProbe(limited.options)).status,'deferred');
 const failed=setup({fetchImpl:async()=>{throw Error('TOKEN IN RAW ERROR');}});await assert.rejects(runProbe(failed.options),e=>e.message==='NETWORK');assert.equal(failed.state.attempts.length,1);
});
function fakeGit({pushFails=false,existing=false}={}){
 const calls=[];let written='';const sha='a'.repeat(40);
 const git=(args,input)=>{calls.push(args);if(args[0]==='ls-remote')return existing?sha+'\trefs/heads/nbastat-probe-quota\n':'';if(args[0]==='fetch')return '';if(args[0]==='show')return JSON.stringify(emptyLedger());if(args[0]==='hash-object'){written=input;return sha;}if(args[0]==='mktree'||args.includes('commit-tree'))return sha;if(args[0]==='push'){if(pushFails)throw Error('PUSH_FAILURE');return '';}throw Error('Unexpected git command');};
 return {git,calls,get written(){return written;}};
}
test('Durable remote quota is timestamp-only, recovers state and compare-and-swaps before HTTP',async()=>{
 const g=fakeGit({existing:true}),s=setup({store:githubQuotaStore({git:g.git})});await runProbe(s.options);const saved=JSON.parse(g.written);
 assert.deepEqual(Object.keys(saved).sort(),['attempts','blockedUntil','version']);assert.equal(saved.attempts.length,1);assert.ok(g.calls.some(a=>a[0]==='fetch'));assert.ok(g.calls.some(a=>a[0]==='push'&&a.includes('--force-with-lease=refs/heads/nbastat-probe-quota:'+'a'.repeat(40))));
 const fail=fakeGit({pushFails:true}),blocked=setup({store:githubQuotaStore({git:fail.git})});await assert.rejects(runProbe(blocked.options));assert.equal(blocked.calls,0);
});
test('Workflow is dispatch-only, main-only, no artifacts/Pages/browser; secret is step-scoped',()=>{
 const text=readFileSync(new URL('../.github/workflows/nbastat-probe.yml',import.meta.url),'utf8');assert.ok(text.includes('workflow_dispatch:'));assert.ok(!/schedule:|pull_request:|^  push:/m.test(text));assert.ok(text.includes("github.ref == 'refs/heads/main'"));assert.ok(text.includes('secrets.NBASTAT_API_TOKEN'));assert.ok(text.includes('cancel-in-progress: false'));assert.ok(!/upload-artifact|upload-pages|deploy-pages|npm run build/.test(text));
 const cli=readFileSync(new URL('../scripts/probe-nbastat.mjs',import.meta.url),'utf8');assert.ok(cli.includes("GITHUB_EVENT_NAME!=='workflow_dispatch'"));assert.ok(!cli.includes('console.log(result)'));assert.ok(!cli.includes('JSON.stringify(error)'));
 const pages=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');assert.ok(!pages.toLowerCase().includes('nbastat'));
});

test('Both manual workflows confirm external-client exclusivity without an inactivity requirement',()=>{
 for(const [workflow,script] of [['nbastat-probe.yml','probe-nbastat.mjs'],['nbastat-values.yml','probe-nbastat-values.mjs']]){
  const yaml=readFileSync(new URL('../.github/workflows/'+workflow,import.meta.url),'utf8');
  const cli=readFileSync(new URL('../scripts/'+script,import.meta.url),'utf8');
  assert.ok(yaml.includes('no_external_clients:'));assert.ok(yaml.includes('inputs.no_external_clients'));assert.ok(yaml.includes('CONFIRM_NO_EXTERNAL_CLIENTS: ${{ inputs.no_external_clients }}'));
  assert.ok(cli.includes("process.env.CONFIRM_NO_EXTERNAL_CLIENTS!=='true'"));
  assert.ok(!/unused_account|CONFIRM_UNUSED_ACCOUNT|60 minutos|inactividad/.test(yaml+cli));
  assert.ok(yaml.includes('group: nbastat-account-quota'));assert.ok(yaml.includes('cancel-in-progress: false'));
  assert.ok(cli.includes('store:githubQuotaStore()'));
 }
});
