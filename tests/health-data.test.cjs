const {test}=require('node:test');
const assert=require('node:assert/strict');
const H=require('../health-data.js');
const profile={id:'ast-01',name:'Test Crew',crewId:'ORB3-TEST'};
function log(type,data,day=12,id='test'){return {id,astronautId:'ast-01',type,data,missionDay:day,timestamp:`2026-11-${String(day+2).padStart(2,'0')}T08:00:00Z`,provenance:'USER_REPORTED'};}
test('app maps typed logs, keeps missing values null, and excludes other profiles',()=>{
  const logs=[log('measurement',{metric:'blood_pressure',values:{systolic:118,diastolic:76,pulse:63}},11),log('sleep',{durationMin:450}),log('mood',{level:2}),{...log('mood',{level:5}),astronautId:'ast-other'}];
  const p=H.appPerson(profile,logs,{},12);
  assert.equal(p.metrics.heart.value,63);assert.equal(p.metrics.heart.missionDay,11);
  assert.equal(p.metrics.sleep.value,7.5);assert.equal(p.metrics.mood.value,2);
  assert.equal(p.metrics.glucose.value,null);assert.equal(p.metrics.glucose.unsupported,true);
  assert.equal(p.metrics.temperature.value,null);assert.equal(p.metrics.immune.value,null);
  assert.equal(p.logs.length,3);
});
test('ground projection excludes mood, sleep, private text and evidence',()=>{
  const p=H.appGroundPerson({astronaut:profile,overallScore:70,mood:{level:1},sleepAvg7dHours:4,latestAlert:{level:'high',text:'PRIVATE',evidence:['secret']},activeAlerts:1});
  assert.ok(!JSON.stringify(p).includes('PRIVATE'));assert.ok(!JSON.stringify(p).includes('secret'));
  assert.equal(p.metrics.mood.value,null);assert.equal(p.metrics.sleep.value,null);assert.equal(p.summary.alertLevel,'high');
});
test('synthetic columns retain distinct units and sparse measurement dates',()=>{
  const p=H.syntheticPerson({id:'A001',displayName:'A001',role:'Commander'},[{missionDay:4,date:'2026-01-04',values:{heart_rate:62,bone_density:1.1}}],{status:'watch',values:{bone_density:{value:1.1,lastMeasuredDay:4,status:'watch'},blood_glucose:{value:95,lastMeasuredDay:12,status:'normal'}}});
  assert.equal(p.metrics.bone.value,1.1);assert.equal(p.metrics.bone.missionDay,4);
  assert.equal(p.metrics.glucose.value,95);assert.equal(p.metrics.glucose.unsupported,undefined);assert.equal(p.metrics.immune.value,null);
});
test('log payloads use actual API types and enforce input constraints',()=>{
  assert.equal(JSON.stringify(H.buildLog('blood_pressure',{systolic:118,diastolic:76,pulse:63})),JSON.stringify({type:'measurement',data:{metric:'blood_pressure',values:{systolic:118,diastolic:76,pulse:63}}}));
  assert.throws(()=>H.buildLog('blood_pressure',{systolic:50,diastolic:90,pulse:63}));
  assert.throws(()=>H.buildLog('mood',{level:1.5}));
  assert.throws(()=>H.buildLog('sleep',{bedtime:'2026-11-14T00:00:00Z',wakeTime:'2026-11-15T00:00:00Z',quality:3}));
  assert.equal(H.buildLog('sleep',{bedtime:'2026-11-14T00:00:00Z',wakeTime:'2026-11-14T07:00:00Z',quality:3}).data.source,'manual');
});
test('API client does not retry failed writes and rejects unsafe origins',async()=>{
  assert.throws(()=>new H.Client('http://example.com'));assert.throws(()=>new H.Client('https://user:secret@example.com'));assert.throws(()=>new H.Client('https://example.com/api'));
  let calls=0;
  const c=new H.Client('http://127.0.0.1:8000',async(url,options)=>{calls++;assert.equal(options.method,'POST');return {ok:false,status:422,json:async()=>({detail:[{msg:'invalid field'}]})};});
  await assert.rejects(()=>c.saveLog({}),/invalid field/);assert.equal(calls,1);
});
