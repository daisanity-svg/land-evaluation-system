(function () {
  const STORAGE_PREFIX = 'hiyes-manual-site-adjustment-v1:';
  const DIRECTIONS = ['east', 'south', 'west', 'north'];
  const DIR_LABELS = { east: '東向', south: '南向', west: '西向', north: '北向' };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  function reportKey() {
    const title = clean(document.title);
    const report = clean($('.card-report.readable-report.briefing-report')?.textContent || '').slice(0, 180);
    return `${STORAGE_PREFIX}${title || report || 'current'}`.slice(0, 260);
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(reportKey()) || '{}') || {}; }
    catch { return {}; }
  }

  function save(data) {
    localStorage.setItem(reportKey(), JSON.stringify(data || {}));
  }

  function clearSavedSite() {
    localStorage.removeItem(reportKey());
  }

  function hasReport() {
    return Boolean($('.card-report.readable-report.briefing-report'));
  }

  function setMetric(label, value) {
    if (!value) return;
    const card = $all('.metric-card').find((node) => clean(node.querySelector('small')?.textContent).includes(label));
    const target = card?.querySelector('strong');
    if (target) target.textContent = value;
  }

  function makeParagraph(text) {
    const p = document.createElement('p');
    p.className = 'brief-body-text hiyes-manual-site-output';
    p.textContent = text;
    return p;
  }

  function makeSubtitle(text) {
    const h = document.createElement('h3');
    h.className = 'brief-subtitle hiyes-manual-site-output';
    h.textContent = text;
    return h;
  }

  function makeDirectionSentence(data, direction) {
    const label = DIR_LABELS[direction];
    const type = clean(data[`${direction}Type`]);
    const name = clean(data[`${direction}Name`]);
    const width = clean(data[`${direction}Width`]).replace(/米$/, '');
    const impact = clean(data[`${direction}Impact`]);

    if (!type && !name && !width && !impact) return '';

    const condition = [];
    if (type) condition.push(type);
    if (name) condition.push(name);
    if (width) condition.push(`約${width}米`);

    return `${label}｜${condition.length ? condition.join('，') : '現況待複核'}。｜${impact || '對產品規劃與銷售影響待現場複核。'}`;
  }

  function applySiteAdjustment(data) {
    if (!hasReport()) return;
    const section = $('.section-04');
    if (!section) return;

    const roadSummary = clean(data.siteRoadSummary);
    if (roadSummary) {
      setMetric('臨路條件', roadSummary);
      const roadKv = $all('.brief-kv', section).find((kv) => clean(kv.querySelector('.brief-kv-label')?.textContent).includes('臨路條件'));
      const valueNode = roadKv?.querySelector('.brief-kv-value');
      if (valueNode) {
        valueNode.textContent = roadSummary;
        roadKv.classList.add('manual-site-overridden');
      }
    }

    const directionTexts = DIRECTIONS.map((direction) => makeDirectionSentence(data, direction)).filter(Boolean);
    if (!directionTexts.length) return;

    const body = section.querySelector('.brief-rich-text') || section;
    $all('.hiyes-manual-site-output', body).forEach((node) => node.remove());
    $all('.brief-body-text', body).forEach((node) => {
      if (/^(東向|南向|西向|北向)[｜|]/.test(clean(node.textContent))) node.remove();
    });
    $all('.brief-subtitle', body).forEach((node) => {
      if (clean(node.textContent).includes('方位') && clean(node.textContent).includes('現況')) node.remove();
    });

    const fragment = document.createDocumentFragment();
    fragment.appendChild(makeSubtitle('方位｜現況｜對銷售影響'));
    directionTexts.forEach((text) => fragment.appendChild(makeParagraph(text)));

    const firstKv = body.querySelector('.brief-kv');
    if (firstKv && firstKv.nextSibling) body.insertBefore(fragment, firstKv.nextSibling);
    else body.appendChild(fragment);
  }

  function optionTags(current) {
    const options = ['臨路', '鄰地', '鄰房', '公園', '街廓', '學校用地', '待複核'];
    return options.map((item) => `<option value="${escapeHtml(item)}" ${clean(current) === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('');
  }

  function directionRow(data, direction) {
    const label = DIR_LABELS[direction];
    return `
      <div class="manual-site-row" style="display:grid;grid-template-columns:90px 1fr 1.5fr 1fr;gap:12px;align-items:end;margin-top:14px;">
        <strong style="padding-bottom:14px;color:#0f2f4f;">${label}</strong>
        <label>類型<select data-site-field="${direction}Type"><option value="">請選擇</option>${optionTags(data[`${direction}Type`])}</select></label>
        <label>路名／鄰地／鄰房<input data-site-field="${direction}Name" placeholder="例如：中運路、相鄰土地、五層透天" value="${escapeHtml(data[`${direction}Name`])}"></label>
        <label>路寬<input data-site-field="${direction}Width" placeholder="例如：10" value="${escapeHtml(data[`${direction}Width`])}"></label>
        <label style="grid-column:2/-1;">現況與對銷售影響<textarea data-site-field="${direction}Impact" placeholder="例如：為主要臨路面，具門廳、車道與產品展示條件。">${escapeHtml(data[`${direction}Impact`])}</textarea></label>
      </div>`;
  }

  function readPanel(panel) {
    const data = {};
    panel.querySelectorAll('[data-site-field]').forEach((input) => {
      data[input.dataset.siteField] = clean(input.value);
    });
    return data;
  }

  function buildPanel() {
    if ($('#manual-site-panel')) return;
    const preview = $('.preview-panel');
    if (!preview) return;

    const data = load();
    const panel = document.createElement('section');
    panel.id = 'manual-site-panel';
    panel.className = 'manual-price-panel no-print';
    panel.innerHTML = `
      <h3>基地四向手動調整</h3>
      <p>新案預設採用系統判斷基地四向；若需核實臨路、鄰地、鄰房、路名或路寬，可手動輸入並套用到 PDF 第 04 章與案件摘要。</p>
      <div class="manual-price-grid">
        <label style="grid-column:1/-1;">臨路條件總述<textarea data-site-field="siteRoadSummary" placeholder="例如：基地西側臨約10米道路，為主要臨路面；其餘三向為鄰地或既有街廓，實際道路名稱與寬度仍待地籍套圖複核。">${escapeHtml(data.siteRoadSummary)}</textarea></label>
      </div>
      ${DIRECTIONS.map((direction) => directionRow(data, direction)).join('')}
      <label style="display:block;margin-top:14px;">基地四向調整說明<textarea data-site-field="siteNote" placeholder="僅供內部註記，不會另外新增到 PDF 章節。">${escapeHtml(data.siteNote)}</textarea></label>
      <div class="manual-price-actions"><button type="button" data-site-action="apply">套用到 PDF</button><button type="button" class="secondary" data-site-action="clear">清除調整</button></div>`;

    const pricePanel = $('#manual-price-panel');
    if (pricePanel && pricePanel.parentNode) pricePanel.parentNode.insertBefore(panel, pricePanel.nextSibling);
    else {
      const tabs = $('.report-tabs', preview);
      if (tabs && tabs.parentNode) tabs.parentNode.insertBefore(panel, tabs.nextSibling);
      else preview.insertBefore(panel, preview.firstChild);
    }

    panel.addEventListener('input', () => {
      const next = readPanel(panel);
      save(next);
      applySiteAdjustment(next);
    });

    panel.addEventListener('click', (event) => {
      const action = event.target?.dataset?.siteAction;
      if (action === 'apply') {
        const next = readPanel(panel);
        save(next);
        applySiteAdjustment(next);
      }
      if (action === 'clear') {
        clearSavedSite();
        panel.querySelectorAll('[data-site-field]').forEach((input) => { input.value = ''; });
        location.reload();
      }
    });
  }

  function init() {
    buildPanel();
    applySiteAdjustment(load());
  }

  window.addEventListener('beforeprint', () => applySiteAdjustment(load()));
  const observer = new MutationObserver(() => {
    clearTimeout(window.__hiyesSiteAdjustTimer);
    window.__hiyesSiteAdjustTimer = setTimeout(init, 250);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();