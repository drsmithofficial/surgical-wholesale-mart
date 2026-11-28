(() => {
  const { products, departments } = window.SWM_CATALOG;
  const element = id => document.getElementById(id);
  const option = (label, value = label) => new Option(label, value);
  const email = (subject, body) => 'mailto:info@surgicalwholesalemart.in?' +
    'subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  const showDraft = (link, subject, body) => {
    link.href = email(subject, body);
    link.hidden = false;
  };

  const plan = element('hospital-plan-form');
  if (plan) {
    const fields = plan.elements;
    const extraDepartments = [
      { id: 'labour', name: 'Labour room' }, { id: 'private', name: 'Private rooms' },
      { id: 'radiology', name: 'Radiology' }, { id: 'pathology', name: 'Pathology' },
      { id: 'cssd', name: 'CSSD' }, { id: 'mgps', name: 'Medical gas pipeline systems' }
    ];
    fields.department.replaceChildren(...[...departments, ...extraDepartments].map(d => option(d.name, d.id)));
    const refreshProducts = () => {
      const department = fields.department.value;
      const matches = products.filter(product => product.department === department || product.category === department);
      fields.product.replaceChildren(option('Choose a product or enter a requirement below', ''),
        ...matches.map(product => option(product.name, product.id)));
    };
    fields.department.addEventListener('change', refreshProducts);
    refreshProducts();
    const lines = [];
    const overview = element('hospital-plan-lines');
    const download = element('download-hospital-plan');
    const share = element('share-hospital-plan');
    const report = () => [
      'Hospital equipment checklist', 'Planned capacity: ' + fields.beds.value + ' beds', '',
      ...lines.map(line => line.department + ' | ' + line.product + ' | ' + line.brand + ' | Qty ' + line.quantity),
      '', 'Please confirm pricing, availability and delivery before issuing a quotation or pro forma invoice.'
    ].join('\n');
    function render() {
      const list = document.createElement('ul');
      lines.forEach((line, index) => {
        const item = document.createElement('li');
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'text-button';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', 'Remove ' + line.product);
        remove.addEventListener('click', () => { lines.splice(index, 1); render(); });
        item.append(line.department + ' · ' + line.product + ' · ' + line.brand + ' × ' + line.quantity + ' ', remove);
        list.append(item);
      });
      overview.replaceChildren(list);
      download.disabled = !lines.length;
      share.href = lines.length ? email('Hospital equipment quotation', report()) :
        'contact.html?subject=Hospital+equipment+quote';
    }
    fields.beds.addEventListener('change', render);
    fields.product.addEventListener('change', () => fields.custom.setCustomValidity(''));
    fields.custom.addEventListener('input', () => fields.custom.setCustomValidity(''));
    plan.addEventListener('submit', event => {
      event.preventDefault();
      const selected = fields.product.value && fields.product.selectedOptions[0].text;
      const custom = fields.custom.value.trim();
      if (!selected && !custom) {
        fields.custom.setCustomValidity('Choose a catalogue product or enter your requirement.');
        fields.custom.reportValidity();
        return;
      }
      const product = [selected, custom].filter(Boolean).join(' — ');
      lines.push({ department: fields.department.selectedOptions[0].text, product,
        brand: fields.brand.value, quantity: fields.quantity.value });
      fields.custom.value = '';
      render();
    });
    download.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([report()], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'hospital-equipment-checklist.txt';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  const dealer = element('dealer-access-form');
  if (dealer) {
    fetch('locations.html').then(response => {
      if (!response.ok) throw new Error('Office list unavailable');
      return response.text();
    }).then(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      for (const office of doc.querySelectorAll('[id^="location-"] h2, [id^="location-"] h3')) {
        dealer.elements.office.add(option(office.textContent.trim()));
      }
    }).catch(() => {
      element('dealer-access-status').textContent = 'Could not load regional offices. Select General enquiries to continue.';
    });
    dealer.elements.office.add(option('General enquiries'));
    dealer.addEventListener('submit', event => {
      event.preventDefault();
      const { gstin, office, interest } = Object.fromEntries(new FormData(dealer));
      showDraft(element('dealer-access-draft'), 'Dealer access request',
        ['GSTIN: ' + gstin.toUpperCase(), 'Office: ' + office, 'Request: ' + interest].join('\n'));
      element('dealer-access-status').textContent = 'Your draft is ready. Send it to request verification from our team.';
    });
    document.querySelectorAll('[data-partner]').forEach(form => {
      form.addEventListener('submit', event => {
        event.preventDefault();
        const { business, email: contact, region } = Object.fromEntries(new FormData(form));
        showDraft(form.querySelector('a'), form.dataset.partner + ' enquiry',
          ['Business: ' + business, 'Work email: ' + contact, 'City and state: ' + region].join('\n'));
      });
    });
  }

  const portfolio = element('brand-portfolio');
  const brand = new URLSearchParams(location.search).get('brand');
  if (portfolio && brand && [...document.querySelectorAll('.portal-tile')].some(link =>
    new URL(link.href).searchParams.get('brand') === brand)) {
    const title = document.createElement('h2');
    title.textContent = brand;
    const matches = products.filter(product => [product.brand, product.sourceName, product.name].some(value =>
      value?.toLowerCase() === brand.toLowerCase() ||
      value?.toLowerCase().startsWith(brand.toLowerCase() + ' ')));
    const list = document.createElement('ul');
    for (const product of matches) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.textContent = product.name;
      link.href = 'product.html?' + new URLSearchParams({ id: product.id });
      item.append(link);
      list.append(item);
    }
    const enquiry = document.createElement('a');
    enquiry.textContent = 'Ask about availability';
    enquiry.href = 'contact.html?' + new URLSearchParams({ subject: brand + ' product availability' });
    portfolio.append(title, matches.length ? list : 'No products are currently listed under this brand. ', enquiry);
    portfolio.hidden = false;
  }
})();
