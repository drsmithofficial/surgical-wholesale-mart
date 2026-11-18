const fs=require('fs');const file='js/store.js';let s=fs.readFileSync(file,'utf8');
function change(from,to){if(!s.includes(from))throw Error('Could not locate store integration point: '+from.slice(0,70));s=s.replace(from,()=>to);}
change("const core = {escapeHTML,cleanBasket,selectProducts};","const core = {escapeHTML,cleanBasket,selectProducts};");
change("let compare=[];","let compare=read(session,'swm-compare',[]);\n  compare=Array.isArray(compare)?[...new Set(compare)].filter(id=>byId(id)).slice(0,3):[];");
change("(state.category === 'all' || !state.category || p.category === state.category)","(state.category === 'all' || !state.category || p.category === state.category) && (!state.newOnly || p.origin === 'medikabazaar')");
change("if (state.sort === 'az')", "if (state.sort === 'newest') list.sort((a,b) => Number(b.origin === 'medikabazaar') - Number(a.origin === 'medikabazaar'));\n    if (state.sort === 'az')");
change("function comparison() {", "function comparison() {\n    save(session,'swm-compare',compare);");
change("sort:['az','za'].includes(q.get('sort'))?q.get('sort'):'featured'", "sort:['az','za','newest'].includes(q.get('sort'))?q.get('sort'):'featured',newOnly:q.get('new')==='1'");
change("if(state.sort!=='featured')q.set('sort',state.sort);history.replaceState", "if(state.sort!=='featured')q.set('sort',state.sort);if(state.newOnly)q.set('new','1');history.replaceState");
change("function sync() {", "function sync() {\n    document.dispatchEvent(new CustomEvent('swm:change'));\n    $$('[data-compare-count]').forEach(el=>el.textContent=compare.length);");
const marker='renderDetail();initCatalog();renderBasket();initForms();renderReview();sync();';
const api=`  // A shared frontend interface keeps drawers, local profiles and native cards in sync.
  root.SWM_STORE = {
    products,categories,departments,escapeHTML,selectProducts,card,
    getBasket:()=>({...basket}), getSaved:()=>[...saved], getCompare:()=>[...compare],
    getState:()=>state?{...state}:null,
    addMany(items){
      for(const item of items){if(!byId(item.id))continue;const qty=Math.floor(Number(item.qty));if(!Number.isFinite(qty)||qty<1)continue;basket[item.id]=Math.min(9999,(basket[item.id]||0)+qty);}
      persistBasket();renderBasket();toast('Quote basket updated.',{href:'cart.html',label:'View basket →'});
    },
    quantity(id,value){if(!byId(id))return;const qty=Number(value);if(!Number.isInteger(qty)||qty<0||qty>9999)return;if(qty===0)delete basket[id];else basket[id]=qty;persistBasket();renderBasket();},
    toggleSaved(id){if(!byId(id))return;saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];save(local,'swm-saved',saved);if(state){state.saved=saved;if(state.savedOnly)renderCatalog(false);}sync();},
    toggleCompare(id){if(!byId(id))return false;if(compare.includes(id))compare=compare.filter(x=>x!==id);else if(compare.length<3)compare.push(id);else{toast('Compare up to three products.');return false;}comparison();$$('[data-compare]').forEach(el=>el.checked=compare.includes(el.dataset.compare));sync();return true;},
    clearCompare(){compare=[];comparison();$$('[data-compare]').forEach(el=>el.checked=false);sync();},
    filter(next){if(!state){const q=new URLSearchParams();if(next.category)q.set('category',next.category);if(next.query)q.set('q',next.query);location.href='products.html?'+q;return;}Object.assign(state,next);state.saved=saved;limit=24;if($('#catalog-query'))$('#catalog-query').value=state.query;if($('#sort-products'))$('#sort-products').value=state.sort;renderCatalog();},
    message:toast
  };
  renderDetail();initCatalog();renderBasket();initForms();renderReview();if(compare.length)comparison();sync();`;
change(marker,api);
// Sort options exist before catalog initialization, including query-string navigation.
change("$('#catalog-query').value=state.query;const siteSearch=", "if(!$('#sort-products').querySelector('option[value=\"newest\"]'))$('#sort-products').insertAdjacentHTML('beforeend','<option value=\"newest\">Newest additions</option>');\n    $('#catalog-query').value=state.query;const siteSearch=");
fs.writeFileSync(file,s);console.log('Integrated shared basket, saved items, persistent comparison, new arrivals and product-type filters.');
