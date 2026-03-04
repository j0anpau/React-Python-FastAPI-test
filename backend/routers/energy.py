from fastapi import APIRouter
from models.energy_model import EnergyModuleInput, EnergyModuleOutput, run_energy_module
from database import get_db
from pydantic import BaseModel
import json
from datetime import datetime

router = APIRouter(prefix="/api/energy", tags=["Energy Module"])

@router.post("/calculate", response_model=EnergyModuleOutput)
def calculate_energy(inp: EnergyModuleInput):
    return run_energy_module(inp)

# ── NEW: save a grid scenario for a given year ────────────────────────────────
class SaveScenarioRequest(BaseModel):
    year: int
    mix: dict
    transmission_loss: float = 5.0
    grid_ef: float = 0.0
    label: str = ""

@router.post("/scenarios/save")
def save_scenario(req: SaveScenarioRequest):
    conn = get_db()
    conn.execute("""
        INSERT INTO grid_scenarios (year, mix, transmission_loss, grid_ef, label, saved_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(year) DO UPDATE SET
            mix = excluded.mix,
            transmission_loss = excluded.transmission_loss,
            grid_ef = excluded.grid_ef,
            label = excluded.label,
            saved_at = excluded.saved_at
    """, (req.year, json.dumps(req.mix), req.transmission_loss, req.grid_ef, req.label, datetime.now().isoformat()))
    conn.commit()
    conn.close()
    return {"ok": True, "year": req.year}

# ── NEW: load a specific year ─────────────────────────────────────────────────
@router.get("/scenarios/{year}")
def load_scenario(year: int):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM grid_scenarios WHERE year = ?", (year,)
    ).fetchone()
    conn.close()
    if not row:
        return {"found": False}
    return {
        "found": True,
        "year": row["year"],
        "mix": json.loads(row["mix"]),
        "transmission_loss": row["transmission_loss"],
        "grid_ef": row["grid_ef"] if "grid_ef" in row.keys() else 0.0,
        "label": row["label"],
        "saved_at": row["saved_at"],
    }

# ── NEW: list all saved years ─────────────────────────────────────────────────
@router.get("/scenarios")
def list_scenarios():
    conn = get_db()
    rows = conn.execute(
        "SELECT year, label, saved_at FROM grid_scenarios ORDER BY year"
    ).fetchall()
    conn.close()
    return [{"year": r["year"], "label": r["label"], "saved_at": r["saved_at"]} for r in rows]