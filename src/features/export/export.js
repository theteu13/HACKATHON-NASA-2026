'use strict';

// Use the browser's local PDF output, keeping the selected scope and filters.
// beforeprint also covers the browser's own Print / Ctrl+P command.
(() => {
  const stamp = document.createElement('p');
  stamp.className = 'export-stamp';
  document.querySelector('.page-heading').after(stamp);
  window.addEventListener('beforeprint', () => {
    stamp.textContent = 'CosmoMedic | Exported ' + new Date().toLocaleString('en-GB', {
      timeZone: 'UTC', year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }) + ' UTC | Current view and filters. Expand any additional sections before exporting.';
  });
  document.getElementById('export-pdf')?.addEventListener('click', () => window.print());
})();
