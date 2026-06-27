# Manual Browser Lead Crawler

This tool lets you browse manually in Chrome and capture restaurant lead data into Excel for QRave.

It is built for public pages you open yourself, such as restaurant websites, directory listings, social pages, and search result pages. Prefer official APIs for platforms that restrict scraping.

## Setup

From this folder:

```powershell
pip install -r requirements.txt
```

Open Chrome in remote debugging mode:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\tmp\qrave-browser"
```

## Run

```powershell
python manual_browser_lead_crawler.py
```

Browse manually in the Chrome window. When you find a restaurant page, come back to the terminal and press `Enter`.

The crawler saves leads to:

```text
bareilly_qrave_restaurant_leads.xlsx
```

## Good Search Queries

Use these manually in the browser:

```text
restaurants in Bareilly
cafes in Bareilly
family restaurants in Bareilly
fast food Bareilly
restaurants in Civil Lines Bareilly
restaurants in DD Puram Bareilly
restaurants in Rajendra Nagar Bareilly
restaurants near Pilibhit Bypass Bareilly
```

## Captured Columns

- restaurant name
- phone numbers
- emails
- address guess
- source URL
- website links
- Google Maps links
- social links
- menu links
- ordering links
- QRave fit score
- notes
- page text preview

The QRave fit score is a helper only. Review each lead manually before contacting the restaurant.
