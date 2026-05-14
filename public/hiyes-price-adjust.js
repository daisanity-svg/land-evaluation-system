(function () {
  const STORAGE_KEY = 'hiyes-manual-price-adjustment-v1';

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $all(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch {
      return {};
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data || {}));
  }

  function clean(value) {
    return String(value || '').trim();
  }

  function hasReport() {
    return Boolean($('.card-report.readable-report.briefing-report'));
  }

  function findMetricCard(labelText) {
    return $all('.metric-card').find((card) => {
      const label = clean(card.querySelector('small')?.textContent);
      return label.includes(labelText);
    });
  }

  function setMetric(labelText, value) {
    if (!value) return;
    const card = findMetricCard(labelText);
    const strong = card?.querySelector('strong');
    if (strong) {
      strong.textContent = value;
      card.classList.add('manual-price-overridden');
    }
  }

  function makePriceSummary(data) {
    const items = [];
    if (data.residential) items.push(`二樓以上住宅 ${data.residential}`);
    if (data.shop) items.push(`店面 ${data.shop}`);
    if (data.parking) items.push(`坡道平面車位 ${data.parking}`);
    return items.join('；');
  }

  function ensurePriceSectionOutput(data) {
    const priceSection = $('.section-09');
    if (!priceSection) return;

    let output = priceSection.querySelector('.manual-price-output');
    if (!output) {
      output = document.createElement('div');
      output.className = 'brief-kv priority-high manual-price-output';
      output.innerHTML = '<div class="brief-kv-label">手動調整後建議價格</div><div class="brief-kv-value"></div>';
      const rich = priceSection.querySelector('.brief-rich-text, .brief-card-grid, .price-grid') || priceSection;
      rich.parentNode.insertBefore(output, rich);
    }

    const value = output.querySelector('.brief-kv-value');
    const summary = makePriceSummary(data);
    if (!summary && !data.note) {
      output.style.display = 'none';
      return;
    }
    output.style.display = '';
    value.textContent = [summary, data.note ? `調整說明：${data.note}` : ''].filter(Boolean).join('。');
  }

  function applyManualPrice(data) {
    if (!hasReport()) return;
    const summary = makePriceSummary(data);
    if (summary) setMetric('建議價格', summary);
    ensurePriceSectionOutput(data);
  }

  function buildPanel() {
    if ($('#manual-price-panel')) return;
    const preview = $('.preview-panel');
    if (!preview) return;

    const data = load();
    const panel = document.createElement('section');
    panel.id = 'manual-price-panel';
    panel.className = 'manual-price-panel no-print';
    panel.innerHTML = `
      <h3>價格手動調整</h3>
      <p>當客觀成交行情需要依市場狀況上調或下修時，可在此覆蓋 PDF 顯示價格。此功能只影響前端閱讀版與 PDF，不會改動 submitReport、summary JSON 或資料庫 mapping。</p>
      <div class="manual-price-grid">
        <label>二樓以上住宅
          <input data-price-field="residential" placeholder="例如：62～66 萬／坪" value="${data.residential || ''}">
        </label>
        <label>店面
          <input data-price-field="shop" placeholder="例如：110～135 萬／坪" value="${data.shop || ''}">
        </label>
        <label>坡道平面車位
          <input data-price-field="parking" placeholder="例如：220～260 萬／位" value="${data.parking || ''}">
        </label>
        <label style="grid-column: 1 / -1;">價格調整說明
          <textarea data-price-field="note" placeholder="例如：考量區域新案銷售速度與主力總價承受度，住宅建議成交價格較客觀行情上修 1～2 萬／坪。">${data.note || ''}</textarea>
        </label>
      </div>
      <div class="manual-price-actions">
        <button type="button" data-price-action="apply">套用到 PDF</button>
        <button type="button" class="secondary" data-price-action="clear">清除調整</button>
      </div>
    `;

    const tabs = $('.report-tabs', preview);
    if (tabs) {
      tabs.parentNode.insertBefore(panel, tabs.nextSibling);
    } else {
      preview.insertBefore(panel, preview.firstChild);
    }

    panel.addEventListener('input', () => {
      const next = readPanel(panel);
      save(next);
      applyManualPrice(next);
    });

    panel.addEventListener('click', (event) => {
      const action = event.target?.dataset?.priceAction;
      if (!action) return;
      if (action === 'apply') {
        const next = readPanel(panel);
        save(next);
        applyManualPrice(next);
      }
      if (action === 'clear') {
        save({});
        panel.querySelectorAll('[data-price-field]').forEach((input) => { input.value = ''; });
        const output = $('.manual-price-output');
        if (output) output.style.display = 'none';
      }
    });

    applyManualPrice(data);
  }

  function readPanel(panel) {
    const data = {};
    panel.querySelectorAll('[data-price-field]').forEach((input) => {
      data[input.dataset.priceField] = clean(input.value);
    });
    return data;
  }

  function init() {
    buildPanel();
    applyManualPrice(load());
  }

  const observer = new MutationObserver(() => {
    window.clearTimeout(window.__hiyesPriceAdjustTimer);
    window.__hiyesPriceAdjustTimer = window.setTimeout(init, 200);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
