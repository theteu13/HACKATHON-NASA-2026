'use strict';
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format = value => typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value) : '—';
const seed = window.COSMOMEDIC_DEMO;
const demoStorageKey = 'cosmomedic-app-logs-v1';
let localLogs = [], client = null, selected, crew = [], period = 7, sessionVersion = 0, busy = false, toastTimer;
let dataState, viewMode = 'astronaut';
try { const saved = JSON.parse(localStorage.getItem(demoStorageKey) || '[]'); localLogs = Array.isArray(saved) ? saved.filter(l => HealthData.validDemoLog(l) && seed.astronauts.some(a => a.id === l.astronautId)) : []; } catch { localLogs = []; }
function demoSnapshot() {
  const logs = [...seed.logs, ...localLogs];
  return { source: 'demo', mission: seed.mission, summaries: seed.dailySummaries, environments: seed.environmentReadings,
    crew: seed.astronauts.map(a => HealthData.appPerson(a, logs,
      seed.dailySummaries.find(s => s.astronautId === a.id && s.missionDay === seed.mission.today) || {}, seed.mission.today)) };
}
function commitSnapshot(snapshot) {
  const previousId = selected?.id;
  dataState = snapshot; crew = snapshot.crew; selected = crew.find(c => c.id === previousId) || crew[0];
  if (!selected) throw new Error('No crew is available in this dataset.');
}
commitSnapshot(demoSnapshot());
function current() { return selected; }
function toast(message) { clearTimeout(toastTimer); const el = document.getElementById('toast'); el.textContent = message; el.hidden = false; toastTimer = setTimeout(() => el.hidden = true, 6500); }
function provenanceLabel(value) { return ({ SIMULATED_TELEMETRY: 'Simulated telemetry', USER_REPORTED: 'User reported', RULE_DERIVED: 'Rule derived', REAL_RESEARCH_DATA: 'Research data' })[value] || 'No provenance'; }
function renderCrew() {
  document.getElementById('crew-list').innerHTML = crew.map((c, i) => `<button class="crew-card ${c.id === selected.id ? 'selected' : ''}" data-crew="${escapeHTML(c.id)}" aria-pressed="${c.id === selected.id}"><span class="avatar ${i % 2 ? 'alternate' : ''}">${portrait({skin:'#d6a584',hair:'#332531'})}</span><span class="crew-info"><strong>${escapeHTML(c.name)}</strong><small>${escapeHTML(c.crewId || c.role)}</small></span><span class="crew-indicator">${c.id === selected.id ? 'Selected' : 'View'}</span></button>`).join('');
  document.querySelectorAll('[data-crew]').forEach(button => button.addEventListener('click', () => { selected = crew.find(c => c.id === button.dataset.crew); render(); }));
}
function metricNote(m) {
  if (m.unsupported) return 'Not available in the app schema';
  if (m.value === null) return 'Not recorded';
  return `${m.missionDay ? 'Mission day ' + m.missionDay + ' · ' : ''}${provenanceLabel(m.provenance)}`;
}
function renderMetrics() {
  const m = selected.metrics;
  const definitions = [
    ['Blood pressure','heart',m.systolic.value === null ? '—' : `${format(m.systolic.value)}/${format(m.diastolic.value)}`,'mmHg',m.systolic],
    ['Heart rate','activity',format(m.heart.value),'bpm',m.heart],
    ['Blood glucose','drop',format(m.glucose.value),'mg/dL',m.glucose],
    ['Body temperature','temperature',format(m.temperature.value),'°C',m.temperature],
    ['Daily sleep','moon',format(m.sleep.value),'h',m.sleep],
    ['Mood','smile',format(m.mood.value),'/5',m.mood]
  ];
  document.getElementById('metrics').innerHTML = definitions.map(([title, symbol, value, unit, metric]) => `<article class="metric"><div class="metric-top"><span class="metric-icon">${icon(symbol)}</span><span class="metric-tag">${metric.unsupported ? 'UNSUPPORTED' : 'REQUIRED'}</span></div><h3>${title}</h3><div class="metric-value">${value}<small>${unit}</small></div><div class="metric-bottom">${escapeHTML(metricNote(metric))}</div>${title === 'Mood' && metric.value !== null ? `<div class="mood-dots" aria-label="${HealthData.moodLabels[metric.value] || 'Recorded mood'}">${Array.from({length:5},(_,i)=>`<span class="${i<metric.value?'filled':''}"></span>`).join('')}</div>` : ''}</article>`).join('');
}
function renderChart() {
  const day = dataState.mission.today, first = period === 0 ? 1 : Math.max(1, day - period + 1);
  const points = selected.history.filter(p => p.missionDay >= first && p.missionDay <= day && p.value !== null);
  document.getElementById('chart-period').textContent = `Mission days ${first}–${day}`;
  const container = document.getElementById('trend-chart');
  if (!points.length) { container.innerHTML = '<p class="empty-records">No heart-rate readings in this period.</p>'; return; }
  const low = Math.floor((Math.min(...points.map(p=>p.value)) - 5)/5)*5, high = Math.ceil((Math.max(...points.map(p=>p.value)) + 5)/5)*5;
  const x = p => first === day ? 270 : 35 + (p.missionDay-first)*470/(day-first), y = v => 120-(v-low)*100/(high-low);
  // Separate paths across missing mission days; gaps are never interpolated.
  const paths = []; let group = [];
  points.forEach((p,i)=>{ if(i && p.missionDay-points[i-1].missionDay>1){paths.push(group);group=[];}group.push(p); }); paths.push(group);
  container.innerHTML = `<svg viewBox="0 0 530 155" role="img" aria-label="Recorded heart rate for ${escapeHTML(selected.name)}. Mission days ${first} to ${day}. Gaps indicate missing readings.">${[0,1,2,3].map(i=>{const value=low+(high-low)*i/3;return `<line x1="35" x2="515" y1="${y(value)}" y2="${y(value)}" stroke="#aba8d814" stroke-dasharray="3 5"/><text x="5" y="${y(value)+3}" fill="#ABA8D8" font-size="9">${Math.round(value)}</text>`;}).join('')}${paths.map(g=>`<polyline points="${g.map(p=>`${x(p)},${y(p.value)}`).join(' ')}" fill="none" stroke="#A395FF" stroke-width="2"/>`).join('')}${points.map(p=>`<circle cx="${x(p)}" cy="${y(p.value)}" r="3" fill="#a395ff"><title>Day ${p.missionDay}: ${p.value} bpm</title></circle>`).join('')}${Array.from({length:Math.min(7,day-first+1)},(_,i)=>{const d=first+Math.round(i*(day-first)/Math.max(1,Math.min(7,day-first+1)-1));return `<text x="${x({missionDay:d})}" y="147" text-anchor="middle" fill="#ABA8D8" font-size="8">Day ${d}</text>`;}).join('')}</svg>`;
}
function renderAdditional() {
  document.getElementById('additional-metrics').innerHTML = [['bone','Bone density',selected.metrics.bone],['leaf','Nutrition',selected.metrics.nutrition],['shield','White blood cells',selected.metrics.immune]].map(([symbol,title,m])=>`<div class="additional-row"><span class="metric-icon">${icon(symbol)}</span><div class="additional-label"><strong>${title}</strong><small>${escapeHTML(metricNote(m))}</small></div><span class="additional-value">${format(m.value)}${m.value===null?'':' '+m.unit}</span></div>`).join('');
}
function renderRecords() {
  const rows = selected.logs.slice(-8).reverse();
  document.querySelector('.records-panel .subtle').textContent = dataState.source === 'demo' ? 'App-shaped demo logs' : 'Authenticated API records';
  document.getElementById('records-list').innerHTML = rows.length ? rows.map(l=>`<div class="record"><span>${icon('check')}</span><strong>${escapeHTML(({measurement:l.data.metric?.replaceAll('_',' '),sleep:'Sleep',mood:'Mood',meal:'Meal',exercise:'Exercise',radiation:'Radiation',injury:'Injury'})[l.type] || l.type)}</strong><small>Day ${l.missionDay} · ${escapeHTML(new Date(l.timestamp).toLocaleString('en-US',{dateStyle:'short',timeStyle:'short'}))}</small></div>`).join('') : '<p class="empty-records">No app logs available. Synthetic mission records are read-only.</p>';
}
function updateMissionUI() {
  const m = dataState.mission;
  document.querySelector('.mission strong').textContent = m.name.toUpperCase();
  document.querySelector('.mission small').textContent = m.destination || 'Mission';
  document.querySelector('.mission-summary > div:first-child strong').textContent = `${m.name} · ${m.destination || 'Mission'}`;
  document.querySelector('.mission-summary > div:first-child small').textContent = dataState.source === 'api-synthetic' ? 'Synthetic dataset · read-only' : 'CosmoMedic app data model';
  const stats = document.querySelectorAll('.summary-detail strong');
  stats[0].textContent = `${String(m.today).padStart(3,'0')} / ${m.lengthDays}`;
  stats[1].textContent = `${crew.length} ${crew.length === 1 ? 'astronaut' : 'astronauts'}`;
  stats[2].textContent = dataState.source === 'demo' ? 'Seed snapshot' : new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  const pct = Math.min(100,Math.round(m.today/m.lengthDays*100));
  document.querySelector('.mission-day').textContent = `DAY ${m.today} / ${m.lengthDays}`;
  document.querySelector('.progress i').style.width = `${pct}%`;
  document.querySelector('.sidebar-bottom > small').textContent = `${pct}% of mission completed`;
  document.querySelector('.section-heading h2').innerHTML = `Crew <span>${String(crew.length).padStart(2,'0')}</span>`;
  document.querySelector('.page-heading .eyebrow').textContent = `CREW HEALTH · ${m.name.toUpperCase()}`;
  document.querySelector('.header-date').textContent = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const label = dataState.source === 'demo' ? 'Demo · upstream seed' : dataState.source === 'api-app' ? 'API · CosmoMedic app' : 'API · synthetic mission';
  document.querySelector('.demo-badge').textContent = label;
  document.querySelector('.system-status').textContent = dataState.source === 'demo' ? 'Simulated telemetry' : 'API connected · source labeled';
  document.querySelector('footer > span:nth-child(2)').textContent = dataState.source === 'demo' ? 'Demo seed · fictional data · no clinical interpretation' : 'Authenticated API · provenance shown · not a medical device';
  document.getElementById('connection-status').textContent = `${label}${client ? ' · '+client.user.role : ''}`;
}
function render() {
  renderCrew(); updateMissionUI();
  const ground = viewMode === 'ground';
  if (ground) ['metrics','trend-chart','additional-metrics','records-list'].forEach(id=>document.getElementById(id).replaceChildren());
  else { renderMetrics();renderChart();renderAdditional();renderRecords(); }
  document.getElementById('astronaut-title').textContent = `Health overview: ${selected.name}`;
  document.getElementById('astronaut-subtitle').textContent = `${selected.crewId || selected.role} · ${provenanceLabel(selected.provenance)}`;
  document.getElementById('open-checkin').hidden = ground || dataState.source === 'api-synthetic';
  if (typeof renderCommand === 'function') renderCommand();
}
const connectionBar = document.createElement('section'); connectionBar.className = 'connection-bar';
connectionBar.innerHTML = '<span id="connection-status" role="status"></span><div><button class="text-button" id="connect-api">Connect API</button><button class="text-button" id="refresh-data" hidden>Refresh</button><button class="text-button" id="return-demo" hidden>Disconnect</button></div>';
document.querySelector('.mission-summary').before(connectionBar);
const connectionDialog = document.createElement('dialog');connectionDialog.id='connection-dialog';document.body.append(connectionDialog);
function openConnection() {
  connectionDialog.innerHTML = `<form id="connection-form"><div class="panel-heading"><div><p class="eyebrow">COSMOMEDIC DATA</p><h2>Connect to the backend</h2></div><button type="button" class="icon-button" id="close-connection" aria-label="Close">✕</button></div><p class="form-description">Sign in with an existing backend account. Your role determines access. Tokens stay in memory for this session.</p><label class="task-label">API origin<input name="origin" type="url" value="http://127.0.0.1:8000" placeholder="https://your-api.example" required></label><label class="task-label">Dataset<select name="dataset"><option value="app">CosmoMedic app · Orbit-3</option><option value="synthetic">Synthetic mission · all six vital signs</option></select></label><div class="form-grid"><label>Username / Crew ID<input name="username" autocomplete="username" required maxlength="100"></label><label>Password / PIN<input name="password" type="password" autocomplete="current-password" required maxlength="128"></label></div><p class="command-note">App and synthetic IDs are separate. Use a matching account. HTTP is accepted only for localhost development.</p><p id="connection-error" role="alert"></p><button class="button primary" id="submit-connection">Sign in and load data</button></form>`;
  document.getElementById('close-connection').addEventListener('click',()=>connectionDialog.close());
  document.getElementById('connection-form').addEventListener('submit',connectAPI);
  connectionDialog.showModal();
}
async function connectAPI(event) {
  event.preventDefault(); if(busy)return; busy=true; const version=++sessionVersion;
  const form=event.target, values=Object.fromEntries(new FormData(form));
  const button=document.getElementById('submit-connection'); button.disabled=true;button.textContent='Connecting…';
  document.getElementById('connection-error').textContent='';
  try {
    const nextClient=new HealthData.Client(values.origin);await nextClient.login(values.username,values.password);
    const snapshot=await (values.dataset==='app'?nextClient.loadApp():nextClient.loadSynthetic());
    if(version!==sessionVersion)return;
    client=nextClient;viewMode=client.user.role==='astronaut'?'astronaut':'ground';commitSnapshot(snapshot);
    document.getElementById('refresh-data').hidden=false;document.getElementById('return-demo').hidden=false;
    form.reset();connectionDialog.close();document.getElementById('checkin-dialog').close();render();toast('Connected. Showing data from the selected API dataset.');
  } catch(error) { document.getElementById('connection-error').textContent=error.message; }
  finally { busy=false;button.disabled=false;button.textContent='Sign in and load data'; }
}
async function refreshData() {
  if(!client || busy)return;busy=true;const version=sessionVersion;
  document.getElementById('refresh-data').disabled=true;
  try {const snapshot=await (dataState.source==='api-app'?client.loadApp():client.loadSynthetic(dataState.mission.id));if(version===sessionVersion){commitSnapshot(snapshot);render();toast('API data refreshed.');}}
  catch(error){toast(error.message);document.getElementById('connection-status').textContent='Refresh failed · displayed data may be stale';}
  finally{busy=false;document.getElementById('refresh-data').disabled=false;}
}
function disconnect() {
  sessionVersion++;if(client){client.token=null;client.user=null;}client=null;viewMode='astronaut';
  document.getElementById('checkin-dialog').close();document.getElementById('operations-dialog')?.close();
  commitSnapshot(demoSnapshot());document.getElementById('refresh-data').hidden=true;document.getElementById('return-demo').hidden=true;render();toast('Disconnected. Returned explicitly to the demo dataset.');
}
const dialog=document.getElementById('checkin-dialog'), form=document.getElementById('checkin-form');
function logFields(kind) {
  const input=(label,name,min,max,step='1')=>`<label>${label}<input name="${name}" type="number" min="${min}" ${max?'max="'+max+'"':''} step="${step}" required></label>`;
  if(kind==='blood_pressure')return input('Systolic pressure (mmHg)','systolic',60,250)+input('Diastolic pressure (mmHg)','diastolic',30,150)+input('Pulse (bpm)','pulse',30,220);
  if(kind==='mood')return '<label class="full-width">How are you feeling?<select name="level" required><option value="">Select mood</option>'+Object.entries(HealthData.moodLabels).map(([level,label])=>`<option value="${level}">${level} · ${label}</option>`).join('')+'</select></label>';
  if(kind==='sleep')return '<label>Bedtime (local time)<input name="bedtime" type="datetime-local" required></label><label>Wake time (local time)<input name="wakeTime" type="datetime-local" required></label>'+input('Sleep quality (1–5)','quality',1,5);
  return input('Bone density (g/cm²)','value',0.001,null,'0.001');
}
function openCheckin() {
  if(viewMode==='ground'||dataState.source==='api-synthetic')return;
  form.innerHTML=`<div class="panel-heading"><div><p class="eyebrow">APP HEALTH LOG</p><h2>Daily check-in</h2></div><button type="button" class="icon-button" id="close-checkin" aria-label="Close">✕</button></div><p class="form-description">Record a log for <strong>${escapeHTML(selected.name)}</strong>. Each type is saved independently, matching the app.</p><label class="task-label">Log type<select id="log-kind" name="kind"><option value="blood_pressure">Blood pressure + pulse</option><option value="sleep">Sleep</option><option value="mood">Mood</option><option value="bone_density">Bone density · weekly</option></select></label><div class="form-grid" id="log-fields">${logFields('blood_pressure')}</div><p class="storage-note">${dataState.source==='demo'?'Demo only: fictional logs are saved in this browser.':'Saved to your authenticated app profile. Do not resubmit after a timeout until you refresh.'} Glucose and body temperature are not writable in the app schema.</p><p id="form-error" role="alert"></p><button class="button primary" id="save-log">Save log</button>`;
  document.getElementById('close-checkin').addEventListener('click',()=>dialog.close());
  document.getElementById('log-kind').addEventListener('change',e=>{document.getElementById('log-fields').innerHTML=logFields(e.target.value);document.getElementById('form-error').textContent='';});
  dialog.showModal();
}
form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||viewMode==='ground'||dataState.source==='api-synthetic')return;
  const values=Object.fromEntries(new FormData(form));let payload;
  try{payload=HealthData.buildLog(values.kind,values);}catch(error){document.getElementById('form-error').textContent=error.message;return;}
  const version=sessionVersion,personId=selected.id;busy=true;document.getElementById('save-log').disabled=true;
  try {
    if(client){
      await client.saveLog(payload);
      try{const snapshot=await client.loadApp();if(version===sessionVersion)commitSnapshot(snapshot);}
      catch(error){if(version===sessionVersion){dialog.close();toast('Log saved, but refresh failed. Do not submit again. '+error.message);document.getElementById('connection-status').textContent='Log saved · refresh required';}return;}
    } else {
      const data=structuredClone(payload.data);
      if(payload.type==='sleep')data.durationMin=Math.round((Date.parse(data.wakeTime)-Date.parse(data.bedtime))/60000);
      if(payload.type==='mood')data.label=HealthData.moodLabels[data.level].toLowerCase();
      const log={id:'demo-'+crypto.randomUUID(),astronautId:personId,type:payload.type,timestamp:new Date().toISOString(),missionDay:dataState.mission.today,environmentId:null,note:null,coinsEarned:10,data,provenance:'USER_REPORTED'};
      const next=[...localLogs,log];localStorage.setItem(demoStorageKey,JSON.stringify(next));localLogs=next;commitSnapshot(demoSnapshot());
    }
    if(version===sessionVersion){dialog.close();render();toast('App log saved successfully.');}
  } catch(error) {if(version===sessionVersion)document.getElementById('form-error').textContent=error.message;}
  finally {busy=false;const button=document.getElementById('save-log');if(button)button.disabled=false;}
});
document.getElementById('open-checkin').addEventListener('click',openCheckin);
document.getElementById('connect-api').addEventListener('click',openConnection);
document.getElementById('refresh-data').addEventListener('click',refreshData);
document.getElementById('return-demo').addEventListener('click',()=>{if(!busy)disconnect();});
document.querySelectorAll('[data-period]').forEach(b=>b.addEventListener('click',()=>{period=Number(b.dataset.period);document.querySelectorAll('[data-period]').forEach(p=>p.classList.toggle('selected',p===b));if(viewMode!=='ground')renderChart();}));
document.querySelectorAll('.nav-item').forEach(a=>a.addEventListener('click',()=>document.querySelectorAll('.nav-item').forEach(item=>item.classList.toggle('active',item===a))));
document.getElementById('notifications').addEventListener('click',()=>toast('Source: '+(dataState.source==='demo'?'upstream demo snapshot':'authenticated API')+'. See the crew overview for general status.'));
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
