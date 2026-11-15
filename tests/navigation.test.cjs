const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {chooseActiveRegion}=require('../src/features/navigation/navigation.js');
test('individual avatar belongs to Crew even after the cabin tools have scrolled past',()=>{
  assert.equal(chooseActiveRegion([{owner:'#cabin-tools',top:-500,bottom:-400},{owner:'#crew',top:-100,bottom:850},{owner:'#records',top:900,bottom:1100}],800),'#crew');
});
test('a short closed panel does not steal the highlight from the visible crew content',()=>{
  const closed=[{owner:'#mission-impact',top:80,bottom:134},{owner:'#crew',top:155,bottom:900}];
  assert.equal(chooseActiveRegion(closed,800),'#crew');
  assert.equal(chooseActiveRegion([{owner:'#mission-impact',top:80,bottom:1000},{owner:'#crew',top:1010,bottom:1800}],800),'#mission-impact');
});
test('visibility is combined per owner without double-counting overlapping blocks',()=>{
  const regions=[{owner:'#crew',top:0,bottom:300},{owner:'#crew',top:0,bottom:300},{owner:'#mission-impact',top:300,bottom:800}];
  assert.equal(chooseActiveRegion(regions,800),'#mission-impact');
  assert.equal(chooseActiveRegion([{owner:'#crew',top:0,bottom:250},{owner:'#mission-impact',top:250,bottom:420},{owner:'#crew',top:420,bottom:800}],800),'#crew');
});
test('page endpoints use the actual first/last rendered content rather than menu order',()=>{
  const regions=[{owner:'#overview',top:0,bottom:350},{owner:'#crew',top:360,bottom:1300}];
  assert.equal(chooseActiveRegion(regions,1000,{atTop:true}),'#overview');
  assert.equal(chooseActiveRegion([{owner:'#records',top:500,bottom:700},{owner:'#crew',top:-200,bottom:480},{owner:'#cabin-tools',top:-600,bottom:-500}],800,{atBottom:true}),'#records');
});
test('controller handles layout changes, interrupted smooth navigation and cabin modal ownership',()=>{
  const events={},frames=new Map(),bounds=new Map();let clock=0,nextFrame=1,cabinOpens=0;
  const root={scrollTop:2100,scrollHeight:4000,clientHeight:800};
  const node=(selector,top,bottom)=>{
    const element={selector,tagName:'SECTION',open:false,visible:true,
      getClientRects(){return this.visible?[{}]:[]},
      getBoundingClientRect(){const b=bounds.get(selector);return {top:b[0]-root.scrollTop,bottom:b[1]-root.scrollTop,height:b[1]-b[0]}},
      scrollIntoView(){},contains(target){return target.selector==='#records'},addEventListener(type,fn){events[selector+':'+type]=fn}};
    bounds.set(selector,[top,bottom]);return element;
  };
  const selectors=new Map([
    ['main',node('main',0,4000)],['#overview',node('#overview',0,4000)],['.topbar',node('.topbar',0,80)],
    ['#crew',node('#crew',400,550)],['#mission-impact',node('#mission-impact',1400,1470)],
    ['#cabin-tools',node('#cabin-tools',1600,1700)],['.dashboard-grid',node('.dashboard-grid',2000,2800)],
    ['#records',node('#records',3500,3780)]
  ]);
  selectors.get('#mission-impact').tagName='DETAILS';
  const details=node('#crew-health',1900,3780),operations=node('#operations-dialog',0,0);
  operations.open=false;
  const links=['#overview','#crew','#mission-impact','#cabin-tools','#records'].map(owner=>{
    const link={owner,active:false,attrs:{},listeners:{},getAttribute:()=>owner,
      setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},
      addEventListener(k,v){this.listeners[k]=v}};
    link.classList={toggle:(name,value)=>link.active=value};return link;
  });
  const win={innerHeight:800,matchMedia:()=>({matches:false}),location:{hash:''},history:{replaceState(){}},
    performance:{now:()=>clock},addEventListener:(type,fn)=>events['window:'+type]=fn,
    requestAnimationFrame:fn=>{const id=nextFrame++;frames.set(id,fn);return id}};
  const doc={scrollingElement:root,documentElement:root,
    querySelectorAll:()=>links,querySelector:selector=>selectors.get(selector)||null,
    getElementById:id=>id==='crew-health'?details:id==='operations-dialog'?operations:id==='open-cabin'?node('open-cabin',0,0):null,
    addEventListener:(type,fn)=>events['document:'+type]=fn};
  const context=vm.createContext({window:win,document:doc,setMonitoringScope(){details.open=true},openCabin(){cabinOpens++;operations.open=true}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','src/features/navigation/navigation.js'),'utf8'),context);
  function tick(){const entry=frames.entries().next().value;if(entry){frames.delete(entry[0]);entry[1](clock+=16);}}
  function active(){assert.equal(links.filter(l=>l.active).length,1);return links.find(l=>l.active).owner;}
  tick();assert.equal(active(),'#crew');
  links[4].listeners.click({button:0,preventDefault(){}});tick();assert.equal(active(),'#records');
  events['document:wheel']();tick();assert.equal(active(),'#crew');
  bounds.set('#mission-impact',[2000,3000]);bounds.set('.dashboard-grid',[3200,4000]);
  events['document:toggle']();tick();assert.equal(active(),'#mission-impact');
  bounds.set('#mission-impact',[2000,2070]);bounds.set('.dashboard-grid',[2090,2900]);
  events['document:toggle']();tick();assert.equal(active(),'#crew');
  links[3].listeners.click({button:0,preventDefault(){}});tick();assert.equal(active(),'#cabin-tools');
  assert.equal(cabinOpens,0,'Sidebar navigation must not open the cabin dialog');
  assert.equal(operations.open,false);
  win.location.hash='#cabin-tools';events['window:hashchange']();
  assert.equal(cabinOpens,0,'Hash navigation must not open the cabin dialog');
  // The existing panel button opens the dialog; navigation only tracks its ownership.
  operations.open=true;events['open-cabin:click']();
  events['window:scroll']();tick();assert.equal(active(),'#cabin-tools');
  operations.open=false;events['#operations-dialog:close']();tick();assert.equal(active(),'#crew');
  assert.equal(links[1].attrs['aria-current'],'location');
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','src/features/navigation/navigation.js'),'utf8'),context);
  assert.equal(cabinOpens,0,'Reloading with a cabin hash must not open the dialog');
  assert.equal(operations.open,false);
});
