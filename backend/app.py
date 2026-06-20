from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.predict import router
from backend.risk import router as risk_router
from backend.model_info import router as model_info_router
from backend.sarvam_router import router as sarvam_router

app = FastAPI(title="Dawki API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(risk_router)
app.include_router(model_info_router)
app.include_router(sarvam_router)


@app.get("/")
def root():
    return {"status": "running"}

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "severity_model": "loaded",
        "risk_model": "loaded",
        "weather_cache": "enabled",
        "sarvam": "enabled"
    }