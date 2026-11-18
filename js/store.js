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
    let list = products.filter(p => (state.category === 'all' || !state.category || p.category === state.category) && (state.department === 'all' || !state.department || p.department === state.department) && (state.subcategory === 'all' || !state.subcategory || p.subcategory === state.subcategory) && (!state.savedOnly || state.saved.includes(p.id)) && (!query || [p.name,p.sourceName,p.subcategory,p.description,...p.features,...(Array.isArray(p.specifications) ? p.specifications.flatMap(spec => [spec.label,spec.value]) : [])].join(' ').toLowerCase().includes(query)));
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
  let recent = read(local,'swm-recent',[]);
  recent=Array.isArray(recent)?recent.filter(id=>byId(id)).slice(0,8):[];
  let savedPincode = String(read(local,'swm-pincode','') || '');
  let compare=[];
  const heart='<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
  const photo = (p,loading='lazy') => p.image?`<img src="${e(p.image)}" referrerpolicy="no-referrer" alt="${e(p.name)}" loading="${loading}" width="600" height="420">`:'<div class="photo-request"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="10" y="16" width="44" height="34" rx="5"/><path d="m10 40 13-12 11 10 7-6 13 12"/><circle cx="41" cy="26" r="4"/></svg><span>Product photograph<br>available on enquiry</span></div>';
  const link = p => 'product.html?id='+encodeURIComponent(p.id);
  function card(p) { const isSaved=saved.includes(p.id); return `<article class="product-card" data-product="${p.id}"><div class="product-visual"><a href="${link(p)}" tabindex="-1" aria-hidden="true">${photo(p)}</a>${p.imageKind==='representative'?'<span class="photo-caption">Reference image</span>':''}<button type="button" class="save-button${isSaved?' is-liked':''}" data-save="${p.id}" aria-label="Save ${e(p.name)}" aria-pressed="${isSaved}">${heart}</button></div><div class="product-info"><span class="micro-label">${e(p.subcategory)}</span><h3><a href="${link(p)}">${e(p.name)}</a></h3><p>${e(p.features[0])}</p><div class="product-bottom"><span>Price on request</span><button type="button" class="add-button" data-add="${p.id}" aria-label="Add ${e(p.name)} to quote basket">+</button></div><div class="card-aux-row"><label class="compare-check"><input type="checkbox" data-compare="${p.id}" ${compare.includes(p.id)?'checked':''}> Compare</label><button type="button" class="quickview-btn" data-quickview="${p.id}">Quick view</button></div></div></article>`; }
  function evaluatePincode(raw) {
    const val = String(raw || '').trim().toUpperCase();
    if (!val) return null;
    if (val === 'UAE' || val.includes('SHARJAH') || val.includes('DUBAI')) {
      return {ok:true, hub:'Sharjah Experience Centre (UAE)', timeline:'International dispatch & export documentation supported', install:'Project & installation coordination available'};
    }
    if (!/^[1-8][0-9]{5}$/.test(val)) {
      return {ok:false, message:'Enter a valid 6-digit Indian pincode (e.g. 110037) or UAE.'};
    }
    const p2 = val.slice(0,2);
    let hub = 'New Delhi (Kapashera & Daryaganj) / Jhajjar Manufacturing Hub';
    if (['20','21','22','23','24','25','26','27','28'].includes(p2)) hub = 'Varanasi Experience Centre & North Hub';
    else if (['40','41','42','43','44'].includes(p2)) hub = 'Nagpur (Maharashtra) Experience Centre';
    else if (['70','71','72','73','74'].includes(p2)) hub = 'Kolkata Experience Centre';
    else if (['78'].includes(p2)) hub = 'Guwahati Experience Centre';
    else if (['80','81','82','83','84','85'].includes(p2)) hub = 'Patna Experience Centre';
    return {ok:true, pin:val, hub, timeline:'Standard dispatch readiness: 3–7 business days (confirmed on quotation)', install:'On-site installation & clinical training available on eligible equipment'};
  }
  function trackRecent(id) {
    if (!byId(id)) return;
    recent = [id, ...recent.filter(x => x !== id)].slice(0, 8);
    save(local, 'swm-recent', recent);
  }
  function renderRecentSection(excludeId = null) {
    const items = recent.filter(id => id !== excludeId && byId(id)).slice(0, 4).map(byId);
    if (!items.length) return '';
    return `<section class="recent-section"><div class="section-heading"><div><span class="eyebrow">RECENTLY VIEWED</span><h2>Continue where you left off.</h2></div><button type="button" class="text-button" data-clear-recent>Clear history</button></div><div class="product-grid related-grid">${items.map(card).join('')}</div></section>`;
  }
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
      sync();
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
    $$('[data-compare-count]').forEach(el=>el.textContent=compare.length);
    $$('[data-save]').forEach(el=>{
      const isSaved=saved.includes(el.dataset.save);
      el.setAttribute('aria-pressed',isSaved?'true':'false');
      el.classList.toggle('is-liked',isSaved);
    });
    $$('[data-compare]').forEach(el=>{
      el.checked=compare.includes(el.dataset.compare);
    });
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
    if(!Object.keys(basket).length){host.innerHTML=empty('Your quote basket is empty.','Find the products for your facility and add them to your selection.')+renderRecentSection();sync();return;}
    host.innerHTML=`<div class="basket-tools-bar"><div class="basket-quick-add"><input id="basket-quick-input" type="search" placeholder="Quick add product by name or subcategory…"><div id="basket-quick-results" class="pbar-results" hidden></div></div><div class="basket-export-actions"><button type="button" data-open-bulk-rfq>Paste bulk list</button><button type="button" data-export-csv>Export CSV</button><button type="button" data-print-basket>Print quote sheet</button><button type="button" data-clear-basket>Clear basket</button></div></div><div class="basket-layout"><div class="basket-items">${Object.keys(basket).map(id=>{const p=byId(id);return `<article class="basket-item"><a class="basket-photo" href="${link(p)}">${photo(p)}</a><div><span class="micro-label">${e(category(p.category).name)} · ${e(p.subcategory)}</span><h2><a href="${link(p)}">${e(p.name)}</a></h2><span class="muted">Price on request</span><div style="display:flex;gap:12px;align-items:center;margin-top:6px"><button type="button" class="save-detail" data-save="${id}" aria-pressed="${saved.includes(id)}" style="min-height:30px;padding:4px 10px;font-size:11px">${heart} Save</button><button type="button" class="text-button remove-button" data-remove="${id}" style="margin:0">Remove</button></div></div>${quantityControl(p)}</article>`;}).join('')}<a class="text-link" href="products.html">← Continue browsing</a></div><aside class="summary-card">${basketSummary()}<a class="button button-block" href="checkout.html">Request a quote →</a><span class="form-note">No payment is required to request a quotation.</span></aside></div>${renderRecentSection()}`;
    sync();
    const qInput=$('#basket-quick-input'),qBox=$('#basket-quick-results');
    if(qInput&&qBox){
      qInput.addEventListener('input',()=>{
        const q=qInput.value.trim().toLowerCase();
        if(!q){qBox.hidden=true;return;}
        const matches=selectProducts(products,{query:q,category:'all',department:'all'}).slice(0,5);
        qBox.hidden=!matches.length;
        qBox.innerHTML=matches.map(p=>`<div class="pbar-item"><div class="pbar-thumb">${photo(p)}</div><div class="pbar-meta"><strong><a href="${link(p)}">${e(p.name)}</a></strong><small>${e(p.subcategory)}</small></div><div class="pbar-item-actions"><button type="button" class="pbar-mini-btn" data-add="${p.id}">+ Add</button></div></div>`).join('');
      });
    }
  }
  function renderDetail() {
    const host=$('#product-detail');if(!host)return;
    const p=byId(new URLSearchParams(location.search).get('id'));
    if(!p){host.innerHTML=empty('Product not found.','This link may be incomplete. Browse the catalogue to find your product.');return;}
    trackRecent(p.id);
    document.title=p.name+' | Surgical Wholesale Mart';
    const pinInfo=evaluatePincode(savedPincode);
    host.innerHTML=`<div class="breadcrumbs"><a href="index.html">Home</a><span>/</span><a href="products.html">Products</a><span>/</span><a href="products.html?category=${p.category}">${e(category(p.category).name)}</a></div><div class="detail-layout"><div class="detail-image">${photo(p,'eager')}</div><div class="detail-copy"><span class="eyebrow">${e(p.subcategory)}</span><h1>${e(p.name)}</h1><p class="detail-description">${e(p.description)}</p><ul class="feature-list">${p.features.map(x=>`<li><span>✓</span>${e(x)}</li>`).join('')}</ul><div class="detail-price">Price on request<small>Confirm the configuration and quantity for your quotation.</small></div><div class="detail-b2b-box"><div class="detail-qty-row"><label class="micro-label" for="detail-qty-input">Required quantity</label><div class="quantity"><button type="button" data-detail-delta="-1" aria-label="Decrease quantity">−</button><input id="detail-qty-input" type="number" min="1" max="9999" value="1"><button type="button" data-detail-delta="1" aria-label="Increase quantity">+</button></div><div class="detail-tier-chips"><button type="button" class="tier-chip is-active" data-tier-qty="1">1 Unit</button><button type="button" class="tier-chip" data-tier-qty="5">5 · Ward</button><button type="button" class="tier-chip" data-tier-qty="10">10 · Dept</button><button type="button" class="tier-chip" data-tier-qty="25">25+ · Project</button></div></div><div class="detail-pin-row"><input id="detail-pincode-input" type="text" maxlength="12" placeholder="Enter pincode or UAE" value="${e(savedPincode)}"><button type="button" data-check-detail-pin>Check delivery & hub</button></div><div id="detail-pin-result" class="detail-pin-result">${pinInfo?(pinInfo.ok?`✓ Deliverable · Nearest hub: <strong>${e(pinInfo.hub)}</strong> · ${e(pinInfo.timeline)}`:e(pinInfo.message)):'Enter your hospital pincode to check dispatch hub and installation coverage.'}</div><div class="detail-service-addons"><label><input type="checkbox" data-detail-addon="On-site installation & clinical training" checked> On-site installation &amp; training</label><label><input type="checkbox" data-detail-addon="Comprehensive AMC / CMC quotation"> Include AMC / CMC quote</label><label><input type="checkbox" data-detail-addon="Institutional EMI / equipment financing"> EMI / leasing option</label><label><input type="checkbox" data-detail-addon="Experience centre live demonstration"> Request live demo</label></div></div><div class="detail-actions"><button type="button" class="button" data-add-detail="${p.id}">Add to quote basket +</button><button type="button" class="save-detail" data-save="${p.id}" aria-pressed="${saved.includes(p.id)}">${heart} Save product</button><button type="button" class="save-detail" data-spec-sheet="${p.id}">Download spec sheet</button><button type="button" class="save-detail" data-open-finance>EMI &amp; Finance</button></div><div class="detail-utility-actions"><a class="text-link" href="contact.html?subject=${encodeURIComponent(p.name)}">Ask a product question →</a><a class="text-link" target="_blank" rel="noopener noreferrer" href="https://wa.me/919289976683?text=${encodeURIComponent('Hello Surgical Wholesale Mart, I would like a quotation and specification details for: '+p.name+' ('+p.subcategory+').')}">Enquire on WhatsApp ↗</a></div><div class="detail-note">${p.imageKind==='representative'?'This is a representative range photo, not confirmation of the exact model or configuration. ':''}Availability, specifications, included accessories, warranty and delivery are confirmed with your quotation.</div></div></div><div class="detail-tabs"><h2>Before you order</h2><details open><summary>Product configuration</summary><p>Tell us your preferred size, configuration and quantity. Request a current specification sheet and a photograph of the configuration being quoted.</p></details><details><summary>Delivery & installation</summary><p>Share your delivery city and site access requirements. Ask the team to include transport, installation and training scope in your quotation where applicable.</p></details><details><summary>Warranty & returns</summary><p>Ask for product-specific warranty coverage, service arrangements and return terms in writing before confirming your order.</p></details></div><div class="section-heading"><h2>Explore similar requirements</h2><a class="text-link" href="products.html?category=${p.category}">View category →</a></div><div class="product-grid related-grid">${products.filter(x=>x.category===p.category&&x.id!==p.id).slice(0,4).map(card).join('')}</div>${renderRecentSection(p.id)}`;
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
    sync();
  }
  let state,limit=24;
  function renderCatalog(updateURL=true) {
    if(!$('#catalog-grid'))return;
    const pool=products.filter(p=>(state.category==='all'||p.category===state.category)&&(state.department==='all'||p.department===state.department));
    const subs=Array.from(new Set(pool.map(p=>p.subcategory).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
    if(state.subcategory!=='all'&&!subs.includes(state.subcategory))state.subcategory='all';
    const subSelect=$('#subcategory-filter');
    if(subSelect){
      subSelect.innerHTML=`<option value="all">All subcategories (${subs.length})</option>`+subs.map(s=>`<option value="${e(s)}">${e(s)}</option>`).join('');
      subSelect.value=state.subcategory||'all';
    }
    let chipStrip=$('#subcat-chip-strip');
    if(!chipStrip&&$('#active-filters')){
      chipStrip=document.createElement('div');
      chipStrip.id='subcat-chip-strip';
      chipStrip.className='subcat-chip-strip';
      $('#active-filters').after(chipStrip);
    }
    if(chipStrip){
      chipStrip.innerHTML=`<button type="button" class="subcat-chip" data-subcat-chip="all" aria-pressed="${state.subcategory==='all'}">All (${pool.length})</button>`+subs.map(s=>`<button type="button" class="subcat-chip" data-subcat-chip="${e(s)}" aria-pressed="${state.subcategory===s}">${e(s)}</button>`).join('');
    }
    const list=selectProducts(products,state),cat=category(state.category);
    $('#catalog-title').textContent=state.savedOnly?'Saved products':cat?.name||'All products';
    $('#result-count').textContent=`${list.length} ${list.length===1?'product':'products'}${state.query?' matching your search':''}`;
    $('#catalog-grid').classList.toggle('is-list-view',state.view==='list');
    $$('[data-view-mode]').forEach(btn=>btn.setAttribute('aria-pressed',btn.dataset.viewMode===(state.view||'grid')));
    $('#catalog-grid').innerHTML=list.slice(0,limit).map(card).join('')||empty('No products match your selection.','Try another search or reset the filters. You can also share your requirement with our team.');
    let more=$('#load-more');if(!more){more=document.createElement('button');more.type='button';more.id='load-more';more.className='button load-more';$('#catalog-grid').after(more);more.addEventListener('click',()=>{limit+=24;renderCatalog(false);});}
    more.hidden=list.length<=limit;more.textContent=`Show more products (${Math.min(limit,list.length)} of ${list.length})`;
    $('#catalog-enquiry').innerHTML=(cat?.requests?`<div class="category-enquiry"><h2>Need something else in ${e(cat.name.toLowerCase())}?</h2><p>Share your preferred type, size and quantity with our team.</p><div>${cat.requests.map(x=>`<a href="contact.html?subject=${encodeURIComponent(x)}">${e(x)} →</a>`).join('')}</div></div>`:'')+renderRecentSection();
    const activeTags=[cat?{key:'category',label:cat.name}:null,state.department!=='all'?{key:'department',label:departments.find(d=>d.id===state.department)?.name}:null,state.subcategory&&state.subcategory!=='all'?{key:'subcategory',label:state.subcategory}:null,state.query?{key:'query',label:`“${state.query}”`}:null,state.savedOnly?{key:'savedOnly',label:'Saved only'}:null].filter(x=>x&&x.label);
    $('#active-filters').innerHTML=activeTags.map(t=>`<button type="button" data-clear-filter="${t.key}" aria-label="Remove filter ${e(t.label)}">${e(t.label)} <span aria-hidden="true">×</span></button>`).join('');
    $$('input[name="category"]').forEach(x=>x.checked=x.value===state.category);
    $('#department-filter').value=state.department;$('#saved-filter').setAttribute('aria-pressed',state.savedOnly);
    if(updateURL){const q=new URLSearchParams();if(state.category!=='all')q.set('category',state.category);if(state.department!=='all')q.set('department',state.department);if(state.subcategory&&state.subcategory!=='all')q.set('subcategory',state.subcategory);if(state.query)q.set('q',state.query);if(state.savedOnly)q.set('saved','1');if(state.sort!=='featured')q.set('sort',state.sort);history.replaceState(null,'',location.pathname+(q.size?'?'+q:''));}
    sync();
  }
  function initCatalog() {
    if(!$('#catalog-grid'))return;
    const q=new URLSearchParams(location.search);
    state={category:category(q.get('category'))?q.get('category'):'all',department:departments.some(d=>d.id===q.get('department'))?q.get('department'):'all',subcategory:q.get('subcategory')||'all',query:q.get('q')||'',savedOnly:q.get('saved')==='1',saved,sort:['az','za'].includes(q.get('sort'))?q.get('sort'):'featured',view:'grid'};
    const deptSelect=$('#department-filter');
    if(deptSelect&&!$('#subcategory-filter')){
      const subLabel=document.createElement('label');
      subLabel.className='field-label';
      subLabel.setAttribute('for','subcategory-filter');
      subLabel.style.marginTop='18px';
      subLabel.textContent='Equipment subcategory';
      const subSelect=document.createElement('select');
      subSelect.id='subcategory-filter';
      deptSelect.after(subLabel,subSelect);
      subSelect.addEventListener('change',event=>{state.subcategory=event.target.value;limit=24;renderCatalog();});
    }
    const searchBar=$('.catalog-search');
    if(searchBar&&!$('.catalog-extra-controls')){
      const extra=document.createElement('div');
      extra.className='catalog-extra-controls';
      extra.innerHTML=`<div class="view-toggle" role="group" aria-label="Catalogue view mode"><button type="button" data-view-mode="grid" aria-pressed="true">Grid view</button><button type="button" data-view-mode="list" aria-pressed="false">B2B list view</button></div><div style="display:flex;gap:14px;flex-wrap:wrap"><button type="button" class="text-button" data-open-setup-planner>Hospital setup planner →</button><button type="button" class="text-button" data-open-bulk-rfq>Paste hospital equipment list →</button></div>`;
      searchBar.after(extra);
    }
    $('#catalog-query').value=state.query;const siteSearch=$('#site-search');if(siteSearch)siteSearch.value=state.query;$('#sort-products').value=state.sort;
    $$('input[name="category"]').forEach(x=>x.addEventListener('change',()=>{state.category=x.value;limit=24;renderCatalog();}));
    $('#department-filter').addEventListener('change',event=>{state.department=event.target.value;limit=24;renderCatalog();});
    $('#sort-products').addEventListener('change',event=>{state.sort=event.target.value;renderCatalog();});
    $('#catalog-query').addEventListener('input',event=>{state.query=event.target.value;limit=24;renderCatalog();});
    $('#saved-filter').addEventListener('click',()=>{state.savedOnly=!state.savedOnly;limit=24;renderCatalog();});
    $('#reset-filters').addEventListener('click',()=>{state={category:'all',department:'all',subcategory:'all',query:'',savedOnly:false,saved,sort:'featured',view:state.view||'grid'};$('#catalog-query').value='';$('#sort-products').value='featured';limit=24;renderCatalog();});
    renderCatalog(false);
  }
  function comparison() {
    let host=$('#comparison');if(!host){host=document.createElement('section');host.id='comparison';host.className='comparison';$('#main').appendChild(host);}
    host.hidden=!compare.length;
    if(!compare.length){sync();return;}
    host.innerHTML=`<div class="comparison-heading"><strong>Compare ${compare.length} of 3 products</strong><div><button type="button" class="text-button" data-add-all-compare style="margin-right:14px">Add all to quote basket +</button><button type="button" class="text-button" data-clear-compare>Clear comparison</button></div></div><div class="comparison-table"><table><caption class="sr-only">Selected product comparison</caption><thead><tr><th>Product</th>${compare.map(id=>`<th><div class="product-visual" style="max-width:140px;margin-bottom:8px"><a href="${link(byId(id))}">${photo(byId(id))}</a></div><a href="${link(byId(id))}">${e(byId(id).name)}</a></th>`).join('')}</tr></thead><tbody><tr><th>Family &amp; Subcategory</th>${compare.map(id=>`<td>${e(category(byId(id).category).name)} · ${e(byId(id).subcategory)}</td>`).join('')}</tr><tr><th>Clinical department</th>${compare.map(id=>`<td>${e(departments.find(d=>d.id===byId(id).department)?.name||'General hospital')}</td>`).join('')}</tr><tr><th>Listed features</th>${compare.map(id=>`<td>${byId(id).features.map(e).join('<br>')}</td>`).join('')}</tr><tr><th>Quotation</th>${compare.map(id=>`<td><button type="button" class="text-button" data-add="${id}">Add to quote +</button></td>`).join('')}</tr></tbody></table></div>`;
    sync();
  }
  function enquiryText(details,items) {
    const productLines=items.length?['','PRODUCT SELECTION',...items.map(({id,qty})=>`${qty} × ${byId(id)?.name||id}`)]:[];
    return ['Surgical Wholesale Mart — Product enquiry','',...Object.entries(details).filter(([,v])=>v).map(([k,v])=>`${({name:'Name',organisation:'Organisation',gstin:'GSTIN / Institutional ID',procurementMode:'Procurement / Finance option',serviceScope:'Installation & AMC scope',email:'Email',phone:'Phone',city:'City',postcode:'Postcode',notes:'Requirements',message:'Message',location:'Contact location',supportType:'Support required',product:'Product / model',reference:'Serial / order reference',siteAddress:'Equipment / site address',contactMethod:'Preferred contact method',meetingFormat:'Meeting format',meetingDate:'Preferred date',meetingTime:'Preferred time window',timezone:'Time zone'})[k]||k}: ${v}`),...productLines,'','Please confirm pricing, configuration, taxes, availability and delivery.'].join('\n');
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
    const buyerProfile=read(local,'swm-buyer-profile',{})||{};
    const quote=$('#quote-form');
    if(quote){
      const summary=$('#checkout-summary');summary.innerHTML=basketSummary()+Object.keys(basket).map(id=>`<div class="summary-product"><span>${basket[id]} × ${e(byId(id).name)}</span></div>`).join('');
      if(!Object.keys(basket).length){quote.innerHTML=empty('Add products to get started.','Your quote basket is currently empty.');return;}
      const notesLabel=Array.from(quote.querySelectorAll('label')).find(l=>l.querySelector('textarea[name="notes"]'));
      if(notesLabel&&!quote.elements.gstin){
        const b2bRow=document.createElement('div');
        b2bRow.className='form-row';
        b2bRow.innerHTML=`<label>GSTIN / Hospital Reg. No. (optional)<input name="gstin" maxlength="40" placeholder="For B2B GST tax invoice"></label><label>Procurement &amp; financing mode<select name="procurementMode"><option>Standard institutional quotation</option><option>Equipment EMI / financing option</option><option>Hospital turnkey / rate contract</option><option>Government / tender procurement</option></select></label>`;
        const amcLabel=document.createElement('label');
        amcLabel.innerHTML=`Service &amp; maintenance scope<select name="serviceScope"><option>Standard warranty + on-site installation</option><option>Include 1-Year / 3-Year Comprehensive AMC quote</option><option>Include Biomedical Calibration &amp; Training</option><option>Equipment supply only</option></select>`;
        notesLabel.before(b2bRow,amcLabel);
      }
      Object.entries(buyerProfile).forEach(([k,v])=>{if(v&&quote.elements[k]&&!quote.elements[k].value)quote.elements[k].value=v;});
      const draft=read(session,'swm-enquiry',null);if(draft?.details)Object.entries(draft.details).forEach(([k,v])=>{if(quote.elements[k])quote.elements[k].value=v;});
      const pendingNote=read(session,'swm-pending-note','');
      if(pendingNote&&quote.elements.notes&&!quote.elements.notes.value.includes(pendingNote)){
        quote.elements.notes.value=(quote.elements.notes.value?quote.elements.notes.value+'\n':'')+pendingNote;
      }
      quote.addEventListener('submit',event=>{
        event.preventDefault();if(!quote.reportValidity())return;
        const details=Object.fromEntries(new FormData(quote));
        const items=Object.entries(basket).map(([id,qty])=>({id,qty}));
        currentEnquiry=enquiryText(details,items);
        const refId='SWM-RFQ-'+new Date().getFullYear()+'-'+String(Date.now()).slice(-5);
        const history=read(local,'swm-enquiry-history',[]);
        const nextHistory=[{ref:refId,date:new Date().toISOString().slice(0,10),items,organisation:details.organisation||'',city:details.city||''},...(Array.isArray(history)?history:[])].slice(0,10);
        save(local,'swm-enquiry-history',nextHistory);
        if(save(session,'swm-enquiry',{details,text:currentEnquiry,ref:refId})){location.href='thankyou.html';}
        else{quote.innerHTML=`<h2>Review your enquiry</h2><pre class="enquiry-preview">${e(currentEnquiry)}</pre>${sharing(currentEnquiry)}`;}
      });
    }
    const contact=$('#contact-form');if(contact){Object.entries(buyerProfile).forEach(([k,v])=>{if(v&&contact.elements[k]&&!contact.elements[k].value)contact.elements[k].value=v;});const params=new URLSearchParams(location.search);const chosenLocation=params.get('location');if(chosenLocation&&contact.elements.location){const choice=Array.from(contact.elements.location.options).find(x=>x.dataset.locationId===chosenLocation);if(choice)contact.elements.location.value=choice.value;}const subject=params.get('subject');if(subject)$('#contact-message').value='I would like to enquire about '+subject+'.\n';contact.addEventListener('submit',event=>{event.preventDefault();if(!contact.reportValidity())return;currentEnquiry=enquiryText(Object.fromEntries(new FormData(contact)),[]);$('#contact-review').innerHTML=`<h3>Review before sharing</h3><pre class="enquiry-preview">${e(currentEnquiry)}</pre>${sharing(currentEnquiry)}`;$('#contact-review').scrollIntoView({behavior:'smooth',block:'nearest'});});}
  }
  function downloadSpecSheet(p) {
    const specs = Array.isArray(p.specifications) ? p.specifications.filter(s => s && s.label && s.value) : [];
    const lines = [
      'SURGICAL WHOLESALE MART · DR. SMITH PRODUCT SPECIFICATION SHEET',
      '================================================================',
      `Product Name: ${p.name}`,
      `Product ID: ${p.id}`,
      `Category: ${category(p.category)?.name || p.category}`,
      `Subcategory: ${p.subcategory}`,
      `Clinical Department: ${departments.find(d => d.id === p.department)?.name || 'General Hospital'}`,
      '',
      'DESCRIPTION',
      p.description || p.name,
      '',
      'KEY FEATURES',
      ...p.features.map(f => `• ${f}`),
      ...(specs.length ? ['', 'TECHNICAL SPECIFICATIONS', ...specs.map(s => `• ${s.label}: ${s.value}`)] : []),
      '',
      'PROCUREMENT & QUOTATION CONTACT',
      'Surgical Wholesale Mart Pvt. Ltd. · Dr. Smith',
      'Toll-Free: 1800 8917466 | Phone/WhatsApp: +91 9289976683 | Email: info@drsmith.co.in',
      `Product Link: ${location.origin && location.origin !== 'null' ? location.origin + '/' : ''}${link(p)}`
    ].join('\n');
    const blob = new Blob([lines], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.id}-specification-sheet.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Specification sheet downloaded.');
  }
  function exportBasketCSV() {
    const rows = [['Product ID', 'Product Name', 'Category', 'Subcategory', 'Quantity', 'Pricing']];
    Object.entries(basket).forEach(([id, qty]) => {
      const p = byId(id);
      if (!p) return;
      rows.push([p.id, p.name, category(p.category)?.name || p.category, p.subcategory, String(qty), 'On quotation']);
    });
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'surgical-wholesale-mart-quote-basket.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Quote basket exported to CSV.');
  }
  function closeModal() {
    $('#swm-modal-backdrop')?.remove();
  }
  function openQuickView(id) {
    const p = byId(id);
    if (!p) return;
    trackRecent(p.id);
    closeModal();
    const specs = Array.isArray(p.specifications) ? p.specifications.filter(s => s && s.label && s.value).slice(0, 6) : [];
    const backdrop = document.createElement('div');
    backdrop.id = 'swm-modal-backdrop';
    backdrop.className = 'swm-modal-backdrop';
    backdrop.innerHTML = `<div class="swm-modal" role="dialog" aria-modal="true" aria-label="${e(p.name)} quick view"><button type="button" class="swm-modal-close" data-close-modal aria-label="Close modal">×</button><div class="quickview-layout"><div class="quickview-visual">${photo(p, 'eager')}</div><div><span class="eyebrow">${e(category(p.category)?.name || '')} · ${e(p.subcategory)}</span><h2 style="margin-bottom:10px">${e(p.name)}</h2><p class="muted" style="font-size:13px">${e(p.description)}</p><ul class="feature-list">${p.features.map(x => `<li><span>✓</span>${e(x)}</li>`).join('')}</ul>${specs.length ? `<div class="product-specifications"><dl>${specs.map(s => `<div><dt>${e(s.label)}</dt><dd>${e(s.value)}</dd></div>`).join('')}</dl></div>` : ''}<div class="detail-qty-row" style="margin:14px 0"><label class="micro-label" for="qv-qty-input">Quantity</label><div class="quantity"><button type="button" data-qv-delta="-1">−</button><input id="qv-qty-input" type="number" min="1" max="9999" value="1"><button type="button" data-qv-delta="1">+</button></div></div><div class="detail-actions"><button type="button" class="button" data-add-qv="${p.id}">Add to quote basket +</button><button type="button" class="save-detail" data-save="${p.id}" aria-pressed="${saved.includes(p.id)}">${heart} Save</button><button type="button" class="save-detail" data-spec-sheet="${p.id}">Spec sheet</button></div><a class="text-link" href="${link(p)}">Open full product page →</a></div></div></div>`;
    document.body.appendChild(backdrop);
    sync();
  }
  const CLINICAL_SPECIALTIES = [
    {title:'ICU & Critical Care',desc:'Electric ICU beds, multipara monitors, ventilators, syringe & infusion pumps',href:'products.html?department=icu'},
    {title:'Operation Theatre & Surgery',desc:'C-Arm OT tables, LED surgical lights, anesthesia workstations & diathermy',href:'products.html?department=ot'},
    {title:'Wards & Patient Rooms',desc:'Fowler & semi-Fowler beds, ABS bedside lockers, overbed tables & curtains',href:'products.html?department=ward'},
    {title:'OPD & Examination',desc:'Examination couches, diagnostic instruments, illumination & revolving stools',href:'products.html?department=opd'},
    {title:'Emergency & Trauma',desc:'Hydraulic stretcher trolleys, crash carts, defibrillators & suction units',href:'products.html?department=emergency'},
    {title:'Sterilization & CSSD',desc:'Horizontal, vertical & portable autoclaves, dressing drums & sterilizers',href:'products.html?q=Autoclave'},
    {title:'Anaesthesia & Respiratory',desc:'Anesthesia workstations, bubble CPAP, oxygen concentrators & BPC flowmeters',href:'products.html?q=Anesthesia'},
    {title:'Neonatal & Paediatric Care',desc:'Infant radiant warmers, phototherapy units, baby bassinets & paediatric beds',href:'products.html?q=Baby'},
    {title:'Gynaecology & Obstetrics',desc:'Labour delivery tables, telescopic obstetric beds & surgical sets',href:'products.html?q=Delivery'},
    {title:'Radiology & Imaging Support',desc:'X-Ray machines, C-Arm compatible tables & LED X-Ray view boxes',href:'products.html?q=X-Ray'},
    {title:'MGPS & Modular OT Infrastructure',desc:'Bedhead panels, medical gas outlets, manifolds, scrub stations & pendants',href:'products.html?category=mgps'},
    {title:'Surgical Instruments & Sets',desc:'Stainless steel procedure sets, general surgery & specialty instruments',href:'products.html?category=instruments'}
  ];
  function openMegaMenu(activeTab='categories') {
    closeModal();
    const backdrop=document.createElement('div');
    backdrop.id='swm-modal-backdrop';
    backdrop.className='swm-modal-backdrop';
    function renderTabContent(tab){
      if(tab==='specialties'){
        return `<div class="specialty-explorer-grid">${CLINICAL_SPECIALTIES.map(s=>`<a class="specialty-card-btn" href="${e(s.href)}"><strong>${e(s.title)}</strong><small>${e(s.desc)}</small></a>`).join('')}</div>`;
      }
      if(tab==='packages'){
        return `<div class="specialty-explorer-grid"><button type="button" class="specialty-card-btn" data-launch-setup="10"><strong>10-Bed Clinic / Daycare Setup</strong><small>Essential examination couches, Fowler beds, monitors, trolleys &amp; sterilization</small></button><button type="button" class="specialty-card-btn" data-launch-setup="25"><strong>25-Bed Nursing Home Package</strong><small>Complete ward, minor OT, emergency triage &amp; ICU starter schedule</small></button><button type="button" class="specialty-card-btn" data-launch-setup="50"><strong>50-Bed Multi-Specialty Hospital</strong><small>Full ICU, modular OT, ward furniture, patient monitoring &amp; MGPS essentials</small></button><button type="button" class="specialty-card-btn" data-launch-setup="100"><strong>100-Bed Tertiary Care Hospital</strong><small>Comprehensive department-wise hospital furniture &amp; clinical equipment schedule</small></button><button type="button" class="specialty-card-btn" data-open-finance><strong>EMI &amp; Institutional Capex Financing</strong><small>Calculate monthly installments or leasing plans for your equipment package</small></button><button type="button" class="specialty-card-btn" data-open-amc><strong>AMC / CMC &amp; Biomedical Calibration</strong><small>Configure preventive &amp; comprehensive maintenance cover for your facility</small></button></div>`;
      }
      return `<div class="megamenu-family-grid">${categories.map(c=>{
        const famProducts=products.filter(p=>p.category===c.id);
        const subCounts=new Map();
        famProducts.forEach(p=>{if(p.subcategory)subCounts.set(p.subcategory,(subCounts.get(p.subcategory)||0)+1);});
        const subs=Array.from(subCounts.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10);
        return `<div class="megamenu-family-card"><h3><a href="products.html?category=${encodeURIComponent(c.id)}">${e(c.name)} (${famProducts.length}) →</a></h3><div class="megamenu-sub-links">${subs.map(([sub,cnt])=>`<a href="products.html?category=${encodeURIComponent(c.id)}&subcategory=${encodeURIComponent(sub)}">${e(sub)} (${cnt})</a>`).join('')}</div></div>`;
      }).join('')}</div>`;
    }
    backdrop.innerHTML=`<div class="swm-modal" role="dialog" aria-modal="true" aria-label="Categories and specialties explorer"><button type="button" class="swm-modal-close" data-close-modal aria-label="Close modal">×</button><span class="eyebrow">COMPLETE MEDICAL DIRECTORY</span><h2>Explore by Category, Specialty or Hospital Setup</h2><div class="megamenu-tabs" role="tablist"><button type="button" class="megamenu-tab" data-mega-tab="categories" aria-selected="${activeTab==='categories'}">Product Categories &amp; Subcategories</button><button type="button" class="megamenu-tab" data-mega-tab="specialties" aria-selected="${activeTab==='specialties'}">Clinical Specialties (12)</button><button type="button" class="megamenu-tab" data-mega-tab="packages" aria-selected="${activeTab==='packages'}">Turnkey Hospital Setups &amp; Capex</button></div><div id="megamenu-body">${renderTabContent(activeTab)}</div></div>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click',ev=>{
      const tabBtn=ev.target.closest('[data-mega-tab]');
      if(tabBtn){
        const t=tabBtn.dataset.megaTab;
        $$('.megamenu-tab').forEach(b=>b.setAttribute('aria-selected',String(b===tabBtn)));
        $('#megamenu-body').innerHTML=renderTabContent(t);
      }
    });
  }
  let setupSchedule = [];
  function buildSetupSchedule(beds, depts) {
    const scale = Math.max(1, Math.round(beds / 25));
    const plan = [];
    const addByMatch = (deptKey, keyword, qty) => {
      if (!depts.includes(deptKey)) return;
      const found = products.find(p => p.id === keyword || p.name.toLowerCase().includes(keyword.toLowerCase()) || p.subcategory.toLowerCase().includes(keyword.toLowerCase()));
      if (found && !plan.some(x => x.product.id === found.id)) {
        plan.push({product: found, qty: Math.max(1, qty)});
      }
    };
    addByMatch('icu', '02bb6538d195', Math.max(2, Math.round(beds * 0.2)));
    addByMatch('icu', '808afd3730d4', Math.max(2, Math.round(beds * 0.2)));
    addByMatch('icu', '754d8a1e3199', Math.max(1, scale * 2));
    addByMatch('ot', 'c42d0c599c9a', Math.max(1, scale));
    addByMatch('ot', '2309963f11be', Math.max(1, scale));
    addByMatch('ot', 'a19726a622b7', Math.max(1, scale));
    addByMatch('ot', 'anesthesia', Math.max(1, scale));
    addByMatch('ward', 'swm-3b091738406f', Math.max(5, Math.round(beds * 0.6)));
    addByMatch('ward', '499dc31aa817', Math.max(5, Math.round(beds * 0.8)));
    addByMatch('ward', '541685af7f1c', Math.max(4, Math.round(beds * 0.4)));
    addByMatch('opd', '9065d7fe01a7', Math.max(2, scale * 2));
    addByMatch('opd', '4faf3d170da3', Math.max(2, scale * 2));
    addByMatch('emergency', 'd1d7247e1be0', Math.max(2, scale * 2));
    addByMatch('emergency', '046172436ac2', Math.max(2, scale * 3));
    addByMatch('emergency', 'swm-73ded3e57ed6', Math.max(1, scale));
    return plan;
  }
  function openSetupPlanner(defaultBeds = 25) {
    closeModal();
    const backdrop = document.createElement('div');
    backdrop.id = 'swm-modal-backdrop';
    backdrop.className = 'swm-modal-backdrop';
    backdrop.innerHTML = `<div class="swm-modal" role="dialog" aria-modal="true" aria-label="Turnkey hospital setup planner"><button type="button" class="swm-modal-close" data-close-modal aria-label="Close modal">×</button><span class="eyebrow">TURNKEY HOSPITAL SETUP &amp; CAPEX CONFIGURATOR</span><h2>Plan your facility equipment by bed capacity</h2><p class="muted" style="font-size:13px">Select your facility type, bed strength, and clinical departments to generate an itemized equipment schedule from our catalogue.</p><div class="setup-planner-controls"><label class="field-label" style="margin:0">Facility type<select id="setup-facility-type" style="width:100%;margin-top:6px"><option>Multi-Specialty Hospital</option><option>Nursing Home / Medical Centre</option><option>ICU &amp; Critical Care Wing</option><option>Surgical &amp; Modular OT Complex</option><option>OPD &amp; Daycare Clinic</option></select></label><label class="field-label" style="margin:0">Planned bed capacity<select id="setup-bed-count" style="width:100%;margin-top:6px"><option value="10" ${defaultBeds===10?'selected':''}>10 Beds (Clinic / Daycare)</option><option value="25" ${defaultBeds===25?'selected':''}>25 Beds (Nursing Home)</option><option value="50" ${defaultBeds===50?'selected':''}>50 Beds (Multi-Specialty)</option><option value="100" ${defaultBeds===100?'selected':''}>100 Beds (Tertiary Hospital)</option><option value="250" ${defaultBeds===250?'selected':''}>250+ Beds (Medical College / Hospital)</option></select></label><label class="field-label" style="margin:0">Project timeline<select id="setup-timeline" style="width:100%;margin-top:6px"><option>Immediate (Within 30 days)</option><option>1 – 3 Months</option><option>3 – 6 Months (Planning / Civil stage)</option></select></label><div class="setup-dept-checks"><label><input type="checkbox" value="icu" checked> ICU &amp; Critical Care</label><label><input type="checkbox" value="ot" checked> Operation Theatre &amp; MGPS</label><label><input type="checkbox" value="ward" checked> Inpatient Wards &amp; Rooms</label><label><input type="checkbox" value="opd" checked> OPD &amp; Examination</label><label><input type="checkbox" value="emergency" checked> Emergency &amp; Patient Transfer</label></div></div><div id="setup-planner-summary" class="setup-summary-strip"></div><div id="setup-planner-list" class="bulk-match-list"></div><div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px"><button type="button" class="button" data-apply-setup-plan>Add entire setup to quote basket +</button><button type="button" class="button button-outline" data-open-finance>Calculate Capex EMI / Leasing</button></div></div>`;
    document.body.appendChild(backdrop);
    function refreshPlan() {
      const beds = parseInt($('#setup-bed-count')?.value || '25', 10) || 25;
      const depts = Array.from(backdrop.querySelectorAll('.setup-dept-checks input:checked')).map(i => i.value);
      setupSchedule = buildSetupSchedule(beds, depts);
      const totalUnits = setupSchedule.reduce((s, x) => s + x.qty, 0);
      $('#setup-planner-summary').innerHTML = `<span>Recommended schedule: <strong>${setupSchedule.length} equipment lines</strong> · <strong>${totalUnits} total units</strong> for a ${beds}-bed facility</span>`;
      $('#setup-planner-list').innerHTML = setupSchedule.map((item, idx) => `<div class="bulk-match-row"><div class="pbar-thumb">${photo(item.product)}</div><div class="pbar-meta"><strong><a href="${link(item.product)}">${e(item.product.name)}</a></strong><small>${e(category(item.product.category)?.name || '')} · ${e(item.product.subcategory)}</small></div><input type="number" min="1" max="9999" value="${item.qty}" data-setup-qty-idx="${idx}" style="width:76px;padding:6px 8px;font-size:12px"></div>`).join('');
    }
    backdrop.addEventListener('change', ev => {
      if (ev.target.matches('#setup-bed-count, .setup-dept-checks input')) refreshPlan();
    });
    refreshPlan();
  }
  function openFinanceModal() {
    closeModal();
    const backdrop = document.createElement('div');
    backdrop.id = 'swm-modal-backdrop';
    backdrop.className = 'swm-modal-backdrop';
    backdrop.innerHTML = `<div class="swm-modal" role="dialog" aria-modal="true" aria-label="B2B Equipment EMI and Finance Calculator"><button type="button" class="swm-modal-close" data-close-modal aria-label="Close modal">×</button><span class="eyebrow">INSTITUTIONAL CAPEX &amp; EMI CALCULATOR</span><h2>Medical Equipment Financing &amp; Leasing Estimator</h2><p class="muted" style="font-size:13px">Estimate monthly installments for hospital furniture, ICU setups, modular OT projects, or diagnostic equipment procurement.</p><div class="emi-preset-row"><button type="button" class="tier-chip" data-emi-amount="250000">₹2.5 Lakh</button><button type="button" class="tier-chip is-active" data-emi-amount="1000000">₹10 Lakh</button><button type="button" class="tier-chip" data-emi-amount="2500000">₹25 Lakh</button><button type="button" class="tier-chip" data-emi-amount="5000000">₹50 Lakh</button><button type="button" class="tier-chip" data-emi-amount="10000000">₹1 Crore</button></div><div class="emi-calc-grid"><div style="display:grid;gap:12px"><label class="field-label" style="margin:0">Estimated equipment / project value (₹)<input id="emi-principal" type="number" min="50000" step="25000" value="1000000" style="width:100%;margin-top:6px"></label><label class="field-label" style="margin:0">Repayment tenure (Months)<select id="emi-tenure" style="width:100%;margin-top:6px"><option value="6">6 Months</option><option value="12">12 Months (1 Year)</option><option value="24" selected>24 Months (2 Years)</option><option value="36">36 Months (3 Years)</option><option value="48">48 Months (4 Years)</option><option value="60">60 Months (5 Years)</option></select></label><label class="field-label" style="margin:0">Illustrative annual interest rate (% p.a.)<input id="emi-rate" type="number" min="6" max="24" step="0.5" value="10.5" style="width:100%;margin-top:6px"></label><label class="field-label" style="margin:0">Preferred financing structure<select id="emi-mode" style="width:100%;margin-top:6px"><option>Institutional Equipment Loan (EMI)</option><option>Medical Equipment Operating Lease</option><option>Milestone / Letter of Credit (LC)</option></select></label></div><div class="emi-result-card"><span class="micro-label">ESTIMATED MONTHLY INSTALLMENT</span><strong id="emi-monthly-out">₹46,376 / month</strong><div class="summary-line"><span>Principal project value</span><b id="emi-principal-out">₹10,00,000</b></div><div class="summary-line"><span>Estimated total interest</span><b id="emi-interest-out">₹1,13,025</b></div><div class="summary-line"><span>Total payable across tenure</span><b id="emi-total-out">₹11,13,025</b></div><p class="form-note" style="margin:0">Indicative calculation for hospital budgeting. Final financing terms depend on institutional eligibility and partner banking approval.</p><button type="button" class="button" data-attach-finance-note>Attach financing request to quotation →</button></div></div></div>`;
    document.body.appendChild(backdrop);
    function calcEmi() {
      const P = Math.max(10000, parseFloat($('#emi-principal')?.value || '1000000') || 1000000);
      const N = Math.max(1, parseInt($('#emi-tenure')?.value || '24', 10) || 24);
      const R = Math.max(0.1, parseFloat($('#emi-rate')?.value || '10.5') || 10.5) / 12 / 100;
      const emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
      const total = emi * N;
      const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');
      $('#emi-monthly-out').textContent = fmt(emi) + ' / month';
      $('#emi-principal-out').textContent = fmt(P);
      $('#emi-interest-out').textContent = fmt(total - P);
      $('#emi-total-out').textContent = fmt(total);
    }
    backdrop.addEventListener('input', calcEmi);
    backdrop.addEventListener('click', ev => {
      const chip = ev.target.closest('[data-emi-amount]');
      if (chip) {
        $('#emi-principal').value = chip.dataset.emiAmount;
        $$('[data-emi-amount]').forEach(c => c.classList.toggle('is-active', c === chip));
        calcEmi();
      }
    });
    calcEmi();
  }
  function openTrackerModal() {
    closeModal();
    const history = read(local, 'swm-enquiry-history', []) || [];
    const activeCount = Object.values(basket).reduce((a, b) => a + b, 0);
    const latestRef = history[0]?.ref || (activeCount ? 'SWM-DRAFT-ACTIVE' : 'SWM-RFQ-2026-1042');
    const backdrop = document.createElement('div');
    backdrop.id = 'swm-modal-backdrop';
    backdrop.className = 'swm-modal-backdrop';
    backdrop.innerHTML = `<div class="swm-modal" role="dialog" aria-modal="true" aria-label="Track quotation and order status"><button type="button" class="swm-modal-close" data-close-modal aria-label="Close modal">×</button><span class="eyebrow">ORDER, QUOTATION &amp; DISPATCH TRACKER</span><h2>Track your enquiry or shipment pipeline</h2><div style="display:flex;gap:10px;flex-wrap:wrap;margin:14px 0"><input id="tracker-ref-input" type="text" value="${e(latestRef)}" placeholder="Enter Reference / Order ID (e.g. SWM-RFQ-2026-...)" style="flex:1;min-width:220px"><button type="button" class="button" data-run-tracker>Check status</button></div><div id="tracker-pipeline" class="tracker-steps"><div class="tracker-step is-done"><span class="tracker-badge">1</span><div><strong>Product Selection &amp; Enquiry Logged</strong><div class="muted" style="font-size:11px">Reference: <code id="tracker-ref-label">${e(latestRef)}</code> · ${activeCount} units currently in quote basket</div></div><span style="font-size:11px;font-weight:700;color:var(--teal)">Completed</span></div><div class="tracker-step ${activeCount||history.length?'is-done':''}"><span class="tracker-badge">2</span><div><strong>Biomedical Specification &amp; Configuration Review</strong><div class="muted" style="font-size:11px">Dr. Smith product specialists verify model configuration, accessories &amp; GST quotation</div></div><span style="font-size:11px;font-weight:700;color:var(--teal)">${history.length?'Verified':'In progress'}</span></div><div class="tracker-step"><span class="tracker-badge">3</span><div><strong>Manufacturing &amp; Pre-Dispatch Quality Inspection</strong><div class="muted" style="font-size:11px">ISO/CE quality check at Jhajjar Manufacturing Hub / New Delhi Regional Warehouse</div></div><span class="muted" style="font-size:11px">Scheduled on order confirmation</span></div><div class="tracker-step"><span class="tracker-badge">4</span><div><strong>Pan-India / International Logistics &amp; Transit</strong><div class="muted" style="font-size:11px">Tracked surface/air freight to ${e(savedPincode ? 'Pincode ' + savedPincode : 'your facility')}</div></div><span class="muted" style="font-size:11px">Pending dispatch</span></div><div class="tracker-step"><span class="tracker-badge">5</span><div><strong>On-Site Delivery, Installation &amp; Clinical Handover</strong><div class="muted" style="font-size:11px">Biomedical installation, operational training &amp; warranty activation</div></div><span class="muted" style="font-size:11px">Final stage</span></div></div>${history.length?`<div style="margin-top:16px"><strong>Recent quotation history &amp; 1-click reorder</strong><div class="bulk-match-list">${history.map((h,i)=>`<div class="bulk-match-row" style="grid-template-columns:1fr auto"><div><strong>${e(h.ref)}</strong> · ${e(h.date)}<small style="display:block;color:var(--muted)">${h.items.length} product lines ${h.organisation?'· '+e(h.organisation):''}</small></div><button type="button" class="pbar-mini-btn" data-reorder-idx="${i}">Reload into basket ↻</button></div>`).join('')}</div></div>`:''}</div>`;
    document.body.appendChild(backdrop);
  }
  function openAmcModal() {
    closeModal();
    const backdrop = document.createElement('div');
    backdrop.id = 'swm-modal-backdrop';
    backdrop.className = 'swm-modal-backdrop';
    backdrop.innerHTML = `<div class="swm-modal" role="dialog" aria-modal="true" aria-label="AMC CMC and Biomedical Services"><button type="button" class="swm-modal-close" data-close-modal aria-label="Close modal">×</button><span class="eyebrow">LIFECYCLE BIOMEDICAL SUPPORT</span><h2>AMC / CMC, Calibration &amp; Equipment Upgrade Options</h2><p class="muted" style="font-size:13px">Select a maintenance or biomedical service package to include with your quotation or existing hospital equipment.</p><div class="amc-plan-grid"><div class="amc-plan-card"><h3>Preventive AMC</h3><ul><li>Scheduled quarterly preventive maintenance visits</li><li>Safety, electrical &amp; performance calibration</li><li>Priority breakdown attendance across 10 hubs</li><li>Spares charged separately at institutional rates</li></ul><button type="button" class="button button-outline" data-select-amc="Preventive Annual Maintenance Contract (AMC)">Include Preventive AMC →</button></div><div class="amc-plan-card"><h3>Comprehensive CMC</h3><ul><li>End-to-end preventive &amp; breakdown maintenance</li><li>Covers eligible functional spare parts &amp; assemblies</li><li>Dedicated biomedical engineer escalation</li><li>Ideal for ICU monitors, ventilators, OT tables &amp; autoclaves</li></ul><button type="button" class="button" data-select-amc="Comprehensive Maintenance Contract (CMC)">Include Comprehensive CMC →</button></div><div class="amc-plan-card"><h3>Trade-In &amp; Calibration</h3><ul><li>Upgrade legacy hospital beds or OT equipment</li><li>NABH-aligned biomedical calibration &amp; audit request</li><li>On-site staff operational training session</li><li>Custom multi-department service contract</li></ul><button type="button" class="button button-outline" data-select-amc="Equipment Trade-In / Biomedical Calibration Audit">Request Trade-In / Audit →</button></div></div></div>`;
    document.body.appendChild(backdrop);
  }
  function openBuyerProfileModal() {
    closeModal();
    const prof = read(local, 'swm-buyer-profile', {}) || {};
    const backdrop = document.createElement('div');
    backdrop.id = 'swm-modal-backdrop';
    backdrop.className = 'swm-modal-backdrop';
    backdrop.innerHTML = `<div class="swm-modal" role="dialog" aria-modal="true" aria-label="Institutional Buyer Profile and GST Details"><button type="button" class="swm-modal-close" data-close-modal aria-label="Close modal">×</button><span class="eyebrow">INSTITUTIONAL BUYER PROFILE</span><h2>Hospital &amp; GST Procurement Profile</h2><p class="muted" style="font-size:13px">Save your hospital and GST details in your browser to automatically pre-fill quotation, support, and meeting requests.</p><form id="buyer-profile-form" style="display:grid;gap:14px;margin-top:14px"><div class="form-row"><label class="field-label" style="margin:0">Contact person name<input name="name" value="${e(prof.name||'')}" placeholder="Dr. / Procurement Officer Name" style="width:100%;margin-top:6px"></label><label class="field-label" style="margin:0">Hospital / Organisation name<input name="organisation" value="${e(prof.organisation||'')}" placeholder="Hospital, Clinic or Trust Name" style="width:100%;margin-top:6px"></label></div><div class="form-row"><label class="field-label" style="margin:0">GSTIN / Institutional Reg. No.<input name="gstin" value="${e(prof.gstin||'')}" placeholder="e.g. 07AAAAA0000A1Z5" style="width:100%;margin-top:6px"></label><label class="field-label" style="margin:0">Phone / WhatsApp<input name="phone" value="${e(prof.phone||'')}" placeholder="+91 ..." style="width:100%;margin-top:6px"></label></div><div class="form-row"><label class="field-label" style="margin:0">Official email<input name="email" type="email" value="${e(prof.email||'')}" placeholder="procurement@hospital.org" style="width:100%;margin-top:6px"></label><label class="field-label" style="margin:0">City &amp; Delivery Pincode<div style="display:flex;gap:8px;margin-top:6px"><input name="city" value="${e(prof.city||'')}" placeholder="City" style="flex:1"><input name="postcode" value="${e(prof.postcode||savedPincode||'')}" placeholder="Pincode" style="width:110px"></div></label></div><div style="display:flex;gap:12px;align-items:center"><button type="submit" class="button">Save buyer profile</button><button type="button" class="text-button" data-open-tracker>View quote history &amp; reorder →</button></div></form></div>`;
    document.body.appendChild(backdrop);
    $('#buyer-profile-form')?.addEventListener('submit', ev => {
      ev.preventDefault();
      const data = Object.fromEntries(new FormData(ev.target));
      save(local, 'swm-buyer-profile', data);
      if (data.postcode) { savedPincode = data.postcode; save(local, 'swm-pincode', data.postcode); }
      closeModal();
      initForms();
      toast('Institutional buyer profile saved for fast checkout.');
    });
  }
  function initHomeB2BHub() {
    if ($('#home-b2b-hub')) return;
    const target = $('#featured-products') || $('.service-grid');
    if (!target) return;
    const hub = document.createElement('section');
    hub.id = 'home-b2b-hub';
    hub.className = 'section home-b2b-hub';
    hub.innerHTML = `<div class="section-heading"><div><span class="eyebrow">DIGITAL HEALTHCARE PROCUREMENT SUITE</span><h2>Every tool to plan, compare &amp; equip your facility.</h2></div><button type="button" class="text-link" data-open-megamenu="specialties" style="border:0;background:none;padding:0">Explore all 12 clinical specialties →</button></div><div class="b2b-hub-grid"><button type="button" class="b2b-hub-card" data-open-setup-planner><span class="eyebrow">CAPEX PLANNER</span><h3>Hospital Setup by Bed Capacity</h3><p>Generate a 10 to 250+ bed equipment schedule across ICU, OT, Wards &amp; OPD.</p><strong>Launch planner →</strong></button><button type="button" class="b2b-hub-card" data-open-bulk-rfq><span class="eyebrow">FAST SOURCING</span><h3>Bulk RFQ &amp; List Matcher</h3><p>Paste or upload your hospital requirement list to auto-match catalogue products.</p><strong>Upload / paste list →</strong></button><button type="button" class="b2b-hub-card" data-open-megamenu="specialties"><span class="eyebrow">CLINICAL DIRECTORY</span><h3>Shop by Specialty &amp; Dept</h3><p>Browse equipment curated for ICU, Modular OT, Gynaecology, Neonatal &amp; CSSD.</p><strong>Browse specialties →</strong></button><button type="button" class="b2b-hub-card" data-open-finance><span class="eyebrow">FLEXIBLE CAPEX</span><h3>EMI &amp; Equipment Financing</h3><p>Estimate monthly installments and institutional leasing options for your project.</p><strong>Calculate EMI →</strong></button><button type="button" class="b2b-hub-card" data-open-amc><span class="eyebrow">LIFECYCLE CARE</span><h3>AMC / CMC &amp; Calibration</h3><p>Include preventive maintenance, comprehensive CMC, or equipment trade-in.</p><strong>Configure AMC →</strong></button><button type="button" class="b2b-hub-card" data-open-tracker><span class="eyebrow">ORDER &amp; REORDER</span><h3>Track Enquiry &amp; 1-Click Reorder</h3><p>Check quotation pipeline stages and reload past hospital equipment lists.</p><strong>Open tracker →</strong></button></div>`;
    target.after(hub);
  }
  function initProcurementBar() {
    const header = $('.store-header');
    if (!header || $('.procurement-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'procurement-bar';
    const pinInfo = evaluatePincode(savedPincode);
    bar.innerHTML = `<button type="button" class="pbar-pill pbar-mega-btn" data-open-megamenu="categories">☰ Categories &amp; Specialties</button><div class="pbar-search-wrap"><div class="pbar-search" role="search"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input id="global-search-input" type="search" placeholder="Search 372+ hospital equipment, instruments, beds, monitors…" aria-label="Search all products"><kbd>Ctrl K</kbd></div><div id="global-search-results" class="pbar-results" hidden></div></div><div class="pbar-tools"><div class="pbar-pincode"><input id="global-pincode-input" type="text" maxlength="12" placeholder="Delivery pincode" value="${e(savedPincode)}" aria-label="Delivery pincode"><button type="button" data-check-global-pin>Check</button></div><span id="global-pin-status" class="pbar-pin-status">${pinInfo && pinInfo.ok ? `✓ ${e(pinInfo.hub.split(' ')[0])} hub` : ''}</span><button type="button" class="pbar-pill" data-open-setup-planner>Hospital Setup</button><button type="button" class="pbar-pill" data-open-bulk-rfq>Bulk RFQ</button><button type="button" class="pbar-pill" data-open-finance>EMI / Finance</button><button type="button" class="pbar-pill" data-open-amc>AMC / Service</button><button type="button" class="pbar-pill" data-open-tracker>Track &amp; Reorder</button><button type="button" class="pbar-pill" data-open-buyer-profile>GST Profile</button><a class="pbar-pill" href="products.html?saved=1">Saved <b data-saved-count>${saved.length}</b></a><button type="button" class="pbar-pill" data-jump-compare>Compare <b data-compare-count>${compare.length}</b></button><a class="pbar-pill" href="cart.html">Quote Basket <b data-cart-count>${Object.values(basket).reduce((a,b)=>a+b,0)}</b></a></div>`;
    const homeFirstFoldEnd = $('.benefit-row') || $('#home-hero-banners');
    (homeFirstFoldEnd || header).after(bar);
    const input = $('#global-search-input'), results = $('#global-search-results');
    function updateGlobalSearch() {
      const q = input.value.trim();
      if (!q) { results.hidden = true; return; }
      const matches = selectProducts(products, {query: q, category: 'all', department: 'all'});
      const top = matches.slice(0, 6);
      results.hidden = false;
      results.innerHTML = (top.length ? top.map(p => `<div class="pbar-item"><div class="pbar-thumb"><a href="${link(p)}">${photo(p)}</a></div><div class="pbar-meta"><strong><a href="${link(p)}">${e(p.name)}</a></strong><small>${e(category(p.category)?.name || '')} · ${e(p.subcategory)}</small></div><div class="pbar-item-actions"><button type="button" class="pbar-mini-btn" data-quickview="${p.id}">Quick view</button><button type="button" class="pbar-mini-btn" data-add="${p.id}">+ Quote</button></div></div>`).join('') + `<div style="padding:8px;text-align:center"><a class="text-link" href="products.html?q=${encodeURIComponent(q)}">View all ${matches.length} matching products →</a></div>` : `<div style="padding:12px;font-size:12px;color:var(--muted)">No exact match for “${e(q)}”. <a class="text-link" href="contact.html?subject=${encodeURIComponent(q)}">Enquire for custom sourcing →</a></div>`);
    }
    input.addEventListener('input', updateGlobalSearch);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && input.value.trim()) {
        location.href = 'products.html?q=' + encodeURIComponent(input.value.trim());
      }
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('.pbar-search-wrap')) results.hidden = true;
      const bq = $('#basket-quick-results');
      if (bq && !event.target.closest('.basket-quick-add')) bq.hidden = true;
    });
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        input.focus();
      }
    });
  }
  function enhanceStaticCards() {
    $$('.product-card[data-product]').forEach(cardEl => {
      const id = cardEl.dataset.product;
      const info = cardEl.querySelector('.product-info');
      if (!id || !info || info.querySelector('.card-aux-row')) return;
      cardEl.querySelector('.Compare, .compare-check')?.remove();
      const row = document.createElement('div');
      row.className = 'card-aux-row';
      row.innerHTML = `<label class="compare-check"><input type="checkbox" data-compare="${e(id)}" ${compare.includes(id)?'checked':''}> Compare</label><button type="button" class="quickview-btn" data-quickview="${e(id)}">Quick view</button>`;
      info.appendChild(row);
    });
  }
  function initAssistant() {
    if ($('.swm-assistant-toggle')) return;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'swm-assistant-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = `<span>Procurement Assistant</span>`;
    const panel = document.createElement('aside');
    panel.className = 'swm-assistant-panel';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Surgical Wholesale Mart Procurement Assistant');
    panel.innerHTML = `<div class="swm-assistant-head"><span>Surgical Mart B2B Assistant</span><button type="button" data-close-assistant aria-label="Close assistant">×</button></div><div class="swm-assistant-body"><p style="margin:0;color:var(--muted)">Select a procurement tool or clinical department:</p><div class="swm-assistant-chips"><button type="button" data-open-setup-planner>Hospital Setup Planner</button><button type="button" data-open-bulk-rfq>Paste Equipment List</button><button type="button" data-open-finance>EMI &amp; Finance Calc</button><button type="button" data-open-amc>AMC / CMC Plans</button><button type="button" data-open-tracker>Track / Reorder</button><button type="button" data-assist-dept="icu">ICU &amp; Critical Care</button><button type="button" data-assist-dept="ot">Operation Theatre</button><button type="button" data-assist-dept="ward">Wards &amp; Rooms</button></div><div style="border-top:1px solid var(--line);padding-top:10px"><strong style="display:block;margin-bottom:6px">Quick product finder</strong><div style="display:flex;gap:6px"><input id="assist-search-input" type="search" placeholder="e.g. Autoclave, OT Light, ICU Bed" style="flex:1;padding:6px 9px;font-size:11px"><button type="button" class="pbar-mini-btn" data-assist-search>Find</button></div></div><div style="border-top:1px solid var(--line);padding-top:10px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><a class="text-link" href="cart.html" style="font-size:11px">Quote basket →</a><a class="text-link" href="contact.html" style="font-size:11px">Talk to specialist →</a></div></div>`;
    document.body.append(toggle, panel);
    toggle.addEventListener('click', () => {
      const open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    });
  }
  document.addEventListener('click',event=>{
    if(event.target.id==='swm-modal-backdrop'){closeModal();return;}
    const button=event.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-close-modal')){closeModal();return;}
    if(button.hasAttribute('data-close-assistant')){const p=$('.swm-assistant-panel'),t=$('.swm-assistant-toggle');if(p)p.hidden=true;if(t)t.setAttribute('aria-expanded','false');return;}
    if(button.dataset.openMegamenu){openMegaMenu(button.dataset.openMegamenu);return;}
    if(button.hasAttribute('data-open-setup-planner')){openSetupPlanner(25);return;}
    if(button.dataset.launchSetup){openSetupPlanner(parseInt(button.dataset.launchSetup,10)||25);return;}
    if(button.hasAttribute('data-apply-setup-plan')){
      $$('[data-setup-qty-idx]').forEach(inp=>{const idx=Number(inp.dataset.setupQtyIdx);if(setupSchedule[idx])setupSchedule[idx].qty=Math.min(9999,Math.max(1,parseInt(inp.value,10)||1));});
      setupSchedule.forEach(({product,qty})=>{basket[product.id]=Math.min(9999,(basket[product.id]||0)+qty);});
      persistBasket();renderBasket();closeModal();
      toast(`Added ${setupSchedule.length} hospital setup equipment lines to quote basket.`,{href:'cart.html',label:'View quote basket →'});
      return;
    }
    if(button.hasAttribute('data-open-finance')){openFinanceModal();return;}
    if(button.hasAttribute('data-attach-finance-note')){
      const p=$('#emi-principal-out')?.textContent||'',m=$('#emi-monthly-out')?.textContent||'',t=$('#emi-tenure')?.value||'24',mode=$('#emi-mode')?.value||'Institutional Equipment Loan';
      const note=`Financing option requested: ${mode} | Est. Project Value: ${p} | Tenure: ${t} months (${m}).`;
      save(session,'swm-pending-note',note);
      closeModal();
      toast('Financing preference attached to your quotation draft.',{href:'checkout.html',label:'Proceed to quote →'});
      return;
    }
    if(button.hasAttribute('data-open-tracker')){openTrackerModal();return;}
    if(button.hasAttribute('data-run-tracker')){
      const val=$('#tracker-ref-input')?.value.trim()||'SWM-RFQ-2026';
      const lbl=$('#tracker-ref-label');if(lbl)lbl.textContent=val;
      toast(`Status updated for reference ${val}.`);
      return;
    }
    if(button.dataset.reorderIdx!==undefined){
      const history=read(local,'swm-enquiry-history',[])||[];
      const entry=history[Number(button.dataset.reorderIdx)];
      if(entry&&Array.isArray(entry.items)){
        entry.items.forEach(({id,qty})=>{if(byId(id))basket[id]=Math.min(9999,(basket[id]||0)+Number(qty||1));});
        persistBasket();renderBasket();closeModal();
        toast(`Reloaded ${entry.items.length} products from ${entry.ref} into your quote basket.`,{href:'cart.html',label:'View quote basket →'});
      }
      return;
    }
    if(button.hasAttribute('data-open-amc')){openAmcModal();return;}
    if(button.dataset.selectAmc){
      const plan=button.dataset.selectAmc;
      save(session,'swm-pending-note',`Service package requested: ${plan}.`);
      closeModal();
      toast(`${plan} attached to your quotation preferences.`,{href:'checkout.html',label:'Request quote →'});
      return;
    }
    if(button.hasAttribute('data-open-buyer-profile')){openBuyerProfileModal();return;}
    if(button.dataset.subcatChip!==undefined&&state){
      state.subcategory=button.dataset.subcatChip;limit=24;renderCatalog();return;
    }
    if(button.dataset.assistDept){location.href='products.html?department='+encodeURIComponent(button.dataset.assistDept);return;}
    if(button.hasAttribute('data-assist-search')){const q=$('#assist-search-input')?.value.trim();if(q)location.href='products.html?q='+encodeURIComponent(q);return;}
    if(button.dataset.quickview){openQuickView(button.dataset.quickview);return;}
    if(button.hasAttribute('data-open-bulk-rfq')){openBulkModal();return;}
    if(button.hasAttribute('data-bulk-sample')){const ta=$('#bulk-list-input');if(ta){ta.value='5 x Five-Function Electric ICU Bed\n4 x Seven-Parameter Patient Monitor\n2 x Semi-Electric C-Arm OT Table\n6 x Patient Wheelchair\n3 x Suction Machine';}return;}
    if(button.hasAttribute('data-run-bulk-match')){
      bulkMatches=parseBulkLines($('#bulk-list-input')?.value);
      const out=$('#bulk-match-output'),addBtn=$('#bulk-add-all-btn');
      if(!out)return;
      if(!bulkMatches.length){out.innerHTML='<p class="muted">No matching products found. Try entering product names like "ICU Bed", "Patient Monitor", or "OT Light".</p>';if(addBtn)addBtn.hidden=true;return;}
      if(addBtn){addBtn.hidden=false;addBtn.textContent=`Add ${bulkMatches.length} matched items to quote basket +`;}
      out.innerHTML=bulkMatches.map((m,idx)=>`<div class="bulk-match-row"><div class="pbar-thumb">${photo(m.product)}</div><div class="pbar-meta"><strong>${e(m.product.name)}</strong><small>Matched from: “${e(m.query)}” · ${e(m.product.subcategory)}</small></div><input type="number" min="1" max="9999" value="${m.qty}" data-bulk-qty-idx="${idx}" style="width:76px;padding:6px 8px;font-size:12px"></div>`).join('');
      return;
    }
    if(button.hasAttribute('data-add-bulk-matches')){
      $$('[data-bulk-qty-idx]').forEach(inp=>{const idx=Number(inp.dataset.bulkQtyIdx);if(bulkMatches[idx])bulkMatches[idx].qty=Math.min(9999,Math.max(1,parseInt(inp.value,10)||1));});
      bulkMatches.forEach(({product,qty})=>{basket[product.id]=Math.min(9999,(basket[product.id]||0)+qty);});
      persistBasket();renderBasket();closeModal();
      toast(`Added ${bulkMatches.length} product lines to your quote basket.`,{href:'cart.html',label:'View quote basket →'});
      return;
    }
    if(button.dataset.viewMode&&state){state.view=button.dataset.viewMode;renderCatalog(false);return;}
    if(button.hasAttribute('data-check-global-pin')){
      const val=$('#global-pincode-input')?.value.trim()||'';
      const res=evaluatePincode(val);
      if(!res){toast('Enter a 6-digit pincode or UAE to check serviceability.');return;}
      if(res.ok){savedPincode=val;save(local,'swm-pincode',val);const st=$('#global-pin-status');if(st)st.textContent=`✓ ${res.hub.split(' ')[0]} hub`;toast(`Deliverable via ${res.hub}. ${res.timeline}`);}
      else toast(res.message);
      return;
    }
    if(button.hasAttribute('data-check-detail-pin')){
      const val=$('#detail-pincode-input')?.value.trim()||'';
      const res=evaluatePincode(val),out=$('#detail-pin-result');
      if(!res||!out)return;
      if(res.ok){savedPincode=val;save(local,'swm-pincode',val);out.innerHTML=`✓ Deliverable · Nearest hub: <strong>${e(res.hub)}</strong> · ${e(res.timeline)}`;}
      else out.textContent=res.message;
      return;
    }
    if(button.dataset.tierQty){
      const inp=$('#detail-qty-input');if(inp)inp.value=button.dataset.tierQty;
      $$('.tier-chip').forEach(c=>c.classList.toggle('is-active',c===button));
      return;
    }
    if(button.dataset.detailDelta){
      const inp=$('#detail-qty-input');if(!inp)return;
      inp.value=Math.min(9999,Math.max(1,(parseInt(inp.value,10)||1)+Number(button.dataset.detailDelta)));
      return;
    }
    if(button.dataset.qvDelta){
      const inp=$('#qv-qty-input');if(!inp)return;
      inp.value=Math.min(9999,Math.max(1,(parseInt(inp.value,10)||1)+Number(button.dataset.qvDelta)));
      return;
    }
    if(button.dataset.addDetail){
      const id=button.dataset.addDetail;if(!byId(id))return;
      const qty=Math.min(9999,Math.max(1,parseInt($('#detail-qty-input')?.value||'1',10)||1));
      const addons=$$('[data-detail-addon]:checked').map(cb=>cb.dataset.detailAddon);
      if(addons.length)save(session,'swm-pending-note',`Selected options for ${byId(id).name}: ${addons.join(', ')}.`);
      basket[id]=Math.min(9999,(basket[id]||0)+qty);
      persistBasket();toast(`Added ${qty} × ${byId(id).name} to your quote basket.`,{href:'cart.html',label:'View quote basket →'});
      return;
    }
    if(button.dataset.addQv){
      const id=button.dataset.addQv;if(!byId(id))return;
      const qty=Math.min(9999,Math.max(1,parseInt($('#qv-qty-input')?.value||'1',10)||1));
      basket[id]=Math.min(9999,(basket[id]||0)+qty);
      persistBasket();renderBasket();closeModal();
      toast(`Added ${qty} × ${byId(id).name} to your quote basket.`,{href:'cart.html',label:'View quote basket →'});
      return;
    }
    if(button.dataset.specSheet){const p=byId(button.dataset.specSheet);if(p)downloadSpecSheet(p);return;}
    if(button.hasAttribute('data-export-csv')){exportBasketCSV();return;}
    if(button.hasAttribute('data-print-basket')){window.print();return;}
    if(button.hasAttribute('data-clear-basket')){basket={};persistBasket();renderBasket();toast('Quote basket cleared.');return;}
    if(button.hasAttribute('data-clear-recent')){recent=[];save(local,'swm-recent',[]);renderDetail();renderCatalog(false);renderBasket();toast('Recently viewed history cleared.');return;}
    if(button.hasAttribute('data-jump-compare')){
      if(!compare.length){toast('Select "Compare" on up to 3 product cards to compare specifications side by side.');return;}
      comparison();
      $('#comparison')?.scrollIntoView({behavior:'smooth',block:'nearest'});
      return;
    }
    if(button.hasAttribute('data-add-all-compare')){
      compare.forEach(id=>{if(byId(id))basket[id]=Math.min(9999,(basket[id]||0)+1);});
      persistBasket();renderBasket();toast(`Added ${compare.length} compared products to quote basket.`,{href:'cart.html',label:'View quote basket →'});
      return;
    }
    if(button.dataset.navigate){event.preventDefault();location.href=button.dataset.navigate;return;}
    if(button.dataset.clearFilter&&state){
      const key=button.dataset.clearFilter;
      if(key==='category')state.category='all';
      if(key==='department')state.department='all';
      if(key==='subcategory')state.subcategory='all';
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
  const menu=$('.mobile-menu');menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',open);menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');$('#store-nav').classList.toggle('is-open',open);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeModal();if(menu){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation');$('#store-nav').classList.remove('is-open');}}});
  enhanceStaticCards();
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
      sync();
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
  const ZOOM_BOX_SELECTOR = '.product-visual,.detail-image,.basket-photo,.category-visual,.procurement-visual,.editorial-image,.company-gallery figure,.quickview-visual,.pbar-thumb';
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
  function initMobileTabbar() {
    if ($('.mobile-ecom-tabbar')) return;
    const page = document.body?.dataset?.page || '';
    const totalQty = Object.values(basket).reduce((a, b) => a + b, 0);
    const nav = document.createElement('nav');
    nav.className = 'mobile-ecom-tabbar';
    nav.setAttribute('aria-label', 'Mobile e-commerce navigation');
    nav.innerHTML = `<a href="index.html" class="${page==='index'?'is-active':''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 21V12h6v9"/></svg><span>Home</span></a><button type="button" data-open-megamenu="categories"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg><span>Categories</span></button><a href="products.html" class="${page==='products'||page==='product'?'is-active':''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><span>Shop</span></a><button type="button" data-open-setup-planner><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M12 2v20M2 12h20"/><rect x="4" y="4" width="16" height="16" rx="3"/></svg><span>Hospital Setup</span></button><a href="cart.html" class="${page==='cart'||page==='checkout'?'is-active':''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M3 3h2l2.6 11.5a2 2 0 0 0 2 1.5h8.8a2 2 0 0 0 2-1.5L22 7H6"/><circle cx="9.5" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg><span>Quote Cart</span><b data-cart-count>${totalQty}</b></a>`;
    document.body.appendChild(nav);
  }
  initProcurementBar();initHomeB2BHub();initMobileTabbar();initAssistant();renderDetail();initCatalog();renderBasket();initForms();renderReview();sync();
  root.addEventListener('storage',event=>{if(event.key==='swm-basket'){basket=cleanBasket(read(local,'swm-basket',{}),products);sync();renderBasket();}if(event.key==='swm-saved'){const value=read(local,'swm-saved',[]);saved=Array.isArray(value)?value.filter(id=>byId(id)):[];sync();if(state){state.saved=saved;renderCatalog(false);}}});
})(typeof window !== 'undefined' ? window : globalThis);
