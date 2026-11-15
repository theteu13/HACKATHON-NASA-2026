// Descriptive, within-person comparisons; no causal estimate or clinical alert is inferred.
(function(global){
  const indicators=[
    {code:'systolic_bp',label:'Systolic blood pressure',unit:'mmHg',decimals:1,cadence:'daily'},
    {code:'diastolic_bp',label:'Diastolic blood pressure',unit:'mmHg',decimals:1,cadence:'daily'},
    {code:'heart_rate',label:'Heart rate',unit:'bpm',decimals:1,cadence:'daily'},
    {code:'blood_glucose',label:'Blood glucose',unit:'mg/dL',decimals:1,cadence:'daily'},
    {code:'body_temperature',label:'Body temperature',unit:'°C',decimals:2,cadence:'daily',allowPercent:false},
    {code:'sleep_hours',label:'Sleep',unit:'h',decimals:2,cadence:'daily'},
    {code:'bone_density',label:'Bone density',unit:'g/cm²',decimals:3,cadence:'monthly'},
    {code:'calorie_intake',label:'Calorie intake',unit:'kcal',decimals:0,cadence:'daily'},
    {code:'protein_intake',label:'Protein intake',unit:'g',decimals:1,cadence:'daily'},
    {code:'white_blood_cells',label:'White blood cells',unit:'×10³/µL',decimals:2,cadence:'weekly'}
  ];
  const finite=value=>typeof value==='number'&&Number.isFinite(value);
  const mean=values=>values.length?values.reduce((sum,v)=>sum+v,0)/values.length:null;
  const average=values=>mean(values.filter(finite));
  function summarize(points){
    const values=points.map(p=>p.value),avg=mean(values),n=values.length;
    const sd=n>1?Math.sqrt(values.reduce((sum,v)=>sum+(v-avg)**2,0)/(n-1)):null;
    const dayMean=mean(points.map(p=>p.day));
    const denominator=n>1?points.reduce((sum,p)=>sum+(p.day-dayMean)**2,0):0;
    const slope=denominator>0?points.reduce((sum,p)=>sum+(p.day-dayMean)*(p.value-avg),0)/denominator:null;
    return {n,mean:avg,sd,slopePer30:finite(slope)?slope*30:null,firstDay:n?points[0].day:null,lastDay:n?points.at(-1).day:null};
  }
  function physicalRecords(records){
    const byDay=new Map();
    for(const record of records||[]){
      if(!Number.isInteger(record.missionDay)||record.missionDay===0||record.missionDay< -30||record.missionDay>180)continue;
      const old=byDay.get(record.missionDay);
      if(old&&(old.timestamp||old.date||'')>(record.timestamp||record.date||''))continue;
      byDay.set(record.missionDay,{missionDay:record.missionDay,date:record.date,timestamp:record.timestamp,
        values:Object.fromEntries(indicators.map(m=>[m.code,finite(record.values?.[m.code])?record.values[m.code]:null]))});
    }
    return [...byDay.values()].sort((a,b)=>a.missionDay-b.missionDay);
  }
  function comparePerson(person,code,untilDay){
    const records=physicalRecords(person.records);
    const points=records.filter(r=>finite(r.values[code])).map(r=>({day:r.missionDay,value:r.values[code]}));
    const before=points.filter(p=>p.day>= -30&&p.day<= -1),during=points.filter(p=>p.day>=1&&p.day<=untilDay);
    const baseline=summarize(before),mission=summarize(during),paired=baseline.n>0&&mission.n>0;
    const delta=paired?mission.mean-baseline.mean:null;
    const deltaPct=paired&&baseline.mean!==0&&code!=='body_temperature'?delta/Math.abs(baseline.mean)*100:null;
    const sdShift=paired&&baseline.sd>0?delta/baseline.sd:null;
    const bandEligible=paired&&baseline.sd>0;
    const outsideBand=bandEligible?during.filter(p=>Math.abs(p.value-baseline.mean)>2*baseline.sd).length:null;
    return {id:person.id,name:person.name,records,points,before,during,baseline,mission,paired,delta,deltaPct,sdShift,
      bandN:bandEligible?during.length:0,outsideBand};
  }
  function compareIndicator(people,indicator,untilDay=180){
    const end=Math.max(0,Math.min(180,Math.trunc(untilDay)));
    const persons=people.map(p=>comparePerson(p,indicator.code,end)),paired=persons.filter(p=>p.paired);
    const baselineMean=average(paired.map(p=>p.baseline.mean)),missionMean=average(paired.map(p=>p.mission.mean));
    const delta=paired.length?missionMean-baselineMean:null;
    const sdPairs=paired.filter(p=>finite(p.baseline.sd)&&finite(p.mission.sd));
    const baselineSD=average(sdPairs.map(p=>p.baseline.sd)),missionSD=average(sdPairs.map(p=>p.mission.sd));
    const bandN=paired.reduce((n,p)=>n+p.bandN,0),outsideBand=bandN?paired.reduce((n,p)=>n+(p.outsideBand||0),0):null;
    const weekly=[];
    for(const [phase,start,endDay] of [['baseline',-30,-1],['mission',1,end]]){
      for(let first=start;first<=endDay;first+=7){
        const last=Math.min(first+6,endDay);
        const contributors=paired.map(person=>{
          const values=person.points.filter(p=>p.day>=first&&p.day<=last).map(p=>p.value);
          return values.length?{value:mean(values),n:values.length}:null;
        }).filter(Boolean);
        weekly.push({phase,from:first,to:last,day:(first+last)/2,value:average(contributors.map(c=>c.value)),crew:contributors.length,n:contributors.reduce((sum,c)=>sum+c.n,0)});
      }
    }
    return {...indicator,untilDay:end,totalCrew:people.length,pairedCrew:paired.length,persons,
      baselineMean,missionMean,delta,deltaPct:indicator.allowPercent!==false&&baselineMean!==null&&baselineMean!==0?delta/Math.abs(baselineMean)*100:null,
      baselineSD,missionSD,sdCrew:sdPairs.length,sdDelta:baselineSD!==null&&missionSD!==null?missionSD-baselineSD:null,sdRatio:baselineSD>0?missionSD/baselineSD:null,
      sdShift:average(paired.map(p=>p.sdShift)),sdShiftCrew:paired.filter(p=>finite(p.sdShift)).length,
      baselineN:paired.reduce((n,p)=>n+p.baseline.n,0),missionN:paired.reduce((n,p)=>n+p.mission.n,0),
      bandN,outsideBand,outsideBandPct:bandN?outsideBand/bandN*100:null,
      baselineSlopePer30:average(paired.map(p=>p.baseline.slopePer30)),missionSlopePer30:average(paired.map(p=>p.mission.slopePer30)),
      weekly,baselineDates:dateRange(paired.flatMap(p=>p.records.filter(r=>r.missionDay<0&&finite(r.values[indicator.code])))),
      missionDates:dateRange(paired.flatMap(p=>p.records.filter(r=>r.missionDay>=1&&r.missionDay<=end&&finite(r.values[indicator.code]))))};
  }
  function dateRange(records){const dates=records.map(r=>r.date).filter(d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}/.test(d)).sort();return dates.length?[dates[0].slice(0,10),dates.at(-1).slice(0,10)]:null;}
  function analyze(dataset,subject='team'){
    const people=subject==='team'?dataset.people:dataset.people.filter(p=>p.id===subject);
    const untilDay=Math.max(0,Math.min(180,dataset.mission.today??180));
    const observedDays=[...new Set(people.flatMap(p=>physicalRecords(p.records).filter(r=>r.missionDay>=1&&r.missionDay<=untilDay&&Object.values(r.values).some(finite)).map(r=>r.missionDay)))];
    return {subject,people:people.length,untilDay,observedMissionDays:observedDays.length,lastObservedDay:observedDays.length?Math.max(...observedDays):null,
      metrics:indicators.map(m=>compareIndicator(people,m,untilDay))};
  }
  const api={indicators,summarize,physicalRecords,comparePerson,compareIndicator,analyze};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else global.MissionImpact=api;
})(typeof window!=='undefined'?window:globalThis);
