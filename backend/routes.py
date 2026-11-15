"""Endpoints matching src/services/health-data.js."""
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from .auth import Login, care_team

router = APIRouter(prefix="/api/v1")
protected = APIRouter(dependencies=[Depends(care_team)])


@router.post("/auth/login")
def login(credentials: Login, request: Request):
    return request.app.state.sessions.login(credentials)


@protected.get("/auth/me")
def me(user: Annotated[dict, Depends(care_team)]):
    return user


@protected.get("/app/ground/crew")
def crew(request: Request):
    return request.app.state.repository.crew()


@protected.get("/app/ground/environment")
def environment(request: Request):
    return request.app.state.repository.environment()


@protected.get("/app/ground/astronauts/{astronaut_id}/logs")
def logs(astronaut_id: str, type: Literal["measurement", "sleep", "meal"], request: Request):
    return request.app.state.repository.logs(astronaut_id, type)


@protected.get("/missions")
def missions(request: Request):
    return [request.app.state.repository.mission()]


@protected.get("/missions/{mission_id}/dashboard")
def dashboard(mission_id: str, request: Request):
    return request.app.state.repository.dashboard(mission_id)


@protected.get("/missions/{mission_id}/astronauts/{astronaut_id}/daily")
def daily(mission_id: str, astronaut_id: str, request: Request,
          from_day: Annotated[int, Query(alias="fromDay", ge=-30, le=180)] = -30,
          to_day: Annotated[int, Query(alias="toDay", ge=-30, le=180)] = 180):
    if from_day > to_day:
        raise HTTPException(422, "fromDay must not exceed toDay.")
    return request.app.state.repository.daily(mission_id, astronaut_id, from_day, to_day)


@protected.get("/missions/{mission_id}/astronauts/{astronaut_id}/baseline")
def baseline(mission_id: str, astronaut_id: str, request: Request):
    return request.app.state.repository.baseline(mission_id, astronaut_id)


router.include_router(protected)
