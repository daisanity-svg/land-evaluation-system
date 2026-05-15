(function () {
  const CLONE_ID = 'hiyes-print-report-clone';

  function setStyle(el, prop, value) {
    if (!el || !el.style) return;
    el.style.setProperty(prop, value, 'important');
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
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

  function formatPrintDate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${day} ${hh}:${mm}`;
  }

  function getPrintTitle() {
    const title = clean(document.title || '海悅廣告｜土地評估系統');
    if (!title || title === 'land-evaluation-system') return '海悅廣告｜土地評估系統';
    return title.replace(/\s*-\s*Google Chrome$/i, '').slice(0, 80);
  }

  function removeExistingPrintChrome(root) {
    const selector = '.hiyes-pdf-page-header,.hiyes-pdf-page-footer,.hiyes-custom-print-header,.hiyes-custom-print-footer,.hiyes-native-safe-print-header,.hiyes-native-safe-print-footer';
    document.querySelectorAll(selector).forEach((el) => el.remove());
    if (root) root.querySelectorAll(selector).forEach((el) => el.remove());
  }

  function ensurePrintChrome(clone) {
    removeExistingPrintChrome(clone);

    const header = document.createElement('div');
    header.className = 'hiyes-native-safe-print-header';
    header.innerHTML = `
      <span class="hiyes-print-header-left"></span>
      <span class="hiyes-print-header-center"></span>
      <span class="hiyes-print-header-right"></span>
    `;
    header.querySelector('.hiyes-print-header-left').textContent = formatPrintDate();
    header.querySelector('.hiyes-print-header-center').textContent = getPrintTitle();

    const footer = document.createElement('div');
    footer.className = 'hiyes-native-safe-print-footer';
    footer.innerHTML = `
      <span class="hiyes-print-footer-left">https://land-evaluation-system.vercel.app</span>
      <span class="hiyes-print-footer-center">海悅廣告｜土地評估系統</span>
      <span class="hiyes-print-footer-right hiyes-print-page-number"></span>
    `;

    document.body.appendChild(header);
    document.body.appendChild(footer);
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

  function installPrintSafeAreaStyle(clone) {
    let style = clone.querySelector('style[data-pdf-cleanup="true"]');
    if (!style) {
      style = document.createElement('style');
      style.setAttribute('data-pdf-cleanup', 'true');
      clone.prepend(style);
    }

    style.textContent = `
      @media print {
        /* Keep report content inside a safe print area and place the app-controlled
           header/footer in the page margin. Do not rely on Chrome native headers,
           because the app's PDF export path does not always embed them. */
        @page { size: A4; margin: 18mm 10mm 16mm; }

        html, body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        #${CLONE_ID} {
          transform: none !important;
          zoom: 1 !important;
          box-sizing: border-box !important;
        }

        .hiyes-native-safe-print-header,
        .hiyes-native-safe-print-footer {
          position: fixed !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 2147483647 !important;
          display: grid !important;
          grid-template-columns: 1fr 2fr 1fr !important;
          align-items: center !important;
          height: 8mm !important;
          padding: 0 2mm !important;
          box-sizing: border-box !important;
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          color: #111 !important;
          font-family: 'Times New Roman', 'PMingLiU', '新細明體', serif !important;
          font-size: 10px !important;
          font-weight: 400 !important;
          line-height: 1 !important;
          box-shadow: none !important;
          filter: none !important;
          pointer-events: none !important;
        }

        .hiyes-native-safe-print-header {
          top: -14mm !important;
        }

        .hiyes-native-safe-print-footer {
          bottom: -12mm !important;
        }

        .hiyes-print-header-left,
        .hiyes-print-footer-left {
          text-align: left !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        .hiyes-print-header-center,
        .hiyes-print-footer-center {
          text-align: center !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        .hiyes-print-header-right,
        .hiyes-print-footer-right {
          text-align: right !important;
          white-space: nowrap !important;
        }

        .hiyes-print-page-number::after {
          content: counter(page) '/' counter(pages) !important;
        }

        #${CLONE_ID} *,
        #${CLONE_ID} *::before,
        #${CLONE_ID} *::after {
          box-shadow: none !important;
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
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
      }
    `;
  }

  function cleanupClone() {
    const clone = document.getElementById(CLONE_ID);
    if (!clone) return;

    removeExistingPrintChrome(clone);

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

    installPrintSafeAreaStyle(clone);
    ensurePrintChrome(clone);
  }

  window.addEventListener('beforeprint', () => {
    cleanupClone();
    setTimeout(cleanupClone, 0);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      removeExistingPrintChrome();
    });
  } else {
    removeExistingPrintChrome();
  }
})();
