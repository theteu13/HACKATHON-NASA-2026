# Public access to the dashboard

The intended user flow is: receive a link, open it in a browser, and view the
dashboard. Users do not install Python, run commands or configure an API address.
The FastAPI service hosts both the page and its API on one origin. Hosted HTTPS
pages automatically load their same-origin API through `src/config.js`.

## Publish the fictional-data demonstration on Render

1. Push the reviewed project changes to the GitHub repository.
2. In the project owner's Render account, create a **Blueprint** from
   `https://github.com/theteu13/HACKATHON-NASA-2026` and select the intended branch.
3. Review the service defined in `render.yaml` and create the deployment.
4. Wait for a successful deployment, open the public URL shown by Render, and
   check that `/health` responds and the dashboard loads the API data.
5. Share that URL with users, or configure a custom domain in the hosting account.

The manifest is prepared locally; adding it does not publish the project or
create a public URL. The example deployment serves fictional bundled datasets.
The optional external system session integration remains in `src/config.js`.
Real mission data must retain authorization in the main system/API.

The manifest selects the free plan for a demonstration. Render's free web
services sleep after inactivity; the first visit after a sleep can take longer.
For a continuously available service, review the hosting plan with the owner.

## Publish the frontend on Vercel

The dashboard can also be hosted as a static Vercel site while the FastAPI
backend remains on Render:

1. Deploy the backend using the Render Blueprint steps above and copy its public
   origin, such as `https://cosmomedic-dashboard.onrender.com` (without `/api`).
2. Import this GitHub repository into Vercel. Keep the repository root as the
   project root; `vercel.json` builds and publishes only `index.html`, `src/`,
   and `data/`.
3. In the Vercel project settings, add the `COSMOMEDIC_API_ORIGIN` environment
   variable with the Render origin, then redeploy. Without this variable, the
   Vercel site shows the bundled demo without trying to contact an API.
4. In the Render service's environment settings, set
   `COSMOMEDIC_ALLOWED_ORIGINS` to the exact Vercel site origin, for example
   `https://cosmomedic.vercel.app` (no trailing slash), and redeploy the backend.
5. Open the Vercel URL and confirm that the dashboard loads data. The API's
   `/health` endpoint should respond at the Render URL.

The Render origin and the Vercel origin must use HTTPS in production. Update
`COSMOMEDIC_ALLOWED_ORIGINS` if the Vercel production domain changes. Preview
deployments use different origins and are not allowed unless explicitly added.

Official references: [FastAPI deployment](https://render.com/docs/deploy-fastapi),
[Blueprint configuration](https://render.com/docs/blueprint-spec),
[Python version](https://render.com/docs/python-version), and
[free service limitations](https://render.com/docs/free).
