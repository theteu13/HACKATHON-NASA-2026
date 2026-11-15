// Animation reflects source status, never an inferred diagnosis or a mean threshold.
(function(global) {
  const model=typeof module!=='undefined'&&module.exports?require('../monitoring/monitoring-model.js'):global.Monitoring;
  function describe(people, missionDay) {
    let review=0, watch=0, missing=0;
    for(const person of people) {
      const status=model.status(person,missionDay,global.COSMOMEDIC_CONFIG?.expectedDailyMetrics);
      if(status.key==='review')review++;
      else if(status.key==='followup')watch++;
      else if(status.key==='unknown')missing++;
    }
    const state=review?'review':watch?'watch':missing||!people.length?'unknown':'routine';
    const label={routine:'Routine monitoring',watch:'Follow-up suggested',review:'Review required',unknown:'Limited current-day data'}[state];
    const count=review||watch;
    const detail=count?`${count}/${people.length} crew with ${review?'review':'watch'} flags`:missing?`${missing}/${people.length} crew without current-day coverage`:`${people.length} crew monitored`;
    return {state,label,detail,review,watch,missing,total:people.length};
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={describe};return;}
  global.CosmoAvatar={describe};
  const motionPreference=global.matchMedia?.('(prefers-reduced-motion: reduce)');
  let paused=true;
  global.applyAvatarBehaviors=function() {
    global.resetAvatarGaze?.();
    const reduced=!!motionPreference?.matches;
    const groups=[['individual',[selected]],['team',crew]];
    for(const [scope,people] of groups) {
      const visual=document.getElementById(scope+'-body-visual');
      if(!visual)continue;
      const description=describe(people,dataState.mission.today);
      visual.dataset.avatarState=description.state;
      visual.dataset.motion=paused||reduced?'paused':'running';
      const badge=document.getElementById(scope+'-avatar-state');
      if(badge){badge.dataset.state=description.state;badge.textContent=description.label;badge.title=description.detail+' · Follows source flags, including older readings. Not a diagnosis.';}
      const button=document.getElementById(scope+'-avatar-motion');
      if(button){
        button.disabled=reduced;
        button.setAttribute('aria-pressed',String(paused||reduced));
        button.textContent=reduced?'Reduced motion':paused?'Resume motion':'Pause motion';
        if(!button.dataset.motionBound){button.addEventListener('click',()=>{paused=!paused;global.applyAvatarBehaviors();});button.dataset.motionBound='true';}
      }
    }
  };
  motionPreference?.addEventListener?.('change',()=>{if(typeof dataState!=='undefined')global.applyAvatarBehaviors();});
})(typeof window!=='undefined'?window:globalThis);
