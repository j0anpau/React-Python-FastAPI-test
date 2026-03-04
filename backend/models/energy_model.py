"""
Energy Module — Gipuzkoa Mobility Model
Calculates grid emission factor (g CO2/kWh) from electricity mix,
fuel production emissions, and upstream losses.
"""
from pydantic import BaseModel, Field
from typing import Optional

GRID_EMISSION_FACTORS: dict[str, float] = {
    "coal": 820.0, "oil": 650.0, "gas": 490.0, "nuclear": 12.0,
    "hydro": 24.0, "wind": 11.0, "solar_pv": 45.0, "solar_csp": 27.0,
    "geothermal": 38.0, "biomass": 230.0,
}

FUEL_EMISSION_FACTORS: dict[str, dict] = {
    "gasoline":  {"ef": 2392.0, "unit": "g CO2/L"},
    "diesel":    {"ef": 2640.0, "unit": "g CO2/L"},
    "cng":       {"ef": 2163.0, "unit": "g CO2/kg"},
    "lpg":       {"ef": 1720.0, "unit": "g CO2/L"},
    "biodiesel": {"ef":  490.0, "unit": "g CO2/L"},
    "hydrogen":  {"ef":   11.0, "unit": "g CO2/MJ"},
}

class GridMix(BaseModel):
    coal: float = Field(2.0, ge=0, le=100)
    oil: float = Field(1.0, ge=0, le=100)
    gas: float = Field(20.0, ge=0, le=100)
    nuclear: float = Field(20.0, ge=0, le=100)
    hydro: float = Field(10.0, ge=0, le=100)
    wind: float = Field(30.0, ge=0, le=100)
    solar_pv: float = Field(15.0, ge=0, le=100)
    solar_csp: float = Field(1.0, ge=0, le=100)
    geothermal: float = Field(0.0, ge=0, le=100)
    biomass: float = Field(1.0, ge=0, le=100)

class FuelConfig(BaseModel):
    gasoline_share: float = Field(40.0, ge=0, le=100)
    diesel_share: float = Field(35.0, ge=0, le=100)
    cng_share: float = Field(10.0, ge=0, le=100)
    lpg_share: float = Field(5.0, ge=0, le=100)
    biodiesel_share: float = Field(5.0, ge=0, le=100)
    hydrogen_share: float = Field(5.0, ge=0, le=100)
    gasoline_ef: Optional[float] = None
    diesel_ef: Optional[float] = None

class EnergyModuleInput(BaseModel):
    grid_mix: GridMix = GridMix()
    fuel_config: FuelConfig = FuelConfig()
    transmission_loss: float = Field(5.0, ge=0, le=30)
    upstream_factor: float = Field(8.0, ge=0, le=30)
    year: int = Field(2024, ge=2020, le=2050)

class EnergyModuleOutput(BaseModel):
    year: int
    grid_ef_base: float
    grid_ef_adjusted: float
    weighted_fuel_ef: float
    renewable_share: float
    fossil_share: float
    low_carbon_share: float
    mix_normalized: dict[str, float]
    emission_chain: dict[str, float]

def normalize_mix(mix: dict[str, float]) -> dict[str, float]:
    total = sum(mix.values())
    if total == 0:
        return mix
    return {k: (v / total) * 100.0 for k, v in mix.items()}

def compute_grid_ef(mix_normalized: dict[str, float]) -> float:
    return round(sum(
        (pct / 100.0) * GRID_EMISSION_FACTORS[src]
        for src, pct in mix_normalized.items()
        if src in GRID_EMISSION_FACTORS
    ), 2)

def compute_weighted_fuel_ef(fuel_config: FuelConfig) -> float:
    shares = {
        "gasoline": fuel_config.gasoline_share, "diesel": fuel_config.diesel_share,
        "cng": fuel_config.cng_share, "lpg": fuel_config.lpg_share,
        "biodiesel": fuel_config.biodiesel_share, "hydrogen": fuel_config.hydrogen_share,
    }
    overrides = {"gasoline": fuel_config.gasoline_ef, "diesel": fuel_config.diesel_ef}
    total_share = sum(shares.values())
    if total_share == 0:
        return 0.0
    return round(sum(
        (share / total_share) * (overrides.get(fuel) or FUEL_EMISSION_FACTORS[fuel]["ef"])
        for fuel, share in shares.items()
    ), 2)

def run_energy_module(inp: EnergyModuleInput) -> EnergyModuleOutput:
    mix_dict = inp.grid_mix.model_dump()
    mix_norm = normalize_mix(mix_dict)
    grid_ef_base = compute_grid_ef(mix_norm)
    loss_mult = 1 + inp.transmission_loss / 100
    upstream_mult = 1 + inp.upstream_factor / 100
    grid_ef_adjusted = round(grid_ef_base * loss_mult * upstream_mult, 2)
    renewables = ["hydro", "wind", "solar_pv", "solar_csp", "geothermal", "biomass"]
    return EnergyModuleOutput(
        year=inp.year,
        grid_ef_base=grid_ef_base,
        grid_ef_adjusted=grid_ef_adjusted,
        weighted_fuel_ef=compute_weighted_fuel_ef(inp.fuel_config),
        renewable_share=round(sum(mix_norm.get(s, 0) for s in renewables), 2),
        fossil_share=round(sum(mix_norm.get(s, 0) for s in ["coal","oil","gas"]), 2),
        low_carbon_share=round(mix_norm.get("nuclear", 0), 2),
        mix_normalized={k: round(v, 2) for k, v in mix_norm.items()},
        emission_chain={
            "grid_ef_base": grid_ef_base,
            "after_transmission": round(grid_ef_base * loss_mult, 2),
            "after_upstream": grid_ef_adjusted,
            "transmission_loss_pct": inp.transmission_loss,
            "upstream_pct": inp.upstream_factor,
        },
    )
