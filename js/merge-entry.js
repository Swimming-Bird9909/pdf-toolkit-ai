document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href]');
  if (!link || link.origin !== location.origin || link.pathname !== '/tools/merge.html' || link.target || link.hasAttribute('download')) return;
  link.setAttribute('aria-busy', 'true');
});

window.addEventListener('pageshow', () => {
  document.querySelectorAll('a[href$="/merge.html"][aria-busy]').forEach(link => link.removeAttribute('aria-busy'));
});
