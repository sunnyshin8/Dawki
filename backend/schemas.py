from pydantic import BaseModel

class IncidentRequest(BaseModel):
    lat: float
    lon: float
    zone: str
    corridor: str
    event_type: str
    priority: int
class RiskRequest(BaseModel):
    zone: str
    corridor: str
    hour: int
class PredictResponse(BaseModel):
    severity: str
    eta_minutes: float
    weather: dict

class RiskResponse(BaseModel):
    risk_score: float
    risk_level: str
    event_count: int
    high_impact_count: int
    match_type: str
