from pathlib import Path
from PIL import Image
import json
jobs=json.loads(Path('data/mb-root-photo-jobs.json').read_text(encoding='utf-8'));bykey={j[0]:j for j in jobs}
choices={'mb-7b2877461245':'pressure2','mb-c18a2491b15d':'air-monitor','mb-c4f903c92e72':'uv','mb-bbbfea384efe':'purifier','mb-a6a1bc21c03a':'dehumidifier','mb-0c3c76d978c4':'smoke-pencil2','mb-656b9134c9f2':'smoke-filter3','mb-ea9530819930':'hme'}
rows=[]
for id,key in choices.items():
 j=bykey[key];w,h=Image.open(j[3]).size;source=j[2]
 if key=='uv':source='https://m.made-in-china.com/product/Disinfection-Air-Sterilization-UVC-Air-Purifier-Equipment-for-Medical-Sterilizer-1955214825.html'
 notes='Full-size visual inspection: clear '+key.replace('-',' ')+' supplier product reference with no visible manufacturer name, logo or watermark. Representative range visual; exact configuration, performance and compatibility must be confirmed.'
 if key=='pressure2':notes+=' Reference shows the differential-pressure monitoring function, not the exact combined air-quality monitor.'
 rows.append(dict(id=id,image=j[3],imageOriginal=j[1],imageSource=source,imageKind='representative',imageReview=notes,imageWidth=w,imageHeight=h))
Path('data/medikabazaar-mgps-photo-overrides.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8')
print('Approved eight inspected photo overrides.')
