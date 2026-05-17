(() => {
  const STORAGE_KEY = 'hiyes-land-evaluation-draft-v9-reading-mode';
  const BUTTON_ID = 'hiyes-excel-download-button';

  function getState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function hasReport(state) {
    return Boolean(state?.form?.reportText && String(state.form.reportText).trim());
  }

  function getReportId(state) {
    return String(state?.reportId || '').trim();
  }

  function downloadExcel() {
    const state = getState();
    const reportId = getReportId(state);
    if (!reportId) {
      alert('目前找不到 report_id，請先載入或回傳土地評估報告後再下載 Excel 簡表。');
      return;
    }
    window.location.href = `/api/reports/${encodeURIComponent(reportId)}/excel`;
  }

  function createButton() {
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.className = 'btn primary no-print';
    button.textContent = 'Excel 簡表';
    button.addEventListener('click', downloadExcel);
    return button;
  }

  function injectButton() {
    const state = getState();
    const existing = document.getElementById(BUTTON_ID);
    if (!hasReport(state)) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;

    const toolbars = Array.from(document.querySelectorAll('.preview-header .toolbar, .hero-actions'));
    const toolbar = toolbars[0] || toolbars[1];
    if (!toolbar) return;

    const pdfButton = Array.from(toolbar.querySelectorAll('button')).find((button) => /PDF/i.test(button.textContent || ''));
    const button = createButton();
    if (pdfButton?.nextSibling) {
      toolbar.insertBefore(button, pdfButton.nextSibling);
    } else {
      toolbar.appendChild(button);
    }
  }

  function scheduleInject() {
    window.requestAnimationFrame(() => {
      injectButton();
      setTimeout(injectButton, 400);
      setTimeout(injectButton, 1200);
    });
  }

  window.addEventListener('storage', scheduleInject);
  window.addEventListener('focus', scheduleInject);
  document.addEventListener('click', () => setTimeout(injectButton, 100));

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleInject);
  } else {
    scheduleInject();
  }
})();
