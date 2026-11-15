'use strict';
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format = value => typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value) : '—';
function provenanceLabel(value) { return ({ SIMULATED_TELEMETRY: 'Simulated telemetry', USER_REPORTED: 'User reported', RULE_DERIVED: 'Rule derived', REAL_RESEARCH_DATA: 'Research data' })[value] || 'No provenance'; }
