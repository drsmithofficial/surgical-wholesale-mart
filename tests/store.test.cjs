const {test}=require('node:test');
const assert=require('node:assert/strict');
const {cleanBasket,selectProducts,escapeHTML}=require('../js/store.js');
const {products,categories}=require('../data/catalog.json');
test('basket rejects invalid and obsolete entries, with bounded whole quantities',()=>{
 const id=products[0].id;
 assert.deepEqual(cleanBasket({[id]:2.8,unknown:12},products),{[id]:2});
 assert.deepEqual(cleanBasket({[id]:-1},products),{});
 assert.deepEqual(cleanBasket({[id]:Infinity},products),{});
 assert.deepEqual(cleanBasket({[id]:100000},products),{[id]:9999});
 assert.deepEqual(cleanBasket(null,products),{});
 assert.deepEqual(cleanBasket([id],products),{});
});
test('filters combine query, category, department and saved products',()=>{
 const p=products[0];
 const state={category:p.category,department:p.department,query:'five-function',savedOnly:true,saved:[p.id]};
 assert.deepEqual(selectProducts(products,state).map(p=>p.id),[p.id]);
 assert.equal(selectProducts(products,{...state,query:'nonexistent equipment xyz'}).length,0);
 assert.equal(selectProducts(products,{...state,saved:[]}).length,0);
});
test('search includes source model names and category descriptions',()=>{
 assert(selectProducts(products,{query:'CMS',category:'all'}).some(p=>p.name.includes('CMS')));
 assert(selectProducts(products,{query:'surgical',category:'instruments'}).length>0);
});
test('search includes imported descriptions and specifications',()=>{
 const specificationProduct=products.find(p=>{
  const otherFields=[p.name,p.sourceName,p.subcategory,...p.features].join(' ').toLowerCase();
  return Array.isArray(p.specifications)&&p.specifications.some(spec=>{
   const term=String(spec.value).match(/\b\d{4,}\b/);
   return term&&!otherFields.includes(term[0].toLowerCase());
  });
 });
 assert(specificationProduct);
 const otherFields=[specificationProduct.name,specificationProduct.sourceName,specificationProduct.subcategory,...specificationProduct.features].join(' ').toLowerCase();
 const specification=specificationProduct.specifications.find(spec=>{
  const term=String(spec.value).match(/\b\d{4,}\b/);
  return term&&!otherFields.includes(term[0].toLowerCase());
 });
 const specificationTerm=String(specification.value).match(/\b\d{4,}\b/)[0];
 assert(selectProducts(products,{category:specificationProduct.category,query:specificationTerm}).some(p=>p.id===specificationProduct.id));
 const descriptionProduct=products.find(p=>{
  const otherText=[p.name,p.sourceName,p.subcategory,...p.features,...(Array.isArray(p.specifications)?p.specifications.flatMap(spec=>[spec.label,spec.value]):[])].join(' ').toLowerCase();
  return (String(p.description||'').match(/\b[a-z]{7,}\b/gi)||[]).some(word=>!otherText.includes(word.toLowerCase()));
 });
 assert(descriptionProduct);
 const descriptionTerm=String(descriptionProduct.description||'').match(/\b[a-z]{7,}\b/gi).find(word=>![descriptionProduct.name,descriptionProduct.sourceName,descriptionProduct.subcategory,...descriptionProduct.features,...(Array.isArray(descriptionProduct.specifications)?descriptionProduct.specifications.flatMap(spec=>[spec.label,spec.value]):[])].join(' ').toLowerCase().includes(word.toLowerCase()));
 assert(selectProducts(products,{category:descriptionProduct.category,query:descriptionTerm}).some(p=>p.id===descriptionProduct.id));
});
test('sorting never mutates the source catalog',()=>{
 const ids=products.map(p=>p.id);
 const sorted=selectProducts(products,{sort:'az'});
 assert.deepEqual(products.map(p=>p.id),ids);
 assert(sorted.every((p,i)=>i===0||sorted[i-1].name.localeCompare(p.name)<=0));
});
test('stored and URL content is escaped before rendering',()=>{
 assert.equal(escapeHTML('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
 assert.equal(escapeHTML("a'b&c"),'a&#39;b&amp;c');
});
test('catalog references are unique and every family has products',()=>{
 assert.equal(new Set(products.map(p=>p.id)).size,products.length);
 for(const c of categories)assert(products.some(p=>p.category===c.id),c.name);
 for(const p of products){assert(categories.some(c=>c.id===p.category));assert(p.source.startsWith('https://'));assert(p.features.length);}
});
