// Presentation only: existing timing, samples, calculations and exports are untouched.
const section = document.getElementById('sample-section');
const body = document.getElementById('results-body');
const toggle = document.getElementById('samples-toggle');

function refreshSamples() {
  const rows = [...body.rows];
  rows.sort((a, b) => Number(b.cells[0].textContent) - Number(a.cells[0].textContent));
  // Reorder only if necessary, to avoid triggering our observer repeatedly.
  if (rows.some((row, index) => body.rows[index] !== row)) {
    observer.disconnect();
    body.replaceChildren(...rows);
    observer.observe(body, { childList: true });
  }
  rows.forEach((row, index) => row.classList.toggle('recent-sample', index < 2));
  document.getElementById('sample-count').textContent = rows.length + ' sample' + (rows.length === 1 ? '' : 's');
  document.getElementById('samples-empty').hidden = rows.length > 0;
  toggle.hidden = rows.length <= 2;
  if (rows.length <= 2) section.classList.remove('expanded');
  const expanded = section.classList.contains('expanded');
  toggle.setAttribute('aria-expanded', String(expanded));
  toggle.textContent = expanded ? 'Show fewer samples' : 'Show all samples (' + rows.length + ')';
}
const observer = new MutationObserver(refreshSamples);
observer.observe(body, { childList: true });
toggle.addEventListener('click', () => { section.classList.toggle('expanded'); refreshSamples(); });

const nav = document.querySelector('nav');
function refreshNavigation() {
  nav.querySelectorAll('.tab-btn').forEach(button => {
    if (button.classList.contains('active')) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}
new MutationObserver(refreshNavigation).observe(nav, { subtree: true, attributes: true, attributeFilter: ['class'] });
refreshNavigation();
refreshSamples();
