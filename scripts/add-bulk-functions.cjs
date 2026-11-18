const fs=require('fs');let s=fs.readFileSync('js/store.js','utf8');const insert=s.indexOf('  const CLINICAL_SPECIALTIES =');if(insert<0)throw Error('No bulk insertion point');
const code=`  let bulkMatches=[],bulkRows=[];
  function updateBulkMatches(){
    bulkMatches=bulkRows.filter(r=>r.valid&&r.selected&&byId(r.selected)).map(r=>({product:byId(r.selected),qty:r.qty,query:r.query}));
    const add=$('#bulk-add-all-btn');if(add){add.hidden=!bulkRows.length;add.disabled=!bulkRows.length||bulkMatches.length!==bulkRows.length;add.textContent='Add '+bulkMatches.length+' matched product lines';}
  }
  function renderBulkMatches(){
    bulkRows=root.SWM_SHOP_CORE.parseQuickOrder($('#bulk-list-input')?.value,products);
    const out=$('#bulk-match-output');if(!out)return;
    out.innerHTML=bulkRows.length?bulkRows.map((r,i)=>\`<div class="shop-bulk-row"><div><strong>\${e(r.query)}</strong><small>Quantity: \${e(r.qty)} · \${e(r.error||'Matched')}</small></div><select data-bulk-choice="\${i}" aria-label="Choose product for \${e(r.query)}"><option value="">Choose a product</option>\${r.candidates.map(id=>\`<option value="\${e(id)}" \${r.selected===id?'selected':''}>\${e(byId(id).name)} [\${e(id)}]</option>\`).join('')}</select></div>\`).join(''):'<p>Enter at least one product and quantity.</p>';
    updateBulkMatches();
  }
  function openBulkModal(){
    closeModal();const backdrop=document.createElement('div');backdrop.id='swm-modal-backdrop';backdrop.className='swm-modal-backdrop';
    backdrop.innerHTML=\`<div class="swm-modal" role="dialog" aria-modal="true" aria-label="Bulk quotation list"><button type="button" class="swm-modal-close" data-close-modal aria-label="Close">×</button><span class="eyebrow">BULK QUOTATION</span><h2>Build a quote from your equipment list</h2><p>Enter one product per line, for example: 5 x Five-Function Electric ICU Bed. CSV files can use Product,Quantity columns. Review every match before adding it.</p><label class="field-label">Upload CSV or text file<input id="bulk-file-input" type="file" accept=".csv,.txt,text/csv,text/plain"></label><label class="field-label">Product list<textarea id="bulk-list-input" rows="8" maxlength="100000" placeholder="5 x Five-Function Electric ICU Bed"></textarea></label><button type="button" class="button" data-run-bulk-match>Find matching products</button><p id="bulk-file-message" role="status"></p><div id="bulk-match-output"></div><button type="button" class="button" id="bulk-add-all-btn" data-add-bulk-matches hidden>Add matched products</button></div>\`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('change',async event=>{
      if(event.target.dataset.bulkChoice!==undefined){const i=Number(event.target.dataset.bulkChoice);if(bulkRows[i]&&bulkRows[i].candidates.includes(event.target.value))bulkRows[i].selected=event.target.value;else if(bulkRows[i])bulkRows[i].selected='';updateBulkMatches();}
      if(event.target.id==='bulk-file-input'){const file=event.target.files[0];if(!file)return;const message=$('#bulk-file-message');if(file.size>1000000||! /\\.(csv|txt)$/i.test(file.name)){message.textContent='Choose a CSV or text file smaller than 1 MB.';return;}try{$('#bulk-list-input').value=await file.text();message.textContent='File read locally. Review the matched products below.';renderBulkMatches();}catch{message.textContent='This file could not be read.';}}
    });
  }
`;
s=s.slice(0,insert)+code+s.slice(insert);
const a=s.indexOf("    if(button.hasAttribute('data-run-bulk-match')){"),b=s.indexOf("    if(button.hasAttribute('data-add-bulk-matches')){",a);if(a<0||b<0)throw Error('No bulk handler');s=s.slice(0,a)+"    if(button.hasAttribute('data-run-bulk-match')){renderBulkMatches();return;}\n"+s.slice(b);
s=s.replace("if(button.hasAttribute('data-add-bulk-matches')){", "if(button.hasAttribute('data-add-bulk-matches')){\n      if(!bulkRows.length||bulkMatches.length!==bulkRows.length){toast('Review and resolve every product match first.');return;}");
s=s.replace('    message:toast','    openProfile:openBuyerProfileModal,openHistory:openTrackerModal,\n    message:toast');
fs.writeFileSync('js/store.js',s);
for(const f of fs.readdirSync('.').filter(f=>f.endsWith('.html'))){let h=fs.readFileSync(f,'utf8');if(!h.includes('js/shopping-core.js'))h=h.replace(/<script defer src="js\/store.js"><\/script>/,'<script defer src="js/shopping-core.js"></script><script defer src="js/store.js"></script>');fs.writeFileSync(f,h);}
let py=fs.readFileSync('scripts/build-storefront.py','utf8');py=py.replace('<script defer src="js/store.js"></script>','<script defer src="js/shopping-core.js"></script><script defer src="js/store.js"></script>');fs.writeFileSync('scripts/build-storefront.py',py);
console.log('Added reviewed bulk CSV matching and shared shopping core on every page.');
