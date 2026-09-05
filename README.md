# Currency Converter

Currency Converter is a Manifest V3 Chrome extension that detects common prices and currency codes on webpages, then shows an approximate conversion in the currency you choose.

## Features

- Detect prices such as `$100`, `EUR 99.99`, `1,200 JPY`, and `£20`.
- Convert to a selection of common currencies.
- Show conversions as inline badges or hover tooltips.
- Update prices on dynamic pages, including feeds and single-page apps.
- Refresh exchange rates manually or automatically every 60 minutes.
- Enable or disable conversion without reloading open tabs.
- Sync display preferences with Chrome.

## How it works

The service worker retrieves exchange rates from [ExchangeRate-API](https://www.exchangerate-api.com/docs/free) and caches them locally. The content script scans visible page text, adds conversion UI beside recognized prices, and watches for newly loaded content. Changing the target currency or display mode updates open tabs through Chrome storage events.

## Install for development

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select the `chrome-currency-converter` folder.
5. Open the extension popup and choose a target currency.

## Permissions and privacy

The extension uses `storage` to save preferences and cached rates, `alarms` to refresh rates periodically, and access to `https://open.er-api.com/*` to retrieve exchange-rate data. It does not send page content to the rate provider; only the public rate request is made.

## Limitations

- A dollar sign is interpreted as USD because `$` can represent several currencies.
- Only supported currency symbols and codes are converted.
- Script, form, code, preformatted, and editable content is skipped.
- A page is limited to 1,500 inserted conversion badges for performance.
- Exchange rates depend on the external rate service and may be unavailable temporarily.
