from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.energy import router as energy_router
from routers.vehicle_use import router as vehicle_use_router

app = FastAPI(title="Gipuzkoa Mobility Model API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(energy_router)
app.include_router(vehicle_use_router)

@app.get("/")
def root():
    return {"status": "ok", "modules": ["energy", "vehicle_use"]}