# Surgical Wholesale Mart storefront

A responsive, buildless HTML/CSS/JavaScript medical procurement storefront. Open `index.html` using a local web server.

## Features

- Six editable hero banners with distinct transitions, a four-second interval and synchronized header colors.
- Six product families, search, department filters, sorting, saved products and comparison of up to three items.
- A persistent quote basket with quantities and removal; validated enquiry preparation; email, WhatsApp and text-file handoff.
- 618 catalogue listings, including 60 reviewed Medikabazaar additions (10 per product family), alongside the existing Dr. Smith and Surgical Wholesale Mart range. See `data/catalog-provenance.md` for import coverage and image restrictions.
- Shared responsive layout across storefront, company profile, locations, support, meeting requests, warranty and policy pages.

## Edit and regenerate

Edit `data/catalog.json` for products/categories, `data/hero.html` for banner copy, `css/hero.css` for hero styling, and `css/storefront.css` for the storefront design. Run:

```sh
python3 scripts/build-storefront.py
```

This regenerates the storefront and company-information pages and `js/catalog.js`. No package installation or framework build is required. `js/store.js` handles commerce interactions; `js/hero.js` handles hero transitions.

## Product Assistant

The robot menu uses the same-origin `/api/product-assistant` endpoint. On Vercel the function uses AI Gateway with the deployment's `VERCEL_OIDC_TOKEN`. A server-only `AI_GATEWAY_API_KEY` can also authenticate to the gateway, or `GEMINI_API_KEY` can use Gemini directly. The default model is `gemini-3.1-flash-lite`, with an optional `GEMINI_MODEL` override. For local testing, run `node scripts/preview.cjs` with either server-side API key. If the endpoint or model is unavailable, the robot uses the local catalogue assistant.

The model selects records from the published catalogue and site index. The server returns only facts and links from those records. It has no browsing tools or access to orders, carts, customer records, or private company systems. Recent questions are held in memory until the menu closes. Run the normal storefront generator when publishing catalogue or company changes. If editing published HTML directly, run `python3 scripts/build_site_content.py` to refresh the website index before publishing. There is no separate model training or data upload.

## Verify

```sh
node --test tests/*.test.cjs
python3 tests/check-static.py
```

## Current boundaries

Prices and stock are confirmed by quotation; no payment gateway or order backend is configured. Forms prepare a reviewable draft and do not claim to send automatically. Contact drafts use session storage; basket/saved IDs use local storage. Imported items without a verified unbranded photo show “Product photograph available on enquiry.”

The temporary SWM site's index was available via cached web retrieval, but direct access returned HTTP 403 and browser origin approval was declined. Products that appear only inside individual category pages may be missing. A full owner-provided export or renewed authorized access is needed to verify complete catalog coverage and remaining photos.

Company details are maintained in `data/company.json` and `scripts/company_content.py`, sourced from the published Dr. Smith company pages. Product-brand and procurement-company roles are kept distinct. Full addresses, regional/export phone numbers, leadership and commercial-support information are included; an additional legacy Punjab service-centre record is marked unconfirmed.

## Product photos

Product images are stored locally; original internet URLs and review notes are retained as provenance. The image review and source are stored with each product; representative range photos are labelled in the UI. Run `python3 scripts/apply-reviewed-images.py` to apply new reviewed manifests, then regenerate. See `data/image-coverage.json` for the latest count and `data/image-research-*-unresolved.json` for research gaps. Images with unverified branding or the wrong model must not be used just to fill a card.

## Photo refresh — 17 November 2026

Product photos are now stored locally under `assets/products/researched/` after visual checks for visible branding, watermarks, quality and product type. Dr. Smith is the preferred source; current source indexes are under `data/drsmith-live-*.json`. Individual reviewed assignments and source pages are recorded in `data/new-*-photos.json`. Representative range images remain labelled and do not confirm exact models or configurations.

After updating reviewed photo manifests, run `node scripts/apply-local-photos.cjs`. This synchronizes the catalogue data, browser catalogue and existing product cards across every page without regenerating hand-edited layouts. See `data/image-coverage.json` for current coverage.

## Medikabazaar expansion and frontend shopping — 18 November 2026

The 60 additions use generic names and source-backed descriptions/specifications, with original product titles and source URLs retained for provenance. Each selected local photo was visually checked for branding and watermarks. Reference images remain labelled. The 558-item baseline is preserved in `data/medikabazaar-import-baseline.json`; `data/medikabazaar-import-report.json` records the per-category additions. Reapply with `node scripts/import-medikabazaar.cjs`; use `--check` for validation only.

Frontend shopping includes sitewide autocomplete, categories/specialties, product-type and department filters, newest additions, grid/list views, quick view, saved products, persistent three-item comparison, quantity selection, quick basket with removal/undo, local CSV/text bulk matching with ambiguity review, specification downloads, quote exports, local buyer profiles/address book, draft history/reordering, product sharing/private notes and keyboard-accessible modals. Existing planner and estimate tools remain in the storefront. All controls inherit the existing theme and branding.

No account authentication, OTP delivery, payment, stock verification, shipment tracking or order backend was added. Buyer details, addresses and histories stay on the device; contact methods open reviewable drafts. Delivery dates and service coverage require confirmation.

Dependency-free checks: `node --test tests/store.test.cjs tests/shopping-core.test.cjs`. DOM integration checks: install jsdom separately, set `SWM_DOM_TEST_MODULE` to its module path, and run `node scripts/check-shopping-dom.cjs`. No production dependency installation or build is required.
