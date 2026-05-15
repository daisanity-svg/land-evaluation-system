(function () {
  const CLONE_ID = 'hiyes-print-report-clone';

  function setStyle(el, prop, value) {
    if (!el || !el.style) return;
    el.style.setProperty(prop, value, 'important');
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
