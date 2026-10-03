import { test,expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { BattleView } from '../../src/contracts/index';
import { touchLayout } from '../../src/foundation/index';
import fs from 'node:fs';
async function state(page:Page):Promise<BattleView>{return JSON.parse(await page.locator('#battle').getAttribute('data-state')??'{}') as BattleView;}
async function start(page:Page){await page.goto('./');await expect(page.locator('#status')).toContainText('running');await expect.poll(async()=> (await state(page)).units?.length).toBe(4);}
async function skill(page:Page,id:string){const view=await state(page),bounds=await page.locator('canvas').boundingBox();if(!bounds)throw new Error('canvas');const index=view.actions.findIndex(a=>a.id===id),b=touchLayout(bounds.width,bounds.height,6).buttons[index];if(!b)throw new Error(id);return {x:bounds.x+b.xCss,y:bounds.y+b.yCss};}
test('public debug battle composes attacks, projectile, healing/shield, Area and dash via real pointer input',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
 for(const id of ['basic','bolt','mend','field','dash']){const point=await skill(page,id);await page.mouse.click(point.x,point.y);await expect.poll(async()=> (await state(page)).units[0]?.cooldowns.find(c=>c.id===id)?.charges,{message:id}).toBeLessThan(id==='bolt'?2:1);if(id==='mend')expect((await state(page)).units[0]?.shield).toBe(100);await page.waitForTimeout(250);}
 const view=await state(page);expect(view.units[1]?.health).toBeLessThan(1000);expect(view.units[0]?.resource).toBeLessThan(200);expect(view.areas.length).toBe(1);expect(errors).toEqual([]);await expect(page.locator('#error')).toBeEmpty();await page.screenshot({path:'reports/m3-debug-battle.png'});
});
test('target lock uses authoritative refs; clearing a held joystick on export or lost capture stops intent',async({page,context})=>{
 await start(page);const b=await page.locator('canvas').boundingBox();if(!b)throw new Error('canvas');const v=await state(page),target=v.units[1];if(!target)throw new Error('target');
 await page.mouse.click(b.x+(target.position.xWorld-v.arena.minX)/(v.arena.maxX-v.arena.minX)*b.width,b.y+(target.position.yWorld-v.arena.minY)/(v.arena.maxY-v.arena.minY)*b.height);
 await expect.poll(async()=>(await state(page)).units[0]?.lock?.index).toBe(target.ref.index);const basic=await skill(page,'basic');await page.mouse.click(basic.x,basic.y);await expect.poll(async()=>(await state(page)).units[1]?.health).toBeLessThan(1000);
 const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+64,y:b.y+b.height-64,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+112,y:b.y+b.height-64,id:1}]});await expect.poll(async()=>(await state(page)).units[0]?.position.xWorld).toBeGreaterThan(-170);
 const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'导出测量'}).click();await waiting;await expect(page.locator('#status')).toContainText('指针 0');await page.waitForTimeout(150);const stopped=(await state(page)).units[0]?.position;await page.waitForTimeout(200);expect((await state(page)).units[0]?.position).toEqual(stopped);await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await cdp.detach();
 await page.getByRole('button',{name:'重建 Session',exact:true}).click();await page.mouse.move(b.x+64,b.y+b.height-64);await page.mouse.down();await page.mouse.move(b.x+64,b.y+b.height-112);await expect.poll(async()=>(await state(page)).units[0]?.position.yWorld).toBeLessThan(0);
 await page.evaluate(()=>{const c=document.querySelector('canvas');c?.dispatchEvent(new PointerEvent('lostpointercapture',{pointerId:1}));});await expect(page.locator('#status')).toContainText('指针 0');await page.mouse.up();await page.waitForTimeout(150);const lost=(await state(page)).units[0]?.position;await page.waitForTimeout(200);expect((await state(page)).units[0]?.position).toEqual(lost);
});
test('two CDP touch contacts move and aim/cast; cancellation never spends; pointer loss cleans both contacts',async({page,context})=>{
 await start(page);const cdp=await context.newCDPSession(page),b=await page.locator('canvas').boundingBox();if(!b)throw new Error('canvas');const cast=await skill(page,'bolt'),initial=(await state(page)).units[0]?.position;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+70,y:b.y+b.height-65,id:1},{...cast,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+118,y:b.y+b.height-65,id:1},{x:cast.x+40,y:cast.y,id:2}]});await expect(page.locator('#status')).toContainText('指针 2');await expect.poll(async()=> (await state(page)).units[0]?.position.xWorld).toBeGreaterThan(initial?.xWorld??-170);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{x:cast.x+40,y:cast.y,id:2}]});await expect.poll(async()=> (await state(page)).units[0]?.cooldowns.find(c=>c.id==='bolt')?.charges).toBe(1);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await expect(page.locator('#status')).toContainText('指针 0');
 await page.getByRole('button',{name:'重建 Session',exact:true}).click();await expect.poll(async()=> (await state(page)).units[0]?.resource).toBe(200);
 const cancelCast=await skill(page,'field');await page.mouse.move(cancelCast.x,cancelCast.y);await page.mouse.down();await page.mouse.move(b.x+b.width-30,b.y+30);await page.mouse.up();await page.waitForTimeout(250);expect((await state(page)).units[0]?.resource).toBe(200);expect((await state(page)).areas).toHaveLength(0);
});
test('M3 pause/orientation/blur, explicit resume, 20 recreations and gameplay measurement export',async({page})=>{
 await start(page);await page.setViewportSize({width:540,height:960});await expect(page.locator('#status')).toContainText('orientation');await page.setViewportSize({width:960,height:540});await expect(page.locator('#status')).toContainText('paused');await page.getByRole('button',{name:'恢复',exact:true}).click();
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect(page.locator('#status')).toContainText('hidden');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.locator('#status')).toContainText('paused');await page.getByRole('button',{name:'恢复',exact:true}).click();
 for(let i=0;i<20;i++)await page.getByRole('button',{name:'重建 Session',exact:true}).click();await expect(page.locator('canvas')).toHaveCount(1);await expect(page.locator('#error')).toBeEmpty();
 const bolt=await skill(page,'bolt');await page.mouse.click(bolt.x,bolt.y);await page.waitForTimeout(350);const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出测量'}).click();const file=await(await download).path();if(!file)throw new Error('download');const report=JSON.parse(fs.readFileSync(file,'utf8'));expect(report.phase).toBe('M3');expect(report.config.tickRate).toBe(30);expect(report.hardwareStatus).toContain('awaiting');expect(report.measurement.byInteraction['skill:bolt'].acceptance.count).toBeGreaterThan(0);expect(report.battle.disclosure).toBe('public-debug-arena-v1');
});

test.afterEach(async({page},info)=>{if(info.status===info.expectedStatus)return;const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'导出测量'}).click();const file=await(await waiting).path();if(file){const report=JSON.parse(fs.readFileSync(file,'utf8'));console.log(JSON.stringify({debug:report.debug,traces:report.measurement.traces,player:report.battle.units[0]},null,2));}});
for(const mode of ['A','B'])test(`ultrawide 1503x536 gameplay ${mode}: rendered diagonal movement and multi-touch aim line follow CSS finger vectors`,async({page,context})=>{
 await page.setViewportSize({width:1503,height:536});await start(page);await page.getByRole('button',{name:mode==='A'?'A 插值':'B 即时反馈',exact:true}).click();
 const b=await page.locator('canvas').boundingBox();if(!b)throw new Error('canvas');expect(b.width/b.height).toBeCloseTo(1503/536,2);
 const cdp=await context.newCDPSession(page),bolt=await skill(page,'bolt');const joystick={x:b.x+64,y:b.y+b.height-64,id:1},aim={...bolt,id:2};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[joystick,aim]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...joystick,x:joystick.x+24,y:joystick.y-24},{...aim,x:aim.x-24,y:aim.y-24}]});
 await expect(page.locator('#status')).toContainText('指针 2');await expect.poll(async()=>{const u=(await state(page)).units[0];return u?u.position.yWorld-u.previous.yWorld:0;}).toBeLessThan(0);
 const v=await state(page),u=v.units[0];if(!u)throw new Error('unit');const dx=(u.position.xWorld-u.previous.xWorld)*b.width/(v.arena.maxX-v.arena.minX),dy=(u.position.yWorld-u.previous.yWorld)*b.height/(v.arena.maxY-v.arena.minY);
 expect(dx).toBeGreaterThan(0);expect(dx+dy).toBeCloseTo(0,7);expect(Math.hypot(u.position.xWorld-u.previous.xWorld,u.position.yWorld-u.previous.yWorld)).toBeCloseTo(6*Math.SQRT1_2,7);
 await expect.poll(async()=>page.locator('canvas').getAttribute('data-aim-line-css')).not.toBeNull();const line=JSON.parse(await page.locator('canvas').getAttribute('data-aim-line-css')??'[]') as number[];
 const lx=(line[2]??0)-(line[0]??0),ly=(line[3]??0)-(line[1]??0);expect(lx).toBeLessThan(0);expect(ly).toBeLessThan(0);expect(lx-ly).toBeCloseTo(0,7);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{...aim,x:aim.x-24,y:aim.y-24}]});await expect.poll(async()=>(await state(page)).units[0]?.cooldowns.find(c=>c.id==='bolt')?.charges).toBe(1);await expect(page.locator('#error')).toBeEmpty();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await expect(page.locator('#status')).toContainText('指针 0');await cdp.detach();await expect(page.locator('#status')).toContainText('running');
});
test('three alternating gameplay A/B pairs: turns, blocking, dash, projectile, cancel, CC and multitouch; exports software metrics',async({page,context})=>{
 test.setTimeout(120000);const pairs=[];await start(page);
 for(let round=0;round<3;round++)for(const mode of ['A','B']){
  await page.getByRole('button',{name:mode==='A'?'A 插值':'B 即时反馈',exact:true}).click();await expect(page.locator('#status')).toContainText(`${mode} · running`);
  const bounds=await page.locator('canvas').boundingBox();if(!bounds)throw new Error('canvas');
  // Release-time CC interrupts the longer Area cast; all events are authoritative gameplay.
  await page.getByRole('button',{name:'控制挑战',exact:true}).click();const field=await skill(page,'field');await page.mouse.click(field.x,field.y);await expect.poll(async()=> (await state(page)).units[0]?.statuses.length).toBeGreaterThan(0);await expect.poll(async()=> (await state(page)).units[0]?.statuses.length).toBe(0);
  await page.mouse.move(bounds.x+64,bounds.y+bounds.height-64);await page.mouse.down();await page.mouse.move(bounds.x+112,bounds.y+bounds.height-64);await page.waitForTimeout(400);await page.mouse.move(bounds.x+64,bounds.y+bounds.height-112);await page.waitForTimeout(350);await page.mouse.move(bounds.x+112,bounds.y+bounds.height-64);await page.waitForTimeout(500);await page.mouse.up();
  for(const id of ['dash','bolt']){const p=await skill(page,id);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.waitForTimeout(80);await page.mouse.move(p.x+30,p.y-20);await page.waitForTimeout(80);await page.mouse.up();await page.waitForTimeout(300);}
  const p=await skill(page,'field');await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width-30,bounds.y+140);await page.waitForTimeout(80);await page.mouse.up();
  const cdp=await context.newCDPSession(page),mend=await skill(page,'mend');await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:bounds.x+70,y:bounds.y+bounds.height-65,id:1},{...mend,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:bounds.x+70,y:bounds.y+bounds.height-110,id:1},{x:mend.x-30,y:mend.y,id:2}]});await page.waitForTimeout(120);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{x:mend.x-30,y:mend.y,id:2}]});await page.waitForTimeout(250);await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await cdp.detach();
  const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'导出测量'}).click();const file=await(await waiting).path();if(!file)throw new Error('download');const report=JSON.parse(fs.readFileSync(file,'utf8'));expect(report.config.tickRate).toBe(30);expect(report.measurement.captureToAcceptance.count).toBeGreaterThan(0);expect(report.measurement.captureToRelease.count).toBeGreaterThan(0);expect(report.measurement.touchToVisual.count).toBeGreaterThan(0);await expect(page.locator('#error')).toBeEmpty();await expect(page.locator('#status')).toContainText('running');pairs.push({round,mode,...report});
 }
 fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/m3-gameplay-ab.json',JSON.stringify({status:'PASS',scope:'desktop headless Chromium / software submission timing; human handfeel and Android thermal unavailable',tickRate:30,A:'previous/current default',B:'presentation-only <=1 Tick experimental',C:'NOT_APPLICABLE: no 30 Hz authority defect demonstrated',pairs},null,2)+'\n');
});

interface InputState { sessionId:string;tick:number;state:string;pointerIds:number[];canMove:boolean;position:{xWorld:number;yWorld:number};health:number;enemyBoltCharges:number;projectileIds:number[];predicting:boolean }
async function inputState(page:Page):Promise<InputState>{return JSON.parse(await page.locator('canvas').getAttribute('data-input-state')??'{}') as InputState;}
async function actionCount(page:Page,action:string):Promise<number>{return Number(await page.locator(`[data-action="${action}"]`).getAttribute('data-activation-count'));}
async function buttonPoint(page:Page,action:string){const box=await page.locator(`[data-action="${action}"]`).boundingBox();if(!box)throw new Error(action);return{x:box.x+box.width/2,y:box.y+box.height/2,id:2};}
for(const mode of ['A','B'])test(`toolbar multitouch ${mode}: held joystick + control once, authority CC stops and held contact resumes`,async({page,context})=>{
 await start(page);await page.locator(`[data-action="mode${mode}"]`).click();await expect(page.locator('#status')).toContainText(`${mode} · running`);
 const cdp=await context.newCDPSession(page),b=await page.locator('canvas').boundingBox();if(!b)throw new Error('canvas');
 const origin={x:b.x+64,y:b.y+b.height-64,id:1},held={...origin,x:origin.x-12},control=await buttonPoint(page,'control');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[origin]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[held]});await expect.poll(async()=>(await inputState(page)).position.xWorld).toBeLessThan(-170);
 const before=await inputState(page),count=await actionCount(page,'control');expect(before.pointerIds).toHaveLength(1);
 // Observe every rendered authoritative sample, including the short release/hit window.
 await page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)throw new Error('canvas');const rows:string[]=[];const observer=new MutationObserver(()=>{const s=c.dataset.inputState;if(s&&rows[rows.length-1]!==s)rows.push(s);});observer.observe(c,{attributes:true,attributeFilter:['data-input-state']});Object.assign(window,{toolbarTrace:rows,toolbarObserver:observer});});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[held,control]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[control]});
 await expect.poll(async()=>actionCount(page,'control')).toBe(count+1);await expect(page.locator('[data-action="control"]')).toHaveAttribute('data-activation-source','touch');
 await expect.poll(async()=>(await inputState(page)).canMove).toBe(false);const stopped=await inputState(page);expect(stopped.pointerIds).toEqual(before.pointerIds);expect(stopped.enemyBoltCharges).toBe(1);expect(stopped.health).toBe(920);expect(stopped.predicting).toBe(false);
 await expect.poll(async()=>(await inputState(page)).tick).toBeGreaterThan(stopped.tick+3);expect((await inputState(page)).position).toEqual(stopped.position);
 await expect.poll(async()=>(await inputState(page)).canMove).toBe(true);
 // No further touchMove/start occurs: the original contact must resume by itself.
 await expect.poll(async()=>(await inputState(page)).position.xWorld).toBeLessThan(stopped.position.xWorld);
 const after=await inputState(page);expect(after.pointerIds).toEqual(before.pointerIds);expect(after.health).toBe(920);expect(after.enemyBoltCharges).toBeGreaterThanOrEqual(1);expect(await actionCount(page,'control')).toBe(count+1);
 const trace=await page.evaluate(()=>{const w=window as unknown as {toolbarTrace:string[];toolbarObserver:MutationObserver};w.toolbarObserver.disconnect();return w.toolbarTrace;});const frames=trace.map(s=>JSON.parse(s) as InputState);
 expect(frames.some(f=>f.canMove&&f.health===1000&&f.position.xWorld<before.position.xWorld)).toBe(true);
 expect(Math.min(...frames.map(f=>f.enemyBoltCharges))).toBe(1);const projectileIds=new Set(frames.flatMap(f=>f.projectileIds));expect(projectileIds.size).toBeLessThanOrEqual(1);expect(frames.every(f=>f.pointerIds.join(',')===before.pointerIds.join(','))).toBe(true);
 if(mode==='B'){expect(frames.some(f=>f.predicting&&f.health===1000)).toBe(true);expect(after.predicting).toBe(true);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await cdp.detach();await expect(page.locator('#status')).toContainText('指针 0');await expect(page.locator('#error')).toBeEmpty();
});
test('toolbar multitouch: held joystick + pause clears pointers, freezes Tick and resumes with neutral intent',async({page,context})=>{
 await start(page);const cdp=await context.newCDPSession(page),b=await page.locator('canvas').boundingBox();if(!b)throw new Error('canvas');const origin={x:b.x+64,y:b.y+b.height-64,id:1},held={...origin,x:origin.x-24};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[origin]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[held]});await expect.poll(async()=>(await inputState(page)).position.xWorld).toBeLessThan(-170);
 const pause=await buttonPoint(page,'pause');await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[held,pause]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[pause]});
 await expect(page.locator('#status')).toContainText('paused');await expect(page.locator('#status')).toContainText('指针 0');expect(await actionCount(page,'pause')).toBe(1);
 const paused=await inputState(page);await page.waitForTimeout(150);expect(await inputState(page)).toEqual(paused);
 // Release only the toolbar touch for resume; the cleared old Canvas contact is still physically held.
 const resume=await buttonPoint(page,'resume');await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[held,resume]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[resume]});await expect(page.locator('#status')).toContainText('running');await expect.poll(async()=>(await inputState(page)).tick).toBeGreaterThan(paused.tick+4);
 expect((await inputState(page)).position).toEqual(paused.position);expect((await inputState(page)).pointerIds).toEqual([]);expect(await actionCount(page,'resume')).toBe(1);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await cdp.detach();await expect(page.locator('#error')).toBeEmpty();
});
test('toolbar touch activation counts recreate/mode/export exactly once and emits one download',async({page,context})=>{
 await start(page);const cdp=await context.newCDPSession(page),downloads:string[]=[];page.on('download',d=>downloads.push(d.suggestedFilename()));
 for(const action of ['recreate','modeB','modeA','export']){const before=await inputState(page),count=await actionCount(page,action),p=await buttonPoint(page,action);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect.poll(async()=>actionCount(page,action)).toBe(count+1);
 if(action!=='export'){await expect.poll(async()=>(await inputState(page)).sessionId).not.toBe(before.sessionId);expect(Number((await inputState(page)).sessionId.split('-')[1])).toBe(Number(before.sessionId.split('-')[1])+1);}else await expect.poll(()=>downloads.length).toBe(1);
 }
 await page.waitForTimeout(150);expect(downloads).toHaveLength(1);for(const a of ['recreate','modeB','modeA','export'])expect(await actionCount(page,a)).toBe(1);await cdp.detach();await expect(page.locator('#error')).toBeEmpty();
});
test('toolbar desktop and keyboard/accessibility click each activate once; solo control still uses enemy action',async({page})=>{
 await start(page);const downloads:string[]=[];page.on('download',d=>downloads.push(d.suggestedFilename()));
 for(const a of ['recreate','modeB','modeA']){const before=await inputState(page);await page.locator(`[data-action="${a}"]`).click();await expect.poll(async()=>(await inputState(page)).sessionId).not.toBe(before.sessionId);expect(Number((await inputState(page)).sessionId.split('-')[1])).toBe(Number(before.sessionId.split('-')[1])+1);expect(await actionCount(page,a)).toBe(1);}
 await page.locator('[data-action="control"]').click();await expect.poll(async()=>(await inputState(page)).canMove).toBe(false);expect((await inputState(page)).health).toBe(920);expect((await inputState(page)).enemyBoltCharges).toBe(1);expect(await actionCount(page,'control')).toBe(1);
 await page.locator('[data-action="export"]').click();await expect.poll(()=>downloads.length).toBe(1);expect(await actionCount(page,'export')).toBe(1);
 const pause=page.locator('[data-action="pause"]');await pause.focus();await page.keyboard.press('Enter');await expect(page.locator('#status')).toContainText('paused');expect(await actionCount(page,'pause')).toBe(1);
 const resume=page.locator('[data-action="resume"]');await resume.focus();await page.keyboard.press('Space');await expect(page.locator('#status')).toContainText('running');expect(await actionCount(page,'resume')).toBe(1);
 await pause.evaluate(e=>(e as HTMLButtonElement).click());await expect(page.locator('#status')).toContainText('paused');expect(await actionCount(page,'pause')).toBe(2);expect(downloads).toHaveLength(1);
});
test('toolbar control preserves held joystick and skill contacts through a third CDP touch, without casting the held skill',async({page,context})=>{
 await start(page);const cdp=await context.newCDPSession(page),b=await page.locator('canvas').boundingBox();if(!b)throw new Error('canvas');const origin={x:b.x+64,y:b.y+b.height-64,id:1},held={...origin,x:origin.x-12},aim={...await skill(page,'bolt'),id:2},control={...await buttonPoint(page,'control'),id:3};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[origin,aim]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[held,{...aim,y:aim.y-24}]});await expect(page.locator('#status')).toContainText('指针 2');const before=await inputState(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[held,{...aim,y:aim.y-24},control]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[control]});
 await expect.poll(async()=>(await inputState(page)).canMove).toBe(false);expect((await inputState(page)).pointerIds).toEqual(before.pointerIds);await expect(page.locator('canvas')).toHaveAttribute('data-aim-line-css',/.+/);expect((await state(page)).units[0]?.cooldowns.find(c=>c.id==='bolt')?.charges).toBe(2);
 const stopped=(await inputState(page)).position;await expect.poll(async()=>(await inputState(page)).canMove).toBe(true);await expect.poll(async()=>(await inputState(page)).position.xWorld).toBeLessThan(stopped.xWorld);expect((await inputState(page)).pointerIds).toEqual(before.pointerIds);expect(await actionCount(page,'control')).toBe(1);
 // End the skill contact only after CC expires; its normal release still works.
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{...aim,y:aim.y-24}]});await expect.poll(async()=>(await state(page)).units[0]?.cooldowns.find(c=>c.id==='bolt')?.charges).toBe(1);await expect(page.locator('#status')).toContainText('指针 1');await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await cdp.detach();await expect(page.locator('#error')).toBeEmpty();
});

for(const mode of ['A','B'])test(`skill-control region ${mode}: 1503x536 CDP joystick + interstitial gap ignores targetLock, battlefield tap preserves lock`,async({page,context})=>{
 await page.setViewportSize({width:1503,height:536});await start(page);await page.locator(`[data-action="mode${mode}"]`).click();
 const b=await page.locator('canvas').boundingBox();if(!b)throw new Error('canvas');expect(b.width).toBe(1503);expect(b.height).toBeCloseTo(536,0);
 const layout=touchLayout(b.width,b.height,6),r=layout.skillControl;if(!r)throw new Error('skill control');const left=layout.buttons[1],right=layout.buttons[0];if(!left||!right)throw new Error('buttons');
 const gap={x:(left.xCss+right.xCss)/2,y:left.yCss};const androidGap={x:1444.63,y:466.04};
 for(const p of [gap,androidGap]){expect(p.x).toBeGreaterThan(r.minXCss);expect(p.x).toBeLessThan(r.maxXCss);expect(p.y).toBeGreaterThan(r.minYCss);expect(p.y).toBeLessThan(r.maxYCss);for(const button of layout.buttons)expect(Math.hypot(p.x-button.xCss,p.y-button.yCss)).toBeGreaterThan(button.radiusCss);}
 const cdp=await context.newCDPSession(page),origin={x:b.x+64,y:b.y+b.height-64,id:1},held={...origin,x:origin.x-12};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[origin]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[held]});await expect.poll(async()=>(await inputState(page)).position.xWorld).toBeLessThan(-170);
 const ids=(await inputState(page)).pointerIds;expect(ids).toHaveLength(1);expect((await state(page)).units[0]?.lock).toBeNull();
 const tapGap=async(p:{x:number;y:number})=>{const second={x:b.x+p.x,y:b.y+p.y,id:2},moved={...second,x:second.x+1};const before=(await inputState(page)).position.xWorld;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[held,second]});await expect.poll(async()=>(await inputState(page)).pointerIds.length).toBe(2);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[held,moved]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[moved]});
  await expect.poll(async()=>(await inputState(page)).pointerIds).toEqual(ids);await expect.poll(async()=>(await inputState(page)).position.xWorld).toBeLessThan(before);
 };
 await tapGap(gap);expect((await state(page)).units[0]?.lock).toBeNull();await tapGap(androidGap);expect((await state(page)).units[0]?.lock).toBeNull();
 const view=await state(page),enemy=view.units[2];if(!enemy)throw new Error('enemy');const target={x:b.x+(enemy.position.xWorld-view.arena.minX)/(view.arena.maxX-view.arena.minX)*b.width,y:b.y+(enemy.position.yWorld-view.arena.minY)/(view.arena.maxY-view.arena.minY)*b.height,id:2};
 expect(target.y-b.y).toBeLessThan(r.minYCss);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[held,target]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[target]});
 await expect.poll(async()=>(await state(page)).units[0]?.lock).toEqual(enemy.ref);await tapGap(gap);expect((await state(page)).units[0]?.lock).toEqual(enemy.ref);expect((await inputState(page)).pointerIds).toEqual(ids);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[held]});await expect.poll(async()=>(await inputState(page)).pointerIds).toEqual([]);await cdp.detach();
 const download=page.waitForEvent('download');await page.locator('[data-action="export"]').click();const file=await(await download).path();if(!file)throw new Error('download');const report=JSON.parse(fs.readFileSync(file,'utf8'));
 type Trace={interaction:string;sample:{pointerId:number;phase:string;screenCssX:number;screenCssY:number};queuedAtMs?:number;acceptedAtMs?:number};const traces=report.measurement.traces as Trace[],ignored=traces.filter(t=>t.interaction==='ignored');
 expect(ignored.filter(t=>t.sample.phase==='begin')).toHaveLength(3);expect(ignored.filter(t=>t.sample.phase==='move')).toHaveLength(3);expect(ignored.filter(t=>t.sample.phase==='end')).toHaveLength(3);for(const t of ignored){expect(t.queuedAtMs).toBeUndefined();expect(t.acceptedAtMs).toBeUndefined();}
 const targets=traces.filter(t=>t.interaction==='target'&&t.sample.phase==='end');expect(targets).toHaveLength(1);expect(targets[0]?.queuedAtMs).toBeDefined();expect(targets[0]?.acceptedAtMs).toBeDefined();expect(report.battle.units[0].lock).toEqual(enemy.ref);
 fs.writeFileSync(`reports/m3-043-gap-${mode}.json`,JSON.stringify({status:'PASS',scope:'software Chromium real CDP simultaneous Canvas contacts; Android retest pending',viewport:{width:1503,height:536},region:r,buttons:layout.buttons,gap,androidGap,mode,heldPointerIds:ids,finalPointerIds:[],lock:enemy.ref,ignored,targets},null,2)+'\n');await expect(page.locator('#error')).toBeEmpty();
});
test('skill-control region: concrete bolt still previews and casts through CDP press/drag/release',async({page,context})=>{
 await page.setViewportSize({width:1503,height:536});await start(page);const cdp=await context.newCDPSession(page),p={...await skill(page,'bolt'),id:1},drag={...p,x:p.x-24,y:p.y-24};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[drag]});await expect(page.locator('canvas')).toHaveAttribute('data-aim-line-css',/.+/);expect((await state(page)).units[0]?.cooldowns.find(c=>c.id==='bolt')?.charges).toBe(2);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[drag]});await expect.poll(async()=>(await state(page)).units[0]?.cooldowns.find(c=>c.id==='bolt')?.charges).toBe(1);await expect.poll(async()=>(await state(page)).units[0]?.resource).toBeLessThan(200);expect((await state(page)).units[0]?.resource).toBeGreaterThanOrEqual(185);await expect.poll(async()=>(await inputState(page)).pointerIds).toEqual([]);await cdp.detach();await expect(page.locator('#error')).toBeEmpty();
});
test('mend shield is exactly 100 on release, pauses without expiry, and expires at release + 60 authority Ticks',async({page})=>{
 await start(page);const p=await skill(page,'mend');await page.mouse.click(p.x,p.y);await expect.poll(async()=>(await state(page)).units[0]?.shield).toBe(100);await page.locator('[data-action="pause"]').click();await expect(page.locator('#status')).toContainText('paused');
 const player=(await state(page)).units[0],ready=player?.cooldowns.find(c=>c.id==='mend');if(!ready)throw new Error('mend cooldown');const releaseTick=ready.readyTick-30,endTick=releaseTick+60,paused=await inputState(page);expect(paused.tick).toBeLessThan(endTick);expect(player?.shield).toBe(100);
 await page.waitForTimeout(200);expect((await inputState(page)).tick).toBe(paused.tick);expect((await state(page)).units[0]?.shield).toBe(100);
 for(let tick=paused.tick+1;tick<endTick;tick++){await page.locator('[data-action="step"]').click();await expect.poll(async()=>(await inputState(page)).tick).toBe(tick);}
 await expect.poll(async()=>(await state(page)).units[0]?.shield).toBe(100);await page.locator('[data-action="step"]').click();await expect.poll(async()=>(await inputState(page)).tick).toBe(endTick);await expect.poll(async()=>(await state(page)).units[0]?.shield).toBe(0);await expect(page.locator('#status')).toContainText('paused');await expect(page.locator('#error')).toBeEmpty();
 fs.writeFileSync('reports/m3-043-mend.json',JSON.stringify({status:'PASS',shieldOnRelease:100,releaseTick,expiryTick:endTick,durationTicks:60,pausedTick:paused.tick,pausePreservesShield:true,shieldAtExpiry:0,scope:'real pointer cast; toolbar pause/single-step; authority BattleView'},null,2)+'\n');
});
