(function (root) {
  'use strict';
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function cleanBasket(value, products) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const ids = new Set(products.map(p => p.id));
    return Object.fromEntries(Object.entries(value).filter(([id, qty]) => ids.has(id) && Number.isFinite(Number(qty)) && Number(qty) > 0).map(([id,qty]) => [id, Math.min(9999, Math.max(1, Math.floor(Number(qty))))]));
  }
  function selectProducts(products, state) {
    const query = (state.query || '').trim().toLowerCase();
    let list = products.filter(p => (state.category === 'all' || !state.category || p.category === state.category) && (state.department === 'all' || !state.department || p.department === state.department) && (!state.savedOnly || state.saved.includes(p.id)) && (!query || [p.name,p.sourceName,p.subcategory,p.description,...p.features,...(Array.isArray(p.specifications) ? p.specifications.flatMap(spec => [spec.label,spec.value]) : [])].join(' ').toLowerCase().includes(query)));
    if (state.sort === 'az') list.sort((a,b) => a.name.localeCompare(b.name));
    if (state.sort === 'za') list.sort((a,b) => b.name.localeCompare(a.name));
    return list;
  }
  const core = {escapeHTML,cleanBasket,selectProducts};
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  if (!root.document) return;
  const {products,categories,departments} = root.SWM_CATALOG;
  const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
  const byId = id => products.find(p => p.id === id), category = id => categories.find(c => c.id === id);
  const e = escapeHTML;
  function read(store,key,fallback) { try { return JSON.parse(store.getItem(key)) ?? fallback; } catch { return fallback; } }
  function save(store,key,value) { try { store.setItem(key,JSON.stringify(value)); return true; } catch { return false; } }
  let local, session;
  try { local=root.localStorage; session=root.sessionStorage; } catch { /* Memory-only browsing remains available. */ }
  let basket = cleanBasket(read(local,'swm-basket',{}),products);
  let saved = read(local,'swm-saved',[]);
  saved=Array.isArray(saved)?saved.filter(id=>byId(id)):[];
  let compare=[];
  const heart='<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
  const photo = (p,loading='lazy') => p.image?`<img src="${e(p.image)}" referrerpolicy="no-referrer" alt="${e(p.name)}" loading="${loading}" width="600" height="420">`:'<div class="photo-request"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="10" y="16" width="44" height="34" rx="5"/><path d="m10 40 13-12 11 10 7-6 13 12"/><circle cx="41" cy="26" r="4"/></svg><span>Product photograph<br>available on enquiry</span></div>';
  const link = p => 'product.html?id='+encodeURIComponent(p.id);
  function card(p) { return `<article class="product-card" data-product="${p.id}"><div class="product-visual"><a href="${link(p)}" tabindex="-1" aria-hidden="true">${photo(p)}</a>${p.imageKind==='representative'?'<span class="photo-caption">Reference image</span>':''}<button type="button" class="save-button" data-save="${p.id}" aria-label="Save ${e(p.name)}" aria-pressed="${saved.includes(p.id)}">${heart}</button></div><div class="product-info"><span class="micro-label">${e(p.subcategory)}</span><h3><a href="${link(p)}">${e(p.name)}</a></h3><p>${e(p.features[0])}</p><div class="product-bottom"><span>Price on request</span><button type="button" class="add-button" data-add="${p.id}" aria-label="Add ${e(p.name)} to quote basket">+</button></div><label class="compare-check"><input type="checkbox" data-compare="${p.id}" ${compare.includes(p.id)?'checked':''}> Compare</label></div></article>`; }
  const homeCategoryProducts=$('#home-category-products');
  if(homeCategoryProducts){
    const productsByCategory=new Map(categories.map(item=>[item.id,products.filter(product=>product.category===item.id)]));
    homeCategoryProducts.innerHTML=categories.map(item=>{
      const categoryProducts=productsByCategory.get(item.id);
      if(!categoryProducts.length)return '';
      return `<section class="home-product-category"><div class="home-category-heading"><h3>${e(item.name)}</h3><div class="home-category-meta"><span>${categoryProducts.length} products</span><a class="home-category-view-all" href="products.html?category=${encodeURIComponent(item.id)}" aria-label="View all ${e(item.name)} products">View all<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></a></div></div><div class="product-grid home-category-grid" data-category="${e(item.id)}"></div></section>`;
    }).join('');
    const grids=Array.from(homeCategoryProducts.querySelectorAll('.home-category-grid'));
    function renderHomeProducts(){
      grids.forEach(grid=>{
        const columns=getComputedStyle(grid).gridTemplateColumns.split(/\s+/).length;
        if(grid.dataset.columns===String(columns))return;
        grid.dataset.columns=String(columns);
        const categoryProducts=productsByCategory.get(grid.dataset.category)||[];
        grid.innerHTML=categoryProducts.slice(0,columns*2).map(card).join('');
      });
    }
    let resizeFrame;
    renderHomeProducts();
    window.addEventListener('resize',()=>{
      cancelAnimationFrame(resizeFrame);
      resizeFrame=requestAnimationFrame(renderHomeProducts);
    },{passive:true});
  }
  let toastTimer;
  function toast(text,action=null) {
    const box=$('.toast');if(!box)return;
    box.innerHTML=`<span>${e(text)}</span>${action?`<a class="toast-link" href="${e(action.href)}">${e(action.label)}</a>`:''}`;
    box.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>box.classList.remove('visible'),4000);
  }
  function sync() {
    const totalQty=Object.values(basket).reduce((a,b)=>a+b,0);
    $$('[data-cart-count]').forEach(el=>el.textContent=totalQty);
    $$('[data-saved-count]').forEach(el=>el.textContent=saved.length);
    $$('[data-save]').forEach(el=>el.setAttribute('aria-pressed',saved.includes(el.dataset.save)));
    const page=document.body?.dataset?.page;
    let fab=$('#floating-basket');
    if(totalQty>0&&page!=='cart'&&page!=='checkout'){
      if(!fab){
        fab=document.createElement('a');
        fab.id='floating-basket';
        fab.className='floating-basket';
        fab.href='cart.html';
        document.body.appendChild(fab);
      }
      fab.innerHTML=`<span>Quote basket</span><b>${totalQty}</b>`;
      fab.setAttribute('aria-label',`View quote basket (${totalQty} ${totalQty===1?'item':'items'})`);
      fab.hidden=false;
    }else if(fab){
      fab.hidden=true;
    }
  }
  function persistBasket() { const ok=save(local,'swm-basket',basket);sync();return ok; }
  function quantityControl(p) {return `<div class="quantity"><button type="button" data-quantity="${p.id}" data-delta="-1" aria-label="Decrease quantity of ${e(p.name)}" ${basket[p.id]<=1?'disabled':''}>−</button><label class="sr-only" for="qty-${p.id}">Quantity of ${e(p.name)}</label><input id="qty-${p.id}" type="number" min="1" max="9999" step="1" value="${basket[p.id]}" data-quantity-input="${p.id}"><button type="button" data-quantity="${p.id}" data-delta="1" aria-label="Increase quantity of ${e(p.name)}">+</button></div>`;}
  function basketSummary() {return `<h2>Quote summary</h2><div class="summary-line"><span>Products</span><strong>${Object.keys(basket).length}</strong></div><div class="summary-line"><span>Total quantity</span><strong>${Object.values(basket).reduce((a,b)=>a+b,0)}</strong></div><div class="summary-line"><span>Pricing</span><strong>On quotation</strong></div><p>Our team will confirm configuration, taxes, delivery and pricing before you place an order.</p>`;}
  function empty(title,desc) {return `<div class="empty-state"><span class="empty-symbol">＋</span><h2>${title}</h2><p>${desc}</p><a class="button" href="products.html">Explore products →</a></div>`;}
  function renderBasket() {
    const host=$('#basket-page');if(!host)return;
    if(!Object.keys(basket).length){host.innerHTML=empty('Your quote basket is empty.','Find the products for your facility and add them to your selection.');return;}
    host.innerHTML=`<div class="basket-layout"><div class="basket-items">${Object.keys(basket).map(id=>{const p=byId(id);return `<article class="basket-item"><a class="basket-photo" href="${link(p)}">${photo(p)}</a><div><span class="micro-label">${e(category(p.category).name)}</span><h2><a href="${link(p)}">${e(p.name)}</a></h2><span class="muted">Price on request</span><button type="button" class="text-button remove-button" data-remove="${id}">Remove</button></div>${quantityControl(p)}</article>`;}).join('')}<a class="text-link" href="products.html">← Continue browsing</a></div><aside class="summary-card">${basketSummary()}<a class="button button-block" href="checkout.html">Request a quote →</a><span class="form-note">No payment is required to request a quotation.</span></aside></div>`;
  }
  function renderDetail() {
    const host=$('#product-detail');if(!host)return;
    const p=byId(new URLSearchParams(location.search).get('id'));
    if(!p){host.innerHTML=empty('Product not found.','This link may be incomplete. Browse the catalogue to find your product.');return;}
    document.title=p.name+' | Surgical Wholesale Mart';
    host.innerHTML=`<div class="breadcrumbs"><a href="index.html">Home</a><span>/</span><a href="products.html">Products</a><span>/</span><a href="products.html?category=${p.category}">${e(category(p.category).name)}</a></div><div class="detail-layout"><div class="detail-image">${photo(p,'eager')}</div><div class="detail-copy"><span class="eyebrow">${e(p.subcategory)}</span><h1>${e(p.name)}</h1><p class="detail-description">${e(p.description)}</p><ul class="feature-list">${p.features.map(x=>`<li><span>✓</span>${e(x)}</li>`).join('')}</ul><div class="detail-price">Price on request<small>Confirm the configuration and quantity for your quotation.</small></div><div class="detail-actions"><button type="button" class="button" data-add="${p.id}">Add to quote basket +</button><button type="button" class="save-detail" data-save="${p.id}" aria-pressed="${saved.includes(p.id)}">${heart} Save product</button></div><a class="text-link" href="contact.html?subject=${encodeURIComponent(p.name)}">Ask a product question →</a><div class="detail-note">${p.imageKind==='representative'?'This is a representative range photo, not confirmation of the exact model or configuration. ':''}Availability, specifications, included accessories, warranty and delivery are confirmed with your quotation.</div></div></div><div class="detail-tabs"><h2>Before you order</h2><details open><summary>Product configuration</summary><p>Tell us your preferred size, configuration and quantity. Request a current specification sheet and a photograph of the configuration being quoted.</p></details><details><summary>Delivery & installation</summary><p>Share your delivery city and site access requirements. Ask the team to include transport, installation and training scope in your quotation where applicable.</p></details><details><summary>Warranty & returns</summary><p>Ask for product-specific warranty coverage, service arrangements and return terms in writing before confirming your order.</p></details></div><div class="section-heading"><h2>Explore similar requirements</h2><a class="text-link" href="products.html?category=${p.category}">View category →</a></div><div class="product-grid related-grid">${products.filter(x=>x.category===p.category&&x.id!==p.id).slice(0,4).map(card).join('')}</div>`;
    const specifications = Array.isArray(p.specifications) ? p.specifications.filter(spec => spec && spec.label && spec.value) : [];
    if (specifications.length) {
      const details = document.createElement('section');
      details.className = 'product-specifications';
      details.innerHTML = '<h2>Product specifications</h2>';
      const list = document.createElement('dl');
      specifications.forEach(spec => {
        const row = document.createElement('div');
        const term = document.createElement('dt');
        const value = document.createElement('dd');
        term.textContent = spec.label;
        value.textContent = spec.value;
        row.append(term, value);
        list.append(row);
      });
      details.append(list);
      host.querySelector('.detail-description').insertAdjacentElement('afterend', details);
    }
  }
  let state,limit=24;
  function renderCatalog(updateURL=true) {
    if(!$('#catalog-grid'))return;
    const list=selectProducts(products,state),cat=category(state.category);
    $('#catalog-title').textContent=state.savedOnly?'Saved products':cat?.name||'All products';
    $('#result-count').textContent=`${list.length} ${list.length===1?'product':'products'}${state.query?' matching your search':''}`;
    $('#catalog-grid').innerHTML=list.slice(0,limit).map(card).join('')||empty('No products match your selection.','Try another search or reset the filters. You can also share your requirement with our team.');
    let more=$('#load-more');if(!more){more=document.createElement('button');more.type='button';more.id='load-more';more.className='button load-more';$('#catalog-grid').after(more);more.addEventListener('click',()=>{limit+=24;renderCatalog(false);});}
    more.hidden=list.length<=limit;more.textContent=`Show more products (${Math.min(limit,list.length)} of ${list.length})`;
    $('#catalog-enquiry').innerHTML=cat?.requests?`<div class="category-enquiry"><h2>Need something else in ${e(cat.name.toLowerCase())}?</h2><p>Share your preferred type, size and quantity with our team.</p><div>${cat.requests.map(x=>`<a href="contact.html?subject=${encodeURIComponent(x)}">${e(x)} →</a>`).join('')}</div></div>`:'';
    const activeTags=[cat?{key:'category',label:cat.name}:null,state.department!=='all'?{key:'department',label:departments.find(d=>d.id===state.department)?.name}:null,state.query?{key:'query',label:`“${state.query}”`}:null,state.savedOnly?{key:'savedOnly',label:'Saved only'}:null].filter(x=>x&&x.label);
    $('#active-filters').innerHTML=activeTags.map(t=>`<button type="button" data-clear-filter="${t.key}" aria-label="Remove filter ${e(t.label)}">${e(t.label)} <span aria-hidden="true">×</span></button>`).join('');
    $$('input[name="category"]').forEach(x=>x.checked=x.value===state.category);
    $('#department-filter').value=state.department;$('#saved-filter').setAttribute('aria-pressed',state.savedOnly);
    if(updateURL){const q=new URLSearchParams();if(state.category!=='all')q.set('category',state.category);if(state.department!=='all')q.set('department',state.department);if(state.query)q.set('q',state.query);if(state.savedOnly)q.set('saved','1');if(state.sort!=='featured')q.set('sort',state.sort);history.replaceState(null,'',location.pathname+(q.size?'?'+q:''));}
    sync();
  }
  function initCatalog() {
    if(!$('#catalog-grid'))return;
    const q=new URLSearchParams(location.search);
    state={category:category(q.get('category'))?q.get('category'):'all',department:departments.some(d=>d.id===q.get('department'))?q.get('department'):'all',query:q.get('q')||'',savedOnly:q.get('saved')==='1',saved,sort:['az','za'].includes(q.get('sort'))?q.get('sort'):'featured'};
    $('#catalog-query').value=state.query;const siteSearch=$('#site-search');if(siteSearch)siteSearch.value=state.query;$('#sort-products').value=state.sort;
    $$('input[name="category"]').forEach(x=>x.addEventListener('change',()=>{state.category=x.value;limit=24;renderCatalog();}));
    $('#department-filter').addEventListener('change',event=>{state.department=event.target.value;limit=24;renderCatalog();});
    $('#sort-products').addEventListener('change',event=>{state.sort=event.target.value;renderCatalog();});
    $('#catalog-query').addEventListener('input',event=>{state.query=event.target.value;limit=24;renderCatalog();});
    $('#saved-filter').addEventListener('click',()=>{state.savedOnly=!state.savedOnly;limit=24;renderCatalog();});
    $('#reset-filters').addEventListener('click',()=>{state={category:'all',department:'all',query:'',savedOnly:false,saved,sort:'featured'};$('#catalog-query').value='';$('#sort-products').value='featured';limit=24;renderCatalog();});
    renderCatalog(false);
  }
  function comparison() {
    let host=$('#comparison');if(!host){host=document.createElement('section');host.id='comparison';host.className='comparison';$('#main').appendChild(host);}
    host.hidden=!compare.length;
    host.innerHTML=`<div class="comparison-heading"><strong>Compare ${compare.length} of 3 products</strong><button type="button" class="text-button" data-clear-compare>Clear comparison</button></div><div class="comparison-table"><table><caption class="sr-only">Selected product comparison</caption><thead><tr><th>Product</th>${compare.map(id=>`<th><a href="${link(byId(id))}">${e(byId(id).name)}</a></th>`).join('')}</tr></thead><tbody><tr><th>Family</th>${compare.map(id=>`<td>${e(category(byId(id).category).name)}</td>`).join('')}</tr><tr><th>Listed features</th>${compare.map(id=>`<td>${byId(id).features.map(e).join('<br>')}</td>`).join('')}</tr><tr><th>Quotation</th>${compare.map(id=>`<td><button type="button" class="text-button" data-add="${id}">Add to quote +</button></td>`).join('')}</tr></tbody></table></div>`;
  }
  function enquiryText(details,items) {
    const productLines=items.length?['','PRODUCT SELECTION',...items.map(({id,qty})=>`${qty} × ${byId(id)?.name||id}`)]:[];
    return ['Surgical Wholesale Mart — Product enquiry','',...Object.entries(details).filter(([,v])=>v).map(([k,v])=>`${({name:'Name',organisation:'Organisation',email:'Email',phone:'Phone',city:'City',postcode:'Postcode',notes:'Requirements',message:'Message',location:'Contact location',supportType:'Support required',product:'Product / model',reference:'Serial / order reference',siteAddress:'Equipment / site address',contactMethod:'Preferred contact method',meetingFormat:'Meeting format',meetingDate:'Preferred date',meetingTime:'Preferred time window',timezone:'Time zone'})[k]||k}: ${v}`),...productLines,'','Please confirm pricing, configuration, taxes, availability and delivery.'].join('\n');
  }
  function sharing(text) {
    const whatsapp=text.length<6000?`<a class="button button-outline" target="_blank" rel="noopener" href="https://wa.me/919289976683?text=${encodeURIComponent(text)}">Open in WhatsApp</a>`:'';
    return `<div class="share-actions"><a class="button" href="mailto:info@drsmith.co.in?subject=${encodeURIComponent('Product quotation enquiry — Surgical Wholesale Mart')}&body=${encodeURIComponent(text)}">Open email draft →</a>${whatsapp}<button type="button" class="text-button" data-download-enquiry>Download enquiry</button></div><p class="form-note">Your message has not been sent. Email and WhatsApp open a draft for you to review and send. For a large list, download and attach the enquiry to your email.</p>`;
  }
  let currentEnquiry='';
  function renderReview() {
    const host=$('#enquiry-review');if(!host)return;
    const draft=read(session,'swm-enquiry',null);
    if(!draft||typeof draft.text!=='string'){host.innerHTML=empty('There is no enquiry draft yet.','Build a quote basket or contact our team to start your enquiry.');return;}
    currentEnquiry=draft.text;
    host.innerHTML=`<div class="review-card"><span class="eyebrow">READY FOR YOUR REVIEW</span><h1>Your enquiry draft is ready.</h1><p>Check your selection and contact details, then choose how to share it with the product team.</p><pre class="enquiry-preview">${e(currentEnquiry)}</pre>${sharing(currentEnquiry)}<a class="text-link" href="checkout.html">← Edit enquiry</a><button type="button" class="text-button" data-discard-draft>Discard contact draft</button></div>`;
  }
  function initForms() {
    const quote=$('#quote-form');
    if(quote){
      const summary=$('#checkout-summary');summary.innerHTML=basketSummary()+Object.keys(basket).map(id=>`<div class="summary-product"><span>${basket[id]} × ${e(byId(id).name)}</span></div>`).join('');
      if(!Object.keys(basket).length){quote.innerHTML=empty('Add products to get started.','Your quote basket is currently empty.');return;}
      const draft=read(session,'swm-enquiry',null);if(draft?.details)Object.entries(draft.details).forEach(([k,v])=>{if(quote.elements[k])quote.elements[k].value=v;});
      quote.addEventListener('submit',event=>{event.preventDefault();if(!quote.reportValidity())return;const details=Object.fromEntries(new FormData(quote));const items=Object.entries(basket).map(([id,qty])=>({id,qty}));currentEnquiry=enquiryText(details,items);if(save(session,'swm-enquiry',{details,text:currentEnquiry})){location.href='thankyou.html';}else{quote.innerHTML=`<h2>Review your enquiry</h2><pre class="enquiry-preview">${e(currentEnquiry)}</pre>${sharing(currentEnquiry)}`;}});
    }
    const contact=$('#contact-form');if(contact){const params=new URLSearchParams(location.search);const chosenLocation=params.get('location');if(chosenLocation&&contact.elements.location){const choice=Array.from(contact.elements.location.options).find(x=>x.dataset.locationId===chosenLocation);if(choice)contact.elements.location.value=choice.value;}const subject=params.get('subject');if(subject)$('#contact-message').value='I would like to enquire about '+subject+'.\n';contact.addEventListener('submit',event=>{event.preventDefault();if(!contact.reportValidity())return;currentEnquiry=enquiryText(Object.fromEntries(new FormData(contact)),[]);$('#contact-review').innerHTML=`<h3>Review before sharing</h3><pre class="enquiry-preview">${e(currentEnquiry)}</pre>${sharing(currentEnquiry)}`;$('#contact-review').scrollIntoView({behavior:'smooth',block:'nearest'});});}
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.navigate){event.preventDefault();location.href=button.dataset.navigate;return;}
    if(button.dataset.clearFilter&&state){
      const key=button.dataset.clearFilter;
      if(key==='category')state.category='all';
      if(key==='department')state.department='all';
      if(key==='query'){state.query='';if($('#catalog-query'))$('#catalog-query').value='';}
      if(key==='savedOnly')state.savedOnly=false;
      limit=24;renderCatalog();return;
    }
    if(button.dataset.add){const id=button.dataset.add;if(!byId(id))return;basket[id]=Math.min(9999,(basket[id]||0)+1);const stored=persistBasket();toast(stored?'Added to your quote basket.':'Added for this visit. Browser storage is unavailable.',{href:'cart.html',label:'View quote basket →'});renderBasket();}
    if(button.dataset.save){const id=button.dataset.save;saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];save(local,'swm-saved',saved);sync();if(state){state.saved=saved;if(state.savedOnly)renderCatalog(false);}toast(saved.includes(id)?'Product saved.':'Product removed from saved items.',saved.includes(id)&&!$('#catalog-grid')?{href:'products.html?saved=1',label:'View saved →'}:null);}
    if(button.dataset.remove){delete basket[button.dataset.remove];persistBasket();renderBasket();toast('Product removed from your basket.');}
    if(button.dataset.quantity){const id=button.dataset.quantity;basket[id]=Math.max(1,Math.min(9999,basket[id]+Number(button.dataset.delta)));persistBasket();renderBasket();}
    if(button.hasAttribute('data-clear-compare')){compare=[];$$('[data-compare]').forEach(x=>x.checked=false);comparison();}
    if(button.hasAttribute('data-download-enquiry')){const blob=new Blob([currentEnquiry],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='surgical-wholesale-mart-enquiry.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    if(button.hasAttribute('data-discard-draft')){try{session.removeItem('swm-enquiry');}catch{}currentEnquiry='';renderReview();}
  });
  document.addEventListener('change',event=>{
    const input=event.target;
    if(input.dataset.quantityInput){const qty=Number(input.value);if(!Number.isInteger(qty)||qty<1||qty>9999){input.value=basket[input.dataset.quantityInput];toast('Choose a whole quantity between 1 and 9999.');return;}basket[input.dataset.quantityInput]=qty;persistBasket();renderBasket();}
    if(input.dataset.compare){const id=input.dataset.compare;if(input.checked&&compare.length===3){input.checked=false;toast('Compare up to three products at a time.');return;}compare=input.checked?[...compare,id]:compare.filter(x=>x!==id);comparison();if(input.checked)toast(`Comparing ${compare.length} of 3 products.`,{href:'#comparison',label:'Jump to comparison ↓'});}
  });
  const menu=$('.mobile-menu');menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',open);$('#store-nav').classList.toggle('is-open',open);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu){menu.setAttribute('aria-expanded','false');$('#store-nav').classList.remove('is-open');}});
  const featuredSection=$('#featured-products');
  const marquee=featuredSection?.querySelector('.product-marquee');
  const track=marquee?.querySelector('.product-marquee-track');
  if(track&&marquee){
    const originals=Array.from(track.children);
    const previous=featuredSection.querySelector('[data-product-carousel="previous"]');
    const next=featuredSection.querySelector('[data-product-carousel="next"]');
    const controls=featuredSection.querySelector('.product-carousel-controls');
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const phoneLayout=window.matchMedia('(max-width: 700px)');
    let cycleWidth=0,cardStep=0,viewportWidth=0,position=0,lastWritten=0,frame=0,previousTime=0;
    let focused=false,pointerActive=false,visible=true,hovered=false,temporarilyPaused=false,resumeTimer;

    const modulo=(value,length)=>(value%length+length)%length;
    function writePosition(value){position=value;marquee.scrollLeft=value;lastWritten=marquee.scrollLeft;}
    function normalizePosition(){
      if(!cycleWidth)return;
      const normalized=cycleWidth+modulo(position-cycleWidth,cycleWidth);
      if(Math.abs(normalized-marquee.scrollLeft)>1)writePosition(normalized);
    }
    function syncPlayback(){
      cancelAnimationFrame(frame);
      previousTime=0;
      if(cycleWidth&&!reducedMotion.matches&&!hovered&&!focused&&!pointerActive&&!temporarilyPaused&&visible&&!document.hidden&&!marquee.querySelector('.is-zoomed')){
        normalizePosition();
        frame=requestAnimationFrame(tick);
      }
    }
    function tick(time){
      const elapsed=previousTime?Math.min(time-previousTime,64):0;
      previousTime=time;
      position+=elapsed*(phoneLayout.matches?30:32)/1000;
      writePosition(position);
      normalizePosition();
      frame=requestAnimationFrame(tick);
    }
    function pauseBriefly(duration=1800){
      temporarilyPaused=true;
      window.clearTimeout(resumeTimer);
      resumeTimer=window.setTimeout(()=>{temporarilyPaused=false;syncPlayback();},duration);
      syncPlayback();
    }
    function makeCopySet(){
      const fragment=document.createDocumentFragment();
      originals.forEach(item=>{
        const copy=item.cloneNode(true);
        copy.dataset.carouselCopy='';
        copy.setAttribute('aria-hidden','true');
        copy.inert=true;
        copy.querySelectorAll('a,button,input').forEach(el=>el.tabIndex=-1);
        copy.querySelectorAll('img').forEach(image=>{image.loading='lazy';});
        fragment.appendChild(copy);
      });
      return fragment;
    }
    function measureCarousel(){
      const gap=parseFloat(getComputedStyle(track).columnGap)||18;
      const step=originals[0]?.getBoundingClientRect().width+gap;
      const width=marquee.clientWidth;
      if(!step||!width)return;
      controls.hidden=phoneLayout.matches;
      if(step===cardStep&&width===viewportWidth)return;
      const progress=cycleWidth?modulo(position-cycleWidth,cycleWidth)/cycleWidth:0;
      track.querySelectorAll('[data-carousel-copy]').forEach(copy=>copy.remove());
      cardStep=step;
      viewportWidth=width;
      cycleWidth=step*originals.length;
      track.insertBefore(makeCopySet(),track.firstChild);
      const extraSets=Math.ceil(viewportWidth/cycleWidth)+1;
      for(let set=0;set<extraSets;set++)track.appendChild(makeCopySet());
      writePosition(cycleWidth*(1+progress));
      syncPlayback();
    }
    function moveProducts(direction){
      pauseBriefly(2500);
      normalizePosition();
      const count=Math.min(originals.length,Math.max(1,Math.floor(viewportWidth/cardStep)));
      marquee.scrollBy({left:direction*cardStep*count,behavior:reducedMotion.matches?'auto':'smooth'});
    }

    previous?.addEventListener('click',()=>moveProducts(-1));
    next?.addEventListener('click',()=>moveProducts(1));
    marquee.addEventListener('pointerenter',event=>{
      if(event.pointerType==='touch')return;
      hovered=true;
      syncPlayback();
    });
    marquee.addEventListener('pointerleave',event=>{
      if(event.pointerType==='touch')return;
      hovered=false;
      window.clearTimeout(resumeTimer);
      temporarilyPaused=false;
      syncPlayback();
    });
    marquee.addEventListener('focusin',event=>{
      const card=event.target.closest('.product-card');
      focused=Boolean(card&&event.target.matches(':focus-visible'));
      syncPlayback();
      if(card){
        card.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
        position=marquee.scrollLeft;
        lastWritten=position;
      }
    });
    marquee.addEventListener('focusout',event=>{
      const target=event.relatedTarget;
      focused=Boolean(target&&target.closest('.product-card')&&target.matches(':focus-visible'));
      syncPlayback();
    });
    marquee.addEventListener('pointerdown',()=>{
      pointerActive=true;
      syncPlayback();
    },{passive:true});
    function releasePointer(){
      if(!pointerActive)return;
      pointerActive=false;
      pauseBriefly();
    }
    window.addEventListener('pointerup',releasePointer,{passive:true});
    window.addEventListener('pointercancel',releasePointer,{passive:true});
    marquee.addEventListener('wheel',()=>pauseBriefly(),{passive:true});
    marquee.addEventListener('scroll',()=>{
      if(Math.abs(marquee.scrollLeft-lastWritten)<=1)return;
      position=marquee.scrollLeft;
      lastWritten=marquee.scrollLeft;
      normalizePosition();
      pauseBriefly();
    },{passive:true});
    reducedMotion.addEventListener('change',syncPlayback);
    document.addEventListener('visibilitychange',syncPlayback);
    if('IntersectionObserver'in window){
      new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;syncPlayback();}).observe(featuredSection);
    }
    if('ResizeObserver'in window)new ResizeObserver(measureCarousel).observe(marquee);
    else window.addEventListener('resize',measureCarousel);
    phoneLayout.addEventListener('change',measureCarousel);
    measureCarousel();
  }
  // External hosts can change or reject hotlinks; never leave a broken image icon.
  const ZOOM_BOX_SELECTOR = '.product-visual,.detail-image,.basket-photo,.category-visual,.procurement-visual,.editorial-image';
  function setZoomOrigin(box, event) {
    if (!event || (!event.clientX && !event.clientY)) return;
    const rect = box.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.min(85, Math.max(15, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(85, Math.max(15, ((event.clientY - rect.top) / rect.height) * 100));
    box.style.setProperty('--zoom-x', `${x.toFixed(1)}%`);
    box.style.setProperty('--zoom-y', `${y.toFixed(1)}%`);
  }
  function clearZoom(exceptBox = null) {
    $$(ZOOM_BOX_SELECTOR + '.is-zoomed').forEach(el => {
      if (el !== exceptBox) {
        el.classList.remove('is-zoomed');
        el.style.removeProperty('--zoom-x');
        el.style.removeProperty('--zoom-y');
        el.querySelector('.zoom-action')?.remove();
      }
    });
  }
  function boxTargetHref(box) {
    const anchor = box.matches('a[href]') ? box : (box.querySelector('a[href]') || box.closest('a[href]'));
    return anchor?.getAttribute('href') || '';
  }
  document.addEventListener('pointermove', event => {
    const box = event.target.closest(ZOOM_BOX_SELECTOR);
    if (!box || !box.querySelector('img')) return;
    setZoomOrigin(box, event);
  }, {passive: true});
  document.addEventListener('pointerout', event => {
    const box = event.target.closest(ZOOM_BOX_SELECTOR);
    if (!box || box.contains(event.relatedTarget) || box.classList.contains('is-zoomed')) return;
    box.style.removeProperty('--zoom-x');
    box.style.removeProperty('--zoom-y');
  }, {passive: true});
  document.addEventListener('click', event => {
    if (event.target.closest('button')) return;
    const box = event.target.closest(ZOOM_BOX_SELECTOR);
    if (!box || !box.querySelector('img')) {
      clearZoom();
      return;
    }
    event.preventDefault();
    const willZoom = !box.classList.contains('is-zoomed');
    clearZoom(box);
    setZoomOrigin(box, event);
    box.classList.toggle('is-zoomed', willZoom);
    if (willZoom) {
      const href = boxTargetHref(box);
      if (href && !box.querySelector('.zoom-action')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'zoom-action';
        btn.dataset.navigate = href;
        btn.textContent = box.classList.contains('category-visual') ? 'Open category →' : 'View details →';
        box.appendChild(btn);
      }
    } else {
      box.style.removeProperty('--zoom-x');
      box.style.removeProperty('--zoom-y');
      box.querySelector('.zoom-action')?.remove();
    }
  });
  document.addEventListener('dblclick', event => {
    if (event.target.closest('button')) return;
    const box = event.target.closest(ZOOM_BOX_SELECTOR);
    if (!box) return;
    const href = boxTargetHref(box);
    if (href) location.href = href;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') clearZoom();
  });
  document.addEventListener('error', event => {
    const img = event.target;
    if (img.tagName !== 'IMG' || !img.closest(ZOOM_BOX_SELECTOR)) return;
    const fallback = document.createElement('div');
    fallback.className = 'photo-request';
    fallback.innerHTML = '<span>Product photograph<br>available on enquiry</span>';
    img.replaceWith(fallback);
  }, true);
  renderDetail();initCatalog();renderBasket();initForms();renderReview();sync();
  root.addEventListener('storage',event=>{if(event.key==='swm-basket'){basket=cleanBasket(read(local,'swm-basket',{}),products);sync();renderBasket();}if(event.key==='swm-saved'){const value=read(local,'swm-saved',[]);saved=Array.isArray(value)?value.filter(id=>byId(id)):[];sync();if(state){state.saved=saved;renderCatalog(false);}}});
})(typeof window !== 'undefined' ? window : globalThis);
