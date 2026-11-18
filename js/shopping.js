(function(root){
 'use strict';
 const store=root.SWM_STORE,model=root.SWM_SHOP_CORE;
 if(!store||!model)return;
 const $=s=>document.querySelector(s),all=s=>Array.from(document.querySelectorAll(s)),e=store.escapeHTML;
 const byId=id=>store.products.find(p=>p.id===id);
 const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
 const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{store.message('Browser storage is unavailable. Your changes cannot be kept after this visit.');return false;}};
 let dialog,lastFocus,screen='',removedItem=null,activeSearch=-1;
 const field=(name,label,value='',required=false,type='text')=>`<label>${label}<input name="${name}" type="${type}" value="${e(value)}" maxlength="250" ${required?'required':''}></label>`;
 function close(){if(dialog?.open)dialog.close();screen='';lastFocus?.focus?.();}
 function open(kind,title,html){
  $('#swm-modal-backdrop')?.remove();
  if(!dialog?.contains(document.activeElement))lastFocus=document.activeElement;
  if(!dialog){dialog=document.createElement('dialog');dialog.className='shop-dialog';dialog.id='shop-dialog';dialog.setAttribute('aria-labelledby','shop-dialog-title');document.body.append(dialog);dialog.addEventListener('cancel',ev=>{ev.preventDefault();close();});dialog.addEventListener('click',ev=>{if(ev.target===dialog)close();});}
  screen=kind;dialog.innerHTML=`<header class="shop-dialog-head"><h2 id="shop-dialog-title">${e(title)}</h2><button type="button" class="shop-close" data-shop-action="close" aria-label="Close dialog">×</button></header><div class="shop-dialog-body">${html}</div>`;
  if(!dialog.open)dialog.showModal();
 }
 function account(){
  const p=read('swm-buyer-profile',{}),addresses=model.cleanAddresses(read('swm-addresses',[]));
  open('account','Your purchasing account',`<p class="muted">Your profile, addresses and quotation drafts are saved on this device.</p><div class="shop-account-summary"><strong>${e(p.name||'Set up your buyer profile')}</strong><span>${e(p.organisation||'')}</span><span>${e(p.email||'')}</span></div><div class="shop-action-grid"><button class="button" data-shop-action="profile">Edit buyer profile</button><button class="button button-outline" data-shop-action="addresses">Address book (${addresses.length})</button><a class="button button-outline" href="products.html?saved=1">Saved products (${store.getSaved().length})</a><button class="button button-outline" data-shop-action="history">Quotation drafts &amp; reorder</button><a class="button button-outline" href="cart.html">Open quote basket</a><a class="button button-outline" href="support.html">Service &amp; support</a></div><button type="button" class="text-button" data-shop-action="clear-profile">Remove saved buyer profile</button>`);
 }
 function addressBook(){
  const entries=model.cleanAddresses(read('swm-addresses',[])),selected=read('swm-default-address','');
  open('addresses','Delivery address book',`<p class="muted">Save up to 20 Indian delivery addresses for faster quotation requests. Delivery coverage is confirmed by our team.</p><button type="button" class="button" data-shop-action="new-address">Add an address</button><div class="shop-address-list">${entries.length?entries.map(a=>`<article class="shop-address"><h3>${e(a.label||a.name)} ${selected===a.id?'<small>Default</small>':''}</h3><p>${e(a.name)}<br>${e(a.line1)}${a.line2?'<br>'+e(a.line2):''}<br>${e(a.city)} — ${e(a.postcode)}${a.phone?'<br>'+e(a.phone):''}</p><div class="shop-inline"><button class="text-button" data-shop-edit="${e(a.id)}">Edit</button><button class="text-button" data-shop-use="${e(a.id)}">Use this address</button><button class="text-button" data-shop-delete="${e(a.id)}">Remove</button></div></article>`).join(''):'<p>No delivery addresses saved yet.</p>'}</div>`);
 }
 function editAddress(id){
  const entries=model.cleanAddresses(read('swm-addresses',[]));
  if(!id&&entries.length>=20){store.message('You can save up to 20 addresses.');return;}
  const a=entries.find(a=>a.id===id)||{};
  open('edit-address',id?'Edit delivery address':'Add delivery address',`<form id="shop-address-form" class="shop-form" data-edit-id="${e(id||'')}">${field('label','Address label',a.label)}${field('name','Recipient name',a.name,true)}${field('line1','Address line 1',a.line1,true)}${field('line2','Address line 2',a.line2)}<div class="form-row">${field('city','City',a.city,true)}${field('postcode','Indian pincode',a.postcode,true)}</div>${field('phone','Phone number',a.phone,false,'tel')}<p id="shop-address-error" role="alert"></p><div class="shop-inline"><button class="button" type="submit">Save address</button><button class="text-button" type="button" data-shop-action="addresses">Cancel</button></div></form>`);
 }
 function useAddress(id,showBook=true){
  const a=model.cleanAddresses(read('swm-addresses',[])).find(a=>a.id===id);if(!a)return;
  if(!write('swm-default-address',id))return;
  const profile=read('swm-buyer-profile',{});write('swm-buyer-profile',{...profile,city:a.city,postcode:a.postcode,phone:a.phone||profile.phone});write('swm-pincode',a.postcode);
  const form=$('#quote-form');if(form){for(const k of ['city','postcode','phone'])if(form.elements[k]&&a[k])form.elements[k].value=a[k];if(form.elements.deliveryAddress)form.elements.deliveryAddress.value=[a.name,a.line1,a.line2,a.city,a.postcode].filter(Boolean).join(', ');}
  store.message('Delivery address selected. Delivery timing will be confirmed with your quotation.');if(showBook)addressBook();else close();
 }
 function basket(){
  const entries=Object.entries(store.getBasket()).filter(([id])=>byId(id));
  open('basket','Your quote basket',entries.length?`<div class="shop-basket-list">${entries.map(([id,qty])=>{const p=byId(id);return `<article class="shop-basket-row"><a href="product.html?id=${encodeURIComponent(id)}"><img src="${e(p.image)}" alt="${e(p.name)}" width="100" height="90"></a><div><h3><a href="product.html?id=${encodeURIComponent(id)}">${e(p.name)}</a></h3><small>Price on request</small><div class="shop-inline"><button type="button" class="text-button" data-shop-remove="${e(id)}">Remove</button><button type="button" class="text-button" data-shop-save="${e(id)}">${store.getSaved().includes(id)?'Unsave':'Save for later'}</button></div></div><label class="shop-qty">Quantity<input type="number" min="1" max="9999" step="1" value="${qty}" data-shop-quantity="${e(id)}"></label></article>`;}).join('')}</div><p>${entries.length} products · ${entries.reduce((n,[,q])=>n+q,0)} total units · Prices confirmed on quotation</p>${removedItem?'<button class="text-button" type="button" data-shop-action="undo">Undo last removal</button>':''}<div class="shop-inline"><a class="button" href="checkout.html">Review quotation request →</a><a class="button button-outline" href="cart.html">Open full basket</a></div>`:`<p>Your quote basket is empty.</p>${removedItem?'<button class="text-button" data-shop-action="undo">Undo last removal</button>':''}<a class="button" href="products.html">Explore products</a>`);
 }
 function enhance(){
  const tools=$('.pbar-tools');
  if(tools&&!tools.dataset.shopReady){
   tools.dataset.shopReady='1';
   const profile=tools.querySelector('[data-open-buyer-profile]');if(profile){profile.removeAttribute('data-open-buyer-profile');profile.dataset.shopAction='account';profile.textContent='My account';}
   const cart=tools.querySelector('a[href="cart.html"]');if(cart){const b=document.createElement('button');b.type='button';b.className='pbar-pill';b.dataset.shopAction='basket';b.innerHTML=cart.innerHTML;cart.replaceWith(b);}
   tools.insertAdjacentHTML('afterbegin','<a class="pbar-pill" href="products.html?new=1&sort=newest">New products</a>');
  }
  const controls=$('.catalog-extra-controls');if(controls&&!$('#shop-new-filter'))controls.insertAdjacentHTML('beforeend','<label class="shop-check"><input id="shop-new-filter" type="checkbox"> New product additions only</label>');
  const toggle=$('#shop-new-filter');if(toggle)toggle.checked=Boolean(store.getState()?.newOnly);
  const form=$('#quote-form');
  if(form&&!form.querySelector('#shop-address-select')&&form.elements.name){
   const saved=model.cleanAddresses(read('swm-addresses',[])),selected=read('swm-default-address','');
   form.insertAdjacentHTML('afterbegin',`<div class="shop-checkout-address"><label>Saved delivery address<select id="shop-address-select"><option value="">Choose an address</option>${saved.map(a=>`<option value="${e(a.id)}" ${selected===a.id?'selected':''}>${e(a.label||a.name)} — ${e(a.city)}</option>`).join('')}</select></label><button type="button" class="text-button" data-shop-action="addresses">Manage addresses</button><label>Delivery address (optional)<textarea name="deliveryAddress" rows="2" maxlength="1000"></textarea></label></div>`);
   const def=saved.find(a=>a.id===selected);if(def&&form.elements.deliveryAddress)form.elements.deliveryAddress.value=[def.name,def.line1,def.line2,def.city,def.postcode].filter(Boolean).join(', ');
  }
  const p=byId(new URLSearchParams(location.search).get('id')),copy=$('.detail-copy');
  if(p&&copy&&!$('#shop-product-tools')){
   const notes=read('swm-product-notes',{});
   copy.insertAdjacentHTML('beforeend',`<section id="shop-product-tools"><div class="shop-inline"><button type="button" class="text-button" data-shop-share="${e(p.id)}">Share product</button><button type="button" class="text-button" data-shop-compare="${e(p.id)}">Add / remove comparison</button></div><details><summary>Private purchasing note</summary><form id="shop-product-note"><label>Notes saved on this device<textarea name="note" rows="3" maxlength="1000">${e(notes[p.id]||'')}</textarea></label><button class="text-button" type="submit">Save note</button><p role="status" id="shop-note-status"></p></form></details></section>`);
  }
 }
 document.addEventListener('click',async event=>{
  const b=event.target.closest('button');if(!b)return;
  const action=b.dataset.shopAction;
  if(action){if(action==='close')close();if(action==='account')account();if(action==='addresses')addressBook();if(action==='new-address')editAddress();if(action==='basket')basket();if(action==='profile'){close();store.openProfile();}if(action==='history'){close();store.openHistory();}if(action==='clear-profile'){if(write('swm-buyer-profile',{}))account();}if(action==='undo'&&removedItem){store.addMany([removedItem]);removedItem=null;basket();}}
  if(b.dataset.shopEdit)editAddress(b.dataset.shopEdit);
  if(b.dataset.shopUse)useAddress(b.dataset.shopUse);
  if(b.dataset.shopDelete){const entries=model.cleanAddresses(read('swm-addresses',[])).filter(a=>a.id!==b.dataset.shopDelete);if(write('swm-addresses',entries))addressBook();}
  if(b.dataset.shopRemove){const id=b.dataset.shopRemove,qty=store.getBasket()[id];removedItem={id,qty};store.quantity(id,0);basket();}
  if(b.dataset.shopSave){store.toggleSaved(b.dataset.shopSave);basket();}
  if(b.dataset.shopCompare)store.toggleCompare(b.dataset.shopCompare);
  if(b.dataset.shopShare){const p=byId(b.dataset.shopShare);if(!p)return;const url=new URL('product.html?id='+encodeURIComponent(p.id),location.href).href;try{if(navigator.share)await navigator.share({title:p.name,url});else{await navigator.clipboard.writeText(url);store.message('Product link copied.');}}catch(error){if(error.name!=='AbortError')open('share','Share product',`<label>Copy this product link<input readonly value="${e(url)}"></label>`);}}
 });
 document.addEventListener('change',event=>{
  const input=event.target;
  if(input.id==='shop-new-filter')store.filter({newOnly:input.checked,sort:input.checked?'newest':store.getState()?.sort||'featured'});
  if(input.dataset.shopQuantity){const qty=Number(input.value);if(!Number.isInteger(qty)||qty<1||qty>9999){input.value=store.getBasket()[input.dataset.shopQuantity]||1;store.message('Choose a whole quantity between 1 and 9999.');return;}store.quantity(input.dataset.shopQuantity,qty);basket();}
  if(input.id==='shop-address-select'&&input.value)useAddress(input.value,false);
 });
 document.addEventListener('submit',event=>{
  const form=event.target;
  if(form.id==='shop-address-form'){
   event.preventDefault();const data=Object.fromEntries(new FormData(form));const error=model.validateAddress(data);if(error){$('#shop-address-error').textContent=error;return;}
   const entries=model.cleanAddresses(read('swm-addresses',[])),id=form.dataset.editId||'address-'+Date.now().toString(36);const entry={...data,id};const next=entries.some(a=>a.id===id)?entries.map(a=>a.id===id?entry:a):[...entries,entry];
   if(write('swm-addresses',next)){if(next.length===1)write('swm-default-address',id);addressBook();}
  }
  if(form.id==='shop-product-note'){event.preventDefault();const id=new URLSearchParams(location.search).get('id');if(!byId(id))return;const notes=read('swm-product-notes',{});const value=String(new FormData(form).get('note')||'').slice(0,1000);if(value)notes[id]=value;else delete notes[id];if(write('swm-product-notes',notes))$('#shop-note-status').textContent='Note saved on this device.';}
 });
 // Existing autocomplete gains keyboard navigation without changing its appearance.
 const search=$('#global-search-input'),results=$('#global-search-results');
 if(search&&results){
  search.setAttribute('role','combobox');search.setAttribute('aria-autocomplete','list');search.setAttribute('aria-controls','global-search-results');
  const options=()=>Array.from(results.querySelectorAll('.pbar-meta strong a'));
  search.addEventListener('input',()=>{activeSearch=-1;search.setAttribute('aria-expanded',String(!results.hidden));});
  search.addEventListener('keydown',event=>{const links=options();if(['ArrowDown','ArrowUp'].includes(event.key)&&links.length){event.preventDefault();activeSearch=(activeSearch+(event.key==='ArrowDown'?1:-1)+links.length)%links.length;links.forEach((a,i)=>{a.id='shop-suggestion-'+i;a.classList.toggle('shop-suggestion-active',i===activeSearch);});search.setAttribute('aria-activedescendant',links[activeSearch].id);links[activeSearch].scrollIntoView({block:'nearest'});}if(event.key==='Enter'){const query=search.value.trim();if(query){const recent=read('swm-search-history',[]);write('swm-search-history',[query,...(Array.isArray(recent)?recent:[]).filter(x=>x!==query)].slice(0,8));}if(activeSearch>=0&&links[activeSearch]){event.preventDefault();event.stopImmediatePropagation();location.href=links[activeSearch].href;}}if(event.key==='Escape'){results.hidden=true;activeSearch=-1;search.setAttribute('aria-expanded','false');}},true);
  search.addEventListener('focus',()=>{if(search.value.trim())return;const history=read('swm-search-history',[]);if(!Array.isArray(history)||!history.length)return;results.innerHTML='<div class="shop-recent-searches"><strong>Recent searches</strong>'+history.map(q=>`<a href="products.html?q=${encodeURIComponent(q)}">${e(q)}</a>`).join('')+'</div>';results.hidden=false;search.setAttribute('aria-expanded','true');});
 }
 // Trap keyboard focus in the existing quick-view / procurement modals and restore it on close.
 let nativeModal=null,nativeOpener=null,oldOverflow='';
 function trackModal(){const next=$('#swm-modal-backdrop');if(next!==nativeModal){if(next){nativeOpener=document.activeElement;oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';next.querySelector('[role="dialog"]')?.setAttribute('tabindex','-1');queueMicrotask(()=>next.querySelector('button,input,select,textarea,a[href]')?.focus());}else{document.body.style.overflow=oldOverflow;nativeOpener?.focus?.();}nativeModal=next;}enhance();}
 let pending=false;new MutationObserver(()=>{if(!pending){pending=true;queueMicrotask(()=>{pending=false;trackModal();});}}).observe(document.body,{childList:true,subtree:true});
 document.addEventListener('keydown',event=>{if(event.key!=='Tab'||!nativeModal)return;const focusable=Array.from(nativeModal.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea,select,a[href]')).filter(el=>!el.hidden&&el.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}});
 document.addEventListener('swm:change',()=>{const count=Object.values(store.getBasket()).reduce((a,b)=>a+b,0);all('[data-cart-count]').forEach(n=>n.textContent=count);});
 const top=document.createElement('button');top.type='button';top.className='shop-back-top';top.textContent='↑';top.setAttribute('aria-label','Back to top');top.hidden=true;document.body.append(top);top.addEventListener('click',()=>root.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));root.addEventListener('scroll',()=>top.hidden=root.scrollY<650,{passive:true});
 enhance();
 root.SWM_FRONTEND={account,addressBook,basket};
})(window);
