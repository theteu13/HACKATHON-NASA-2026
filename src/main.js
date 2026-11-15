// Bind dashboard controls and perform the initial render.
'use strict';
document.getElementById('connect-api')?.addEventListener('click',openConnection);
document.getElementById('refresh-data')?.addEventListener('click',refreshData);
document.getElementById('return-demo')?.addEventListener('click',()=>{if(!busy)disconnect();});
document.querySelectorAll('[data-period]').forEach(b=>b.addEventListener('click',()=>{period=Number(b.dataset.period);document.querySelectorAll('[data-period]').forEach(p=>p.classList.toggle('selected',p===b));renderChart();}));
document.getElementById('notifications').addEventListener('click',()=>toast('Source: '+(dataState.source==='demo'?'upstream demo snapshot':'connected API')+'. See the crew overview for general status.'));
// Capture validation events so dynamic forms also use English browser messages.
document.addEventListener('input', event => { if (event.target.setCustomValidity) event.target.setCustomValidity(''); });
document.addEventListener('invalid', event => {
  const field = event.target; field.setCustomValidity('');
  if (field.validity.valueMissing) field.setCustomValidity('Please complete this field.');
  else if (field.validity.badInput || field.validity.typeMismatch) field.setCustomValidity('Please enter a valid value.');
  else if (field.validity.rangeUnderflow) field.setCustomValidity('Please enter a value of '+field.min+' or higher.');
  else if (field.validity.rangeOverflow) field.setCustomValidity('Please enter a value of '+field.max+' or lower.');
  else if (field.validity.stepMismatch) field.setCustomValidity('Please enter a value in increments of '+field.step+'.');
}, true);
render();

if (window.COSMOMEDIC_CONFIG?.autoConnect) {
  connectToSource(window.COSMOMEDIC_CONFIG.apiOrigin, window.COSMOMEDIC_CONFIG.dataset).catch(error => toast(error.message));
}
