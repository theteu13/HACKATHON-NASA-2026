const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {gazeForPoint}=require('../src/features/avatar/avatar-gaze.js');
test('gaze follows pointer direction relative to the visor and remains bounded',()=>{
  const rect={left:0,top:0,width:260,height:390};
  assert.equal(gazeForPoint(rect,130,91).eyeX,0);
  assert.ok(gazeForPoint(rect,0,91).eyeX<0);
  assert.ok(gazeForPoint(rect,260,91).eyeX>0);
  assert.ok(gazeForPoint(rect,130,0).eyeY<0);
  assert.ok(gazeForPoint(rect,130,390).eyeY>0);
  const far=gazeForPoint(rect,1e9,-1e9);
  assert.ok(Math.abs(far.x)<=5&&Math.abs(far.y)<=3&&Math.abs(far.angle)<=7);
  assert.ok(Math.abs(far.eyeX)<=3&&Math.abs(far.eyeY)<=2);
});
test('coordinates account for SVG letterboxing, offsets and hidden avatars',()=>{
  // 260x390 drawing centered inside a 400x390 viewport: visor center at 200,91.
  const rect={left:50,top:20,width:400,height:390};
  assert.equal(gazeForPoint(rect,250,111).eyeX,0);
  assert.equal(gazeForPoint(rect,250,111).eyeY,0);
  assert.equal(gazeForPoint({width:0,height:0},10,10).angle,0);
});
test('pointer controller coalesces frames, returns to neutral, respects pause/touch/reduced motion',()=>{
  const handlers={},frames=new Map(),properties=new Map();let nextFrame=1,time=0;
  const preference={matches:false,addEventListener:(name,fn)=>handlers['preference-'+name]=fn};
  const avatar={getBoundingClientRect:()=>({left:100,top:100,width:260,height:390})};
  const stage={isConnected:true,dataset:{motion:'running',avatarState:'review'},style:{setProperty:(key,value)=>properties.set(key,value)},querySelector:()=>avatar};
  const card={dataset:{},closest:selector=>selector==='.body-callout'?card:stage};
  const browser={matchMedia:()=>preference,addEventListener:(name,fn)=>handlers['window-'+name]=fn,requestAnimationFrame:fn=>{const id=nextFrame++;frames.set(id,fn);return id},cancelAnimationFrame:id=>frames.delete(id)};
  const context=vm.createContext({window:browser,document:{hidden:false,addEventListener:(name,fn)=>handlers[name]=fn}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','src/features/avatar/avatar-gaze.js'),'utf8'),context);
  function flush(){let ticks=0;while(frames.size){const [id,fn]=frames.entries().next().value;frames.delete(id);fn(time+=16);assert.ok(++ticks<200,'Animation must settle instead of running forever.');}}
  const event={target:card,pointerType:'mouse',clientX:500,clientY:250};
  handlers.pointermove(event);handlers.pointermove({...event,clientX:520});
  assert.equal(frames.size,1);flush();
  assert.ok(parseFloat(properties.get('--eye-x'))>0);
  assert.equal(card.dataset.avatarObserved,'true');assert.equal(stage.dataset.avatarState,'review');
  handlers.pointerout({relatedTarget:null});flush();
  assert.equal(parseFloat(properties.get('--eye-x')),0);assert.equal(stage.dataset.gazeActive,undefined);
  stage.dataset.motion='paused';handlers.pointermove(event);assert.equal(frames.size,0);
  stage.dataset.motion='running';handlers.pointermove({...event,pointerType:'touch'});assert.equal(frames.size,0);
  preference.matches=true;handlers.pointermove(event);assert.equal(frames.size,0);
  preference.matches=false;handlers.pointermove(event);flush();handlers['window-blur']();
  assert.equal(stage.dataset.gazeActive,undefined);assert.equal(frames.size,0);
});
