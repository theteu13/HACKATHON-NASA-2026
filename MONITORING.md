# Care-team monitoring workspace

The dashboard organizes received physical observations for review. It does not
diagnose conditions, assign medical urgency or authorize activities.

## Workflow

1. Check the source snapshot and dashboard load time.
2. Review source flags and unavailable data/status in the queue.
3. Search by name or crew ID, filter by status, and compare individual readings
   in the always-visible table. Switch between daily and longitudinal indicators.
4. Open a crew member to inspect the status reasons, measurement times,
   current-day coverage, supplied context and personal trends.
5. Choose an indicator and period. Inspect the chart, personal reference when
   available, descriptive difference and exact observations in the values table.
6. Follow the external case link when the main system supplies review tracking.

The collective illustration and averages, individual illustration, source scores
and rest scenario demonstration are secondary expandable sections. Avatar motion
is paused by default. Illustrations do not localize a medical condition.

## One status model

`src/features/monitoring/monitoring-model.js` is shared by the queue, table,
individual context, source summary and avatar. Status order is:

- Source review flag: existing source summary or physical metric review flag.
- Source follow-up flag: existing source summary or physical metric watch flag.
- Insufficient data / status: missing current-day coverage or unavailable status.
- No source flags: interpretable source status without flags and complete
  configured daily coverage. This does not mean a crew member is medically fit.

Older source flags remain visible with their measurement day. Future-dated,
private and unsupported metric flags do not determine status. Unknown source
status is never treated as reassuring. Source scores are secondary and do not
establish clinical thresholds.

`expectedDailyMetrics` in `src/config.js` configures daily coverage expectations.
Defaults include pressure components, heart rate, sleep, glucose and temperature,
excluding unsupported indicators. Weekly bone density and meal totals are not
treated as missing daily vital signs. These are completeness checks.

## Dates and charts

Dashboard load time is separate from measurement time. Each reading shows its
mission day, age relative to the mission day, and supplied timestamp. Times are
displayed in UTC; date-only observations explicitly lack a supplied time. Server
receipt and transmission delay remain unavailable. Failed refreshes retain the
previous snapshot with an explicit failure banner.

Charts use the latest physical observation per mission day; recorded intake sums
available meal calories. Missing days are not connected. The vertical axis adapts
to values and does not represent a clinical normal range. Charts and tables
scroll on narrow screens, and chart values have an accessible table.

App personal references use source-provided resting heart rate, pressure, usual
sleep and bone density. Synthetic references use the same person's physical
records from days -30 through -1. Unavailable baselines are not invented.
Differences are descriptive, without inferred diagnosis or medical urgency.
`historyByMetric` in `src/services/health-data.js` excludes mood and narratives.

## External review integration

The main system can supply these fields through `window.COSMOMEDIC_CONFIG`
before `src/config.js` loads (or update them and call `render()`):

```javascript
window.COSMOMEDIC_CONFIG = {
  reviewRecords: {
    'ast-01': {
      status: 'in_review', // pending | in_review | reviewed
      assignee: 'Responsible care team',
      updatedAt: '2026-11-15T12:00:00Z',
      url: 'https://main-system.example/cases/123'
    }
  },
  clinicalContext: {
    'ast-01': {
      symptoms: 'Authorized concern supplied by the main system',
      collectionContext: 'Collection conditions supplied by the source'
    }
  }
};
```

These are integration examples, not bundled patient data. Supply only context
authorized for this view. Unavailable symptoms are not interpreted as absent.

Review tracking is read-only and separate from source flags. Opening details
does not acknowledge or resolve a flag, and an external reviewed case does not
suppress source flags. No local clinical notes or review status are persisted.
Login remains owned by the main system.

## Verification limits

Tests cover status consistency, coverage, timestamps, physical histories,
personal references, filters, chart gaps and external review links. These are
software checks, not clinical validation. Clinician usability testing and browser
visual review remain necessary before clinical operations.
