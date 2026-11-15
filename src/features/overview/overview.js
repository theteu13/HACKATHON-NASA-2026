'use strict';
function renderCrew() {
  document.getElementById('crew-list').innerHTML = crew.map((c, i) => `<button class="crew-card ${c.id === selected.id ? 'selected' : ''}" data-crew="${escapeHTML(c.id)}" aria-pressed="${c.id === selected.id}"><span class="avatar ${i % 2 ? 'alternate' : ''}">${portrait({skin:'#d6a584',hair:'#332531'})}</span><span class="crew-info"><strong>${escapeHTML(c.name)}</strong><small>${escapeHTML(c.crewId || c.role)}</small></span><span class="crew-indicator">${c.id === selected.id ? 'Selected' : 'View'}</span></button>`).join('');
  document.querySelectorAll('[data-crew]').forEach(button => button.addEventListener('click', () => { if (typeof selectIndividualCrew === 'function') selectIndividualCrew(button.dataset.crew); else { selected = crew.find(c => c.id === button.dataset.crew); render(); } }));
}
function metricNote(m) {
  if (m.private) return 'Private information - not shared';
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
  document.getElementById('metrics').innerHTML = definitions.map(([title, symbol, value, unit, metric]) => `<article class="metric"><div class="metric-top"><span class="metric-icon">${icon(symbol)}</span><span class="metric-tag">${metric.private ? 'PRIVATE' : metric.unsupported ? 'UNSUPPORTED' : 'READ ONLY'}</span></div><h3>${title}</h3><div class="metric-value">${value}<small>${unit}</small></div><div class="metric-bottom">${escapeHTML(metricNote(metric))}</div>${title === 'Mood' && metric.value !== null ? `<div class="mood-dots" aria-label="${HealthData.moodLabels[metric.value] || 'Recorded mood'}">${Array.from({length:5},(_,i)=>`<span class="${i<metric.value?'filled':''}"></span>`).join('')}</div>` : ''}</article>`).join('');
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
  document.querySelector('.records-panel .subtle').textContent = dataState.source === 'demo' ? 'Received demo records' : 'Authenticated API records';
  document.getElementById('records-list').innerHTML = rows.length ? rows.map(l=>`<div class="record"><span>${icon('check')}</span><strong>${escapeHTML(({measurement:l.data.metric?.replaceAll('_',' '),sleep:'Sleep',mood:'Mood',meal:'Meal',exercise:'Exercise',radiation:'Radiation',injury:'Injury'})[l.type] || l.type)}</strong><small>Day ${l.missionDay} · ${escapeHTML(new Date(l.timestamp).toLocaleString('en-US',{dateStyle:'short',timeStyle:'short'}))}</small></div>`).join('') : '<p class="empty-records">No received records available for this source.</p>';
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
  stats[2].textContent = dataState.source === 'demo' ? 'Seed snapshot' : new Date(dataState.loadedAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
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
  if (dataState.dataNotice) document.querySelector('footer > span:nth-child(2)').textContent = `${dataState.dataNotice} · authenticated API · no clinical interpretation`;
  document.getElementById('connection-status').textContent = `${label}${client ? ' · '+client.user.role : ''}`;
}
function render() {
  renderCrew(); updateMissionUI();
  renderMetrics();renderChart();renderAdditional();renderRecords();renderBodyCallouts();
  document.getElementById('astronaut-title').textContent = `Health overview: ${selected.name}`;
  document.getElementById('astronaut-subtitle').textContent = `${selected.crewId || selected.role} · ${provenanceLabel(selected.provenance)}`;
  if (typeof renderCommand === 'function') renderCommand();
  if (typeof renderTeamView === 'function') renderTeamView();
  if (typeof applyAvatarBehaviors === 'function') applyAvatarBehaviors();
  if (typeof applyAvatarNeeds === 'function') applyAvatarNeeds();
  if (typeof renderImpactView === 'function') renderImpactView();
}
