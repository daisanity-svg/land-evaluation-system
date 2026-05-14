(function () {
  const STORAGE_KEY = 'hiyes-manual-price-adjustment-v1';

  function $(selector, root = document) { return root.querySelector(selector); }
  function $all(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
  function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
  function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { return {}; } }
  function save(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data || {})); }
  function hasReport() { return Boolean($('.card-report.readable-report.briefing-report')); }

  function findMetricCard(labelText) {
    return $all('.metric-card').find((card) => clean(card.querySelector('small')?.textContent).includes(labelText));
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

  function makeKv(label, value) {
    const div = document.createElement('div');
    div.className = 'brief-kv';
    div.innerHTML = `<div class="brief-kv-label"></div><div class="brief-kv-value"></div>`;
    div.querySelector('.brief-kv-label').textContent = label;
    div.querySelector('.brief-kv-value').textContent = value || '待複核';
    return div;
  }

  function getCardTitle(card) {
    const h4 = clean(card.querySelector('h4')?.textContent);
    const first = clean(card.querySelector('.brief-body-text, .brief-kv-value')?.textContent);
    return h4 || first;
  }

  function getPairsFromCard(card) {
    const pairs = [];
    $all('.brief-kv', card).forEach((kv) => {
      const label = clean(kv.querySelector('.brief-kv-label')?.textContent);
      const value = clean(kv.querySelector('.brief-kv-value')?.textContent);
      if (label || value) pairs.push([label, value]);
    });
    $all('.brief-body-text', card).forEach((p) => {
      const text = clean(p.textContent);
      const idx = Math.max(text.indexOf('：'), text.indexOf(':'));
      if (idx > 0 && idx < 16) pairs.push([text.slice(0, idx), text.slice(idx + 1)]);
    });
    return pairs;
  }

  function inferCaseName(card, fallbackIndex) {
    const title = getCardTitle(card).replace(/^競案\s*\d+\s*[｜|：:]?\s*/g, '').trim();
    const pairs = getPairsFromCard(card);
    const namePair = pairs.find(([label]) => /案名|競案/.test(label));
    const fromPair = namePair?.[1]?.replace(/^競案\s*\d+\s*[｜|：:]?\s*/g, '').trim();
    const candidate = fromPair || title;
    if (!candidate || /^競案\s*\d+$/.test(candidate)) return `競案 ${fallbackIndex}`;
    return candidate;
  }

  function repairCaseCards() {
    const section = $('.section-08');
    const grid = section?.querySelector('.case-grid, .brief-card-grid');
    if (!section || !grid || grid.dataset.hiyesRepaired === '1') return;
    const rawCards = $all('.brief-data-card', grid);
    if (!rawCards.length) return;

    const cases = [];
    let current = null;
    rawCards.forEach((card) => {
      const title = getCardTitle(card);
      const pairs = getPairsFromCard(card);
      const hasRealCaseStart = /^競案[一二三四五六七八九十0-9]+\s*[｜|]/.test(title) || pairs.some(([label]) => /案名/.test(label));
      const maybeName = inferCaseName(card, cases.length + 1);
      const isOnlyLabel = /^競案\s*\d+$/.test(title) || /^競案[一二三四五六七八九十]+$/.test(title);

      if (hasRealCaseStart || !current) {
        if (!(isOnlyLabel && !pairs.length)) {
          current = { name: maybeName, pairs: [], notes: [] };
          cases.push(current);
        }
      }
      if (!current) return;
      pairs.forEach(([label, value]) => {
        if (/^競案\s*\d+$/.test(value)) return;
        if (/案名|競案/.test(label)) return;
        if (label && value) current.pairs.push([label, value]);
      });
      $all('.brief-body-text', card).forEach((p) => {
        const text = clean(p.textContent);
        if (!text || /^競案\s*\d+$/.test(text) || text === current.name) return;
        if (!current.notes.includes(text)) current.notes.push(text);
      });
    });

    const useful = cases.filter((c) => c.name || c.pairs.length || c.notes.length);
    if (!useful.length) return;
    grid.innerHTML = '';
    grid.classList.add('hiyes-case-repaired');
    useful.forEach((c, index) => {
      const card = document.createElement('div');
      card.className = 'brief-data-card case hiyes-case-card';
      const content = document.createElement('div');
      content.className = 'brief-card-content';
      const seen = new Set();
      c.pairs.forEach(([label, value]) => {
        const key = `${label}::${value}`;
        if (seen.has(key)) return;
        seen.add(key);
        content.appendChild(makeKv(label, value));
      });
      c.notes.forEach((note) => {
        const p = document.createElement('p');
        p.className = 'brief-body-text';
        p.textContent = note;
        content.appendChild(p);
      });
      card.innerHTML = `<div class="brief-card-eyebrow">競案 ${index + 1}</div><h4></h4>`;
      card.querySelector('h4').textContent = c.name.replace(/^競案[一二三四五六七八九十0-9]+\s*[｜|：:]?\s*/, '').trim();
      card.appendChild(content);
      grid.appendChild(card);
    });
    grid.dataset.hiyesRepaired = '1';
  }

  function repairPriceCards() {
    const section = $('.section-09');
    const grid = section?.querySelector('.price-grid, .brief-card-grid');
    if (!section || !grid || grid.dataset.hiyesPriceRepaired === '1') return;
    const cards = $all('.brief-data-card', grid);
    if (!cards.length) return;
    const summaryTexts = [];
    cards.forEach((card) => {
      const pairs = getPairsFromCard(card);
      pairs.forEach(([label, value]) => {
        if (/價格判斷摘要|價格摘要|判斷摘要/.test(label) && value) summaryTexts.push(value);
      });
      $all('.brief-kv', card).forEach((kv) => {
        const label = clean(kv.querySelector('.brief-kv-label')?.textContent);
        if (/價格判斷摘要|價格摘要|判斷摘要/.test(label)) kv.remove();
      });
    });
    if (summaryTexts.length) {
      const summaryCard = document.createElement('div');
      summaryCard.className = 'brief-data-card price hiyes-price-summary-card';
      summaryCard.innerHTML = '<div class="brief-card-eyebrow">價格判斷</div><h4>價格判斷摘要</h4><div class="brief-card-content"></div>';
      summaryTexts.forEach((text) => {
        const p = document.createElement('p');
        p.className = 'brief-body-text';
        p.textContent = text;
        summaryCard.querySelector('.brief-card-content').appendChild(p);
      });
      grid.appendChild(summaryCard);
    }
    grid.dataset.hiyesPriceRepaired = '1';
  }

  function repairSwotCards() {
    const section = $('.section-11');
    const grid = section?.querySelector('.swot-brief-grid, .brief-card-grid');
    if (!section || !grid || grid.dataset.hiyesSwotRepaired === '1') return;
    const allText = clean(grid.textContent);
    const cards = $all('.brief-data-card', grid);
    if (!cards.length) return;
    const adv = [];
    const res = [];
    cards.forEach((card) => {
      const title = clean(card.querySelector('h4')?.textContent);
      const textLines = [];
      $all('.brief-body-text, .brief-kv-value', card).forEach((el) => {
        const t = clean(el.textContent);
        if (t && !/^銷售優勢$|^銷售抗性$/.test(t)) textLines.push(t);
      });
      const target = /抗性|劣勢/.test(title) || textLines.some((t) => /抗性|劣勢/.test(t)) ? res : adv;
      textLines.forEach((t) => { if (!target.includes(t)) target.push(t); });
    });
    if (!adv.length && !res.length && allText) return;
    grid.innerHTML = '';
    grid.classList.add('hiyes-swot-two-card');
    function makeGroup(title, items, type) {
      const card = document.createElement('div');
      card.className = `brief-data-card swot hiyes-swot-card ${type}`;
      card.innerHTML = `<div class="brief-card-eyebrow">銷售判斷</div><h4>${title}</h4><div class="brief-card-content"></div>`;
      const wrap = card.querySelector('.brief-card-content');
      items.slice(0, 6).forEach((item, idx) => {
        const p = document.createElement('p');
        p.className = 'brief-body-text';
        p.textContent = /^\d+[.、]/.test(item) ? item : `${idx + 1}. ${item}`;
        wrap.appendChild(p);
      });
      return card;
    }
    grid.appendChild(makeGroup('銷售優勢', adv.length ? adv : ['待報告補充。'], 'advantage'));
    grid.appendChild(makeGroup('銷售抗性', res.length ? res : ['待報告補充。'], 'resistance'));
    grid.dataset.hiyesSwotRepaired = '1';
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
    if (!summary && !data.note) { output.style.display = 'none'; return; }
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
        <label>二樓以上住宅<input data-price-field="residential" placeholder="例如：62～66 萬／坪" value="${data.residential || ''}"></label>
        <label>店面<input data-price-field="shop" placeholder="例如：110～135 萬／坪" value="${data.shop || ''}"></label>
        <label>坡道平面車位<input data-price-field="parking" placeholder="例如：220～260 萬／位" value="${data.parking || ''}"></label>
        <label style="grid-column: 1 / -1;">價格調整說明<textarea data-price-field="note" placeholder="例如：考量區域新案銷售速度與主力總價承受度，住宅建議成交價格較客觀行情上修 1～2 萬／坪。">${data.note || ''}</textarea></label>
      </div>
      <div class="manual-price-actions"><button type="button" data-price-action="apply">套用到 PDF</button><button type="button" class="secondary" data-price-action="clear">清除調整</button></div>`;
    const tabs = $('.report-tabs', preview);
    if (tabs) tabs.parentNode.insertBefore(panel, tabs.nextSibling); else preview.insertBefore(panel, preview.firstChild);
    panel.addEventListener('input', () => { const next = readPanel(panel); save(next); applyManualPrice(next); });
    panel.addEventListener('click', (event) => {
      const action = event.target?.dataset?.priceAction;
      if (!action) return;
      if (action === 'apply') { const next = readPanel(panel); save(next); applyManualPrice(next); }
      if (action === 'clear') { save({}); panel.querySelectorAll('[data-price-field]').forEach((input) => { input.value = ''; }); const output = $('.manual-price-output'); if (output) output.style.display = 'none'; }
    });
    applyManualPrice(data);
  }

  function readPanel(panel) {
    const data = {};
    panel.querySelectorAll('[data-price-field]').forEach((input) => { data[input.dataset.priceField] = clean(input.value); });
    return data;
  }

  function init() {
    buildPanel();
    repairCaseCards();
    repairPriceCards();
    repairSwotCards();
    applyManualPrice(load());
  }

  const observer = new MutationObserver(() => {
    window.clearTimeout(window.__hiyesPriceAdjustTimer);
    window.__hiyesPriceAdjustTimer = window.setTimeout(init, 200);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
