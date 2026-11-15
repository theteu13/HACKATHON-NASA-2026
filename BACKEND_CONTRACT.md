# CosmoMedic backend contract

## Included Python backend

`backend/` implements the endpoints consumed by the dashboard using FastAPI and
the attributed bundled fictional datasets. It also serves the frontend at `/`.
See [setup and external session integration](backend/README.md). Physical fields
are whitelisted in server responses; the upstream privacy limitation described
below does not apply to this local implementation. The local API serves only
bundled fictional data, without login, sessions, a user database or a persistent
database. Synthetic source statuses are unavailable because the bundle contains
observations without alert classifications.

The remainder of this document describes the separate upstream service contract.

Inspected repository: [lzphellipe/nasa-space-software-health-crew](https://github.com/lzphellipe/nasa-space-software-health-crew/tree/7c7de46f2b2f21360f4a9fd027ad4c298522b618), commit `7c7de46f2b2f21360f4a9fd027ad4c298522b618`.

## Keep the datasets separate

| Source | Database models | Identity | Dashboard behavior |
| --- | --- | --- | --- |
| CosmoMedic app | `app_missions`, `app_astronauts`, `app_logs`, `app_environment_readings` | `ast-01`, Crew ID `ORB3-ANA` | Typed logs, app summary scores, habitat readings |
| Synthetic daily vitals | `Mission`, `Astronaut`, `DailyRecord` | `A001`, mission `SYN-LDM-01` | All six vital signs and sparse optional measurements; read-only |

App IDs must never be matched to synthetic IDs by name or list position. The selected source remains visible in the header. API connection errors do not silently substitute demo readings.

## Metric mapping

| Dashboard | App schema | Synthetic `values` key |
| --- | --- | --- |
| Blood pressure | `measurement`, `data.metric=blood_pressure`, `data.values.systolic/diastolic` | `systolic_bp`, `diastolic_bp` |
| Heart rate | `blood_pressure` measurement, `data.values.pulse` | `heart_rate` |
| Blood glucose | **Unsupported** | `blood_glucose` |
| Body temperature | **Unsupported** | `body_temperature` |
| Daily sleep | `sleep`, `data.durationMin / 60` | `sleep_hours` |
| Mood | `mood`, `data.level`; 1 stressed, 2 tired, 3 okay, 4 good, 5 great | `mood`; separate synthetic scale |
| Bone density | `measurement`, metric `bone_density`, `values.value` in g/cm² | `bone_density` |
| Nutrition | Sum of same-day `meal.data.kcal` | `calorie_intake` |
| Immune-system proxy | **Unsupported** | `white_blood_cells`, ×10³/µL |

Missing values stay `null` and display as an em dash. Unsupported metrics are explicitly labeled. Old readings retain their mission day; they are not presented as today's data. Heart-rate charts preserve missing-day gaps. Bone cadence is weekly in the app and monthly in the synthetic catalog.

Canonical references: [app schemas](https://github.com/lzphellipe/nasa-space-software-health-crew/blob/7c7de46f2b2f21360f4a9fd027ad4c298522b618/app/cosmo/schemas.py), [app tables](https://github.com/lzphellipe/nasa-space-software-health-crew/blob/7c7de46f2b2f21360f4a9fd027ad4c298522b618/app/cosmo/models.py), [synthetic metric catalog](https://github.com/lzphellipe/nasa-space-software-health-crew/blob/7c7de46f2b2f21360f4a9fd027ad4c298522b618/app/synthetic/metrics.py).

## API calls

Protected upstream requests use `Authorization: Bearer <accessToken>` supplied by the main system through `getAccessToken`. The dashboard never calls login or account endpoints. JSON fields are camelCase.

| Action | Endpoint |
| --- | --- |
| Ground crew overview | `GET /api/v1/app/ground/crew` |
| Ground habitat readings | `GET /api/v1/app/ground/environment` |
| List synthetic missions | `GET /api/v1/missions` |
| Read synthetic daily history for the care team | `GET /api/v1/missions/{missionId}/astronauts/{astronautId}/daily?fromDay=-30&toDay={currentDay}` |
| Ground synthetic overview | `GET /api/v1/missions/{missionId}/dashboard` |

The dashboard does not connect directly to SQLite/PostgreSQL. Database passwords belong to the API, never to frontend configuration.

## Read-only monitoring

The dashboard does not create or modify health records. There are no check-in forms, health-data submission methods, or browser-local record storage. All dashboard API requests use GET; POST and other write methods are blocked.

For each crew member the app source reads measurement, sleep, and meal logs from `GET /api/v1/app/ground/astronauts/{astronautId}/logs?type=...`. Mood, journal, injury descriptions, and private messages are not requested as individual logs. The UI labels mood private and leaves its value empty. Synthetic records supply physical metrics and heart-rate history; mood is discarded in the projection.

The ground summary remains visible above an expandable read-only section for the selected crew member. Cabin controls and scenario plans are local simulations; neither sends commands to the API.

## Roles and privacy

The main system owns login, sessions and account roles. The upstream service must
enforce care-team authorization on read endpoints. The dashboard does not create
accounts, validate credentials, refresh sessions or log the user out. Configure
`getAccessToken` or cookie credentials in the host integration when accessing
protected endpoints. A 401/403 is displayed as an access error without replacing
loaded data with demo data.

**Backend limitation:** `/app/ground/crew` currently returns mood and a latest alert containing text/evidence; the synthetic ground overview includes raw per-person values. The frontend discards these fields in its ground projection. This does not remove them from the network response. Meeting the intended privacy policy requires server-side response filtering and an explicit policy for operational versus clinical roles. See [ground router](https://github.com/lzphellipe/nasa-space-software-health-crew/blob/7c7de46f2b2f21360f4a9fd027ad4c298522b618/app/routers/app_ground.py).

The dashboard does not persist passwords or tokens. `getAccessToken` is called
for each request so the host can supply its current session. Disconnect only
detaches the data source and returns to demo; it does not change the host session.

## Unsupported integrations

`overallScore` is an app health summary, not an EVA readiness score. The synthetic dataset returns categorical status and has no overall readiness score. No replacement score is invented.

Cabin readings are read-only. Light/noise/temperature controls and rest planning remain labeled local simulations because the backend has no cabin-command or schedule-write endpoints. There is no family messaging endpoint; the dashboard does not substitute Mission Control messages for private family messages.

## Verification

Earlier upstream integration was validated with a local FastAPI instance and an isolated SQLite database: medical-account login, app/synthetic crew reads, received physical logs, private-mood exclusion, and rejection of astronaut accounts. No upstream code, hosted database, or GitHub branch was changed.

Unit and DOM-simulation tests are in `tests/health-data.test.cjs` and `tests/command.test.cjs`. Real browser visual verification remains pending because the browser access host was unavailable.

## Collective averages

`src/features/crew/crew-aggregate.js` computes descriptive means only within the selected dataset and the current mission day. Each metric includes contributor count, total crew, range, and source flags. Pressure uses only crew with a complete same-day systolic/diastolic pair; both means share the same contributors. Missing values are not zero. Mood is always private and is never aggregated.

The collective avatar is conceptual and represents no individual. Colors reflect the worst available individual metric flag, even if its reading is older and excluded from the mean; flag dates remain visible in individual details. Current summary and metric flags also feed the follow-up list and the summary counts. These are source flags, not new clinical classifications. Tests for these rules are in `tests/crew-aggregate.test.cjs`.

## Mission impact API extension

The synthetic source now reads the pre-flight window as well as mission history via `GET /api/v1/missions/{missionId}/astronauts/{astronautId}/daily?fromDay=-30&toDay={currentDay}` and the read-only `/baseline` endpoint. Monitoring still projects only flight-day values; the separate analysis object whitelists physical indicator codes, strips mood and discards day zero and records outside -30..-1 / 1..180. The backend baseline summary is retained as a source reference, while analysis statistics are recomputed from the raw fixed-window observations.

The new Mission impact panel supports current API data and a separately labeled offline synthetic example. The app source has no complete 30-day pre-flight series and is explicitly unavailable for this comparison. See MISSION_IMPACT.md for formulas, interpretation limits, and coverage.
