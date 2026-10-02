import {it,expect} from 'vitest';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { WORK_KEYS } from '../../src/contracts/index';
import { stats } from '../../src/application/index';
import { battleHarness,battleRaw } from '../fixtures/m3';
it('measures representative gameplay separately from logical maximum; three same-stream runs have identical hashes',()=>{
 const profiles=[];
 for(const count of [4,64]){const runs=[];let reference:string[]|null=null;
  for(let run=0;run<3;run++){
   const raw=battleRaw();if(count===64){raw.gameplay.obstacles=[];raw.gameplay.spawns=Array.from({length:64},(_,i)=>({xWorld:-400+(i%16)*50,yWorld:-180+Math.floor(i/16)*90,team:i%2,controller:`seat${i}`}));}else raw.gameplay.spawns=raw.gameplay.spawns.map((s,i)=>({...s,controller:`seat${i}`}));
   const before=performance.now(),h=battleHarness(raw),startupMs=performance.now()-before,times:number[]=[],hashes:string[]=[],maxWork=Object.fromEntries(WORK_KEYS.map(k=>[k,0])) as Record<typeof WORK_KEYS[number],number>;
   let ingressMs=0,maxProjectiles=0,maxAreas=0,damage=0,maxRoots=0;
   for(let n=1;n<=360;n++){
    const ingressAt=performance.now();if(n%15===1){for(let i=0;i<Math.min(8,count);i++){h.command('move',null,undefined,null,h.refs[i],n,{xWorld:n%60<30?0:1,yWorld:n%60<30?-1:0});const p=h.simulation.observe().battle?.units[i]?.position??{xWorld:0,yWorld:0};h.command('cast',(['bolt','field','mend','dash'] as const)[Math.floor(n/15+i)%4]??'mend',{xWorld:Math.min(450,p.xWorld+100),yWorld:p.yWorld},null,h.refs[i],n);}}ingressMs+=performance.now()-ingressAt;
    const start=performance.now();h.step();const ms=performance.now()-start;if(n>60)times.push(ms);hashes.push(h.simulation.debugHash());const b=h.debug.boundary(),v=h.simulation.observe().battle;
    for(const key of WORK_KEYS){maxWork[key]=Math.max(maxWork[key],b.capacity.tick[key]);expect(b.capacity.tick[key]).toBeLessThanOrEqual(h.catalog.certificate.tick[key]);}maxRoots=Math.max(maxRoots,b.capacity.rootCount);maxProjectiles=Math.max(maxProjectiles,v?.projectiles.length??0);maxAreas=Math.max(maxAreas,v?.areas.length??0);damage+=b.factDelivery.counts.find(c=>c.kind==='DamageResolved')?.count??0;
   }
   if(reference)expect(hashes).toEqual(reference);else reference=hashes;expect(damage).toBeGreaterThan(0);expect(maxAreas).toBeGreaterThan(0);expect(h.debug.fault()).toBeNull();
   runs.push({run,startupMs,tickCpuMs:stats(times),simulationCpuMsPerSecond:times.reduce((a,b)=>a+b,0)/10,commandIngressMsAcross12SimSeconds:ingressMs,maxWork,maxRoots,maxProjectiles,maxAreas,damageResolved:damage,finalHash:hashes.at(-1)});h.simulation.dispose();
  }profiles.push({id:count===4?'debug-battle-4':'representative-64-eight-active',units:count,activeControllers:Math.min(8,count),tickRate:30,warmupTicks:60,measuredTicks:300,runs});
 }
 fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/m3-gameplay-performance.json',JSON.stringify({status:'PASS',scope:'desktop Node software diagnostic; representative scripted commands, not Android performance/handfeel acceptance',logicalMaximumSeparate:true,profiles},null,2)+'\n');
},120000);
