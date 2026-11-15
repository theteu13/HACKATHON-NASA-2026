// Integration settings. The host application can set this object before this file.
// Never put passwords or fixed access tokens in frontend configuration.
window.COSMOMEDIC_CONFIG = (() => {
  const location = window.location;
  const hosted = location?.protocol === 'https:' ||
    location?.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(location.hostname) && location.port === '8000';
  const sameOriginApi = hosted && window.COSMOMEDIC_CONFIG?.staticDeployment !== true;
  return {
  apiOrigin: sameOriginApi ? location.origin : 'http://127.0.0.1:8000',
  dataset: 'app',
  autoConnect: sameOriginApi,
  credentials: 'omit',
  // Optional async callback owned by the host system's existing session.
  getAccessToken: null,
  // Data coverage expectations, not clinical thresholds. Bone/intake are not daily vital signs.
  expectedDailyMetrics: ['systolic','diastolic','heart','sleep','glucose','temperature'],
  // Optional records supplied by the main system, keyed by crew ID. Never edited locally.
  reviewRecords: {},
  clinicalContext: {},
  ...window.COSMOMEDIC_CONFIG
  };
})();
