# Dawki: Traffic Intelligence & Mitigation Platform

**Dawki** is an event-driven congestion forecasting and real-time operations console tailored for the Bengaluru sector. 

Inspired by the town of Dawki in Meghalayafamous for its crystal-clear Umngot river where boats appear to float seamlessly in mid-airthe **Dawki Platform** aims to bring **crystal-clear transparency** to city traffic networks, enabling vehicles to flow smoothly and efficiently across congested urban sectors.

---

## What is Dawki?

Dawki is a predictive intelligence platform designed to replace reactive traffic management systems. Instead of looking at traffic cameras after a gridlock has already occurred, Dawki uses **FastAPI-powered machine learning models** and **Next.js interactive consoles** to predict how weather changes, accidents, roadworks, and VVIP movements will impact corridor travel times and congestion risks over a 24-hour horizon.

---

## Why is Dawki Useful? (The Problem & The Solution)

### 🔴 The Problem with Modern Traffic Control
* **Reactive Operations**: Traffic lights and dispatchers react *after* queues form, rather than pre-emptively redirecting vehicles.
* **Static Assumptions**: Traditional scheduling tools assume a static city. They do not account for how 1.5 inches of rain near central junctions dynamically cascades into hours of backlog.
* **Siloed Data**: Traffic maps show where congestion is, weather apps show rain, and dispatch logs show accidents, but there is no single interface linking them to predictive algorithms.

### 🟢 The Dawki Solution
* **Pre-emptive Mitigation**: Suggests officer deployments and route deviations *before* congestion peaks.
* **Live Weather Integration**: Dynamically updates classification pipelines with current precipitation, visibility, and wind telemetry.
* **Actionable Telemetry**: Merges TomTom's real-time physical road congestion layers with Dawki's custom AI model risk predictions on a single 3D interactive map.

---

## What Dawki Provides

* **Holographic 2D & Interactive Mappls 3D Maps**: Toggle between a stylized vector dashboard (with custom pulsing risk indicators) and a fully interactive 3D map of Bengaluru. 
* **TomTom Traffic Overlays**: Real-time traffic flow tiles (`relative-delay` styling) and live incident overlays (accidents, closures) mapped directly on top of Mappls base map.
* **Travel Scheduling Assistant (Best Time to Travel)**: Input any starting point and destination in Bengaluru to calculate the exact optimal hours to travel and see predicted time-savings.
* **AI Route Profiling**: Compares multiple routes, scoring each out of 100 based on live weather data, travel times, and ML-calculated risk levels.
* **Operations Analytics (Reports)**: Generates 24-hour forecasting charts and logs showing incident ratios (breakdowns, waterlogging, etc.) for sector auditing.
* **AI Incident Intake Pipeline**: An interactive system allowing dispatchers to register new anomalies (e.g. VVIP movements, accidents) and immediately recalculate sector-wide risks.

---

## System Architecture

```
 ┌────────────────────────────────────────────────────────┐
 │                   NEXT.JS FRONTEND                     │
 │  (Live City View / Travel Assistant / Reports Console) │
 └──────────────────────────┬─────────────────────────────┘
                            │ (JSON REST API)
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │                    FASTAPI BACKEND                     │
 │  (LightGBM Classifiers / Regressors / Risk Ensembles) │
 └──────────┬───────────────────────────┬─────────────────┘
            │                           │
            ▼                           ▼
 ┌────────────────────┐       ┌───────────────────┐
 │   WEATHER CACHE    │       │ AGGREGATED CSV DB │
 │ (WeatherAPI Proxy) │       │ (Historical Risk) │
 └────────────────────┘       └───────────────────┘
```

---

## Configuration & Environment Variables

Create the environment variables configuration files in their respective folders:

### Root Level `.env` (Backend Configuration)
```env
# WeatherAPI.com key (required)
WEATHER_API_KEY=6772f550484d4da090b122409261706

# Sarvam AI key (optional : for translation + TTS multilingual alerting)
SARVAM_API_KEY=your_key_here
```

### Frontend Level `frontend/.env.local` (Client-Side Configuration)
```env
# Backend API url
NEXT_PUBLIC_API_URL=http://localhost:8001

# Mappls Places API (server-side only)
MAPPLS_API_KEY=jltwvahjvpgjbqechixmrpzrefjvddntsgzl

# Mappls browser map SDK (client-side)
NEXT_PUBLIC_MAPPLS_API_KEY=jltwvahjvpgjbqechixmrpzrefjvddntsgzl

# TomTom Traffic Tile API (client-side)
NEXT_PUBLIC_TOMTOM_API_KEY=Bsc2e5cCXbqnMl5Qf6h0oZibbZzTqKGo
```

---

## Getting Started

### Prerequisites
* Python 3.12+ (with `venv` enabled)
* Node.js 18+ & `npm`

### Method 1: Using the Unified Launcher
Simply double-click or execute the batch launcher script in the root directory:
```powershell
.\start.bat
```
This launcher will automatically spin up the virtual environment, install missing packages, start the FastAPI backend on port `8001`, and start the Next.js dev server on port `3000`.

### Method 2: Manual Start

1. **Start Backend**:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate   # On Windows
   # source .venv/bin/activate # On Unix
   pip install -r requirements.txt
   uvicorn backend.app:app --host 0.0.0.0 --port 8001 --reload
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Open **`http://localhost:3000`** in your browser.

---

## Verification & Testing

Verify that all FastAPI backend endpoints and ML models are healthy by running the E2E verification test suite:
```powershell
.venv\Scripts\python.exe verify_e2e.py
```
Outputs validation check status:
```text
Dawki API : End-to-End Verification
Target: http://localhost:8001
-------------------------------------------------------
  [PASS] GET  /health
  [PASS] GET  /model-info
  [PASS] POST /predict
  [PASS] POST /risk
  [PASS] GET  /risk/forecast
  [SKIP] POST /sarvam/translate: skipped (no API key)
-------------------------------------------------------
Results: 5 passed  1 skipped  0 failed  (of 6)
[OK] All checks passed!
```
