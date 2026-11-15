# Integration status

The dashboard now connects to the actual CosmoMedic FastAPI backend through the Connect API dialog. The complete source mapping, tested endpoints, deployment requirements, and privacy limitations are maintained in [BACKEND_CONTRACT.md](BACKEND_CONTRACT.md).

## Files

- theme.css: shared visual tokens.
- data/demo-seed.js: attributed upstream demo seed subset.
- health-data.js: typed projections, API validation, authentication, and HTTP client.
- app.js: icons and portrait illustration.
- app-core.js: source selection, typed check-ins, mission metadata, metrics and charts.
- command.js: role-aware command center, source summary scores, scenario planning, and cabin readings/simulation.

No database credentials belong in the browser. Live authorization is provided by the API. Ground-response privacy needs backend changes as described in the contract. Controls without backend write endpoints remain local simulations.
