const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function setup(){
  const elements=new Map();
  function get(id){
    if(!elements.has(id)){
      let html='';
      elements.set(id,{id,hidden:false,open:false,value:'',dataset:{},textContent:'',listeners:{},children:[],style:{},
        classList:{toggle(){}},setAttribute(k,v){this[k]=v},getAttribute(k){return this[k]},
        set innerHTML(value){html=value;this.children=[];for(const m of value.matchAll(/id="([^"]+)"/g))get(m[1]);for(const m of value.matchAll(/id="([^"]+)"[^>]*value="([^"]*)"/g))get(m[1]).value=m[2];},get innerHTML(){return html},
        addEventListener(k,f){this.listeners[k]=f},append(...nodes){this.children.push(...nodes)},before(){},after(){},
        replaceChildren(){html='';this.children=[]},reset(){this.didReset=true},close(){this.open=false},showModal(){this.open=true},scrollIntoView(){}});
    }return elements.get(id);
  }
  const modes=['astronaut','ground'].map(mode=>{const e=get('mode-'+mode);e.dataset.mode=mode;return e});
  const sandbox=vm.createContext({document:{addEventListener(){},body:get('body'),getElementById:get,querySelector:get,querySelectorAll:s=>s==='[data-mode]'?modes:s==='.summary-detail strong'?[get('day-stat'),get('crew-stat'),get('update-stat')]:[],createElement:()=>get('created-'+elements.size)},localStorage:{getItem:()=>null},Intl,Date,URL,AbortController,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},FormData:class{},structuredClone,console});
  sandbox.window=sandbox;
  for(const file of ['data/demo-seed.js','health-data.js','crew-aggregate.js','app.js','body-callouts.js','app-core.js','command.js','team-view.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),sandbox,{filename:file});
  return {get,run:code=>vm.runInContext(code,sandbox)};
}
test('canonical demo profiles, mission, and unavailable metrics render',()=>{
  const {get,run}=setup();
  assert.equal(run('crew.length'),4);
  assert.equal(run('selected.id'),'ast-01');
  assert.equal(run('dataState.mission.today'),12);
  assert.ok(get('metrics').innerHTML.includes('UNSUPPORTED'));
  assert.ok(get('crew-list').innerHTML.includes('Ana Souza'));
  assert.ok(get('trend-chart').innerHTML.includes('Day 11'));
  assert.equal(run('summaryScore(selected)'),run('selected.summary.overallScore'));
});
test('dashboard is monitoring only, with private mood and no personal mode',()=>{
  const {get,run}=setup();
  assert.equal(run('typeof openCheckin'),'undefined');
  assert.equal(run('typeof switchMode'),'undefined');
  assert.equal(run('selected.metrics.mood.value'),null);
  assert.ok(get('metrics').innerHTML.includes('PRIVATE'));
  assert.ok(get('metrics').innerHTML.includes('Blood pressure'));
  assert.ok(get('mode-description').textContent.includes('care team'));
  assert.ok(!get('companion-content').innerHTML.includes('family-message'));
});
test('received records exclude psychological and private logs',()=>{
  const {run}=setup();
  assert.equal(run("crew.every(c=>c.logs.every(l=>['measurement','sleep','meal'].includes(l.type)))"),true);
});
test('simulator preserves source records and uses an explicit ground assumption',()=>{
  const {get,run}=setup();
  run('openSimulator()');
  assert.equal(run('commandState.baseSleep'),7);
  assert.equal(run('selected.logs.length'),run('dataState.crew[0].logs.length'));
  assert.ok(get('simulation-result').innerHTML.includes('not a personal health forecast'));
  assert.equal(run('JSON.stringify(simulateRest(8,2,1).map(d=>d.load))'),'[24,12,0]');
});
test('untrusted names are escaped in crew markup',()=>{
  const {get,run}=setup();run("selected.name='<img src=x onerror=alert(1)>';renderCrew()");
  assert.ok(!get('crew-list').innerHTML.includes('<img'));
  assert.ok(get('crew-list').innerHTML.includes('&lt;img'));
});
