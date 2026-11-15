const {test}=require('node:test');
const assert=require('node:assert/strict');
const {derive,collect}=require('../src/features/avatar/avatar-needs.js');
const mission={today:12,goals:{sleepHours:7,kcalPerDay:2500}};
function person(id='a'){
  return {id,name:id,summary:{status:'normal'},metrics:{systolic:{value:118,missionDay:12},diastolic:{value:76,missionDay:12},heart:{value:65,missionDay:12},sleep:{value:7,missionDay:12},nutrition:{value:2500,missionDay:12},glucose:{value:null,unsupported:true},temperature:{value:null,unsupported:true},mood:{value:1,private:true,status:'out_of_range',missionDay:12}}};
}
test('complete readings and met goals produce no pending prompts; private mood is ignored',()=>{
  assert.equal(derive(person(),mission).length,0);
});
test('rest prompts require a same-day measurement and an explicit mission goal',()=>{
  const p=person();p.metrics.sleep.value=6;
  assert.ok(derive(p,mission).some(s=>s.kind==='rest'));
  assert.ok(!derive(p,{today:12,goals:{}}).some(s=>s.kind==='rest'));
  p.metrics.sleep.missionDay=11;
  const signals=derive(p,mission);
  assert.ok(!signals.some(s=>s.kind==='rest'));
  assert.ok(signals.some(s=>s.kind==='readings'));
});
test('nutrition progress is informational and explicitly does not infer hunger',()=>{
  const p=person();p.metrics.nutrition.value=1000;
  const signal=derive(p,mission).find(s=>s.kind==='nutrition');
  assert.equal(signal.severity,'info');assert.ok(signal.detail.includes('does not establish hunger'));
  p.metrics.nutrition.missionDay=11;
  assert.ok(!derive(p,mission).some(s=>s.kind==='nutrition'));
});
test('unsupported readings are not requested and pending telemetry does not imply a medical finding',()=>{
  const p=person();p.metrics.heart.missionDay=11;
  const pending=derive(p,mission).find(s=>s.kind==='readings');
  assert.ok(pending.detail.includes('heart rate'));assert.ok(!pending.detail.includes('blood glucose'));
  assert.ok(pending.detail.includes('not a medical finding'));
});
test('team source review flags take priority and prompts clear when source conditions resolve',()=>{
  const a=person('a'),b=person('b');a.metrics.sleep.value=6;b.summary.status='out_of_range';
  const signals=collect([a,b],mission);
  assert.equal(signals[0].personId,'b');assert.equal(signals[0].kind,'care');
  assert.equal(signals[0].severity,'review');
  a.metrics.sleep.value=7;b.summary.status='normal';
  assert.equal(collect([a,b],mission).length,0);
});
