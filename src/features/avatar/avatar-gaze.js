// Decorative callout tracking. Head orientation and pupils are separate from health poses.
(function(global) {
  const neutral=()=>({x:0,y:0,angle:0,eyeX:0,eyeY:0});
  function gazeForPoint(rect,pointerX,pointerY) {
    if(!rect||rect.width<=0||rect.height<=0||![pointerX,pointerY].every(Number.isFinite))return neutral();
    const scale=Math.min(rect.width/260,rect.height/390);
    const centerX=rect.left+rect.width/2;
    const centerY=rect.top+(rect.height-390*scale)/2+91*scale;
    const nx=Math.atan2(pointerX-centerX,Math.max(120,260*scale*1.3))/(Math.PI/2);
    const ny=Math.atan2(pointerY-centerY,Math.max(100,390*scale*.8))/(Math.PI/2);
    return {x:nx*5,y:ny*3,angle:nx*7,eyeX:nx*3,eyeY:ny*2};
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={gazeForPoint};return;}
  const reduced=global.matchMedia?.('(prefers-reduced-motion: reduce)');
  let active=null,avatar=null,observed=null,position=null,frame=null,lastTime=0,current=neutral();
  const variables={x:'--gaze-x',y:'--gaze-y',angle:'--gaze-angle',eyeX:'--eye-x',eyeY:'--eye-y'};
  function paint(stage,values) {
    for(const [key,property] of Object.entries(variables))stage.style.setProperty(property,values[key].toFixed(3)+(key==='angle'?'deg':'px'));
  }
  function clearObserved() {
    if(observed)delete observed.dataset.avatarObserved;
    observed=null;
  }
  function stop() {
    if(frame!==null)global.cancelAnimationFrame(frame);
    if(active){paint(active,neutral());delete active.dataset.gazeActive;}
    clearObserved();active=null;avatar=null;position=null;frame=null;lastTime=0;current=neutral();
  }
  function schedule(){if(frame===null)frame=global.requestAnimationFrame(tick);}
  function tick(time) {
    frame=null;
    if(!active||!avatar||active.isConnected===false||document.hidden||reduced?.matches||active.dataset.motion==='paused'){stop();return;}
    const target=position?gazeForPoint(avatar.getBoundingClientRect(),position.x,position.y):neutral();
    const elapsed=lastTime?Math.min(64,time-lastTime):16;lastTime=time;
    const alpha=1-Math.exp(-elapsed/75);
    let distance=0;
    for(const key of Object.keys(current)){current[key]+=(target[key]-current[key])*alpha;distance=Math.max(distance,Math.abs(target[key]-current[key]));}
    paint(active,current);
    if(distance>.01)schedule();
    else if(!position)stop();
    else {paint(active,target);lastTime=0;}
  }
  function follow(event) {
    if(event.pointerType==='touch'||reduced?.matches)return;
    const card=event.target.closest?.('.body-callout');
    const stage=card?.closest('.body-visual');
    if(!stage||stage.dataset.motion==='paused'){if(active)release();return;}
    if(stage!==active){stop();active=stage;avatar=stage.querySelector('.astronaut-svg');}
    if(!avatar)return;
    if(observed!==card){clearObserved();observed=card;card.dataset.avatarObserved='true';}
    active.dataset.gazeActive='true';
    position={x:event.clientX,y:event.clientY};
    schedule();
  }
  function release(){if(!active)return;clearObserved();position=null;schedule();}
  document.addEventListener('pointermove',follow,{passive:true});
  document.addEventListener('pointerover',follow,{passive:true});
  document.addEventListener('pointerout',event=>{
    if(!observed)return;
    const nextCard=event.relatedTarget?.closest?.('.body-callout');
    if(nextCard?.closest('.body-visual')!==active)release();
  },{passive:true});
  document.addEventListener('pointercancel',stop,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  global.addEventListener?.('blur',stop);
  reduced?.addEventListener?.('change',stop);
  global.resetAvatarGaze=stop;
})(typeof window!=='undefined'?window:globalThis);
