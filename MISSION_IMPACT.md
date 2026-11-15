# Mission impact comparison, first implementation

The dashboard now provides a read-only descriptive analysis of observed changes between two fixed mission-relative windows. It does not estimate a causal medical effect.

## Periods and sources

- Baseline: days **−30 through −1**, inclusive (30 days).
- Follow-up: days **1 through 180**, inclusive, capped at the current mission day. Day 0 is excluded from both windows.
- Current synthetic mission API: raw daily rows plus the backend baseline summary reference, using authenticated medical/admin access.
- Bundled synthetic example: physical-only rows derived from the upstream [samples CSV](https://github.com/lzphellipe/nasa-space-software-health-crew/blob/7c7de46f2b2f21360f4a9fd027ad4c298522b618/samples/synthetic_daily_vitals.csv). Four simulated crew, 840 rows, generated scenario dates in 2027. See [license and attribution](data/NOTICE.md).
- CosmoMedic app: the required pre-flight daily series is absent. Its single pre-flight profile references are **not** substituted for 30 days of observations. This source displays an explicit unavailable state.

The analysis source is independent of monitoring. Selecting the example never replaces the monitored mission, profiles, avatar, or source flags. No records are written. Per-record values are whitelisted to the ten physical indicators; mood, private notes, and unknown fields are excluded.

The existing `cite: 1` placeholders are replaced with actual source metadata in the interface: dataset label, mission ID, provenance, observed date ranges, sample counts, paired crew count, and a source-reference link. The API source link opens its documentation; it contains no access token or credentials.

## Calculations

For each indicator and crew member, compute pre-flight and mission means and sample standard deviations (denominator **n−1**). At most one daily record per crew member is retained; the latest supplied timestamp wins. Nonfinite and missing values are omitted, never replaced by zero. Weekly and monthly measurements retain their sparse cadence and are not filled forward.

The crew comparison uses only people with at least one valid observation in **both** windows. Each paired person has equal weight, regardless of their number of readings:

- Team baseline mean: mean of the paired personal baseline means.
- Team mission mean: mean of the same paired personal mission means.
- Mean change: mission mean minus baseline mean.
- Relative change: mean change / absolute baseline mean × 100. Undefined for a zero baseline. Celsius percentages are deliberately omitted because the temperature origin is arbitrary.
- Dispersion: average of personal sample SDs across people with at least two readings in each period. These are **not pooled crew SDs**. The panel reports their difference, mission/baseline ratio, and eligible crew count.
- Standardized shift: average personal `(mission mean − baseline mean) / baseline SD`, excluding insufficient or zero-SD baselines. No SD floor is inserted to manufacture a statistic.
- Personal reference-band count: mission readings outside that person's baseline mean ±2 baseline SD. The denominator includes only readings with an estimable, nonzero baseline SD. This is a **descriptive reference band**, not a medical threshold or an alert.
- Trend: ordinary least-squares slope against the actual observed mission-day values, scaled to 30 days. No p-value, confidence interval, or extrapolation is attached.

Weekly chart points average each eligible person's observations within a week, then average those personal weekly means. Week-to-week contributor counts can vary and are shown in tooltips. Empty weeks break the line; baseline and mission segments are not connected across launch. The reference line is the paired baseline mean.

The interface reports the target follow-up window separately from actual days with any physical observations. Counts for the selected indicator remain visible. Sparse or incomplete baselines can make SD-based comparisons unstable; clinicians should inspect the individual counts and trajectories.

## Interpretation and decisions

Insights are deterministic descriptions of observed mean shifts, changes in personal dispersion, slopes, pairing gaps, and incomplete follow-up. Sorting by standardized shift is an exploratory ordering, not a medical-priority ranking. An increase or decrease is not automatically labeled improvement or deterioration. No findings are fed into avatar health states or source alert classifications.

A simple before/after contrast does not establish that the mission caused a change. Temporal autocorrelation, confounding, secular trends, sampling changes and a suitable control/counterfactual require additional analysis. Pairing compares each person to themselves; it does not make repeated daily observations independent. The implementation therefore does not run a naive t-test over all daily rows or claim statistical significance.

Methodological context: [NIST paired observations](https://www.itl.nist.gov/div898/handbook/prc/section3/prc311.htm) describes within-unit before/after pairing. [Lopez Bernal et al., interrupted time-series tutorial](https://pmc.ncbi.nlm.nih.gov/articles/PMC5407170/) discusses design, autocorrelation and confounding concerns beyond descriptive comparisons. This implementation is **not** a fitted interrupted time-series causal model.

## Files and verification

- `src/features/mission-impact/mission-impact.js`: pure calculation and physical-field filtering.
- `src/features/mission-impact/impact-view.js` / `src/features/mission-impact/impact-view.css`: expandable UI, source and subject controls, trend chart, insights and comparison table.
- `data/impact-example.js`: attributed offline synthetic example.
- `src/services/health-data.js`: API daily-history and baseline-reference integration.
- `tests/mission-impact.test.cjs`: pairing/weights, 30/180 boundaries, day-zero exclusion, missing observations, zero variance, slopes, privacy, temperature and duplicate-day behavior.

Verified against the pinned local upstream FastAPI service using its isolated SQLite test database. All four heart-rate baselines matched the backend reference to its rounding precision, with 120 baseline and 720 mission observations. Monitoring remained flight-only and the app source remained explicitly non-comparable. Visual browser verification remains pending.
