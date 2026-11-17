// Apply reviewed local product photos without regenerating hand-edited page layouts.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const catalog = read('data/catalog.json');
const byId = new Map(catalog.products.map(p => [p.id, p]));
const reviewed = fs.readdirSync(path.join(root, 'data')).filter(n => /^new-.*-photos\.json$/.test(n));
let added = 0;
for (const filename of reviewed) {
  for (const photo of read('data/' + filename)) {
    const p = byId.get(photo.id);
    if (!p || !photo.sourcePage || !photo.notes || !['exact', 'representative'].includes(photo.kind)) throw Error('Invalid review: ' + photo.id);
    if (!fs.existsSync(path.join(root, photo.url))) throw Error('Missing photo: ' + photo.url);
    if (!p.image) added++;
    Object.assign(p, { image: photo.url, imageSource: photo.sourcePage, imageOriginal: photo.sourceImage || photo.downloadUrl || photo.url, imageKind: photo.kind, imageReview: photo.notes, imageReviewed: '2026-11-17' });
    delete p.photoStatus;
  }
}
const existingPath = path.join(root, 'data/existing-photo-downloads.json');
if (fs.existsSync(existingPath)) {
  for (const entry of read('data/existing-photo-downloads.json')) {
    if (!entry.ok || entry.rejected) continue;
    for (const id of entry.ids) {
      const p = byId.get(id);
      if (!p || !/^https:/.test(p.image)) continue;
      Object.assign(p, { image: entry.local, imageOriginal: entry.url });
    }
  }
}
fs.writeFileSync(path.join(root, 'data/catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'js/catalog.js'), 'window.SWM_CATALOG = ' + JSON.stringify(catalog) + ';\n');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
for (const file of fs.readdirSync(root).filter(n => n.endsWith('.html'))) {
  let html = fs.readFileSync(path.join(root, file), 'utf8');
  html = html.replace(/<article\b[^>]*class="product-card"[^>]*data-product="([^"]+)"[^>]*>[\s\S]*?<\/article>/g, (article, id) => {
    const p = byId.get(id);
    if (!p?.image) return article;
    let updated = article.replace(/(<div class="product-visual">\s*<a\b[^>]*>)[\s\S]*?(<\/a>)/, '$1' + `<img src="${escape(p.image)}" alt="${escape(p.name)}" loading="lazy" width="600" height="420">` + '$2');
    updated = updated.replace(/<span class="photo-caption">[\s\S]*?<\/span>/g, '');
    if (p.imageKind === 'representative') updated = updated.replace(/(<\/a>)/, '$1<span class="photo-caption">Reference image</span>');
    return updated;
  });
  fs.writeFileSync(path.join(root, file), html);
}
const report = { added, withPhotos: catalog.products.filter(p => p.image).length, withoutPhotos: catalog.products.filter(p => !p.image).length, total: catalog.products.length, localPhotos: catalog.products.filter(p => p.image && !/^https?:/.test(p.image)).length, ownerSitePhotos: catalog.products.filter(p => /drsmith\.co\.in/.test(p.imageSource || p.imageOriginal || '')).length };
fs.writeFileSync(path.join(root, 'data/image-coverage.json'), JSON.stringify(report, null, 2) + '\n');
console.log(report);
