const {test}=require('node:test');
const assert=require('node:assert/strict');
const {describe}=require('../avatar-behavior.js');
function person(status='normal',value=65,day=12){return {summary:{status},metrics:{heart:{value,missionDay:day,unit:'bpm'},mood:{value:1,private:true,missionDay:12,status:'out_of_range'}}};}
test('routine motion requires current physical readings and ignores private mood',()=>{
  assert.equal(describe([person()],12).state,'routine');
});
test('missing current-day data gives a neutral state instead of a healthy animation',()=>{
  assert.equal(describe([person('normal',65,11)],12).state,'unknown');
  assert.equal(describe([person(),person('normal',null)],12).state,'unknown');
  assert.equal(describe([],12).state,'unknown');
});
test('one individual review flag takes precedence over all other crew and any mean',()=>{
  const a=person(),b=person('watch'),c=person();
  c.metrics.heart.status='out_of_range';
  const result=describe([a,b,c],12);
  assert.equal(result.state,'review');assert.equal(result.review,1);assert.equal(result.watch,1);
});
test('older source flags remain visible but future flags cannot drive current behavior',()=>{
  const old=person('normal',65,10);old.metrics.heart.status='watch';
  assert.equal(describe([old],12).state,'watch');
  const future=person('normal',120,13);future.metrics.heart.status='out_of_range';
  assert.equal(describe([future],12).state,'unknown');
});
test('source body-area alerts affect behavior without adding numeric health thresholds',()=>{
  const a=person('normal',300); // Value alone does not create a diagnosis or flag.
  assert.equal(describe([a],12).state,'routine');
  a.summary.areas={torso:'alert'};
  assert.equal(describe([a],12).state,'review');
});
