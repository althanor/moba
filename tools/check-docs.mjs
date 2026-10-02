import fs from 'node:fs';
import { validateMilestoneStatus } from './milestone-status.mjs';
const phase = JSON.parse(fs.readFileSync('package.json', 'utf8')).mobaPhase;
if (!['M1', 'M2', 'M3'].includes(phase)) throw new Error('Missing/invalid source milestone');
const pairs = ['ARCHITECTURE', 'COMBAT_PIPELINE', 'CODING_RULES', 'MILESTONES', 'PERFORMANCE_BUDGET', 'M1_ACCEPTANCE', 'M1_TEST_REPORT', 'M2_ACCEPTANCE', 'M2_TEST_REPORT', 'M2_IMPLEMENTATION', 'M2_WORK_ACCOUNTING','M3_IMPLEMENTATION','M3_WORK_ACCOUNTING','M3_TEST_REPORT','M3_ACCEPTANCE'];
const normalize = text => text.replace(/\]\(\.\.\/(DESIGN_DECISIONS|CHANGELOG|ASSET_LICENSES|README)\.md\)/g, ']($1.md)');
for (const name of pairs) {
  if (normalize(fs.readFileSync(`${name}.md`, 'utf8')) !== normalize(fs.readFileSync(`docs/${name}.md`, 'utf8'))) {
    throw new Error(`Documentation copies differ: ${name}.md and docs/${name}.md`);
  }
}
for (const path of ['MILESTONES.md', 'docs/MILESTONES.md']) validateMilestoneStatus(fs.readFileSync(path, 'utf8'), phase);
console.log(`Documentation PASS: ${pairs.length} root/docs pairs agree; current-phase semantic status ${phase} is consistent.`);
