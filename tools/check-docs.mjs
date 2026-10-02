import fs from 'node:fs';
const pairs = ['ARCHITECTURE', 'COMBAT_PIPELINE', 'CODING_RULES', 'MILESTONES', 'PERFORMANCE_BUDGET', 'M1_ACCEPTANCE', 'M1_TEST_REPORT', 'M2_ACCEPTANCE', 'M2_TEST_REPORT', 'M2_IMPLEMENTATION', 'M2_WORK_ACCOUNTING'];
const normalize = text => text.replace(/\]\(\.\.\/(DESIGN_DECISIONS|CHANGELOG|ASSET_LICENSES|README)\.md\)/g, ']($1.md)');
for (const name of pairs) {
  if (normalize(fs.readFileSync(`${name}.md`, 'utf8')) !== normalize(fs.readFileSync(`docs/${name}.md`, 'utf8'))) {
    throw new Error(`Documentation copies differ: ${name}.md and docs/${name}.md`);
  }
}
console.log(`Documentation PASS: ${pairs.length} root/docs pairs agree.`);
