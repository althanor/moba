import {it,expect} from 'vitest';
import {battleHarness,battleRaw} from '../fixtures/m3';
it('a 3600/s projectile crosses and hits a target within one 30Hz Tick, then wall ends it',()=>{
 const h=battleHarness();h.command('cast','bolt',{xWorld:300,yWorld:0},null);h.step(4);expect(h.simulation.observe().battle?.units[1]?.health).toBe(920);expect(h.simulation.observe().battle?.units[1]?.statuses).toEqual(['stun']);expect(h.debug.boundary().factDelivery.counts.find(f=>f.kind==='DamageResolved')?.count).toBe(1);h.step(2);expect(h.simulation.observe().battle?.units[1]?.health).toBe(920);expect(h.simulation.observe().battle?.projectiles.length).toBe(0);
});
it('ordered multi hit is TOI then handle; single hit and expiry never repeat',()=>{
 const raw=battleRaw(),projectile=raw.gameplay.projectiles[0];if(!projectile)throw new Error('projectile');raw.gameplay.obstacles=[];projectile.speedWorldPerSecond=12000;raw.gameplay.spawns[2]={xWorld:-95,yWorld:0,team:1,controller:null};raw.gameplay.spawns[3]={xWorld:100,yWorld:0,team:1,controller:null};const h=battleHarness(raw);h.command('cast','bolt',{xWorld:300,yWorld:0},null);h.step(4);expect(h.debug.boundary().facts.filter(f=>f.kind==='DamageResolved').map(f=>f.target.index)).toEqual([1,2,3]);h.step();expect(h.simulation.observe().battle?.units.slice(1).map(u=>u.health)).toEqual([920,920,920]);
 projectile.hits='single';const x=battleHarness(raw);x.command('cast','bolt',{xWorld:300,yWorld:0},null);x.step(4);expect(x.simulation.observe().battle?.units.slice(1).map(u=>u.health)).toEqual([920,1000,1000]);expect(x.simulation.observe().battle?.projectiles).toHaveLength(0);
 projectile.speedWorldPerSecond=1;projectile.lifetimeMs=1;const e=battleHarness(raw);e.command('cast','bolt',{xWorld:300,yWorld:0},null);e.step(5);expect(e.simulation.observe().battle?.projectiles).toHaveLength(0);expect(e.simulation.observe().battle?.units[1]?.health).toBe(1000);
});
it('Area enter/pulse/exit/expiry uses half-open ticks and stable membership',()=>{
 const raw=battleRaw(),area=raw.gameplay.areas[0],target=raw.gameplay.spawns[1];if(!area||!target)throw new Error('area');area.enter='attack';area.exit='attack';area.expiry='mend';area.durationMs=1000;target.controller='target';const h=battleHarness(raw);h.command('cast','field',{xWorld:-95,yWorld:0},null);h.step(7);expect(h.simulation.observe().battle?.units[1]?.health).toBe(960);h.step(9);expect(h.simulation.observe().battle?.units[1]?.health).toBe(950);
 h.command('move',null,{xWorld:0,yWorld:0},null,h.refs[1],17,{xWorld:0,yWorld:1});h.step(22);expect(h.simulation.observe().battle?.areas).toHaveLength(0);expect(h.simulation.observe().battle?.units[1]?.health).toBe(900);
});
