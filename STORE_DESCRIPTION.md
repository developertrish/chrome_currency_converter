# Chrome Web Store Description

## Short description

See prices in your currency as you browse with automatic exchange-rate conversions.

## Detailed description

Shopping, comparing prices, or reading international content? Currency Converter makes unfamiliar prices easier to understand.

The extension detects common currency symbols and codes on webpages, including `$100`, `EUR 99.99`, `1,200 JPY`, and `£20`, then displays an approximate conversion in your selected currency.

Features:

- Convert prices inline as you browse
- Choose from common world currencies
- Use inline badges or hover tooltips
- Detect prices added dynamically by feeds and single-page apps
- Refresh exchange rates manually
- Automatic rate refresh every 60 minutes
- Enable or disable conversions from the popup

Exchange rates are retrieved from ExchangeRate-API and cached locally for use by the extension. The extension does not send webpage text or page content to the rate service.

## Permission disclosure

Currency Converter uses `storage` for preferences and cached rates, `alarms` for scheduled updates, and access to `https://open.er-api.com/*` to retrieve public exchange-rate data.