from PIL import Image,ImageOps,ImageDraw
from pathlib import Path
import json
rows=json.loads(Path('data/mb-lc-source-index.json').read_text(encoding='utf8'))
for batch in range(2):
 sheet=Image.new('RGB',(1600,1200),'white');d=ImageDraw.Draw(sheet)
 for k,row in enumerate(rows[batch*10:(batch+1)*10]):
  p=Path(row['image']);im=Image.open(p).convert('RGBA');row['width'],row['height']=im.size;im.thumbnail((380,340));x=(k%4)*400;y=(k//4)*400;sheet.paste(im,(x,y+35),im);d.text((x+5,y+3),str(batch*10+k)+' '+row['key'][:35],fill='black')
 sheet.save('data/mb-lc-review-'+str(batch)+'.jpg')
Path('data/mb-lc-source-index.json').write_text(json.dumps(rows,indent=2),encoding='utf8')
