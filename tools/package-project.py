from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib, json
root = Path(__file__).resolve().parents[1]
output = root.parent / 'MOBA_Core_Engine_M1_v0.2.0.zip'
excluded = {'node_modules', '.git', 'test-results', 'playwright-report', '__pycache__'}
files = sorted(p for p in root.rglob('*') if p.is_file() and not any(part in excluded for part in p.relative_to(root).parts) and p.suffix != '.zip')
manifest = {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in files if p.name != 'FILE_MANIFEST.json'}
(root / 'FILE_MANIFEST.json').write_text(json.dumps(manifest, indent=2)+'\n')
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for p in files:
        archive.write(p, Path('moba-core') / p.relative_to(root))
    if root / 'FILE_MANIFEST.json' not in files:
        archive.write(root / 'FILE_MANIFEST.json', 'moba-core/FILE_MANIFEST.json')
print(output)
