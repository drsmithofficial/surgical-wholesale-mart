from PIL import Image,ImageOps,ImageDraw
from pathlib import Path
import json
jobs=json.loads(Path('data/existing-photo-downloads.json').read_text())
for batch in range(2):
 part=jobs[batch*16:(batch+1)*16]; sheet=Image.new('RGB',(1440,1440),'white'); draw=ImageDraw.Draw(sheet)
 for i,j in enumerate(part):
  if not j.get('ok'):continue
  im=Image.open(j['local']).convert('RGBA'); im.thumbnail((340,310)); xy=((i%4)*360,(i//4)*360+28);sheet.paste(im,xy,im);draw.text(((i%4)*360+4,(i//4)*360+4),str(batch*16+i)+' '+Path(j['local']).stem[-12:],fill='black')
 sheet.save('data/existing-photo-review-'+str(batch)+'.jpg')
