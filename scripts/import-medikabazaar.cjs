// Validate and import reviewed Medikabazaar additions without replacing site layouts.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const catalog = read('data/catalog.json');
const baseline = read('data/medikabazaar-import-baseline.json');
const manifests = ['equipment-instruments','linen-consumables','furniture-mgps'];
const missing = manifests.filter(n => !fs.existsSync(path.join(root,'data/medikabazaar-'+n+'.json')));
if(missing.length)throw Error('Awaiting reviewed manifests: '+missing.join(', '));
const additions = manifests.flatMap(n => read('data/medikabazaar-'+n+'.json'));
const ids=new Set(),keys=new Set();
const normalize=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'');
const priorKeys=new Set(baseline.products.map(p=>normalize(p.name)));
const counts=Object.fromEntries(catalog.categories.map(c=>[c.id,0]));
for(const p of additions){
 if(!p.id?.startsWith('mb-')||ids.has(p.id))throw Error('Duplicate or invalid id: '+p.id);
 ids.add(p.id);
 if(priorKeys.has(normalize(p.name))||keys.has(normalize(p.name)))throw Error('Duplicate product name: '+p.name);
 keys.add(normalize(p.name));
 if(!(p.category in counts))throw Error('Invalid category '+p.category);
 counts[p.category]++;
 if(!catalog.departments.some(d=>d.id===p.department))throw Error('Invalid department '+p.department);
 if(!/^https:\/\/(www\.)?medikabazaar\.com\/products\//.test(p.source))throw Error('Missing primary source '+p.name);
 if(!p.sourceName||!p.description||p.description.length<70||!Array.isArray(p.features)||p.features.length<2)throw Error('Incomplete details '+p.name);
 if(!p.imageReview||/PENDING/i.test(p.imageReview)||!p.imageSource||!['exact','representative'].includes(p.imageKind))throw Error('Photo not reviewed '+p.name);
 if(!p.image?.startsWith('assets/')||!fs.existsSync(path.join(root,p.image)))throw Error('Missing local image '+p.name);
 if(/medikabazaar|primewear|omron|accusure|morepen|doctroid|vaishnav|labasics|lifex|contec|polymed|romsons|smith\s*&\s*nephew/i.test(p.name))throw Error('Brand in generic name '+p.name);
 p.origin='medikabazaar';
 p.imageReviewed='2026-11-18';
 p.specifications=(p.specifications||[]).filter(s=>s?.label&&s?.value&&!/brand|manufacturer/i.test(s.label));
}
for(const [category,count] of Object.entries(counts))if(count<10)throw Error(category+' needs at least 10 additions; found '+count);
if(process.argv.includes('--check')){console.log(JSON.stringify({additions:additions.length,perCategory:counts},null,2));process.exit(0);}
const byId=new Map(catalog.products.map(p=>[p.id,p]));
for(const p of additions)byId.set(p.id,p);
catalog.products=[...byId.values()];
const totals=Object.fromEntries(catalog.categories.map(c=>[c.id,catalog.products.filter(p=>p.category===c.id).length]));
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function card(p){return `<article class="product-card" data-product="${e(p.id)}"><div class="product-visual"><a href="product.html?id=${encodeURIComponent(p.id)}" tabindex="-1" aria-hidden="true"><img src="${e(p.image)}" alt="${e(p.name)}" loading="lazy" width="600" height="420"></a>${p.imageKind==='representative'?'<span class="photo-caption">Reference image</span>':''}<button type="button" class="save-button" data-save="${e(p.id)}" aria-label="Save ${e(p.name)}" aria-pressed="false">♡</button></div><div class="product-info"><span class="micro-label">${e(p.subcategory)}</span><h3><a href="product.html?id=${encodeURIComponent(p.id)}">${e(p.name)}</a></h3><p>${e(p.features[0])}</p><div class="product-bottom"><span>Price on request</span><button type="button" class="add-button" data-add="${e(p.id)}" aria-label="Add ${e(p.name)} to quote basket">+</button></div><label class="compare-check"><input type="checkbox" data-compare="${e(p.id)}"> Compare</label></div></article>`;}
for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){
 let html=fs.readFileSync(path.join(root,file),'utf8');
 html=html.replace(/<a class="category-card"[^>]*href="products\.html\?category=([^"]+)"[^>]*>[\s\S]*?<\/a>/g,(a,id)=>totals[id]?a.replace(/\d+ selected products/g,totals[id]+' selected products'):a);
 if(file==='products.html'){
  const marker=/<div class="product-grid" id="catalog-grid">[\s\S]*?<\/div>\s*<div id="catalog-enquiry"/;
  if(!marker.test(html))throw Error('Missing static catalogue grid');
  html=html.replace(marker,()=>'<div class="product-grid" id="catalog-grid">'+catalog.products.map(card).join('')+'</div><div id="catalog-enquiry"');
  html=html.replace(/<label class="filter-option">[\s\S]*?<\/label>/g,label=>{const id=label.match(/value="([^"]+)"/)?.[1];const n=id==='all'?catalog.products.length:totals[id];return n===undefined?label:label.replace(/<small>\d+<\/small>/,'<small>'+n+'</small>');});
  html=html.replace(/(<[^>]+id="result-count"[^>]*>)[^<]*(<\/[^>]+>)/,'$1'+catalog.products.length+' products$2');
 }
 fs.writeFileSync(path.join(root,file),html);
}
fs.writeFileSync(path.join(root,'data/catalog.json'),JSON.stringify(catalog,null,2)+'\n');
fs.writeFileSync(path.join(root,'js/catalog.js'),'window.SWM_CATALOG = '+JSON.stringify(catalog)+';\n');
const report={reviewed:'2026-11-18',baselineTotal:baseline.products.length,added:additions.length,perCategory:counts,total:catalog.products.length,products:additions.map(p=>({id:p.id,name:p.name,category:p.category,source:p.source,image:p.image,imageKind:p.imageKind}))};
fs.writeFileSync(path.join(root,'data/medikabazaar-import-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({added:additions.length,perCategory:counts,total:catalog.products.length},null,2));
