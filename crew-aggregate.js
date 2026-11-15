// Descriptive averages only. No thresholds or clinical interpretations are added.
(function(global) {
  const keys = ['systolic','diastolic','heart','glucose','temperature','sleep','bone','nutrition','immune'];
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  function aggregateCrewDay(people, missionDay) {
    const metrics = {};
    const valid = (person,key) => {const m=person.metrics[key];return m&&!m.private&&finite(m.value);};
    const current = (person,key) => valid(person,key)&&person.metrics[key].missionDay===missionDay;
    const bpPeople = people.filter(p=>current(p,'systolic')&&current(p,'diastolic'));
    for (const key of keys) {
      const isBP = key==='systolic'||key==='diastolic';
      const contributors = isBP ? bpPeople : people.filter(p=>current(p,key));
      const values = contributors.map(p=>p.metrics[key].value);
      // Keep older source flags visible even when those readings cannot enter today's mean.
      const flaggedMembers = people.flatMap(person=>{
        const sourceKeys = isBP ? ['systolic','diastolic'] : [key];
        const flags = sourceKeys.filter(k=>valid(person,k)&&person.metrics[k].missionDay<=missionDay&&['watch','out_of_range'].includes(person.metrics[k].status));
        if (!flags.length) return [];
        return [{id:person.id,name:person.name,status:flags.some(k=>person.metrics[k].status==='out_of_range')?'out_of_range':'watch',
          missionDay:Math.max(...flags.map(k=>person.metrics[k].missionDay??0))}];
      });
      const status = flaggedMembers.some(p=>p.status==='out_of_range')?'out_of_range':flaggedMembers.length?'watch':
        contributors.length&&contributors.every(p=>p.metrics[key].status==='normal')?'normal':'recorded';
      metrics[key] = {value:values.length?values.reduce((sum,v)=>sum+v,0)/values.length:null,
        unit:people[0]?.metrics[key]?.unit||'',missionDay,provenance:'AGGREGATED',count:values.length,total:people.length,
        min:values.length?Math.min(...values):null,max:values.length?Math.max(...values):null,status,flaggedMembers,
        staleCount:people.filter(p=>valid(p,key)&&p.metrics[key].missionDay!==missionDay).length,
        unsupported:people.length>0&&people.every(p=>p.metrics[key]?.unsupported===true)};
    }
    metrics.mood={value:null,unit:'/5',private:true,count:0,total:people.length};
    return {missionDay,total:people.length,metrics};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={aggregateCrewDay};
  else global.aggregateCrewDay=aggregateCrewDay;
})(typeof window!=='undefined'?window:globalThis);
