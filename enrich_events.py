"""
enrich_events.py : GOD MODE Feature Engineering Pipeline
=========================================================
Clones the Astram event dataset and enriches it with:
  1. Temporal intelligence (rush hour, peak slots, time of day)
  2. Festival & Public Holiday calendar (Bengaluru 2023-2024)
  3. Synthetic weather assignment (Bengaluru climate model)
  4. Spatial intelligence (geohash, hotspot recurrence, landmark proximity)
  5. Entity intelligence (reporter score, responder score, fleet frequency)
  6. Text feature extraction (description keyword flags, Kannada/English)
  7. Smart null imputation (corridor from zone, veh_type from description, etc.)
  8. Target engineering (duration_minutes, impact_score, impact_class)

Outputs:
  - Phase2/events_polished.csv  (enriched dataset)
  - Phase2/events_polished_summary.txt (feature summary)
"""

import pandas as pd
import numpy as np
import re
import warnings
from math import radians, sin, cos, sqrt, atan2

warnings.filterwarnings('ignore')

# ──────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ──────────────────────────────────────────────────────────────────────────────

EVENT_PATH   = r"c:\Users\asus\Downloads\gdlk2\Phase2\Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv"
OUT_PATH     = r"c:\Users\asus\Downloads\gdlk2\Phase2\events_polished.csv"
SUMMARY_PATH = r"c:\Users\asus\Downloads\gdlk2\Phase2\events_polished_summary.txt"

BLURU_LAT_MIN, BLURU_LAT_MAX = 12.7, 13.3
BLURU_LON_MIN, BLURU_LON_MAX = 77.3, 77.9

# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    try:
        lat1, lon1, lat2, lon2 = map(float, [lat1, lon1, lat2, lon2])
        if any(np.isnan(v) for v in [lat1, lon1, lat2, lon2]):
            return np.nan
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
        return R * 2 * atan2(sqrt(a), sqrt(1 - a))
    except:
        return np.nan

def latlon_to_geohash(lat, lon, precision=6):
    BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'
    try:
        lat, lon = float(lat), float(lon)
        if np.isnan(lat) or np.isnan(lon): return None
    except: return None
    lat_range = [-90.0, 90.0]; lon_range = [-180.0, 180.0]
    result = ''; is_lon = True; bit = 0; current_char = 0
    while len(result) < precision:
        if is_lon:
            mid = (lon_range[0] + lon_range[1]) / 2
            if lon >= mid: current_char = (current_char << 1) | 1; lon_range[0] = mid
            else: current_char <<= 1; lon_range[1] = mid
        else:
            mid = (lat_range[0] + lat_range[1]) / 2
            if lat >= mid: current_char = (current_char << 1) | 1; lat_range[0] = mid
            else: current_char <<= 1; lat_range[1] = mid
        is_lon = not is_lon; bit += 1
        if bit == 5: result += BASE32[current_char]; bit = 0; current_char = 0
    return result

# ──────────────────────────────────────────────────────────────────────────────
# STEP 1: LOAD
# ──────────────────────────────────────────────────────────────────────────────
print("Step 1: Loading raw event data...")
df = pd.read_csv(EVENT_PATH, encoding='utf-8-sig', low_memory=False)
print(f"  Loaded {len(df):,} rows x {len(df.columns)} columns")
df = df.copy()

# ──────────────────────────────────────────────────────────────────────────────
# STEP 2: DATETIME & TEMPORAL FEATURES
# ──────────────────────────────────────────────────────────────────────────────
print("Step 2: Parsing datetimes and engineering temporal features...")
DT_COLS = ['start_datetime','end_datetime','closed_datetime',
           'resolved_datetime','modified_datetime','created_date']
for col in DT_COLS:
    if col in df.columns:
        df[col] = pd.to_datetime(df[col], errors='coerce', utc=True)
        df[col] = df[col].dt.tz_convert('Asia/Kolkata')

s = df['start_datetime']
df['start_hour']     = s.dt.hour
df['start_minute']   = s.dt.minute
df['start_dow']      = s.dt.dayofweek
df['start_dow_name'] = s.dt.day_name()
df['start_month']    = s.dt.month
df['start_date']     = s.dt.date
df['start_week']     = s.dt.isocalendar().week.fillna(0).astype('int64')
df['is_weekend']     = (df['start_dow'] >= 5).astype(int)

def time_of_day_bucket(hour):
    if 5 <= hour < 7:    return 'early_morning'
    elif 7 <= hour < 10: return 'morning_rush'
    elif 10 <= hour < 12: return 'mid_morning'
    elif 12 <= hour < 14: return 'lunch_hour'
    elif 14 <= hour < 17: return 'afternoon'
    elif 17 <= hour < 20: return 'evening_rush'
    elif 20 <= hour < 22: return 'evening'
    else: return 'night'

df['time_of_day']      = df['start_hour'].apply(time_of_day_bucket)
df['is_peak_hour']     = df['time_of_day'].isin(['morning_rush','evening_rush']).astype(int)
df['is_office_return'] = df['time_of_day'].isin(['evening_rush','evening']).astype(int)
df['time_slot']        = df['start_hour'] * 4 + df['start_minute'] // 15

def compute_duration(row):
    start = row['start_datetime']
    for col in ['closed_datetime','end_datetime','resolved_datetime']:
        end = row.get(col)
        if pd.notna(end) and end > start:
            delta = (end - start).total_seconds() / 60
            if 1 < delta < 1440: return round(delta, 1)
    return np.nan

df['duration_minutes']     = df.apply(compute_duration, axis=1)
df['creation_lag_minutes'] = (df['start_datetime'] - df['created_date']).dt.total_seconds() / 60
print(f"  Duration computed for {df['duration_minutes'].notna().sum():,} / {len(df):,} events")

# ──────────────────────────────────────────────────────────────────────────────
# STEP 3: FESTIVAL & HOLIDAY CALENDAR
# ──────────────────────────────────────────────────────────────────────────────
print("Step 3: Injecting festival & public holiday calendar...")

HOLIDAYS = {
    '2023-11-01':'Kannada_Rajyotsava','2023-11-12':'Diwali',
    '2023-11-13':'Diwali_Padwa','2023-11-14':'Bhai_Dooj',
    '2023-12-25':'Christmas','2024-01-01':'New_Year',
    '2024-01-14':'Pongal_Sankranti','2024-01-15':'Pongal',
    '2024-01-26':'Republic_Day','2024-02-14':'Valentines_Day_High_Traffic',
    '2024-03-08':'Maha_Shivaratri','2024-03-25':'Holi',
    '2024-03-29':'Good_Friday','2024-04-09':'Ugadi',
    '2024-04-14':'Ambedkar_Jayanti','2024-04-17':'Ram_Navami',
}
IPL_MATCH_DAYS = [
    '2024-03-22','2024-03-28','2024-04-02','2024-04-06',
    '2024-04-13','2024-04-19','2024-04-24','2024-04-28','2024-05-04',
]
PUBLIC_EVENTS = {'2024-02-12':'Cricket_Match_Chinnaswamy'}

holiday_dates = set(HOLIDAYS.keys())
ipl_dates     = set(IPL_MATCH_DAYS)
event_dates   = set(PUBLIC_EVENTS.keys())

df['is_public_holiday']   = df['start_date'].astype(str).isin(holiday_dates).astype(int)
df['holiday_name']        = df['start_date'].astype(str).map(HOLIDAYS).fillna('none')
df['is_ipl_day']          = df['start_date'].astype(str).isin(ipl_dates).astype(int)
df['is_public_event_day'] = df['start_date'].astype(str).isin(event_dates).astype(int)

holiday_date_objs = pd.to_datetime(list(holiday_dates))
def days_to_next_holiday(d):
    try:
        future = holiday_date_objs[holiday_date_objs >= pd.Timestamp(d)]
        return (future.min() - pd.Timestamp(d)).days if len(future) > 0 else 365
    except: return 365

df['days_to_next_holiday'] = df['start_date'].apply(days_to_next_holiday)
df['is_pre_holiday']       = (df['days_to_next_holiday'] <= 1).astype(int)
print(f"  Holidays flagged: {df['is_public_holiday'].sum()} | IPL days: {df['is_ipl_day'].sum()}")

# ──────────────────────────────────────────────────────────────────────────────
# STEP 4: WEATHER (Bengaluru climate model)
# ──────────────────────────────────────────────────────────────────────────────
print("Step 4: Assigning weather context...")

def bengaluru_weather(row):
    month = row['start_month']; hour = row['start_hour']
    if month in [12,1,2]:
        condition = np.random.choice(['Sunny','Foggy'], p=[0.65,0.35])
        temp = round(np.random.normal(20,3),1)
    elif month in [3,4,5]:
        condition = np.random.choice(['Sunny','Partly_Cloudy','Thunderstorm'], p=[0.55,0.3,0.15])
        temp = round(np.random.normal(30,3),1)
    elif month in [6,7,8,9]:
        condition = np.random.choice(['Rainy','Heavy_Rain','Sunny'], p=[0.45,0.35,0.2])
        temp = round(np.random.normal(22,2),1)
    else:
        condition = np.random.choice(['Sunny','Rainy','Foggy'], p=[0.5,0.3,0.2])
        temp = round(np.random.normal(24,3),1)
    if hour < 6 or hour >= 21: temp -= 4.0
    return condition, temp

np.random.seed(42)
weather_results          = df.apply(bengaluru_weather, axis=1)
df['weather_condition']  = [r[0] for r in weather_results]
df['temperature_c']      = [r[1] for r in weather_results]
df['is_rain_event']      = df['weather_condition'].str.contains('Rain', na=False).astype(int)
df['is_fog_event']       = df['weather_condition'].str.contains('Fog',  na=False).astype(int)
df['is_storm_event']     = df['weather_condition'].str.contains('Thunder', na=False).astype(int)
WEATHER_VIS = {'Sunny':1.0,'Partly_Cloudy':0.9,'Foggy':0.5,'Rainy':0.7,'Heavy_Rain':0.4,'Thunderstorm':0.3}
df['weather_visibility_factor'] = df['weather_condition'].map(WEATHER_VIS).fillna(0.8)
print(f"  Rain: {df['is_rain_event'].sum():,} | Fog: {df['is_fog_event'].sum():,}")

# ──────────────────────────────────────────────────────────────────────────────
# STEP 5: SPATIAL FEATURES
# ──────────────────────────────────────────────────────────────────────────────
print("Step 5: Engineering spatial features...")

df['lat_valid'] = (df['latitude'].between(BLURU_LAT_MIN,BLURU_LAT_MAX) &
                   df['longitude'].between(BLURU_LON_MIN,BLURU_LON_MAX))
df.loc[~df['lat_valid'], ['latitude','longitude']] = np.nan

print("  Computing geohashes...")
df['geohash6'] = df.apply(
    lambda r: latlon_to_geohash(r['latitude'], r['longitude'], 6)
    if pd.notna(r['latitude']) else None, axis=1)

def compute_segment(row):
    try:
        elat,elon = float(row['endlatitude']), float(row['endlongitude'])
        slat,slon = float(row['latitude']),    float(row['longitude'])
        if elat==0 or elon==0 or abs(elat-slat)<1e-6 or not(BLURU_LAT_MIN<elat<BLURU_LAT_MAX):
            return 0.0,0
        return round(haversine_km(slat,slon,elat,elon),4), 1
    except: return 0.0,0

seg = df.apply(compute_segment, axis=1)
df['segment_length_km'] = [r[0] for r in seg]
df['is_segment_event']  = [r[1] for r in seg]

def compute_clearance_disp(row):
    try:
        rlat,rlon = float(row['resolved_at_latitude']), float(row['resolved_at_longitude'])
        slat,slon = float(row['latitude']),             float(row['longitude'])
        if any(np.isnan(v) for v in [rlat,rlon,slat,slon]): return 0.0
        return round(haversine_km(slat,slon,rlat,rlon),4)
    except: return 0.0

df['clearance_displacement_km'] = df.apply(compute_clearance_disp, axis=1)

LANDMARKS = {
    'Chinnaswamy_Stadium':  (12.9788,77.5996,'stadium'),
    'Lalbagh_Garden':       (12.9507,77.5848,'park'),
    'MG_Road_Metro':        (12.9756,77.6071,'metro'),
    'Silk_Board_Junction':  (12.9176,77.6228,'junction'),
    'Electronic_City':      (12.8399,77.6770,'tech_park'),
    'Whitefield':           (12.9698,77.7499,'tech_park'),
    'KR_Market':            (12.9622,77.5756,'market'),
    'Majestic_Bus_Stand':   (12.9769,77.5713,'transit'),
    'Manyata_Tech_Park':    (13.0473,77.6219,'tech_park'),
    'Embassy_Golf_Links':   (12.9536,77.6853,'tech_park'),
    'ITPL_Whitefield':      (12.9913,77.7301,'tech_park'),
    'Koramangala':          (12.9352,77.6245,'commercial'),
    'Indiranagar':          (12.9784,77.6408,'commercial'),
    'Hebbal_Flyover':       (13.0360,77.5967,'junction'),
}

def nearest_landmark(lat, lon):
    if pd.isna(lat) or pd.isna(lon): return 'unknown',99.0,'unknown'
    best_name,best_dist,best_type = 'unknown',99.0,'unknown'
    for name,(llat,llon,ltype) in LANDMARKS.items():
        d = haversine_km(lat,lon,llat,llon)
        if d < best_dist: best_dist,best_name,best_type = d,name,ltype
    return best_name, round(best_dist,3), best_type

print("  Computing nearest landmarks...")
lm = df.apply(lambda r: nearest_landmark(r['latitude'],r['longitude']), axis=1)
df['nearest_landmark']      = [r[0] for r in lm]
df['nearest_landmark_km']   = [r[1] for r in lm]
df['nearest_landmark_type'] = [r[2] for r in lm]
df['is_near_tech_hub']      = (df['nearest_landmark_type']=='tech_park').astype(int)
df['is_near_stadium']       = (df['nearest_landmark_type']=='stadium').astype(int)
df['is_near_transit']       = df['nearest_landmark_type'].isin(['metro','transit']).astype(int)
df['is_near_major_landmark']= (df['nearest_landmark_km']<1.0).astype(int)

print("  Computing hotspot recurrence...")
if 'geohash6' in df.columns:
    df = df.sort_values('start_datetime')
    df['hotspot_event_count'] = df.groupby('geohash6').cumcount()
    geo_total = df.groupby('geohash6').size().rename('geo_total_events')
    df = df.merge(geo_total, on='geohash6', how='left')
else:
    df['hotspot_event_count'] = 0
    df['geo_total_events']    = 0

print(f"  Geohashes: {df['geohash6'].nunique():,} unique cells")

# ──────────────────────────────────────────────────────────────────────────────
# STEP 6: ENTITY INTELLIGENCE
# ──────────────────────────────────────────────────────────────────────────────
print("Step 6: Building entity intelligence features...")

reporter_stats = (df[df['duration_minutes'].notna()]
                  .groupby('created_by_id')['duration_minutes']
                  .agg(['mean','count'])
                  .rename(columns={'mean':'reporter_avg_duration','count':'reporter_event_count'}))
df = df.merge(reporter_stats, on='created_by_id', how='left')
global_avg = df['duration_minutes'].mean()
df['reporter_avg_duration_shrunk'] = (
    df['reporter_event_count'].fillna(1) * df['reporter_avg_duration'].fillna(global_avg) + 10*global_avg
) / (df['reporter_event_count'].fillna(1) + 10)

if 'closed_by_id' in df.columns and df['closed_by_id'].notna().sum() > 0:
    resp = (df[df['duration_minutes'].notna() & df['closed_by_id'].notna()]
            .groupby(['closed_by_id','corridor'])['duration_minutes']
            .mean().reset_index()
            .rename(columns={'duration_minutes':'responder_corridor_avg_duration'}))
    df = df.merge(resp, on=['closed_by_id','corridor'], how='left')
else:
    df['responder_corridor_avg_duration'] = np.nan

if 'veh_no' in df.columns:
    veh_freq = df['veh_no'].value_counts().rename('vehicle_breakdown_freq')
    df = df.merge(veh_freq, left_on='veh_no', right_index=True, how='left')
    df['is_chronic_vehicle'] = (df['vehicle_breakdown_freq'] >= 3).astype(int)
else:
    df['vehicle_breakdown_freq'] = 1; df['is_chronic_vehicle'] = 0

df['has_citizen_corroboration'] = df['citizen_accident_id'].notna().astype(int)
df['was_police_assigned']       = df['assigned_to_police_id'].notna().astype(int)
print(f"  Reporter avg duration: {df['reporter_avg_duration'].mean():.1f} min")

# ──────────────────────────────────────────────────────────────────────────────
# STEP 7: TEXT FEATURE EXTRACTION
# ──────────────────────────────────────────────────────────────────────────────
print("Step 7: Extracting text features from description...")

def extract_text_flags(text):
    if pd.isna(text) or not isinstance(text, str): return {}
    t = text.lower()
    return {
        'desc_has_rally':         int(bool(re.search(r'rally|protest|procession|yatra|morcha',t))),
        'desc_has_match':         int(bool(re.search(r'match|cricket|ipl|stadium|chinnaswamy',t))),
        'desc_has_festival':      int(bool(re.search(r'festival|diwali|ugadi|pongal|holi|ganesh',t))),
        'desc_has_water':         int(bool(re.search(r'water.log|waterlog|flood|drainage|rain|puddle',t))),
        'desc_has_tree':          int(bool(re.search(r'tree.fall|tree fallen|fallen tree|branch',t))),
        'desc_has_accident':      int(bool(re.search(r'accident|collision|crash|hit',t))),
        'desc_has_power_failure': int(bool(re.search(r'signal off|power|light.fail|electricity|current',t))),
        'desc_has_construction':  int(bool(re.search(r'work|construction|repair|bwssb|bbmp|metro|kride',t))),
        'desc_has_vip':           int(bool(re.search(r'vip|minister|cm|pm|president|dignitar',t))),
        'desc_has_traffic_slow':  int(bool(re.search(r'slow|slow.mov|traffic slow|crawl',t))),
        'desc_has_bus':           int(bool(re.search(r'bmtc|ksrtc|bus',t))),
        'desc_has_heavy_vehicle': int(bool(re.search(r'truck|lorry|heavy.veh|hgv|lgv|tanker',t))),
        'desc_in_kannada':        int(bool(re.search(r'[\u0C80-\u0CFF]', text))),
    }

flag_df = df['description'].apply(extract_text_flags).apply(pd.Series).fillna(0).astype(int)
df = pd.concat([df, flag_df], axis=1)

def impute_veh_type(row):
    if pd.notna(row.get('veh_type')): return row['veh_type']
    t = str(row.get('description','') or '').lower()
    if re.search(r'bmtc',t): return 'bmtc_bus'
    if re.search(r'ksrtc',t): return 'ksrtc_bus'
    if re.search(r'bus',t): return 'private_bus'
    if re.search(r'truck|lorry|hgv',t): return 'heavy_vehicle'
    if re.search(r'lgv|lcv',t): return 'lcv'
    if re.search(r'auto',t): return 'auto'
    if re.search(r'car|suv',t): return 'private_car'
    return 'unknown'

df['veh_type_clean'] = df.apply(impute_veh_type, axis=1)
print(f"  Kannada descriptions: {df['desc_in_kannada'].sum():,}")

# ──────────────────────────────────────────────────────────────────────────────
# STEP 8: VEHICLE SEVERITY FEATURES
# ──────────────────────────────────────────────────────────────────────────────
print("Step 8: Computing vehicle severity features...")

LANE_BLOCK = {'heavy_vehicle':3.0,'truck':3.0,'bmtc_bus':2.5,'ksrtc_bus':2.5,
              'private_bus':2.5,'lcv':1.5,'auto':0.5,'private_car':1.0,
              'others':1.0,'unknown':1.0}
df['lane_block_factor'] = df['veh_type_clean'].map(LANE_BLOCK).fillna(1.0)

df['is_hazmat_cargo'] = df['cargo_material'].apply(
    lambda c: int(bool(re.search(r'fuel|petrol|diesel|gas|chemical|acid|flammable|explosive', str(c).lower()))) if pd.notna(c) else 0)

def truck_age_tier(age):
    if pd.isna(age): return 'unknown'
    age = float(age)
    if age<=5: return 'new'
    elif age<=10: return 'moderate'
    elif age<=15: return 'aging'
    else: return 'critical'

df['truck_age_tier'] = df['age_of_truck'].apply(truck_age_tier)

# ──────────────────────────────────────────────────────────────────────────────
# STEP 9: SMART NULL IMPUTATION
# ──────────────────────────────────────────────────────────────────────────────
print("Step 9: Smart null imputation...")

zone_to_corridor = (df[df['corridor'].notna() & df['zone'].notna()]
                    .groupby('zone')['corridor']
                    .agg(lambda x: x.mode()[0] if len(x)>0 else 'Non-corridor').to_dict())
df['corridor'] = df['corridor'].fillna(df['zone'].map(zone_to_corridor)).fillna('Non-corridor')

cause_priority = (df[df['priority'].notna()]
                  .groupby('event_cause')['priority']
                  .agg(lambda x: x.mode()[0]).to_dict())
df['priority'] = df['priority'].fillna(df['event_cause'].map(cause_priority)).fillna('Low')

corridor_to_zone = (df[df['corridor'].notna() & df['zone'].notna()]
                    .groupby('corridor')['zone']
                    .agg(lambda x: x.mode()[0] if len(x)>0 else 'Unknown').to_dict())
df['zone'] = df['zone'].fillna(df['corridor'].map(corridor_to_zone)).fillna('Unknown')

ps_to_junction = (df[df['police_station'].notna() & df['junction'].notna()]
                  .groupby('police_station')['junction']
                  .agg(lambda x: x.mode()[0] if len(x)>0 else 'Unknown').to_dict())
df['junction'] = df['junction'].fillna(df['police_station'].map(ps_to_junction)).fillna('Unknown')
print("  Nulls imputed for corridor, priority, zone, junction")

# ──────────────────────────────────────────────────────────────────────────────
# STEP 10: TARGET ENGINEERING
# ──────────────────────────────────────────────────────────────────────────────
print("Step 10: Engineering composite impact score and target labels...")

def compute_impact_score(row):
    base          = min(row.get('duration_minutes',30) or 30, 480) / 480.0
    closure_mult  = 2.5 if str(row.get('requires_road_closure','')).lower()=='true' else 1.0
    priority_mult = 1.5 if row.get('priority','')=='High' else 1.0
    corridor_mult = 1.3 if row.get('corridor','')!='Non-corridor' else 1.0
    lane_mult     = float(row.get('lane_block_factor',1.0))
    peak_mult     = 1.4 if row.get('is_peak_hour',0)==1 else 1.0
    holiday_mult  = 1.3 if row.get('is_public_holiday',0)==1 else 1.0
    ipl_mult      = 1.5 if row.get('is_ipl_day',0)==1 else 1.0
    rain_mult     = 1.2 if row.get('is_rain_event',0)==1 else 1.0
    hotspot_mult  = 1.0 + min(float(row.get('geo_total_events',0) or 0),20)/100.0
    score = (base*closure_mult*priority_mult*corridor_mult*lane_mult*
             peak_mult*holiday_mult*ipl_mult*rain_mult*hotspot_mult)
    return round(min(score,10.0),4)

df['impact_score'] = df.apply(compute_impact_score, axis=1)

def classify_impact(score):
    if score<0.5: return 'Low'
    elif score<1.5: return 'Medium'
    elif score<3.0: return 'High'
    else: return 'Critical'

df['impact_class'] = df['impact_score'].apply(classify_impact)

def recommend_action(row):
    score   = row.get('impact_score',0)
    closure = str(row.get('requires_road_closure','')).lower()=='true'
    hazmat  = row.get('is_hazmat_cargo',0)
    if hazmat:       return 'HAZMAT_PROTOCOL'
    if score>=3.0:   return 'FULL_DIVERSION'
    if closure:      return 'PARTIAL_CLOSURE_DIVERT'
    if score>=1.5:   return 'OFFICER_DEPLOY'
    if score>=0.5:   return 'MONITOR'
    return 'NO_ACTION'

df['recommended_action'] = df.apply(recommend_action, axis=1)

df['avoid_route_window'] = df['time_of_day'].map({
    'morning_rush':'Avoid 7-10am','evening_rush':'Avoid 5-8pm',
    'lunch_hour':'Avoid 12-2pm','night':'Generally clear',
    'early_morning':'Generally clear','mid_morning':'Moderate - proceed with care',
    'afternoon':'Moderate - proceed with care','evening':'Moderate - check corridor status',
})

# ──────────────────────────────────────────────────────────────────────────────
# STEP 11: EXPORT
# ──────────────────────────────────────────────────────────────────────────────
print("Step 11: Exporting polished dataset...")

DROP_COLS = ['map_file','comment','meta_data','created_by_id',
             'last_modified_by_id','closed_by_id','resolved_by_id',
             'modified_datetime','created_date','lat_valid','start_date']
final_df = df.drop(columns=[c for c in DROP_COLS if c in df.columns], errors='ignore')
final_df.to_csv(OUT_PATH, index=False, encoding='utf-8-sig')

with open(SUMMARY_PATH, 'w', encoding='utf-8') as f:
    f.write("="*70+"\n")
    f.write("ENRICHED EVENT DATASET - POLISHED SUMMARY\n")
    f.write("="*70+"\n\n")
    f.write(f"Total rows:     {len(final_df):,}\n")
    f.write(f"Total features: {len(final_df.columns)}\n\n")
    f.write("--- TARGET LABEL DISTRIBUTION ---\n")
    f.write(str(final_df['impact_class'].value_counts())+"\n\n")
    f.write("--- DURATION STATISTICS (minutes) ---\n")
    f.write(str(final_df['duration_minutes'].describe())+"\n\n")
    f.write("--- RECOMMENDED ACTION DISTRIBUTION ---\n")
    f.write(str(final_df['recommended_action'].value_counts())+"\n\n")
    f.write("--- WEATHER DISTRIBUTION ---\n")
    f.write(str(final_df['weather_condition'].value_counts())+"\n\n")
    f.write("--- TIME OF DAY DISTRIBUTION ---\n")
    f.write(str(final_df['time_of_day'].value_counts())+"\n\n")
    f.write("--- MISSING % IN POLISHED DATASET ---\n")
    miss = (final_df.isnull().mean()*100).round(2)
    f.write(str(miss[miss>0].sort_values(ascending=False))+"\n")

print(f"\n[DONE] Enrichment complete!")
print(f"   Polished dataset : {OUT_PATH}")
print(f"   Summary report   : {SUMMARY_PATH}")
print(f"   Rows: {len(final_df):,} | Columns: {len(final_df.columns)}")
print("\n--- Impact Class Distribution ---")
print(final_df['impact_class'].value_counts())
print("\n--- Duration Stats (min) ---")
print(final_df['duration_minutes'].describe())
