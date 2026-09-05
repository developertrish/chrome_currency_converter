const NAME_MAP = {
  USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', JPY: 'Japanese Yen',
  CNY: 'Chinese Yuan', INR: 'Indian Rupee', AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar', CHF: 'Swiss Franc', HKD: 'Hong Kong Dollar',
  SGD: 'Singapore Dollar', SEK: 'Swedish Krona', NOK: 'Norwegian Krone',
  DKK: 'Danish Krone', NZD: 'New Zealand Dollar', MXN: 'Mexican Peso',
  BRL: 'Brazilian Real', ZAR: 'South African Rand', RUB: 'Russian Ruble',
  KRW: 'South Korean Won', TRY: 'Turkish Lira', AED: 'UAE Dirham',
  SAR: 'Saudi Riyal', THB: 'Thai Baht', IDR: 'Indonesian Rupiah',
  PHP: 'Philippine Peso', VND: 'Vietnamese Dong', PLN: 'Polish Zloty',
  ILS: 'Israeli Shekel', TWD: 'Taiwan Dollar'
};

const $ = (id) => document.getElementById(id);

async function load() {
  const local = await chrome.storage.local.get(['rates', 'ratesUpdated']);
  const sync = await chrome.storage.sync.get(['targetCurrency', 'enabled', 'displayMode']);

  const select = $('targetCurrency');
  select.innerHTML = '';
  const codes = local.rates ? Object.keys(local.rates).sort() : Object.keys(NAME_MAP);
  for (const code of codes) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = NAME_MAP[code] ? `${code} — ${NAME_MAP[code]}` : code;
    select.appendChild(opt);
  }
  select.value = sync.targetCurrency || 'USD';

  $('enabled').checked = sync.enabled !== false;
  $('displayMode').value = sync.displayMode || 'badge';

  $('updated').textContent = local.ratesUpdated
    ? `Rates updated ${new Date(local.ratesUpdated).toLocaleString()}`
    : 'Rates not loaded yet — click refresh';
}

$('targetCurrency').addEventListener('change', (e) => {
  chrome.storage.sync.set({ targetCurrency: e.target.value });
});

$('enabled').addEventListener('change', (e) => {
  chrome.storage.sync.set({ enabled: e.target.checked });
});

$('displayMode').addEventListener('change', (e) => {
  chrome.storage.sync.set({ displayMode: e.target.value });
});

$('refresh').addEventListener('click', async () => {
  const btn = $('refresh');
  btn.disabled = true;
  btn.textContent = 'Refreshing…';
  const res = await chrome.runtime.sendMessage({ type: 'REFRESH_RATES' });
  await load();
  btn.disabled = false;
  btn.textContent = 'Refresh rates';
  if (!res || !res.success) {
    $('updated').textContent = 'Refresh failed — will retry automatically';
  }
});

load();
