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
| Resolve current role and astronaut ID | `GET /api/v1/auth/me` |
| App personal profile and mission | `GET /api/v1/app/me/profile` |
| App server-derived summary | `GET /api/v1/app/me/status` |
| App personal history | `GET /api/v1/app/me/logs?limit=1000` |
| App daily summaries | `GET /api/v1/app/me/summaries` |
| Save one typed app log | `POST /api/v1/app/me/logs` |
| Ground crew overview | `GET /api/v1/app/ground/crew` |
| Ground habitat readings | `GET /api/v1/app/ground/environment` |
| List synthetic missions | `GET /api/v1/missions` |
| Synthetic astronaut directory | `GET /api/v1/missions/{missionId}/astronauts` |
| Personal synthetic snapshot | `GET /api/v1/missions/{missionId}/astronauts/{astronautId}/today` |
| Personal synthetic daily history | `GET /api/v1/missions/{missionId}/astronauts/{astronautId}/daily?fromDay=1` |
| Ground synthetic overview | `GET /api/v1/missions/{missionId}/dashboard` |

The dashboard does not connect directly to SQLite/PostgreSQL. Database passwords belong to the API, never to frontend configuration.

## Saving logs

One submission saves one record. The UI currently supports blood pressure/pulse, sleep, mood, and bone density. Sleep timestamps are entered in local time and serialized to UTC; the server derives duration. Pulse is constrained to 30–220; systolic to 60–250; diastolic to 30–150, with systolic greater than diastolic. These are API validation bounds, not clinical recommendations. Mood/quality are integers from 1 to 5. Sleep intervals must be positive and at most 16 hours.

There is no multi-log transaction or idempotency key in the inspected API. Writes are never automatically retried. If the save succeeds but refresh fails, the UI reports that distinction. Following a timeout, refresh before resubmitting.

The backend's `/me/logs` endpoint is limited to the newest 1,000 logs, without cursor pagination. Personal app charts reflect that fetched window, not a guaranteed complete lifetime archive. The synthetic personal history covers the selected mission's flight days.

## Roles and privacy

Live mode follows `/auth/me`: `astronaut` sees its own data; `medical` and `admin` see Ground Control. The live role switch cannot elevate access, and ground loading does not request personal log/status endpoints.

**Backend limitation:** `/app/ground/crew` currently returns mood and a latest alert containing text/evidence; the synthetic ground overview includes raw per-person values. The frontend discards these fields in its ground projection. This does not remove them from the network response. Meeting the intended privacy policy requires server-side response filtering and an explicit policy for operational versus clinical roles. See [ground router](https://github.com/lzphellipe/nasa-space-software-health-crew/blob/7c7de46f2b2f21360f4a9fd027ad4c298522b618/app/routers/app_ground.py).

Tokens stay in memory; passwords and refresh tokens are not persisted. Reloading the page requires sign-in again. Disconnect clears local session state; it does not revoke an already-issued access token on the server.

## Unsupported integrations

`overallScore` is an app health summary, not an EVA readiness score. The synthetic dataset returns categorical status and has no overall readiness score. No replacement score is invented.

Cabin readings are read-only. Light/noise/temperature controls and rest planning remain labeled local simulations because the backend has no cabin-command or schedule-write endpoints. There is no family messaging endpoint; the dashboard does not substitute Mission Control messages for private family messages.

## Verification

Validated with a fresh local instance of the upstream FastAPI application and an isolated generated SQLite database: app and synthetic logins; four typed log writes and subsequent reads; app and synthetic ground views; habitat readings; astronaut-to-ground denial (403); incompatible ID rejection. No upstream code, hosted database, or GitHub branch was changed.

Unit and DOM-simulation tests are in `tests/health-data.test.cjs` and `tests/command.test.cjs`. Real browser visual verification remains pending because the browser access host was unavailable.
