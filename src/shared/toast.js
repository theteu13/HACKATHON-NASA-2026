'use strict';
let toastTimer;
function toast(message) { clearTimeout(toastTimer); const el = document.getElementById('toast'); el.textContent = message; el.hidden = false; toastTimer = setTimeout(() => el.hidden = true, 6500); }
