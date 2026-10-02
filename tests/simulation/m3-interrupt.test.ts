import {it,expect} from 'vitest';
import { battleHarness,battleRaw } from '../fixtures/m3';
function effect(h:ReturnType<typeof battleHarness>,id:string,tick:number,target=h.refs[0]){return h.simulation.enqueue({matchId:h.config.matchId,controllerId:'fixture',sequence:tick,targetTick:tick,actorRef:h.refs[1],kind:'debugEffect',producer:'fixture',effect:id,targets:[target]});}
it('control interrupts windup and refunds reservation within the causing M2 root; expiry unlocks future actions',()=>{
 const h=battleHarness();h.command('cast','mend');h.step();expect(h.simulation.observe().battle?.units[0]?.reserved).toBe(15);effect(h,'boltHit',2);h.step();const b=h.debug.boundary();expect(h.simulation.observe().battle?.units[0]?.reserved).toBe(0);expect(h.simulation.observe().battle?.units[0]?.resource).toBe(200);expect(b.facts.some(f=>f.kind==='ActionInterrupted')).toBe(true);expect(new Set(b.facts.filter(f=>f.operation).map(f=>f.operation?.rootId)).size).toBe(1);
 h.command('cast','bolt');expect(h.simulation.step().commandResults[0]?.reason).toBe('controlled');h.step(17);h.command('cast','bolt');expect(h.simulation.step().commandResults[0]?.outcome).toBe('accepted');
});
it('death cleans reservation in the same Tick and post-release cancellation never refunds a committed cost',()=>{
 const raw=battleRaw();raw.formulas=raw.formulas.map(f=>f.id==='boltDamage'?{...f,expression:{...f.expression,value:1000}}:f);const h=battleHarness(raw);h.command('cast','mend');h.step();effect(h,'boltHit',2);h.step();expect(h.simulation.observe().battle?.units[0]?.alive).toBe(false);expect(h.simulation.observe().battle?.units[0]?.reserved).toBe(0);
 const x=battleHarness();x.command('cast','bolt');x.step(4);const before=x.simulation.observe().battle?.units[0]?.resource??0;x.command('cancelAction');x.step();expect(x.simulation.observe().battle?.units[0]?.resource).toBeCloseTo(before+.1);
});
it('recharge/cooldown uses Tick and cooldown start/end are distinct',()=>{
 for(const phase of ['start','end']){const raw=battleRaw(),a=raw.gameplay.actions.find(a=>a.id==='mend');if(!a)throw new Error('mend');a.cooldownStart=phase;const h=battleHarness(raw);h.command('cast','mend');h.step(7);expect(h.simulation.observe().battle?.units[0]?.cooldowns.find(c=>c.id==='mend')?.readyTick).toBe(phase==='start'?31:37);}
});
it('32 insufficient-resource attempts do not escape the proven producer root bound',()=>{
 const raw=battleRaw();const mana=raw.resources.find(r=>r.id==='mana');if(!mana)throw new Error('mana');mana.initial=0;mana.regenPerSecond=0;const h=battleHarness(raw);for(let i=0;i<32;i++)h.command('cast','bolt');const output=h.simulation.step();expect(output.commandResults.filter(r=>r.reason==='resource')).toHaveLength(1);expect(output.commandResults.filter(r=>r.reason==='busy')).toHaveLength(31);expect(h.debug.boundary().capacity.rootCount).toBe(1);expect(h.debug.fault()).toBeNull();
});
it('direct displacement sweeps; teleport skips intervening walls but enforces destination blockers and discontinuity',()=>{
 const base=battleRaw();base.gameplay.spawns[0]={xWorld:-100,yWorld:0,team:0,controller:'player'};base.gameplay.spawns[1]={xWorld:200,yWorld:0,team:1,controller:null};
 const content=(mode:string)=>({...base,effects:base.effects.map(e=>e.id==='dash'?{...e,node:{kind:'displace',mode,distanceWorld:160,speedWorldPerSecond:1,wall:'stop',units:'stop'}}:e)});
 const d=battleHarness(content('direct'));d.command('cast','dash',{xWorld:300,yWorld:0},null);d.step();expect(d.simulation.observe().battle?.units[0]?.position.xWorld).toBe(-22);
 const t=battleHarness(content('teleport'));t.command('cast','dash',{xWorld:300,yWorld:0},null);t.step();expect(t.simulation.observe().battle?.units[0]?.position.xWorld).toBe(60);expect(t.simulation.observe().battle?.units[0]?.discontinuity).toBe(true);
 base.gameplay.spawns[1]={xWorld:60,yWorld:0,team:1,controller:null};const blocked=battleHarness(content('teleport'));blocked.command('cast','dash',{xWorld:300,yWorld:0},null);blocked.step();expect(blocked.simulation.observe().battle?.units[0]?.position.xWorld).toBe(-100);
});
it('declared non-interruptible cast survives new control while future cast starts are still denied',()=>{
 const raw=battleRaw(),mend=raw.gameplay.actions.find(a=>a.id==='mend');if(!mend)throw new Error('mend');mend.interruptOnControl=false;const h=battleHarness(raw);h.command('cast','mend');h.step();effect(h,'boltHit',2);h.step(3);expect(h.simulation.observe().battle?.units[0]?.reserved).toBe(0);expect(h.simulation.observe().battle?.units[0]?.resource).toBe(185);expect(h.simulation.observe().battle?.units[0]?.shield).toBe(100);h.step(3);h.command('cast','bolt');expect(h.simulation.step().commandResults[0]?.reason).toBe('controlled');
});
it('M2 maximum-resource clamp invalidates and releases an outstanding reservation atomically',()=>{
 const raw=battleRaw();const content={...raw,modifiers:[...raw.modifiers,{id:'smallMana',durationMs:1000,maxInstancesPerEntity:1,contributions:[{attribute:'maxMana',bucket:'override',value:5,priority:1}],tags:[],control:'none',deathSaveHealth:null,pulse:null,end:null,hooks:[]}],effects:[...raw.effects,{id:'clamp',node:{kind:'applyStatus',modifier:'smallMana'}}],ruleset:{...raw.ruleset,producers:raw.ruleset.producers.map(p=>({...p,effects:[...p.effects,'clamp']}))}};const h=battleHarness(content);h.command('cast','bolt');h.step();effect(h,'clamp',2);h.step();expect(h.simulation.observe().battle?.units[0]?.reserved).toBe(0);expect(h.simulation.observe().battle?.units[0]?.resource).toBe(5);expect(h.debug.boundary().facts.some(f=>f.kind==='ActionInterrupted'&&f.reason==='reservationInvalid')).toBe(true);
});
