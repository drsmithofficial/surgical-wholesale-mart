from PIL import Image,ImageDraw
from pathlib import Path
import json
jobs=json.loads(Path('data/mb-root-photo-jobs.json').read_text(encoding='utf-8'))[8:];s=Image.new('RGB',(1600,900),'white');d=ImageDraw.Draw(s)
for i,j in enumerate(jobs):
 if len(j)<4:continue
 im=Image.open(j[3]).convert('RGBA');im.thumbnail((380,390));xy=((i%4)*400,(i//4)*450+30);s.paste(im,xy,im);d.text(((i%4)*400+5,(i//4)*450+5),j[0],fill='black')
s.save('data/mb-root-review-2.jpg')
