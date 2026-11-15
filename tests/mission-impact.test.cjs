const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../src/features/mission-impact/mission-impact.js');
const metric=M.indicators.find(m=>m.code==='heart_rate');
function person(id,pre,post){return {id,name:id,records:[...pre.map(([day,value])=>({missionDay:day,values:{heart_rate:value}})),...post.map(([day,value])=>({missionDay:day,values:{heart_rate:value}}))]};}
test('compares means, sample SD, percent change, personal deviation band and standardized shift',()=>{
  const result=M.compareIndicator([person('a',[[-2,1],[-1,3]],[[1,3],[2,5]])],metric);
  assert.equal(result.baselineMean,2);assert.equal(result.missionMean,4);assert.equal(result.delta,2);assert.equal(result.deltaPct,100);
  assert.ok(Math.abs(result.baselineSD-Math.sqrt(2))<1e-12);
  assert.ok(Math.abs(result.sdShift-Math.sqrt(2))<1e-12);
  assert.equal(result.outsideBand,1);assert.equal(result.bandN,2);assert.equal(result.outsideBandPct,50);
});
test('pairs the same people and gives equal crew weights rather than pooling repeated samples',()=>{
  const a=person('a',[[-2,1],[-1,3]],[[1,3],[2,5]]);
  const b=person('b',Array.from({length:30},(_,i)=>[i-30,100]),Array.from({length:180},(_,i)=>[i+1,110]));
  const unpaired=person('c',[],[[1,9999]]);
  const result=M.compareIndicator([a,b,unpaired],metric);
  assert.equal(result.baselineMean,51);assert.equal(result.missionMean,57);assert.equal(result.delta,6);
  assert.equal(result.pairedCrew,2);assert.equal(result.totalCrew,3);assert.equal(result.baselineN,32);assert.equal(result.missionN,182);
  assert.equal(result.sdShiftCrew,1);
});
test('excludes day zero, outside-window values, missing values and future follow-up',()=>{
  const a=person('a',[[-31,999],[-30,10],[-1,20],[0,999]],[[1,20],[2,30],[3,40],[181,999]]);
  const result=M.compareIndicator([a],metric,2);
  assert.equal(result.baselineN,2);assert.equal(result.missionN,2);assert.equal(result.baselineMean,15);assert.equal(result.missionMean,25);
  const analysis=M.analyze({mission:{today:2},people:[a]});
  assert.equal(analysis.untilDay,2);assert.equal(analysis.observedMissionDays,2);assert.equal(analysis.lastObservedDay,2);
});
test('zero or insufficient baseline variability does not generate infinite SD statistics',()=>{
  const result=M.compareIndicator([person('a',[[-2,5],[-1,5]],[[1,6],[2,7]])],metric);
  assert.equal(result.sdShift,null);assert.equal(result.sdRatio,null);assert.equal(result.bandN,0);assert.equal(result.outsideBandPct,null);
  const sparse=M.compareIndicator([person('a',[[-1,5]],[[1,6]])],metric);
  assert.equal(sparse.baselineSD,null);assert.equal(sparse.missionSD,null);assert.equal(sparse.sdCrew,0);
});
test('uses actual day spacing for slopes and preserves sparse weekly gaps',()=>{
  const a=person('a',[[-30,1],[-1,1]],[[1,2],[11,4],[21,6]]);
  const result=M.compareIndicator([a],metric);
  assert.ok(Math.abs(result.missionSlopePer30-6)<1e-12);
  assert.ok(result.weekly.some(w=>w.phase==='mission'&&w.value===null));
  assert.equal(result.missionN,3);
});
test('deduplicates crew days and strips private or unknown fields',()=>{
  const rows=M.physicalRecords([{missionDay:1,timestamp:'2026-01-01T10:00Z',values:{heart_rate:60,mood:1,private_note:'private'}},{missionDay:1,timestamp:'2026-01-01T09:00Z',values:{heart_rate:99}},{missionDay:2,values:{heart_rate:null}}]);
  assert.equal(rows.length,2);assert.equal(rows[0].values.heart_rate,60);
  assert.equal(Object.hasOwn(rows[0].values,'mood'),false);assert.equal(Object.hasOwn(rows[0].values,'private_note'),false);
  assert.ok(!M.indicators.some(m=>m.code==='mood'));
});
test('does not express Celsius change or zero baseline change as a percentage',()=>{
  const p={id:'a',name:'a',records:[{missionDay:-1,values:{body_temperature:36.5,heart_rate:0}},{missionDay:1,values:{body_temperature:37,heart_rate:2}}]};
  const t=M.compareIndicator([p],M.indicators.find(m=>m.code==='body_temperature'));
  assert.equal(t.delta,.5);assert.equal(t.deltaPct,null);
  assert.equal(M.compareIndicator([p],metric).deltaPct,null);
});
test('does not fabricate baseline observations for mission-only data',()=>{
  const result=M.compareIndicator([person('a',[],[[1,65],[2,67]])],metric);
  assert.equal(result.pairedCrew,0);assert.equal(result.baselineMean,null);assert.equal(result.delta,null);
});
