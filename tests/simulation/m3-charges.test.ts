import { expect, it } from 'vitest';
import { WORK_KEYS } from '../../src/contracts/index';
import { battleHarness, battleRaw } from '../fixtures/m3';

it('two-charge content consumes 2→1→0, rejects a third cast and recharges one per interval without resetting the first deadline', () => {
    const raw = battleRaw(), bolt = raw.gameplay.actions.find(a => a.id === 'bolt'); if (!bolt) throw new Error('bolt');
    // Test-only compiled fixture separates cooldown from recharge. Shipped content is unchanged.
    bolt.cooldownMs = 0; const h = battleHarness(raw);
    const ready = () => h.simulation.observe().battle?.units[0]?.cooldowns.find(c => c.id === 'bolt');
    const prove = () => { const actual = h.debug.boundary().capacity; for (const key of WORK_KEYS) expect(actual.tick[key]).toBeLessThanOrEqual(h.catalog.certificate.tick[key]); expect(h.debug.fault()).toBeNull(); };
    expect(ready()?.charges).toBe(2); h.command('cast', 'bolt'); h.step(4); prove();
    expect(ready()?.charges).toBe(1); h.step(3);
    h.command('cast', 'bolt'); h.step(4); prove(); expect(ready()?.charges).toBe(0);
    h.step(3); h.command('cast', 'bolt'); const rejected = h.simulation.step(); prove();
    expect(rejected.commandResults[0]?.reason).toBe('charges'); expect(ready()?.charges).toBe(0);
    h.step(18); expect(h.debug.boundary().tick).toBe(33); expect(ready()?.charges).toBe(0);
    h.step(); prove(); expect(ready()?.charges).toBe(1);
    h.step(29); expect(ready()?.charges).toBe(1); h.step(); prove(); expect(ready()?.charges).toBe(2);
    h.step(60); expect(ready()?.charges).toBe(2); h.simulation.dispose();
});
it('shipped debug bolt cooldown blocks spending the second stored charge until the first recharge matures', () => {
    const h = battleHarness(), ready = () => h.simulation.observe().battle?.units[0]?.cooldowns.find(c => c.id === 'bolt');
    h.command('cast', 'bolt'); h.step(7); expect(ready()?.charges).toBe(1); expect(ready()?.readyTick).toBe(34);
    h.command('cast', 'bolt'); expect(h.simulation.step().commandResults[0]?.reason).toBe('cooldown');
    expect(ready()?.charges).toBe(1); h.step(25); expect(h.debug.boundary().tick).toBe(33); expect(ready()?.charges).toBe(1);
    h.command('cast', 'bolt'); expect(h.simulation.step().commandResults[0]?.outcome).toBe('accepted'); expect(ready()?.charges).toBe(2);
    h.step(3); expect(ready()?.charges).toBe(1); h.simulation.dispose();
});
