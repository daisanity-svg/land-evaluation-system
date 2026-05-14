(function () {
  const STORAGE_PREFIX = 'hiyes-manual-price-adjustment-v2:';
  const PRINT_CLONE_ID = 'hiyes-print-report-clone';
  const $ = (s, r = document) => r.querySelector(s);
  const $all = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();
  const hasReport = () => Boolean($('.card-report.readable-report.briefing-report'));

  function reportKey() {
    const header = clean(document.querySelector('title')?.textContent || '');
    const report = clean($('.card-report.readable-report.briefing-report')?.textContent || '').slice(0, 180);
    const top = clean(document.body?.innerText || '').match(/\d{4}\/\d{1,2}\/\d{1,2}[^\n]*地號[^\n]*/)?.[0] || '';
    return `${STORAGE_PREFIX}${header || top || report || 'current'}`.slice(0, 260);
  }
  function load() { try { return JSON.parse(localStorage.getItem(reportKey()) || '{}') || {}; } catch { return {}; } }
  function save(data) { localStorage.setItem(reportKey(), JSON.stringify(data || {})); }

  function makeKv(label, value, priority) {
    const div = document.createElement('div');
    div.className = priority ? 'brief-kv priority-high' : 'brief-kv';
    div.innerHTML = '<div class="brief-kv-label"></div><div class="brief-kv-value"></div>';
    div.querySelector('.brief-kv-label').textContent = label;
    div.querySelector('.brief-kv-value').textContent = value || '待複核';
    return div;
  }

  function metric(label) { return $all('.metric-card').find((c) => clean(c.querySelector('small')?.textContent).includes(label)); }
  function setMetric(label, value) { const s = metric(label)?.querySelector('strong'); if (s && value) s.textContent = value; }
  function makePriceSummary(d) { return [d.residential && `二樓以上住宅 ${d.residential}`, d.shop && `店面 ${d.shop}`, d.parking && `坡道平面車位 ${d.parking}`].filter(Boolean).join('；'); }
  function cardTitle(card) { return clean(card.querySelector('h4')?.textContent || card.querySelector('.brief-body-text,.brief-kv-value')?.textContent); }
  function pairs(card) {
    const out = [];
    $all('.brief-kv', card).forEach((kv) => {
      const l = clean(kv.querySelector('.brief-kv-label')?.textContent);
      const v = clean(kv.querySelector('.brief-kv-value')?.textContent);
      if (l || v) out.push([l, v]);
    });
    $all('.brief-body-text', card).forEach((p) => {
      const t = clean(p.textContent); const idx = t.indexOf('：') > -1 ? t.indexOf('：') : t.indexOf(':');
      if (idx > 0 && idx < 18) out.push([t.slice(0, idx), t.slice(idx + 1)]);
    });
    return out;
  }

  function normalizePrice(v) {
    const text = clean(v).replace(/^建議成交價格[：:]?/, '').replace(/^二樓以上住宅[：:]?/, '').replace(/^店面[：:]?/, '').replace(/^坡道平面車位[：:]?/, '');
    const m = text.match(/[\d,.]+\s*[～~\-至]?\s*[\d,.]*\s*萬\s*[／/]\s*(坪|位)/);
    return m ? m[0].replace(/\s+/g, '') : text;
  }

  function findPrice(title) {
    const section = $('.section-09'); if (!section) return '';
    for (const card of $all('.brief-data-card', section)) {
      const text = clean(card.textContent); const titleText = clean(card.querySelector('h4')?.textContent);
      if (!text.includes(title) && !titleText.includes(title)) continue;
      const hit = pairs(card).find(([l]) => /建議成交價格|成交價格/.test(l));
      if (hit?.[1]) return normalizePrice(hit[1]);
      const m = text.match(/[\d,.]+\s*[～~\-至]?\s*[\d,.]*\s*萬\s*[／/]\s*(坪|位)/);
      if (m) return m[0].replace(/\s+/g, '');
    }
    return '';
  }

  function cleanSummaryPrice(data) {
    const manual = makePriceSummary(data);
    const r = data.residential || findPrice('二樓以上住宅');
    const s = data.shop || findPrice('店面');
    const p = data.parking || findPrice('坡道平面車位');
    const summary = manual || [r && `二樓以上住宅 ${r}`, s && `店面 ${s}`, p && `坡道平面車位 ${p}`].filter(Boolean).join('；');
    setMetric('建議價格', summary);
  }

  function setPriceCardValue(title, value) {
    if (!value) return;
    const cards = $all('.hiyes-price-card, .brief-data-card.price');
    const card = cards.find((c) => clean(c.querySelector('h4')?.textContent).includes(title));
    const target = card?.querySelector('.brief-kv-value');
    if (target) {
      target.textContent = value;
      card.classList.add('manual-price-overridden');
    }
  }

  function applyManualValuesToPriceCards(data) {
    setPriceCardValue('二樓以上住宅', data.residential);
    setPriceCardValue('店面', data.shop);
    setPriceCardValue('坡道平面車位', data.parking);
    $all('.manual-price-output').forEach((node) => node.remove());
  }

  function repairCases() {
    const section = $('.section-08'); const grid = section?.querySelector('.case-grid,.brief-card-grid');
    if (!grid || grid.dataset.hiyesRepaired === '2') return;
    const raw = $all('.brief-data-card', grid); if (!raw.length) return;
    const cases = []; let cur = null;
    raw.forEach((card) => {
      const title = cardTitle(card); const ps = pairs(card);
      const start = /^競案[一二三四五六七八九十0-9]+\s*[｜|]/.test(title) || ps.some(([l]) => /案名/.test(l));
      const namePair = ps.find(([l]) => /案名|競案/.test(l));
      const name = clean((namePair?.[1] || title).replace(/^競案\s*\d+\s*[｜|：:]?/, '').replace(/^競案[一二三四五六七八九十0-9]+\s*[｜|：:]?/, ''));
      if (start || !cur) { cur = { name: name || `競案 ${cases.length + 1}`, pairs: [], notes: [] }; cases.push(cur); }
      ps.forEach(([l, v]) => { if (!/案名|競案/.test(l) && l && v && !cur.pairs.some(([a,b]) => a===l && b===v)) cur.pairs.push([l, v]); });
      $all('.brief-body-text', card).forEach((p) => { const t = clean(p.textContent); if (t && t !== cur.name && !/^競案\s*\d+$/.test(t) && !cur.notes.includes(t)) cur.notes.push(t); });
    });
    grid.innerHTML = ''; grid.classList.add('hiyes-case-repaired');
    cases.filter(c => c.name || c.pairs.length || c.notes.length).forEach((c, i) => {
      const card = document.createElement('div'); card.className = 'brief-data-card case hiyes-case-card';
      card.innerHTML = '<div class="brief-card-eyebrow"></div><h4></h4><div class="brief-card-content"></div>';
      card.querySelector('.brief-card-eyebrow').textContent = `競案 ${i + 1}`;
      card.querySelector('h4').textContent = c.name;
      const content = card.querySelector('.brief-card-content');
      c.pairs.forEach(([l, v]) => content.appendChild(makeKv(l, v)));
      c.notes.forEach((n) => { const p=document.createElement('p'); p.className='brief-body-text'; p.textContent=n; content.appendChild(p); });
      grid.appendChild(card);
    });
    grid.dataset.hiyesRepaired = '2';
  }

  function repairPrices() {
    const section = $('.section-09'); const grid = section?.querySelector('.price-grid,.brief-card-grid');
    if (!grid || grid.dataset.hiyesPriceRepaired === '3') return;
    const summaryTexts = [];
    $all('.brief-data-card', grid).forEach((card) => {
      pairs(card).forEach(([l, v]) => { if (/價格判斷摘要|價格摘要|判斷摘要|價格判斷依據/.test(l) && v) summaryTexts.push(v); });
      $all('.brief-body-text', card).forEach((p) => { const t=clean(p.textContent).replace(/^價格判斷摘要[：:]?/, '').replace(/^價格判斷依據[：:]?/, ''); if (/價格/.test(p.textContent) && t) summaryTexts.push(t); });
    });
    const data = load();
    const rebuilt = document.createElement('div'); rebuilt.className = `${grid.className} hiyes-price-repaired`; rebuilt.dataset.hiyesPriceRepaired = '3';
    [['二樓以上住宅','二樓以上住宅','residential'],['店面','店面','shop'],['坡道平面車位','坡道平面車位','parking']].forEach(([title, key, field]) => {
      const card=document.createElement('div'); card.className='brief-data-card price hiyes-price-card';
      card.innerHTML='<div class="brief-card-eyebrow">價格重點</div><h4></h4><div class="brief-card-content"></div>';
      card.querySelector('h4').textContent=title;
      card.querySelector('.brief-card-content').appendChild(makeKv('建議成交價格', data[field] || findPrice(key) || '待複核', true));
      rebuilt.appendChild(card);
    });
    const sCard=document.createElement('div'); sCard.className='brief-data-card price hiyes-price-summary-card';
    sCard.innerHTML='<div class="brief-card-eyebrow">價格判斷</div><h4>價格判斷依據</h4><div class="brief-card-content"></div>';
    const p=document.createElement('p'); p.className='brief-body-text'; p.textContent=summaryTexts.filter(Boolean).join('。') || '依區域成交行情、競案條件與產品總價帶進行綜合判斷。';
    sCard.querySelector('.brief-card-content').appendChild(p); rebuilt.appendChild(sCard);
    grid.replaceWith(rebuilt);
  }

  function splitItems(text) {
    const out=[]; const re=/(?:^|\s)(\d+)[.、]\s*([^\d]+?)(?=\s\d+[.、]|$)/g; let m;
    while ((m=re.exec(clean(text)))) out.push(clean(m[2]));
    return out;
  }

  function repairSwot() {
    const section=$('.section-11'); const grid=section?.querySelector('.swot-brief-grid,.brief-card-grid');
    if (!grid || grid.dataset.hiyesSwotRepaired === '3') return;
    let items=splitItems(clean(grid.textContent));
    if (items.length < 4) {
      items=[]; $all('.brief-body-text,.brief-kv-value', grid).forEach(el => { const t=clean(el.textContent); if(t && !/^銷售優勢$|^銷售抗性$|^銷售判斷$/.test(t)) items.push(t); });
    }
    const adv=items.slice(0,3); const res=items.slice(3,6);
    grid.innerHTML=''; grid.classList.add('hiyes-swot-two-card');
    [['銷售優勢',adv,'advantage'],['銷售抗性',res,'resistance']].forEach(([title,list,type])=>{
      const card=document.createElement('div'); card.className=`brief-data-card swot hiyes-swot-card ${type}`;
      card.innerHTML='<div class="brief-card-eyebrow">銷售判斷</div><h4></h4><div class="brief-card-content"></div>';
      card.querySelector('h4').textContent=title; const wrap=card.querySelector('.brief-card-content');
      (list.length ? list : ['待報告補充。']).slice(0,3).forEach((item,i)=>{ const p=document.createElement('p'); p.className='brief-body-text'; p.textContent=`${i+1}. ${item}`; wrap.appendChild(p); });
      grid.appendChild(card);
    });
    grid.dataset.hiyesSwotRepaired='3';
  }

  function applyManualPrice(data) {
    if (!hasReport()) return;
    cleanSummaryPrice(data);
    applyManualValuesToPriceCards(data);
  }

  function buildPanel() {
    if ($('#manual-price-panel')) return; const preview=$('.preview-panel'); if(!preview) return; const data=load();
    const panel=document.createElement('section'); panel.id='manual-price-panel'; panel.className='manual-price-panel no-print';
    panel.innerHTML=`<h3>價格手動調整</h3><p>新案預設採用系統判斷價格；看完報告後如需上修或下修，再手動輸入並套用到 PDF。</p><div class="manual-price-grid"><label>二樓以上住宅<input data-price-field="residential" placeholder="例如：62～66 萬／坪" value="${data.residential||''}"></label><label>店面<input data-price-field="shop" placeholder="例如：110～135 萬／坪" value="${data.shop||''}"></label><label>坡道平面車位<input data-price-field="parking" placeholder="例如：220～260 萬／位" value="${data.parking||''}"></label><label style="grid-column:1/-1;">價格調整說明<textarea data-price-field="note" placeholder="僅供內部註記，不會另外新增到 PDF 價格章節。">${data.note||''}</textarea></label></div><div class="manual-price-actions"><button type="button" data-price-action="apply">套用到 PDF</button><button type="button" class="secondary" data-price-action="clear">清除調整</button></div>`;
    const tabs=$('.report-tabs', preview); if(tabs) tabs.parentNode.insertBefore(panel, tabs.nextSibling); else preview.insertBefore(panel, preview.firstChild);
    panel.addEventListener('input',()=>{ const d=readPanel(panel); save(d); applyManualPrice(d); });
    panel.addEventListener('click',(e)=>{ const a=e.target?.dataset?.priceAction; if(!a)return; if(a==='apply'){const d=readPanel(panel); save(d); applyManualPrice(d);} if(a==='clear'){save({}); panel.querySelectorAll('[data-price-field]').forEach(i=>i.value=''); location.reload();} });
  }
  function readPanel(panel) { const d={}; panel.querySelectorAll('[data-price-field]').forEach(i=>d[i.dataset.priceField]=clean(i.value)); return d; }

  function hardCleanClone(clone) {
    $all('.manual-price-output', clone).forEach((node)=>node.remove());
    $all('.section-heading.briefing-heading', clone).forEach((node)=>{
      const text=clean(node.textContent);
      if (/土地評估/.test(text) && /案件簡報/.test(text)) node.remove();
    });
    $all('*', clone).forEach((el)=>{
      const cls=String(el.className || '');
      const keepCard=/metric-card|brief-data-card|brief-kv|report-brand-row|section-heading|brief-table|print-fixed-footer/.test(cls);
      const keepSwot=/hiyes-swot-card|advantage-card|resistance-card/.test(cls);
      if (!keepCard && !keepSwot) {
        el.style.background='transparent';
        el.style.backgroundColor='transparent';
        el.style.backgroundImage='none';
      }
      if (/brief-data-card|metric-card|brief-kv|report-brand-row|hiyes-swot-card|advantage-card|resistance-card/.test(cls)) {
        el.style.backgroundImage='none';
      }
    });
  }

  function removePrintClone(){ const old=document.getElementById(PRINT_CLONE_ID); if(old) old.remove(); }
  function createPrintClone(){ removePrintClone(); const report=$('.card-report.readable-report.briefing-report'); if(!report) return; applyManualPrice(load()); const clone=report.cloneNode(true); clone.id=PRINT_CLONE_ID; clone.classList.add('hiyes-print-clone'); hardCleanClone(clone); document.body.appendChild(clone); }

  function init(){ buildPanel(); repairCases(); repairPrices(); repairSwot(); applyManualPrice(load()); }
  window.addEventListener('beforeprint',()=>{ init(); createPrintClone(); });
  window.addEventListener('afterprint',removePrintClone);
  const observer=new MutationObserver(()=>{ clearTimeout(window.__hiyesPriceAdjustTimer); window.__hiyesPriceAdjustTimer=setTimeout(init,200); });
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
