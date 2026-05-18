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

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || '土地評估簡表.xlsx';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function safeName(value) {
    return String(value || '')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, '')
      .slice(0, 90);
  }

  async function downloadExcel() {
    const state = getState();
    const reportId = getReportId(state);
    const form = state?.form || {};

    if (!hasReport(state)) {
      alert('請先載入或貼上土地評估報告後再下載 Excel 簡表。');
      return;
    }

    const payload = {
      report_id: reportId,
      client: form.client || '',
      land_number: form.landNumber || '',
      research_date: form.researchDate || '',
      summary: form.summary || null,
      report_text: form.reportText || '',
    };

    try {
      const endpoint = reportId
        ? `/api/reports/${encodeURIComponent(reportId)}/excel`
        : '/api/reports/manual/excel';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Excel 下載失敗：${response.status}`);
      }

      const blob = await response.blob();
      const filename = safeName(`${form.client || '土地評估'}-${form.landNumber || reportId || '手動貼上'}-土地評估簡表-${form.researchDate || ''}.xlsx`);
      downloadBlob(blob, filename || '土地評估簡表.xlsx');
    } catch (error) {
      alert(error.message || 'Excel 下載失敗，請稍後再試。');
    }
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
  document.addEventListener('input', () => setTimeout(injectButton, 200));

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleInject);
  } else {
    scheduleInject();
  }
})();
