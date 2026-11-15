from hashlib import sha256

from fastapi import HTTPException
from fastapi.testclient import TestClient
import pytest

from backend.auth import Login, Sessions
from backend.config import Settings
from backend.main import create_app


@pytest.fixture(scope="module")
def client():
    with TestClient(create_app(Settings(password="local-test-password"))) as client:
        yield client


@pytest.fixture(scope="module")
def auth(client):
    response = client.post("/api/v1/auth/login", json={
        "username": "surgeon", "password": "local-test-password",
    })
    assert response.status_code == 200
    assert response.json()["expiresIn"] == 3600
    return {"Authorization": "Bearer " + response.json()["accessToken"]}


@pytest.mark.parametrize("path", [
    "/auth/me", "/app/ground/crew", "/app/ground/environment",
    "/app/ground/astronauts/ast-01/logs?type=measurement", "/missions",
    "/missions/SYN-LDM-01/dashboard",
    "/missions/SYN-LDM-01/astronauts/A001/daily",
    "/missions/SYN-LDM-01/astronauts/A001/baseline",
])
def test_all_data_endpoints_require_authentication(client, path):
    assert client.get("/api/v1" + path).status_code == 401
    assert client.get("/api/v1" + path, headers={"Authorization": "Bearer invalid"}).status_code == 401


def test_login_rejects_bad_credentials_and_invalid_inputs(client):
    for username, password in [("surgeon", "wrong"), ("astronaut", "local-test-password")]:
        response = client.post("/api/v1/auth/login", json={"username": username, "password": password})
        assert response.status_code == 401
        assert "accessToken" not in response.json()
    assert client.post("/api/v1/auth/login", json={"username": "surgeon", "password": ""}).status_code == 422


def test_account_and_expired_session(client, auth):
    assert client.get("/api/v1/auth/me", headers=auth).json()["role"] == "medical"
    sessions = Sessions(Settings(password="test"))
    token = sessions.login(Login(username="surgeon", password="test"))["accessToken"]
    key = sha256(token.encode()).hexdigest()
    sessions.tokens[key] = 0
    with pytest.raises(HTTPException) as error:
        sessions.user(token)
    assert error.value.status_code == 401
    assert key not in sessions.tokens


def test_unconfigured_account_cannot_login():
    with TestClient(create_app(Settings())) as client:
        assert client.post("/api/v1/auth/login", json={"username": "surgeon", "password": "anything"}).status_code == 503


def test_roles_are_restricted():
    with pytest.raises(ValueError):
        Settings(role="astronaut")


def test_app_contract_and_server_side_privacy(client, auth):
    team = client.get("/api/v1/app/ground/crew", headers=auth).json()
    assert team["missionDay"] == 12
    assert len(team["crew"]) == 4
    assert "fictional" in team["dataNotice"]
    assert "mood" not in str(team)
    assert "latestAlert" not in str(team)
    for row in team["crew"]:
        person = row["astronaut"]["id"]
        for kind in ("measurement", "sleep", "meal"):
            logs = client.get(f"/api/v1/app/ground/astronauts/{person}/logs?type={kind}", headers=auth).json()
            assert logs
            for log in logs:
                assert log["astronautId"] == person
                assert log["type"] == kind
                assert "note" not in log
                assert log["missionDay"] <= 12
                assert "quality" not in log["data"]
                assert "name" not in log["data"]
        assert client.get(f"/api/v1/app/ground/astronauts/{person}/logs?type=mood", headers=auth).status_code == 422
    environment = client.get("/api/v1/app/ground/environment", headers=auth).json()["latest"]
    assert environment
    assert len({row["environmentId"] for row in environment}) == len(environment)


def test_synthetic_contract_ranges_and_baseline(client, auth):
    missions = client.get("/api/v1/missions", headers=auth).json()
    assert missions[0]["id"] == "SYN-LDM-01"
    dashboard = client.get("/api/v1/missions/SYN-LDM-01/dashboard", headers=auth).json()
    assert dashboard["missionDay"] == 180
    assert len(dashboard["crew"]) == 4
    assert "no_data" == dashboard["crew"][0]["status"]
    base = "/api/v1/missions/SYN-LDM-01/astronauts/A001"
    rows = client.get(base + "/daily?fromDay=-30&toDay=180", headers=auth).json()
    assert len(rows) == 210
    assert rows[0]["missionDay"] == -30
    assert rows[-1]["missionDay"] == 180
    assert all(row["missionDay"] != 0 and "mood" not in row["values"] for row in rows)
    subset = client.get(base + "/daily?fromDay=1&toDay=7", headers=auth).json()
    assert len(subset) == 7
    assert client.get(base + "/daily?fromDay=7&toDay=1", headers=auth).status_code == 422
    assert client.get(base + "/daily?fromDay=-31", headers=auth).status_code == 422
    baseline = client.get(base + "/baseline", headers=auth).json()
    heart = next(row for row in baseline["metrics"] if row["metric"] == "heart_rate")
    values = [row["values"]["heart_rate"] for row in rows if row["missionDay"] < 0]
    assert heart["mean"] == pytest.approx(sum(values) / len(values))
    assert heart["count"] == 30


@pytest.mark.parametrize("path", [
    "/app/ground/astronauts/missing/logs?type=meal",
    "/missions/missing/dashboard",
    "/missions/SYN-LDM-01/astronauts/missing/daily",
])
def test_unknown_resources_return_404(client, auth, path):
    assert client.get("/api/v1" + path, headers=auth).status_code == 404


def test_read_only_cache_and_cors(client, auth):
    assert client.post("/api/v1/app/ground/crew", headers=auth, json={}).status_code == 405
    response = client.get("/api/v1/app/ground/crew", headers=auth)
    assert response.headers["Cache-Control"] == "no-store"
    allowed = client.options("/api/v1/auth/login", headers={
        "Origin": "http://127.0.0.1:4173", "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    })
    assert allowed.headers["access-control-allow-origin"] == "http://127.0.0.1:4173"
    rejected = client.options("/api/v1/auth/login", headers={
        "Origin": "https://untrusted.example", "Access-Control-Request-Method": "POST",
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
