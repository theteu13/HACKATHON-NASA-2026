'use strict';
let trendMetric = 'heart';
const individualContext = document.createElement('section');
individualContext.id = 'individual-context';
individualContext.className = 'panel individual-context';
document.querySelector('.astronaut-heading').before(individualContext);

// Keep the illustration available, after the clinical readings and history.
const individualIllustration = document.createElement('details');
individualIllustration.className = 'secondary-illustration';
individualIllustration.open = true;
individualIllustration.innerHTML = '<summary>Conceptual body illustration <span>Optional visual aid · no anatomical diagnosis</span></summary>';
document.querySelector('.dashboard-grid').before(individualIllustration);
individualIllustration.append(document.querySelector('.body-panel'));

const sourceSummary = document.createElement('details');
sourceSummary.className = 'secondary-source-summary';
sourceSummary.innerHTML = '<summary>Source summary scores <span>Reference only · not a clinical priority score</span></summary>';
document.querySelector('.command-primary').before(sourceSummary);
sourceSummary.append(document.querySelector('.command-primary'));

const learningTools = document.createElement('details');
learningTools.className = 'secondary-learning';
learningTools.innerHTML = '<summary>Demonstration tools <span>Illustrative scenarios · outside the monitoring workflow</span></summary>';
document.getElementById('open-simulator').before(learningTools);
learningTools.append(document.getElementById('open-simulator'));
document.getElementById('open-simulator').innerHTML = `${icon('moon')}<span><strong>Rest scenario demonstration</strong><small>Unvalidated illustrative model</small></span>`;

document.querySelector('.trend-panel .panel-heading').innerHTML = '<div><h3>Individual trend</h3><p id="trend-description" class="panel-description"></p></div><label class="trend-select">Indicator<select id="trend-metric" aria-label="Indicator to plot"></select></label>';
document.getElementById('trend-metric').addEventListener('change', event => {
  trendMetric = event.target.value;
  renderMonitoringChart();
});

function measuredTime(metric) {
  if (!metric?.timestamp) return 'Measurement timestamp not supplied';
  if (/^\d{4}-\d{2}-\d{2}$/.test(metric.timestamp)) return `${metric.timestamp} · time not supplied`;
  const date = new Date(metric.timestamp);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('en-GB', {
    timeZone:'UTC',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'
  }) + ' UTC' : 'Measurement timestamp invalid';
}
function statusHTML(person) {
  const status = generalStatus(person);
  return `<span class="monitor-status status-${status.key}"><i class="legend-dot ${status.color}"></i>${escapeHTML(status.text)}</span>`;
}
function readingText(person, key) {
  const metric = person.metrics[key];
  if (!Monitoring.hasReading(metric) || Monitoring.age(metric,dataState.mission.today).kind === 'future') return '—';
  if (key !== 'systolic') return format(metric.value);
  const other = person.metrics.diastolic;
  return Monitoring.hasReading(other) && metric.missionDay === other.missionDay ? `${format(metric.value)}/${format(other.value)}` : '—';
}
function reviewRecord(person) {
  const record = window.COSMOMEDIC_CONFIG.reviewRecords?.[person.id];
  if (!record) return {label:'Review tracking not connected',detail:'Managed in the main system',url:null};
  const labels = {pending:'Pending review',in_review:'Under review',reviewed:'Reviewed in main system'};
  return {label:labels[record.status] || 'Review status unavailable',
    detail:[record.assignee ? `Responsible: ${record.assignee}` : 'Responsible person not supplied',
      record.updatedAt ? `Updated: ${measuredTime({timestamp:record.updatedAt})}` : 'Review update time not supplied'].join(' · '),
    url:Monitoring.safeLink(record.url)};
}
function reviewHTML(person) {
  const record = reviewRecord(person);
  return `<div class="review-context"><strong>${escapeHTML(record.label)}</strong><small>${escapeHTML(record.detail)}</small>${record.url ? `<a class="team-detail-button" href="${escapeHTML(record.url)}" target="_blank" rel="noopener noreferrer">Open case in main system ↗</a>` : ''}</div>`;
}
function sourceFreshnessHTML() {
  const failed = dataState.connectionState === 'error';
  return `<div class="source-freshness ${failed ? 'source-failed' : ''}" role="status"><span>${icon(failed ? 'info' : 'clipboard')}<strong>${failed ? 'Refresh failed · showing last loaded snapshot' : dataState.source === 'demo' ? 'Fictional seed snapshot' : 'API snapshot · manual refresh'}</strong></span><span>Loaded in dashboard: ${escapeHTML(measuredTime({timestamp:dataState.loadedAt}))}</span><small>Measurement times are shown per indicator. Server receipt time and transmission delay are not supplied.</small></div>`;
}
function renderMonitoringView() {
  const status = generalStatus(selected);
  const context = window.COSMOMEDIC_CONFIG.clinicalContext?.[selected.id] || {};
  individualContext.innerHTML = `<div class="individual-context-heading"><div><p class="eyebrow">INDIVIDUAL REVIEW</p><h2>${escapeHTML(selected.name)}</h2><p>${escapeHTML(selected.crewId || selected.id)} · ${escapeHTML(dataState.mission.name)}</p></div>${statusHTML(selected)}</div><div class="individual-context-grid"><div><span>Current-day coverage</span><strong>${status.coverage.current}/${status.coverage.total} expected daily indicators</strong><small>Coverage uses mission day ${dataState.mission.today}; weekly measurements are tracked separately.</small></div><div><span>Symptoms / reported concern</span><strong>${escapeHTML(context.symptoms || 'Not supplied by this source')}</strong></div><div><span>Collection context</span><strong>${escapeHTML(context.collectionContext || 'Activity, posture and collection conditions not supplied')}</strong></div>${reviewHTML(selected)}</div><div class="review-reasons"><strong>Why this status?</strong><ul>${status.reasons.map(reason => `<li>${escapeHTML(reason)}</li>`).join('')}</ul><small>Source flags and coverage checks support review; they do not establish a diagnosis or urgency level.</small></div>${sourceFreshnessHTML()}`;
  sourceSummary.hidden = typeof monitoringScope !== 'undefined' && monitoringScope === 'team';
  const options = Monitoring.definitions.filter(def => !selected.metrics[def.key]?.unsupported);
  if (!options.some(def => def.key === trendMetric)) trendMetric = options[0]?.key || 'heart';
  const control = document.getElementById('trend-metric');
  control.innerHTML = options.map(def => `<option value="${def.key}">${def.label}</option>`).join('');
  control.value = trendMetric;
  renderMonitoringChart();
}
function renderMonitoringChart() {
  const def = Monitoring.definitions.find(item => item.key === trendMetric) || Monitoring.definitions[2];
  const day = dataState.mission.today, first = period === 0 ? 1 : Math.max(1,day-period+1);
  const points = Monitoring.series(selected,def.key,day).filter(p => p.missionDay >= first);
  const reference = Monitoring.baseline(selected,def.key,dataState.impact);
  const latest = points.at(-1);
  document.getElementById('trend-description').textContent = `${def.label} · ${def.unit} · ${selected.name}`;
  document.getElementById('chart-period').textContent = `Mission days ${first}–${day} · ${points.length} recorded days`;
  document.querySelector('.chart-footer > span:first-child').textContent = 'Recorded values · gaps indicate missing days';
  const header = `<div class="trend-statistics"><div><span>Latest in selected period</span><strong>${latest ? format(latest.value)+' '+def.unit : 'No reading'}</strong><small>${latest ? `Mission day ${latest.missionDay}` : 'No values are fabricated'}</small></div><div><span>Personal reference</span><strong>${reference ? format(reference.value)+' '+def.unit : 'Not available'}</strong><small>${reference ? escapeHTML(reference.label)+(reference.n ? ` · n=${reference.n}` : '') : 'No personal baseline supplied'}</small></div><div><span>Change from reference</span><strong>${latest && reference ? (latest.value-reference.value > 0 ? '+' : '')+format(latest.value-reference.value)+' '+def.unit : '—'}</strong><small>Descriptive difference · no clinical threshold</small></div></div>`;
  const target = document.getElementById('trend-chart');
  if (!points.length) {
    target.innerHTML = header + '<p class="empty-records">No readings for this indicator in the selected period.</p>';
    return;
  }
  const values = points.map(p => p.value).concat(reference ? [reference.value] : []);
  const min = Math.min(...values), max = Math.max(...values), pad = Math.max((max-min)*0.15,Math.abs(max)*0.01,0.05);
  const low = min-pad, high = max+pad;
  const x = p => first === day ? 350 : 55+(p.missionDay-first)*610/(day-first);
  const y = value => 165-(value-low)*130/(high-low);
  const groups = []; let group = [];
  points.forEach((p,i) => {if (i && p.missionDay-points[i-1].missionDay>1) {groups.push(group);group=[];} group.push(p);});
  groups.push(group);
  const ticks = Array.from({length:Math.min(7,day-first+1)},(_,i) => first+Math.round(i*(day-first)/Math.max(1,Math.min(7,day-first+1)-1)));
  target.innerHTML = header + `<div class="monitoring-chart-scroll" tabindex="0" role="region" aria-label="Trend chart, scroll horizontally on narrow screens"><svg class="monitoring-trend" viewBox="0 0 700 205" role="img" aria-label="${escapeHTML(def.label)} for ${escapeHTML(selected.name)}, mission days ${first} to ${day}. Missing days are not connected. Values are available in the table below.">${[0,1,2,3].map(i => {const v=low+(high-low)*i/3;return `<line x1="55" x2="670" y1="${y(v)}" y2="${y(v)}" stroke="#aba8d833"/><text x="45" y="${y(v)+4}" text-anchor="end" fill="#c4c2e3" font-size="13">${format(v)}</text>`;}).join('')}${reference ? `<line x1="55" x2="670" y1="${y(reference.value)}" y2="${y(reference.value)}" stroke="#ffc94d" stroke-dasharray="6 5"/>` : ''}${groups.map(g => `<polyline points="${g.map(p => `${x(p)},${y(p.value)}`).join(' ')}" fill="none" stroke="#b1a7ff" stroke-width="2.5"/>`).join('')}${points.map(p => `<circle cx="${x(p)}" cy="${y(p.value)}" r="3.5" fill="#b1a7ff"><title>Day ${p.missionDay}: ${format(p.value)} ${def.unit}</title></circle>`).join('')}${ticks.map(d => `<text x="${x({missionDay:d})}" y="192" text-anchor="middle" fill="#c4c2e3" font-size="13">Day ${d}</text>`).join('')}</svg></div><p class="trend-method">${reference ? 'Dashed amber line: personal reference. ' : ''}Latest recorded value per mission day; recorded intake sums available meals. Gaps remain visible. Scroll the chart horizontally on narrow screens. The vertical axis adapts to recorded values; differences are not clinical classifications.</p><details class="trend-data"><summary>Read chart values as a table <span>${points.length} recorded days</span></summary><div class="trend-data-scroll"><table><caption>${escapeHTML(def.label)} · ${escapeHTML(def.unit)}</caption><thead><tr><th>Mission day</th><th>Value (${escapeHTML(def.unit)})</th><th>Measurement time</th></tr></thead><tbody>${points.map(p => `<tr><td>${p.missionDay}</td><td>${format(p.value)}</td><td>${escapeHTML(measuredTime({timestamp:p.date}))}</td></tr>`).join('')}</tbody></table></div></details>`;
}
