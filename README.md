# CosmoMedic · Crew Health Dashboard

A read-only Ground Control dashboard for the care team, in English, using the Nebula Glass palette, adapted to the actual [Crew Health API](https://github.com/lzphellipe/nasa-space-software-health-crew). Built with HTML, CSS, and JavaScript; no frontend build or package installation required.

## Run

For users, the published dashboard requires only a browser and a shared link.
Hosted HTTPS pages automatically load the API at the same origin. Deployment is
prepared in `render.yaml`; see [public access and publishing](DEPLOY.md).

The project includes a Python/FastAPI backend. To run the dashboard and API together:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
.\start-backend.ps1
```

Open http://127.0.0.1:8000; the default dataset loads automatically.
There is no local account or login. Both bundled fictional datasets
are available through the API. API documentation is at http://127.0.0.1:8000/docs.
See [backend setup and limits](backend/README.md).

For a frontend-only preview without Python dependencies:

From this directory:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173. In VS Code, select **CosmoMedic: Preview dashboard** and press F5. Google Fonts is optional; local fallback fonts work offline.

## Connect the backend

1. Start the included backend as above, or the upstream FastAPI backend according to its README (normally port 8000).
2. Select **Connect API** in the dashboard. Enter the API origin, such as http://127.0.0.1:8000, without an /api suffix.
3. Choose **CosmoMedic app** or **Synthetic mission** and select **Load data**.
4. Use **Refresh** to reload or **Disconnect** to return explicitly to demo data.

Connection defaults are in `src/config.js`: API origin, dataset and optional
`autoConnect`. The dashboard does not manage users, passwords, login or logout.
For protected upstream endpoints, the host application supplies its existing
session through `getAccessToken` or its cookie integration. Authorization stays
on the external API; removing the dashboard login does not make protected data
public. See [integration configuration](backend/README.md#integracao-com-o-sistema-principal).

For deployment, use HTTPS and configure backend CORS to allow the dashboard origin.

## Data and behavior

Use **Export PDF** to open the browser print dialog and choose **Save as PDF**.
The landscape A4 layout includes the current monitoring scope, filters, and open
sections, with charts and unscrolled reading tables. Expand any additional sections
before exporting. The report records its export time in UTC; source measurement
times remain visible. PDF export works locally without an additional service.

- Default demo uses the upstream Orbit-3 seed: four crew, canonical app IDs, typed logs, summaries, and environment readings. See [data attribution](data/NOTICE.md).
- App API: read received pressure/pulse, sleep, bone measurements, and nutrition through care-team endpoints. No check-in or health-data write actions.
- Glucose, body temperature and white blood cells are absent from the app schema and explicitly labeled unsupported. The separate synthetic mission includes these values, with read-only access.
- Values retain their source and measurement day. Missing values stay empty, and charts preserve missing-day gaps.
- App summary scores come from the source; synthetic data does not invent a readiness score.
- The care-team view shows general status and read-only physical indicators; psychological details and private messages are excluded. Actual server-side privacy limitations are documented in [BACKEND_CONTRACT.md](BACKEND_CONTRACT.md).
- Cabin readings are available to the ground team. Cabin commands and three-day rest planning remain clearly labeled local simulations.
- Selected crew metrics stay collapsed until needed.

There is no astronaut mode, personal copilot, family-message panel, or health-data entry form. Old browser-local prototype records are not read, migrated, or deleted. The included demo contains only physical measurement, sleep, and meal logs. All demo records are fictional.

## Project structure

```text
index.html                 # Dashboard shell and ordered script/style loading
src/
  main.js                  # Control events and initial render
  config.js                # API origin, dataset and host integration
  core/state.js            # Monitoring state and snapshot selection
  services/health-data.js   # API client and source projections
  shared/                  # Formatting, icons, portraits and toast messages
  styles/                  # Theme tokens and base layout
  features/
    overview/              # Individual metrics, history and mission metadata
    connection/            # API source selection, refresh and disconnect
    crew/                  # Crew aggregation and team view
    avatar/                # Body callouts, motion, gaze and review prompts
    command/               # Mission summary and local cabin/rest simulations
    mission-impact/        # Analysis engine and comparison view
    navigation/            # Sidebar navigation and active section tracking
    monitoring/            # Shared status, review context and selectable trends
data/                      # Attributed offline demo datasets
backend/                   # Python/FastAPI API, configuration and HTTP tests
start-backend.ps1          # Start the local API and dashboard
tests/                     # Node.js unit and dashboard integration tests
```

Feature-specific JavaScript and CSS live together. Shared styling stays in
`src/styles/`; shared presentation helpers stay in `src/shared/`.

The app uses classic deferred scripts with shared browser bindings, without a
bundler or an ES module build. Keep the order in `index.html`: datasets and pure
engines, shared helpers and avatar code, state and overview, connection and
`main.js`, then command, crew, impact and navigation. The dashboard integration
tests read that same script list directly from the HTML. When adding a feature,
place its files under `src/features/` and register its assets in `index.html`.

## Validation

With Node.js available:

```powershell
node --test tests/*.test.cjs
```

Tests cover mappings, missing data, timestamps, privacy projections, host session delegation, read-only enforcement, login-free connection, HTML escaping, and the simulator. The Python API and JavaScript client are also checked together over HTTP using both bundled datasets. Browser visual review remains pending because the browser host was unavailable.

See [BACKEND_CONTRACT.md](BACKEND_CONTRACT.md) for the exact mappings, endpoints, account namespaces, and integration limits.

## Collective monitoring

Team overview opens with a source snapshot, consistent status counts, a filterable
review queue and an always-visible individual readings table. Source review flags
come first, followed by follow-up flags and data/status gaps. Search by name or ID
and switch between daily and longitudinal indicators. Measurement ages and
timestamps stay visible independently of API refresh time.

The home view begins with a selectable crew trend (daily means, individual range
and coverage) and source status distribution. The collective avatar is visible
below this summary; the individual avatar starts expanded. Means exclude missing,
future, unsupported and private values. No psychological mean is computed.

Queue, table, individual context and avatar share the same status model. Open
individual details for selectable physical trends, personal references and chart
values in a table. Optional review tracking and collection context come from the
main system. See [monitoring behavior and integration](MONITORING.md).

## Source-linked avatar behavior

Both avatars have routine, watch, review, and limited-data states. Movements follow existing general/metric source flags, including older flags; no numeric threshold or diagnosis is introduced. The collective avatar uses the highest-priority crew flag, never the average. Missing current-day coverage keeps the avatar neutral when there are no source flags. Psychological values are excluded.

Motion starts enabled unless the browser requests reduced motion. The motion control applies to both avatars and persists while switching views or refreshing data during the session. The browser reduced-motion preference disables animation. All motion uses CSS and existing SVG groups; no new requests, timers, or raster assets are required. Status labels remain visible when motion is paused or reduced. Actual visual animation review remains pending because browser access is unavailable in this environment.

## Avatar review prompts

A clickable speech bubble highlights the highest-priority pending review. The individual view identifies that crew member; the collective view counts affected crew and lists prompts with a link to individual details. Prompts are recomputed on data refresh and disappear when their source conditions resolve.

Prompts cover existing care-team source flags, same-day sleep below an explicit mission goal, incomplete recorded intake relative to the mission calorie goal, and missing supported daily readings. Nutrition prompts are informational because the day or meal logs may be incomplete. Missing records are not medical findings, and these prompts do not establish hunger, prescribe rest, or infer a treatment. No hydration or medication need is invented without supporting data. The dashboard remains read-only.

## Mission impact: 30 days versus 180 days

Open Mission impact from the sidebar. The first implementation compares days -30 to -1 with days 1 to 180 (or the available follow-up). Select the current monitoring dataset or the explicitly labeled bundled synthetic example, then choose a physical indicator and whole-crew or individual scope. Using the example changes only the analysis, never the monitored mission or avatar.

The synthetic API supplies pre-flight daily records and its baseline reference endpoint. App records do not include the complete pre-flight series, so the analysis states that limitation rather than treating a single pre-flight reference as 30 measurements. The offline example is derived from the upstream samples CSV, contains 4 fictional crew and 840 physical daily records, and has simulated dates in 2027.

Results include paired means, sample standard deviations, absolute/relative mean differences, variability ratios, standardized descriptive shifts, weekly trajectories, coverage counts, and neutral review points. Team comparisons use equal weights for the same paired crew. Celsius temperature differences are not expressed as percentages. Mood, missing values, launch day zero, out-of-window records and future follow-up are excluded. Sparse measurements are not imputed.

These are observed associations in a simulated dataset, not causal mission effects, clinical classifications, or medical recommendations. Full formulas, eligibility rules and method references are expandable in the panel and documented in MISSION_IMPACT.md.
