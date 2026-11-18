from PIL import Image
from pathlib import Path
import json
p=Path('data/medikabazaar-linen-consumables.json');rows=json.loads(p.read_text(encoding='utf8'))
for r in rows:
 im=Image.open(r['image']);im.verify();im=Image.open(r['image']);r['imageWidth'],r['imageHeight']=im.size
 print(r['name'],im.size,im.format)
p.write_text(json.dumps(rows,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
