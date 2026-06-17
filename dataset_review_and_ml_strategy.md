# Senior Principal ML Engineer Review: Astram Event Dataset & ML Strategy (GOD MODE)

> This is not a hackathon prototype review. This is a **city-scale AI ops system** blueprint. Every field in this dataset is a signal. Our job is to extract the signal, not discard it.

---

## 1. Feature-by-Feature Engineering Assessment

### 1.1. Core Predictor Variables — Keep & Clean

| Field | Signal | Engineering Action |
|---|---|---|
| `event_type` | planned vs unplanned | Encode; create `is_planned` binary |
| `event_cause` | 17 categories | Ordinal by historical avg duration |
| `latitude` / `longitude` | Spatial epicenter | Geohash-6, H3-9, road segment snap |
| `requires_road_closure` | Complete capacity loss | Binary; weight x2.5 in impact score |
| `priority` | Operator severity | Binary; validate vs actual duration |
| `start_datetime` | Event onset | Hour, DOW, month, `is_peak_hour` |
| `corridor` | Named arterial corridor | Target-encode by mean duration |
| `police_station` | Jurisdiction boundary | Spatial cluster label |

---

### 1.2. High-Value Sparse / Text Fields — Extract, Don't Drop

| Field | Signal | Engineering Action |
|---|---|---|
| `closed_datetime` | Primary label source (61.5% null) | Compute `duration_minutes` |
| `description` | Free text English + Kannada | Regex flags: rally, match, water, tree; LaBSE embeddings |
| `veh_type` | Vehicle class (40.2% null) | Derive `lane_block_factor`; impute from description |
| `junction` | Named junction (69% null) | Fill from corridor + police_station proximity |
| `zone` | 10 admin zones (58% null) | Reverse-geocode from lat/lon |
| `gba_identifier` | 5 GBA macro-zones | Hierarchical grouping for zone-level risk model |

---

### 1.3. GOD MODE: The "Droppable" Fields Are Actually Your Competitive Moat

> **Everyone else drops these. You mine them.**

#### A. `id` & `kgid` — Hotspot Recurrence Intelligence
- Group all events by geohash-6 cell. Count occurrences per cell.
- **Feature:** `hotspot_event_count` = past events within 500m radius
- **Feature:** `hotspot_recurrence_rate` = events per week at this location
- A junction with 47 breakdowns in 5 months is a structurally weak node.

#### B. `created_by_id`, `closed_by_id`, `resolved_by_id` — Responder Intelligence Graph
- **Reporter Reliability Score:** `corr(officer_priority_label, actual_duration_percentile)`
- **Responder Effectiveness Model:** For each `(closed_by_id, corridor, event_cause)`, compute median clearance time
- **Feature:** `responder_avg_clearance_time_this_corridor`
- Powers the ILP: officer-specific effectiveness weight `P_v` instead of a generic constant

#### C. `veh_no` — Fleet Health & Chronic Offender Detection
- 4,212 unique vehicle IDs, many appear multiple times
- **Feature:** `vehicle_breakdown_frequency` = how often this vehicle broke down
- **Feature:** `is_chronic_vehicle` = flag vehicles with 3+ breakdowns
- Share with BMTC/KSRTC: "Vehicle FKN00GL0026 broke down 3 times — schedule maintenance"

#### D. `cargo_material`, `reason_breakdown`, `age_of_truck` — Hazmat & Severity Tier
- `cargo_material`: detect fuel/chemical/acid → **HAZMAT_PROTOCOL** response
- `age_of_truck`: old truck requires heavier tow, 2x longer clearance
- `reason_breakdown`: "engine fire" vs "tyre burst" → completely different clearance time distributions

```python
df['is_hazmat'] = df['cargo_material'].str.contains(
    'fuel|chemical|gas|acid|flammable', case=False, na=False).astype(int)

df['truck_age_tier'] = pd.cut(df['age_of_truck'],
    bins=[0,5,10,15,100], labels=['new','moderate','aging','critical'])
```

#### E. `endlatitude`, `endlongitude` — Segment Impact, Not Point Impact
- When `endlat != 0` and `endlat != lat`, the event is a **linear obstruction**
- **Feature:** `segment_length_km` = haversine(start, end) when valid
- **Feature:** `is_segment_event` = 1 if end coords differ from start
- A 400m blocked segment eliminates capacity for the entire length, affecting multiple upstream intersections

#### F. `direction` — One-Way vs Bilateral Blockage
- 43 rows but encodes routing asymmetry
- On a divided highway, incoming-side breakdown does NOT affect outgoing traffic
- Without this, network impact is over-estimated by up to 50%
- **Feature:** `is_bilateral_block` = 1 if direction is null (assume both sides)

#### G. `resolved_at_latitude`, `resolved_at_longitude` — Clearance Displacement Map
- 74 events where resolution location differs from start location
- **Feature:** `clearance_displacement_km` = haversine(start, resolved)
- Towing a vehicle 800m away creates a secondary mini-blockage at the towing destination

#### H. `assigned_to_police_id` — Deployment Latency Intelligence
- 128 records: compute `assignment_lag` = time between start and assignment
- **Training data for the Responder Allocation model**
- "This event type historically gets assigned within 8 min. If not assigned in 12 min → escalate"

#### I. `citizen_accident_id` — Crowd-Sourced Severity Validation
- When populated, a citizen independently reported the same event
- **Feature:** `has_citizen_corroboration` = binary
- Multi-source corroboration reduces false positives in severity model

#### J. `map_file`, `comment`, `meta_data` — Production Schema Placeholders
- 100% null NOW, but the schema supports them
- `map_file` → drone footage / CCTV snapshot in production
- `meta_data` → JSON extension for sensor/IoT/weather API payloads
- **In demo:** populate `meta_data` with mock JSON to show production maturity

---

## 2. Data Cleaning Pipeline (GOD MODE)

```
[Raw Event Data — 46 columns, 8,173 rows]
       |
       |-- SPATIAL
       |   |-- Replace endlat/endlon == 0 with NaN
       |   |-- Compute segment_length_km (haversine start->end when valid)
       |   |-- Snap lat/lon to geohash-6 AND nearest road node
       |   |-- Compute clearance_displacement_km (resolved_at vs start)
       |   `-- Reverse-geocode missing zone/junction from lat/lon
       |
       |-- TEMPORAL (convert to IST UTC+5:30)
       |   |-- Parse start_datetime, closed_datetime, end_datetime
       |   |-- duration_minutes = closed_datetime - start_datetime
       |   |-- assignment_lag = assigned_time - start_datetime
       |   `-- Extract hour, dow, month, is_peak_hour, is_weekend
       |
       |-- TEXT / NLP
       |   |-- Extract veh_type from description (regex fallback)
       |   |-- Flag keywords: rally, match, festival, water, tree, bus, hazmat
       |   `-- Detect Kannada Unicode range (0C80-0CFF)
       |
       |-- ENTITY INTELLIGENCE
       |   |-- hotspot_event_count per geohash-6 (rolling 30-day)
       |   |-- reporter_reliability_score per created_by_id
       |   |-- responder_clearance_score per closed_by_id x corridor
       |   |-- vehicle_breakdown_frequency per veh_no
       |   `-- has_citizen_corroboration (citizen_accident_id not null)
       |
       |-- CALENDAR & WEATHER
       |   |-- is_public_holiday, holiday_name, is_ipl_day
       |   |-- weather_condition, temperature_c, is_rain_event
       |   `-- weather_visibility_factor (0.3-1.0)
       |
       `-- TARGET ENGINEERING
           |-- duration_minutes (primary regression target)
           |-- impact_score = f(duration, closure, priority, corridor, lane, peak, weather, hotspot)
           `-- impact_class = Low / Medium / High / Critical

[Enriched Dataset — 104 features, 8,173 rows → events_polished.csv]
```

---

## 3. ML Modeling Strategy

### 3.1. Event Impact Score (EIS) — Joining Events to Demand Grid

$$\text{EIS}(g, t) = \sum_{e \in \text{ActiveEvents}(t)} \frac{W(e)}{d(g, \text{loc}_e) + \epsilon}$$

Where $W(e)$ is the enriched event weight:

$$W(e) = \text{VehicleBlockFactor} \times \text{HazmatMultiplier} \times \text{ClosureFactor} \times \text{HotspotPrior}$$

### 3.2. Three-Layer Model Architecture

**Layer 1 — Event Severity Regressor:** Predict `duration_minutes` at creation time
- Model: LightGBM with TimeSeriesSplit(n_splits=5)
- Target: MAE < 20 min, R² > 0.60

**Layer 2 — Zone x Time Risk Forecaster:** Probability of High/Critical event per zone per 4-hour block
- Model: LightGBM classifier with Platt calibration
- Target: AUC > 0.80, Brier score < 0.15

**Layer 3 — Responder Effectiveness-Weighted ILP:**
$$\max \sum_{v} \Delta D_v \cdot P_v^{(\text{officer})} \cdot x_v \quad \text{s.t.} \sum x_v \le N_{avail}$$

Where $P_v^{(\text{officer})}$ = officer-specific, corridor-specific effectiveness from `closed_by_id` intelligence.

---

## 4. Why This Separates You From Every Other Team

| What Others Build | What YOU Build |
|---|---|
| Point-based congestion prediction | Segment-aware blockage modeling |
| Generic officer deployment | Officer-effectiveness-weighted ILP |
| Just predict demand | Predict demand + clearance time + hazmat flag |
| Drop sparse fields | Mine sparse fields for fleet health + responder intelligence |
| Single model | 3-layer: severity → risk → prescriptive action |
| Static heatmap | Live risk surface per zone x time slot |
| Drop `meta_data` | Use as production schema extension point |

The dataset's "noise" columns are your city-scale intelligence infrastructure.
