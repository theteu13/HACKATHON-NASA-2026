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
test('static deployment does not connect to its own origin without a configured API',()=>{
  const value=config('https://cosmomedic.vercel.app/',{
    staticDeployment:true,
    apiOrigin:'http://127.0.0.1:8000',
    autoConnect:false
  });
  assert.equal(value.apiOrigin,'http://127.0.0.1:8000');
  assert.equal(value.autoConnect,false);
});
test('static deployment connects automatically when its API origin is configured',()=>{
  const value=config('https://cosmomedic.vercel.app/',{
    staticDeployment:true,
    apiOrigin:'https://cosmomedic-api.onrender.com',
    autoConnect:true
  });
  assert.equal(value.apiOrigin,'https://cosmomedic-api.onrender.com');
  assert.equal(value.autoConnect,true);
});
