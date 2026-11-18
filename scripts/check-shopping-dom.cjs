// Run with SWM_DOM_TEST_MODULE pointing to a separately installed jsdom module.
const {JSDOM,VirtualConsole}=require(process.env.SWM_DOM_TEST_MODULE||'jsdom');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),catalog=JSON.parse(fs.readFileSync(path.join(root,'data/catalog.json'),'utf8'));
const scripts=['catalog','shopping-core','store','shopping'].map(name=>fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'));
async function boot(file,query='',saved={}){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',err=>{if(!/navigation|window\.print/i.test(err.message))errors.push(err.message);});
 const dom=new JSDOM(fs.readFileSync(path.join(root,file),'utf8'),{url:'http://127.0.0.1:4173/'+file+query,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 const w=dom.window;w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=()=>{};w.Element.prototype.scrollBy=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};w.fetch=()=>{throw Error('Unexpected network request');};
 for(const[k,v]of Object.entries(saved))w.localStorage.setItem(k,JSON.stringify(v));
 for(const s of scripts)w.eval(s);
 await new Promise(r=>setTimeout(r,10));if(errors.length)throw Error(errors.join('\n'));
 return {dom,w,d:w.document,errors,flush:()=>new Promise(r=>setTimeout(r,10)),click(selector){const el=w.document.querySelector(selector);assert(el,'Missing '+selector);el.click();},change(el){el.dispatchEvent(new w.Event('change',{bubbles:true}));}};
}
(async()=>{
 const p=await boot('products.html');let {w,d}=p;
 assert(w.SWM_STORE&&w.SWM_FRONTEND);assert.equal(d.querySelectorAll('#catalog-grid .product-card').length,24);
 p.click('[data-quickview]');assert(d.querySelector('#swm-modal-backdrop'));p.click('[data-close-modal]');
 p.click('[data-open-bulk-rfq]');d.querySelector('#bulk-list-input').value='2 x '+catalog.products[0].name;p.click('[data-run-bulk-match]');assert.equal(d.querySelector('#bulk-add-all-btn').disabled,false);p.click('#bulk-add-all-btn');assert.equal(w.SWM_STORE.getBasket()[catalog.products[0].id],2);
 w.SWM_STORE.toggleCompare(catalog.products[0].id);assert.deepEqual(JSON.parse(w.sessionStorage.getItem('swm-compare')),[catalog.products[0].id]);
 w.SWM_STORE.filter({newOnly:true,sort:'newest'});assert(d.querySelector('#result-count').textContent.startsWith('60 '));assert([...d.querySelectorAll('#catalog-grid [data-product]')].every(el=>catalog.products.find(p=>p.id===el.dataset.product).origin==='medikabazaar'));
 p.click('#reset-filters');assert(d.querySelector('#result-count').textContent.startsWith('618 '));
 p.click('[data-shop-action="basket"]');let qty=d.querySelector('[data-shop-quantity]');qty.value='4';p.change(qty);assert.equal(w.SWM_STORE.getBasket()[catalog.products[0].id],4);
 p.click('[data-shop-remove]');assert.equal(Object.keys(w.SWM_STORE.getBasket()).length,0);p.click('[data-shop-action="undo"]');assert.equal(w.SWM_STORE.getBasket()[catalog.products[0].id],4);p.click('[data-shop-action="close"]');
 p.click('[data-shop-action="account"]');p.click('[data-shop-action="addresses"]');p.click('[data-shop-action="new-address"]');let form=d.querySelector('#shop-address-form');for(const[k,v]of Object.entries({name:'Test Buyer',line1:'Example Road',city:'Delhi',postcode:'110037',phone:'+91 9000000000'}))form.elements[k].value=v;form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(JSON.parse(w.localStorage.getItem('swm-addresses')).length,1);
 const addresses=JSON.parse(w.localStorage.getItem('swm-addresses')),defaultId=JSON.parse(w.localStorage.getItem('swm-default-address'));await p.flush();assert.deepEqual(p.errors,[]);p.dom.window.close();
 console.log('PASS: catalogue, quick view, bulk matching, basket quantity/removal/undo, comparison persistence, new arrivals, and address creation.');
 const product=catalog.products.find(p=>p.origin==='medikabazaar');const detail=await boot('product.html','?id='+product.id);detail.d.querySelector('#shop-product-note textarea').value='Check dimensions <script>alert(1)</script>';detail.d.querySelector('#shop-product-note').dispatchEvent(new detail.w.Event('submit',{bubbles:true,cancelable:true}));assert(JSON.parse(detail.w.localStorage.getItem('swm-product-notes'))[product.id].includes('Check dimensions'));await detail.flush();assert.deepEqual(detail.errors,[]);detail.dom.window.close();
 console.log('PASS: product detail, specifications, sharing controls and private purchasing notes.');
 const checkout=await boot('checkout.html','',{'swm-basket':{[product.id]:3},'swm-addresses':addresses,'swm-default-address':defaultId});assert(checkout.d.querySelector('#shop-address-select'));assert(checkout.d.querySelector('[name="deliveryAddress"]').value.includes('Example Road'));const qf=checkout.d.querySelector('#quote-form');for(const input of qf.querySelectorAll('[required]')){if(input.type==='checkbox')input.checked=true;else if(!input.value)input.value=input.type==='email'?'buyer@example.com':input.name==='phone'?'+91 9000000000':input.name==='city'?'Delhi':'Test Buyer';}assert(qf.reportValidity());qf.dispatchEvent(new checkout.w.Event('submit',{bubbles:true,cancelable:true}));const draft=JSON.parse(checkout.w.sessionStorage.getItem('swm-enquiry'));assert(draft.details.deliveryAddress.includes('Example Road'));assert.equal(JSON.parse(checkout.w.localStorage.getItem('swm-enquiry-history')).length,1);await checkout.flush();assert.deepEqual(checkout.errors,[]);checkout.dom.window.close();console.log('PASS: checkout address prefill, validated quote-draft preparation, and local request history.');
})().catch(err=>{console.error(err.stack);process.exitCode=1;});
