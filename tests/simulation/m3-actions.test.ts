import { describe,it,expect } from 'vitest';
import { battleHarness,battleRaw } from '../fixtures/m3';
const player=(h:ReturnType<typeof battleHarness>)=>h.simulation.observe().battle?.units[0];
describe('M3 action vertical slice',()=>{
 it('reserves on start, commits on release exactly once, then recovers and recharges',()=>{
  const h=battleHarness();h.command('cast','bolt',{xWorld:300,yWorld:0});h.step();expect(player(h)?.reserved).toBe(15);expect(player(h)?.resource).toBe(200);expect(player(h)?.phase).toBe('windup');
  h.step(2);expect(player(h)?.reserved).toBe(15);h.step();expect(player(h)?.reserved).toBe(0);expect(player(h)?.resource).toBe(185);expect(player(h)?.phase).toBe('recovery');h.step(3);expect(player(h)?.phase).toBe('ready');expect(player(h)?.resource).toBeCloseTo(185.3);h.step(30);expect(player(h)?.cooldowns.find(c=>c.id==='bolt')?.charges).toBe(2);
 });
 it('cancels a reservation without spending; revalidates target at release',()=>{
  const h=battleHarness();h.command('cast','basic');h.step();h.command('cancelAction');h.step();expect(player(h)?.reserved).toBe(0);expect(player(h)?.resource).toBe(200);expect(h.debug.boundary().facts.some(f=>f.kind==='ActionInterrupted')).toBe(true);
  const raw=battleRaw();const basic=raw.gameplay.actions.find(a=>a.id==='basic');if(!basic)throw new Error('basic');basic.rangeWorld=70;raw.gameplay.spawns[1]={xWorld:-95,yWorld:0,team:1,controller:'target'};const x=battleHarness(raw);x.command('cast','basic');x.step();x.command('move',null,{xWorld:0,yWorld:0},null,x.refs[1],2,{xWorld:1,yWorld:0});x.step(3);expect(x.debug.boundary().factDelivery.counts.some(f=>f.kind==='ActionInterrupted')).toBe(true);expect(x.simulation.observe().battle?.units[1]?.health).toBe(1000);
 });
 it('spend-on-start cancellation refunds only the declared fraction',()=>{
  const raw=battleRaw();const a=raw.gameplay.actions.find(a=>a.id==='bolt');if(!a)throw new Error('bolt');a.cost.policy='start';a.cost.refundFraction=0.5;const h=battleHarness(raw);h.command('cast','bolt');h.step();expect(player(h)?.resource).toBe(185);h.command('cancelAction');h.step();expect(player(h)?.resource).toBeCloseTo(192.6);expect(player(h)?.reserved).toBe(0);
 });
 it('rejects wrong relation/range/actor and mutually exclusive starts',()=>{
  const h=battleHarness();h.command('cast','basic',{xWorld:300,yWorld:0},h.refs[3]);h.step();expect(h.debug.boundary().facts.some(f=>f.kind==='ActionStarted')).toBe(false);expect(player(h)?.resource).toBe(200);
  h.command('cast','bolt');h.command('cast','mend');const output=h.simulation.step();expect(output.commandResults.map(r=>r.reason)).toContain('busy');
 });
});
