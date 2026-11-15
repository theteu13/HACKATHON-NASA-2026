// Shared monitoring rules. Source flags and data coverage are not diagnoses.
(function (global) {
  'use strict';
  const definitions = [
    { key:'systolic', label:'Systolic pressure', unit:'mmHg', baseline:'restingBp', code:'systolic_bp' },
    { key:'diastolic', label:'Diastolic pressure', unit:'mmHg', baseline:'restingBp', code:'diastolic_bp' },
    { key:'heart', label:'Heart rate', unit:'bpm', baseline:'restingHr', code:'heart_rate' },
    { key:'sleep', label:'Sleep duration', unit:'h', baseline:'usualSleepH', code:'sleep_hours' },
    { key:'glucose', label:'Blood glucose', unit:'mg/dL', code:'blood_glucose' },
    { key:'temperature', label:'Body temperature', unit:'°C', code:'body_temperature' },
    { key:'bone', label:'Bone density', unit:'g/cm²', baseline:'boneDensity', code:'bone_density' },
    { key:'nutrition', label:'Recorded intake', unit:'kcal', code:'calorie_intake' },
    { key:'immune', label:'White blood cells', unit:'×10³/µL', code:'white_blood_cells' }
  ];
  const dailyKeys = ['systolic','diastolic','heart','sleep','glucose','temperature'];
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const hasReading = metric => !!metric && !metric.private && !metric.unsupported && finite(metric.value);
  function age(metric, day) {
    if (metric?.private) return {kind:'private', text:'Private'};
    if (metric?.unsupported) return {kind:'unsupported', text:'Not in this source'};
    if (!hasReading(metric)) return {kind:'missing', text:'No reading'};
    if (!Number.isInteger(metric.missionDay)) return {kind:'unknown', text:'Measurement day unknown'};
    const elapsed = day - metric.missionDay;
    if (elapsed < 0) return {kind:'future', text:'Future-dated · verify source'};
    return elapsed === 0 ? {kind:'current', text:`Mission day ${day}`} :
      {kind:'older', text:`${elapsed} mission day${elapsed === 1 ? '' : 's'} old · day ${metric.missionDay}`};
  }
  function coverage(person, day, expected = dailyKeys) {
    const supported = [...new Set(expected)].filter(key => definitions.some(d => d.key === key) &&
      person.metrics?.[key] && !person.metrics[key].unsupported && !person.metrics[key].private);
    const missing = supported.filter(key => age(person.metrics[key], day).kind !== 'current');
    return {total:supported.length, current:supported.length - missing.length, missing};
  }
  function status(person, day, expected = dailyKeys) {
    const summary = person.summary || {}, areas = Object.values(summary.areas || {});
    const flags = definitions.flatMap(def => {
      const metric = person.metrics?.[def.key];
      if (!hasReading(metric) || !Number.isInteger(metric.missionDay) || metric.missionDay > day ||
          !['watch','out_of_range'].includes(metric.status)) return [];
      return [{key:def.key, label:def.label, value:metric.value, unit:metric.unit,
        severity:metric.status === 'out_of_range' ? 'review' : 'watch', day:metric.missionDay,
        reason:`${def.label}: source ${metric.status.replaceAll('_',' ')} flag`}];
    });
    const data = coverage(person, day, expected);
    const severe = summary.status === 'out_of_range' || summary.alertLevel === 'high' || areas.includes('alert');
    const watch = summary.status === 'watch' || summary.alertLevel === 'medium' || areas.includes('warn');
    const knownStatus = ['normal','ok','routine'].includes(summary.status) ||
      summary.alertLevel === 'low' || areas.length > 0 && areas.every(area => area === 'ok');
    let key = severe || flags.some(f => f.severity === 'review') ? 'review' :
      watch || flags.length ? 'followup' : !data.total || data.missing.length || !knownStatus ? 'unknown' : 'routine';
    const labels = {review:'Source review flag',followup:'Source follow-up flag',unknown:'Insufficient data / status',routine:'No source flags'};
    const colors = {review:'danger',followup:'gold',unknown:'muted',routine:'teal'};
    const reasons = flags.map(flag => flag.reason);
    if (severe || watch) reasons.unshift(`Source summary: ${severe ? 'review' : 'follow-up'} flag`);
    if (data.missing.length) reasons.push('Current-day readings missing: ' + data.missing.map(k => definitions.find(d => d.key === k).label).join(', '));
    if (!knownStatus && !severe && !watch) reasons.push('Source has no interpretable general status');
    if (!reasons.length) reasons.push('Available source status has no watch or review flags');
    return {key, text:labels[key], color:colors[key], flags, coverage:data, reasons,
      rank:{review:0,followup:1,unknown:2,routine:3}[key]};
  }
  function sortPeople(people, day, expected) {
    return [...people].sort((a,b) => status(a,day,expected).rank - status(b,day,expected).rank || a.name.localeCompare(b.name));
  }
  function baseline(person, key, impact) {
    const def = definitions.find(d => d.key === key);
    if (!def) return null;
    let value = person.baseline?.[def.baseline];
    if (key === 'systolic' || key === 'diastolic') {
      const pair = typeof value === 'string' && value.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
      value = pair ? Number(pair[key === 'systolic' ? 1 : 2]) : null;
    }
    if (finite(value)) return {value, label:'Personal reference supplied by source', n:null};
    const records = impact?.people?.find(p => p.id === person.id)?.records || [];
    const values = records.filter(r => r.missionDay >= -30 && r.missionDay <= -1)
      .map(r => r.values?.[def.code]).filter(finite);
    if (!values.length) return null;
    return {value:values.reduce((sum,v) => sum+v,0)/values.length,
      label:'Personal pre-mission mean · days −30 to −1', n:values.length};
  }
  function series(person, key, untilDay) {
    const points = person.historyByMetric?.[key] || (key === 'heart' ? person.history : []) || [];
    const byDay = new Map();
    [...points].filter(p => Number.isInteger(p.missionDay) && p.missionDay >= 1 &&
      p.missionDay <= untilDay && finite(p.value)).sort((a,b) => a.missionDay-b.missionDay || String(a.date).localeCompare(String(b.date)))
      .forEach(p => byDay.set(p.missionDay,p));
    return [...byDay.values()];
  }
  function safeLink(value) {
    if (!value) return null;
    try {
      const url = new URL(value);
      if (url.username || url.password || !['https:','http:'].includes(url.protocol)) return null;
      if (url.protocol === 'http:' && !['localhost','127.0.0.1','[::1]'].includes(url.hostname)) return null;
      return url.href;
    } catch { return null; }
  }
  function teamSeries(people,key,untilDay,period=7) {
    const first=period === 0 ? 1 : Math.max(1,untilDay-period+1);
    const days=new Map();
    for (const person of people) for (const point of series(person,key,untilDay)) {
      if (point.missionDay < first || person.metrics?.[key]?.unsupported || person.metrics?.[key]?.private) continue;
      if (!days.has(point.missionDay)) days.set(point.missionDay,[]);
      days.get(point.missionDay).push(point.value);
    }
    return [...days].sort(([a],[b])=>a-b).map(([missionDay,values])=>({missionDay,
      value:values.reduce((sum,value)=>sum+value,0)/values.length,
      min:Math.min(...values),max:Math.max(...values),count:values.length,total:people.length}));
  }
  const api = {definitions,dailyKeys,hasReading,age,coverage,status,sortPeople,baseline,series,safeLink,teamSeries};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Monitoring = api;
})(typeof window !== 'undefined' ? window : globalThis);
