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
teamPanel.after(crewDetails);
crewDetails.after(workspace);

function collectiveAvatarHTML() {
  const aggregate = aggregateCrewDay(crew, dataState.mission.today);
  const markup = bodyCalloutMarkup(aggregate.metrics, true);
  // Prefix illustration IDs so both team and individual SVG gradients stay distinct.
  const avatar = (document.getElementById('individual-body-avatar')?.outerHTML || '<svg class="astronaut-svg" viewBox="0 0 260 390" aria-hidden="true"></svg>')
    .replace(/\bid="([^"]+)"/g, 'id="team-$1"').replace(/url\(#([^)]+)\)/g, 'url(#team-$1)')
    .replace('aria-label="Astronaut illustration"', 'aria-label="Conceptual avatar representing the whole crew"');
  const available = Object.entries(aggregate.metrics).filter(([key,m])=>!m.private&&key!=='diastolic'&&m.count>0).length;
  return `<section class="panel body-panel team-body-panel"><div class="panel-heading"><h3>Crew overview</h3><span class="tiny-chip">TEAM AVERAGES · DAY ${aggregate.missionDay}</span></div><p class="panel-description">Supplementary same-day means. The illustration does not localize conditions; review individual readings above.</p><div class="avatar-toolbar"><span id="team-avatar-state" class="avatar-state" role="status" aria-live="polite">Loading source status</span><button type="button" id="team-avatar-motion" class="avatar-motion-toggle" aria-pressed="false">Pause motion</button></div>${available===0?'<p class="team-coverage-warning">No same-day readings are available for these indicators. Latest individual readings remain available in the comparison below.</p>':''}<div id="team-body-visual" class="body-visual" data-avatar-state="unknown"><button type="button" id="team-avatar-needs-button" class="avatar-needs-button" aria-controls="team-avatar-needs" aria-expanded="false" hidden></button><div class="body-orbit"></div><svg id="team-body-connectors" class="body-connectors" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">${markup.lines}</svg><div id="team-body-callouts" class="body-callouts">${markup.cards}</div>${avatar}</div><p class="body-avatar-caption">Crew overview · ${aggregate.total} crew members · no individual is represented</p><section id="team-avatar-needs" class="avatar-needs-panel" aria-label="Whole-crew review prompts" hidden></section><div class="body-legend"><span><i class="legend-dot lilac"></i>Recorded mean</span><span><i class="legend-dot gold"></i>Source watch flag</span><span><i class="legend-dot danger"></i>Source review flag</span></div><div class="body-footnote">${icon('info')}Colors preserve individual source flags, including older readings. Missing and older values are excluded from the mean. Hover over a card for its range.</div></section>`;
}

const crewFilter = {search:'',status:'all',sort:'priority',columns:'daily'};
function teamAttention(person) { return generalStatus(person); }
function teamStatusCounts() {
  const counts = {routine:0,followup:0,review:0,unknown:0};
  crew.forEach(person => counts[generalStatus(person).key]++);
  return counts;
}
function visibleCrew() {
  const search = crewFilter.search.trim().toLowerCase();
  const filtered = crew.filter(person => (!search || `${person.name} ${person.crewId || person.id}`.toLowerCase().includes(search)) &&
    (crewFilter.status === 'all' || generalStatus(person).key === crewFilter.status));
  return crewFilter.sort === 'name' ? [...filtered].sort((a,b) => a.name.localeCompare(b.name)) :
    Monitoring.sortPeople(filtered,dataState.mission.today,window.COSMOMEDIC_CONFIG.expectedDailyMetrics);
}
function comparisonKeys() {
  const keys = crewFilter.columns === 'daily' ? ['systolic','heart','sleep','temperature','glucose'] : ['sleep','bone','nutrition','immune'];
  return keys.filter(key => crew.some(person => !person.metrics[key]?.unsupported && !person.metrics[key]?.private));
}
function teamMetricCell(person,key) {
  const metric = person.metrics[key], age = Monitoring.age(metric,dataState.mission.today);
  const paired = key === 'systolic' && metric?.missionDay !== person.metrics.diastolic?.missionDay;
  const flags = generalStatus(person).flags.filter(flag => flag.key === key || key === 'systolic' && flag.key === 'diastolic');
  const flag = flags.some(f => f.severity === 'review') ? 'review' : flags.length ? 'followup' : null;
  return `<td class="reading-cell ${flag ? 'cell-'+flag : ''}"><strong>${readingText(person,key)}</strong><span class="reading-unit">${Monitoring.hasReading(metric) ? escapeHTML(metric.unit) : ''}</span><small class="reading-age age-${age.kind}">${escapeHTML(age.text)}</small>${flag ? `<span class="cell-source-flag">${flag === 'review' ? 'Source review flag' : 'Source watch flag'}</span>` : ''}${paired ? '<small>Pressure pair not from the same day</small>' : ''}<small class="measurement-time">${escapeHTML(measuredTime(metric))}</small></td>`;
}
function teamExceptionsHTML(people = visibleCrew()) {
  const pending = people.filter(person => generalStatus(person).key !== 'routine');
  return pending.length ? pending.map(person => {
    const status = generalStatus(person);
    return `<article class="review-queue-item queue-${status.key}"><div class="queue-person"><strong>${escapeHTML(person.name)}</strong><small>${escapeHTML(person.crewId || person.id)}</small>${statusHTML(person)}</div><div class="queue-evidence"><ul>${status.reasons.map(reason => `<li>${escapeHTML(reason)}</li>`).join('')}</ul>${status.flags.map(flag => `<p><strong>${escapeHTML(flag.label)}: ${format(flag.value)} ${escapeHTML(flag.unit)}</strong> &middot; ${escapeHTML(Monitoring.age(person.metrics[flag.key],dataState.mission.today).text)}<small>${escapeHTML(measuredTime(person.metrics[flag.key]))}</small></p>`).join('')}<small>Daily coverage: ${status.coverage.current}/${status.coverage.total}</small></div><div class="queue-actions">${reviewHTML(person)}<button class="team-detail-button" data-team-person="${escapeHTML(person.id)}">Review readings <span aria-hidden="true">&rarr;</span></button></div></article>`;
  }).join('') : '<p class="queue-empty">No source review flags or data/status gaps match these filters.</p>';
}
function renderTeamResults() {
  const people = visibleCrew(), keys = comparisonKeys();
  document.getElementById('crew-result-count').textContent = `${people.length} of ${crew.length} crew members shown`;
  document.getElementById('review-queue-list').innerHTML = teamExceptionsHTML(people);
  document.getElementById('comparison-head').innerHTML = `<tr><th scope="col">Crew member</th><th scope="col">Review status / daily coverage</th>${keys.map(key => `<th scope="col">${key === 'systolic' ? 'Blood pressure' : Monitoring.definitions.find(d => d.key === key).label}</th>`).join('')}<th scope="col">Review</th></tr>`;
  document.getElementById('comparison-body').innerHTML = people.length ? people.map(person => {
    const status = generalStatus(person);
    return `<tr><th scope="row"><strong>${escapeHTML(person.name)}</strong><small>${escapeHTML(person.crewId || person.id)}</small></th><td>${statusHTML(person)}<small>${status.coverage.current}/${status.coverage.total} current-day indicators</small></td>${keys.map(key => teamMetricCell(person,key)).join('')}<td><button class="team-detail-button" data-team-person="${escapeHTML(person.id)}" aria-label="Review ${escapeHTML(person.name)}">Open details</button></td></tr>`;
  }).join('') : `<tr><td colspan="${keys.length+3}" class="queue-empty">No matching crew members. Adjust the search or filters.</td></tr>`;
  const excluded = (crewFilter.columns === 'daily' ? ['systolic','heart','sleep','temperature','glucose'] : ['sleep','bone','nutrition','immune']).filter(key => !keys.includes(key));
  document.getElementById('comparison-availability').textContent = excluded.length ? 'Not provided by this source: '+excluded.map(key => Monitoring.definitions.find(d => d.key === key).label).join(', ')+'.' : 'All displayed indicators are supported by this source.';
  document.querySelectorAll('[data-team-person]').forEach(button => button.addEventListener('click',() => selectIndividualCrew(button.dataset.teamPerson)));
}
function renderTeamView() {
  const isTeam = monitoringScope === 'team';
  teamPanel.hidden = !isTeam;
  crewDetails.hidden = isTeam;
  document.getElementById('crew-list').hidden = isTeam;
  document.querySelector('.crew-section .subtle').textContent = isTeam ? 'Choose a monitoring scope' : 'Select a crew member to review';
  document.querySelector('.command-primary').hidden = isTeam;
  document.getElementById('scope-team').setAttribute('aria-pressed',String(isTeam));
  document.getElementById('scope-individual').setAttribute('aria-pressed',String(!isTeam));
  document.getElementById('scope-description').textContent = isTeam ? 'Review queue, individual readings and data coverage.' : `Reviewing ${selected.name}. Source flags are consistent across all views.`;
  if (!isTeam) return;
  teamPanel.innerHTML = `<div class="team-overview-heading"><div><p class="eyebrow">CARE TEAM WORKSPACE</p><h2>Review the crew</h2><p>${crew.length} crew members &middot; mission day ${dataState.mission.today}</p></div><span>Source flags + data coverage<br>Medical review determines clinical priority</span></div><div id="crew-summary"></div>${sourceFreshnessHTML()}${collectiveAvatarHTML()}<section class="crew-controls panel" aria-label="Filter and sort crew"><label>Find a crew member<input id="crew-search" type="search" placeholder="Name or crew ID" value="${escapeHTML(crewFilter.search)}"></label><label>Show<select id="crew-status-filter"><option value="all">All crew</option><option value="review">Source review flags</option><option value="followup">Source follow-up flags</option><option value="unknown">Insufficient data / status</option><option value="routine">No source flags</option></select></label><label>Order<select id="crew-sort"><option value="priority">Source flags, then data gaps</option><option value="name">Crew name</option></select></label><label>Indicators<select id="crew-columns"><option value="daily">Daily monitoring</option><option value="longitudinal">Longitudinal / intake</option></select></label><p id="crew-result-count" role="status" aria-live="polite"></p></section><section class="panel team-exceptions"><div class="panel-heading"><div><h2>Review queue</h2><p class="panel-description">Source flags first, followed by missing data or status.</p></div><span class="tiny-chip">READ ONLY</span></div><div id="review-queue-list"></div><p class="queue-policy">Case tracking comes from the main system. Opening a record does not mark a flag as assessed or resolved.</p></section><section class="panel team-comparison"><div class="panel-heading"><h2>Individual readings</h2><span class="tiny-chip">LATEST PER INDICATOR</span></div><p class="team-table-description">Measurement ages use mission day ${dataState.mission.today}. A recent API refresh does not make an older measurement current.</p><div class="team-table-scroll" tabindex="0" role="region" aria-label="Crew readings, scroll horizontally for additional indicators"><table><caption>Physical readings with source flags, daily coverage and measurement times</caption><thead id="comparison-head"></thead><tbody id="comparison-body"></tbody></table></div><p id="comparison-availability" class="availability-note"></p></section>`;
  document.getElementById('crew-status-filter').value = crewFilter.status;
  document.getElementById('crew-sort').value = crewFilter.sort;
  document.getElementById('crew-columns').value = crewFilter.columns;
  document.getElementById('crew-search').addEventListener('input',event => {crewFilter.search=event.target.value;renderTeamResults();});
  for (const [id,key] of [['crew-status-filter','status'],['crew-sort','sort'],['crew-columns','columns']]) {
    document.getElementById(id).addEventListener('change',event => {crewFilter[key]=event.target.value;renderTeamResults();});
  }
  renderTeamResults();
  renderCrewSummary();
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
  crewDetails.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
}
document.getElementById('scope-team').addEventListener('click',() => setMonitoringScope('team'));
document.getElementById('scope-individual').addEventListener('click',() => setMonitoringScope('individual'));
render();
