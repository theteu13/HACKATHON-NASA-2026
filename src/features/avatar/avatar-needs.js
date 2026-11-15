// Review prompts, not diagnoses, hunger estimates, or automatic interventions.
(function(global) {
  const behavior=typeof module!=='undefined'&&module.exports?require('./avatar-behavior.js'):global.CosmoAvatar;
  const finite=value=>typeof value==='number'&&Number.isFinite(value);
  function derive(person,mission) {
    const signals=[],m=person.metrics||{},day=mission.today,goals=mission.goals||{};
    const current=key=>m[key]&&!m[key].private&&finite(m[key].value)&&m[key].missionDay===day;
    const add=(kind,title,detail,severity,priority)=>signals.push({id:person.id+':'+kind,personId:person.id,personName:person.name,kind,title,detail,severity,priority});
    const state=behavior.describe([person],day).state;
    if(state==='review'||state==='watch')add('care',state==='review'?'Care-team review':'Care-team follow-up','An existing source flag needs review. It may refer to an older reading. No treatment or physical need is inferred.',state==='review'?'review':'watch',state==='review'?100:80);
    if(current('sleep')&&finite(goals.sleepHours)&&goals.sleepHours>0&&m.sleep.value<goals.sleepHours)
      add('rest','Review rest plan',`Recorded sleep: ${m.sleep.value.toFixed(1)} h; mission goal: ${goals.sleepHours} h. Review the schedule with the responsible team; this is a goal comparison, not a fatigue diagnosis.`,'watch',60);
    if(current('nutrition')&&finite(goals.kcalPerDay)&&goals.kcalPerDay>0&&m.nutrition.value<goals.kcalPerDay)
      add('nutrition','Nutrition log review',`Recorded intake: ${Math.round(m.nutrition.value)} of ${Math.round(goals.kcalPerDay)} kcal planned for the day. Records may be incomplete; this does not establish hunger or a need to eat.`,'info',40);
    const missing=[];
    if(!current('systolic')||!current('diastolic'))missing.push('blood pressure');
    for(const [key,label] of [['heart','heart rate'],['sleep','sleep'],['glucose','blood glucose'],['temperature','temperature']])
      if(m[key]&&!m[key].unsupported&&!m[key].private&&!current(key))missing.push(label);
    if(missing.length)add('readings','Readings pending',`No current-day reading received for ${missing.join(', ')}. Review telemetry or received records; absence of a reading is not a medical finding.`,'info',20);
    return signals.sort((a,b)=>b.priority-a.priority);
  }
  function collect(people,mission){return people.flatMap(p=>derive(p,mission)).sort((a,b)=>b.priority-a.priority);}
  if(typeof module!=='undefined'&&module.exports){module.exports={derive,collect};return;}
  global.CosmoNeeds={derive,collect};
  const opened={individual:false,team:false};
  global.applyAvatarNeeds=function(){
    for(const [scope,people] of [['individual',[selected]],['team',crew]]){
      const button=document.getElementById(scope+'-avatar-needs-button'),panel=document.getElementById(scope+'-avatar-needs');
      if(!button||!panel)continue;
      const signals=collect(people,dataState.mission),primary=signals[0],affected=new Set(signals.map(s=>s.personId)).size;
      const visual=document.getElementById(scope+'-body-visual');
      if(visual)visual.dataset.avatarNeed=primary?.kind||'none';
      button.hidden=!primary;
      if(!primary){opened[scope]=false;panel.hidden=true;panel.replaceChildren();continue;}
      button.dataset.severity=primary.severity;
      const symbol={care:'heart',rest:'moon',nutrition:'leaf',readings:'clipboard'}[primary.kind];
      button.innerHTML=icon(symbol)+`<span>${escapeHTML(primary.title)}</span><small>${scope==='team'?affected:signals.length}</small>`;
      button.setAttribute('aria-label',scope==='team'?`View ${signals.length} review prompts affecting ${affected} crew members`:`View ${signals.length} review prompts for ${selected.name}`);
      button.setAttribute('aria-controls',panel.id);
      button.setAttribute('aria-expanded',String(opened[scope]));
      panel.hidden=!opened[scope];
      panel.innerHTML=`<div class="panel-heading"><h4>${scope==='team'?'Crew review prompts':escapeHTML(selected.name)+' · review prompts'}</h4><button type="button" class="needs-close" data-needs-close="${scope}" aria-label="Close review prompts">✕</button></div><p class="needs-explanation">Prompts come from mission goals, source flags, or missing records. They do not diagnose a physical need or send a command.</p><div class="needs-list">${signals.map(s=>`<article class="needs-item needs-priority-${s.severity}"><div><span class="needs-person">${escapeHTML(s.personName)}</span><strong>${escapeHTML(s.title)}</strong><p>${escapeHTML(s.detail)}</p><small>Mission day ${dataState.mission.today} · read-only review</small></div><button class="needs-review" data-needs-person="${escapeHTML(s.personId)}">Review details ↗</button></article>`).join('')}</div>`;
      if(!button.dataset.needsBound){button.addEventListener('click',()=>{opened[scope]=!opened[scope];global.applyAvatarNeeds();});button.dataset.needsBound='true';}
    }
    document.querySelectorAll('[data-needs-close]').forEach(b=>b.addEventListener('click',()=>{const scope=b.dataset.needsClose;opened[scope]=false;global.applyAvatarNeeds();document.getElementById(scope+'-avatar-needs-button')?.focus();}));
    document.querySelectorAll('[data-needs-person]').forEach(b=>b.addEventListener('click',()=>{
      selectIndividualCrew(b.dataset.needsPerson);
      document.querySelector('.metrics-grid')?.scrollIntoView({behavior:global.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    }));
  };
})(typeof window!=='undefined'?window:globalThis);
