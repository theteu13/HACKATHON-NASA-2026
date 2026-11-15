# Integration status

The dashboard now connects to the actual CosmoMedic FastAPI backend through the Connect API dialog. The complete source mapping, tested endpoints, deployment requirements, and privacy limitations are maintained in [BACKEND_CONTRACT.md](BACKEND_CONTRACT.md).

## Files

- src/styles/theme.css: shared visual tokens.
- data/demo-seed.js: attributed upstream demo seed subset.
- src/services/health-data.js: typed projections, API validation, authentication, and HTTP client.
- src/shared/icons.js: icons and portrait illustration.
- app-core.js: source selection, read-only monitoring, mission metadata, metrics and charts.
- src/features/command/command.js: ground-only command center, source summary scores, scenario planning, and cabin readings/simulation.

No database credentials belong in the browser. Live authorization is provided by the API. Ground-response privacy needs backend changes as described in the contract. Controls without backend write endpoints remain local simulations.

The dashboard is exclusively for medical/admin care-team accounts. Health-data write methods, astronaut mode, and check-in forms have been removed.
