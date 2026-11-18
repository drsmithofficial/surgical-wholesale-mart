from PIL import Image
from pathlib import Path
import json
p=Path('data/medikabazaar-linen-consumables.json');rows=json.loads(p.read_text(encoding='utf8'));mapping={}
for r in rows:
 old=Path(r['image']);fmt=Image.open(old).format;ext={'JPEG':'.jpg','PNG':'.png','WEBP':'.webp'}.get(fmt,old.suffix)
 if old.suffix.lower()!=ext:
  new=old.with_suffix(ext)
  if new.exists():raise RuntimeError('Target exists: '+str(new))
  old.rename(new);mapping[r['image']]=new.as_posix();r['image']=new.as_posix()
p.write_text(json.dumps(rows,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
src=Path('data/mb-lc-source-index.json');d=json.loads(src.read_text(encoding='utf8'))
for r in d:r['image']=mapping.get(r['image'],r['image'])
src.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
print('Corrected local extension of',len(mapping),'original supplier files without altering image pixels.')
