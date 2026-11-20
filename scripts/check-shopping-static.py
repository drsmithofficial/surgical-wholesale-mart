from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json
class Scan(HTMLParser):
 def __init__(self):super().__init__();self.refs=[];self.ids=[];self.scripts=[]
 def handle_starttag(self,t,a):
  d=dict(a)
  if d.get('id'):self.ids.append(d['id'])
  if t=='img':assert 'alt' in d
  if t=='script' and d.get('src'):self.scripts.append(urlsplit(d['src']).path)
  for k in ('href','src'):
   if d.get(k):self.refs.append(d[k])
root=Path('.');pages=list(root.glob('*.html'));cache={}
for p in pages:
 a=Scan();a.feed(p.read_text(encoding='utf-8-sig'));cache[p.name]=a
 assert len(a.ids)==len(set(a.ids)),(p,'duplicate IDs')
 for script in ['js/catalog.js','js/shopping-core.js','js/store.js','js/shopping.js']:assert script in a.scripts,(p,script)
 assert a.scripts.index('js/shopping-core.js')<a.scripts.index('js/store.js')<a.scripts.index('js/shopping.js')
for name,a in cache.items():
 for ref in a.refs:
  u=urlsplit(ref)
  if u.scheme or u.netloc:continue
  target=unquote(u.path) or name
  assert (root/target).is_file(),(name,ref)
  if u.fragment and target in cache:assert u.fragment in cache[target].ids,(name,ref)
c=json.loads(Path('data/catalog.json').read_text(encoding='utf-8'));r=json.loads(Path('data/medikabazaar-import-report.json').read_text(encoding='utf-8'))
assert len(r['products'])==60
for p in c['products']:assert p.get('image') and Path(p['image']).is_file(),p['id']
print('PASS:',len(pages),'pages; local links, anchors, IDs, image files, and shopping script order. Catalogue:',len(c['products']))
