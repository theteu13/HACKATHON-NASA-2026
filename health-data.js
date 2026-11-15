/* API contract: lzphellipe/nasa-space-software-health-crew @ 7c7de46.
   Pure projections deliberately keep the app and synthetic namespaces separate. */
(function (global) {
  'use strict';
  const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
  const metric = (value, unit, meta = {}) => ({ value: number(value), unit, ...meta });
  const blankMetrics = () => ({
    systolic: metric(null, 'mmHg'), diastolic: metric(null, 'mmHg'), heart: metric(null, 'bpm'),
    glucose: metric(null, 'mg/dL', { unsupported: true }), temperature: metric(null, '°C', { unsupported: true }),
    sleep: metric(null, 'h'), mood: metric(null, '/5'), bone: metric(null, 'g/cm²'),
    nutrition: metric(null, 'kcal'), immune: metric(null, '×10³/µL', { unsupported: true })
  });
  const sortedLogs = logs => [...logs].sort((a, b) => a.missionDay - b.missionDay || a.timestamp.localeCompare(b.timestamp));
  function appPerson(profile, logs = [], summary = {}, day = Infinity) {
    const own = sortedLogs(logs.filter(l => l.astronautId === profile.id && l.missionDay <= day));
    const metrics = blankMetrics();
    const put = (key, value, log) => metrics[key] = metric(value, metrics[key].unit, {
      timestamp: log.timestamp, missionDay: log.missionDay, provenance: log.provenance || 'SIMULATED_TELEMETRY'
    });
    for (const log of own) {
      const d = log.data;
      if (log.type === 'measurement' && d.metric === 'blood_pressure') {
        put('systolic', d.values.systolic, log); put('diastolic', d.values.diastolic, log);
        if (number(d.values.pulse) !== null) put('heart', d.values.pulse, log);
      }
      if (log.type === 'measurement' && d.metric === 'bone_density') put('bone', d.values.value, log);
      if (log.type === 'sleep') put('sleep', number(d.durationMin) === null ? null : d.durationMin / 60, log);
      if (log.type === 'mood') put('mood', d.level, log);
    }
    const meals = own.filter(l => l.type === 'meal' && l.missionDay === day);
    if (meals.length) put('nutrition', meals.reduce((sum, l) => sum + (number(l.data.kcal) || 0), 0), meals.at(-1));
    const byDay = new Map();
    own.filter(l => l.type === 'measurement' && l.data.metric === 'blood_pressure').forEach(l => {
      if (number(l.data.values.pulse) !== null) byDay.set(l.missionDay, { missionDay: l.missionDay, date: l.timestamp, value: l.data.values.pulse });
    });
    return { id: profile.id, name: profile.name, crewId: profile.crewId, role: profile.role || 'astronaut',
      baseline: profile.baseline || {}, metrics, history: [...byDay.values()], logs: own, summary,
      provenance: own.some(l => l.provenance === 'USER_REPORTED') ? 'USER_REPORTED' : 'SIMULATED_TELEMETRY' };
  }
  // Ground UI retains only operational status, never mood, diary, or alert evidence/text.
  function appGroundPerson(row) {
    const level = row.latestAlert?.level;
    return { id: row.astronaut.id, name: row.astronaut.name, crewId: row.astronaut.crewId, role: 'astronaut',
      metrics: blankMetrics(), logs: [], history: [],
      summary: { overallScore: number(row.overallScore), logsDoneCount: row.logsToday, areas: row.areas,
        alertLevel: ['low', 'medium', 'high'].includes(level) ? level : null, activeAlerts: row.activeAlerts || 0 },
      provenance: 'RULE_DERIVED' };
  }
  const syntheticMap = { systolic: 'systolic_bp', diastolic: 'diastolic_bp', heart: 'heart_rate', glucose: 'blood_glucose',
    temperature: 'body_temperature', sleep: 'sleep_hours', mood: 'mood', bone: 'bone_density', nutrition: 'calorie_intake', immune: 'white_blood_cells' };
  function syntheticPerson(astronaut, daily, today) {
    const rows = [...daily].sort((a, b) => a.missionDay - b.missionDay);
    const metrics = blankMetrics();
    for (const [key, code] of Object.entries(syntheticMap)) {
      const comparison = today.values?.[code];
      const last = [...rows].reverse().find(r => number(r.values?.[code]) !== null);
      const value = comparison ? comparison.value : last?.values[code];
      metrics[key] = metric(value, metrics[key].unit, { status: comparison?.status || last?.metricStatus?.[code] || 'no_data',
        missionDay: comparison?.lastMeasuredDay ?? last?.missionDay, timestamp: last?.date, provenance: 'SIMULATED_TELEMETRY' });
    }
    return { id: astronaut.id, name: astronaut.displayName, role: astronaut.role, metrics, logs: [],
      history: rows.map(r => ({ missionDay: r.missionDay, date: r.date, value: number(r.values?.heart_rate) })),
      summary: { status: today.status }, provenance: 'SIMULATED_TELEMETRY' };
  }
  function syntheticGroundPerson(row) {
    return { id: row.astronaut.id, name: row.astronaut.displayName, role: row.astronaut.role,
      metrics: blankMetrics(), logs: [], history: [], summary: { status: row.status, activeAlerts: row.activeEpisodes || 0 }, provenance: 'SIMULATED_TELEMETRY' };
  }
  function normalizeMission(m, synthetic = false) {
    return synthetic ? { id: m.id, name: m.name, today: m.lastDay, lengthDays: m.lastDay, startDate: m.launchDate,
      destination: 'Synthetic mission', goals: {}, environments: [] } : m;
  }
  const moodLabels = { 1: 'Stressed', 2: 'Tired', 3: 'Okay', 4: 'Good', 5: 'Great' };
  class Client {
    constructor(baseUrl, fetcher = global.fetch?.bind(global)) {
      const u = new URL(baseUrl);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
      if ((u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) || u.username || u.password || u.search || u.hash || u.pathname !== '/') throw new Error('Use an HTTPS API origin, or HTTP on localhost, without a path or credentials.');
      this.baseUrl = u.origin; this.fetcher = fetcher; this.token = null; this.user = null;
    }
    async request(path, { method = 'GET', body } = {}) {
      if (method !== 'GET' && !(method === 'POST' && path === '/api/v1/auth/login')) throw new Error('This dashboard is read-only.');
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await this.fetcher(this.baseUrl + path, { method, signal: controller.signal, cache: 'no-store', credentials: 'omit',
          headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(this.token ? { Authorization: 'Bearer ' + this.token } : {}) },
          ...(body ? { body: JSON.stringify(body) } : {}) });
        const result = response.status === 204 ? null : await response.json();
        if (!response.ok) {
          if (response.status === 401) { this.token = null; throw new Error('Session expired or credentials invalid. Sign in again.'); }
          if (response.status === 403) throw new Error('This account does not have access to the selected dataset.');
          const detail = typeof result?.detail === 'string' ? result.detail : Array.isArray(result?.detail) ? result.detail.map(e => e.msg).join('; ') : 'API request failed';
          throw new Error(`HTTP ${response.status}: ${detail}`);
        }
        return result;
      } catch (error) {
        if (error.name === 'AbortError') throw new Error('The API request timed out. Please try refreshing the data.');
        if (error instanceof TypeError) throw new Error('Unable to reach the API. Check its address, HTTPS, and CORS configuration.');
        throw error;
      } finally { clearTimeout(timer); }
    }
    async login(username, password) {
      const response = await this.request('/api/v1/auth/login', { method: 'POST', body: { username, password } });
      this.token = response.accessToken;
      if (!this.token) throw new Error('The API did not return accessToken.');
      this.user = await this.request('/api/v1/auth/me');
      if (!['medical', 'admin'].includes(this.user.role)) { this.token = null; this.user = null; throw new Error('This dashboard is for the care team only. Sign in with a medical or admin account.'); }
      // Refresh tokens and passwords are never persisted by the dashboard.
      return this.user;
    }
    requireCareTeam() {
      if (!this.user || !['medical','admin'].includes(this.user.role)) throw new Error('Care-team access is required.');
    }
    async loadApp() {
      this.requireCareTeam();
      const [team, env] = await Promise.all([this.request('/api/v1/app/ground/crew'), this.request('/api/v1/app/ground/environment')]);
      const crew = await Promise.all(team.crew.map(async row => {
        const safe = appGroundPerson(row);
        const path = '/api/v1/app/ground/astronauts/' + encodeURIComponent(safe.id) + '/logs?type=';
        const groups = await Promise.all(['measurement','sleep','meal'].map(type => this.request(path + type)));
        const allowed = groups.flat().filter(l => ['measurement','sleep','meal'].includes(l.type));
        const person = appPerson({id:safe.id,name:safe.name,crewId:safe.crewId},allowed,safe.summary,team.missionDay);
        person.metrics.mood = {value:null,unit:'/5',private:true};
        return person;
      }));
      return { mission: team.mission, crew, summaries: [], environments: env.latest, source: 'api-app' };
    }
    async loadSynthetic(missionId) {
      this.requireCareTeam();
      const missions = await this.request('/api/v1/missions');
      const mission = missionId ? missions.find(m => m.id === missionId) : missions[0];
      if (!mission) throw new Error('No matching synthetic mission is available.');
      const path = '/api/v1/missions/' + encodeURIComponent(mission.id);
      const data = await this.request(path + '/dashboard');
      const crew = await Promise.all(data.crew.map(async row => {
        const daily = await this.request(path + '/astronauts/' + encodeURIComponent(row.astronaut.id) + '/daily?fromDay=1');
        const person = syntheticPerson(row.astronaut,daily,{status:row.status});
        person.summary.activeAlerts = row.activeEpisodes || 0;
        person.metrics.mood = {value:null,unit:'/5',private:true};
        return person;
      }));
      return { mission:{...normalizeMission(mission,true),today:data.missionDay},crew,summaries:[],environments:[],source:'api-synthetic' };
    }
  }

  const api = { metric, blankMetrics, appPerson, appGroundPerson, syntheticPerson, syntheticGroundPerson, normalizeMission, moodLabels, Client };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.HealthData = api;
})(typeof window !== 'undefined' ? window : globalThis);
