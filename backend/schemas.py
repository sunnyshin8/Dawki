from pydantic import BaseModel

class IncidentRequest(BaseModel):
    lat: float
    lon: float
    zone: str
    corridor: str
    event_type: str
    priority: int