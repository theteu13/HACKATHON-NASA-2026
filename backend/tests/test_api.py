from fastapi.testclient import TestClient
import pytest

from backend.config import Settings
from backend.main import create_app


@pytest.fixture(scope="module")
def client():
    with TestClient(create_app(Settings())) as client:
        yield client


def test_no_local_authentication_endpoints(client):
    assert client.post("/api/v1/auth/login", json={}).status_code == 404
    assert client.get("/api/v1/auth/me").status_code == 404
    schema = client.get("/openapi.json").json()
    assert all("/auth/" not in path for path in schema["paths"])
    assert "securitySchemes" not in schema.get("components", {})


def test_app_contract_and_server_side_privacy(client):
    team = client.get("/api/v1/app/ground/crew").json()
    assert team["missionDay"] == 12
    assert len(team["crew"]) == 4
    assert "fictional" in team["dataNotice"]
    assert "mood" not in str(team)
    assert "latestAlert" not in str(team)
    for row in team["crew"]:
        person = row["astronaut"]["id"]
        for kind in ("measurement", "sleep", "meal"):
            logs = client.get(f"/api/v1/app/ground/astronauts/{person}/logs?type={kind}").json()
            assert logs
            for log in logs:
                assert log["astronautId"] == person
                assert log["type"] == kind
                assert "note" not in log
                assert log["missionDay"] <= 12
                assert "quality" not in log["data"]
                assert "name" not in log["data"]
        assert client.get(f"/api/v1/app/ground/astronauts/{person}/logs?type=mood").status_code == 422
    environment = client.get("/api/v1/app/ground/environment").json()["latest"]
    assert environment
    assert len({row["environmentId"] for row in environment}) == len(environment)


def test_synthetic_contract_ranges_and_baseline(client):
    missions = client.get("/api/v1/missions").json()
    assert missions[0]["id"] == "SYN-LDM-01"
    dashboard = client.get("/api/v1/missions/SYN-LDM-01/dashboard").json()
    assert dashboard["missionDay"] == 180
    assert len(dashboard["crew"]) == 4
    assert "no_data" == dashboard["crew"][0]["status"]
    base = "/api/v1/missions/SYN-LDM-01/astronauts/A001"
    rows = client.get(base + "/daily?fromDay=-30&toDay=180").json()
    assert len(rows) == 210
    assert rows[0]["missionDay"] == -30
    assert rows[-1]["missionDay"] == 180
    assert all(row["missionDay"] != 0 and "mood" not in row["values"] for row in rows)
    subset = client.get(base + "/daily?fromDay=1&toDay=7").json()
    assert len(subset) == 7
    assert client.get(base + "/daily?fromDay=7&toDay=1").status_code == 422
    assert client.get(base + "/daily?fromDay=-31").status_code == 422
    baseline = client.get(base + "/baseline").json()
    heart = next(row for row in baseline["metrics"] if row["metric"] == "heart_rate")
    values = [row["values"]["heart_rate"] for row in rows if row["missionDay"] < 0]
    assert heart["mean"] == pytest.approx(sum(values) / len(values))
    assert heart["count"] == 30


@pytest.mark.parametrize("path", [
    "/app/ground/astronauts/missing/logs?type=meal",
    "/missions/missing/dashboard",
    "/missions/SYN-LDM-01/astronauts/missing/daily",
])
def test_unknown_resources_return_404(client, path):
    assert client.get("/api/v1" + path).status_code == 404


def test_read_only_cache_and_cors(client):
    assert client.post("/api/v1/app/ground/crew", json={}).status_code == 405
    response = client.get("/api/v1/app/ground/crew")
    assert response.headers["Cache-Control"] == "no-store"
    allowed = client.options("/api/v1/app/ground/crew", headers={
        "Origin": "http://127.0.0.1:4173", "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "content-type",
    })
    assert allowed.headers["access-control-allow-origin"] == "http://127.0.0.1:4173"
    rejected = client.options("/api/v1/app/ground/crew", headers={
        "Origin": "https://untrusted.example", "Access-Control-Request-Method": "GET",
    })
    assert "access-control-allow-origin" not in rejected.headers


def test_static_files_are_limited_to_public_assets(client):
    assert client.get("/health").json()["dataset"] == "bundled-fictional"
    assert client.get("/").status_code == 200
    assert client.get("/src/main.js").status_code == 200
    assert client.get("/data/demo-seed.js").status_code == 200
    for path in ("/.env", "/.git/config", "/backend/config.py", "/src/../backend/auth.py"):
        assert client.get(path).status_code == 404
    schema = client.get("/openapi.json").json()
    assert "/api/v1/app/ground/crew" in schema["paths"]
