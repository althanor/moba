import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
async function tickIndex(page: Page): Promise<number> {
  return Number((await page.locator('#status').textContent())?.match(/Tick (\d+) @/)?.[1] ?? -1);
}
test('Phaser shell, pause/single-step/resume, report download and no page errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await page.goto('/');
  await expect(page.locator('#status')).toContainText('running'); await expect(page.locator('canvas')).toHaveCount(1);
  await page.getByRole('button', { name: '暂停', exact: true }).click(); await expect(page.locator('#status')).toContainText('paused');
  const before = await tickIndex(page); await page.getByRole('button', { name: '单步', exact: true }).click();
  await expect.poll(() => tickIndex(page)).toBe(before + 1);
  await page.getByRole('button', { name: '恢复', exact: true }).click(); await expect(page.locator('#status')).toContainText('running');
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: '导出测量' }).click(); expect((await download).suggestedFilename()).toMatch(/M1-A/);
  expect(errors).toEqual([]); await expect(page.locator('#error')).toBeEmpty();
});
test('two real CDP touch contacts, touchcancel, blur and explicit focus recovery', async ({ page, context }) => {
  await page.goto('/'); await expect(page.locator('#status')).toContainText('running');
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 160, y: 300, id: 1 }, { x: 760, y: 300, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 220, y: 300, id: 1 }, { x: 760, y: 320, id: 2 }] });
  await expect(page.locator('#status')).toContainText('指针 2');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await expect(page.locator('#status')).toContainText('指针 0');
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await expect(page.locator('#status')).toContainText('hidden');
  const before = await tickIndex(page); await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#status')).toContainText('paused'); expect(await tickIndex(page)).toBe(before);
  await page.getByRole('button', { name: '恢复', exact: true }).click(); await expect(page.locator('#status')).toContainText('running');
});
test('portrait pause keeps Session; empty shell, A/B and 20 recreations keep one canvas', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#status')).toContainText('running');
  await page.setViewportSize({ width: 540, height: 960 }); await expect(page.locator('#status')).toContainText('orientation');
  const before = await tickIndex(page); await page.setViewportSize({ width: 960, height: 540 });
  await expect(page.locator('#status')).toContainText('paused'); expect(await tickIndex(page)).toBe(before);
  await page.getByRole('button', { name: '恢复', exact: true }).click();
  await page.getByRole('button', { name: 'B 即时反馈', exact: true }).click(); await expect(page.locator('#status')).toContainText('B · running');
  await page.getByRole('button', { name: '空外壳', exact: true }).click(); await expect(page.locator('#error')).toBeEmpty();
  for (let i = 0; i < 20; i++) await page.getByRole('button', { name: '重建 Session', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(1); await expect(page.locator('#error')).toBeEmpty();
  await page.getByRole('button', { name: '响应探针', exact: true }).click(); await page.getByRole('button', { name: 'A 插值', exact: true }).click();
  await expect(page.locator('#status')).toContainText('A · running');
});
test('WebGL context loss pauses the same Session and restoration still needs explicit resume', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#status')).toContainText('running');
  const extension = await page.evaluateHandle(() => {
    const canvas = document.querySelector('canvas'); const gl = canvas?.getContext('webgl');
    const extension = gl?.getExtension('WEBGL_lose_context'); if (!extension) throw new Error('missing context-loss test capability'); return extension;
  });
  await extension.evaluate(extension => extension.loseContext());
  await expect(page.locator('#status')).toContainText('contextLost'); const before = await tickIndex(page);
  await extension.evaluate(extension => extension.restoreContext());
  await expect(page.locator('#status')).not.toContainText('contextLost'); await expect(page.locator('#status')).toContainText('paused');
  expect(await tickIndex(page)).toBe(before); await page.getByRole('button', { name: '恢复', exact: true }).click(); await expect(page.locator('#status')).toContainText('running');
  await extension.dispose();
});
