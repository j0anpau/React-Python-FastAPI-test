from fastapi import APIRouter
from models.vehicle_use_model import (
    VehicleUseInput, VehicleUseOutput,
    DEFAULT_MODES, run_vehicle_use_module
)

router = APIRouter(prefix="/api/vehicle-use", tags=["Vehicle Use Module"])

@router.post("/calculate", response_model=VehicleUseOutput)
def calculate_vehicle_use(inp: VehicleUseInput):
    return run_vehicle_use_module(inp)

@router.get("/defaults")
def get_defaults():
    """Returns default mode parameters so the frontend can render sliders."""
    return DEFAULT_MODES