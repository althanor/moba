import {it,expect} from 'vitest';
import { circleTOI,rectTOI } from '../../src/foundation/index';
import { SpatialGrid } from '../../src/simulation/index';
import { battleHarness,battleRaw } from '../fixtures/m3';
it('continuous circle/rectangle collision, tangent and zero length boundaries',()=>{
 expect(circleTOI({xWorld:0,yWorld:0},{xWorld:100,yWorld:0},{xWorld:50,yWorld:0},5)).toBeCloseTo(.45);
 expect(circleTOI({xWorld:0,yWorld:0},{xWorld:0,yWorld:0},{xWorld:50,yWorld:0},5)).toBeNull();
 expect(rectTOI({xWorld:-50,yWorld:0},{xWorld:50,yWorld:0},{minX:-5,minY:-5,maxX:5,maxY:5},5)).toBeCloseTo(.4);
 expect(rectTOI({xWorld:-10,yWorld:0},{xWorld:-20,yWorld:0},{minX:-5,minY:-5,maxX:5,maxY:5},5)).toBeNull();
});
it('spatial radius/cone/nearest/sweep are stable, finite and include intermediate moving target cells',()=>{
 const h=battleHarness(),g=h.catalog.document.gameplay;if(!g)throw new Error('g');const scanCounts:Record<string,number>={};const grid=new SpatialGrid(g,(kind,n)=>scanCounts[kind]=(scanCounts[kind]??0)+n);
 grid.rebuild([{ref:{index:2,generation:1},team:1,position:{xWorld:100,yWorld:0},previous:{xWorld:100,yWorld:0},alive:true,targetable:true},{ref:{index:1,generation:1},team:1,position:{xWorld:0,yWorld:200},previous:{xWorld:0,yWorld:-200},alive:true,targetable:true}]);
 expect(grid.query({kind:'sweep',from:{xWorld:-100,yWorld:0},to:{xWorld:100,yWorld:0},radiusWorld:1,movingTargets:true},0,'enemy').map(h=>h.ref.index)).toEqual([1,2]);
 expect(grid.query({kind:'cone',center:{xWorld:0,yWorld:0},direction:{xWorld:1,yWorld:0},radiusWorld:150,cosine:.5},0,'enemy').map(h=>h.ref.index)).toEqual([2]);
 expect(grid.query({kind:'radius',center:{xWorld:0,yWorld:0},radiusWorld:250},0,'enemy').map(h=>h.ref.index)).toEqual([2,1]);expect(scanCounts['spatial']).toBeGreaterThan(0);
});
it('joystick moves at tick speed and stops at walls and units without tunnelling',()=>{
 const raw=battleRaw();raw.gameplay.spawns[0]={xWorld:-100,yWorld:-100,team:0,controller:'player'};const h=battleHarness(raw);h.command('move',null,{xWorld:0,yWorld:0},null,h.refs[0],1,{xWorld:1,yWorld:0});h.step(5);expect(h.simulation.observe().battle?.units[0]?.position.xWorld).toBeCloseTo(-70);
 h.command('move',null,{xWorld:0,yWorld:0},null,h.refs[0],6,{xWorld:0,yWorld:0});h.step(3);expect(h.simulation.observe().battle?.units[0]?.position.xWorld).toBeCloseTo(-70);
 const x=battleHarness();x.command('move',null,{xWorld:0,yWorld:0},null,x.refs[0],1,{xWorld:1,yWorld:0});x.step(30);expect(x.simulation.observe().battle?.units[0]?.position.xWorld).toBeCloseTo(-119);
 raw.gameplay.spawns[0]={xWorld:-100,yWorld:0,team:0,controller:'player'};raw.gameplay.spawns[1]={xWorld:200,yWorld:0,team:1,controller:null};const w=battleHarness(raw);w.command('move',null,{xWorld:0,yWorld:0},null,w.refs[0],1,{xWorld:1,yWorld:0});w.step(30);expect(w.simulation.observe().battle?.units[0]?.position.xWorld).toBeCloseTo(-22);
});
it('active dash stops at obstacle; forced movement has independent capability semantics',()=>{
 const raw=battleRaw();raw.gameplay.spawns[0]={xWorld:-100,yWorld:0,team:0,controller:'player'};raw.gameplay.spawns[1]={xWorld:200,yWorld:0,team:1,controller:null};const h=battleHarness(raw);h.command('cast','dash',{xWorld:200,yWorld:0},null);h.step(5);expect(h.simulation.observe().battle?.units[0]?.position.xWorld).toBeCloseTo(-22);
 const p=battleHarness();p.command('cast','push',{xWorld:200,yWorld:0},p.refs[1]);p.step(10);expect(p.simulation.observe().battle?.units[1]?.position.xWorld).toBeCloseTo(-22);
});
it('ordinary movement and stop have compiler-proven Operation/Fact lineage in P2/P3',()=>{
 const h=battleHarness();h.command('move',null,undefined,null,h.refs[0],1,{xWorld:0,yWorld:-1});h.step();const facts=h.debug.boundary().facts.filter(f=>f.operation?.producer==='m3.movement');expect(facts.some(f=>f.phase==='P2'&&f.operation?.payload.kind==='movementIntent')).toBe(true);expect(facts.some(f=>f.phase==='P3'&&f.operation?.payload.kind==='movementStep')).toBe(true);expect(h.debug.boundary().capacity.producers.find(p=>p.id==='m3.movement')?.roots).toBe(2);h.command('move',null,undefined,null,h.refs[0],2,{xWorld:0,yWorld:0});h.step();expect(h.debug.boundary().facts.some(f=>f.operation?.payload.kind==='movementIntent')).toBe(true);expect(h.simulation.observe().battle?.units[0]?.position).toEqual(h.simulation.observe().battle?.units[0]?.previous);
});
