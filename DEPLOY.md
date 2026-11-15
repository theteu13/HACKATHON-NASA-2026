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

Official references: [FastAPI deployment](https://render.com/docs/deploy-fastapi),
[Blueprint configuration](https://render.com/docs/blueprint-spec),
[Python version](https://render.com/docs/python-version), and
[free service limitations](https://render.com/docs/free).
