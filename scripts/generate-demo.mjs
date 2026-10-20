import {writeFileSync} from 'node:fs';
const teams=[['BOS','Boston Celtics','#29c78b'],['LAL','Los Angeles Lakers','#d6ac56'],['GSW','Golden State Warriors','#588cf3'],['DAL','Dallas Mavericks','#55b9df'],['DEN','Denver Nuggets','#e2b957'],['NYK','New York Knicks','#ec8750']];
const names=[['Jayson Tatum','Jaylen Brown','Derrick White'],['LeBron James','Austin Reaves','Rui Hachimura'],['Stephen Curry','Draymond Green','Moses Moody'],['Kyrie Irving','Dereck Lively II','P.J. Washington'],['Nikola Jokić','Jamal Murray','Aaron Gordon'],['Jalen Brunson','Karl-Anthony Towns','Josh Hart']];
let seed=781;const rand=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
const stats=(base=22)=>{const fieldMade=4+rand(10),threeMade=rand(Math.min(fieldMade,7));return {points:2*fieldMade+threeMade+rand(9),rebounds:2+rand(12),assists:1+rand(10),threeMade,threeAttempted:threeMade+rand(7),fieldMade,fieldAttempted:fieldMade+rand(13),steals:rand(4),blocks:rand(4),turnovers:rand(6),minutes:25+rand(16)};};
const records=[];
for(let i=0;i<320;i++)for(let pair=0;pair<3;pair++){
 const ai=pair*2,bi=pair*2+1;const qa=Array.from({length:4},()=>22+rand(14)),qb=Array.from({length:4},()=>22+rand(14));
 const a={...stats(110),points:qa.reduce((a,b)=>a+b),fieldMade:36+rand(12),fieldAttempted:80+rand(20),minutes:240,rebounds:38+rand(20),assists:20+rand(18),threeMade:8+rand(10),threeAttempted:35+rand(15)};
 const b={...stats(110),points:qb.reduce((a,b)=>a+b),fieldMade:36+rand(12),fieldAttempted:80+rand(20),minutes:240,rebounds:38+rand(20),assists:20+rand(18),threeMade:8+rand(10),threeAttempted:35+rand(15)};
 for(const [ti,oi,q,oq,s,os] of [[ai,bi,qa,qb,a,b],[bi,ai,qb,qa,b,a]]){
 const date=new Date(Date.UTC(2026,9,18-i*2,23)).toISOString();const year=new Date(date).getUTCFullYear();const month=new Date(date).getUTCMonth();const start=month>=9?year:year-1;
 const common={date,team:teams[ti][0],opponent:teams[oi][0],venue:(i+ti)%2?'away':'home',season:`${start}-${String(start+1).slice(2)}`,competition:i%9===0?'Playoffs':'Temporada regular'};
 records.push({...common,...s,id:`t-${ti}-${i}`,kind:'team',entity:teams[ti][0],quarters:q,opponentQuarters:oq,opponentStats:{...os,quarters:oq,opponentQuarters:q}});
 names[ti].forEach((name,j)=>records.push({...common,...stats(j===0?27:18),id:`p-${ti}-${j}-${i}`,kind:'player',entity:name}));
 }
}
const schedule=Array.from({length:9},(_,i)=>({id:`demo-${i}`,date:new Date(Date.UTC(2026,9,21+Math.floor(i/3),i%3,30)).toISOString(),home:teams[(i%3)*2][0],away:teams[(i%3)*2+1][0],competition:'Temporada regular'}));
const dataset={meta:{mode:'demo',source:'Datos sintéticos · no representan partidos ni plantillas reales',updatedAt:'2026-10-20T12:00:00Z'},teams:teams.map(([id,name,color])=>({id,name,color})),schedule,records};
writeFileSync('public/data/demo.json',JSON.stringify(dataset));
