import { expect, it } from 'vitest';
import fs from 'node:fs';
import { CURRENT_STATE_DOCUMENTS, renderCurrentStateHeader, validateCurrentStateDocuments, validateCurrentStateSource } from '../../tools/current-state.mjs';
import type { DocumentCurrentState } from '../../tools/current-state.mjs';
const metadata = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { version: string; mobaPhase: string };
const status = JSON.parse(fs.readFileSync('docs/current-status.json', 'utf8')) as DocumentCurrentState;
const versionParts = status.version.split('.').map(Number);
const patch = versionParts[2] ?? 0;
const staleVersion = `${versionParts[0]}.${versionParts[1]}.${patch ? patch - 1 : patch + 1}`;
const documents = new Map<string, string>();
for (const directory of ['.', 'docs', 'content']) for (const name of fs.readdirSync(directory)) {
    if (name.endsWith('.md')) { const path = directory === '.' ? name : `${directory}/${name}`; documents.set(path, fs.readFileSync(path, 'utf8')); }
}
function edited(path: string, change: (text: string) => string) {
    const text = documents.get(path); if (!text) throw new Error(path);
    const next = new Map(documents); next.set(path, change(text)); return next;
}
function declared(path: string, changes: Partial<DocumentCurrentState>) {
    const title = CURRENT_STATE_DOCUMENTS[path]; if (!title) throw new Error(path);
    const text = documents.get(path); if (!text) throw new Error(path);
    const original = renderCurrentStateHeader(title, status);
    return edited(path, () => renderCurrentStateHeader(title, { ...status, ...changes }) + text.slice(original.length));
}
const check = (files: ReadonlyMap<string, string>) => validateCurrentStateDocuments(files, metadata, status);
it('current-state: the actual complete 0.4.3 document set and all existing mirrors match package, blocker/base and review source', () => {
    expect(metadata.version).toBe(status.version); expect(metadata.mobaPhase).toBe(status.phase);
    expect(check(documents)).toBeGreaterThanOrEqual(Object.keys(CURRENT_STATE_DOCUMENTS).length);
    for (const path of Object.keys(CURRENT_STATE_DOCUMENTS)) expect(documents.has(path)).toBe(true);
});
it('current-state: every registered root and existing mirror rejects a stale current version 0.4.2', () => {
    for (const path of Object.keys(CURRENT_STATE_DOCUMENTS)) for (const p of [path, `docs/${path}`]) {
        if (!documents.has(p)) continue;
        const text = documents.get(p); if (!text) throw new Error(p);
        expect(() => check(edited(p, s => s.replace(`"version":"${status.version}"`, `"version":"${staleVersion}"`))), p).toThrow('Current-state declaration mismatch');
    }
});
it('current-state: reverting the active Android blocker to toolbar pending fails independently of mirrored bytes', () => {
    expect(() => check(declared('M3_ACCEPTANCE.md', { toolbarBlocker: 'PENDING', currentAndroidBlocker: 'toolbar blocker pending' }))).toThrow('Current-state declaration mismatch');
});
it('current-state: historical sections may contain old versions, old toolbar blocker and even archived declarations', () => {
    const title = CURRENT_STATE_DOCUMENTS['M3_DELIVERY.md']; if (!title) throw new Error('delivery');
    const history = '\n<!-- historical/superseded:start -->\n## 0.4.2 historical delivery\n当前：M3 0.4.2 toolbar blocker pending\n' + renderCurrentStateHeader(title, { ...status, version: '0.4.2' }) + '<!-- historical/superseded:end -->\n';
    expect(() => check(edited('M3_DELIVERY.md', s => s + history))).not.toThrow();
    expect(() => check(edited('M3_IMPLEMENTATION.md', s => s + '\nHistorical 0.4.2 content uses the same schema.\n'))).not.toThrow();
});
it('current-state: equal root/docs bytes with jointly stale version still fail semantic validation', () => {
    const files = declared('ARCHITECTURE.md', { version: staleVersion }), text = files.get('ARCHITECTURE.md'); if (!text) throw new Error('root');
    files.set('docs/ARCHITECTURE.md', text); expect(files.get('docs/ARCHITECTURE.md')).toBe(text); expect(() => check(files)).toThrow('Current-state declaration mismatch');
});
it('current-state: M3_DELIVERY with the previous c95a6d76 base commit fails', () => {
    expect(() => check(declared('M3_DELIVERY.md', { baseCommit: 'c95a6d76f34a9f8621586a9bd84160f71061170d' }))).toThrow('Current-state declaration mismatch');
});
it('current-state: the central source must match package version and phase, rather than treating itself as an oracle', () => {
    expect(() => validateCurrentStateSource({ ...metadata, version: staleVersion }, status)).toThrow('package version/phase');
    expect(() => validateCurrentStateSource({ ...metadata, mobaPhase: 'M4' }, status)).toThrow('package version/phase');
});
it('current-state: the readable declaration cannot contradict correct JSON metadata', () => {
    expect(() => check(edited('README.md', s => s.replace(`当前：${status.phase} ${status.version}`, `当前：${status.phase} ${staleVersion}`)))).toThrow('Current-state declaration mismatch');
    expect(() => check(edited('README.md', s => s.replace('toolbar blocker=CLOSED_ON_ANDROID_DEVICE', 'toolbar blocker=PENDING')))).toThrow('Current-state declaration mismatch');
});
it('current-state: missing, duplicate or truncated current markers and missing current documents fail', () => {
    expect(() => check(edited('M3_DELIVERY.md', s => s.replace('<!-- current-state:start -->', '')))).toThrow('Exactly one');
    expect(() => check(edited('M3_DELIVERY.md', s => s + '\n<!-- current-state:start -->\n<!-- current-state:end -->'))).toThrow('Exactly one');
    expect(() => check(edited('M3_DELIVERY.md', s => s.replace('<!-- current-state:end -->', '')))).toThrow('Exactly one');
    const missing = new Map(documents); missing.delete('M3_DELIVERY.md'); expect(() => check(missing)).toThrow('Missing current-state document');
});
it('current-state: unregistered current declarations and unmarked duplicate project-state prose fail', () => {
    const files = new Map(documents), title = CURRENT_STATE_DOCUMENTS['README.md']; if (!title) throw new Error('README');
    files.set('NEW_DELIVERY.md', renderCurrentStateHeader(title, status)); expect(() => check(files)).toThrow('Unregistered');
    for (const text of ['当前版本：0.4.2', '## M3 0.4.2 当前实施与边界', 'Current Android blocker: toolbar pending'])
        expect(() => check(edited('M3_DELIVERY.md', s => s + '\n' + text))).toThrow('outside canonical header');
});
it('current-state: malformed/nested history blocks cannot hide stale declarations', () => {
    for (const suffix of ['<!-- historical/superseded:start -->', '<!-- historical/superseded:end -->', '<!-- historical/superseded:start -->\n<!-- historical/superseded:start -->'])
        expect(() => check(edited('README.md', s => s + '\n' + suffix))).toThrow('history');
});
it('current-state: pending narrow review and incomplete Android evidence cannot be promoted to final/overall PASS', () => {
    expect(() => validateCurrentStateSource(metadata, { ...status, softwareExitFinal: 'PASS' })).toThrow('Pending narrow review');
    expect(() => validateCurrentStateSource(metadata, { ...status, androidOverall: 'PASS' })).toThrow('Incomplete Android');
    expect(() => validateCurrentStateSource(metadata, { ...status, nextPhaseStarted: true })).toThrow('Incomplete Android');
});

it('current-state: delivery artifact names cannot retain a stale version or abbreviated patch base behind a correct header', () => {
    expect(() => check(edited('M3_DELIVERY.md', s => s.replace(`_against_${status.baseCommit.slice(0, 8)}.patch`, '_against_c95a6d76.patch')))).toThrow('Delivery artifact version/base mismatch');
    expect(() => check(edited('M3_DELIVERY.md', s => s.replace(`MOBA_Core_Engine_${status.phase}_v${status.version}.zip`, `MOBA_Core_Engine_${status.phase}_v${staleVersion}.zip`)))).toThrow('Delivery artifact version/base mismatch');
});
