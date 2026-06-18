# Dawki - Remaining Work (Post Backend Completion)

## Current Status

### Completed
- FastAPI Backend
- Severity Prediction Model (Layer 2)
- ETA Prediction Model (Layer 2)
- Risk Prediction Model (Layer 3)
- Weather Integration
- Weather Caching
- Rate Limiting
- Feature Engineering Pipeline
- Model Metadata Endpoints

### Available APIs
- `POST /predict`
- `POST /risk`
- `GET /health`
- `GET /model-info`

---

# Remaining Work

## 1. Frontend ↔ Backend Integration

### Best Time To Travel
Connect to `POST /risk`
- Dynamic congestion timeline
- Recommended departure windows
- Future hotspot predictions

### Routes Page
Connect to `POST /risk`
- Real corridor risk scores
- Dynamic route recommendations
- Alternative route suggestions

### Alerts Page
Connect to `POST /predict`
- Severity prediction
- ETA prediction
- Weather impact display
- Dynamic alert generation

### Live City View
Connect to `POST /risk`
- Live corridor risk percentages
- Dynamic hotspot visualization
- Real-time risk indicators

---

## 2. Police Command Center Dashboard

Replace technical metrics with:

### Operational Metrics
- Active Incidents
- Critical Incidents
- High Risk Corridors
- Predicted Hotspots
- Officers Deployed

### AI Recommendations
- Officer deployment suggestions
- Diversion recommendations
- Incident prioritization

### Incident Queue
Powered by `/predict`
- Severity
- ETA
- Weather conditions
- Priority ranking

### Hotspot Monitoring
Powered by `/risk`
- Corridor risk levels
- Future congestion projections

---

## 3. Sarvam Integration

### Potential Features
- Alert Translation (English ↔ Kannada)
- Route Recommendation Translation
- Voice Announcements (TTS)
- Multilingual Traffic Notifications

---

## 4. Maps Strategy

### Option A
Continue with current custom map.

### Option B
Integrate Google Maps:
- Places Autocomplete
- Geocoding
- Route visualization

---

## 5. End-to-End Testing

Verify:

Frontend
→ FastAPI
→ Models
→ Weather Service

Test:
- `/predict`
- `/risk`
- Error handling
- Loading states
- Weather cache

---

## 6. Deployment

### Backend
- Render / Railway / Azure / AWS

### Frontend
- Vercel / Netlify

### Environment Variables
- WEATHER_API_KEY
- SARVAM_API_KEY
- NEXT_PUBLIC_API_URL

---

## 7. Demo Preparation

### Citizen Flow
Best Time To Travel
→ Route Recommendation
→ Traffic Alerts

### Police Flow
Incident Report
→ Severity Prediction
→ ETA Prediction
→ Hotspot Prediction
→ Resource Allocation
→ Multilingual Alert Distribution

---

# Final Goal

1. Reactive Intelligence (`/predict`)
2. Proactive Intelligence (`/risk`)
3. Police Decision Support
4. Multilingual Accessibility (Sarvam)
5. Citizen Traffic Assistance
