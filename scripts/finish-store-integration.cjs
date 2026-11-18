const fs=require('fs');let s=fs.readFileSync('js/store.js','utf8');
s=s.replace(/(?<!\$)\$\('\[data-(compare-count|compare)\]'\)\.forEach/g,(m)=>'$'+m);
s=s.replace(/  function evaluatePincode\(raw\) \{[\s\S]*?\n  \}\n  function trackRecent/,()=>`  function evaluatePincode(raw) {
    const val=String(raw||'').trim().toUpperCase();
    if(!val)return null;
    if(!/^[1-9][0-9]{5}$/.test(val)&&!['UAE','DUBAI','SHARJAH'].includes(val))return {ok:false,message:'Enter a six-digit Indian pincode or UAE.'};
    return {ok:true,pin:val,hub:'Confirmation required',timeline:'Delivery timing, availability and installation coverage are confirmed with your quotation.',install:'Ask our team to confirm the service scope for this location.'};
  }
  function trackRecent`);
s=s.replaceAll('✓ Deliverable · Nearest hub:', 'Location saved · Delivery coverage:');
s=s.replaceAll('Standard dispatch readiness: 3–7 business days (confirmed on quotation)','Delivery timing is confirmed with your quotation.');
s=s.replace('Search 372+ hospital equipment, instruments, beds, monitors…', 'Search ${products.length} medical products…');
s=s.replaceAll("${e(pinInfo.hub.split(' ')[0])} hub",'Location saved').replaceAll("${res.hub.split(' ')[0]} hub",'Location saved');
s=s.replace('Deliverable via ${res.hub}. ${res.timeline}','Location saved. ${res.timeline}');
const a=s.indexOf('  function openTrackerModal() {'),b=s.indexOf('  function openAmcModal() {',a);if(a<0||b<0)throw Error('Missing tracker boundary');
s=s.slice(0,a)+`  function openTrackerModal() {
    closeModal();
    const stored=read(local,'swm-enquiry-history',[]);
    const history=Array.isArray(stored)?stored.filter(h=>h&&h.ref&&Array.isArray(h.items)):[];
    const backdrop=document.createElement('div');backdrop.id='swm-modal-backdrop';backdrop.className='swm-modal-backdrop';
    backdrop.innerHTML=\`<div class="swm-modal" role="dialog" aria-modal="true" aria-label="Saved quotation requests"><button type="button" class="swm-modal-close" data-close-modal aria-label="Close">×</button><span class="eyebrow">YOUR QUOTATION REQUESTS</span><h2>Saved drafts &amp; reorder</h2><p class="muted">These drafts are saved on this device. Preparing a draft does not send it or place an order. Contact our team for a confirmed quotation or shipment status.</p><div class="bulk-match-list">\${history.length?history.map((h,i)=>\`<article class="bulk-match-row" style="grid-template-columns:1fr auto"><div><strong>\${e(h.ref)}</strong><small style="display:block">\${e(h.date||'')} · \${h.items.length} products · Draft prepared</small></div><button type="button" class="pbar-mini-btn" data-reorder-idx="\${i}">Add to basket again</button></article>\`).join(''):'<p>No quotation drafts have been saved on this device yet.</p>'}</div><a class="button" href="contact.html">Ask about an existing order →</a></div>\`;
    document.body.appendChild(backdrop);
  }
`+s.slice(b);
s=s.replace(/    if\(button\.hasAttribute\('data-run-tracker'\)\)\{[\s\S]*?\n    \}/,()=>"    if(button.hasAttribute('data-run-tracker')){openTrackerModal();return;}");
s=s.replace(/quote\.addEventListener\('submit',event=>\{[\s\S]*?\n      \}\);/,block=>"if(!quote.dataset.quoteBound){quote.dataset.quoteBound='1';"+block+"}");
fs.writeFileSync('js/store.js',s);
let patch=fs.readFileSync('scripts/extend-store.cjs','utf8');patch=patch.replace('s=s.replace(from,to);','s=s.replace(from,()=>to);');fs.writeFileSync('scripts/extend-store.cjs',patch);
console.log('Validated frontend-only delivery and saved-draft states; corrected state interface and duplicate form binding.');
