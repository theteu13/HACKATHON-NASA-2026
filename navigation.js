// Keep sidebar navigation aligned with the visible page section.
(() => {
  const links = [...document.querySelectorAll('.nav-item')];
  if (!links.length) return;
  const details = document.getElementById('crew-health');
  const operations = document.getElementById('operations-dialog');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const targets = links.map(link => ({ link, target: document.querySelector(link.getAttribute('href')) }));
  const indicator = document.querySelector('.nav-indicator');
  let frame = null;

  function activate(link) {
    links.forEach(item => {
      item.classList.toggle('active', item === link);
      if (item === link) item.setAttribute('aria-current', 'location');
      else item.removeAttribute('aria-current');
    });
    if (indicator && indicator.parentElement !== link) link.append(indicator);
  }

  function update() {
    frame = null;
    // A cabin dialog is the active destination until it closes.
    if (operations.open && document.querySelector('.nav-item.active')?.getAttribute('href') === '#cabin-tools') return;
    const visible = targets.filter(({target}) => target && target.getClientRects().length)
      .sort((a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top);
    const readingLine = Math.min(150, window.innerHeight * 0.25);
    let current = visible[0];
    for (const item of visible) {
      if (item.target.getBoundingClientRect().top <= readingLine) current = item;
    }
    // Short final sections may never reach the reading line at the page bottom.
    const scroller = document.scrollingElement;
    if (scroller.scrollHeight > scroller.clientHeight + 2 &&
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) current = visible.at(-1);
    if (current) activate(current.link);
  }

  function schedule() {
    if (frame === null) frame = window.requestAnimationFrame(update);
  }

  function navigate(link, changeHash = true) {
    const entry = targets.find(item => item.link === link);
    if (!entry?.target) return;
    if (details.contains(entry.target)) {
      setMonitoringScope('individual');
      details.open = true;
    }
    activate(link);
    if (changeHash) window.history.replaceState(null, '', link.getAttribute('href'));
    entry.target.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
    if (link.getAttribute('href') === '#cabin-tools') openCabin();
    schedule();
  }

  links.forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate(link);
  }));
  document.getElementById('open-cabin').addEventListener('click', () => {
    const cabinLink = links.find(link => link.getAttribute('href') === '#cabin-tools');
    if (cabinLink) activate(cabinLink);
  });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  details.addEventListener('toggle', schedule);
  operations.addEventListener('close', schedule);
  window.addEventListener('hashchange', () => {
    const link = links.find(item => item.getAttribute('href') === window.location.hash);
    if (link) navigate(link, false);
  });
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.querySelector('main'));
  const initial = links.find(link => link.getAttribute('href') === window.location.hash);
  if (initial) navigate(initial, false);
  else schedule();
})();
