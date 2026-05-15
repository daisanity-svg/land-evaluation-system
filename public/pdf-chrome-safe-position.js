(function () {
  const CLONE_ID = 'hiyes-print-report-clone';
  const STYLE_ID = 'hiyes-pdf-chrome-safe-position-style';

  function applySafePosition() {
    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    style.textContent = `
      @media print {
        /* Keep the custom chrome in the same visual zone as Chrome's native header/footer.
           This only adjusts chrome placement and printable safe area. It does not alter
           report content, report fields, card mapping, submitReport, or summary JSON. */
        @page { size: A4; margin: 16mm 10mm 18mm; }

        #${CLONE_ID} {
          transform: none !important;
          zoom: 1 !important;
          box-sizing: border-box !important;
        }

        #${CLONE_ID} .hiyes-custom-print-header {
          top: 3mm !important;
          left: 10mm !important;
          right: 10mm !important;
        }

        #${CLONE_ID} .hiyes-custom-print-footer {
          bottom: 4mm !important;
          left: 10mm !important;
          right: 10mm !important;
        }
      }
    `;
  }

  window.addEventListener('beforeprint', function () {
    applySafePosition();
    setTimeout(applySafePosition, 0);
    setTimeout(applySafePosition, 80);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySafePosition);
  } else {
    applySafePosition();
  }
})();
