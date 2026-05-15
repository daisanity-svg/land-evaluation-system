(function () {
  const CLONE_ID = 'hiyes-print-report-clone';

  function setStyle(el, prop, value) {
    if (!el || !el.style) return;
    el.style.setProperty(prop, value, 'important');
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function setText(el, value) {
    if (el) el.textContent = value || '';
  }

  function clearVisualNoise(el) {
    setStyle(el, 'box-shadow', 'none');
    setStyle(el, 'filter', 'none');
    setStyle(el, 'backdrop-filter', 'none');
    setStyle(el, '-webkit-backdrop-filter', 'none');
  }

  function clearBackground(el) {
    setStyle(el, 'background', 'transparent');
    setStyle(el, 'background-color', 'transparent');
    setStyle(el, 'background-image', 'none');
  }

  function whiteBackground(el) {
    setStyle(el, 'background', '#fff');
    setStyle(el, 'background-color', '#fff');
    setStyle(el, 'background-image', 'none');
  }

  function makerName() {
    return clean(document.querySelector('[data-report-maker-input]')?.value);
  }

  function cleanSiteUrl() {
    return location.origin || 'https://land-evaluation-system.vercel.app';
  }

  function formatDateTime() {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const h = d.getHours();
    const min = String(d.getMinutes()).padStart(2, '0');
    const period = h < 6 ? '凌晨' : h < 12 ? '上午' : h < 18 ? '下午' : '晚上';
    const hour12 = h % 12 || 12;
    return `${y}/${m}/${day} ${period}${hour12}:${min}`;
  }

  function findMetricValue(root, label) {
    const cards = Array.from(root.querySelectorAll('.metric-card'));
    for (const card of cards) {
      const small = clean(card.querySelector('small')?.textContent);
      if (small.includes(label)) return clean(card.querySelector('strong')?.textContent);
    }
    return '';
  }

  function reportTitle(root) {
    const land = findMetricValue(root, '標的地號');
    const title = clean(document.title).replace(/\.pdf$/i, '');
    if (title && !/土地評估系統|海悅廣告|localhost/.test(title)) return title;
    return land ? `${land}_土地評估報告` : '土地評估報告';
  }

  function injectReportMakerControl() {
    if (document.getElementById('hiyes-report-maker-panel')) return;
    const preview = document.querySelector('.preview-panel');
    if (!preview) return;

    const panel = document.createElement('section');
    panel.id = 'hiyes-report-maker-panel';
    panel.className = 'manual-price-panel no-print';
    panel.innerHTML = `
      <h3>PDF 署名設定</h3>
      <p>此欄位只影響 PDF 頁尾右側署名，不影響 report_text、summary JSON、submitReport 或欄位 mapping。未輸入時，頁尾右側維持空白。</p>
      <div class="manual-price-grid">
        <label style="grid-column:1/-1;">報告製作人
          <input data-report-maker-input placeholder="請輸入報告製作人姓名" value="">
        </label>
      </div>
    `;

    const manualPanel = document.getElementById('manual-price-panel');
    if (manualPanel?.parentNode) {
      manualPanel.parentNode.insertBefore(panel, manualPanel.nextSibling);
    } else {
      const tabs = document.querySelector('.report-tabs', preview);
      if (tabs?.parentNode) tabs.parentNode.insertBefore(panel, tabs);
      else preview.prepend(panel);
    }
  }

  function removeCustomChrome() {
    document.querySelectorAll('.hiyes-custom-print-header,.hiyes-custom-print-footer').forEach((el) => el.remove());
  }

  function ensureCustomChrome(root) {
    removeCustomChrome();
    if (!root) return;

    const header = document.createElement('div');
    header.className = 'hiyes-custom-print-header';
    header.innerHTML = '<span class="hiyes-custom-url"></span><span class="hiyes-custom-design"></span>';
    setText(header.querySelector('.hiyes-custom-url'), cleanSiteUrl());
    setText(header.querySelector('.hiyes-custom-design'), 'Designed by DAI YI SYUAN');

    const footer = document.createElement('div');
    footer.className = 'hiyes-custom-print-footer';
    footer.innerHTML = '<span class="hiyes-custom-footer-left"></span><span class="hiyes-custom-footer-right"></span>';
    const maker = makerName();
    setText(footer.querySelector('.hiyes-custom-footer-left'), `${formatDateTime()}　${reportTitle(root)}`);
    setText(footer.querySelector('.hiyes-custom-footer-right'), maker ? `報告製作人：${maker}` : '');

    // Append chrome INSIDE the print clone. The app hides non-clone body children during print,
    // so body-level fixed elements may disappear. Clone-level fixed elements repeat correctly
    // in Chrome print while keeping the existing report layout untouched.
    root.prepend(header);
    root.appendChild(footer);

    let style = document.getElementById('hiyes-custom-print-chrome-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'hiyes-custom-print-chrome-style';
      document.head.appendChild(style);
    }
    style.textContent = `
      @media print {
        @page { size: A4; margin: 15mm 10mm 18mm; }
        #${CLONE_ID} .hiyes-custom-print-header,
        #${CLONE_ID} .hiyes-custom-print-footer {
          display: flex !important;
          visibility: visible !important;
          position: fixed !important;
          left: 10mm !important;
          right: 10mm !important;
          align-items: center !important;
          justify-content: space-between !important;
          background: #fff !important;
          color: #111 !important;
          font-family: 'Times New Roman', 'Noto Serif TC', 'PMingLiU', serif !important;
          font-size: 8.5px !important;
          font-weight: 400 !important;
          line-height: 1 !important;
          letter-spacing: .01em !important;
          z-index: 2147483647 !important;
          pointer-events: none !important;
          box-shadow: none !important;
          border: 0 !important;
          opacity: 1 !important;
        }
        #${CLONE_ID} .hiyes-custom-print-header {
          top: 4mm !important;
        }
        #${CLONE_ID} .hiyes-custom-print-footer {
          bottom: 5mm !important;
        }
        #${CLONE_ID} .hiyes-custom-url {
          max-width: 55% !important;
          overflow: hidden !important;
          white-space: nowrap !important;
          text-overflow: ellipsis !important;
        }
        #${CLONE_ID} .hiyes-custom-design,
        #${CLONE_ID} .hiyes-custom-footer-right {
          text-align: right !important;
          white-space: nowrap !important;
          letter-spacing: .08em !important;
        }
        #${CLONE_ID} .hiyes-custom-footer-left {
          max-width: 72% !important;
          overflow: hidden !important;
          white-space: nowrap !important;
          text-overflow: ellipsis !important;
        }
      }
    `;
  }

  function isCaseDuplicateLine(text) {
    return /^競案\s*[一二三四五六七八九十0-9]+\s*[｜|]\s*.+/.test(clean(text));
  }

  function hasSubstantialCaseData(card) {
    const kvs = Array.from(card.querySelectorAll('.brief-kv')).filter((kv) => {
      const label = clean(kv.querySelector('.brief-kv-label')?.textContent);
      const value = clean(kv.querySelector('.brief-kv-value')?.textContent);
      if (!label || !value) return false;
      if (/案名|競案/.test(label)) return false;
      if (/待複核|查無|無資料|未揭露/.test(value)) return false;
      return true;
    });
    if (kvs.length >= 2) return true;

    const bodyTexts = Array.from(card.querySelectorAll('.brief-body-text'))
      .map((el) => clean(el.textContent))
      .filter((text) => text && !isCaseDuplicateLine(text) && !/^競案\s*\d+$/.test(text));

    return bodyTexts.some((text) => text.length >= 24 && !/待複核|查無資料|無公開資料|未揭露/.test(text));
  }

  function cleanupCompetitionCards(clone) {
    clone.querySelectorAll('.hiyes-case-card').forEach((card) => {
      card.querySelectorAll('.brief-body-text').forEach((node) => {
        if (isCaseDuplicateLine(node.textContent)) node.remove();
      });

      if (!hasSubstantialCaseData(card)) {
        card.remove();
      }
    });

    Array.from(clone.querySelectorAll('.hiyes-case-card')).forEach((card, index) => {
      const eyebrow = card.querySelector('.brief-card-eyebrow');
      if (eyebrow) eyebrow.textContent = `競案 ${index + 1}`;
    });
  }

  function cleanupClone() {
    const clone = document.getElementById(CLONE_ID);
    if (!clone) return;

    clone.querySelectorAll('.hiyes-pdf-page-header,.hiyes-pdf-page-footer,.hiyes-custom-print-header,.hiyes-custom-print-footer').forEach((el) => el.remove());

    clone.querySelectorAll('*').forEach((el) => {
      clearVisualNoise(el);
    });
    clearVisualNoise(clone);
    whiteBackground(clone);

    clone.querySelectorAll([
      '.report-section',
      '.cover-section',
      '.briefing-main',
      '.briefing-summary',
      '.briefing-section',
      '.brief-card-grid',
      '.summary-grid',
      '.briefing-summary-grid',
      '.case-grid',
      '.price-grid',
      '.product-grid',
      '.swot-brief-grid',
      '.hiyes-case-repaired',
      '.hiyes-price-repaired',
      '.hiyes-swot-two-card'
    ].join(',')).forEach((el) => {
      clearBackground(el);
      clearVisualNoise(el);
    });

    clone.querySelectorAll([
      '.metric-card',
      '.metric-card.priority-high',
      '.metric-card.priority-mid',
      '.info-card',
      '.info-card.accent',
      '.brief-data-card',
      '.brief-data-card.case',
      '.brief-data-card.price',
      '.brief-data-card.swot',
      '.brief-data-card.product-card',
      '.hiyes-case-card',
      '.hiyes-market-summary-card',
      '.hiyes-price-card',
      '.hiyes-price-summary-card',
      '.hiyes-swot-card',
      '.advantage-card',
      '.resistance-card',
      '.brief-kv',
      '.brief-kv.priority-high',
      '.brief-kv.priority-mid',
      '.brief-body-text'
    ].join(',')).forEach((el) => {
      whiteBackground(el);
      clearVisualNoise(el);
    });

    cleanupCompetitionCards(clone);

    const brandRow = clone.querySelector('.report-brand-row');
    if (brandRow) {
      setStyle(brandRow, 'display', 'flex');
      setStyle(brandRow, 'flex-direction', 'row');
      setStyle(brandRow, 'align-items', 'center');
      setStyle(brandRow, 'justify-content', 'space-between');
      setStyle(brandRow, 'background', '#005BAC');
      setStyle(brandRow, 'background-color', '#005BAC');
      setStyle(brandRow, 'background-image', 'none');
      setStyle(brandRow, 'color', '#fff');
      clearVisualNoise(brandRow);
    }

    const lockup = clone.querySelector('.report-brand-lockup');
    if (lockup) {
      setStyle(lockup, 'display', 'flex');
      setStyle(lockup, 'flex-direction', 'row');
      setStyle(lockup, 'align-items', 'center');
      setStyle(lockup, 'justify-content', 'flex-start');
      setStyle(lockup, 'gap', '12px');
      clearBackground(lockup);
      clearVisualNoise(lockup);
    }

    const mark = clone.querySelector('.report-brand-mark');
    if (mark) {
      setStyle(mark, 'display', 'grid');
      setStyle(mark, 'place-items', 'center');
      setStyle(mark, 'width', '36px');
      setStyle(mark, 'height', '36px');
      setStyle(mark, 'min-width', '36px');
      setStyle(mark, 'border-radius', '12px');
      setStyle(mark, 'background', '#E8F4FF');
      setStyle(mark, 'background-color', '#E8F4FF');
      setStyle(mark, 'background-image', 'none');
      setStyle(mark, 'color', '#005BAC');
      setStyle(mark, 'font-size', '20px');
      setStyle(mark, 'font-weight', '900');
      setStyle(mark, 'line-height', '1');
      clearVisualNoise(mark);
    }

    const side = clone.querySelector('.report-brand-side');
    if (side) {
      setStyle(side, 'margin-left', 'auto');
      setStyle(side, 'align-items', 'flex-end');
      setStyle(side, 'text-align', 'right');
      clearBackground(side);
      clearVisualNoise(side);
    }

    ensureCustomChrome(clone);

    let style = clone.querySelector('style[data-pdf-cleanup="true"]');
    if (!style) {
      style = document.createElement('style');
      style.setAttribute('data-pdf-cleanup', 'true');
      clone.prepend(style);
    }
    style.textContent = `
      #${CLONE_ID} *,
      #${CLONE_ID} *::before,
      #${CLONE_ID} *::after {
        box-shadow: none !important;
        filter: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      #${CLONE_ID} .hiyes-pdf-page-header,
      #${CLONE_ID} .hiyes-pdf-page-footer {
        display: none !important;
      }
      #${CLONE_ID} .report-section::before,
      #${CLONE_ID} .report-section::after,
      #${CLONE_ID} .briefing-section::before,
      #${CLONE_ID} .briefing-section::after,
      #${CLONE_ID} .brief-card-grid::before,
      #${CLONE_ID} .brief-card-grid::after,
      #${CLONE_ID} .summary-grid::before,
      #${CLONE_ID} .summary-grid::after,
      #${CLONE_ID} .metric-card::before,
      #${CLONE_ID} .metric-card::after,
      #${CLONE_ID} .brief-data-card::before,
      #${CLONE_ID} .brief-data-card::after,
      #${CLONE_ID} .brief-kv::before,
      #${CLONE_ID} .brief-kv::after {
        display: none !important;
        content: none !important;
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
      }
    `;
  }

  window.addEventListener('beforeprint', () => {
    cleanupClone();
    setTimeout(cleanupClone, 0);
  });

  window.addEventListener('afterprint', removeCustomChrome);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectReportMakerControl);
  } else {
    injectReportMakerControl();
  }

  const observer = new MutationObserver(() => {
    clearTimeout(window.__hiyesReportMakerPanelTimer);
    window.__hiyesReportMakerPanelTimer = setTimeout(injectReportMakerControl, 250);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
