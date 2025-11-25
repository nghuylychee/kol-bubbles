# Noxinfluencer Scraper Chrome Extension

Chrome extension to scrape top 100 Instagram influencers from noxinfluencer.com and download as CSV.

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder from this project
5. The extension should appear in your Chrome extensions list (icon may be generic)

## Usage

1. Navigate to: https://www.noxinfluencer.com/instagram-channel-rank/top-100-vn-all-sorted-by-followers-weekly
2. Click the extension icon in your Chrome toolbar
3. Click "Scrape Data" button
4. Wait for scraping to complete
5. Click "Download CSV" to save the data

## Output Format

The CSV file will have the following format:
```csv
id,name,link_fb,link_ig,link_tiktok
1,Influencer Name,,@username,
```

- `id`: Auto-incremented (1-100)
- `name`: Influencer name
- `link_fb`: Empty (not scraped)
- `link_ig`: Instagram username in @username format
- `link_tiktok`: Empty (not scraped)

## Notes

- The extension will scrape up to 100 influencers
- Make sure you are on the correct ranking page before scraping
- The scraper automatically detects Instagram usernames from links and text
- If scraping fails, check the browser console for error messages

## Troubleshooting

- **No data found**: Make sure you are on the noxinfluencer ranking page
- **Extension not working**: Check that Developer mode is enabled and the extension is loaded
- **Download fails**: Check Chrome's download permissions

