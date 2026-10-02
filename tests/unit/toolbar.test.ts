import { expect, it, vi } from 'vitest';
import type { DebugAction, PresentationHost } from '../../src/contracts/index';
import { bindToolbarAction } from '../../src/presentation/input/index';
function fixture(action: DebugAction = 'control') {
  const element = Object.assign(new EventTarget(), { dataset: {} as Record<string,string>, disabled: false }) as unknown as HTMLButtonElement;
  const host = { debug: vi.fn(), clearInput: vi.fn() } as unknown as PresentationHost;
  const clearScene = vi.fn(), dispose = bindToolbarAction(element, action, host, clearScene);
  const send = (type: string, fields: object = {}) => element.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), fields));
  return { element, host, clearScene, dispose, send };
}
it.each(['touch','pen'])('%s pointerdown activates once, including non-primary contact; its click is ignored', pointerType => {
  const f=fixture(); f.send('pointerdown',{pointerType,button:0,isPrimary:false});
  f.send('pointerup',{pointerType,button:0}); f.send('click',{pointerType,detail:1});
  expect(f.host.debug).toHaveBeenCalledExactlyOnceWith('control'); expect(f.element.dataset.activationCount).toBe('1');
  expect(f.host.clearInput).not.toHaveBeenCalled();expect(f.clearScene).not.toHaveBeenCalled();
});
it('mouse down/up/click activates once; keyboard and accessibility click remain independent activations',()=>{
 const f=fixture();f.send('pointerdown',{pointerType:'mouse',button:0});f.send('pointerup',{pointerType:'mouse',button:0});f.send('click',{pointerType:'mouse',detail:1});
 f.send('click',{pointerType:'',pointerId:-1,detail:0});f.send('click');expect(f.host.debug).toHaveBeenCalledTimes(3);expect(f.element.dataset.activationCount).toBe('3');
});
it('touch provenance compatibility click is ignored without a timer; a following mouse/keyboard click works',()=>{
 const f=fixture();f.send('pointerdown',{pointerType:'touch',button:0});f.send('click',{sourceCapabilities:{firesTouchEvents:true},detail:1});f.send('click',{sourceCapabilities:{firesTouchEvents:false},detail:1});f.send('click',{detail:0});expect(f.host.debug).toHaveBeenCalledTimes(3);
});
it('consecutive touch presses each activate once even without synthesized click; cancellation does not replay an action',()=>{
 const f=fixture();for(let i=0;i<2;i++){f.send('pointerdown',{pointerType:'touch',button:0,pointerId:i+2});f.send('pointercancel',{pointerType:'touch',pointerId:i+2});}expect(f.host.debug).toHaveBeenCalledTimes(2);
});
it('pen barrel button, disabled toolbar and disposed listeners cannot activate',()=>{
 const f=fixture();f.send('pointerdown',{pointerType:'pen',button:2});f.element.disabled=true;f.send('pointerdown',{pointerType:'touch',button:0});f.send('click');f.element.disabled=false;f.dispose();f.dispose();f.send('pointerdown',{pointerType:'touch',button:0});f.send('click');expect(f.host.debug).not.toHaveBeenCalled();
});
it.each(['pause','resume','step','recreate','modeA','modeB','export','empty','probe'] as const)('%s preserves destructive input clearing once per touch activation',action=>{
 const f=fixture(action);f.send('pointerdown',{pointerType:'touch',button:0});f.send('click',{pointerType:'touch',detail:1});expect(f.host.clearInput).toHaveBeenCalledTimes(1);expect(f.clearScene).toHaveBeenCalledTimes(1);expect(f.host.debug).toHaveBeenCalledExactlyOnceWith(action);
});
