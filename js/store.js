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
    let list = products.filter(p => (state.category === 'all' || !state.category || p.category === state.category) && (!state.newOnly || p.origin === 'medikabazaar') && (state.department === 'all' || !state.department || p.department === state.department) && (state.subcategory === 'all' || !state.subcategory || p.subcategory === state.subcategory) && (!state.savedOnly || state.saved.includes(p.id)) && (!query || [p.name,p.sourceName,p.subcategory,p.description,...p.features,...(Array.isArray(p.specifications) ? p.specifications.flatMap(spec => [spec.label,spec.value]) : [])].join(' ').toLowerCase().includes(query)));
    if (state.sort === 'newest') list.sort((a,b) => Number(b.origin === 'medikabazaar') - Number(a.origin === 'medikabazaar'));
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
  let compare=read(session,'swm-compare',[]);
  compare=Array.isArray(compare)?[...new Set(compare)].filter(id=>byId(id)).slice(0,3):[];
  const heart='<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
  const photo = (p,loading='lazy') => p.image?`<img src="${e(p.image)}" referrerpolicy="no-referrer" alt="${e(p.name)}" loading="${loading}" width="600" height="420">`:'<div class="photo-request"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="10" y="16" width="44" height="34" rx="5"/><path d="m10 40 13-12 11 10 7-6 13 12"/><circle cx="41" cy="26" r="4"/></svg><span>Product photograph<br>available on enquiry</span></div>';
  const link = p => 'product.html?id='+encodeURIComponent(p.id);
  function card(p) { const isSaved=saved.includes(p.id); return `<article class="product-card" data-product="${p.id}"><div class="product-visual"><a href="${link(p)}" tabindex="-1" aria-hidden="true">${photo(p)}</a>${p.imageKind==='representative'?'<span class="photo-caption">Reference image</span>':''}<button type="button" class="save-button${isSaved?' is-liked':''}" data-save="${p.id}" aria-label="Save ${e(p.name)}" aria-pressed="${isSaved}">${heart}</button></div><div class="product-info"><span class="micro-label">${e(p.subcategory)}</span><h3><a href="${link(p)}">${e(p.name)}</a></h3><p>${e(p.features[0])}</p><div class="product-bottom"><span>Price coming soon</span><button type="button" class="add-button" data-add="${p.id}" aria-label="Add ${e(p.name)} to cart">Add to cart</button></div><div class="card-aux-row"><label class="compare-check"><input type="checkbox" data-compare="${p.id}" ${compare.includes(p.id)?'checked':''}> Compare</label><button type="button" class="quickview-btn" data-quickview="${p.id}">Quick view</button></div></div></article>`; }
  function evaluatePincode(raw) {
    const val=String(raw||'').trim().toUpperCase();
    if(!val)return null;
    if(!/^[1-9][0-9]{5}$/.test(val)&&!['UAE','DUBAI','SHARJAH'].includes(val))return {ok:false,message:'Enter a six-digit Indian pincode or UAE.'};
    return {ok:true,pin:val,hub:'Confirmation required',timeline:'Delivery timing, availability and installation coverage are confirmed with your quotation.',install:'Ask our team to confirm the service scope for this location.'};
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
  function updateProductCardCartControl(cardEl) {
    const id = cardEl.dataset.product;
    const product = byId(id);
    const bottom = cardEl.querySelector('.product-bottom');
    if (!product || !bottom) return;
    const quantity = basket[id] || 0;
    if (!quantity) {
      if (cardEl.closest('.product-marquee, #phone-products')) {
        bottom.innerHTML = `<button type="button" class="add-button add-to-cart-button" data-add="${id}" aria-label="Add ${e(product.name)} to cart">Add to cart <span aria-hidden="true">→</span></button>`;
      } else {
        bottom.innerHTML = `<span>Price coming soon</span><button type="button" class="add-button" data-add="${id}" aria-label="Add ${e(product.name)} to cart">Add to cart</button>`;
      }
      return;
    }
    bottom.innerHTML = `<div class="card-cart-stepper" role="group" aria-label="${e(product.name)} quantity controls"><button type="button" class="card-cart-stepper__button" data-quantity="${id}" data-delta="-1" aria-label="Decrease ${e(product.name)} quantity" ${quantity <= 1 ? 'disabled' : ''}>−</button><span class="card-cart-stepper__quantity" aria-live="polite" aria-label="Quantity ${quantity}">${quantity}</span><button type="button" class="card-cart-stepper__button" data-quantity="${id}" data-delta="1" aria-label="Increase ${e(product.name)} quantity">+</button><button type="button" class="card-cart-stepper__remove" data-remove="${id}" aria-label="Remove all ${e(product.name)} from cart" title="Remove product"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 14h11l1-14M9 7V4h6v3"/></svg></button></div>`;
  }
  function sync() {
    document.dispatchEvent(new CustomEvent('swm:change'));
    $$(".product-card[data-product]").forEach(updateProductCardCartControl);
    $$('#phone-products [data-phone-copy] .product-bottom button').forEach(button => { button.tabIndex = -1; });
    $$('[data-compare-count]').forEach(el=>el.textContent=compare.length);
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
      fab.innerHTML=`<span>Cart</span><b>${totalQty}</b>`;
      fab.setAttribute('aria-label',`View cart (${totalQty} ${totalQty===1?'item':'items'})`);
      fab.hidden=false;
    }else if(fab){
      fab.hidden=true;
    }
  }
  function persistBasket() { const ok=save(local,'swm-basket',basket);sync();return ok; }
  function quantityControl(p) {return `<div class="quantity"><button type="button" data-quantity="${p.id}" data-delta="-1" aria-label="Decrease quantity of ${e(p.name)}" ${basket[p.id]<=1?'disabled':''}>−</button><label class="sr-only" for="qty-${p.id}">Quantity of ${e(p.name)}</label><input id="qty-${p.id}" type="number" min="1" max="9999" step="1" value="${basket[p.id]}" data-quantity-input="${p.id}"><button type="button" data-quantity="${p.id}" data-delta="1" aria-label="Increase quantity of ${e(p.name)}">+</button></div>`;}
  function basketSummary() {
    const units = Object.values(basket).reduce((total, quantity) => total + quantity, 0);
    return `<h2>Order summary</h2><div class="summary-line"><span>Items</span><strong>${units}</strong></div><div class="summary-line"><span>Subtotal</span><strong>Coming soon</strong></div><div class="summary-line"><span>Delivery</span><strong>Coming soon</strong></div>`;
  }
  function empty(title,desc) {return `<div class="empty-state"><span class="empty-symbol">＋</span><h2>${title}</h2><p>${desc}</p><a class="button" href="products.html">Explore products →</a></div>`;}
  function renderBasket() {
    const host=$('#basket-page');if(!host)return;
    if(!Object.keys(basket).length){host.innerHTML=empty('Your cart is empty.','Find the products for your facility and add them to your selection.')+renderRecentSection();sync();return;}
    host.innerHTML=`<div class="basket-tools-bar"><div class="basket-quick-add"><input id="basket-quick-input" type="search" placeholder="Quick add product by name or subcategory…"><div id="basket-quick-results" class="pbar-results" hidden></div></div><div class="basket-export-actions"><button type="button" data-open-bulk-rfq>Paste bulk list</button><button type="button" data-export-csv>Export CSV</button><button type="button" data-print-basket>Print cart</button><button type="button" data-clear-basket>Clear cart</button></div></div><div class="basket-layout"><div class="basket-items">${Object.keys(basket).map(id=>{const p=byId(id);return `<article class="basket-item"><a class="basket-photo" href="${link(p)}">${photo(p)}</a><div><span class="micro-label">${e(category(p.category).name)} · ${e(p.subcategory)}</span><h2><a href="${link(p)}">${e(p.name)}</a></h2><span class="muted">Price coming soon</span><div style="display:flex;gap:12px;align-items:center;margin-top:6px"><button type="button" class="save-detail" data-save="${id}" aria-pressed="${saved.includes(id)}" style="min-height:30px;padding:4px 10px;font-size:11px">${heart} Save</button><button type="button" class="text-button remove-button" data-remove="${id}" style="margin:0">Remove</button></div></div>${quantityControl(p)}</article>`;}).join('')}<a class="text-link" href="products.html">← Continue shopping</a></div><aside class="summary-card">${basketSummary()}<button class="button button-block" type="button" disabled aria-describedby="cart-checkout-note">Proceed to checkout</button><p class="form-note" id="cart-checkout-note">Online checkout and pricing are coming soon.</p></aside></div>${renderRecentSection()}`;
    sync();
    const qInput=$('#basket-quick-input'),qBox=$('#basket-quick-results');
    if(qInput&&qBox){
      qInput.addEventListener('input',()=>{
        const q=qInput.value.trim().toLowerCase();
        if(!q){qBox.hidden=true;return;}
        const matches=selectProducts(products,{query:q,category:'all',department:'all'}).slice(0,5);
        qBox.hidden=!matches.length;
        qBox.innerHTML=matches.map(p=>`<div class="pbar-item"><div class="pbar-thumb">${photo(p)}</div><div class="pbar-meta"><strong><a href="${link(p)}">${e(p.name)}</a></strong><small>${e(p.subcategory)}</small></div><div class="pbar-item-actions"><button type="button" class="pbar-mini-btn" data-add="${p.id}">Add to cart</button></div></div>`).join('');
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
    host.innerHTML=`<div class="breadcrumbs"><a href="index.html">Home</a><span>/</span><a href="products.html">Products</a><span>/</span><a href="products.html?category=${p.category}">${e(category(p.category).name)}</a></div><div class="detail-layout"><div class="detail-image">${photo(p,'eager')}</div><div class="detail-copy"><span class="eyebrow">${e(p.subcategory)}</span><h1>${e(p.name)}</h1><p class="detail-description">${e(p.description)}</p><ul class="feature-list">${p.features.map(x=>`<li><span>✓</span>${e(x)}</li>`).join('')}</ul><div class="detail-price">Price coming soon<small>Online pricing will be available when checkout launches.</small></div><div class="detail-b2b-box"><div class="detail-qty-row"><label class="micro-label" for="detail-qty-input">Required quantity</label><div class="quantity"><button type="button" data-detail-delta="-1" aria-label="Decrease quantity">−</button><input id="detail-qty-input" type="number" min="1" max="9999" value="1"><button type="button" data-detail-delta="1" aria-label="Increase quantity">+</button></div><div class="detail-tier-chips"><button type="button" class="tier-chip is-active" data-tier-qty="1">1 Unit</button><button type="button" class="tier-chip" data-tier-qty="5">5 · Ward</button><button type="button" class="tier-chip" data-tier-qty="10">10 · Dept</button><button type="button" class="tier-chip" data-tier-qty="25">25+ · Project</button></div></div><div class="detail-pin-row"><input id="detail-pincode-input" type="text" maxlength="12" placeholder="Enter pincode or UAE" value="${e(savedPincode)}"><button type="button" data-check-detail-pin>Check delivery & hub</button></div><div id="detail-pin-result" class="detail-pin-result">${pinInfo?(pinInfo.ok?`Location saved · Delivery coverage: <strong>${e(pinInfo.hub)}</strong> · ${e(pinInfo.timeline)}`:e(pinInfo.message)):'Enter your hospital pincode to check dispatch hub and installation coverage.'}</div><div class="detail-service-addons"><label><input type="checkbox" data-detail-addon="On-site installation & clinical training" checked> On-site installation &amp; training</label><label><input type="checkbox" data-detail-addon="Comprehensive AMC / CMC quotation"> Request AMC / CMC information</label><label><input type="checkbox" data-detail-addon="Institutional EMI / equipment financing"> EMI / leasing option</label><label><input type="checkbox" data-detail-addon="Experience centre live demonstration"> Request live demo</label></div></div><div class="detail-actions"><button type="button" class="button" data-add-detail="${p.id}">Add to cart</button><button type="button" class="save-detail buy-now-button" data-add-detail="${p.id}" data-buy-now>Buy now</button><button type="button" class="save-detail" data-save="${p.id}" aria-pressed="${saved.includes(p.id)}">${heart} Save product</button><button type="button" class="save-detail" data-spec-sheet="${p.id}">Download spec sheet</button><button type="button" class="save-detail" data-open-finance>EMI &amp; Finance</button></div><div class="detail-utility-actions"><a class="text-link" href="contact.html?subject=${encodeURIComponent(p.name)}">Ask a product question →</a><a class="text-link" target="_blank" rel="noopener noreferrer" href="https://wa.me/919289976683?text=${encodeURIComponent('Hello Surgical Wholesale Mart, I would like a quotation and specification details for: '+p.name+' ('+p.subcategory+').')}">Enquire on WhatsApp ↗</a></div><div class="detail-note">${p.imageKind==='representative'?'This is a representative range photo, not confirmation of the exact model or configuration. ':''}Availability, specifications, included accessories, warranty and delivery are confirmed with your quotation.</div></div></div><div class="detail-tabs"><h2>Before you order</h2><details open><summary>Product configuration</summary><p>Tell us your preferred size, configuration and quantity. Request a current specification sheet and a photograph of the configuration being quoted.</p></details><details><summary>Delivery & installation</summary><p>Share your delivery city and site access requirements. Ask the team to include transport, installation and training scope in your quotation where applicable.</p></details><details><summary>Warranty & returns</summary><p>Ask for product-specific warranty coverage, service arrangements and return terms in writing before confirming your order.</p></details></div><div class="section-heading"><h2>Explore similar requirements</h2><a class="text-link" href="products.html?category=${p.category}">View category →</a></div><div class="product-grid related-grid">${products.filter(x=>x.category===p.category&&x.id!==p.id).slice(0,4).map(card).join('')}</div>${renderRecentSection(p.id)}`;
    const specifications = Array.isArray(p.specifications) ? p.specifications.filter(spec => spec && spec.label && spec.value) : [];
    host.querySelector('.detail-actions').insertAdjacentHTML('beforeend', `<label class="save-detail phone-detail-compare"><input type="checkbox" data-compare="${p.id}"> Compare product</label>`);
    const phoneLayout = window.matchMedia('(max-width: 700px)');
    const options = host.querySelector('.detail-b2b-box');
    const actions = host.querySelector('.detail-actions');
    const placeActions = () => {
      if (phoneLayout.matches) options.querySelector('.detail-qty-row').after(actions);
      else options.after(actions);
    };
    placeActions();
    phoneLayout.addEventListener('change', placeActions);
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
  let catalogueObserver;
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
    let more = $('#load-more');
    let sentinel = $('#catalog-scroll-sentinel');
    if (!more) {
      more = document.createElement('button');
      more.type = 'button';
      more.id = 'load-more';
      more.className = 'button load-more';
      sentinel = document.createElement('div');
      sentinel.id = 'catalog-scroll-sentinel';
      sentinel.setAttribute('aria-hidden', 'true');
      $('#catalog-grid').after(sentinel, more);
      if ('IntersectionObserver' in window) {
        const phone = window.matchMedia('(max-width: 700px)');
        catalogueObserver = new IntersectionObserver(entries => {
          if (phone.matches && entries.some(entry => entry.isIntersecting) && !more.hidden) more.click();
        }, { rootMargin: '0px 0px 320px' });
        const syncPagination = () => {
          more.toggleAttribute('data-auto-load', phone.matches);
          if (phone.matches && !more.hidden) catalogueObserver.observe(sentinel);
          else catalogueObserver.unobserve(sentinel);
        };
        phone.addEventListener('change', syncPagination);
        syncPagination();
      }
    }
    const updateMore = () => {
      more.hidden = list.length <= limit;
      sentinel.hidden = more.hidden;
      more.textContent = `Show more products (${Math.min(limit, list.length)} of ${list.length})`;
      if (more.hasAttribute('data-auto-load')) {
        if (more.hidden) catalogueObserver.unobserve(sentinel);
        else catalogueObserver.observe(sentinel);
      }
    };
    more.onclick = () => {
      if (more.hidden) return;
      const next = list.slice(limit, limit + 24);
      limit += 24;
      $('#catalog-grid').insertAdjacentHTML('beforeend', next.map(card).join(''));
      updateMore();
      sync();
    };
    updateMore();
    $('#catalog-enquiry').innerHTML=(cat?.requests?`<div class="category-enquiry"><h2>Need something else in ${e(cat.name.toLowerCase())}?</h2><p>Share your preferred type, size and quantity with our team.</p><div>${cat.requests.map(x=>`<a href="contact.html?subject=${encodeURIComponent(x)}">${e(x)} →</a>`).join('')}</div></div>`:'')+renderRecentSection();
    const activeTags=[cat?{key:'category',label:cat.name}:null,state.department!=='all'?{key:'department',label:departments.find(d=>d.id===state.department)?.name}:null,state.subcategory&&state.subcategory!=='all'?{key:'subcategory',label:state.subcategory}:null,state.query?{key:'query',label:`“${state.query}”`}:null,state.savedOnly?{key:'savedOnly',label:'Saved only'}:null].filter(x=>x&&x.label);
    $('#active-filters').innerHTML=activeTags.map(t=>`<button type="button" data-clear-filter="${t.key}" aria-label="Remove filter ${e(t.label)}">${e(t.label)} <span aria-hidden="true">×</span></button>`).join('');
    $$('input[name="category"]').forEach(x=>x.checked=x.value===state.category);
    $('#department-filter').value=state.department;$('#saved-filter').setAttribute('aria-pressed',state.savedOnly);
    $('.phone-catalog-saved')?.setAttribute('aria-pressed', String(state.savedOnly));
    if(updateURL){const q=new URLSearchParams();if(state.category!=='all')q.set('category',state.category);if(state.department!=='all')q.set('department',state.department);if(state.subcategory&&state.subcategory!=='all')q.set('subcategory',state.subcategory);if(state.query)q.set('q',state.query);if(state.savedOnly)q.set('saved','1');if(state.sort!=='featured')q.set('sort',state.sort);if(state.newOnly)q.set('new','1');history.replaceState(null,'',location.pathname+(q.size?'?'+q:''));}
    sync();
  }
  function initCatalog() {
    if(!$('#catalog-grid'))return;
    const filters = $('#catalog-filters');
    const toggle = $('.phone-filter-toggle');
    if (filters && toggle) {
      const setExpanded = expanded => {
        toggle.setAttribute('aria-expanded', String(expanded));
        filters.toggleAttribute('data-phone-collapsed', !expanded);
      };
      const phoneCatalog = window.matchMedia('(max-width: 700px)');
      const toolbar = $('.catalog-toolbar');
      const results = $('.catalog-results');
      const extra = $('.catalog-extra-controls');
      const secondary = $('.catalog-secondary-tools');
      const newOnly = $('#shop-new-filter')?.closest('label');
      const filterHelp = $('.filter-help');
      const placeFilters = () => {
        if (phoneCatalog.matches) {
          toolbar.after(filters);
          if (secondary && newOnly && filterHelp) filterHelp.before(newOnly, secondary);
        } else {
          results.before(filters);
          if (extra && secondary && newOnly) extra.append(secondary, newOnly);
        }
      };
      placeFilters();
      phoneCatalog.addEventListener('change', placeFilters);
      toggle.addEventListener('click', () => setExpanded(toggle.getAttribute('aria-expanded') === 'false'));
      filters.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !phoneCatalog.matches) return;
        setExpanded(false);
        toggle.focus();
      });
    }
    const q=new URLSearchParams(location.search);
    state={category:category(q.get('category'))?q.get('category'):'all',department:departments.some(d=>d.id===q.get('department'))?q.get('department'):'all',subcategory:q.get('subcategory')||'all',query:q.get('q')||'',savedOnly:q.get('saved')==='1',saved,sort:['az','za','newest'].includes(q.get('sort'))?q.get('sort'):'featured',newOnly:q.get('new')==='1',view:'grid'};
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
    $('#catalog-query').value=state.query;const siteSearch=$('#site-search');if(siteSearch)siteSearch.value=state.query;$('#sort-products').value=state.sort;
    $$('input[name="category"]').forEach(x=>x.addEventListener('change',()=>{state.category=x.value;limit=24;renderCatalog();}));
    $('#department-filter').addEventListener('change',event=>{state.department=event.target.value;limit=24;renderCatalog();});
    $('#sort-products').addEventListener('change',event=>{state.sort=event.target.value;renderCatalog();});
    $('#catalog-query').addEventListener('input',event=>{state.query=event.target.value;limit=24;renderCatalog();});
    $$('#saved-filter, .phone-catalog-saved').forEach(button => {
      button.addEventListener('click', () => {
        state.savedOnly = !state.savedOnly;
        limit = 24;
        renderCatalog();
      });
    });
    $('#reset-filters').addEventListener('click',()=>{state={category:'all',department:'all',subcategory:'all',query:'',savedOnly:false,saved,sort:'featured',view:state.view||'grid'};$('#catalog-query').value='';$('#sort-products').value='featured';limit=24;renderCatalog();});
    renderCatalog(false);
  }
  function similarWord(query, candidate) {
    if (candidate === query) return true;
    if (query.length < 4) return false;
    if (candidate.startsWith(query) || (candidate.length >= 4 && query.startsWith(candidate))) return true;
    if (query.length < 5 || Math.abs(query.length - candidate.length) > 1) return false;
    const first = [...query].findIndex((letter, index) => letter !== candidate[index]);
    if (first < 0) return false;
    if (query.length === candidate.length) {
      return query.slice(first + 1) === candidate.slice(first + 1) ||
        query[first] === candidate[first + 1] && query[first + 1] === candidate[first] &&
        query.slice(first + 2) === candidate.slice(first + 2);
    }
    return query.length > candidate.length
      ? query.slice(first + 1) === candidate.slice(first)
      : query.slice(first) === candidate.slice(first + 1);
  }

  function findProductMatches(query) {
    const normalize = root.SWM_SHOP_CORE.normalize;
    const key = normalize(query);
    const matches = selectProducts(products, { query });
    const exact = key ? products.filter(p => normalize(p.name) === key || normalize(p.sourceName) === key || normalize(p.id) === key) : [];
    const direct = [...new Set([...exact, ...matches])];
    const tokens = key.split(' ').filter(token => token.length >= 3 && !['and', 'for', 'the', 'with'].includes(token));
    const related = key && !direct.length ? products.map(product => {
      const categoryName = category(product.category)?.name || '';
      const words = normalize(`${product.name} ${product.sourceName || ''} ${product.subcategory} ${categoryName}`).split(' ');
      const score = tokens.reduce((count, token) => count + Number(words.some(word => similarWord(token, word))), 0);
      return { product, score };
    }).filter(match => match.score).sort((a, b) => b.score - a.score).map(match => match.product) : [];
    return { direct, related };
  }
  function initProductSearch() {
    const field = $('#product-search-query');
    if (!field) return;
    const results = $('#product-search-results');
    const status = $('#product-search-status');
    const more = $('#product-search-more');
    let limit = 24;

    function render() {
      const query = field.value.trim();
      if (!query) {
        status.hidden = more.hidden = true;
        status.textContent = '';
        results.replaceChildren();
        $('#comparison')?.setAttribute('hidden', '');
        return;
      }
      const { direct, related } = findProductMatches(query);
      const list = direct.length ? direct : related;
      status.hidden = false;
      status.textContent = direct.length
        ? `${direct.length} ${direct.length === 1 ? 'product' : 'products'} found`
        : related.length ? 'No exact matches. Showing related products.' : 'No matching products. Try a different name, type, or model.';
      results.innerHTML = list.slice(0, limit).map(card).join('');
      more.hidden = list.length <= limit;
      sync();
    }

    function search() { limit = 24; render(); }
    field.addEventListener('input', search);
    field.form.addEventListener('submit', event => {
      event.preventDefault();
      search();
    });
    more.addEventListener('click', () => { limit += 24; render(); });
    field.value = new URLSearchParams(location.search).get('q') || '';
    if (field.value) search();
  }
  function comparison() {
    save(session,'swm-compare',compare);
    let host=$('#comparison');if(!host){host=document.createElement('section');host.id='comparison';host.className='comparison';$('#main').appendChild(host);}
    host.hidden=!compare.length;
    if(!compare.length){sync();return;}
    host.innerHTML=`<div class="comparison-heading"><strong>Compare ${compare.length} of 3 products</strong><div><button type="button" class="text-button" data-add-all-compare style="margin-right:14px">Add all to cart +</button><button type="button" class="text-button" data-clear-compare>Clear comparison</button></div></div><div class="comparison-table"><table><caption class="sr-only">Selected product comparison</caption><thead><tr><th>Product</th>${compare.map(id=>`<th><div class="product-visual" style="max-width:140px;margin-bottom:8px"><a href="${link(byId(id))}">${photo(byId(id))}</a></div><a href="${link(byId(id))}">${e(byId(id).name)}</a></th>`).join('')}</tr></thead><tbody><tr><th>Family &amp; Subcategory</th>${compare.map(id=>`<td>${e(category(byId(id).category).name)} · ${e(byId(id).subcategory)}</td>`).join('')}</tr><tr><th>Clinical department</th>${compare.map(id=>`<td>${e(departments.find(d=>d.id===byId(id).department)?.name||'General hospital')}</td>`).join('')}</tr><tr><th>Listed features</th>${compare.map(id=>`<td>${byId(id).features.map(e).join('<br>')}</td>`).join('')}</tr><tr><th>Cart</th>${compare.map(id=>`<td><button type="button" class="text-button" data-add="${id}">Add to cart</button></td>`).join('')}</tr></tbody></table></div>`;
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
    if(!draft||typeof draft.text!=='string'){host.innerHTML=empty('There is no enquiry draft yet.','Build a cart or contact our team to start your enquiry.');return;}
    currentEnquiry=draft.text;
    host.innerHTML=`<div class="review-card"><span class="eyebrow">READY FOR YOUR REVIEW</span><h1>Your enquiry draft is ready.</h1><p>Check your selection and contact details, then choose how to share it with the product team.</p><pre class="enquiry-preview">${e(currentEnquiry)}</pre>${sharing(currentEnquiry)}<a class="text-link" href="checkout.html">← Edit enquiry</a><button type="button" class="text-button" data-discard-draft>Discard contact draft</button></div>`;
  }
  function initForms() {
    const buyerProfile=read(local,'swm-buyer-profile',{})||{};
    const quote=$('#quote-form');
    if(quote){
      const summary=$('#checkout-summary');summary.innerHTML=basketSummary()+Object.keys(basket).map(id=>`<div class="summary-product"><span>${basket[id]} × ${e(byId(id).name)}</span></div>`).join('');
      if(!Object.keys(basket).length){quote.innerHTML=empty('Add products to get started.','Your cart is currently empty.');return;}
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
      if(!quote.dataset.quoteBound){quote.dataset.quoteBound='1';quote.addEventListener('submit',event=>{
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
      });}
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
      rows.push([p.id, p.name, category(p.category)?.name || p.category, p.subcategory, String(qty), 'Coming soon']);
    });
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'surgical-wholesale-mart-quote-basket.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Cart exported to CSV.');
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
    backdrop.innerHTML = `<div class="swm-modal" role="dialog" aria-modal="true" aria-label="${e(p.name)} quick view"><button type="button" class="swm-modal-close" data-close-modal aria-label="Close modal">×</button><div class="quickview-layout"><div class="quickview-visual">${photo(p, 'eager')}</div><div><span class="eyebrow">${e(category(p.category)?.name || '')} · ${e(p.subcategory)}</span><h2 style="margin-bottom:10px">${e(p.name)}</h2><p class="muted" style="font-size:13px">${e(p.description)}</p><ul class="feature-list">${p.features.map(x => `<li><span>✓</span>${e(x)}</li>`).join('')}</ul>${specs.length ? `<div class="product-specifications"><dl>${specs.map(s => `<div><dt>${e(s.label)}</dt><dd>${e(s.value)}</dd></div>`).join('')}</dl></div>` : ''}<div class="detail-qty-row" style="margin:14px 0"><label class="micro-label" for="qv-qty-input">Quantity</label><div class="quantity"><button type="button" data-qv-delta="-1">−</button><input id="qv-qty-input" type="number" min="1" max="9999" value="1"><button type="button" data-qv-delta="1">+</button></div></div><div class="detail-actions"><button type="button" class="button" data-add-qv="${p.id}">Add to cart</button><button type="button" class="save-detail" data-save="${p.id}" aria-pressed="${saved.includes(p.id)}">${heart} Save</button><button type="button" class="save-detail" data-spec-sheet="${p.id}">Spec sheet</button></div><a class="text-link" href="${link(p)}">Open full product page →</a></div></div></div>`;
    document.body.appendChild(backdrop);
    sync();
  }
  let bulkMatches=[],bulkRows=[];
  function updateBulkMatches(){
    bulkMatches=bulkRows.filter(r=>r.valid&&r.selected&&byId(r.selected)).map(r=>({product:byId(r.selected),qty:r.qty,query:r.query}));
    const add=$('#bulk-add-all-btn');if(add){add.hidden=!bulkRows.length;add.disabled=!bulkRows.length||bulkMatches.length!==bulkRows.length;add.textContent='Add '+bulkMatches.length+' matched product lines';}
  }
  function renderBulkMatches(){
    bulkRows=root.SWM_SHOP_CORE.parseQuickOrder($('#bulk-list-input')?.value,products);
    const out=$('#bulk-match-output');if(!out)return;
    out.innerHTML=bulkRows.length?bulkRows.map((r,i)=>`<div class="shop-bulk-row"><div><strong>${e(r.query)}</strong><small>Quantity: ${e(r.qty)} · ${e(r.error||'Matched')}</small></div><select data-bulk-choice="${i}" aria-label="Choose product for ${e(r.query)}"><option value="">Choose a product</option>${r.candidates.map(id=>`<option value="${e(id)}" ${r.selected===id?'selected':''}>${e(byId(id).name)} [${e(id)}]</option>`).join('')}</select></div>`).join(''):'<p>Enter at least one product and quantity.</p>';
    updateBulkMatches();
  }
  function openBulkModal(){
    closeModal();const backdrop=document.createElement('div');backdrop.id='swm-modal-backdrop';backdrop.className='swm-modal-backdrop';
    backdrop.innerHTML=`<div class="swm-modal" role="dialog" aria-modal="true" aria-label="Bulk product list"><button type="button" class="swm-modal-close" data-close-modal aria-label="Close">×</button><span class="eyebrow">BULK ADD TO CART</span><h2>Add equipment from your list</h2><p>Enter one product per line, for example: 5 x Five-Function Electric ICU Bed. CSV files can use Product,Quantity columns. Review every match before adding it.</p><label class="field-label">Upload CSV or text file<input id="bulk-file-input" type="file" accept=".csv,.txt,text/csv,text/plain"></label><label class="field-label">Product list<textarea id="bulk-list-input" rows="8" maxlength="100000" placeholder="5 x Five-Function Electric ICU Bed"></textarea></label><button type="button" class="button" data-run-bulk-match>Find matching products</button><p id="bulk-file-message" role="status"></p><div id="bulk-match-output"></div><button type="button" class="button" id="bulk-add-all-btn" data-add-bulk-matches hidden>Add matched products</button></div>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('change',async event=>{
      if(event.target.dataset.bulkChoice!==undefined){const i=Number(event.target.dataset.bulkChoice);if(bulkRows[i]&&bulkRows[i].candidates.includes(event.target.value))bulkRows[i].selected=event.target.value;else if(bulkRows[i])bulkRows[i].selected='';updateBulkMatches();}
      if(event.target.id==='bulk-file-input'){const file=event.target.files[0];if(!file)return;const message=$('#bulk-file-message');if(file.size>1000000||! /\.(csv|txt)$/i.test(file.name)){message.textContent='Choose a CSV or text file smaller than 1 MB.';return;}try{$('#bulk-list-input').value=await file.text();message.textContent='File read locally. Review the matched products below.';renderBulkMatches();}catch{message.textContent='This file could not be read.';}}
    });
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
    backdrop.innerHTML = `<div class="swm-modal" role="dialog" aria-modal="true" aria-label="Turnkey hospital setup planner"><button type="button" class="swm-modal-close" data-close-modal aria-label="Close modal">×</button><span class="eyebrow">TURNKEY HOSPITAL SETUP &amp; CAPEX CONFIGURATOR</span><h2>Plan your facility equipment by bed capacity</h2><p class="muted" style="font-size:13px">Select your facility type, bed strength, and clinical departments to generate an itemized equipment schedule from our catalogue.</p><div class="setup-planner-controls"><label class="field-label" style="margin:0">Facility type<select id="setup-facility-type" style="width:100%;margin-top:6px"><option>Multi-Specialty Hospital</option><option>Nursing Home / Medical Centre</option><option>ICU &amp; Critical Care Wing</option><option>Surgical &amp; Modular OT Complex</option><option>OPD &amp; Daycare Clinic</option></select></label><label class="field-label" style="margin:0">Planned bed capacity<select id="setup-bed-count" style="width:100%;margin-top:6px"><option value="10" ${defaultBeds===10?'selected':''}>10 Beds (Clinic / Daycare)</option><option value="25" ${defaultBeds===25?'selected':''}>25 Beds (Nursing Home)</option><option value="50" ${defaultBeds===50?'selected':''}>50 Beds (Multi-Specialty)</option><option value="100" ${defaultBeds===100?'selected':''}>100 Beds (Tertiary Hospital)</option><option value="250" ${defaultBeds===250?'selected':''}>250+ Beds (Medical College / Hospital)</option></select></label><label class="field-label" style="margin:0">Project timeline<select id="setup-timeline" style="width:100%;margin-top:6px"><option>Immediate (Within 30 days)</option><option>1 – 3 Months</option><option>3 – 6 Months (Planning / Civil stage)</option></select></label><div class="setup-dept-checks"><label><input type="checkbox" value="icu" checked> ICU &amp; Critical Care</label><label><input type="checkbox" value="ot" checked> Operation Theatre &amp; MGPS</label><label><input type="checkbox" value="ward" checked> Inpatient Wards &amp; Rooms</label><label><input type="checkbox" value="opd" checked> OPD &amp; Examination</label><label><input type="checkbox" value="emergency" checked> Emergency &amp; Patient Transfer</label></div></div><div id="setup-planner-summary" class="setup-summary-strip"></div><div id="setup-planner-list" class="bulk-match-list"></div><div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px"><button type="button" class="button" data-apply-setup-plan>Add entire setup to cart +</button><button type="button" class="button button-outline" data-open-finance>Calculate Capex EMI / Leasing</button></div></div>`;
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
    backdrop.innerHTML = `<div class="swm-modal" role="dialog" aria-modal="true" aria-label="B2B Equipment EMI and Finance Calculator"><button type="button" class="swm-modal-close" data-close-modal aria-label="Close modal">×</button><span class="eyebrow">INSTITUTIONAL CAPEX &amp; EMI CALCULATOR</span><h2>Medical Equipment Financing &amp; Leasing Estimator</h2><p class="muted" style="font-size:13px">Estimate monthly installments for hospital furniture, ICU setups, modular OT projects, or diagnostic equipment procurement.</p><div class="emi-preset-row"><button type="button" class="tier-chip" data-emi-amount="250000">₹2.5 Lakh</button><button type="button" class="tier-chip is-active" data-emi-amount="1000000">₹10 Lakh</button><button type="button" class="tier-chip" data-emi-amount="2500000">₹25 Lakh</button><button type="button" class="tier-chip" data-emi-amount="5000000">₹50 Lakh</button><button type="button" class="tier-chip" data-emi-amount="10000000">₹1 Crore</button></div><div class="emi-calc-grid"><div style="display:grid;gap:12px"><label class="field-label" style="margin:0">Estimated equipment / project value (₹)<input id="emi-principal" type="number" min="50000" step="25000" value="1000000" style="width:100%;margin-top:6px"></label><label class="field-label" style="margin:0">Repayment tenure (Months)<select id="emi-tenure" style="width:100%;margin-top:6px"><option value="6">6 Months</option><option value="12">12 Months (1 Year)</option><option value="24" selected>24 Months (2 Years)</option><option value="36">36 Months (3 Years)</option><option value="48">48 Months (4 Years)</option><option value="60">60 Months (5 Years)</option></select></label><label class="field-label" style="margin:0">Illustrative annual interest rate (% p.a.)<input id="emi-rate" type="number" min="6" max="24" step="0.5" value="10.5" style="width:100%;margin-top:6px"></label><label class="field-label" style="margin:0">Preferred financing structure<select id="emi-mode" style="width:100%;margin-top:6px"><option>Institutional Equipment Loan (EMI)</option><option>Medical Equipment Operating Lease</option><option>Milestone / Letter of Credit (LC)</option></select></label></div><div class="emi-result-card"><span class="micro-label">ESTIMATED MONTHLY INSTALLMENT</span><strong id="emi-monthly-out">₹46,376 / month</strong><div class="summary-line"><span>Principal project value</span><b id="emi-principal-out">₹10,00,000</b></div><div class="summary-line"><span>Estimated total interest</span><b id="emi-interest-out">₹1,13,025</b></div><div class="summary-line"><span>Total payable across tenure</span><b id="emi-total-out">₹11,13,025</b></div><p class="form-note" style="margin:0">Indicative calculation for hospital budgeting. Final financing terms depend on institutional eligibility and partner banking approval.</p><button type="button" class="button" data-attach-finance-note>Save financing preference →</button></div></div></div>`;
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
    const stored=read(local,'swm-enquiry-history',[]);
    const history=Array.isArray(stored)?stored.filter(h=>h&&h.ref&&Array.isArray(h.items)):[];
    const backdrop=document.createElement('div');backdrop.id='swm-modal-backdrop';backdrop.className='swm-modal-backdrop';
    backdrop.innerHTML=`<div class="swm-modal" role="dialog" aria-modal="true" aria-label="Saved product lists"><button type="button" class="swm-modal-close" data-close-modal aria-label="Close">×</button><span class="eyebrow">SAVED PRODUCT LISTS</span><h2>Saved drafts &amp; reorder</h2><p class="muted">These drafts are saved on this device. Preparing a draft does not send it or place an order. Contact our team for a confirmed quotation or shipment status.</p><div class="bulk-match-list">${history.length?history.map((h,i)=>`<article class="bulk-match-row" style="grid-template-columns:1fr auto"><div><strong>${e(h.ref)}</strong><small style="display:block">${e(h.date||'')} · ${h.items.length} products · Draft prepared</small></div><button type="button" class="pbar-mini-btn" data-reorder-idx="${i}">Add to basket again</button></article>`).join(''):'<p>No product lists are saved on this device.</p>'}</div><a class="button" href="contact.html">Ask about an existing order →</a></div>`;
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
    backdrop.innerHTML = `<div class="swm-modal" role="dialog" aria-modal="true" aria-label="Institutional Buyer Profile and GST Details"><button type="button" class="swm-modal-close" data-close-modal aria-label="Close modal">×</button><span class="eyebrow">INSTITUTIONAL BUYER PROFILE</span><h2>Hospital &amp; GST Procurement Profile</h2><p class="muted" style="font-size:13px">Save your hospital and GST details in your browser to automatically pre-fill quotation, support, and meeting requests.</p><form id="buyer-profile-form" style="display:grid;gap:14px;margin-top:14px"><div class="form-row"><label class="field-label" style="margin:0">Contact person name<input name="name" value="${e(prof.name||'')}" placeholder="Dr. / Procurement Officer Name" style="width:100%;margin-top:6px"></label><label class="field-label" style="margin:0">Hospital / Organisation name<input name="organisation" value="${e(prof.organisation||'')}" placeholder="Hospital, Clinic or Trust Name" style="width:100%;margin-top:6px"></label></div><div class="form-row"><label class="field-label" style="margin:0">GSTIN / Institutional Reg. No.<input name="gstin" value="${e(prof.gstin||'')}" placeholder="e.g. 07AAAAA0000A1Z5" style="width:100%;margin-top:6px"></label><label class="field-label" style="margin:0">Phone / WhatsApp<input name="phone" value="${e(prof.phone||'')}" placeholder="+91 ..." style="width:100%;margin-top:6px"></label></div><div class="form-row"><label class="field-label" style="margin:0">Official email<input name="email" type="email" value="${e(prof.email||'')}" placeholder="procurement@hospital.org" style="width:100%;margin-top:6px"></label><label class="field-label" style="margin:0">City &amp; Delivery Pincode<div style="display:flex;gap:8px;margin-top:6px"><input name="city" value="${e(prof.city||'')}" placeholder="City" style="flex:1"><input name="postcode" value="${e(prof.postcode||savedPincode||'')}" placeholder="Pincode" style="width:110px"></div></label></div><div style="display:flex;gap:12px;align-items:center"><button type="submit" class="button">Save buyer profile</button><button type="button" class="text-button" data-open-tracker>View saved lists &amp; reorder →</button></div></form></div>`;
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
    const target = document.body.classList.contains('home-page') ? $('#featured-products') : null;
    if (!target) return;
    const hub = document.createElement('section');
    hub.id = 'home-b2b-hub';
    hub.className = 'section home-b2b-hub';
    hub.innerHTML = `
      <div class="b2b-hub-hero">
        <div class="b2b-hub-hero-copy">
          <span class="eyebrow">DIGITAL HEALTHCARE PROCUREMENT SUITE <i aria-hidden="true"></i></span>
          <h2>Every tool to plan, compare &amp;<br>equip <em>your facility.</em></h2>
        </div>
        <div class="b2b-hub-art" aria-hidden="true">
          <img class="b2b-hub-scene" src="assets/img/procurement-suite-corridor.png" alt="" loading="lazy" width="2160" height="720">
        </div>
      </div>
      <div class="b2b-hub-grid">
        <button type="button" class="b2b-hub-card tone-blue" data-open-setup-planner><span class="b2b-hub-icon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 11v28M7 27h34a3 3 0 0 1 3 3v9M7 20h8a7 7 0 0 1 7 7M22 27V17h14a5 5 0 0 1 5 5v5M12 39v3m27-3v3"/></svg></span><span class="eyebrow">FACILITY PLANNING</span><h3>Hospital Setup by Bed Capacity</h3><p>Complete 10 to 250 bed hospital setups with ICU, OT, wards &amp; CSSD.</p><strong class="b2b-hub-action">Launch Planner <span aria-hidden="true">→</span></strong></button>
        <button type="button" class="b2b-hub-card tone-orange" data-open-bulk-rfq><span class="b2b-hub-icon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 6h16l9 9v27H14zM30 6v10h9M20 24h13M20 30h13M20 36h9"/></svg></span><span class="eyebrow">FAST SOURCING</span><h3>Bulk RFQ &amp; Lot Matcher</h3><p>Submit multiple requirements and get the best quotes across top brands.</p><strong class="b2b-hub-action">Upload Requirements <span aria-hidden="true">→</span></strong></button>
        <button type="button" class="b2b-hub-card tone-teal" data-open-megamenu="specialties"><span class="b2b-hub-icon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 10h5l4 22h23l5-16H12M17 20h18M20 37h.01M34 37h.01"/><circle cx="20" cy="37" r="2.2"/><circle cx="34" cy="37" r="2.2"/></svg></span><span class="eyebrow">CENTRAL DIRECTORY</span><h3>Shop by Specialty &amp; Dept</h3><p>Browse equipment and solutions department wise from a wide selection.</p><strong class="b2b-hub-action">Browse Specialties <span aria-hidden="true">→</span></strong></button>
        <button type="button" class="b2b-hub-card tone-purple" data-open-finance><span class="b2b-hub-icon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="20" cy="12" rx="12" ry="5"/><path d="M8 12v8c0 3 5 5 12 5 4 0 8-.8 10-2.2M8 20v8c0 3 5 5 12 5 3 0 6-.5 8-1.5M8 28v7c0 3 5 5 12 5s12-2 12-5v-3"/><path d="M33 8v12m-5-6h10"/></svg></span><span class="eyebrow">FLEXIBLE CARE</span><h3>EMI &amp; Equipment Financing</h3><p>Easier procurement with flexible EMI options for hospitals and projects.</p><strong class="b2b-hub-action">Check EMI Plans <span aria-hidden="true">→</span></strong></button>
        <button type="button" class="b2b-hub-card tone-blue" data-open-amc><span class="b2b-hub-icon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 5h8l1 5 4 2 4-2 5 7-4 4v5l4 4-5 7-5-2-4 2-1 5h-8l-1-5-4-2-4 2-5-7 4-4v-5l-4-4 5-7 5 2 4-2z"/><circle cx="24" cy="23" r="7"/><path d="m21 23 2 2 4-5"/></svg></span><span class="eyebrow">LIFECYCLE CARE</span><h3>AMC / CMC &amp; Calibration</h3><p>Annual maintenance, comprehensive coverage and accurate calibration.</p><strong class="b2b-hub-action">Configure AMC <span aria-hidden="true">→</span></strong></button>
        <button type="button" class="b2b-hub-card tone-orange" data-open-tracker><span class="b2b-hub-icon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M24 42s14-13 14-24a14 14 0 1 0-28 0c0 11 14 24 14 24Z"/><circle cx="24" cy="18" r="5"/></svg></span><span class="eyebrow">ORDER &amp; TRACKING</span><h3>Track Enquiry &amp; 1-Click Reorder</h3><p>Check quotation status, track your orders and reorder key equipment.</p><strong class="b2b-hub-action">Open Tracker <span aria-hidden="true">→</span></strong></button>
      </div>`;
    target.after(hub);
  }
  function initProcurementBar() {
    if (document.body?.dataset?.page !== 'products') return;
    if (!$('.procurement-bar')) return;
    $('#global-pincode-input').value = savedPincode;
    if (evaluatePincode(savedPincode)?.ok) $('#global-pin-status').textContent = '✓ Location saved';
    const input = $('#global-search-input'), results = $('#global-search-results');
    function updateGlobalSearch() {
      const q = input.value.trim();
      if (!q) { results.hidden = true; return; }
      const matches = selectProducts(products, {query: q, category: 'all', department: 'all'});
      const top = matches.slice(0, 6);
      results.hidden = false;
      results.innerHTML = (top.length ? top.map(p => `<div class="pbar-item"><div class="pbar-thumb"><a href="${link(p)}">${photo(p)}</a></div><div class="pbar-meta"><strong><a href="${link(p)}">${e(p.name)}</a></strong><small>${e(category(p.category)?.name || '')} · ${e(p.subcategory)}</small></div><div class="pbar-item-actions"><button type="button" class="pbar-mini-btn" data-quickview="${p.id}">Quick view</button><button type="button" class="pbar-mini-btn" data-add="${p.id}">Add to cart</button></div></div>`).join('') + `<div style="padding:8px;text-align:center"><a class="text-link" href="products.html?q=${encodeURIComponent(q)}">View all ${matches.length} matching products →</a></div>` : `<div style="padding:12px;font-size:12px;color:var(--muted)">No exact match for “${e(q)}”. <a class="text-link" href="contact.html?subject=${encodeURIComponent(q)}">Enquire for custom sourcing →</a></div>`);
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
    toggle.setAttribute('aria-controls', 'swm-assistant-panel');
    toggle.setAttribute('aria-label', 'Open AI Procurement Assistant');
    toggle.innerHTML = `<img src="assets/ai-assistant-robot.png" width="547" height="836" alt="AI Procurement Assistant">`;
    const panel = document.createElement('aside');
    panel.id = 'swm-assistant-panel';
    panel.className = 'swm-assistant-panel';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Surgical Wholesale Mart Procurement Assistant');
    const categoryArt = {
      furniture: '<path d="M3 19V6m0 10h18v3M3 12h18v4m-16-4V9h5v3m3 0v-2h7a1 1 0 0 1 1 1v1"/>',
      equipment: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M7 11h3l2-4 2 7 2-3h2m-6 6v3m-4 0h8"/>',
      instruments: '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="m8 15 9-12m-1 12L7 3m5 7h.01"/>',
      mgps: '<ellipse cx="12" cy="14" rx="9" ry="5"/><path d="M12 5v4m0-5h2"/><circle cx="8" cy="14" r="1"/><circle cx="12" cy="15" r="1"/><circle cx="16" cy="14" r="1"/>',
      linen: '<path d="M4 9l5-4h10a2 2 0 0 1 1 4l-6 4H5a2 2 0 0 1-1-4Zm0 4a2 2 0 0 0 1 4h9l6-4a2 2 0 0 0 0-3M4 17a2 2 0 0 0 1 4h9l6-4a2 2 0 0 0 0-3"/>',
      consumables: '<path d="m7 20-3-7c-.5-1 .7-2 1.5-1l1.5 2-2-7c-.3-1 1.2-1.4 1.6-.4l2 5-1-7c-.1-1 1.5-1.2 1.7-.2l1.2 6 .3-6c.1-1 1.7-.9 1.7.2v7l2-3c.6-1 2-.2 1.5.8l-2.3 5.4c-.4 1.2-1.1 2.3-1.9 3l.3 2.2-5 .8Zm8-2 3 1 2-4 1-6c.1-1-1.3-1.1-1.5-.2l-1 3.2.2-6c0-1-1.5-1-1.6 0l-.4 4"/>'
    };
    panel.innerHTML = `
      <div class="swm-assistant-head">
        <div class="assistant-chat-heading"><img src="assets/ai-assistant-robot.png" width="547" height="836" alt=""><div><h2>Product Assistant</h2><p>Find products, catalogues and more</p></div></div>
        <button type="button" data-close-assistant aria-label="Close assistant"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
      </div>
      <div class="swm-assistant-body assistant-chat-log" role="log" aria-label="Conversation" tabindex="0">
        <div class="assistant-intro">
          <div class="assistant-intro-copy">
            <h3>Catalogue searches only</h3>
            <p>Enter a product name, model number, or related keyword. Specify the details you need.</p>
            <a href="contact.html">Contact Us <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M13 5h6v6m0-6-8 8m7 0v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></a>
          </div>
          <img src="assets/ai-assistant-robot.png" width="547" height="836" alt="">
        </div>
        <h3 class="assistant-category-heading"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="2" y="2" width="8" height="8" rx="2"/><rect x="14" y="2" width="8" height="8" rx="2"/><rect x="2" y="14" width="8" height="8" rx="2"/><rect x="14" y="14" width="8" height="8" rx="2"/></svg>Explore by Category</h3>
        <nav class="assistant-chat-categories assistant-category-grid" aria-label="Browse product categories">
          ${categories.map(item => `<a href="products.html?category=${encodeURIComponent(item.id)}"><span class="assistant-category-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${categoryArt[item.id] || ''}</svg></span><span>${e(item.name)}</span><svg class="assistant-category-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></a>`).join('')}
        </nav>
      </div>
      <form class="assistant-chat-form">
        <div class="assistant-chat-input-wrap">
          <svg class="assistant-chat-sparkle" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1.6 6.2 3.8 8.4 10 10-6.2 1.6-8.4 3.8-10 10-1.6-6.2-3.8-8.4-10-10 6.2-1.6 8.4-3.8 10-10Z"/><path d="M4 1v6M1 4h6m-3 13v6m-3-3h6" stroke="currentColor"/></svg>
          <label class="sr-only" for="assistant-chat-input">Enter a product name, model number, or related keyword</label>
          <input id="assistant-chat-input" type="text" autocomplete="off" maxlength="180" placeholder="Say hello or ask for help…">
          <button type="submit" aria-label="Send message"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2"/></svg></button>
        </div>
      </form>
    `;
    document.body.append(toggle, panel);
    const log = panel.querySelector('.assistant-chat-log');
    const field = panel.querySelector('#assistant-chat-input');
    const form = field.form;
    let currentProduct = byId(new URLSearchParams(location.search).get('id'));
    const replyCounts = new Map();
    const prompts = {
      empty: [
        'What can I help you find? Enter a product name, model number, or a page name.',
        'Try typing a keyword like “wheelchair” or a page name like “Contact Us”.',
        'I’m ready when you are. Tell me what product or page you need.'
      ],
      unmatched: [
        'I’m not sure which product you mean. Could you share its name, model number, or a keyword describing what you need?',
        'That wording didn’t match the catalogue. Try a shorter product name, or tell me what type of equipment you’re looking for.',
        'I haven’t found a suitable match yet. A model number or a category such as hospital furniture would help.'
      ],
      unrelated: [
        'I’m here to help with the storefront. What product or page would you like to find?',
        'Try asking me for a product, a category, or a page link such as Contact Us.',
        'I can look up catalogue information or point you to a page. For example, try “patient monitor” or “locations”.'
      ]
    };
    function nextPrompt(key) {
      const count = replyCounts.get(key) || 0;
      replyCounts.set(key, count + 1);
      return prompts[key][count % prompts[key].length];
    }
    function message(content, user = false) {
      const bubble = document.createElement('p');
      bubble.className = user ? 'assistant-message assistant-message-user' : 'assistant-message';
      if (user) bubble.textContent = content;
      else {
        const reply = content?.trim() || nextPrompt('unmatched');
        const count = replyCounts.get(reply) || 0;
        replyCounts.set(reply, count + 1);
        const followUps = ['Here’s what I found for that request:', 'Checking the same information again:', 'Here’s the result for that request:'];
        bubble.textContent = count ? `${followUps[(count - 1) % followUps.length]}\n${reply}` : reply;
      }
      log.appendChild(bubble);
      return bubble;
    }
    const destinations = [
      ['Home', 'index.html', /^(?:home|homepage|home page)$/],
      ['All Products', 'products.html', /^(?:(?:all )?products|catalogue|catalog|categories|product categories)$/],
      ['Search Products', 'search.html', /^(?:product search|search products|find products|search)$/],
      ['Cart', 'cart.html', /^(?:(?:my |shopping )?cart|basket)$/],
      ['Contact Us', 'contact.html', /^(?:contact(?: us| details)?|phone(?: number)?|email(?: address)?|talk to someone)$/],
      ['About Us', 'about.html', /^(?:about(?: us)?|company|company information)$/],
      ['Locations', 'locations.html', /^(?:locations?|address|branches|experience centres?)$/],
      ['Turnkey Projects', 'services.html', /^(?:services|turnkey(?: projects)?|hospital projects)$/],
      ['Support', 'support.html', /^(?:support|customer service|after sales)$/],
      ['Warranty', 'warranty.html', /^(?:warranty|warranty policy)$/],
      ['Book a Meeting', 'meeting.html', /^(?:meeting|book (?:a )?meeting)$/],
      ['Testimonials', 'testimonials.html', /^(?:testimonials|reviews|customer feedback)$/],
      ['Buying Guides', 'blog.html', /^(?:blog|buying guides?|guides)$/],
      ['Privacy Policy', 'privacy.html', /^(?:privacy(?: policy)?)$/],
      ['Terms and Conditions', 'terms.html', /^(?:terms(?: and conditions)?|conditions)$/],
      ['Site Map', 'sitemap.html', /^(?:site ?map|directory)$/],
      ['Checkout (coming soon)', 'checkout.html', /^checkout$/]
    ];
    function showLinks(text, links) {
      message(text);
      const navigation = document.createElement('nav');
      navigation.className = 'assistant-chat-categories';
      navigation.setAttribute('aria-label', 'Suggested pages');
      links.forEach(([label, url]) => {
        const link = document.createElement('a');
        link.href = url;
        link.textContent = label;
        navigation.appendChild(link);
      });
      log.appendChild(navigation);
      log.scrollTop = log.scrollHeight;
    }
    function respond(text) {
      const query = text.trim().slice(0, 180);
      if (!query) {
        message(nextPrompt('empty'));
        log.scrollTop = log.scrollHeight;
        return;
      }
      message(query, true);
      const normalized = root.SWM_SHOP_CORE.normalize(query);
      const target = normalized
        .replace(/^please\s+/, '')
        .replace(/^(?:(?:where|how) (?:can|do) i (?:find|see|open|view|get to|go to)|where (?:to find|is|are)|(?:take me|go) to|open|show me|find)\s+/, '')
        .replace(/^(?:(?:can|could|would) you )?(?:(?:give|send|provide|share)(?: me)? )?(?:(?:a|the) )?(?:links? for|links? to|links? of|links? for the|links? to the)\s+/, '')
        .replace(/^(?:the|your) /, '')
        .replace(/ (?:page|link)(?: please)?$/, '')
        .replace(/ please$/, '');
      if (/^(?:hi|hello|hey|hi there|hello there|hey there|good morning|good afternoon|good evening)$/.test(normalized)) {
        showLinks('Hello! What are you looking for? You can browse the catalogue, search for a product, or ask me for a page link.', destinations.slice(1, 3));
        return;
      }
      if (/^(?:(?:hi|hello|hey) )?how are you(?: doing)?$/.test(normalized)) {
        showLinks('I’m ready to help! You can ask me where to find a page or tell me what product you’re looking for.', destinations.slice(1, 3));
        return;
      }
      if (/^(?:thanks|thank you|thank you so much)$/.test(normalized)) {
        message('You’re welcome. Let me know if you need another product or page link.');
        log.scrollTop = log.scrollHeight;
        return;
      }
      if (/^(?:help|what can you do|where to find things|where can i find things|(?:show me |give me )?(?:links?(?: for| to) )?(?:all )?(?:web ?pages|site pages|pages)|site ?map|directory)$/.test(normalized)) {
        showLinks('Here are the pages you can open directly.', destinations);
        return;
      }
      const destination = destinations.find(([, , keywords]) => keywords.test(target));
      if (destination && !(normalized === 'warranty' && currentProduct)) {
        showLinks(`Here’s the link to ${destination[0]}.`, [destination]);
        return;
      }
      const mentions = destinations.flatMap(page => {
        const [, , keywords] = page;
        const wholeWords = new RegExp(`\\b(?:${keywords.source.slice(1, -1)})\\b`, 'g');
        return [...normalized.matchAll(wholeWords)].flatMap(match => {
          const end = match.index + match[0].length;
          if (match[0] === 'about' && !/^ (?:page|section)\b/.test(normalized.slice(end))) return [];
          if (match[0] === 'contact' && /\bnon $/.test(normalized.slice(0, match.index))) return [];
          return [{ page, start: match.index, end }];
        });
      });
      const pages = [...new Set(mentions.filter(mention =>
        !mentions.some(other => other.start <= mention.start && other.end >= mention.end &&
          other.end - other.start > mention.end - mention.start)
      ).map(mention => mention.page))];
      if (pages.length && !(normalized === 'warranty' && currentProduct)) {
        showLinks(pages.length === 1 ? `Here’s the link to ${pages[0][0]}.` : 'Here are the pages you mentioned.', pages);
        return;
      }
      const offTopic = /^(?:tell me (?:a joke|a story|about yourself)|who are you|what(?: s| is) the weather|what time is it)$/.test(normalized);
      const information = /\b(price|pricing|cost|stock|availability|available|delivery|shipping|checkout|payment|details?|specs?|specifications?|features?|dimensions?|size|weight|material|warranty)\b/.exec(normalized)?.[0] ||
        (/^how much\b/.test(normalized) ? 'price' : '');
      const productQuery = target.replace(/\b(show|find|looking|need|want|please|tell|provide|give|share|send|links?|about|where|can|what|how|much|does|do|is|its|it|in|on|of|i|me|you|have|a|an|for|the|some|price|pricing|cost|stock|availability|available|delivery|shipping|checkout|payment|details?|specs?|specifications?|features?|dimensions?|size|weight|material|warranty)\b/g, ' ').replace(/\s+/g, ' ').trim();
      const { direct, related } = productQuery ? findProductMatches(productQuery) : { direct: [], related: [] };
      const matches = direct.length ? direct : related;
      const named = productQuery && direct.find(product => [product.name, product.sourceName, product.id]
        .some(value => root.SWM_SHOP_CORE.normalize(value) === productQuery));
      const product = named || (matches.length === 1 ? matches[0] : !productQuery ? currentProduct : null);
      if (offTopic) {
        message(nextPrompt('unrelated'));
      } else if (information && /^(price|pricing|cost|stock|availability|available|delivery|shipping|checkout|payment)$/.test(information)) {
        if (product) currentProduct = product;
        const subject = product ? ` for ${product.name}` : '';
        const answer = /^(price|pricing|cost)$/.test(information)
          ? `Online pricing${subject} isn’t available yet.`
          : /^(stock|availability|available)$/.test(information)
            ? `Online stock information${subject} isn’t available yet.`
            : /^(delivery|shipping)$/.test(information)
              ? `Online delivery details${subject} aren’t available yet.`
              : 'Online checkout and payment aren’t available yet.';
        const reply = message(answer);
        const contact = document.createElement('a');
        contact.href = 'contact.html' + (product ? '?subject=' + encodeURIComponent(product.name) : '');
        contact.textContent = 'Contact us';
        reply.append(' ', contact);
      } else if (information) {
        if (!product) {
          message(matches.length ? 'Which product do you mean? Enter its full catalogue name for details.' : 'Which product would you like details for? Enter its name or model.');
        } else {
          currentProduct = product;
          const specs = (product.specifications || []).filter(spec => spec.label && spec.value);
          const specific = /^(dimensions?|size|weight|material|warranty)$/.test(information);
          const requested = /^dimensions?$/.test(information) ? /dimension|size|length|width|height/i : new RegExp(information, 'i');
          const list = specific ? specs.filter(spec => requested.test(spec.label)) : specs;
          const lines = list.map(spec => `${spec.label}: ${spec.value}`);
          const details = specific
            ? lines.join('\n') || `${information[0].toUpperCase() + information.slice(1)} information isn’t listed in the catalogue.`
            : /^(specs?|specifications?)$/.test(information)
              ? lines.join('\n') || 'Specifications aren’t listed in the catalogue.'
              : /^features?$/.test(information)
                ? product.features.join('\n') || 'Features aren’t listed in the catalogue.'
                : product.description || 'Product details aren’t listed in the catalogue.';
          message(`${product.name}\n${details}`);
        }
      } else {
        if (!matches.length) {
          message(nextPrompt('unmatched'));
        } else {
          if (product) currentProduct = product;
          message(direct.length ? 'Here are the closest catalogue matches.' : 'I didn’t find that exact product. Here are some related options.');
          const results = document.createElement('div');
          results.className = 'assistant-chat-results';
          results.innerHTML = matches.slice(0, 3).map(product => `<article><a href="${link(product)}">${e(product.name)}</a><button type="button" data-assistant-add="${e(product.id)}" aria-label="Add ${e(product.name)} to cart">Add to cart</button></article>`).join('');
          if (matches.length > 3) {
            const viewAll = document.createElement('a');
            viewAll.href = 'search.html?q=' + encodeURIComponent(productQuery);
            viewAll.textContent = 'See all matching products';
            results.appendChild(viewAll);
          }
          log.appendChild(results);
        }
      }
      log.scrollTop = log.scrollHeight;
    }
    form.addEventListener('submit', event => {
      event.preventDefault();
      respond(field.value);
      field.value = '';
    });
    log.addEventListener('click', event => {
      const add = event.target.closest('[data-assistant-add]');
      const product = add && byId(add.dataset.assistantAdd);
      if (!product) return;
      basket[product.id] = Math.min(9999, (basket[product.id] || 0) + 1);
      const stored = persistBasket();
      renderBasket();
      message(stored ? `Added ${product.name} to your cart.` : `Added ${product.name} for this visit. Browser storage is unavailable.`);
      log.scrollTop = log.scrollHeight;
    });
    toggle.addEventListener('click', event => {
      const open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open && event.detail === 0) field.focus();
    });
  }
  document.addEventListener('click',event=>{
    const assistPanel=$('.swm-assistant-panel'),assistToggle=$('.swm-assistant-toggle');
    if(assistPanel&&!assistPanel.hidden&&!assistPanel.contains(event.target)&&!assistToggle?.contains(event.target)){
      assistPanel.hidden=true;
      assistToggle?.setAttribute('aria-expanded','false');
    }
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
      toast(`Added ${setupSchedule.length} hospital setup equipment lines to cart.`,{href:'cart.html',label:'View cart →'});
      return;
    }
    if(button.hasAttribute('data-open-finance')){openFinanceModal();return;}
    if(button.hasAttribute('data-attach-finance-note')){
      const p=$('#emi-principal-out')?.textContent||'',m=$('#emi-monthly-out')?.textContent||'',t=$('#emi-tenure')?.value||'24',mode=$('#emi-mode')?.value||'Institutional Equipment Loan';
      const note=`Financing option requested: ${mode} | Est. Project Value: ${p} | Tenure: ${t} months (${m}).`;
      save(session,'swm-pending-note',note);
      closeModal();
      toast('Financing preference saved.',{href:'cart.html',label:'View cart →'});
      return;
    }
    if(button.hasAttribute('data-open-tracker')){openTrackerModal();return;}
    if(button.hasAttribute('data-run-tracker')){openTrackerModal();return;}
    if(button.dataset.reorderIdx!==undefined){
      const history=read(local,'swm-enquiry-history',[])||[];
      const entry=history[Number(button.dataset.reorderIdx)];
      if(entry&&Array.isArray(entry.items)){
        entry.items.forEach(({id,qty})=>{if(byId(id))basket[id]=Math.min(9999,(basket[id]||0)+Number(qty||1));});
        persistBasket();renderBasket();closeModal();
        toast(`Reloaded ${entry.items.length} products from ${entry.ref} into your cart.`,{href:'cart.html',label:'View cart →'});
      }
      return;
    }
    if(button.hasAttribute('data-open-amc')){openAmcModal();return;}
    if(button.dataset.selectAmc){
      const plan=button.dataset.selectAmc;
      save(session,'swm-pending-note',`Service package requested: ${plan}.`);
      closeModal();
      toast(`${plan} saved to your preferences.`,{href:'cart.html',label:'View cart →'});
      return;
    }
    if(button.hasAttribute('data-open-buyer-profile')){openBuyerProfileModal();return;}
    if(button.dataset.subcatChip!==undefined&&state){
      state.subcategory=button.dataset.subcatChip;limit=24;renderCatalog();return;
    }
    if(button.dataset.assistDept){location.href='products.html?department='+encodeURIComponent(button.dataset.assistDept);return;}
    if(button.dataset.quickview){openQuickView(button.dataset.quickview);return;}
    if(button.hasAttribute('data-open-bulk-rfq')){openBulkModal();return;}
    if(button.hasAttribute('data-bulk-sample')){const ta=$('#bulk-list-input');if(ta){ta.value='5 x Five-Function Electric ICU Bed\n4 x Seven-Parameter Patient Monitor\n2 x Semi-Electric C-Arm OT Table\n6 x Patient Wheelchair\n3 x Suction Machine';}return;}
    if(button.hasAttribute('data-run-bulk-match')){renderBulkMatches();return;}
    if(button.hasAttribute('data-add-bulk-matches')){
      if(!bulkRows.length||bulkMatches.length!==bulkRows.length){toast('Review and resolve every product match first.');return;}
      $$('[data-bulk-qty-idx]').forEach(inp=>{const idx=Number(inp.dataset.bulkQtyIdx);if(bulkMatches[idx])bulkMatches[idx].qty=Math.min(9999,Math.max(1,parseInt(inp.value,10)||1));});
      bulkMatches.forEach(({product,qty})=>{basket[product.id]=Math.min(9999,(basket[product.id]||0)+qty);});
      persistBasket();renderBasket();closeModal();
      toast(`Added ${bulkMatches.length} product lines to your cart.`,{href:'cart.html',label:'View cart →'});
      return;
    }
    if(button.dataset.viewMode&&state){state.view=button.dataset.viewMode;renderCatalog(false);return;}
    if(button.hasAttribute('data-check-global-pin')){
      const val=$('#global-pincode-input')?.value.trim()||'';
      const res=evaluatePincode(val);
      if(!res){toast('Enter a 6-digit pincode or UAE to check serviceability.');return;}
      if(res.ok){savedPincode=val;save(local,'swm-pincode',val);const st=$('#global-pin-status');if(st)st.textContent=`✓ Location saved`;toast(`Location saved. ${res.timeline}`);}
      else toast(res.message);
      return;
    }
    if(button.hasAttribute('data-check-detail-pin')){
      const val=$('#detail-pincode-input')?.value.trim()||'';
      const res=evaluatePincode(val),out=$('#detail-pin-result');
      if(!res||!out)return;
      if(res.ok){savedPincode=val;save(local,'swm-pincode',val);out.innerHTML=`Location saved · Delivery coverage: <strong>${e(res.hub)}</strong> · ${e(res.timeline)}`;}
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
      const savedToCart = persistBasket();
      if (button.hasAttribute('data-buy-now') && savedToCart) {
        location.href = 'cart.html';
        return;
      }
      toast(`Added ${qty} × ${byId(id).name} to your cart.`,{href:'cart.html',label:'View cart →'});
      return;
    }
    if(button.dataset.addQv){
      const id=button.dataset.addQv;if(!byId(id))return;
      const qty=Math.min(9999,Math.max(1,parseInt($('#qv-qty-input')?.value||'1',10)||1));
      basket[id]=Math.min(9999,(basket[id]||0)+qty);
      persistBasket();renderBasket();closeModal();
      toast(`Added ${qty} × ${byId(id).name} to your cart.`,{href:'cart.html',label:'View cart →'});
      return;
    }
    if(button.dataset.specSheet){const p=byId(button.dataset.specSheet);if(p)downloadSpecSheet(p);return;}
    if(button.hasAttribute('data-export-csv')){exportBasketCSV();return;}
    if(button.hasAttribute('data-print-basket')){window.print();return;}
    if(button.hasAttribute('data-clear-basket')){basket={};persistBasket();renderBasket();toast('Cart cleared.');return;}
    if(button.hasAttribute('data-clear-recent')){recent=[];save(local,'swm-recent',[]);renderDetail();renderCatalog(false);renderBasket();toast('Recently viewed history cleared.');return;}
    if(button.hasAttribute('data-jump-compare')){
      if(!compare.length){toast('Select "Compare" on up to 3 product cards to compare specifications side by side.');return;}
      comparison();
      $('#comparison')?.scrollIntoView({behavior:'smooth',block:'nearest'});
      return;
    }
    if(button.hasAttribute('data-add-all-compare')){
      compare.forEach(id=>{if(byId(id))basket[id]=Math.min(9999,(basket[id]||0)+1);});
      persistBasket();renderBasket();toast(`Added ${compare.length} compared products to cart.`,{href:'cart.html',label:'View cart →'});
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
    if(button.dataset.add){const id=button.dataset.add;if(!byId(id))return;basket[id]=Math.min(9999,(basket[id]||0)+1);const stored=persistBasket();toast(stored?'Added to your cart.':'Added for this visit. Browser storage is unavailable.',{href:'cart.html',label:'View cart →'});renderBasket();}
    if(button.dataset.save){const id=button.dataset.save;saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];save(local,'swm-saved',saved);sync();if(state){state.saved=saved;if(state.savedOnly)renderCatalog(false);}toast(saved.includes(id)?'Product saved.':'Product removed from saved items.',saved.includes(id)&&!$('#catalog-grid')?{href:'products.html?saved=1',label:'View saved →'}:null);}
    if(button.dataset.remove){delete basket[button.dataset.remove];persistBasket();renderBasket();toast('Product removed from your cart.');}
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
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeModal();const ap=$('.swm-assistant-panel'),at=$('.swm-assistant-toggle');if(ap&&!ap.hidden){ap.hidden=true;at?.setAttribute('aria-expanded','false');}if(menu){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation');$('#store-nav').classList.remove('is-open');}}});
  $$('[data-phone-product]').forEach(categoryLink => {
    const product = byId(categoryLink.dataset.phoneProduct);
    if (product) categoryLink.insertAdjacentHTML('afterend', card(product));
  });
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
    const autoRotate=true;
    const phoneLayout=window.matchMedia('(max-width: 700px)');
    let cycleWidth=0,cardStep=0,viewportWidth=0,position=0,lastWritten=0,frame=0,previousTime=0;
    let focused=false,pointerActive=false,hovered=false,visible=true,temporarilyPaused=false,resumeTimer;
    let dragStartX=0,dragStartScroll=0,didDrag=false;

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
      const sectionVisible=phoneLayout.matches
        ? featuredSection.getBoundingClientRect().bottom>0&&featuredSection.getBoundingClientRect().top<window.innerHeight
        : visible;
      if(autoRotate&&cycleWidth&&!reducedMotion.matches&&!focused&&!pointerActive&&!hovered&&!temporarilyPaused&&sectionVisible&&!document.hidden){
        normalizePosition();
        frame=requestAnimationFrame(tick);
      }
    }
    function tick(time){
      const elapsed=previousTime?Math.min(time-previousTime,64):0;
      previousTime=time;
      position+=elapsed*(phoneLayout.matches?30:36)/1000;
      writePosition(position);
      normalizePosition();
      frame=requestAnimationFrame(tick);
    }
    function pauseBriefly(duration=1200){
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
      if(controls)controls.hidden=false;
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
    marquee.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovered=true;syncPlayback();}},{passive:true});
    marquee.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'){hovered=false;syncPlayback();}},{passive:true});    function moveProducts(direction){
      pauseBriefly(2500);
      normalizePosition();
      const count=Math.min(originals.length,Math.max(1,Math.floor(viewportWidth/cardStep)));
      marquee.scrollBy({left:direction*cardStep*count,behavior:reducedMotion.matches?'auto':'smooth'});
    }

    previous?.addEventListener('click',()=>moveProducts(-1));
    next?.addEventListener('click',()=>moveProducts(1));
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
    marquee.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse'&&event.button!==0)return;
      pointerActive=true;
      didDrag=false;
      dragStartX=event.clientX;
      dragStartScroll=marquee.scrollLeft;
      marquee.classList.add('is-dragging');
      window.clearTimeout(resumeTimer);
      temporarilyPaused=false;
      syncPlayback();
    },{passive:true});
    window.addEventListener('pointermove',event=>{
      if(!pointerActive||event.pointerType!=='mouse')return;
      const dx=event.clientX-dragStartX;
      if(Math.abs(dx)>4)didDrag=true;
      if(didDrag){
        writePosition(dragStartScroll-dx);
        normalizePosition();
      }
    },{passive:true});
    marquee.addEventListener('click',event=>{
      if(didDrag){
        event.preventDefault();
        event.stopPropagation();
        didDrag=false;
      }
    },true);
    function releasePointer(){
      if(!pointerActive)return;
      pointerActive=false;
      marquee.classList.remove('is-dragging');
      position=marquee.scrollLeft;
      lastWritten=marquee.scrollLeft;
      normalizePosition();
      temporarilyPaused=false;
      window.clearTimeout(resumeTimer);
      syncPlayback();
    }
    window.addEventListener('pointerup',releasePointer,{passive:true});
    window.addEventListener('pointercancel',releasePointer,{passive:true});
    marquee.addEventListener('wheel',()=>pauseBriefly(600),{passive:true});
    marquee.addEventListener('scroll',()=>{
      if(Math.abs(marquee.scrollLeft-lastWritten)<=1)return;
      position=marquee.scrollLeft;
      lastWritten=marquee.scrollLeft;
      normalizePosition();
      if(!pointerActive)pauseBriefly(600);
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
  const IMAGE_BOX_SELECTOR = '.product-visual,.detail-image,.basket-photo,.category-visual,.procurement-visual,.editorial-image,.company-gallery figure,.quickview-visual,.pbar-thumb';
  document.addEventListener('error', event => {
    const img = event.target;
    if (img.tagName !== 'IMG' || !img.closest(IMAGE_BOX_SELECTOR)) return;
    const fallback = document.createElement('div');
    fallback.className = 'photo-request';
    fallback.innerHTML = '<span>Product photograph<br>available on enquiry</span>';
    img.replaceWith(fallback);
  }, true);
  function initHeaderScrollState() {
    const header = $('.store-header');
    if (!header) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      header.classList.toggle('is-scrolled', window.scrollY > 16);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, {passive:true});
  }
  function initHeaderProductsDropdown() {
    const productsLink = $('.store-header .primary-links > a[href="products.html"]');
    if (!productsLink || $('.header-products-popover')) return;
    const popover = document.createElement('div');
    popover.className = 'header-products-popover';
    popover.hidden = true;
    popover.setAttribute('role', 'region');
    popover.setAttribute('aria-label', 'Product categories');
    productsLink.setAttribute('aria-haspopup', 'true');
    productsLink.setAttribute('aria-expanded', 'false');
    popover.classList.add('hpp-reference');
    popover.innerHTML = `<div class="hpp-clean-head"><div class="hpp-heading"><span class="hpp-heading-icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="3" y="3" width="10" height="10" rx="2"/><rect x="19" y="3" width="10" height="10" rx="2"/><rect x="3" y="19" width="10" height="10" rx="2"/><rect x="19" y="19" width="10" height="10" rx="2"/></svg></span><h2>Explore by Category</h2></div><a class="hpp-view-all-btn" href="products.html"><span>View All ${products.length} Products</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></a></div><div class="hpp-cat-cards">${categories.map(c => {
      const count = products.filter(p => p.category === c.id).length;
      return `<a class="hpp-cat-card" href="products.html?category=${encodeURIComponent(c.id)}"><div class="hpp-cat-thumb"><img src="${e(c.image)}" alt="" loading="lazy" width="300" height="210"></div><div class="hpp-cat-info"><strong>${e(c.name)}</strong><small>${count} Products</small></div></a>`;
    }).join('')}</div>`;    const headerEl = $('.store-header') || document.body;
    headerEl.appendChild(popover);
    let hideTimer = 0;
    const showPopover = () => {
      if (window.matchMedia('(max-width: 767px)').matches) return;
      clearTimeout(hideTimer);
      popover.hidden = false;
      productsLink.setAttribute('aria-expanded', 'true');
    };
    const scheduleHide = () => {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        popover.hidden = true;
        productsLink.setAttribute('aria-expanded', 'false');
      }, 180);
    };
    productsLink.addEventListener('mouseenter', showPopover);
    productsLink.addEventListener('focus', showPopover);
    productsLink.addEventListener('keydown', ev => { if(ev.key === 'Escape'){ popover.hidden = true; productsLink.setAttribute('aria-expanded', 'false'); productsLink.focus(); } });
    popover.addEventListener('keydown', ev => { if(ev.key === 'Escape'){ popover.hidden = true; productsLink.setAttribute('aria-expanded', 'false'); productsLink.focus(); } });
    productsLink.addEventListener('mouseleave', scheduleHide);
    popover.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    popover.addEventListener('mouseleave', scheduleHide);
    document.addEventListener('click', ev => {
      if (!popover.hidden && !popover.contains(ev.target) && !productsLink.contains(ev.target)) {
        popover.hidden = true;
        productsLink.setAttribute('aria-expanded', 'false');
      }
    });
  }
  initProcurementBar();initHeaderScrollState();initHeaderProductsDropdown();initHomeB2BHub();initAssistant();  // A shared frontend interface keeps drawers, local profiles and native cards in sync.
  root.SWM_STORE = {
    products,categories,departments,escapeHTML,selectProducts,card,
    getBasket:()=>({...basket}), getSaved:()=>[...saved], getCompare:()=>[...compare],
    getState:()=>state?{...state}:null,
    addMany(items){
      for(const item of items){if(!byId(item.id))continue;const qty=Math.floor(Number(item.qty));if(!Number.isFinite(qty)||qty<1)continue;basket[item.id]=Math.min(9999,(basket[item.id]||0)+qty);}
      persistBasket();renderBasket();toast('Cart updated.',{href:'cart.html',label:'View cart →'});
    },
    quantity(id,value){if(!byId(id))return;const qty=Number(value);if(!Number.isInteger(qty)||qty<0||qty>9999)return;if(qty===0)delete basket[id];else basket[id]=qty;persistBasket();renderBasket();},
    toggleSaved(id){if(!byId(id))return;saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];save(local,'swm-saved',saved);if(state){state.saved=saved;if(state.savedOnly)renderCatalog(false);}sync();},
    toggleCompare(id){if(!byId(id))return false;if(compare.includes(id))compare=compare.filter(x=>x!==id);else if(compare.length<3)compare.push(id);else{toast('Compare up to three products.');return false;}comparison();$$('[data-compare]').forEach(el=>el.checked=compare.includes(el.dataset.compare));sync();return true;},
    clearCompare(){compare=[];comparison();$$('[data-compare]').forEach(el=>el.checked=false);sync();},
    filter(next){if(!state){const q=new URLSearchParams();if(next.category)q.set('category',next.category);if(next.query)q.set('q',next.query);location.href='products.html?'+q;return;}Object.assign(state,next);state.saved=saved;limit=24;if($('#catalog-query'))$('#catalog-query').value=state.query;if($('#sort-products'))$('#sort-products').value=state.sort;renderCatalog();},
    openProfile:openBuyerProfileModal,openHistory:openTrackerModal,
    message:toast
  };
  renderDetail();initCatalog();initProductSearch();renderBasket();initForms();renderReview();if(compare.length&&!$('#product-search-query'))comparison();sync();
  root.addEventListener('storage',event=>{if(event.key==='swm-basket'){basket=cleanBasket(read(local,'swm-basket',{}),products);sync();renderBasket();}if(event.key==='swm-saved'){const value=read(local,'swm-saved',[]);saved=Array.isArray(value)?value.filter(id=>byId(id)):[];sync();if(state){state.saved=saved;renderCatalog(false);}}});
})(typeof window !== 'undefined' ? window : globalThis);
