import raw from '../../content/m3-battle.json';
import { compileContent } from '../../src/content/index';
import { createCombatRuntime } from '../../src/simulation/index';
import { matchId, sessionId } from '../../src/foundation/index';
import type { ContentId, EngineCapacityProfile, GameplayCommand } from '../../src/contracts/index';
export function battleRaw(){const value=structuredClone(raw);return {...value,gameplay:{...value.gameplay,areas:value.gameplay.areas.map(a=>({...a,enter:a.enter as string|null,pulse:a.pulse as string|null,exit:a.exit as string|null,expiry:a.expiry as string|null}))}};}
export function battleHarness(input:unknown=battleRaw(),rate=30){
 const result=compileContent(input,rate);if(!result.ok)throw new Error(JSON.stringify(result.diagnostics));const catalog=result.catalog,c=catalog.certificate,g=catalog.document.gameplay;if(!g)throw new Error('gameplay');
 const profile:EngineCapacityProfile={id:'m3-test-certified',capacity:c.limit,startup:c.startupLimit,command:c.commandLimit,roots:c.rootCountLimit,queryTargets:c.maxUnits,hookDepth:c.maxHookDepth,units:c.maxUnits,statuses:c.maxStatusesGlobal,factQueue:c.factQueueLimit};
 const config={catalog,profile,tickRate:rate,seed:42,matchId:matchId('m3-test'),sessionId:sessionId('m3-test'),roster:g.spawns.map(()=>({level:1,base:{}}))};
 const runtime=createCombatRuntime(config,{factArchive:'summary'});const refs=runtime.debug.boundary().entities.map(e=>e.ref);let seq=0;
 const command=(kind:GameplayCommand['kind'],action:string|null=null,point={xWorld:170,yWorld:0},target=refs[1]??null,actor=refs[0],targetTick=runtime.debug.boundary().tick+1,direction={xWorld:0,yWorld:0})=>{
  if(!actor)throw new Error('actor');return runtime.simulation.enqueue({matchId:config.matchId,controllerId:g.spawns[actor.index]?.controller??'player',sequence:++seq,targetTick,actorRef:actor,kind,payload:{action:action as ContentId|null,point,target,direction}});
 };
 return {...runtime,catalog,profile,config,refs,command,step:(n=1)=>{for(let i=0;i<n;i++)runtime.simulation.step();return runtime.simulation.observe().battle;}};
}
