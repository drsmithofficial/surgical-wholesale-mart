# fetch_medikabazaar_products.py
# ------------------------------------------------------------
# This script scrapes product data from https://www.medikabazaar.com
# and writes a JSON file (data/products.json) containing an array of
# product objects:
#   {
#       "name": "Product name",
#       "description": "Plain‑text description (no branding)",
#       "image": "https://.../image.jpg",
#       "price": "₹123.45"  # optional – empty string if not shown
#   }
# ------------------------------------------------------------
# NOTE:
# • You must have permission to copy the catalogue (you indicated you do).
# • The site uses JavaScript to render products, so the script uses
#   Selenium with Chrome in headless mode.  Chrome must be installed and
#   available on PATH, or you can set CHROME_PATH to the full executable.
# • Selenium will launch Chrome with the required "--remote‑debugging-port"
#   flag automatically – you do not need to start Chrome yourself.
# • Install dependencies (run **outside** the sandbox):
#       pip install selenium beautifulsoup4
#   On Windows you may need to download the matching ChromeDriver
#   (https://sites.google.com/chromium.org/driver/).  Place the driver
#   executable in the same directory as this script or add it to PATH.
# ------------------------------------------------------------
import json
import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup

BASE_URL = "https://www.medikabazaar.com"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "products.json"

def configure_driver():
    chrome_path = Path("C:/Program Files/Google/Chrome/Application/chrome.exe")
    if not chrome_path.exists():
        # Fallback – let Selenium resolve chrome from PATH
        chrome_path = None
    options = Options()
    if chrome_path:
        options.binary_location = str(chrome_path)
    # Run headless but keep a debugging port for inspection if needed
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--remote-debugging-port=9222")
    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(30)
    return driver

def get_all_category_links(driver):
    driver.get(BASE_URL)
    time.sleep(3)  # allow initial JS to load
    soup = BeautifulSoup(driver.page_source, "html.parser")
    # The site lists categories in navigation links – adjust selector if needed
    nav = soup.select("nav a[href*='/category']")
    links = [a["href"] for a in nav]
    # Ensure absolute URLs
    return [link if link.startswith("http") else BASE_URL + link for link in links]

def scrape_products_from_page(driver, url):
    driver.get(url)
    time.sleep(3)
    soup = BeautifulSoup(driver.page_source, "html.parser")
    products = []
    # Product cards typically have a class like "product-card" – adjust as needed
    for card in soup.select(".product-card"):
        name_el = card.select_one(".product-name")
        desc_el = card.select_one(".product-description")
        img_el = card.select_one("img")
        price_el = card.select_one(".price")
        name = name_el.get_text(strip=True) if name_el else ""
        description = desc_el.get_text(separator=" ", strip=True) if desc_el else ""
        # Strip any brand mentions that appear in the description
        description = description.replace("Medikabazaar", "").strip()
        image = img_el["src"] if img_el and img_el.has_attr("src") else ""
        price = price_el.get_text(strip=True) if price_el else ""
        products.append({
            "name": name,
            "description": description,
            "image": image,
            "price": price,
        })
    return products

def paginate_and_collect(driver, category_url):
    all_products = []
    page = 1
    while True:
        url = f"{category_url}?page={page}"
        products = scrape_products_from_page(driver, url)
        if not products:
            break
        all_products.extend(products)
        page += 1
    return all_products

def main():
    driver = configure_driver()
    try:
        categories = get_all_category_links(driver)
        all_products = []
        for cat in categories:
            all_products.extend(paginate_and_collect(driver, cat))
        # Remove duplicates based on product name
        uniq = {p["name"]: p for p in all_products}
        final = list(uniq.values())
        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(final, f, ensure_ascii=False, indent=2)
        print(f"Wrote {len(final)} products to {OUTPUT_PATH}")
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
