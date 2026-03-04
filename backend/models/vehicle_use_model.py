from pydantic import BaseModel
from typing import Dict, Optional

POPULATION_GIPUZKOA = 729_810

# ── Emission factors (g CO₂ / L  or  g CO₂ / kWh for electric) ───────────────
FUEL_EF = {
    "gasoline": 2392,   # g CO₂ / L  — IPCC / EMEP
    "diesel":   2640,   # g CO₂ / L
    "hybrid":   2392,   # treated as gasoline base
    "electric":    0,   # use grid_ef instead
}

# ── Default mode parameters ───────────────────────────────────────────────────
DEFAULT_MODES = {
    "car_gasoline": {"fuel": "gasoline", "consumption": 7.5,  "load": 1.4, "group": "road"   },
    "car_diesel":   {"fuel": "diesel",   "consumption": 6.5,  "load": 1.4, "group": "road"   },
    "car_bev":      {"fuel": "electric", "consumption": 18.0, "load": 1.4, "group": "road"   },
    "car_phev":     {"fuel": "hybrid",   "consumption": 12.0, "load": 1.4, "group": "road"   },
    "motorcycle":   {"fuel": "gasoline", "consumption": 4.5,  "load": 1.1, "group": "road"   },
    "bus_diesel":   {"fuel": "diesel",   "consumption": 32.0, "load": 18,  "group": "transit"},
    "bus_bev":      {"fuel": "electric", "consumption": 120.0,"load": 18,  "group": "transit"},
    "train":        {"fuel": "electric", "consumption": 45.0, "load": 80,  "group": "transit"},
    "freight_hgv":  {"fuel": "diesel",   "consumption": 28.0, "load": 1,   "group": "freight"},
    "freight_lgv":  {"fuel": "diesel",   "consumption": 12.0, "load": 1,   "group": "freight"},
}

# ── Pydantic models ───────────────────────────────────────────────────────────
class ModeInput(BaseModel):
    vkt_base: float          # Million vehicle-km / year (base year)
    degradation_pct: float   # % over nominal consumption

class VehicleUseInput(BaseModel):
    modes: Dict[str, ModeInput]
    growth_rate_pct: float   # % annual VMT growth
    base_year: int = 2023
    target_year: int = 2030
    grid_ef: float = 120.0   # gCO₂/kWh — from Energy Module
    population: int = POPULATION_GIPUZKOA

class ModeResult(BaseModel):
    key: str
    group: str
    fuel: str
    vkt_base: float
    vkt_projected: float     # M km/year in target year
    pmt_projected: float     # M passenger-km/year
    ef_per_km: float         # g CO₂ / km (after degradation)
    emissions_kt: float      # kt CO₂ / year
    intensity_g_pmt: float   # g CO₂ / passenger-km

class VehicleUseOutput(BaseModel):
    target_year: int
    growth_factor: float
    total_emissions_kt: float
    per_capita_t: float
    results: list[ModeResult]

# ── Core calculation ──────────────────────────────────────────────────────────
def run_vehicle_use_module(inp: VehicleUseInput) -> VehicleUseOutput:
    years = inp.target_year - inp.base_year
    growth_factor = (1 + inp.growth_rate_pct / 100) ** years

    results = []
    total_kt = 0.0

    for key, params in DEFAULT_MODES.items():
        mode_inp = inp.modes.get(key)
        if mode_inp is None:
            continue

        vkt_projected = mode_inp.vkt_base * growth_factor
        degrad_factor = 1 + mode_inp.degradation_pct / 100
        pmt_projected = vkt_projected * params["load"]

        # ── Emission factor g CO₂ / km ────────────────────────────────────────
        if params["fuel"] == "electric":
            # consumption in kWh/100km
            ef_per_km = (params["consumption"] / 100) * inp.grid_ef * degrad_factor
        else:
            # consumption in L/100km, FUEL_EF in g CO₂/L
            ef_per_km = (params["consumption"] / 100) * FUEL_EF[params["fuel"]] * degrad_factor

        # ── Total emissions ───────────────────────────────────────────────────
        # vkt_projected [M km] × 1e6 × ef_per_km [g/km] / 1e9 = kt CO₂
        emissions_kt = vkt_projected * 1e6 * ef_per_km / 1e9

        intensity_g_pmt = (emissions_kt * 1e9) / (pmt_projected * 1e6) if pmt_projected > 0 else 0

        total_kt += emissions_kt
        results.append(ModeResult(
            key=key,
            group=params["group"],
            fuel=params["fuel"],
            vkt_base=mode_inp.vkt_base,
            vkt_projected=round(vkt_projected, 3),
            pmt_projected=round(pmt_projected, 3),
            ef_per_km=round(ef_per_km, 3),
            emissions_kt=round(emissions_kt, 6),
            intensity_g_pmt=round(intensity_g_pmt, 2),
        ))

    per_capita = total_kt * 1e6 / inp.population  # t CO₂ / hab

    return VehicleUseOutput(
        target_year=inp.target_year,
        growth_factor=round(growth_factor, 6),
        total_emissions_kt=round(total_kt, 4),
        per_capita_t=round(per_capita, 4),
        results=results,
    )