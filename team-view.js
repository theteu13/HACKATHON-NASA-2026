// Team and individual are monitoring scopes, not different account roles.
let monitoringScope = 'team';
const scopeSelector = document.createElement('div');
scopeSelector.className = 'monitoring-scope';
scopeSelector.innerHTML = '<div class="scope-switch" role="group" aria-label="Monitoring scope"><button id="scope-team" data-scope="team" aria-pressed="true">Team overview</button><button id="scope-individual" data-scope="individual" aria-pressed="false">Individual view</button></div><p id="scope-description"></p>';
document.querySelector('.crew-section .section-heading').after(scopeSelector);
const teamPanel = document.createElement('section');
teamPanel.id = 'team-overview';
teamPanel.className = 'team-overview';
teamPanel.setAttribute('aria-label', 'Whole-crew monitoring');
crewDetails.before(teamPanel);
teamPanel.after(workspace);

function collectiveAvatarHTML() {
  const aggregate = aggregateCrewDay(crew, dataState.mission.today);
  const markup = bodyCalloutMarkup(aggregate.metrics, true);
  // Prefix illustration IDs so both team and individual SVG gradients stay distinct.
  const avatar = (document.getElementById('individual-body-avatar')?.outerHTML || '<svg class="astronaut-svg" viewBox="0 0 260 390" aria-hidden="true"></svg>')
    .replace(/\bid="([^"]+)"/g, 'id="team-$1"').replace(/url\(#([^)]+)\)/g, 'url(#team-$1)')
    .replace('aria-label="Astronaut illustration"', 'aria-label="Conceptual avatar representing the whole crew"');
  const available = Object.entries(aggregate.metrics).filter(([key,m])=>!m.private&&key!=='diastolic'&&m.count>0).length;
  return `<section class="panel body-panel team-body-panel"><div class="panel-heading"><h3>Crew overview</h3><span class="tiny-chip">TEAM AVERAGES · DAY ${aggregate.missionDay}</span></div><p class="panel-description">The avatar represents the whole crew. Numbers are same-day means; coverage shows how many crew members contributed.</p><div class="avatar-toolbar"><span id="team-avatar-state" class="avatar-state" role="status" aria-live="polite">Loading source status</span><button type="button" id="team-avatar-motion" class="avatar-motion-toggle" aria-pressed="false">Pause motion</button></div>${available===0?'<p class="team-coverage-warning">No same-day readings are available for these indicators. Latest individual readings remain available in the comparison below.</p>':''}<div id="team-body-visual" class="body-visual" data-avatar-state="unknown"><button type="button" id="team-avatar-needs-button" class="avatar-needs-button" aria-controls="team-avatar-needs" aria-expanded="false" hidden></button><div class="body-orbit"></div><svg id="team-body-connectors" class="body-connectors" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">${markup.lines}</svg><div id="team-body-callouts" class="body-callouts">${markup.cards}</div>${avatar}</div><p class="body-avatar-caption">Crew overview · ${aggregate.total} crew members · no individual is represented</p><section id="team-avatar-needs" class="avatar-needs-panel" aria-label="Whole-crew review prompts" hidden></section><div class="body-legend"><span><i class="legend-dot lilac"></i>Recorded mean</span><span><i class="legend-dot gold"></i>Source watch flag</span><span><i class="legend-dot danger"></i>Source review flag</span></div><div class="body-footnote">${icon('info')}Colors preserve individual source flags, including older readings. Missing and older values are excluded from the mean. Hover over a card for its range.</div></section>`;
}
function teamAttention(person) {
  const general=generalStatus(person);
  const flags=Object.entries(person.metrics).filter(([key,m])=>key!=='mood'&&!m.private&&m.value!==null&&m.missionDay<=dataState.mission.today&&['watch','out_of_range'].includes(m.status));
  if(general.color==='danger')return general;
  const severe=flags.filter(([,m])=>m.status==='out_of_range');
  if(severe.length)return {color:'danger',text:`Measurement review flag · Day ${Math.max(...severe.map(([,m])=>m.missionDay))}`};
  if(general.color==='gold')return general;
  if(flags.length)return {color:'gold',text:`Measurement watch flag · Day ${Math.max(...flags.map(([,m])=>m.missionDay))}`};
  return general;
}
function teamExceptionsHTML() {
  const flagged = crew.filter(p=>['gold','danger'].includes(teamAttention(p).color));
  const unknown = crew.filter(p=>teamAttention(p).color==='muted').length;
  return `<section class="panel team-exceptions"><div class="panel-heading"><h2>Crew needing attention</h2><span class="tiny-chip">${flagged.length} FLAGGED</span></div><p class="command-note">General status and individual metric flags, including older readings. Flags remain visible regardless of the team average.</p>${flagged.length?`<div class="team-exception-list">${flagged.map(person=>{const status=teamAttention(person);return `<button class="team-exception" data-team-person="${escapeHTML(person.id)}" aria-label="View flagged crew member ${escapeHTML(person.name)}"><span class="team-status"><i class="legend-dot ${status.color}"></i><strong>${escapeHTML(person.name)}</strong></span><span>${status.text}</span><span class="exception-open">View details ↗</span></button>`;}).join('')}</div>`:'<p class="team-exception-empty">No crew members have a watch or review flag in the available source data.</p>'}${unknown?`<p class="command-note">${unknown} crew member${unknown===1?' has':'s have'} no general status available.</p>`:''}</section>`;
}

function teamStatusCounts() {
  const counts = { routine:0, followup:0, review:0, unknown:0 };
  crew.forEach(person => {
    const color = teamAttention(person).color;
    counts[color === 'teal' ? 'routine' : color === 'gold' ? 'followup' : color === 'danger' ? 'review' : 'unknown']++;
  });
  return counts;
}
function teamMetricCell(person, key) {
  const metric = person.metrics[key];
  if (metric.private) return '<td><span class="team-missing">Private</span></td>';
  const isBP = key === 'systolic';
  if (metric.value === null || (isBP && person.metrics.diastolic.value === null)) return `<td><span class="team-missing">—</span><small>${metric.unsupported ? 'Unavailable' : 'No reading'}</small></td>`;
  const value = isBP ? `${format(metric.value)}/${format(person.metrics.diastolic.value)}` : format(metric.value);
  const status = ['normal','watch','out_of_range'].includes(metric.status) ? metric.status : 'recorded';
  return `<td><span class="team-reading status-${status}">${value}<small>${escapeHTML(metric.unit)}</small></span><small>${metric.missionDay ? 'Day '+metric.missionDay : 'Recorded value'}</small></td>`;
}
function renderTeamView() {
  const isTeam = monitoringScope === 'team';
  teamPanel.hidden = !isTeam;
  crewDetails.hidden = isTeam;
  document.querySelector('.command-primary').hidden = isTeam;
  document.getElementById('scope-team').setAttribute('aria-pressed', String(isTeam));
  document.getElementById('scope-individual').setAttribute('aria-pressed', String(!isTeam));
  document.getElementById('scope-description').textContent = isTeam ? 'Same-day team averages, source flags, and individual follow-up.' : `Detailed monitoring of ${selected.name}. Switch to Team overview to compare everyone.`;
  if (!isTeam) return;
  const counts = teamStatusCounts();
  const cards = [['Crew monitored',crew.length,'All crew in the selected source','lilac'],['Routine monitoring',counts.routine,'No watch or review source flags','teal'],['Follow-up suggested',counts.followup,'General or metric source flag','gold'],['Review required',counts.review,'General or metric source flag','danger']];
  teamPanel.innerHTML = `<div class="team-overview-heading"><div><h2>Whole-crew monitoring</h2><p>Mission day ${dataState.mission.today} - ${crew.length} crew members</p></div><span>${dataState.source==='demo'?'Seed snapshot':'Last loaded '+new Date(dataState.loadedAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span></div><div class="team-kpis">${cards.map(([label,value,note,tone])=>`<article class="team-kpi kpi-${tone}"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join('')}</div>${collectiveAvatarHTML()}${teamExceptionsHTML()}<details class="team-comparison-details"><summary>Compare individual readings <span>Latest readings - expand table</span></summary><section class="panel team-comparison"><div class="panel-heading"><h2>Crew at a glance</h2><span class="tiny-chip">READ ONLY</span></div><p class="team-table-description">Latest available readings. Each cell shows its measurement day; readings may be from different days.</p>${counts.unknown?`<p class="command-note">${counts.unknown} crew member${counts.unknown===1?' has':'s have'} no general status available.</p>`:''}<div class="team-table-scroll" tabindex="0" role="region" aria-label="Crew metric comparison; scroll horizontally for more columns"><table><caption>Physical indicators for all ${crew.length} crew members · mission day ${dataState.mission.today}</caption><thead><tr><th scope="col">Crew member</th><th scope="col">General status</th><th scope="col">Blood pressure</th><th scope="col">Heart rate</th><th scope="col">Blood glucose</th><th scope="col">Temperature</th><th scope="col">Sleep</th><th scope="col">Details</th></tr></thead><tbody>${crew.map(person=>{const status=generalStatus(person);return `<tr><th scope="row"><strong>${escapeHTML(person.name)}</strong><small>${escapeHTML(person.crewId||person.role)}</small></th><td><span class="team-status"><i class="legend-dot ${status.color}"></i>${status.text}</span></td>${['systolic','heart','glucose','temperature','sleep'].map(key=>teamMetricCell(person,key)).join('')}<td><button class="team-detail-button" data-team-person="${escapeHTML(person.id)}" aria-label="View details for ${escapeHTML(person.name)}">View details <span aria-hidden="true">↗</span></button></td></tr>`;}).join('')}</tbody></table></div><div class="team-privacy-note">${icon('shield')}Psychological details and private messages are excluded. Status counts follow source flags, not a new clinical assessment.</div></section></details>`;
  document.querySelectorAll('[data-team-person]').forEach(button => button.addEventListener('click', () => selectIndividualCrew(button.dataset.teamPerson)));
}
function setMonitoringScope(scope) {
  if (!['team','individual'].includes(scope)) return;
  monitoringScope = scope;
  if (scope === 'individual') crewDetails.open = true;
  render();
}
function selectIndividualCrew(id) {
  const person = crew.find(person => person.id === id);
  if (!person) return;
  selected = person;
  setMonitoringScope('individual');
  crewDetails.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'start'});
}
document.getElementById('scope-team').addEventListener('click', () => setMonitoringScope('team'));
document.getElementById('scope-individual').addEventListener('click', () => setMonitoringScope('individual'));
render();
