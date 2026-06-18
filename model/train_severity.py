"""
ECF-MS Layer 2 — Event Severity Prediction
===========================================
Trains two models on events_polished.csv:
  • LightGBM Regressor  → duration_minutes
  • LightGBM Classifier → impact_class

Validation: TimeSeriesSplit(n_splits=5)
Outputs:
  • outputs/oof_predictions.csv
  • outputs/severity_reg_model.txt
  • outputs/severity_clf_model.txt
  • outputs/shap_summary_reg.png
  • outputs/shap_summary_clf.png
"""

import warnings
warnings.filterwarnings("ignore")

import os
import numpy as np
import pandas as pd
import lightgbm as lgb
import shap
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    mean_absolute_error,
    f1_score,
    recall_score,
    classification_report,
)

# ─────────────────────────────────────────────────────────────
# 0. PATHS
# ─────────────────────────────────────────────────────────────
DATA_PATH   = os.environ.get("DATA_PATH", "events_polished.csv")
OUTPUT_DIR  = os.environ.get("OUTPUT_DIR", "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─────────────────────────────────────────────────────────────
# 1. FEATURE LISTS
#    Rule: only signals that exist AT EVENT CREATION TIME.
# ─────────────────────────────────────────────────────────────

# ── Hard leakage columns (post-event knowledge) ──────────────
LEAKAGE_COLS = [
    "end_datetime",           # known only after closure
    "closed_datetime",        # known only after closure
    "resolved_datetime",      # known only after closure
    "resolved_at_address",
    "resolved_at_latitude",
    "resolved_at_longitude",
    "clearance_displacement_km",  # needs end coords
    "impact_score",           # composite that includes duration
    "recommended_action",     # derived from impact_score
    "avoid_route_window",     # derived from impact_score
    "duration_minutes",       # TARGET for regression — never a feature
]

# ── Safe feature set (creation-time observable) ──────────────
FEATURES = [
    # Temporal
    "start_hour",
    "start_minute",
    "start_dow",
    "start_month",
    "start_week",
    "is_weekend",
    "is_peak_hour",
    "is_office_return",
    "is_public_holiday",
    "days_to_next_holiday",
    "is_pre_holiday",
    "is_ipl_day",
    #"is_public_event_day",
    # Weather (synthetic, known at start time)
    "weather_visibility_factor",
    "is_rain_event",
    "is_fog_event",
    "is_storm_event",
    "temperature_c",
    # Spatial
    "nearest_landmark_km",
    "is_near_tech_hub",
    "is_near_stadium",
    "is_near_transit",
    "is_near_major_landmark",
    "segment_length_km",
    "is_segment_event",
    # Entity / reporter
    "reporter_avg_duration_shrunk",
    "reporter_event_count",
    "vehicle_breakdown_freq",
    "is_chronic_vehicle",
    #"has_citizen_corroboration",
    #"was_police_assigned",
    "hotspot_event_count",
    # Event meta
    "requires_road_closure",
    "lane_block_factor",
    #"is_hazmat_cargo",
    # Text flags
    #"desc_has_rally",
    #"desc_has_match",
    #"desc_has_festival",
    "desc_has_water",
    #"desc_has_tree",
    #"desc_has_accident",
    #"desc_has_power_failure",
    "desc_has_construction",
    #"desc_has_vip",
    "desc_has_traffic_slow",
    "desc_has_bus",
    "desc_has_heavy_vehicle",
    "desc_in_kannada",
    # Categorical (label-encoded below)
    "event_type",
    "event_cause",
    "time_of_day",
    "time_slot",
    "zone",
    "corridor",
    "priority",
    "truck_age_tier",
    "veh_type_clean",
]

CATEGORICAL_FEATURES = [
    "event_type", "event_cause", "time_of_day", "time_slot",
    "zone", "corridor", "priority", "truck_age_tier", "veh_type_clean",
]

REG_TARGET  = "duration_minutes"
CLF_TARGET  = "impact_class"

# ─────────────────────────────────────────────────────────────
# 2. LOAD & FILTER
# ─────────────────────────────────────────────────────────────
print("=" * 60)
print("ECF-MS Layer 2 — Severity Model Training")
print("=" * 60)

df = pd.read_csv(DATA_PATH)
print(f"Loaded {len(df):,} rows, {df.shape[1]} columns")

# Leakage check: assert none of LEAKAGE_COLS is used as a feature
leaked = set(LEAKAGE_COLS) & set(FEATURES)
assert len(leaked) == 0, f"LEAKAGE DETECTED in feature list: {leaked}"
print(f"✓ Leakage check passed — 0 leakage columns in feature set")

# Parse timestamps and sort chronologically (mandatory for time-based CV)
df["start_datetime"] = pd.to_datetime(df["start_datetime"], utc=True)
df = df.sort_values("start_datetime").reset_index(drop=True)
print(f"✓ Sorted by start_datetime: {df['start_datetime'].min().date()} → {df['start_datetime'].max().date()}")

# Training mask per walkthrough spec
train_mask = (
    
    (df["status"].isin(["closed", "resolved"])) &
    (df[REG_TARGET].notna()) &
    (df[REG_TARGET] > 1) &
    (df[REG_TARGET] < 1440)
)
df_train = df[train_mask].copy().reset_index(drop=True)
print(f"✓ Trainable rows after filter: {len(df_train):,}")
print(f"  impact_class distribution:\n{df_train[CLF_TARGET].value_counts().to_string()}")

# ─────────────────────────────────────────────────────────────
# 3. FEATURE PREPARATION
# ─────────────────────────────────────────────────────────────

# Keep only features that exist in dataframe
available_features = [f for f in FEATURES if f in df_train.columns]
missing_features   = [f for f in FEATURES if f not in df_train.columns]
if missing_features:
    print(f"  ⚠ Features not found in CSV (skipped): {missing_features}")

# Label-encode categorical columns
le_map = {}
for col in CATEGORICAL_FEATURES:
    if col in df_train.columns:
        le = LabelEncoder()
        df_train[col] = le.fit_transform(df_train[col].astype(str).fillna("unknown"))
        le_map[col] = le

# Fill remaining numeric nulls with median
X = df_train[available_features].copy()
for col in X.columns:
    if X[col].dtype in [np.float64, np.float32, np.int64, np.int32]:
        X[col] = X[col].fillna(X[col].median())

y_reg = df_train[REG_TARGET].values

# Encode classification target
le_clf = LabelEncoder()
y_clf  = le_clf.fit_transform(df_train[CLF_TARGET].astype(str))
print(f"✓ Class mapping: {dict(zip(le_clf.classes_, range(len(le_clf.classes_))))}")

# ─────────────────────────────────────────────────────────────
# 4. TIME-BASED CV — REGRESSION
# ─────────────────────────────────────────────────────────────
print("\n── Layer 2a: Duration Regression ──────────────────────")

tscv = TimeSeriesSplit(n_splits=5)

oof_pred_reg = np.zeros(len(X))
fold_maes    = []
reg_models   = []

REG_PARAMS = {
    "objective":        "regression",
    "metric":           "mae",
    "n_estimators":     800,
    "learning_rate":    0.05,
    "num_leaves":       63,
    "min_child_samples": 20,
    "subsample":        0.8,
    "colsample_bytree": 0.8,
    "reg_alpha":        0.1,
    "reg_lambda":       1.0,
    "random_state":     42,
    "n_jobs":           -1,
    "verbose":          -1,
}

for fold, (tr_idx, val_idx) in enumerate(tscv.split(X)):
    X_tr, X_val = X.iloc[tr_idx], X.iloc[val_idx]
    y_tr, y_val = y_reg[tr_idx], y_reg[val_idx]

    model = lgb.LGBMRegressor(**REG_PARAMS)
    model.fit(
        X_tr, y_tr,
        eval_set=[(X_val, y_val)],
        callbacks=[lgb.early_stopping(50, verbose=False), lgb.log_evaluation(-1)],
    )
    preds = model.predict(X_val)
    oof_pred_reg[val_idx] = preds
    mae = mean_absolute_error(y_val, preds)
    fold_maes.append(mae)
    print(
    f"  Fold {fold+1} | val MAE: {mae:.2f} min | best iter: {model.best_iteration_}")
    reg_models.append(model)

overall_mae = mean_absolute_error(y_reg[tscv.split(X).__next__()[0].max():], 
                                   oof_pred_reg[tscv.split(X).__next__()[0].max():])
print(f"\n  OOF MAE (last 4 folds): {np.mean(fold_maes[1:]):.2f} min")
print(f"  Target: <20 min — {'✓ PASS' if np.mean(fold_maes[1:]) < 20 else '✗ FAIL (tune hyperparams)'}")

# Retrain on full data for production model
final_reg = lgb.LGBMRegressor(**{**REG_PARAMS, "n_estimators": int(np.mean([m.best_iteration_ for m in reg_models]) * 1.1)})
final_reg.fit(X, y_reg)
final_reg.booster_.save_model(os.path.join(OUTPUT_DIR, "severity_reg_model.txt"))
print(f"  ✓ Regression model saved → outputs/severity_reg_model.txt")

# ─────────────────────────────────────────────────────────────
# 5. TIME-BASED CV — CLASSIFICATION
# ─────────────────────────────────────────────────────────────
print("\n── Layer 2b: Impact Classification ─────────────────────")

n_classes     = len(le_clf.classes_)
oof_pred_clf  = np.zeros((len(X), n_classes))
fold_f1s      = []
clf_models    = []

# Compute class weights for imbalanced classes
from collections import Counter
class_counts  = Counter(y_clf)
total         = len(y_clf)
class_weight  = {c: total / (n_classes * cnt) for c, cnt in class_counts.items()}

CLF_PARAMS = {
    "objective":         "multiclass",
    "num_class":         n_classes,
    "metric":            "multi_logloss",
    "n_estimators":      1200,
    "learning_rate":     0.05,
    "num_leaves":        127,
    "min_child_samples": 10,
    "subsample":         0.8,
    "colsample_bytree":  0.8,
    "reg_alpha":         0.1,
    "reg_lambda":        1.0,
    "class_weight":      class_weight,
    "random_state":      42,
    "n_jobs":            -1,
    "verbose":           -1,
}

critical_idx = list(le_clf.classes_).index("Critical") if "Critical" in le_clf.classes_ else None

for fold, (tr_idx, val_idx) in enumerate(tscv.split(X)):
    X_tr, X_val = X.iloc[tr_idx], X.iloc[val_idx]
    y_tr, y_val = y_clf[tr_idx], y_clf[val_idx]

    model = lgb.LGBMClassifier(**CLF_PARAMS)
    model.fit(
    X_tr,
    y_tr,
    eval_set=[(X_val, y_val)],
    callbacks=[
        lgb.early_stopping(50, verbose=False),
        lgb.log_evaluation(-1)
    ],
    )
    proba = model.predict_proba(X_val)
    preds = model.predict(X_val)
    oof_pred_clf[val_idx] = proba

    wf1 = f1_score(y_val, preds, average="weighted", zero_division=0)
    fold_f1s.append(wf1)

    crit_recall = ""
    if critical_idx is not None and critical_idx in y_val:
        cr = recall_score(y_val, preds, labels=[critical_idx], average="micro", zero_division=0)
        crit_recall = f" | Critical recall: {cr:.2f}"

    print(f"  Fold {fold+1} | weighted F1: {wf1:.3f}{crit_recall} | best iter: {model.best_iteration_}")
    clf_models.append(model)

print(f"\n  OOF weighted F1 (mean): {np.mean(fold_f1s):.3f}")
print(f"  Target: >0.75 — {'✓ PASS' if np.mean(fold_f1s) > 0.75 else '✗ FAIL'}")

# Classification report on last fold
last_fold_val_idx = list(tscv.split(X))[-1][1]
last_preds = clf_models[-1].predict(X.iloc[last_fold_val_idx])
print("\n  Last-fold classification report:")
print(classification_report(
    y_clf[last_fold_val_idx], last_preds,
    target_names=le_clf.classes_, zero_division=0
))

# Retrain on full data
final_clf = lgb.LGBMClassifier(**CLF_PARAMS)

final_clf.fit(
    X,
    y_clf
)


final_clf.booster_.save_model(
    os.path.join(OUTPUT_DIR, "severity_clf_model.txt")
)
print(f"  ✓ Classification model saved → outputs/severity_clf_model.txt")

# ─────────────────────────────────────────────────────────────
# 6. OOF PREDICTIONS CSV
# ─────────────────────────────────────────────────────────────
oof_df = df_train[["id", "start_datetime", "zone", "corridor", REG_TARGET, CLF_TARGET]].copy()
oof_df["oof_duration_pred"]   = oof_pred_reg
oof_df["oof_impact_class_pred"] = le_clf.inverse_transform(np.argmax(oof_pred_clf, axis=1))
for i, cls in enumerate(le_clf.classes_):
    oof_df[f"oof_prob_{cls}"] = oof_pred_clf[:, i]

oof_path = os.path.join(OUTPUT_DIR, "oof_predictions.csv")
oof_df.to_csv(oof_path, index=False)
print(f"\n✓ OOF predictions saved → {oof_path}")

# ─────────────────────────────────────────────────────────────
# 7. SHAP EXPLAINABILITY
# ─────────────────────────────────────────────────────────────
print("\n── SHAP Explainability ─────────────────────────────────")
sample_size = min(500, len(X))
X_sample    = X.iloc[:sample_size]

# Regression SHAP
print("  Computing regression SHAP values...")
explainer_reg  = shap.TreeExplainer(final_reg)
shap_vals_reg  = explainer_reg.shap_values(X_sample)
plt.figure(figsize=(10, 8))
shap.summary_plot(shap_vals_reg, X_sample, feature_names=available_features, show=False, max_display=20)
plt.title("SHAP Summary — Duration Regression", fontsize=13)
plt.tight_layout()
reg_shap_path = os.path.join(OUTPUT_DIR, "shap_summary_reg.png")
plt.savefig(reg_shap_path, dpi=120, bbox_inches="tight")
plt.close()
print(f"  ✓ Regression SHAP plot saved → {reg_shap_path}")

# Classification SHAP (for class=Critical if present, else first class)
print("  Computing classification SHAP values...")
explainer_clf = shap.TreeExplainer(final_clf)
shap_vals_clf = explainer_clf.shap_values(X_sample)
# shap_vals_clf is a list of arrays, one per class
target_class_idx = critical_idx if critical_idx is not None else 0
shap_for_plot    = shap_vals_clf[target_class_idx] if isinstance(shap_vals_clf, list) else shap_vals_clf

plt.figure(figsize=(10, 8))
shap.summary_plot(shap_for_plot, X_sample, feature_names=available_features, show=False, max_display=20)
target_class_name = le_clf.classes_[target_class_idx]
plt.title(f"SHAP Summary — Impact Classification (class={target_class_name})", fontsize=13)
plt.tight_layout()
clf_shap_path = os.path.join(OUTPUT_DIR, "shap_summary_clf.png")
plt.savefig(clf_shap_path, dpi=120, bbox_inches="tight")
plt.close()
print(f"  ✓ Classification SHAP plot saved → {clf_shap_path}")

# ─────────────────────────────────────────────────────────────
# 8. FEATURE IMPORTANCE
# ─────────────────────────────────────────────────────────────
print("\n── Top 15 Feature Importances (Regression) ─────────────")
fi_reg = pd.Series(final_reg.feature_importances_, index=available_features).sort_values(ascending=False)
print(fi_reg.head(15).to_string())

print("\n── Top 15 Feature Importances (Classification) ─────────")
fi_clf = pd.Series(final_clf.feature_importances_, index=available_features).sort_values(ascending=False)
print(fi_clf.to_string())

# ─────────────────────────────────────────────────────────────
# 9. SAVE FEATURE LIST FOR DOWNSTREAM LAYERS
# ─────────────────────────────────────────────────────────────
import json
meta = {
    "features":             available_features,
    "categorical_features": [c for c in CATEGORICAL_FEATURES if c in available_features],
    "reg_target":           REG_TARGET,
    "clf_target":           CLF_TARGET,
    "clf_classes":          list(le_clf.classes_),
    "leakage_cols":         LEAKAGE_COLS,
    "train_rows":           len(df_train),
    "oof_mae":              float(np.mean(fold_maes)),
    "oof_weighted_f1":      float(np.mean(fold_f1s)),
}
meta_path = os.path.join(OUTPUT_DIR, "layer2_meta.json")
with open(meta_path, "w") as f:
    json.dump(meta, f, indent=2)
print(f"\n✓ Layer 2 metadata saved → {meta_path}")

print("\n" + "=" * 60)
print("Layer 2 complete.")
print(f"  OOF MAE (regression):      {np.mean(fold_maes):.2f} min")
print(f"  OOF Weighted F1 (classif): {np.mean(fold_f1s):.3f}")
print("=" * 60)


import joblib

joblib.dump(
    le_map,
    os.path.join(OUTPUT_DIR, "label_encoders.pkl")
)

print("✓ Label encoders saved")