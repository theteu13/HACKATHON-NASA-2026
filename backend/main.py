"""Run with: python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000."""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .auth import Sessions
from .config import ROOT, Settings
from .repository import Repository
from .routes import router


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    app = FastAPI(title="CosmoMedic Dashboard API", version="0.1.0",
                  description="Read-only prototype API using bundled fictional mission datasets.")
    app.state.sessions = Sessions(settings)
    app.state.repository = Repository()
    app.add_middleware(CORSMiddleware, allow_origins=list(settings.allowed_origins),
                       allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])

    @app.middleware("http")
    async def no_cache_api(request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    app.include_router(router)

    @app.get("/health", tags=["health"])
    def health():
        return {"status": "ok", "dataset": "bundled-fictional", "readOnly": True}

    @app.get("/", include_in_schema=False)
    @app.get("/index.html", include_in_schema=False)
    def dashboard():
        return FileResponse(ROOT / "index.html")

    # Expose only public frontend assets, never the repository root or backend.
    app.mount("/src", StaticFiles(directory=ROOT / "src"), name="src")
    app.mount("/data", StaticFiles(directory=ROOT / "data"), name="data")
    return app


app = create_app()
