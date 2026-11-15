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
  function buildLog(kind, values) {
    const n = key => { const v = values[key]; if (v === '' || v == null || !Number.isFinite(Number(v))) throw new Error('Complete all required fields.'); return Number(v); };
    if (kind === 'blood_pressure') {
      const systolic = n('systolic'), diastolic = n('diastolic'), pulse = n('pulse');
      if (systolic < 60 || systolic > 250 || diastolic < 30 || diastolic > 150 || systolic <= diastolic || pulse < 30 || pulse > 220) throw new Error('Blood pressure or pulse is outside the API input range.');
      return { type: 'measurement', data: { metric: 'blood_pressure', values: { systolic, diastolic, pulse } } };
    }
    if (kind === 'mood') {
      const level = n('level'); if (!Number.isInteger(level) || level < 1 || level > 5) throw new Error('Choose a mood from 1 to 5.');
      return { type: 'mood', data: { level, tags: [] } };
    }
    if (kind === 'sleep') {
      const bedtime = new Date(values.bedtime), wake = new Date(values.wakeTime), minutes = (wake - bedtime) / 60000, quality = n('quality');
      if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 960 || !Number.isInteger(quality) || quality < 1 || quality > 5) throw new Error('Sleep must end after bedtime, last at most 16 hours, and have a quality from 1 to 5.');
      return { type: 'sleep', data: { bedtime: bedtime.toISOString(), wakeTime: wake.toISOString(), quality, source: 'manual', wakeUps: 'none' } };
    }
    if (kind === 'bone_density') { const value = n('value'); if (value <= 0) throw new Error('Bone density must be positive.'); return { type: 'measurement', data: { metric: 'bone_density', values: { value, unit: 'g/cm²' } } }; }
    throw new Error('Unsupported log type.');
  }
  function validDemoLog(log) {
    if (!log || typeof log.id !== 'string' || typeof log.astronautId !== 'string' || !Number.isInteger(log.missionDay) || log.missionDay < 1 || !Number.isFinite(Date.parse(log.timestamp))) return false;
    try {
      const d = log.data;
      if (log.type === 'measurement' && d.metric === 'blood_pressure') buildLog('blood_pressure', { ...d.values, pulse: d.values.pulse });
      else if (log.type === 'measurement' && d.metric === 'bone_density') buildLog('bone_density', d.values);
      else if (log.type === 'sleep') { buildLog('sleep', d); if (number(d.durationMin) === null) return false; }
      else if (log.type === 'mood') buildLog('mood', d);
      else return false;
      return true;
    } catch { return false; }
  }
  class Client {
    constructor(baseUrl, fetcher = global.fetch?.bind(global)) {
      const u = new URL(baseUrl);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
      if ((u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) || u.username || u.password || u.search || u.hash || u.pathname !== '/') throw new Error('Use an HTTPS API origin, or HTTP on localhost, without a path or credentials.');
      this.baseUrl = u.origin; this.fetcher = fetcher; this.token = null; this.user = null;
    }
    async request(path, { method = 'GET', body } = {}) {
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
        if (error.name === 'AbortError') throw new Error('The API request timed out. A write may have succeeded; refresh before submitting again.');
        if (error instanceof TypeError) throw new Error('Unable to reach the API. Check its address, HTTPS, and CORS configuration.');
        throw error;
      } finally { clearTimeout(timer); }
    }
    async login(username, password) {
      const response = await this.request('/api/v1/auth/login', { method: 'POST', body: { username, password } });
      this.token = response.accessToken;
      if (!this.token) throw new Error('The API did not return accessToken.');
      this.user = await this.request('/api/v1/auth/me');
      if (!['astronaut', 'medical', 'admin'].includes(this.user.role)) throw new Error('Unsupported account role.');
      // Refresh tokens and passwords are never persisted by the dashboard.
      return this.user;
    }
    async loadApp() {
      if (this.user.role === 'astronaut') {
        const [profile, status, logs, summaries] = await Promise.all([
          this.request('/api/v1/app/me/profile'), this.request('/api/v1/app/me/status'),
          this.request('/api/v1/app/me/logs?limit=1000'), this.request('/api/v1/app/me/summaries')
        ]);
        return { mission: profile.mission, crew: [appPerson(profile, logs, status, profile.mission.today)], summaries, environments: [], source: 'api-app' };
      }
      const [team, env] = await Promise.all([this.request('/api/v1/app/ground/crew'), this.request('/api/v1/app/ground/environment')]);
      return { mission: team.mission, crew: team.crew.map(appGroundPerson), summaries: [], environments: env.latest, source: 'api-app' };
    }
    async loadSynthetic(missionId) {
      const missions = await this.request('/api/v1/missions');
      const mission = missionId ? missions.find(m => m.id === missionId) : missions[0];
      if (!mission) throw new Error('No matching synthetic mission is available.');
      const path = '/api/v1/missions/' + encodeURIComponent(mission.id);
      if (this.user.role !== 'astronaut') {
        const data = await this.request(path + '/dashboard');
        return { mission: { ...normalizeMission(mission, true), today: data.missionDay }, crew: data.crew.map(syntheticGroundPerson), summaries: [], environments: [], source: 'api-synthetic' };
      }
      const astronauts = await this.request(path + '/astronauts');
      const person = astronauts.find(a => a.id.toUpperCase() === this.user.astronautId?.toUpperCase());
      if (!person) throw new Error('This account is not linked to this synthetic mission. App and synthetic astronaut IDs are separate.');
      const personal = path + '/astronauts/' + encodeURIComponent(person.id);
      const [today, daily] = await Promise.all([this.request(personal + '/today'), this.request(personal + '/daily?fromDay=1')]);
      return { mission: { ...normalizeMission(mission, true), today: today.missionDay }, crew: [syntheticPerson(person, daily, today)], summaries: [], environments: [], source: 'api-synthetic' };
    }
    async saveLog(payload) { return this.request('/api/v1/app/me/logs', { method: 'POST', body: payload }); }
  }
  const api = { metric, blankMetrics, appPerson, appGroundPerson, syntheticPerson, syntheticGroundPerson, normalizeMission, moodLabels, buildLog, validDemoLog, Client };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.HealthData = api;
})(typeof window !== 'undefined' ? window : globalThis);
