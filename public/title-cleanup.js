(function () {
  function updateTitle() {
    document.querySelectorAll('.app-title').forEach(function (el) {
      if ((el.textContent || '').trim() === '土地評估業主版報告系統') {
        el.textContent = '土地評估報告系統';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateTitle);
  } else {
    updateTitle();
  }

  var timer;
  var observer = new MutationObserver(function () {
    clearTimeout(timer);
    timer = setTimeout(updateTitle, 80);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
