"""Extract searchable text from the storefront's published HTML pages."""

import json
from html.parser import HTMLParser
from pathlib import Path


class PageContent(HTMLParser):
    BLOCKS = {"h1", "h2", "h3", "h4", "p", "li", "summary", "dt", "dd", "address", "figcaption", "strong", "small", "td", "th"}

    def __init__(self):
        super().__init__()
        self.in_main = False
        self.in_title = False
        self.title = []
        self.block = None
        self.parts = []
        self.content = []
        self.skip = None

    def handle_starttag(self, tag, attrs):
        if tag == "title":
            self.in_title = True
        elif tag == "main":
            self.in_main = True
        elif self.in_main and tag in {"script", "style", "svg"} and not self.skip:
            self.skip = tag
        elif self.in_main and tag in self.BLOCKS and not self.block and not self.skip:
            self.block = tag
            self.parts = []
        elif self.block and tag == "br":
            self.parts.append(" ")

    def handle_endtag(self, tag):
        if tag == self.skip:
            self.skip = None
        elif tag == self.block:
            text = " ".join("".join(self.parts).split())
            if len(text) >= 4:
                self.content.append((tag.startswith("h") or tag == "summary", text))
            self.block = None
        elif tag == "main":
            self.in_main = False
        elif tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)
        if self.block and not self.skip:
            self.parts.append(data)


def build_site_index(root):
    index = []
    for page in sorted(root.glob("*.html")):
        if page.name == "thankyou.html":
            continue
        html = page.read_text(encoding="utf-8")
        if page.name == "products.html":
            # Catalogue cards are already searched via the structured product data.
            html = html.split('id="catalog-grid"', 1)[0]
        parser = PageContent()
        parser.feed(html)
        blocks = list(dict.fromkeys(parser.content))
        index.append([page.name, "".join(parser.title).split("|", 1)[0].strip(), blocks])
    output = root / "js" / "site-content-index.js"
    company = json.loads((root / "data" / "company.json").read_text(encoding="utf-8"))
    fields = ("id", "name", "region", "country", "address", "phone", "phoneDisplay", "contactLabel", "whatsapp", "whatsappDisplay", "email")
    contacts = {
        "phone": company["phone"],
        "whatsapp": company["whatsapp"],
        "email": company["email"],
        "locations": [{key: item[key] for key in fields if key in item} for item in company["locations"]],
        "leadership": [{key: person[key] for key in ("name", "role")} for person in company["leadership"]],
    }
    serialize = lambda data: json.dumps(data, ensure_ascii=True, separators=(",", ":"))
    output.write_text(
        "window.SWM_SITE_CONTENT = " + serialize(index) + ";\n"
        + "window.SWM_SITE_CONTACTS = " + serialize(contacts) + ";\n",
        encoding="utf-8",
        newline="\n",
    )


if __name__ == "__main__":
    build_site_index(Path(__file__).resolve().parents[1])
