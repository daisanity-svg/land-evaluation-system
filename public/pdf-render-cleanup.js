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

  function findMetricValue(clone, label) {
    const cards = Array.from(clone.querySelectorAll('.metric-card'));
    for (const card of cards) {
      const small = clean(card.querySelector('small')?.textContent);
      if (small.includes(label)) return clean(card.querySelector('strong')?.textContent);
    }
    return '';
  }

  function reportTitle(clone) {
    const land = findMetricValue(clone, '標的地號');
    const title = clean(document.title).replace(/\.pdf$/i, '');
    if (title && !/土地評估系統|海悅廣告/.test(title)) return title;
    return land ? `${land}_土地評估報告` : '土地評估報告';
  }

  function ensureHeaderFooter(clone) {
    clone.querySelectorAll('.hiyes-pdf-page-header,.hiyes-pdf-page-footer').forEach((el) => el.remove());

    const header = document.createElement('div');
    header.className = 'hiyes-pdf-page-header';
    header.innerHTML = '<span class="hiyes-pdf-header-date"></span><span class="hiyes-pdf-header-title"></span><span></span>';
    setText(header.querySelector('.hiyes-pdf-header-date'), formatDateTime());
    setText(header.querySelector('.hiyes-pdf-header-title'), reportTitle(clone));

    const footer = document.createElement('div');
    footer.className = 'hiyes-pdf-page-footer';
    footer.innerHTML = '<span class="hiyes-pdf-footer-url"></span><span class="hiyes-pdf-footer-page"></span>';
    setText(footer.querySelector('.hiyes-pdf-footer-url'), location.origin + '/?utm_source=chatgpt.com');

    clone.prepend(header);
    clone.appendChild(footer);
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

    // Hard reset every visual effect first. This targets the PDF-only pale blue blocks
    // produced by shadows/filters/background layers in Chrome print rendering.
    clone.querySelectorAll('*').forEach((el) => {
      clearVisualNoise(el);
    });
    clearVisualNoise(clone);

    // Keep the PDF page itself white.
    whiteBackground(clone);

    // Remove only outer/wrapper backgrounds; do not change layout, dimensions or data.
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

    // Data cards stay white with their existing borders/text. This avoids large color fields
    // while preserving the current card arrangement.
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

    // Restore the elegant H mark in the header. The earlier clone cleanup made this transparent.
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

    ensureHeaderFooter(clone);

    // Remove pseudo visual layers by class-level CSS injected directly into the clone.
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
      #${CLONE_ID} .hiyes-pdf-page-header {
        position: fixed !important;
        top: -9mm !important;
        left: 0 !important;
        right: 0 !important;
        height: 6mm !important;
        display: grid !important;
        grid-template-columns: 1fr 2fr 1fr !important;
        align-items: center !important;
        background: #fff !important;
        color: #111 !important;
        font-size: 9px !important;
        line-height: 1 !important;
        z-index: 99999 !important;
      }
      #${CLONE_ID} .hiyes-pdf-header-date {
        text-align: left !important;
      }
      #${CLONE_ID} .hiyes-pdf-header-title {
        text-align: center !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      #${CLONE_ID} .hiyes-pdf-page-footer {
        position: fixed !important;
        left: 0 !important;
        right: 0 !important;
        bottom: -13mm !important;
        height: 7mm !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        background: #fff !important;
        color: #111 !important;
        font-size: 8px !important;
        line-height: 1 !important;
        z-index: 99999 !important;
      }
      #${CLONE_ID} .hiyes-pdf-footer-page::after {
        content: counter(page) '/' counter(pages) !important;
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
    // Chrome sometimes builds the print snapshot just after beforeprint listeners.
    // Run one extra micro cleanup pass without changing layout.
    setTimeout(cleanupClone, 0);
  });
})();
