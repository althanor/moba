import Phaser from 'phaser';
import type { PresentationFrame, PresentationHost, RawInput } from '../../../contracts/index';
import { along, movementRectTOI, touchLayout } from '../../../foundation/index';
import type { Vec2 } from '../../../foundation/index';
import { PointerTracker } from '../../input/pointer-tracker';
import { VisualProxy } from '../entities/visual-proxy';

export class BattleScene extends Phaser.Scene {
  readonly #host: PresentationHost;
  readonly #tracker = new PointerTracker();
  readonly #proxy = new VisualProxy();
  #labels: Phaser.GameObjects.Text[] = [];
  #grid: Phaser.GameObjects.Graphics | null = null;
  #shapes: Phaser.GameObjects.Graphics | null = null;
  #feedback = new Map<number, RawInput>();
  #sampleSequence = 0;
  #lastPosition: Vec2 | null = null;
  #lastSession = '';
  #lastCanMove: boolean | null = null;
  #lastUIAtMs = 0;
  #disposeInput: (() => void) | null = null;
  #pendingUI = new Set<number>();
  #pendingVisual = new Set<number>();
  #frameStartedAtMs = 0;
  #lastFrameAtMs: number | null = null;
  #frameDurationMs = 0;
  constructor(host: PresentationHost) { super('M3-Battle'); this.#host = host; }
  create(): void {
    this.#grid = this.add.graphics(); this.#shapes = this.add.graphics(); this.#drawGrid();
    for (let i=0;i<6;i++) this.#labels.push(this.add.text(0,0,'',{fontSize:'12px',color:'#ffffff',align:'center'}).setOrigin(.5));
    this.game.events.on(Phaser.Core.Events.POST_RENDER, this.#postRender, this);
    this.scale.on('resize', this.#drawGrid, this);
    const canvas = this.game.canvas;
    const handler = (phase: RawInput['phase']) => (event: PointerEvent): void => {
      event.preventDefault(); const bounds = canvas.getBoundingClientRect();
      const sample: RawInput = Object.freeze({ sampleId: ++this.#sampleSequence, pointerId: event.pointerId, phase,
        screenCssX: event.clientX - bounds.left, screenCssY: event.clientY - bounds.top, capturedAtMs: this.#host.nowMs() });
      if (!this.#tracker.accept(sample)) return;
      if (phase === 'begin') canvas.setPointerCapture(event.pointerId);
      this.#feedback.set(event.pointerId, sample); this.#host.input(sample, bounds.width, bounds.height);
    };
    const down = handler('begin'), move = handler('move'), up = handler('end'), cancel = handler('cancel');
    const lost = (event: PointerEvent): void => {
      if (this.#tracker.samples.some(sample => sample.pointerId === event.pointerId)) cancel(event);
    };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', cancel); canvas.addEventListener('lostpointercapture', lost);
    this.#disposeInput = () => {
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', cancel); canvas.removeEventListener('lostpointercapture', lost); this.clearInput();
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.#disposeInput?.(); this.#disposeInput = null; this.scale.off('resize', this.#drawGrid, this);
      this.game.events.off(Phaser.Core.Events.POST_RENDER, this.#postRender, this);
    });
  }
  clearInput(): void {
    for (const sample of this.#tracker.samples) {
      if (this.game.canvas.hasPointerCapture(sample.pointerId)) this.game.canvas.releasePointerCapture(sample.pointerId);
    }
    this.#tracker.clear(); this.#feedback.clear(); this.#proxy.clear(); this.#lastPosition = null; this.#lastCanMove = null; this.#pendingUI.clear(); this.#pendingVisual.clear();
  }
  #drawGrid(): void {
    const grid = this.#grid; if (!grid) return;
    grid.clear(); grid.lineStyle(1, 0x24323e, 1);
    for (let x = 0; x < this.scale.width; x += 48) { grid.moveTo(x, 0); grid.lineTo(x, this.scale.height); }
    for (let y = 0; y < this.scale.height; y += 48) { grid.moveTo(0, y); grid.lineTo(this.scale.width, y); }
    grid.strokePath();
  }
  override update(): void {
    // Ignore Phaser's smoothed delta. One frame pulse uses injected monotonic wall time.
    const nowMs = this.#host.nowMs();
    this.#frameStartedAtMs = nowMs;
    this.#frameDurationMs = this.#lastFrameAtMs === null ? 0 : nowMs - this.#lastFrameAtMs;
    this.#lastFrameAtMs = nowMs;
    const frame = this.#host.frame(nowMs);
    if (!frame.inputEnabled || frame.observation.sessionId !== this.#lastSession) this.clearInput();
    this.#lastSession = frame.observation.sessionId;
    const player = frame.observation.battle?.units[0];
    if (frame.inputEnabled && player?.alive && player.canMove && this.#lastCanMove === false) {
      // CC cleared authority intent. A stationary held contact is still input:
      // resample once at the observed capability transition, never synthesize
      // begin/end or mutate authority. Cleared/lost contacts cannot be restored.
      const bounds = this.game.canvas.getBoundingClientRect();
      for (const held of this.#tracker.samples) {
        const sample: RawInput = Object.freeze({ ...held, phase: 'move', sampleId: ++this.#sampleSequence, capturedAtMs: nowMs });
        this.#tracker.accept(sample); this.#feedback.set(sample.pointerId, sample);
        this.#host.input(sample, bounds.width, bounds.height);
      }
    }
    this.#lastCanMove = frame.inputEnabled && player ? player.canMove : null;
    this.#render(frame, nowMs);
  }
  #render(frame: PresentationFrame, nowMs: number): void {
    const shapes = this.#shapes; if (!shapes) return;
    shapes.clear();
    const view=frame.observation.battle; if(!view)return;
    const bounds=this.game.canvas.getBoundingClientRect(), sx=this.scale.width/(view.arena.maxX-view.arena.minX), sy=this.scale.height/(view.arena.maxY-view.arena.minY);
    const xy=(p:Vec2):Vec2=>({xWorld:(p.xWorld-view.arena.minX)*sx,yWorld:(p.yWorld-view.arena.minY)*sy});
    const circle=(p:Vec2,r:number,colour:number,fill=false):void=>{const q=xy(p);if(fill){shapes.fillStyle(colour,.8);shapes.fillEllipse(q.xWorld,q.yWorld,r*2*sx,r*2*sy);}else{shapes.lineStyle(1,colour);shapes.strokeEllipse(q.xWorld,q.yWorld,r*2*sx,r*2*sy);}};
    for(const o of view.obstacles){shapes.fillStyle(0x40505b);shapes.fillRect((o.minX-view.arena.minX)*sx,(o.minY-view.arena.minY)*sy,(o.maxX-o.minX)*sx,(o.maxY-o.minY)*sy);}
    for(const a of view.areas)circle(a.position,a.radiusWorld,0x8e73d7);
    const player=view.units[0];if(!player)return;
    const enabled=frame.inputEnabled&&frame.probeMode==='B'&&player.alive&&player.canMove&&player.phase==='ready';
    // Public debug arena input diagnostics only; excluded from Simulation/hash.
    this.game.canvas.dataset.inputState=JSON.stringify({sessionId:frame.observation.sessionId,tick:frame.debug.tick,
      state:frame.debug.state,pointerIds:this.#tracker.samples.map(s=>s.pointerId),canMove:player.canMove,
      position:player.position,health:player.health,enemyBoltCharges:view.units[1]?.cooldowns.find(c=>c.id==='bolt')?.charges,
      projectileIds:view.projectiles.map(p=>p.id),predicting:enabled&&(frame.localDirection.xWorld!==0||frame.localDirection.yWorld!==0)});
    const motion={ref:player.ref,previous:player.previous,current:player.position,discontinuity:player.discontinuity};
    let local=this.#proxy.position({...frame.observation,entities:[motion]},frame.alpha,nowMs,frame.localDirection,enabled,1000/frame.debug.tickRate,player.speedWorldPerSecond);
    if(local&&enabled){let toi=1;for(const o of view.obstacles){const t=movementRectTOI(player.position,local,o,12);if(t!==null)toi=Math.min(toi,t);}local=along(player.position,local,toi);}
    for(const u of view.units){const position=u.ref.index===player.ref.index?local:along(u.previous,u.position,u.discontinuity?1:frame.alpha);if(!position)continue;circle(position,12,u.alive?(u.team===player.team?0x68c8ff:0xe56c70):0x667078,true);const q=xy(position);shapes.fillStyle(0x222222);shapes.fillRect(q.xWorld-20,q.yWorld-23,40,4);shapes.fillStyle(0x51cf88);shapes.fillRect(q.xWorld-20,q.yWorld-23,40*Math.max(0,u.health/u.maximumHealth),4);if(player.lock?.index===u.ref.index)circle(position,18,0xffd166);if(u.statuses.length)circle(position,16,0xeedd55);}
    circle(player.position,14,0x51cf88);
    for(const p of view.projectiles)circle(along(p.previous,p.position,frame.alpha),p.radiusWorld,0xffcc55,true);
    for(const sample of frame.releaseSampleIds??[])this.#pendingVisual.add(sample);
    delete this.game.canvas.dataset.aimLineCss;
    if(frame.aimPreview){this.#pendingVisual.add(frame.aimPreview.sampleId);circle(frame.aimPreview.point,Math.max(8,frame.aimPreview.radiusWorld),frame.aimPreview.cancel?0xff5c6c:0x6fdac7);const from=xy(player.position),to=xy(frame.aimPreview.point);shapes.lineStyle(1,0x6fdac7);shapes.lineBetween(from.xWorld,from.yWorld,to.xWorld,to.yWorld);
      // Presentation-only diagnostic of the exact Graphics line; never enters Command or Simulation.
      this.game.canvas.dataset.aimLineCss=JSON.stringify([from.xWorld*bounds.width/this.scale.width,from.yWorld*bounds.height/this.scale.height,to.xWorld*bounds.width/this.scale.width,to.yWorld*bounds.height/this.scale.height]);}
    const layout=touchLayout(bounds.width,bounds.height,view.actions.length),cssX=this.scale.width/bounds.width,cssY=this.scale.height/bounds.height;
    shapes.lineStyle(2,0x88aabb);shapes.strokeCircle(layout.joystick.xCss*cssX,layout.joystick.yCss*cssY,layout.joystick.radiusCss*cssX);
    shapes.lineStyle(2,0xff5c6c);shapes.strokeCircle(layout.cancel.xCss*cssX,layout.cancel.yCss*cssY,layout.cancel.radiusCss*cssX);
    for(let i=0;i<layout.buttons.length;i++){const b=layout.buttons[i],action=view.actions[i],label=this.#labels[i];if(!b||!action||!label)continue;const cd=player.cooldowns.find(c=>c.id===action.id),remaining=Math.max(0,(cd?.readyTick??0)-frame.debug.tick);shapes.lineStyle(2,remaining?0x777777:0x66ccaa);shapes.strokeCircle(b.xCss*cssX,b.yCss*cssY,b.radiusCss*cssX);label.setPosition(b.xCss*cssX,b.yCss*cssY).setText(`${action.id}\n${remaining?remaining+'t':cd?.charges??0}`);}
    if(local){const sampleId=enabled?frame.localSampleId:frame.authoritativeSampleId;if(sampleId!==null&&this.#lastPosition&&Math.hypot(local.xWorld-this.#lastPosition.xWorld,local.yWorld-this.#lastPosition.yWorld)>1e-6)this.#pendingVisual.add(sampleId);this.#lastPosition=local;}
    if(this.#proxy.reconciled)this.#host.correction(this.#proxy.correctionWorld);
    for (const sample of this.#tracker.samples) {
      shapes.lineStyle(2, 0xffd166); shapes.strokeCircle(sample.screenCssX * this.scale.width / bounds.width, sample.screenCssY * this.scale.height / bounds.height, 20);
    }
    for (const sample of this.#feedback.values()) {
      shapes.fillStyle(sample.phase === 'cancel' ? 0xff5c6c : 0xffd166); shapes.fillCircle(sample.screenCssX * this.scale.width / bounds.width, sample.screenCssY * this.scale.height / bounds.height, 5);
      this.#pendingUI.add(sample.sampleId);
    }
    this.#feedback.clear();
    if (nowMs - this.#lastUIAtMs >= 100) {
      this.#lastUIAtMs = nowMs;
      const status = document.querySelector('#status');
      if (status) status.textContent = `${frame.probeMode} · ${frame.debug.state} [${frame.debug.pauseReasons.join(',')}] · Tick ${frame.debug.tick} @ ${frame.debug.tickRate} Hz（基线未定案） · 帧 ${this.#frameDurationMs.toFixed(1)} ms · ${frame.debug.ticksThisFrame} Tick/帧 · α ${frame.alpha.toFixed(2)} · 积压 ${frame.debug.backlogMs.toFixed(1)} ms · 指针 ${this.#tracker.size} · hash ${frame.debug.hash}`;
      const battle=document.querySelector<HTMLOutputElement>('#battle');if(battle){battle.textContent=view.units.map(u=>`#${u.ref.index} HP ${u.health.toFixed(0)}/${u.maximumHealth} Shield ${u.shield.toFixed(0)} MP ${u.resource.toFixed(0)} (预留 ${u.reserved}) ${u.phase} ${u.statuses.join(',')}`).join(' | ');battle.dataset.state=JSON.stringify(view);}
      const overlay = document.querySelector<HTMLElement>('#overlay');
      if (overlay) { overlay.hidden = frame.debug.state === 'running'; overlay.textContent = frame.debug.pauseReasons.includes('orientation') ? '请转为横屏，再点击恢复' : `已暂停：${frame.debug.pauseReasons.join(',') || frame.debug.state}；条件解除后点击恢复`; }
    }
  }
  #postRender(): void {
    const atMs = this.#host.nowMs();
    for (const sampleId of this.#pendingUI) this.#host.markUI(sampleId, atMs);
    for (const sampleId of this.#pendingVisual) this.#host.markVisual(sampleId, atMs);
    this.#pendingUI.clear(); this.#pendingVisual.clear();
    if (this.#frameStartedAtMs) this.#host.frameCpu(atMs - this.#frameStartedAtMs);
  }
}
