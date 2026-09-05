(() => {
  const STATE = {
    rates: null,
    ratesUpdated: null,
    targetCurrency: 'USD',
    enabled: true,
    displayMode: 'badge'
  };

  let observer = null;
  let badgeCount = 0;
  const MAX_BADGES = 1500;

  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'IFRAME', 'CODE', 'PRE'
  ]);

  const CURRENCY_SYMBOLS = {
    '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR',
    '₩': 'KRW', '₽': 'RUB', '₺': 'TRY', '฿': 'THB', '₫': 'VND', '₴': 'UAH'
  };

  const CURRENCY_CODES = [
    'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AUD', 'CAD', 'CHF', 'HKD',
    'SGD', 'SEK', 'NOK', 'DKK', 'NZD', 'MXN', 'BRL', 'ZAR', 'RUB', 'KRW',
    'TRY', 'AED', 'SAR', 'THB', 'IDR', 'PHP', 'VND', 'PLN', 'ILS', 'TWD'
  ];

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const NUM = String.raw`\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?`;
  const SYM = Object.keys(CURRENCY_SYMBOLS).map(escapeRegex).join('|');
  const CODE = CURRENCY_CODES.join('|');

  const MATCH_RE = new RegExp(
    `(?<sym1>${SYM})\\s?(?<num1>${NUM})(?!\\w)` +
    `|(?<![\\w.])(?<num2>${NUM})\\s?(?<sym2>${SYM})` +
    `|\\b(?<code1>${CODE})\\s?(?<num3>${NUM})\\b` +
    `|\\b(?<num4>${NUM})\\s?(?<code2>${CODE})\\b`,
    'g'
  );

  function findMatches(text) {
    const results = [];
    MATCH_RE.lastIndex = 0;
    let m;
    while ((m = MATCH_RE.exec(text))) {
      const g = m.groups;
      let currency, amountStr;
      if (g.sym1) { currency = CURRENCY_SYMBOLS[g.sym1]; amountStr = g.num1; }
      else if (g.sym2) { currency = CURRENCY_SYMBOLS[g.sym2]; amountStr = g.num2; }
      else if (g.code1) { currency = g.code1.toUpperCase(); amountStr = g.num3; }
      else if (g.code2) { currency = g.code2.toUpperCase(); amountStr = g.num4; }
      if (!currency || !amountStr) continue;
      const amount = parseFloat(amountStr.replace(/,/g, ''));
      if (Number.isNaN(amount)) continue;
      results.push({ index: m.index, length: m[0].length, text: m[0], currency, amount });
    }
    return results;
  }

  function convert(amount, fromCode, toCode) {
    const rates = STATE.rates;
    if (!rates || !rates[fromCode] || !rates[toCode]) return null;
    const usd = amount / rates[fromCode];
    return usd * rates[toCode];
  }

  function formatAmount(amount, code) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 2
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${code}`;
    }
  }

  function processTextNode(node) {
    if (badgeCount >= MAX_BADGES) return;
    const text = node.data;
    if (!text || text.length < 2 || text.length > 2000) return;
    if (!/\d/.test(text)) return;

    const matches = findMatches(text);
    if (!matches.length) return;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    let changed = false;

    for (const m of matches) {
      if (badgeCount >= MAX_BADGES) break;
      if (m.currency === STATE.targetCurrency) continue;

      const converted = convert(m.amount, m.currency, STATE.targetCurrency);
      if (converted === null) continue;

      frag.appendChild(document.createTextNode(text.slice(cursor, m.index)));

      const wrap = document.createElement('span');
      wrap.className = 'cc-ext-original';
      wrap.dataset.ccProcessed = 'true';
      wrap.textContent = m.text;

      const convertedText = formatAmount(converted, STATE.targetCurrency);

      if (STATE.displayMode === 'tooltip') {
        wrap.classList.add('cc-ext-underline');
        wrap.title = `≈ ${convertedText}`;
        frag.appendChild(wrap);
      } else {
        frag.appendChild(wrap);
        const badge = document.createElement('span');
        badge.className = 'cc-ext-badge';
        badge.dataset.ccProcessed = 'true';
        badge.textContent = `≈${convertedText}`;
        const rate = STATE.rates[STATE.targetCurrency] / STATE.rates[m.currency];
        const updated = STATE.ratesUpdated ? new Date(STATE.ratesUpdated).toLocaleTimeString() : 'unknown';
        badge.title = `1 ${m.currency} = ${rate.toFixed(4)} ${STATE.targetCurrency} · updated ${updated}`;
        frag.appendChild(badge);
      }

      badgeCount++;
      changed = true;
      cursor = m.index + m.length;
    }

    if (!changed) return;

    frag.appendChild(document.createTextNode(text.slice(cursor)));
    node.parentNode.replaceChild(frag, node);
  }

  function filterNode(node) {
    const parent = node.parentElement;
    if (!parent) return NodeFilter.FILTER_REJECT;
    if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
    if (parent.isContentEditable) return NodeFilter.FILTER_REJECT;
    if (parent.closest('.cc-ext-original, .cc-ext-badge')) return NodeFilter.FILTER_REJECT;
    if (!node.data || !node.data.trim()) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  }

  function walk(root) {
    if (!root || !root.nodeType) return;
    const target = root.nodeType === Node.TEXT_NODE ? root.parentElement : root;
    if (!target) return;

    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, { acceptNode: filterNode });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    for (const node of nodes) processTextNode(node);
  }

  function unwrapAll() {
    document.querySelectorAll('.cc-ext-badge').forEach((el) => el.remove());
    document.querySelectorAll('.cc-ext-original').forEach((el) => {
      const parent = el.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    });
    badgeCount = 0;
  }

  let pending = new Set();
  let scheduled = false;

  function scheduleWalk(node) {
    pending.add(node);
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      const targets = Array.from(pending);
      pending.clear();
      for (const t of targets) {
        if (document.contains(t)) walk(t);
      }
    }, 400);
  }

  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const added of m.addedNodes) {
          if (added.nodeType === Node.ELEMENT_NODE) {
            scheduleWalk(added);
          } else if (added.nodeType === Node.TEXT_NODE && added.parentElement) {
            scheduleWalk(added.parentElement);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  async function init() {
    const local = await chrome.storage.local.get(['rates', 'ratesUpdated']);
    const sync = await chrome.storage.sync.get(['targetCurrency', 'enabled', 'displayMode']);

    STATE.rates = local.rates || null;
    STATE.ratesUpdated = local.ratesUpdated || null;
    STATE.targetCurrency = sync.targetCurrency || 'USD';
    STATE.enabled = sync.enabled !== false;
    STATE.displayMode = sync.displayMode || 'badge';

    if (STATE.enabled && STATE.rates) {
      walk(document.body);
      startObserver();
    }
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    let needsRescan = false;

    if (area === 'local' && changes.rates) {
      STATE.rates = changes.rates.newValue;
      needsRescan = true;
    }
    if (area === 'local' && changes.ratesUpdated) {
      STATE.ratesUpdated = changes.ratesUpdated.newValue;
    }
    if (area === 'sync' && changes.targetCurrency) {
      STATE.targetCurrency = changes.targetCurrency.newValue;
      needsRescan = true;
    }
    if (area === 'sync' && changes.displayMode) {
      STATE.displayMode = changes.displayMode.newValue;
      needsRescan = true;
    }
    if (area === 'sync' && changes.enabled) {
      STATE.enabled = changes.enabled.newValue !== false;
      if (!STATE.enabled) {
        stopObserver();
        unwrapAll();
        return;
      }
      needsRescan = true;
    }

    if (needsRescan && STATE.enabled) {
      unwrapAll();
      if (STATE.rates) walk(document.body);
      startObserver();
    }
  });

  init();
})();
