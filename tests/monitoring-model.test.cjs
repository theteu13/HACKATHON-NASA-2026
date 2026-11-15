const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../src/features/monitoring/monitoring-model.js');
const H=require('../src/services/health-data.js');
function person(status='normal') {
  const metrics=H.blankMetrics();
  for(const key of ['systolic','diastolic','heart','sleep']) metrics[key]={value:65,unit:'test',missionDay:12};
  return {id:'crew-1',name:'Crew 1',summary:{status},metrics};
}
test('source metric flags override a normal summary consistently',()=>{
  const p=person();p.metrics.diastolic.status='out_of_range';
  const result=M.status(p,12);
  assert.equal(result.key,'review');
  assert.equal(result.flags[0].key,'diastolic');
  assert.ok(result.reasons.some(reason=>reason.includes('Diastolic')));
});
test('current-day gaps and unavailable general status never become reassuring green',()=>{
  const old=person();old.metrics.heart.missionDay=11;
  assert.equal(M.status(old,12).key,'unknown');
  assert.equal(M.status(person('no_data'),12).key,'unknown');
  assert.equal(M.status(person('unrecognized-status'),12).key,'unknown');
  const scoreOnly=person();scoreOnly.summary={overallScore:95};
  assert.equal(M.status(scoreOnly,12).key,'unknown');
  assert.equal(M.status(person(),12).key,'routine');
});
test('older source flags persist while future and private flags are excluded',()=>{
  const p=person();p.metrics.heart={value:62,missionDay:10,status:'watch'};
  p.metrics.mood={value:1,missionDay:12,status:'out_of_range',private:true};
  assert.equal(M.status(p,12).key,'followup');
  assert.equal(M.status(p,12).flags.length,1);
  p.metrics.heart.missionDay=13;
  assert.equal(M.status(p,12).key,'unknown');
  assert.equal(M.status(p,12).flags.length,0);
});
test('daily coverage excludes unsupported, private and non-daily indicators',()=>{
  const p=person();p.metrics.bone={value:1.1,missionDay:4};
  assert.deepEqual(M.coverage(p,12),{total:4,current:4,missing:[]});
  assert.equal(M.coverage(p,12,['heart','bone']).current,1);
  assert.equal(M.coverage(p,12,['heart','heart','mood','not-a-metric']).total,1);
});
test('age uses measurement mission day rather than API loading time',()=>{
  assert.equal(M.age({value:70,missionDay:10},12).kind,'older');
  assert.ok(M.age({value:70,missionDay:10},12).text.includes('2 mission days old'));
  assert.equal(M.age({value:70},12).kind,'unknown');
  assert.equal(M.age({value:70,missionDay:13},12).kind,'future');
  assert.equal(M.age({value:null},12).kind,'missing');
  assert.equal(M.age({value:null,unsupported:true},12).kind,'unsupported');
});
test('queue order prioritizes source review flags, follow-up, data gaps and no flags',()=>{
  const routine=person(),review=person(),watch=person(),unknown=person('no_data');
  review.summary.status='out_of_range';watch.summary.status='watch';
  const original=[routine,unknown,watch,review];
  assert.deepEqual(M.sortPeople(original,12),[review,watch,unknown,routine]);
  assert.equal(original[0],routine);
});
test('personal source reference and preflight baseline retain their different meanings',()=>{
  const p=person();p.baseline={restingHr:60,restingBp:'118/76'};
  assert.equal(M.baseline(p,'heart').value,60);
  assert.equal(M.baseline(p,'diastolic').value,76);
  assert.equal(M.baseline(p,'temperature'),null);
  const impact={people:[{id:p.id,records:[
    {missionDay:-2,values:{body_temperature:36}},
    {missionDay:-1,values:{body_temperature:37}},
    {missionDay:0,values:{body_temperature:99}},
    {missionDay:1,values:{body_temperature:99}}
  ]}]};
  assert.equal(M.baseline(p,'temperature',impact).value,36.5);
  assert.equal(M.baseline(p,'temperature',impact).n,2);
});
test('series deduplicates daily readings and excludes nonfinite, preflight and future values',()=>{
  const p=person();p.historyByMetric={heart:[
    {missionDay:-1,value:60},{missionDay:1,date:'2026-01-01T08:00:00Z',value:61},
    {missionDay:1,date:'2026-01-01T09:00:00Z',value:62},{missionDay:3,value:null},
    {missionDay:5,value:64},{missionDay:6,value:Infinity},{missionDay:13,value:99}
  ]};
  assert.deepEqual(M.series(p,'heart',12).map(p=>[p.missionDay,p.value]),[[1,62],[5,64]]);
});
test('external case links reject executable URLs and embedded credentials',()=>{
  assert.equal(M.safeLink('javascript:alert(1)'),null);
  assert.equal(M.safeLink('https://user:pass@example.com'),null);
  assert.equal(M.safeLink('http://example.com/patient'),null);
  assert.equal(M.safeLink('https://example.com/case/1'),'https://example.com/case/1');
});
test('app histories include physical indicators and daily recorded intake without private fields',()=>{
  const logs=[
    {astronautId:'a',missionDay:1,timestamp:'2026-01-01T08:00:00Z',type:'measurement',data:{metric:'blood_pressure',values:{systolic:118,diastolic:76,pulse:62}}},
    {astronautId:'a',missionDay:1,timestamp:'2026-01-01T09:00:00Z',type:'sleep',data:{durationMin:420}},
    ...[300,400].map((kcal,i)=>({astronautId:'a',missionDay:1,timestamp:`2026-01-01T${10+i}:00:00Z`,type:'meal',data:{kcal}}))
  ];
  const p=H.appPerson({id:'a'},logs,{},1);
  assert.equal(p.historyByMetric.diastolic[0].value,76);
  assert.equal(p.historyByMetric.sleep[0].value,7);
  assert.equal(p.historyByMetric.nutrition[0].value,700);
  assert.equal(p.historyByMetric.mood,undefined);
});
