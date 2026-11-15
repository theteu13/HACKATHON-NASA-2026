// Execute com: node --test tests/command.test.cjs
// DOM mínimo para testar lógica e troca de modo; não substitui QA visual.
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
      elements.set(id,{id,hidden:false,open:false,value:'',dataset:{},textContent:'',listeners:{},children:[],
        classList:{toggle(){}},setAttribute(k,v){this[k]=v},
        set innerHTML(value){html=value;this.children=[];for(const m of value.matchAll(/id="([^"]+)"/g))get(m[1]);for(const m of value.matchAll(/id="([^"]+)"[^>]*value="([^"]*)"/g))get(m[1]).value=m[2];},get innerHTML(){return html},
        addEventListener(k,f){this.listeners[k]=f},append(...nodes){this.children.push(...nodes)},before(){},after(){},
        replaceChildren(){html='';this.children=[]},reset(){this.didReset=true},close(){this.open=false},showModal(){this.open=true},scrollIntoView(){}});
    }return elements.get(id);
  }
  const modes=['astronaut','ground'].map(mode=>{const e=get('mode-'+mode);e.dataset.mode=mode;return e});
  const sandbox=vm.createContext({document:{body:get("body"),getElementById:get,querySelector:get,querySelectorAll:s=>s==='[data-mode]'?modes:[],createElement:()=>get('created-'+elements.size)},localStorage:{getItem:()=>null},Intl,Date,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},FormData:class{},console});
  for(const file of ['app.js','command.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),sandbox);
  return {get,run:code=>vm.runInContext(code,sandbox)};
}
test('readiness is bounded and independent of mood',()=>{
  const {run}=setup();
  assert.equal(run('routineScore(crew[0],-5)'),51);
  assert.ok(run('routineScore(crew[0],24)')<=100);
  assert.equal(run('const before=readiness(crew[0]); crew[0].mood=1; readiness(crew[0])===before'),true);
});
test('three-day scenario: loss, recovery, and limits',()=>{
  const {run}=setup();
  assert.equal(run('simulateRest(8,2,1).length'),3);
  assert.equal(run('JSON.stringify(simulateRest(8,2,1).map(d=>d.load))'),'[24,12,0]');
  assert.equal(run('simulateRest(1,4,3).every(d=>d.hours>=0&&d.load>=0&&d.load<=100)'),true);
  assert.equal(run('simulateRest(8,0,0).every(d=>d.load===0)'),true);
});
test('ground mode removes personal data and closes dialogs',()=>{
  const {get,run}=setup();
  assert.ok(get('metrics').innerHTML.includes('Mood'));
  assert.ok(get('companion-content').innerHTML.includes('message from home'));
  get('checkin-dialog').open=true;
  run("switchMode('ground')");
  for(const id of ['metrics','trend-chart','additional-metrics','records-list'])assert.equal(get(id).innerHTML,'');
  assert.equal(run('personalDetails.hidden'),true);
  assert.equal(get('open-checkin').hidden,true);
  assert.equal(get('checkin-dialog').open,false);
  assert.ok(!get('companion-content').innerHTML.includes('blockquote'));
  assert.ok(get('companion-content').innerHTML.includes('Team contact pending'));
  run("switchMode('astronaut')");
  assert.equal(run('personalDetails.hidden'),false);
  assert.ok(get('metrics').innerHTML.includes('Mood'));
});
test('simulation preserves records and hides individual sleep in ground mode',()=>{
  const {get,run}=setup();
  run("switchMode('ground'); openSimulator()");
  assert.equal(run('records.length'),0);
  assert.ok(!get('simulation-result').innerHTML.includes('planned rest'));
  run("switchMode('astronaut'); openSimulator()");
  assert.ok(get('simulation-result').innerHTML.includes('planned rest'));
});
