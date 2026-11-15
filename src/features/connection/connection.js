'use strict';
// Existing main-panel controls can call these handlers; no header menu is created.
function updateConnectionControl(id, property, value) {
  const element = document.getElementById(id);
  if (element) element[property] = value;
}
const connectionDialog = document.createElement('dialog');
connectionDialog.id = 'connection-dialog';
document.body.append(connectionDialog);

function openConnection() {
  const config = window.COSMOMEDIC_CONFIG;
  connectionDialog.innerHTML = `<form id="connection-form"><div class="panel-heading"><div><p class="eyebrow">COSMOMEDIC DATA</p><h2>Connect data source</h2></div><button type="button" class="icon-button" id="close-connection" aria-label="Close">&times;</button></div><p class="form-description">Load the mission data available to this dashboard.</p><label class="task-label">API origin<input name="origin" type="url" value="${escapeHTML(config.apiOrigin)}" placeholder="https://your-api.example" required></label><label class="task-label">Dataset<select name="dataset"><option value="app">CosmoMedic app &middot; Orbit-3</option><option value="synthetic">Synthetic mission &middot; all six vital signs</option></select></label><p class="command-note">Read-only monitoring.</p><p id="connection-error" role="alert"></p><button class="button primary" id="submit-connection">Load data</button></form>`;
  document.querySelector('#connection-form select').value = config.dataset;
  document.getElementById('close-connection').addEventListener('click', () => connectionDialog.close());
  document.getElementById('connection-form').addEventListener('submit', connectAPI);
  connectionDialog.showModal();
}

async function connectToSource(origin, dataset) {
  if (busy) return;
  if (!['app', 'synthetic'].includes(dataset)) throw new Error('Choose an available dataset.');
  busy = true;
  const version = ++sessionVersion;
  try {
    const config = window.COSMOMEDIC_CONFIG;
    const nextClient = new HealthData.Client(origin, undefined, {
      getAccessToken: config.getAccessToken, credentials: config.credentials
    });
    const snapshot = await (dataset === 'app' ? nextClient.loadApp() : nextClient.loadSynthetic());
    if (version !== sessionVersion) return;
    commitSnapshot(snapshot);
    client = nextClient;
    config.apiOrigin = origin;
    config.dataset = dataset;
    updateConnectionControl('refresh-data', 'hidden', false);
    updateConnectionControl('return-demo', 'hidden', false);
    render();
    toast('Connected. Showing data from the selected API dataset.');
  } finally {
    busy = false;
  }
}

async function connectAPI(event) {
  event.preventDefault();
  if (busy) return;
  const values = Object.fromEntries(new FormData(event.target));
  const button = document.getElementById('submit-connection');
  button.disabled = true;
  button.textContent = 'Loading...';
  document.getElementById('connection-error').textContent = '';
  try {
    await connectToSource(values.origin, values.dataset);
    connectionDialog.close();
  } catch (error) {
    document.getElementById('connection-error').textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = 'Load data';
  }
}

async function refreshData() {
  if (!client || busy) return;
  busy = true;
  const version = sessionVersion;
  updateConnectionControl('refresh-data', 'disabled', true);
  try {
    const snapshot = await (dataState.source === 'api-app' ? client.loadApp() : client.loadSynthetic(dataState.mission.id));
    if (version === sessionVersion) {
      commitSnapshot(snapshot);
      render();
      toast('API data refreshed.');
    }
  } catch (error) {
    toast(error.message);
    dataState.connectionState = 'error';
    updateMissionUI();
    if (typeof renderMonitoringView === 'function') renderMonitoringView();
    if (typeof renderTeamView === 'function') renderTeamView();
    updateConnectionControl('connection-status', 'textContent', 'Refresh failed - displayed data may be stale');
  } finally {
    busy = false;
    updateConnectionControl('refresh-data', 'disabled', false);
  }
}

function disconnect() {
  sessionVersion++;
  client = null;
  document.getElementById('operations-dialog')?.close();
  commitSnapshot(demoSnapshot());
  updateConnectionControl('refresh-data', 'hidden', true);
  updateConnectionControl('return-demo', 'hidden', true);
  render();
  toast('Disconnected. Returned explicitly to the demo dataset.');
}
