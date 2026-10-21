import test from 'node:test';import assert from 'node:assert/strict';
import {githubQuotaStore} from '../scripts/lib/nbastat/github-quota.mjs';
import {quotaDecision,HOUR} from '../scripts/lib/nbastat/client.mjs';
test('Future private collector explicitly targets the existing shared quota remote, never initializes it',async()=>{
 const calls=[];const store=githubQuotaStore({remote:'shared-quota',requireExisting:true,git:args=>{calls.push(args);return '';}});
 await assert.rejects(store.withLock(()=>assert.fail('must not reach API')),/SHARED_LEDGER_MISSING/);
 assert.deepEqual(calls,[['ls-remote','--heads','shared-quota','refs/heads/nbastat-probe-quota']]);
 assert.throws(()=>githubQuotaStore({remote:'shared-quota'}),/EXISTING_LEDGER_REQUIRED/);
 assert.throws(()=>githubQuotaStore({remote:'https://credential@example.com/repo'}),/ALIAS_INVALID/);
});
test('Collector reads existing shared reservations and block state instead of getting a fresh allowance',async()=>{
 const now=Date.parse('2031-01-03T01:00:00Z'),sha='a'.repeat(40),ledger={version:1,attempts:Array(10).fill(now-1000),blockedUntil:now+2*HOUR},before=JSON.stringify(ledger),calls=[];
 const store=githubQuotaStore({remote:'shared-quota',requireExisting:true,git:args=>{calls.push(args);if(args[0]==='ls-remote')return sha+'\trefs/heads/nbastat-probe-quota';if(args[0]==='fetch')return '';if(args[0]==='show')return before;assert.fail('No write or HTTP allowed');}});
 await store.withLock(async()=>{const state=await store.readLedger();assert.deepEqual(state,ledger);assert.equal(quotaDecision(state,now).allowed,false);});
 assert.ok(calls.filter(a=>['fetch','ls-remote'].includes(a[0])).every(a=>a.includes('shared-quota')));assert.equal(JSON.stringify(ledger),before);
});
