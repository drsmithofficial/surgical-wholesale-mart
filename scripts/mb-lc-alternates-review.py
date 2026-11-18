from PIL import Image,ImageDraw
from pathlib import Path
import json
rows=json.loads(Path('data/mb-lc-alternate-images.json').read_text());s=Image.new('RGB',(1600,800),'white');d=ImageDraw.Draw(s)
for i,r in enumerate(rows):
 im=Image.open(Path('assets/products/medikabazaar')/r['file']).convert('RGBA'); im.thumbnail((380,350)); x=(i%4)*400;y=(i//4)*400;s.paste(im,(x,y+30),im);d.text((x+4,y+4),r['file'],fill='black')
s.save('data/mb-lc-alternates-review.jpg')
