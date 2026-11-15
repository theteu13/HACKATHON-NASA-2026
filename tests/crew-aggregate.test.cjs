const {test}=require('node:test');
const assert=require('node:assert/strict');
const {aggregateCrewDay}=require('../src/features/crew/crew-aggregate.js');
const {blankMetrics}=require('../src/services/health-data.js');
function person(id, readings){
  const metrics=blankMetrics();
  for(const [key,[value,missionDay,status]] of Object.entries(readings))metrics[key]={value,missionDay,status,unit:metrics[key].unit};
  return {id,name:id,metrics};
}
test('same-day means exclude missing, older, and future readings without treating them as zero',()=>{
  const crew=[person('a',{heart:[60,12]}),person('b',{heart:[80,12]}),person('c',{heart:[100,11]}),person('d',{heart:[120,13]}),person('e',{})];
  const result=aggregateCrewDay(crew,12).metrics.heart;
  assert.equal(result.value,70);assert.equal(result.count,2);assert.equal(result.total,5);
  assert.equal(result.min,60);assert.equal(result.max,80);
});
test('blood pressure uses the same complete contributors for systolic and diastolic means',()=>{
  const crew=[person('a',{systolic:[120,12],diastolic:[80,12]}),person('b',{systolic:[140,12],diastolic:[90,11]}),person('c',{systolic:[100,12],diastolic:[60,12]})];
  const m=aggregateCrewDay(crew,12).metrics;
  assert.equal(m.systolic.value,110);assert.equal(m.diastolic.value,70);
  assert.equal(m.systolic.count,2);assert.equal(m.diastolic.count,2);
});
test('older individual source flags remain visible even if there is no same-day mean',()=>{
  const crew=[person('a',{bone:[1.1,5,'out_of_range']}),person('b',{bone:[1.2,8,'normal']})];
  const m=aggregateCrewDay(crew,12).metrics.bone;
  assert.equal(m.value,null);assert.equal(m.count,0);assert.equal(m.status,'out_of_range');
  assert.equal(m.flaggedMembers[0].id,'a');assert.equal(m.flaggedMembers[0].missionDay,5);
});
test('a diastolic source flag also colors the collective pressure indicator',()=>{
  const m=aggregateCrewDay([person('a',{systolic:[120,12,'normal'],diastolic:[80,12,'watch']})],12).metrics;
  assert.equal(m.systolic.status,'watch');assert.equal(m.systolic.flaggedMembers.length,1);
});
test('private psychological values are never averaged and unknown metric status is not invented',()=>{
  const p=person('a',{heart:[65,12]});p.metrics.mood={value:5,missionDay:12,private:true};
  const before=JSON.stringify(p),m=aggregateCrewDay([p],12).metrics;
  assert.equal(m.mood.value,null);assert.equal(m.mood.private,true);assert.equal(m.mood.count,0);
  assert.equal(m.heart.status,'recorded');assert.equal(JSON.stringify(p),before);
});
test('empty or unsupported data has no fabricated average or future alert',()=>{
  const p=person('a',{heart:[120,13,'out_of_range']});
  const m=aggregateCrewDay([p],12).metrics;
  assert.equal(m.heart.value,null);assert.equal(m.heart.flaggedMembers.length,0);
  assert.equal(m.glucose.unsupported,true);assert.equal(m.glucose.value,null);
  assert.equal(aggregateCrewDay([],12).metrics.heart.total,0);
});
