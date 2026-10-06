// Print a faithful snapshot of the React report. No price or factual DOM overrides.
(() => {
 const id='hiyes-print-report-clone';
 const remove=()=>document.getElementById(id)?.remove();
 window.addEventListener('beforeprint',()=>{
  remove();
  const report=document.querySelector('.card-report.readable-report.briefing-report');
  if(!report)return;
  const clone=report.cloneNode(true);clone.id=id;clone.classList.add('hiyes-print-clone');
  document.body.appendChild(clone);
 });
 window.addEventListener('afterprint',remove);
})();
