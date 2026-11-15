// Connected physical indicators use recorded values and source flags only.
function renderBodyCallouts() {
  const m = selected.metrics;
  const bpPresent = m.systolic.value !== null && m.diastolic.value !== null;
  const entries = [
    { key:'temperature', label:'Body temperature', symbol:'temperature', metric:m.temperature, area:[480,155], value:format(m.temperature.value) },
    { key:'pressure', label:'Blood pressure', symbol:'heart', metric:m.systolic, area:[475,265], value:bpPresent?`${format(m.systolic.value)}/${format(m.diastolic.value)}`:'—', unit:'mmHg' },
    { key:'glucose', label:'Blood glucose', symbol:'drop', metric:m.glucose, area:[475,325], value:format(m.glucose.value) },
    { key:'nutrition', label:'Nutrition', symbol:'leaf', metric:m.nutrition, area:[480,355], value:format(m.nutrition.value) },
    { key:'sleep', label:'Sleep', symbol:'moon', metric:m.sleep, area:[520,155], value:format(m.sleep.value) },
    { key:'heart', label:'Heart rate', symbol:'activity', metric:m.heart, area:[525,265], value:format(m.heart.value) },
    { key:'immune', label:'White blood cells', symbol:'shield', metric:m.immune, area:[525,325], value:format(m.immune.value) },
    { key:'bone', label:'Bone density', symbol:'bone', metric:m.bone, area:[520,470], value:format(m.bone.value) }
  ];
  const tone = metric => metric.value===null?'empty':metric.status==='out_of_range'?'alert':metric.status==='watch'?'watch':metric.status==='normal'?'normal':'recorded';
  const note = metric => metric.unsupported?'Not in this dataset':metric.value===null?'No reading available':metric.missionDay?`Day ${metric.missionDay}${metric.status==='watch'?' · Watch':metric.status==='out_of_range'?' · Source flag':''}`:'Recorded value';
  document.getElementById('body-callouts').innerHTML=entries.map((entry,i)=>{
    const side=i<4?'left':'right',row=i%4,unit=entry.unit||entry.metric.unit;
    return `<article class="body-callout callout-${side} callout-row-${row} tone-${tone(entry.metric)}" aria-label="${entry.label}: ${entry.value}${entry.metric.value===null?'':' '+unit}. ${note(entry.metric)}"><h4>${icon(entry.symbol)}${entry.label}<i class="callout-status" aria-hidden="true"></i></h4><div class="callout-value">${entry.value}${entry.metric.value===null?'':`<small>${unit}</small>`}</div><p>${note(entry.metric)}</p></article>`;
  }).join('');
  document.getElementById('body-connectors').innerHTML=entries.map((entry,i)=>{
    const left=i<4, start=left?280:720, elbow=left?340:660, rowY=75+(i%4)*144, [x,y]=entry.area;
    return `<g class="connector tone-${tone(entry.metric)}"><polyline points="${start},${rowY} ${elbow},${rowY} ${left?x-30:x+30},${y} ${x},${y}"/><circle cx="${x}" cy="${y}" r="5"/><circle class="connector-halo" cx="${x}" cy="${y}" r="11"/></g>`;
  }).join('');
  document.getElementById('body-avatar-caption').textContent=selected.name+' · connected health overview';
}
