'use strict';
const connectionBar = document.createElement('section'); connectionBar.className = 'connection-bar';
connectionBar.innerHTML = '<span id="connection-status" role="status"></span><div><button class="text-button" id="connect-api">Connect API</button><button class="text-button" id="refresh-data" hidden>Refresh</button><button class="text-button" id="return-demo" hidden>Disconnect</button></div>';
document.querySelector('.mission-summary').before(connectionBar);
const connectionDialog = document.createElement('dialog');connectionDialog.id='connection-dialog';document.body.append(connectionDialog);
function openConnection() {
  connectionDialog.innerHTML = `<form id="connection-form"><div class="panel-heading"><div><p class="eyebrow">COSMOMEDIC DATA</p><h2>Connect to the backend</h2></div><button type="button" class="icon-button" id="close-connection" aria-label="Close">✕</button></div><p class="form-description">Sign in with a medical or admin account to monitor the crew. Astronaut accounts cannot use this dashboard. Tokens stay in memory for this session.</p><label class="task-label">API origin<input name="origin" type="url" value="http://127.0.0.1:8000" placeholder="https://your-api.example" required></label><label class="task-label">Dataset<select name="dataset"><option value="app">CosmoMedic app · Orbit-3</option><option value="synthetic">Synthetic mission · all six vital signs</option></select></label><div class="form-grid"><label>Care-team username<input name="username" autocomplete="username" required maxlength="100"></label><label>Password<input name="password" type="password" autocomplete="current-password" required maxlength="128"></label></div><p class="command-note">Read-only monitoring. HTTP is accepted only for localhost development.</p><p id="connection-error" role="alert"></p><button class="button primary" id="submit-connection">Sign in and load data</button></form>`;
  document.getElementById('close-connection').addEventListener('click',()=>connectionDialog.close());
  document.getElementById('connection-form').addEventListener('submit',connectAPI);
  connectionDialog.showModal();
}
async function connectAPI(event) {
  event.preventDefault(); if(busy)return; busy=true; const version=++sessionVersion;
  const form=event.target, values=Object.fromEntries(new FormData(form));
  const button=document.getElementById('submit-connection'); button.disabled=true;button.textContent='Connecting…';
  document.getElementById('connection-error').textContent='';
  try {
    const nextClient=new HealthData.Client(values.origin);await nextClient.login(values.username,values.password);
    const snapshot=await (values.dataset==='app'?nextClient.loadApp():nextClient.loadSynthetic());
    if(version!==sessionVersion)return;
    client=nextClient;commitSnapshot(snapshot);
    document.getElementById('refresh-data').hidden=false;document.getElementById('return-demo').hidden=false;
    form.reset();connectionDialog.close();render();toast('Connected. Showing data from the selected API dataset.');
  } catch(error) { document.getElementById('connection-error').textContent=error.message; }
  finally { busy=false;button.disabled=false;button.textContent='Sign in and load data'; }
}
async function refreshData() {
  if(!client || busy)return;busy=true;const version=sessionVersion;
  document.getElementById('refresh-data').disabled=true;
  try {const snapshot=await (dataState.source==='api-app'?client.loadApp():client.loadSynthetic(dataState.mission.id));if(version===sessionVersion){commitSnapshot(snapshot);render();toast('API data refreshed.');}}
  catch(error){toast(error.message);document.getElementById('connection-status').textContent='Refresh failed · displayed data may be stale';}
  finally{busy=false;document.getElementById('refresh-data').disabled=false;}
}
function disconnect() {
  sessionVersion++;if(client){client.token=null;client.user=null;}client=null;
  document.getElementById('operations-dialog')?.close();
  commitSnapshot(demoSnapshot());document.getElementById('refresh-data').hidden=true;document.getElementById('return-demo').hidden=true;render();toast('Disconnected. Returned explicitly to the demo dataset.');
}
