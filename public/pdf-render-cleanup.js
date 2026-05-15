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

  function installNativeChromeSafeAreaStyle(clone) {
    let style = clone.querySelector('style[data-pdf-cleanup="true"]');
    if (!style) {
      style = document.createElement('style');
      style.setAttribute('data-pdf-cleanup', 'true');
      clone.prepend(style);
    }

    style.textContent = `
      @media print {
        /* Use Chrome native print header/footer only.
           This margin is the safe area between the browser's own header/footer and the report body. */
        @page { size: A4; margin: 20mm 10mm 20mm; }

        html, body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        #${CLONE_ID} {
          transform: none !important;
          zoom: 1 !important;
          box-sizing: border-box !important;
        }

        /* Remove all custom page chrome previously injected by this app.
           Chrome's native header/footer is controlled by the print dialog option. */
        #${CLONE_ID} .hiyes-pdf-page-header,
        #${CLONE_ID} .hiyes-pdf-page-footer,
        #${CLONE_ID} .hiyes-custom-print-header,
        #${CLONE_ID} .hiyes-custom-print-footer,
        .hiyes-pdf-page-header,
        .hiyes-pdf-page-footer,
        .hiyes-custom-print-header,
        .hiyes-custom-print-footer {
          display: none !important;
          visibility: hidden !important;
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

    // Remove all app-created page chrome. The user wants Chrome's native print header/footer.
    document.querySelectorAll('.hiyes-pdf-page-header,.hiyes-pdf-page-footer,.hiyes-custom-print-header,.hiyes-custom-print-footer').forEach((el) => el.remove());
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

    installNativeChromeSafeAreaStyle(clone);
  }

  window.addEventListener('beforeprint', () => {
    cleanupClone();
    setTimeout(cleanupClone, 0);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.hiyes-custom-print-header,.hiyes-custom-print-footer').forEach((el) => el.remove());
    });
  } else {
    document.querySelectorAll('.hiyes-custom-print-header,.hiyes-custom-print-footer').forEach((el) => el.remove());
  }
})();
