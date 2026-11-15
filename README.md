# CosmoMedic · Crew Health Dashboard

A read-only Ground Control dashboard for the care team, in English, using the Nebula Glass palette, adapted to the actual [Crew Health API](https://github.com/lzphellipe/nasa-space-software-health-crew). Built with HTML, CSS, and JavaScript; no frontend build or package installation required.

## Run

From this directory:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173. In VS Code, select **CosmoMedic: Preview dashboard** and press F5. Google Fonts is optional; local fallback fonts work offline.

## Connect the backend

1. Start the upstream FastAPI backend according to its README (normally port 8000).
2. Select **Connect API** in the dashboard. Enter the API origin, such as http://127.0.0.1:8000, without an /api suffix.
3. Choose **CosmoMedic app** or **Synthetic mission** and sign in with an account belonging to that dataset.
4. Only medical and admin accounts can enter this dashboard. Use **Refresh** to reload or **Disconnect** to return explicitly to demo data.

For local seeded development only, the upstream care-team account is surgeon with password spaceapps2026 (unless changed in backend configuration). Astronaut accounts are rejected by this dashboard.

For deployment, use HTTPS and configure backend CORS to allow the dashboard origin. The dashboard never needs database passwords, a JWT signing secret, or an admin API key. Access tokens remain in memory; page reload returns to the demo.

## Data and behavior

- Default demo uses the upstream Orbit-3 seed: four crew, canonical app IDs, typed logs, summaries, and environment readings. See [data attribution](data/NOTICE.md).
- App API: read received pressure/pulse, sleep, bone measurements, and nutrition through care-team endpoints. No check-in or health-data write actions.
- Glucose, body temperature and white blood cells are absent from the app schema and explicitly labeled unsupported. The separate synthetic mission includes these values, with read-only access.
- Values retain their source and measurement day. Missing values stay empty, and charts preserve missing-day gaps.
- App summary scores come from the source; synthetic data does not invent a readiness score.
- The care-team view shows general status and read-only physical indicators; psychological details and private messages are excluded. Actual server-side privacy limitations are documented in [BACKEND_CONTRACT.md](BACKEND_CONTRACT.md).
- Cabin readings are available to the ground team. Cabin commands and three-day rest planning remain clearly labeled local simulations.
- Selected crew metrics stay collapsed until needed.

There is no astronaut mode, personal copilot, family-message panel, or health-data entry form. Old browser-local prototype records are not read, migrated, or deleted. The included demo contains only physical measurement, sleep, and meal logs. All demo records are fictional.

## Validation

With Node.js available:

```powershell
node --test tests/health-data.test.cjs tests/command.test.cjs tests/crew-aggregate.test.cjs
```

Tests cover mappings, missing data, timestamps, privacy projections, role selection, read-only enforcement, rejected astronaut accounts, HTML escaping, and the simulator. Also verified against a fresh local upstream API with an isolated SQLite database: medical-account access to app and synthetic data, physical record reads, and rejected astronaut accounts. Browser visual review remains pending because the browser host was unavailable.

See [BACKEND_CONTRACT.md](BACKEND_CONTRACT.md) for the exact mappings, endpoints, account namespaces, and integration limits.

## Collective monitoring

Team overview opens with status counts and a conceptual crew avatar. Its eight callouts show means for the current mission day, with contributing crew counts (for example, 3/4). Pressure means use the same complete systolic/diastolic pairs. Missing, older, future, unsupported, and private values do not enter the mean. No psychological mean is computed.

Callout colors preserve individual metric flags, including older measurements, and the follow-up list keeps those crew members visible. If a metric has no per-metric source status, the interface does not invent clinical thresholds. The comparison table is expandable and displays latest individual readings with their measurement days. Select View details to open the individual avatar.
