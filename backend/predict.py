from fastapi import APIRouter
from backend.schemas import IncidentRequest
from backend.services.weather import (
    get_weather,
    weather_to_features
)

router = APIRouter()

@router.post("/predict")
def predict(payload: IncidentRequest):

    weather = get_weather(
        payload.lat,
        payload.lon
    )

    weather_features = weather_to_features(weather)

    return {
        "weather": weather,
        "weather_features": weather_features
    }