# CosmoMedic backend contract

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

All authenticated requests use `Authorization: Bearer <accessToken>`. JSON fields are camelCase.

| Action | Endpoint |
| --- | --- |
| Sign in using username/password (Crew ID/PIN also works) | `POST /api/v1/auth/login` |
| Require medical/admin role | `GET /api/v1/auth/me` |
| Ground crew overview | `GET /api/v1/app/ground/crew` |
| Ground habitat readings | `GET /api/v1/app/ground/environment` |
| List synthetic missions | `GET /api/v1/missions` |
| Read synthetic daily history for the care team | `GET /api/v1/missions/{missionId}/astronauts/{astronautId}/daily?fromDay=1` |
| Ground synthetic overview | `GET /api/v1/missions/{missionId}/dashboard` |

The dashboard does not connect directly to SQLite/PostgreSQL. Database passwords belong to the API, never to frontend configuration.

## Read-only monitoring

The dashboard does not create or modify health records. There are no check-in forms, health-data submission methods, or browser-local record storage. Authentication is the only allowed POST request; data loading uses GET.

For each crew member the app source reads measurement, sleep, and meal logs from `GET /api/v1/app/ground/astronauts/{astronautId}/logs?type=...`. Mood, journal, injury descriptions, and private messages are not requested as individual logs. The UI labels mood private and leaves its value empty. Synthetic records supply physical metrics and heart-rate history; mood is discarded in the projection.

The ground summary remains visible above an expandable read-only section for the selected crew member. Cabin controls and scenario plans are local simulations; neither sends commands to the API.

## Roles and privacy

Live access requires medical or admin from `/auth/me`. Astronaut accounts are rejected before any crew data is loaded. There is no role switch or astronaut interface. Read endpoints remain protected by backend authorization.

**Backend limitation:** `/app/ground/crew` currently returns mood and a latest alert containing text/evidence; the synthetic ground overview includes raw per-person values. The frontend discards these fields in its ground projection. This does not remove them from the network response. Meeting the intended privacy policy requires server-side response filtering and an explicit policy for operational versus clinical roles. See [ground router](https://github.com/lzphellipe/nasa-space-software-health-crew/blob/7c7de46f2b2f21360f4a9fd027ad4c298522b618/app/routers/app_ground.py).

Tokens stay in memory; passwords and refresh tokens are not persisted. Reloading the page requires sign-in again. Disconnect clears local session state; it does not revoke an already-issued access token on the server.

## Unsupported integrations

`overallScore` is an app health summary, not an EVA readiness score. The synthetic dataset returns categorical status and has no overall readiness score. No replacement score is invented.

Cabin readings are read-only. Light/noise/temperature controls and rest planning remain labeled local simulations because the backend has no cabin-command or schedule-write endpoints. There is no family messaging endpoint; the dashboard does not substitute Mission Control messages for private family messages.

## Verification

Validated with a local upstream FastAPI instance and an isolated SQLite database: medical-account login, app/synthetic crew reads, received physical logs, private-mood exclusion, and rejection of astronaut accounts. No upstream code, hosted database, or GitHub branch was changed.

Unit and DOM-simulation tests are in `tests/health-data.test.cjs` and `tests/command.test.cjs`. Real browser visual verification remains pending because the browser access host was unavailable.

## Collective averages

`crew-aggregate.js` computes descriptive means only within the selected dataset and the current mission day. Each metric includes contributor count, total crew, range, and source flags. Pressure uses only crew with a complete same-day systolic/diastolic pair; both means share the same contributors. Missing values are not zero. Mood is always private and is never aggregated.

The collective avatar is conceptual and represents no individual. Colors reflect the worst available individual metric flag, even if its reading is older and excluded from the mean; flag dates remain visible in individual details. Current summary and metric flags also feed the follow-up list and the summary counts. These are source flags, not new clinical classifications. Tests for these rules are in `tests/crew-aggregate.test.cjs`.
