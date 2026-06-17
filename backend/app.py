from fastapi import FastAPI
from backend.predict import router

app = FastAPI(title="Dawki API")

app.include_router(router)

@app.get("/")
def root():
    return {"status": "running"}