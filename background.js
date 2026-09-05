const RATES_URL = 'https://open.er-api.com/v6/latest/USD';
const ALARM_NAME = 'refresh-rates';

// Defense-in-depth: never trust the external API's response shape wholesale.
// Only accept well-formed 3-letter currency codes mapped to finite positive
// numbers, and build the result on a null-prototype object so a rogue key
// like "__proto__" can't do anything even if it slipped through.
function sanitizeRates(rawRates) {
  if (!rawRates || typeof rawRates !== 'object') return null;
  const clean = Object.create(null);
  for (const [code, value] of Object.entries(rawRates)) {
    if (!/^[A-Z]{3}$/.test(code)) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue;
    clean[code] = value;
  }
  return Object.keys(clean).length ? clean : null;
}

async function fetchRates() {
  try {
    const res = await fetch(RATES_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || data.result !== 'success') {
      throw new Error((data && data['error-type']) || 'unknown API error');
    }
    const rates = sanitizeRates(data.rates);
    if (!rates) throw new Error('rates payload failed validation');
    await chrome.storage.local.set({
      rates,
      ratesBase: 'USD',
      ratesUpdated: Date.now()
    });
    return { success: true, updated: Date.now() };
  } catch (err) {
    console.error('[Currency Converter] Failed to fetch rates:', err);
    return { success: false, error: String(err.message || err) };
  }
}

const LOCALE_CURRENCY_MAP = {
  'en-us': 'USD', 'en-gb': 'GBP', 'en-ca': 'CAD', 'en-au': 'AUD',
  'en-in': 'INR', 'en-nz': 'NZD', 'en-za': 'ZAR', 'ja': 'JPY',
  'zh': 'CNY', 'zh-cn': 'CNY', 'ko': 'KRW', 'de': 'EUR', 'fr': 'EUR',
  'es': 'EUR', 'it': 'EUR', 'nl': 'EUR', 'pt': 'EUR', 'pt-br': 'BRL',
  'ru': 'RUB', 'tr': 'TRY', 'pl': 'PLN', 'sv': 'SEK', 'no': 'NOK',
  'da': 'DKK', 'th': 'THB', 'id': 'IDR', 'vi': 'VND', 'he': 'ILS',
  'ar': 'AED'
};

function guessDefaultCurrency() {
  const lang = (chrome.i18n.getUILanguage() || 'en-US').toLowerCase();
  if (LOCALE_CURRENCY_MAP[lang]) return LOCALE_CURRENCY_MAP[lang];
  const base = lang.split('-')[0];
  return LOCALE_CURRENCY_MAP[base] || 'USD';
}

chrome.runtime.onInstalled.addListener(async (details) => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 60 });
  await fetchRates();

  if (details.reason === 'install') {
    const existing = await chrome.storage.sync.get(['targetCurrency', 'enabled', 'displayMode']);
    const patch = {};
    if (!existing.targetCurrency) patch.targetCurrency = guessDefaultCurrency();
    if (existing.enabled === undefined) patch.enabled = true;
    if (!existing.displayMode) patch.displayMode = 'badge';
    if (Object.keys(patch).length) await chrome.storage.sync.set(patch);
  }
});

chrome.runtime.onStartup.addListener(() => {
  fetchRates();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) fetchRates();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Only accept messages from this extension's own pages (e.g. the popup),
  // never from web content or other extensions.
  if (sender.id !== chrome.runtime.id) return false;
  if (msg && msg.type === 'REFRESH_RATES') {
    fetchRates().then(sendResponse);
    return true;
  }
  return false;
});
