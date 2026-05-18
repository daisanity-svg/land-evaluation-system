(() => {
  function normalizeReportInput(text) {
    let value = String(text || '').trim();
    if (!value) return '';

    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        value = parsed.report_text || parsed.reportText || parsed.text || parsed.report || value;
      }
    } catch {}

    return String(value)
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function looksLikeReportTextarea(element) {
    if (!element || element.tagName !== 'TEXTAREA') return false;
    const placeholder = element.getAttribute('placeholder') || '';
    const labelText = element.closest('label')?.innerText || '';
    return placeholder.includes('GPT 報告') || labelText.includes('完整土地評估報告');
  }

  document.addEventListener('paste', (event) => {
    const target = event.target;
    if (!looksLikeReportTextarea(target)) return;

    const pasted = event.clipboardData?.getData('text/plain') || '';
    const normalized = normalizeReportInput(pasted);
    if (!normalized) return;

    event.preventDefault();
    target.value = normalized;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }, true);

  window.hiyesNormalizeReportInput = normalizeReportInput;
})();
