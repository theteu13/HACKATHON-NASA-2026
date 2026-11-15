const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','src/config.js'),'utf8');
function config(url,overrides){
  const window={location:new URL(url),COSMOMEDIC_CONFIG:overrides};
  vm.runInNewContext(source,{window});
  return window.COSMOMEDIC_CONFIG;
}
test('public dashboard loads its API on the same HTTPS origin automatically',()=>{
  const value=config('https://cosmomedic.example/');
  assert.equal(value.apiOrigin,'https://cosmomedic.example');
  assert.equal(value.autoConnect,true);
});
test('local backend loads automatically while static and file previews remain independent',()=>{
  assert.equal(config('http://127.0.0.1:8000/').autoConnect,true);
  assert.equal(config('http://127.0.0.1:4173/').autoConnect,false);
  assert.equal(config('file:///D:/dashboard/index.html').autoConnect,false);
});
test('main-system integration can override hosted source and automatic loading',()=>{
  const getAccessToken=()=>null;
  const value=config('https://dashboard.example/',{apiOrigin:'https://api.example',autoConnect:false,getAccessToken});
  assert.equal(value.apiOrigin,'https://api.example');
  assert.equal(value.autoConnect,false);
  assert.equal(value.getAccessToken,getAccessToken);
});
