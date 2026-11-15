# Integration status

The dashboard connects through the Connect API dialog to the included Python/FastAPI backend or to the separate upstream CosmoMedic backend. The local backend serves both bundled fictional datasets, filters private fields on the server, and serves the frontend on the same origin. Setup and local limitations are in [backend/README.md](backend/README.md). The upstream source mapping and integration limits are maintained in [BACKEND_CONTRACT.md](BACKEND_CONTRACT.md).

## Files

- src/styles/theme.css: shared visual tokens.
- data/demo-seed.js: attributed upstream demo seed subset.
- src/services/health-data.js: typed projections, API validation, authentication, and HTTP client.
- src/shared/icons.js: icons and portrait illustration.
- src/core/state.js: selected crew, monitoring state and demo/API snapshots.
- src/shared/format.js and src/shared/toast.js: presentation helpers and notifications.
- src/features/overview/overview.js: read-only metrics, charts and mission metadata.
- src/features/connection/connection.js: API sign-in, refresh and disconnect.
- src/main.js: control events and initial dashboard render.
- src/features/command/command.js: ground-only command center, source summary scores, scenario planning, and cabin readings/simulation.

No database credentials belong in the browser. Live authorization is provided by the API. Ground-response privacy needs backend changes as described in the contract. Controls without backend write endpoints remain local simulations.

The dashboard is exclusively for medical/admin care-team accounts. Health-data write methods, astronaut mode, and check-in forms have been removed.
