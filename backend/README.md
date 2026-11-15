# CosmoMedic Python backend

Read-only FastAPI adapter for the existing dashboard. It serves the frontend at
`/`, data at `/api/v1` and interactive API documentation at `/docs`.

## Run on Windows

From the project root, with Python 3.10 or later:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
.\start-backend.ps1
```

Open http://127.0.0.1:8000, select **Connect API**, choose **CosmoMedic app** or
**Synthetic mission**, and click **Load data**. There is no local login, password
or user registration. **Refresh** reloads the source; **Disconnect** returns to
the browser demo without changing the main system's session.

On other systems, use the virtual environment's Python from the project root:

```text
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Node is not required to run the dashboard. Existing static preview commands
continue to work.

## Organization

- `main.py`: API application, CORS, cache policy and public assets.
- `config.py`: allowed frontend origins from the environment.
- `routes.py`: read endpoints matching the JavaScript client.
- `repository.py`: dataset access and physical-field projections.
- `tests/`: HTTP, privacy, contract and asset isolation tests.
- `../src/config.js`: external API origin, dataset and host session integration.

## Integracao com o sistema principal

The upstream mappings remain in `src/services/health-data.js`, following
[BACKEND_CONTRACT.md](../BACKEND_CONTRACT.md). Set `apiOrigin` and `dataset` in
`src/config.js`. Set `autoConnect: true` to load that source when opening the
page, without asking the user to select a source manually.

The host application can provide `window.COSMOMEDIC_CONFIG` before `src/config.js`
is loaded, overriding the defaults. For example, a host that already owns a
session can supply:

```javascript
window.COSMOMEDIC_CONFIG = {
  apiOrigin: 'https://api.example.com',
  dataset: 'app',
  autoConnect: true,
  getAccessToken: async ({ origin }) => {
    if (origin !== 'https://api.example.com') return null;
    return existingSession.getAccessToken();
  }
};
```

`existingSession` is an integration example: replace it with the session service
of the main application. The callback is invoked for each GET request; the
dashboard never creates, refreshes or stores a token. Scope the callback to the
trusted API origin. Never put passwords or fixed access tokens in frontend code.

For an API that uses the main system's cookies, configure `credentials` as
`same-origin` or `include` instead. Cross-origin cookie access also requires the
external API's CORS and cookie settings to allow it. The default is `omit`.

Login, logout, user roles and access checks belong to the main system and external
API. Their protected endpoints stay protected. A 401/403 is reported without a
local login form and without silently replacing loaded data.

If the repository's endpoint paths or response schemas change, update the client
adapter and its tests. The Python `repository.py` is the boundary for replacing
bundled data with a database or another data source.

## Data and limits

This local server exposes **only the bundled fictional datasets**, without login
or a database. It does not proxy or remove authorization from the upstream API.
The default launcher binds to `127.0.0.1`.

The repository decodes the JSON assignment in `data/demo-seed.js` and
`data/impact-example.js` without evaluating JavaScript. Attribution and license
remain in [data/NOTICE.md](../data/NOTICE.md).

Only whitelisted physical fields are returned. Notes, meal names, subjective
sleep quality, mood, private messages and alert evidence are excluded. Synthetic
history preserves gaps and excludes day zero; baseline reference statistics use
days -30 through -1 and sample standard deviation. The bundle has no alert
classifications, so synthetic statuses remain unavailable.

There are no health-data write methods, user accounts or session storage in this
backend. To connect real mission data, use the external system's authorization
and data service through the integration boundary above.

The only backend environment option is `COSMOMEDIC_ALLOWED_ORIGINS`, a
comma-separated list defaulting to
`http://127.0.0.1:4173,http://localhost:4173`. The frontend served on the same origin
does not need CORS.

## Tests

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest backend/tests -q
```

Run the frontend tests with `node --test tests/*.test.cjs`.
