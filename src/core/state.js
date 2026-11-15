'use strict';
const seed = window.COSMOMEDIC_DEMO;
let client = null, selected, crew = [], period = 7, sessionVersion = 0, busy = false;
let dataState;
function demoSnapshot() {
  return { source: 'demo', mission: seed.mission, summaries: seed.dailySummaries, environments: seed.environmentReadings,
    crew: seed.astronauts.map(a => {
      const person = HealthData.appPerson(a, seed.logs.filter(l => ['measurement','sleep','meal'].includes(l.type)),
        seed.dailySummaries.find(s => s.astronautId === a.id && s.missionDay === seed.mission.today) || {}, seed.mission.today);
      person.metrics.mood = { value: null, unit: '/5', private: true };
      return person;
    }) };
}
function commitSnapshot(snapshot) {
  const previousId = selected?.id;
  snapshot.loadedAt = new Date().toISOString();
  dataState = snapshot; crew = snapshot.crew; selected = crew.find(c => c.id === previousId) || crew[0];
  if (!selected) throw new Error('No crew is available in this dataset.');
}
commitSnapshot(demoSnapshot());
function current() { return selected; }
