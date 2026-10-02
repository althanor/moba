import { expect, it } from 'vitest';
import fs from 'node:fs';
import { validateMilestoneStatus } from '../../tools/milestone-status.mjs';
const current = fs.readFileSync('MILESTONES.md', 'utf8');
it('root/docs source milestone matches build phase and current text has no superseded stage claims', () => {
    const phase = JSON.parse(fs.readFileSync('package.json', 'utf8')).mobaPhase;
    expect(phase).toBe('M3');
    for (const file of ['MILESTONES.md', 'docs/MILESTONES.md']) expect(() => validateMilestoneStatus(fs.readFileSync(file, 'utf8'), phase)).not.toThrow();
});
it.each(['未实施 M3', '用户已授权 M2，本轮只实施 M2', 'M2 可以开始', '不进入 M3'])('rejects current-phase contradiction even when root/docs could match: %s', claim => {
    expect(() => validateMilestoneStatus(current + '\n' + claim, 'M3')).toThrow('Contradictory current milestone');
});
it('allows explicitly marked superseded history, but rejects malformed history and missing/mismatched/duplicate current phase', () => {
    expect(() => validateMilestoneStatus(current + '\n<!-- historical/superseded:start -->\n未实施 M3\n<!-- historical/superseded:end -->', 'M3')).not.toThrow();
    for (const suffix of ['\n<!-- historical/superseded:start -->', '\n<!-- historical/superseded:end -->', '\n当前：M3']) expect(() => validateMilestoneStatus(current + suffix, 'M3')).toThrow();
    expect(() => validateMilestoneStatus('当前：M2', 'M3')).toThrow('exactly one current phase'); expect(() => validateMilestoneStatus('no current declaration', 'M3')).toThrow('exactly one current phase');
});
