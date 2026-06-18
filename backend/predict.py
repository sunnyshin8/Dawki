from fastapi import APIRouter

from fastapi import Request
from backend.schemas import IncidentRequest
from backend.feature_builder import build_features
from backend.models import (
    severity_clf,
    severity_reg,
    risk_model
)

import numpy as np
from backend.services import weather
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

    X = build_features(
        payload,
        weather_features
    )

    severity_probs = severity_clf.predict(X)

    severity_class = int(
        np.argmax(severity_probs, axis=1)[0]
    )

    severity_names = [
        "Critical",
        "High",
        "Low",
        "Medium"
    ]

    severity = severity_names[severity_class]

    eta_minutes = float(
        severity_reg.predict(X)[0]
    )

    #risk_score = float(
        #risk_model.predict(X)[0]
   # )

    return {
        "severity": severity,
        "eta_minutes": round(eta_minutes, 1),
        #"risk_score": round(risk_score, 3),
        "weather": weather
    }
from backend.schemas import (
    IncidentRequest,
    PredictResponse
)

@router.post(
    "/predict",
    response_model=PredictResponse
)
def predict(payload: IncidentRequest):
    ...
