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
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  const scripts=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(match=>match[1]);
  for(const file of scripts)vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),sandbox,{filename:file});
  return {get,run:code=>vm.runInContext(code,sandbox)};
}
test('canonical demo profiles, mission, and unavailable metrics render',()=>{
  const {get,run}=setup();
  assert.equal(run('crew.length'),4);
  assert.equal(run('selected.id'),'ast-01');
  assert.equal(run('dataState.mission.today'),12);
  assert.ok(!get('metrics').innerHTML.includes('Blood glucose'));
  assert.ok(get('comparison-availability').textContent.includes('Blood glucose'));
  assert.ok(get('crew-list').innerHTML.includes('Ana Souza'));
  assert.ok(get('trend-chart').innerHTML.includes('Day 11'));
  assert.equal(run('summaryScore(selected)'),run('selected.summary.overallScore'));
});
test('dashboard is monitoring only, with private mood and no personal mode',()=>{
  const {get,run}=setup();
  assert.equal(run('typeof openCheckin'),'undefined');
  assert.equal(run('typeof switchMode'),'undefined');
  assert.equal(run('selected.metrics.mood.value'),null);
  assert.ok(get('metrics').innerHTML.includes('Private information is excluded'));
  assert.ok(!get('metrics').innerHTML.includes('<h3>Mood</h3>'));
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


test('data source dialog has no login or password fields',()=>{
  const {get,run}=setup();
  run('openConnection()');
  const html=run('connectionDialog.innerHTML');
  assert.ok(html.includes('name="origin"'));
  assert.ok(html.includes('name="dataset"'));
  assert.ok(!/password|username|Sign in|login/i.test(html));
});

test('connect, refresh and disconnect work without a local account',async()=>{
  const {get,run}=setup();
  run(`HealthData.Client=class {
    async loadApp(){return {...demoSnapshot(),source:'api-app'};}
  };`);
  await run("connectToSource('http://127.0.0.1:8000','app')");
  assert.equal(run('dataState.source'),'api-app');
  assert.equal(get('refresh-data').hidden,false);
  assert.ok(get('connection-status').textContent.includes('API'));
  await run('refreshData()');
  assert.equal(run('dataState.source'),'api-app');
  run('disconnect()');
  assert.equal(run('dataState.source'),'demo');
  assert.equal(run('client'),null);
  assert.equal(get('refresh-data').hidden,true);
});

test('empty or failed API loads preserve the previous monitoring data',async()=>{
  const {run}=setup();
  run("HealthData.Client=class {async loadApp(){return {...demoSnapshot(),crew:[]};}};");
  await assert.rejects(()=>run("connectToSource('http://127.0.0.1:8000','app')"),/No crew/);
  assert.equal(run('dataState.source'),'demo');
  assert.equal(run('crew.length'),4);
  assert.equal(run('client'),null);
  run("HealthData.Client=class {async loadApp(){throw new Error('API unavailable');}};");
  await assert.rejects(()=>run("connectToSource('http://127.0.0.1:8000','app')"),/API unavailable/);
  assert.equal(run('dataState.source'),'demo');
  assert.equal(run('busy'),false);
});

test('queue, table, individual status and avatar use the same source flag',()=>{
  const {get,run}=setup();
  run("crew[0].metrics.diastolic.status='out_of_range';crew[0].summary={status:'normal'};render()");
  assert.equal(run('generalStatus(crew[0]).key'),'review');
  assert.equal(run('teamAttention(crew[0]).key'),'review');
  assert.equal(run('CosmoAvatar.describe([crew[0]],dataState.mission.today).state'),'review');
  assert.ok(get('comparison-body').innerHTML.includes('Source review flag'));
  assert.ok(get('review-queue-list').innerHTML.includes('Diastolic'));
  assert.ok(run('individualContext.innerHTML').includes('Source review flag'));
  assert.ok(get('metrics').innerHTML.includes('SOURCE REVIEW FLAG'));
});

test('crew search, status filters and column sets preserve explicit no-result and unsupported states',()=>{
  const {get,run}=setup();
  run("crewFilter.search='does not exist';renderTeamResults()");
  assert.ok(get('comparison-body').innerHTML.includes('No matching crew members'));
  run("crewFilter.search='ORB3-ANA';renderTeamResults()");
  assert.equal(run('visibleCrew().length'),1);
  run("crewFilter.search='';crewFilter.status='review';renderTeamResults()");
  assert.equal(run("visibleCrew().every(p=>generalStatus(p).key==='review')"),true);
  run("crewFilter.status='all';crewFilter.columns='longitudinal';renderTeamResults()");
  assert.ok(get('comparison-head').innerHTML.includes('Bone density'));
});

test('individual trends support pressure and sleep, with baseline, date precision and missing-day gaps',()=>{
  const {get,run}=setup();
  run("trendMetric='sleep';renderMonitoringChart()");
  assert.ok(get('trend-chart').innerHTML.includes('Sleep duration'));
  assert.ok(get('trend-chart').innerHTML.includes('Personal reference'));
  assert.equal(run("measuredTime({timestamp:'2027-03-01'})"),'2027-03-01 · time not supplied');
  run("trendMetric='heart';selected.historyByMetric.heart=[{missionDay:10,value:60},{missionDay:12,value:62}];renderMonitoringChart()");
  assert.equal((get('trend-chart').innerHTML.match(/<polyline /g)||[]).length,2);
  assert.ok(get('trend-chart').innerHTML.includes('Read chart values as a table'));
});

test('review tracking is externally supplied and never created by opening details',()=>{
  const {run}=setup();
  assert.equal(run('reviewRecord(selected).label'),'Review tracking not connected');
  run("window.COSMOMEDIC_CONFIG.reviewRecords[selected.id]={status:'in_review',assignee:'Care team',url:'javascript:alert(1)'}");
  assert.equal(run('reviewRecord(selected).label'),'Under review');
  assert.equal(run('reviewRecord(selected).url'),null);
  assert.equal(run('typeof markReviewed'),'undefined');
});

test('failed refresh retains readings and exposes stale snapshot state in both views',async()=>{
  const {get,run}=setup();
  run("HealthData.Client=class {async loadApp(){if(this.loaded)throw new Error('Source unavailable');this.loaded=true;return {...demoSnapshot(),source:'api-app'};}};");
  await run("connectToSource('http://127.0.0.1:8000','app')");
  const previousValue=run('selected.metrics.heart.value');
  await run('refreshData()');
  assert.equal(run('selected.metrics.heart.value'),previousValue);
  assert.equal(run('dataState.source'),'api-app');
  assert.equal(run('dataState.connectionState'),'error');
  assert.ok(run('teamPanel.innerHTML').includes('Refresh failed'));
  assert.ok(run('individualContext.innerHTML').includes('Refresh failed'));
  assert.ok(get('.system-status').textContent.includes('refresh failed'));
});

test('home opens with a crew chart and visible avatar before the review controls',()=>{
  const {get,run}=setup();
  const html=run('teamPanel.innerHTML');
  assert.ok(html.indexOf('id="crew-summary"') < html.indexOf('id="team-body-visual"'));
  assert.ok(html.indexOf('id="team-body-visual"') < html.indexOf('class="crew-controls panel"'));
  assert.ok(!html.includes('class="secondary-illustration team-illustration"'));
  assert.equal(run('individualIllustration.open'),true);
  assert.ok(get('crew-summary').innerHTML.includes('Mission at a glance'));
  assert.ok(get('crew-summary').innerHTML.includes('Source status distribution'));
  assert.ok(get('crew-summary').innerHTML.includes('Contributing crew'));
  run("crewSummaryState.metric='sleep';crewSummaryState.period=30;renderCrewSummary()");
  assert.ok(get('crew-summary').innerHTML.includes('Sleep duration'));
  run("crewFilter.search='not a crew member';renderTeamResults()");
  assert.ok(get('crew-summary').innerHTML.includes('all crew, independent of filters'));
});

test('avatars keep populated callouts and remove empty cards together with their connectors',()=>{
  const {run}=setup();
  run("selected.metrics.temperature={value:36.8,unit:'°C',missionDay:12};selected.metrics.nutrition={value:0,unit:'kcal',missionDay:12};selected.metrics.glucose={value:null,unit:'mg/dL'}");
  const markup=run('bodyCalloutMarkup(selected.metrics)');
  assert.ok(markup.cards.includes('Body temperature'));
  assert.ok(markup.cards.includes('Heart rate'));
  assert.ok(markup.cards.includes('Blood pressure'));
  assert.ok(markup.cards.includes('Nutrition'));
  assert.ok(!markup.cards.includes('Blood glucose'));
  assert.ok(!markup.cards.includes('White blood cells'));
  assert.equal((markup.cards.match(/<article /g)||[]).length,(markup.lines.match(/<polyline /g)||[]).length);
  run('selected.metrics.diastolic.value=null');
  assert.ok(!run('bodyCalloutMarkup(selected.metrics).cards').includes('Blood pressure'));
  run('crew.forEach(person=>person.metrics.temperature={value:null,unit:"C"})');
  const collective=run('bodyCalloutMarkup(aggregateCrewDay(crew,dataState.mission.today).metrics,true).cards');
  assert.ok(collective.includes('temperature'));
  assert.ok(collective.includes('No same-day data'));
});
