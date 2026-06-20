# Dawki: Traffic Intelligence & Mitigation Platform

Dawki is an event-driven congestion forecasting and real-time operations console tailored for the Bengaluru sector. By combining backend machine learning risk models with public telemetry (WeatherAPI, Mappls Web Map SDK, and TomTom Live Traffic Tiles), Dawki provides traffic controllers and logistics managers with live actionable insight, predictive routing analysis, and operational reports.

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

* **Frontend**: Next.js App Router (React, Tailwind CSS v4, Lucide Icons, Mappls JS SDK).
* **Backend**: FastAPI (Python 3.12/3.14, Uvicorn, Pandas, Cachetools).
* **Telemetry**: WeatherAPI (live weather features), Mappls Places Proxy (autosuggest search), and TomTom API (live traffic flow and incident layers).

---

## Features

### 1. Live City View (Holographic 2D & Mappls 3D)
* **2D View**: Styled SVG representation of Bengaluru corridors (Bellary Road, Hosur Road, Tumkur Road, Outer Ring Road) showing real-time risk severity.
* **3D View**: Full perspective-tilted interactive map powered by Mappls JS SDK.
* **TomTom Overlays**: Real-time traffic flow tiles (`relative-delay` styling) and live incident overlays (accidents, roadworks) with toggles.
* **Click-to-Fly**: Click any corridor pin to automatically fly the camera to that GPS coordinate.

### 2. Travel Scheduling Assistant (Best Time to Travel)
* **ML Predictions**: Evaluates risk and travel times across different hours of the day using real-time weather parameters.
* **Safe Window Planner**: Computes the optimal time windows to save time and reduce delay.
* **Text-to-Speech**: Synthesizes and reads out the traffic projection summary.
* **Address Search**: Autocomplete search bar powered by Mappls Places API.

### 3. Routes & Congestion Profiling
* **Live Alternative Scoring**: Displays multiple route alternatives with dynamic congestion risk bars, weather advisory chips, and total corridor score gauges.
* **Interactive SVG Map**: Track active routes with animation.
* **Dynamic Origin & Destination**: Search any place in Bengaluru to update the route path and telemetry.

### 4. Operations Analytics (Reports)
* **Forecast index profile**: Draws an interactive line graph of the 24-hour hourly risk forecast loaded directly from the backend.
* **Incident breakdown proportions**: Visualizes incident categories (breakdowns, weather-logging, works) based on live anomaly logs.
* **Recap exporting**: Export local logs to standard operational reports.

### 5. Alerts Catalog & Incident Intake Pipeline
* **Dispatcher triggers**: File new alerts manually through the **AI Incident Intake Pipeline** to update predicted anomalies in real time.
* **Multilingual translations**: Broadcast emergency bulletins with instant translation (via optional Sarvam AI integration).

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
