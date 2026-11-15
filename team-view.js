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

function teamStatusCounts() {
  const counts = { routine:0, followup:0, review:0, unknown:0 };
  crew.forEach(person => {
    const color = generalStatus(person).color;
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
  document.getElementById('scope-team').setAttribute('aria-pressed', String(isTeam));
  document.getElementById('scope-individual').setAttribute('aria-pressed', String(!isTeam));
  document.getElementById('scope-description').textContent = isTeam ? 'Compare the whole crew, or select someone for a detailed view.' : `Detailed monitoring of ${selected.name}. Switch to Team overview to compare everyone.`;
  if (!isTeam) return;
  const counts = teamStatusCounts();
  const cards = [['Crew monitored',crew.length,'All crew in the selected source','lilac'],['Routine monitoring',counts.routine,'General source status','teal'],['Follow-up suggested',counts.followup,'General source status','gold'],['Review required',counts.review,'General source status','danger']];
  teamPanel.innerHTML = `<div class="team-kpis">${cards.map(([label,value,note,tone])=>`<article class="team-kpi kpi-${tone}"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join('')}</div><section class="panel team-comparison"><div class="panel-heading"><h2>Crew at a glance</h2><span class="tiny-chip">READ ONLY</span></div><p class="team-table-description">Latest available readings. Each cell shows its measurement day; readings may be from different days.</p>${counts.unknown?`<p class="command-note">${counts.unknown} crew member${counts.unknown===1?' has':'s have'} no general status available.</p>`:''}<div class="team-table-scroll" tabindex="0" role="region" aria-label="Crew metric comparison; scroll horizontally for more columns"><table><caption>Physical indicators for all ${crew.length} crew members · mission day ${dataState.mission.today}</caption><thead><tr><th scope="col">Crew member</th><th scope="col">General status</th><th scope="col">Blood pressure</th><th scope="col">Heart rate</th><th scope="col">Blood glucose</th><th scope="col">Temperature</th><th scope="col">Sleep</th><th scope="col">Details</th></tr></thead><tbody>${crew.map(person=>{const status=generalStatus(person);return `<tr><th scope="row"><strong>${escapeHTML(person.name)}</strong><small>${escapeHTML(person.crewId||person.role)}</small></th><td><span class="team-status"><i class="legend-dot ${status.color}"></i>${status.text}</span></td>${['systolic','heart','glucose','temperature','sleep'].map(key=>teamMetricCell(person,key)).join('')}<td><button class="team-detail-button" data-team-person="${escapeHTML(person.id)}" aria-label="View details for ${escapeHTML(person.name)}">View details <span aria-hidden="true">↗</span></button></td></tr>`;}).join('')}</tbody></table></div><div class="team-privacy-note">${icon('shield')}Psychological details and private messages are excluded. Status counts follow source flags, not a new clinical assessment.</div></section>`;
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
