import fs from 'node:fs';
import path from 'node:path';
function files(root) { return fs.readdirSync(root, { withFileTypes: true }).flatMap(item => item.isDirectory() ? files(path.join(root, item.name)) : [path.join(root, item.name)]); }
const formal = files('content').filter(file => !file.endsWith('.gitkeep') && !file.endsWith('README.md'));
if (formal.length) { console.error('M1 content stage violation: formal catalog/schema/capacity compiler is M2+, files:', formal); process.exitCode = 1; }
else console.log('NOT_APPLICABLE_M1: no formal content. Empty-stage guard passed; schema/reference/DAG/capacity/disclosure validation NOT implemented, NOT reported as validated.');
