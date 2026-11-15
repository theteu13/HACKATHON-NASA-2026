"""Read-only projections of the attributed, bundled fictional datasets.

The seed files contain JSON in a single JS assignment. Decode that JSON directly;
never evaluate JavaScript. Keeping one source avoids drifting backend fixtures.
"""
from copy import deepcopy
import json
from statistics import mean, stdev

from fastapi import HTTPException

from .config import ROOT

PHYSICAL = frozenset({
    "systolic_bp", "diastolic_bp", "heart_rate", "blood_glucose",
    "body_temperature", "sleep_hours", "bone_density", "calorie_intake",
    "protein_intake", "white_blood_cells",
})


def load_seed(filename: str, variable: str) -> dict:
    text = (ROOT / "data" / filename).read_text(encoding="utf-8")
    _, separator, payload = text.partition(f"window.{variable} = ")
    if not separator:
        raise ValueError(f"Unrecognized seed format: {filename}")
    result, end = json.JSONDecoder().raw_decode(payload)
    if payload[end:].strip() != ";":
        raise ValueError(f"Unexpected content after seed: {filename}")
    return result


class Repository:
    def __init__(self):
        self.app = load_seed("demo-seed.js", "COSMOMEDIC_DEMO")
        self.synthetic = load_seed("impact-example.js", "COSMOMEDIC_IMPACT_EXAMPLE")

    def crew(self):
        day = self.app["mission"]["today"]
        crew = []
        for person in self.app["astronauts"]:
            summary = next((row for row in self.app["dailySummaries"]
                            if row["astronautId"] == person["id"] and row["missionDay"] == day), {})
            crew.append({
                "astronaut": {**{key: person[key] for key in ("id", "name", "crewId")},
                              "baseline": {key: value for key, value in person.get("baseline", {}).items()
                                           if key in {"restingHr", "restingBp", "usualSleepH", "boneDensity"}}},
                "overallScore": summary.get("overallScore"),
                "logsToday": sum(log["astronautId"] == person["id"] and log["missionDay"] == day
                                 and log["type"] in {"measurement", "sleep", "meal"}
                                 for log in self.app["logs"]),
                "areas": deepcopy(summary.get("areas", {})),
                # The bundle has no alert records; do not invent alert text or counts.
                "activeAlerts": 0,
            })
        return {"mission": deepcopy(self.app["mission"]), "missionDay": day, "crew": crew,
                "dataNotice": "Bundled fictional mission data"}

    def environment(self):
        latest = {}
        for row in self.app["environmentReadings"]:
            key = row["environmentId"]
            if key not in latest or row["timestamp"] > latest[key]["timestamp"]:
                latest[key] = row
        keys = {"id", "environmentId", "timestamp", "temperatureC", "pressureKpa",
                "lightLux", "noiseDb", "radiationUsvH", "crewPresent"}
        return {"latest": [{key: value for key, value in row.items() if key in keys}
                           for row in latest.values()]}

    def logs(self, astronaut_id: str, kind: str):
        if not any(person["id"] == astronaut_id for person in self.app["astronauts"]):
            raise HTTPException(404, "Crew member not found.")
        rows = []
        for log in self.app["logs"]:
            if (log["astronautId"] != astronaut_id or log["type"] != kind
                    or log["missionDay"] > self.app["mission"]["today"]):
                continue
            data = log["data"]
            if kind == "measurement":
                metric = data.get("metric")
                allowed = {"blood_pressure": {"systolic", "diastolic", "pulse"},
                           "bone_density": {"value", "unit"}}.get(metric)
                if allowed is None:
                    continue
                projected = {"metric": metric, "values": {
                    key: value for key, value in data.get("values", {}).items() if key in allowed}}
            elif kind == "sleep":
                projected = {"durationMin": data.get("durationMin")}
            else:
                projected = {"kcal": data.get("kcal")}
            rows.append({**{key: log[key] for key in ("id", "astronautId", "type", "timestamp", "missionDay")},
                         "provenance": "SIMULATED_TELEMETRY", "data": projected})
        return rows

    def mission(self, mission_id: str | None = None):
        mission = self.synthetic["mission"]
        if mission_id is not None and mission_id != mission["id"]:
            raise HTTPException(404, "Synthetic mission not found.")
        return {"id": mission["id"], "name": mission["name"],
                "lastDay": mission["lengthDays"], "launchDate": mission["startDate"]}

    def person(self, mission_id: str, astronaut_id: str):
        self.mission(mission_id)
        person = next((row for row in self.synthetic["people"] if row["id"] == astronaut_id), None)
        if person is None:
            raise HTTPException(404, "Synthetic crew member not found.")
        return person

    def dashboard(self, mission_id: str):
        return {"mission": self.mission(mission_id), "missionDay": self.synthetic["mission"]["today"],
                "dataNotice": "Bundled fictional synthetic data",
                "crew": [{"astronaut": {"id": p["id"], "displayName": p["name"], "role": "astronaut"},
                          "status": "no_data", "activeEpisodes": 0} for p in self.synthetic["people"]]}

    def daily(self, mission_id: str, astronaut_id: str, start: int, end: int):
        today = self.synthetic["mission"]["today"]
        return [{"missionDay": row["missionDay"], "date": row["date"],
                 "values": {key: value for key, value in row["values"].items() if key in PHYSICAL}}
                for row in self.person(mission_id, astronaut_id)["records"]
                if start <= row["missionDay"] <= min(end, today) and row["missionDay"] != 0]

    def baseline(self, mission_id: str, astronaut_id: str):
        rows = self.daily(mission_id, astronaut_id, -30, -1)
        metrics = []
        for code in sorted(PHYSICAL):
            values = [row["values"][code] for row in rows
                      if isinstance(row["values"].get(code), (int, float))]
            metrics.append({"metric": code, "count": len(values),
                            "mean": mean(values) if values else None,
                            "std": stdev(values) if len(values) >= 2 else None})
        return {"fromDay": -30, "toDay": -1, "metrics": metrics}
