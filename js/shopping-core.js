(function(root){
 'use strict';
 const normalize=value=>String(value??'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 function csvFields(line){const fields=[];let value='',quote=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quote&&line[i+1]==='"'){value+='"';i++;}else quote=!quote;}else if((c===','||c==='\t')&&!quote){fields.push(value.trim());value='';}else value+=c;}fields.push(value.trim());return fields;}
 function parseQuickOrder(text,products){
  return String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,500).filter(s=>!/^(product|product name|name|sku)[,\t]\s*(quantity|qty)$/i.test(s)).map(line=>{
   let query=line,qty=1;const fields=csvFields(line);const prefix=line.match(/^(\d+(?:\.\d+)?)\s*[x×]\s+(.+)$/i);
   if(prefix){qty=Number(prefix[1]);query=prefix[2];}else if(fields.length>1&&/^-?\d+(?:\.\d+)?$/.test(fields.at(-1))){qty=Number(fields.pop());query=fields.join(', ');}else if(fields.length>1&&/^-?\d+(?:\.\d+)?$/.test(fields[0])){qty=Number(fields.shift());query=fields.join(', ');}
   const key=normalize(query);const valid=Number.isInteger(qty)&&qty>=1&&qty<=9999&&key.length>0;
   let candidates=valid?products.filter(p=>normalize(p.id)===key||normalize(p.name)===key||normalize(p.sourceName)===key):[];
   if(!candidates.length&&valid){const tokens=key.split(' ');candidates=products.filter(p=>{const hay=normalize(p.name+' '+p.subcategory);return tokens.every(t=>hay.includes(t));});}
   const selected=candidates.length===1?candidates[0].id:'';
   return {line,query,qty,valid,candidates:candidates.slice(0,20).map(p=>p.id),selected,error:!valid?'Use a whole quantity between 1 and 9999.':!candidates.length?'No matching product.':candidates.length>1?'Choose the required product.':''};
  });
 }
 function validateAddress(a){const required=['name','line1','city','postcode'];if(required.some(k=>!String(a?.[k]||'').trim()))return 'Enter the recipient, address, city and postcode.';if(!/^[1-9]\d{5}$/.test(String(a.postcode)))return 'Enter a six-digit Indian pincode.';if(a.phone&&!/^[+0-9 ()-]{7,22}$/.test(a.phone))return 'Enter a valid phone number.';return '';}
 function cleanAddresses(value){if(!Array.isArray(value))return [];const ids=new Set();return value.filter(a=>a&&typeof a==='object'&&typeof a.id==='string'&&!ids.has(a.id)&&!validateAddress(a)&&ids.add(a.id)).slice(0,20).map(a=>Object.fromEntries(['id','name','line1','line2','city','postcode','phone','label'].map(k=>[k,String(a[k]||'').slice(0,250)])));}
 const api={normalize,csvFields,parseQuickOrder,validateAddress,cleanAddresses};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.SWM_SHOP_CORE=api;
})(typeof window!=='undefined'?window:globalThis);
