"""Homepage and procurement portal templates."""
from html import escape as e

BRANDS = {
    'ICU & Critical Care': 'Dr. Smith|Comen|Mindray|Edan|BPL Medical Technologies|Biolight|Philips Healthcare|Contec|GE HealthCare|Masimo|Dräger|Nidek Medical|Nihon Kohden|Trivitron Healthcare|Schiller|Noccarc|Skanray|AgVa Healthcare|Allied Medical|RMS|Hamilton Medical|AKAS Medical|Getinge|Fresenius Kabi|Medtronic|B. Braun|Air Liquide Medical Systems|ZOLL Medical|ResMed|Stryker – LIFEPAK|Fisher & Paykel Healthcare|Aeonmed|Spacelabs Healthcare|Baxter',
    'OT Equipment': 'Dr. Smith|STERIS|Olympus|Dr. Mach|Stryker|Merivaara|KARL STORZ|Mediland|Richard Wolf|Magnatek|Smith+Nephew|Palakkad Surgical Industries|Fujifilm|Staan|PENTAX Medical|Cognate|Arthrex|Technomed|CONMED|Shalya|Ethicon – Johnson & Johnson|Alan Electronic Systems|Medtronic|B. Braun – Aesculap|ERBE|Boston Scientific|KLS Martin|ZEISS|Getinge – Maquet|Leica Microsystems|Dräger|SCHÖLLY|GE HealthCare|Ottomed|Mindray|Matrix|BPL Medical Technologies|Hospedia|Allied Medical|Skanray',
    'Consumables': 'Romsons|Global Medikit|Polymed|Nulife|BD|Kanam Latex|B. Braun|HLL Lifecare|HMD – Dispovan|ConvaTec|Terumo|Coloplast|Nipro|Hollister|Ethicon|Mölnlycke|Healthium Medtech|Intersurgical|Meril|Flexicare|Lotus Surgicals|Teleflex – Rüsch|3M / Solventum|Portex|Smith+Nephew|JMS|Ansell|Medline|Cardinal Health|Datt Mediproducts|Medtronic – Covidien|Mediplus|Fresenius Kabi|Newtech Medical Devices|Baxter|Swann-Morton|G Surgiwear|Futura Surgicare|Sterimed|Sceptre Medical',
}
AUDIENCE = '''<section class="section portal-audience" aria-label="Choose your purchasing pathway">
<a href="doctor.html"><span>Hospital planning</span><strong>I am a Doctor</strong><small>Plan your facility and build an equipment list.</small></a>
<a href="dealer.html"><span>Trade purchasing</span><strong>I am a Dealer</strong><small>Explore regional offers and partnership options.</small></a>
</section>'''

def links(items, parameter):
    return '<div class="portal-grid">' + ''.join(
        f'<a class="portal-tile" href="products.html?{parameter}={e(item["id"])}">{e(item["name"])}</a>'
        for item in items
    ) + '</div>'

def homepage_tail(categories, departments):
    return f'''<section class="section portal-section" id="shop-categories"><h2>Shop by Product Category</h2>{links(categories, 'category')}</section>
<section class="section portal-section" id="shop-departments"><h2>Shop by Hospital Department</h2>{links(departments, 'department')}</section>
<section class="section portal-section" id="brands"><h2>Brands Associated With Us</h2><p>Proposed brand range for review. Confirm product availability with our team.</p>
<div class="portal-brand-track" tabindex="0" aria-label="Featured brands">{''.join(brand_link(name) for name in ['Dr. Smith', 'Mindray', 'BPL Medical Technologies', 'Philips Healthcare', 'GE HealthCare', 'Dräger', 'Olympus', 'Stryker', 'KARL STORZ', 'Romsons', 'Polymed', 'BD'])}</div>
<a class="button button-outline" href="brands.html">View All Brands</a></section>'''

def brand_link(name):
    from urllib.parse import urlencode
    return f'<a class="portal-tile" href="brands.html?{urlencode({"brand": name})}">{e(name)}</a>'

def doctor_portal(departments):
    return f'''<div class="section portal-page">
<header class="portal-hero"><p class="eyebrow">Doctor portal</p><h1>Plan and equip your hospital</h1><p>Build a department-wise equipment list and request a turnkey proposal.</p>
<div class="portal-actions"><a class="button" href="#hospital-plan">Create Your Hospital List Now</a><a class="button button-outline" href="contact.html?subject=Turnkey+hospital+quotation">Get Your Quote Now</a><a href="#doctor-qa">View Q&amp;A</a></div></header>
<section id="hospital-plan" class="portal-section"><h2>Facility planning by bed capacity</h2>
<form id="hospital-plan-form"><div class="portal-grid"><label>Hospital capacity<select name="beds">{''.join(f'<option value="{n}">{n} beds</option>' for n in (25,50,75,100))}</select></label><label>Department<select name="department"></select></label><label>Catalogue product<select name="product"></select></label><label>Brand preference<select name="brand"><option>Any brand</option>{''.join(f'<option>{e(name)}</option>' for name in sorted({name for group in BRANDS.values() for name in group.split('|')}, key=str.casefold))}</select></label><label>Quantity<input name="quantity" type="number" min="1" max="9999" value="1" required></label></div>
<label>Additional equipment or specifications<input name="custom" maxlength="200" placeholder="For equipment not listed in the catalogue"></label><div class="portal-actions"><button class="button" type="submit">Add to checklist</button></div></form>
<div id="hospital-plan-lines" aria-live="polite"></div><div class="portal-actions"><button class="button button-outline" type="button" id="download-hospital-plan" disabled>Download checklist</button><a id="share-hospital-plan" href="contact.html?subject=Hospital+equipment+quote">Request a quotation or pro forma invoice</a></div></section>
<section class="portal-section" id="rfq"><h2>RFQ &amp; BOQ matcher</h2><p>Match a pasted item list to products, or attach your Excel or PDF requirements to an email draft for our team.</p><div class="portal-actions"><button type="button" class="button" data-open-bulk-rfq>Match a product list</button><a href="mailto:info@surgicalwholesalemart.in?subject=Hospital%20RFQ%20%2F%20BOQ&amp;body=Please%20review%20the%20attached%20equipment%20requirements.">Open email draft</a></div></section>
<section class="portal-section"><h2>Shop by Specialty &amp; Department</h2>{links(departments, 'department')}</section>
<section class="portal-section"><h2>Financing and equipment service</h2><div class="portal-actions"><button type="button" class="button button-outline" data-open-finance>Explore EMI &amp; Equipment Financing</button><button type="button" class="button button-outline" data-open-amc>Explore AMC &amp; CMC Services</button></div></section>
<section class="portal-section" id="doctor-qa"><h2>Hospital planning Q&amp;A</h2><details><summary>How do I get a quotation?</summary><p>Build and download your checklist, then attach it to your enquiry. Our team confirms pricing and availability before issuing a quotation or pro forma invoice.</p></details><details><summary>Can I request products outside the catalogue?</summary><p>Yes. Add their names or specifications to your checklist or include them in your RFQ.</p></details></section></div>'''

def dealer_portal():
    return '''<div class="section portal-page"><header class="portal-hero" data-palette="trade"><p class="eyebrow">Dealer portal</p><h1>Buy and partner with us</h1><p>Request trade access for regional offers and office inventory.</p></header>
<section class="portal-section"><h2>Request dealer access</h2><p>Our team verifies your GST registration before granting access to trade pricing and inventory.</p>
<form id="dealer-access-form"><div class="portal-grid"><label>GSTIN<input name="gstin" required minlength="15" maxlength="15" pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][A-Za-z0-9][Zz][A-Za-z0-9]" autocapitalize="characters" placeholder="15-character GSTIN"></label><label>Regional office<select name="office" required><option value="">Select an office</option></select></label><label>What do you need?<select name="interest"><option>Regional dealer offers</option><option>Office inventory availability</option><option>Dealer account access</option></select></label></div><div class="portal-actions"><button class="button" type="submit">Prepare access enquiry</button></div><p id="dealer-access-status" role="status"></p><a id="dealer-access-draft" hidden>Open email draft</a></form></section>
<section class="portal-section"><h2>Business opportunities</h2><div class="portal-grid">
<form class="portal-tile" data-partner="Dr. Smith distributorship"><h3>Dr. Smith Distributor</h3><label>Business name<input required name="business" maxlength="120"></label><label>Work email<input required name="email" type="email" maxlength="120"></label><label>City and state<input required name="region" maxlength="120"></label><button class="button" type="submit">Prepare distributor enquiry</button><a hidden>Open email draft</a></form>
<form class="portal-tile" data-partner="Surgical Wholesale Mart franchise"><h3>Surgical Wholesale Mart Franchise Partner</h3><label>Business name<input required name="business" maxlength="120"></label><label>Work email<input required name="email" type="email" maxlength="120"></label><label>City and state<input required name="region" maxlength="120"></label><button class="button" type="submit">Prepare franchise enquiry</button><a hidden>Open email draft</a></form></div></section></div>'''

def brand_directory():
    return f'''<div class="section portal-page"><header class="portal-hero"><p class="eyebrow">Brand directory</p><h1>Brands by equipment category</h1><p>Explore the proposed brand range for ICU, operating theatres and clinical consumables.</p></header>
<section class="portal-section" id="brand-portfolio" hidden></section>
{''.join(f'<section class="portal-section"><h2>{e(group)}</h2><div class="portal-grid">{"".join(brand_link(name) for name in names.split("|"))}</div></section>' for group, names in BRANDS.items())}</div>'''
