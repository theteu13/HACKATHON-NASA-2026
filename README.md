# CosmoMedic · Crew Health Dashboard

A responsive English-language dashboard using the Nebula Glass palette, adapted to the actual [Crew Health API](https://github.com/lzphellipe/nasa-space-software-health-crew). Built with HTML, CSS, and JavaScript; no frontend build or package installation required.

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
4. Your backend role selects Astronaut or Ground Control. Use **Refresh** to reload or **Disconnect** to return explicitly to demo data.

For local seeded development only, upstream defaults include Crew ID ORB3-ANA with PIN 2026 for the app; astronaut1 with password spaceapps2026 for synthetic data; and surgeon with that same demo password for the care team. These may be overridden by the backend configuration. They are public demo defaults, not production credentials.

For deployment, use HTTPS and configure backend CORS to allow the dashboard origin. The dashboard never needs database passwords, a JWT signing secret, or an admin API key. Access tokens remain in memory; page reload returns to the demo.

## Data and behavior

- Default demo uses the upstream Orbit-3 seed: four crew, canonical app IDs, typed logs, summaries, and environment readings. See [data attribution](data/NOTICE.md).
- App API: pressure/pulse, sleep, mood, bone measurements and nutrition; save independent pressure, sleep, mood or bone-density logs.
- Glucose, body temperature and white blood cells are absent from the app schema and explicitly labeled unsupported. The separate synthetic mission includes these values, with read-only access.
- Values retain their source and measurement day. Missing values stay empty, and charts preserve missing-day gaps.
- App summary scores come from the source; synthetic data does not invent a readiness score.
- Ground mode renders general status, excluding intimate logs and messages. Actual server-side privacy limitations are documented in [BACKEND_CONTRACT.md](BACKEND_CONTRACT.md).
- Cabin readings are available to the ground team. Cabin commands and three-day rest planning remain clearly labeled local simulations.
- Detailed personal metrics stay collapsed until needed.

Existing flat prototype records are not migrated or deleted. New demo-only typed logs use a separate localStorage key, cosmomedic-app-logs-v1. Use fictional data only in the demo. Demo seed scores are snapshots; local edits do not recompute the backend rules.

## Validation

With Node.js available:

```powershell
node --test tests/health-data.test.cjs tests/command.test.cjs
```

Tests cover mappings, missing data, timestamps, privacy projections, role selection, canonical payloads, rejected writes, HTML escaping, and the simulator. Also verified against a fresh local upstream API with an isolated SQLite database: app/synthetic reads, four typed writes, ground access, and 403 restrictions. Browser visual review remains pending because the browser host was unavailable.

See [BACKEND_CONTRACT.md](BACKEND_CONTRACT.md) for the exact mappings, endpoints, account namespaces, and integration limits.
