from fastapi import FastAPI
from backend.predict import router
from backend.risk import router as risk_router
from backend.model_info import router as model_info_router

app = FastAPI(title="Dawki API")

app.include_router(router)
app.include_router(risk_router)
app.include_router(model_info_router)

@app.get("/")
def root():
    return {"status": "running"}

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "severity_model": "loaded",
        "risk_model": "loaded",
        "weather_cache": "enabled"
    }