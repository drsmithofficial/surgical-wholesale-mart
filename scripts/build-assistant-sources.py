"""Refresh the robot's Dr. Smith website and scanned catalogue indexes."""

import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import re
import subprocess
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from xml.etree import ElementTree

from build_site_content import PageContent


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "assistant-sources.json"
ORIGIN = "https://www.drsmith.co.in/"
CATALOGUE = "assets/downloads/dr-smith-catalogue.pdf"


def fetch(url):
    if urlsplit(url).hostname != "www.drsmith.co.in":
        raise ValueError("Expected the official Dr. Smith hostname")
    with urlopen(Request(url, headers={"User-Agent": "SWM-Catalogue-Indexer/1.0"}), timeout=20) as response:
        if urlsplit(response.url).hostname != "www.drsmith.co.in":
            raise ValueError("Unexpected redirect")
        return response.read().decode("utf-8", errors="replace")


def chunks(text, limit=650):
    current = ""
    for word in text.split():
        if current and len(current) + len(word) + 1 > limit:
            yield current
            current = ""
        current = (current + " " + word).strip()
    if current:
        yield current


def website_page(url):
    try:
        parser = PageContent()
        parser.feed(fetch(url))
        title = "".join(parser.title).split("|", 1)[0].strip() or "Dr. Smith"
        heading = title
        blocks = []
        for is_heading, text in dict.fromkeys(parser.content):
            if is_heading:
                heading = text
            else:
                blocks.extend([heading, paragraph] for paragraph in chunks(text) if len(paragraph) >= 25)
        return {"title": title, "href": url, "blocks": blocks} if blocks else None
    except (OSError, ValueError) as error:
        print(f"Skipped {url}: {error}")
        return None


def website():
    sitemap = ElementTree.fromstring(fetch(ORIGIN + "sitemap.xml"))
    urls = sorted({
        item.text for item in sitemap.findall(".//{*}loc")
        if item.text and urlsplit(item.text).hostname == "www.drsmith.co.in"
    } | {ORIGIN, ORIGIN + "about-us", ORIGIN + "about-us/warranty"})
    with ThreadPoolExecutor(max_workers=6) as executor:
        results = [item for item in executor.map(website_page, urls) if item]
    if not results:
        raise RuntimeError("No official Dr. Smith pages were indexed")
    print(f"Indexed {len(results)} of {len(urls)} official pages")
    return results


def read_page(image, tesseract):
    page = int(image.stem.rsplit("-", 1)[1])
    def recognize(mode):
        result = subprocess.run([tesseract, str(image), "stdout", "-l", "eng", "--psm", mode],
                                check=True, capture_output=True, text=True, encoding="utf-8")
        text = re.sub(r"(?<=\w)-\s*\n(?=\w)", "", result.stdout)
        return [["Catalogue page " + str(page), paragraph] for group in re.split(r"\n\s*\n", text)
                for paragraph in chunks(group) if len(paragraph) >= 15]

    blocks = recognize("3") or recognize("11")
    grouped = []
    product = []
    for heading, text in blocks:
        if re.search(r"\bSWM\s*:?\s*\d{4,}\b", text, re.IGNORECASE):
            if product:
                grouped.extend([product[0], excerpt] for excerpt in chunks(" ".join(product)))
            product = [text]
        elif product:
            product.append(text)
        else:
            grouped.append([heading, text])
    if product:
        grouped.extend([product[0], excerpt] for excerpt in chunks(" ".join(product)))
    blocks = grouped
    return {"title": f"Dr. Smith catalogue, page {page}", "href": f"{CATALOGUE}#page={page}", "blocks": blocks}


def catalogue(tesseract, rendered):
    if rendered:
        images = sorted(rendered.glob("catalogue-*.png"))
        with ThreadPoolExecutor(max_workers=4) as executor:
            pages = list(executor.map(lambda image: read_page(image, tesseract), images))
    else:
        from pypdf import PdfReader

        with TemporaryDirectory(prefix="swm-catalogue-") as directory:
            pdf = PdfReader(ROOT / CATALOGUE)
            if all(len(page.images) == 1 for page in pdf.pages):
                for number, page in enumerate(pdf.pages, start=1):
                    image = page.images[0].image.convert("L")
                    image.save(Path(directory) / f"catalogue-{number:03}.png")
            else:
                subprocess.run(["pdftoppm", "-r", "180", "-gray", "-png", str(ROOT / CATALOGUE),
                                str(Path(directory) / "catalogue")], check=True)
            return catalogue(tesseract, Path(directory))
    if not pages or not any(page["blocks"] for page in pages):
        raise RuntimeError("The catalogue OCR produced no searchable text")
    print(f"OCR text found on {sum(bool(page['blocks']) for page in pages)} of {len(pages)} catalogue pages")
    return pages


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", choices=["website", "catalogue"])
    parser.add_argument("--tesseract", default="tesseract")
    parser.add_argument("--rendered-pages", type=Path)
    options = parser.parse_args()
    data = json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else {}
    if options.only != "catalogue":
        data["website"] = website()
    if options.only != "website":
        data["catalogue"] = catalogue(options.tesseract, options.rendered_pages)
    sections = []
    for name, sources in sorted(data.items()):
        rows = ",\n".join("    " + json.dumps(source, ensure_ascii=True, separators=(",", ":")) for source in sources)
        sections.append(f'  "{name}": [\n{rows}\n  ]')
    OUTPUT.write_text("{\n" + ",\n".join(sections) + "\n}\n", encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
