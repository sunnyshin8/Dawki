import os
import joblib
from datetime import datetime
import pandas as pd
from sklearn.preprocessing import LabelEncoder

from backend.feature_spec import CATEGORICAL_FEATURES, FEATURES

ENCODER_PATH = os.path.join("outputs", "label_encoders.pkl")


if not os.path.exists(ENCODER_PATH):
    raise FileNotFoundError(
        f"Label encoders file not found at {ENCODER_PATH}. Please run the training pipeline first (e.g., model/train_severity.py) to generate it."
    )

encoders = joblib.load(ENCODER_PATH)



def encode_feature(col, value):
    le = encoders.get(col)

    if le is None:
        return 0

    if value not in le.classes_:
        value = le.classes_[0]

    return int(le.transform([value])[0])


def build_features(payload, weather_feats):

    now = datetime.now()

    row = {f: 0 for f in FEATURES}

    # Time features
    row["start_hour"] = now.hour
    row["start_minute"] = now.minute
    row["start_dow"] = now.weekday()
    row["start_month"] = now.month
    row["start_week"] = now.isocalendar()[1]

    row["is_weekend"] = int(now.weekday() >= 5)
    row["is_peak_hour"] = int(now.hour in [8,9,10,17,18,19])

    # Weather
    row.update(weather_feats)

    # User payload
    row["zone"] = encode_feature("zone", payload.zone)
    row["corridor"] = encode_feature("corridor", payload.corridor)
    row["event_type"] = encode_feature("event_type", payload.event_type)
    row["priority"] = encode_feature("priority", str(payload.priority))

    # Safe defaults
    row["reporter_avg_duration_shrunk"] = 60
    row["reporter_event_count"] = 1
    row["hotspot_event_count"] = 0
    row["nearest_landmark_km"] = 1.0
    row["segment_length_km"] = 1.0
    row["lane_block_factor"] = 1

    return pd.DataFrame([row])[FEATURES]