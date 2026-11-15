// Scroll ownership is based on actual content blocks, not sidebar order or passed headings.
(function(global){
  function overlap(intervals,start,end){
    const clipped=intervals.map(([a,b])=>[Math.max(a,start),Math.min(b,end)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
    let total=0,left=null,right=null;
    for(const [a,b] of clipped){if(left===null){left=a;right=b;}else if(a<=right)right=Math.max(right,b);else{total+=right-left;left=a;right=b;}}
    return total+(left===null?0:right-left);
  }
  function chooseActiveRegion(regions,height,{atTop=false,atBottom=false}={}){
    const valid=regions.filter(r=>Number.isFinite(r.top)&&Number.isFinite(r.bottom)&&r.bottom>r.top);
    if(!valid.length)return null;
    if(atTop&&valid.some(r=>r.owner==='#overview'&&r.bottom>0&&r.top<height))return '#overview';
    if(atBottom){const last=[...valid].sort((a,b)=>b.bottom-a.bottom)[0];if(last.bottom>0&&last.top<height)return last.owner;}
    const owners=new Map();
    for(const r of valid){if(!owners.has(r.owner))owners.set(r.owner,[]);owners.get(r.owner).push([r.top,r.bottom]);}
    let best=null,bestScore=-1,bestDistance=Infinity;
    for(const [owner,intervals] of owners){
      const score=overlap(intervals,0,height)+2*overlap(intervals,height*.15,height*.75);
      const readingLine=height*.35;
      const distance=Math.min(...intervals.map(([top,bottom])=>readingLine<top?top-readingLine:readingLine>bottom?readingLine-bottom:0));
      if(score>bestScore||(score===bestScore&&distance<bestDistance)){best=owner;bestScore=score;bestDistance=distance;}
    }
    return best;
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={chooseActiveRegion};return;}

  const links=[...document.querySelectorAll('.nav-item')];
  if(!links.length)return;
  const byOwner=new Map(links.map(link=>[link.getAttribute('href'),link]));
  const details=document.getElementById('crew-health'),operations=document.getElementById('operations-dialog');
  const reduced=global.matchMedia('(prefers-reduced-motion: reduce)');
  const indicator=document.querySelector('.nav-indicator');
  const main=document.querySelector('main');
  const ownership=[
    ['#overview','.topbar'],['#overview','.page-heading'],['#overview','.mode-area'],
    ['#overview','.mission-summary'],
    ['#crew','#crew'],['#crew','#team-overview'],['#crew','.command-primary'],
    ['#crew','#crew-health > summary'],['#crew','#individual-context'],['#crew','.astronaut-heading'],
    ['#crew','.secondary-illustration'],
    ['#crew','.dashboard-grid'],['#crew','.bottom-grid'],
    ['#mission-impact','#mission-impact'],['#cabin-tools','#cabin-tools'],['#records','#records']
  ];
  let frame=null,pending=null,modalOwner=null;
  const scrollRoot=()=>document.scrollingElement||document.documentElement;
  function activate(owner){
    const link=byOwner.get(owner);if(!link)return;
    for(const item of links){item.classList.toggle('active',item===link);if(item===link)item.setAttribute('aria-current','location');else item.removeAttribute('aria-current');}
    if(indicator&&indicator.parentElement!==link)link.append(indicator);
  }
  function measure(){
    return ownership.flatMap(([owner,selector])=>{
      if(!byOwner.has(owner))return [];
      const element=document.querySelector(selector);
      if(!element||!element.getClientRects().length)return [];
      const rect=element.getBoundingClientRect();
      return rect.height>0?[{owner,top:rect.top,bottom:rect.bottom}]:[];
    });
  }
  function schedule(){if(frame===null)frame=global.requestAnimationFrame(update);}
  function update(time){
    frame=null;
    if(modalOwner&&operations.open){activate(modalOwner);return;}
    const root=scrollRoot();
    if(pending){
      const changed=Math.abs(root.scrollTop-pending.lastTop)>.5;
      if(changed){pending.moved=true;pending.stable=0;}else pending.stable++;
      pending.lastTop=root.scrollTop;
      if(time-pending.started<2000&&!(pending.stable>=3&&(pending.moved||pending.stable>=8))){activate(pending.owner);schedule();return;}
      pending=null;
    }
    const owner=chooseActiveRegion(measure(),global.innerHeight,{
      atTop:root.scrollTop<=2,
      atBottom:root.scrollHeight>root.clientHeight+2&&root.scrollTop+root.clientHeight>=root.scrollHeight-2
    });
    if(owner)activate(owner);
  }
  function interrupt(){if(pending){pending=null;schedule();}}
  function navigate(link,changeHash=true){
    const owner=link.getAttribute('href'),target=document.querySelector(owner);
    if(!target)return;
    if(target.tagName==='DETAILS')target.open=true;
    if(details.contains(target)){setMonitoringScope('individual');details.open=true;}
    activate(owner);
    if(changeHash)global.history.replaceState(null,'',owner);
    pending={owner,started:global.performance.now(),lastTop:scrollRoot().scrollTop,moved:false,stable:0};
    target.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
    if(owner==='#cabin-tools'){modalOwner=owner;openCabin();}
    schedule();
  }
  links.forEach(link=>link.addEventListener('click',event=>{
    if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();navigate(link);
  }));
  document.getElementById('open-cabin').addEventListener('click',()=>{modalOwner='#cabin-tools';pending=null;activate(modalOwner);});
  operations.addEventListener('close',()=>{modalOwner=null;pending=null;schedule();});
  global.addEventListener('scroll',schedule,{passive:true});
  document.addEventListener('scroll',schedule,{passive:true,capture:true});
  global.addEventListener('resize',schedule);
  document.addEventListener('toggle',schedule,true);
  document.addEventListener('wheel',interrupt,{passive:true,capture:true});
  document.addEventListener('touchstart',interrupt,{passive:true,capture:true});
  document.addEventListener('pointerdown',interrupt,{passive:true,capture:true});
  document.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))interrupt();},true);
  document.addEventListener('scrollend',()=>{pending=null;schedule();},true);
  global.addEventListener('scrollend',()=>{pending=null;schedule();});
  global.addEventListener('hashchange',()=>{const link=byOwner.get(global.location.hash);if(link)navigate(link,false);});
  if('ResizeObserver' in global){
    const observer=new global.ResizeObserver(schedule);
    const watched=new Set([main,...ownership.map(([,selector])=>document.querySelector(selector))]);
    watched.forEach(element=>{if(element)observer.observe(element);});
  }
  // React to replaced contents without observing per-frame gaze/style attributes.
  if('MutationObserver' in global)new global.MutationObserver(schedule).observe(main,{childList:true,subtree:true});
  const initial=byOwner.get(global.location.hash);
  if(initial)navigate(initial,false);else schedule();
})(typeof window!=='undefined'?window:globalThis);
