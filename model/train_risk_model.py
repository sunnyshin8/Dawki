"""
ECF-MS Layer 3 — Zone × Time Risk Forecasting
==============================================
Aggregates Layer-2-enriched events into (zone, corridor, start_dow, hour_block, week)
buckets, engineers EWMA lag features, and trains a calibrated LightGBM binary
classifier to predict target_high_impact.

Outputs:
  • outputs/risk_model.txt
  • outputs/risk_model_calibrated.pkl
  • outputs/risk_agg.csv               ← aggregated feature table
  • outputs/oof_risk_predictions.csv
  • outputs/risk_calibration_plot.png
  • outputs/risk_roc_pr_curves.png
  • outputs/layer3_meta.json
"""

import warnings
warnings.filterwarnings("ignore")

import os, json
import numpy as np
import pandas as pd
import lightgbm as lgb
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pickle

from sklearn.model_selection import TimeSeriesSplit
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    classification_report,
)

# ─────────────────────────────────────────────────────────────
# 0. PATHS
# ─────────────────────────────────────────────────────────────
DATA_PATH  = os.environ.get("DATA_PATH", "events_polished.csv")
OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─────────────────────────────────────────────────────────────
# 1. LOAD & PARSE
# ─────────────────────────────────────────────────────────────
print("=" * 60)
print("ECF-MS Layer 3 — Risk Model Training")
print("=" * 60)

df = pd.read_csv(DATA_PATH)
df["start_datetime"] = pd.to_datetime(df["start_datetime"], utc=True)
df = df.sort_values("start_datetime").reset_index(drop=True)

# Require: only events with known impact (closed/resolved)
# to build reliable historical agg; active rows carry-forward risk
df_known = df[df["status"].isin(["closed", "resolved"])].copy()
print(f"Events with known status: {len(df_known):,} / {len(df):,}")

# ─────────────────────────────────────────────────────────────
# 2. DERIVE hour_block + impact_score proxy
# ─────────────────────────────────────────────────────────────
df_known["hour_block"] = (df_known["start_hour"] // 4) * 4

# impact_class → binary high impact flag
HIGH_IMPACT_CLASSES = {"High", "Critical"}
df_known["is_high_impact"] = df_known["impact_class"].isin(HIGH_IMPACT_CLASSES).astype(int)

# Numeric impact score proxy if column absent
if "impact_score" not in df_known.columns:
    impact_map = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
    df_known["impact_score"] = df_known["impact_class"].map(impact_map).fillna(2)

# ─────────────────────────────────────────────────────────────
# 3. AGGREGATE TO BUCKET LEVEL
# ─────────────────────────────────────────────────────────────
print("\n── Aggregating events into zone×corridor×dow×hour_block×week buckets")

agg = (
    df_known
    .groupby(["zone", "corridor", "start_dow", "hour_block", "start_week"], observed=True)
    .agg(
        event_count=("id", "count"),
        high_impact_count=("is_high_impact", "sum"),
        avg_impact_score=("impact_score", "mean"),
        avg_duration=("duration_minutes", lambda x: x.dropna().mean() if x.notna().any() else np.nan),
        peak_hour_pct=("is_peak_hour", "mean"),
        rain_pct=("is_rain_event", "mean"),
        fog_pct=("is_fog_event", "mean"),
        avg_visibility=("weather_visibility_factor", "mean"),
        avg_lane_block=("lane_block_factor", "mean"),
        road_closure_pct=("requires_road_closure", "mean"),
        tech_hub_pct=("is_near_tech_hub", "mean"),
        corroborated_pct=("has_citizen_corroboration", "mean"),
        ipl_pct=("is_ipl_day", "mean"),
        holiday_pct=("is_public_holiday", "mean"),
    )
    .reset_index()
    .sort_values(["zone", "corridor", "start_dow", "hour_block", "start_week"])
)

# Binary target: did this bucket see at least one High/Critical event?
agg["current_high_impact"] = (
    agg["high_impact_count"] >= 3
).astype(int)

agg["target_next_week_high_impact"] = (
    agg.groupby(["zone", "corridor", "hour_block"], observed=True)
       ["current_high_impact"]
       .shift(-1)
)

agg = agg.dropna(subset=["target_next_week_high_impact"]).copy()

agg["target_next_week_high_impact"] = (
    agg["target_next_week_high_impact"]
    .astype(int)
)

print(f"  Aggregated rows: {len(agg):,}")
print(
    f"  Target balance — positive: "
    f"{agg['target_next_week_high_impact'].mean():.1%}"
)

# ─────────────────────────────────────────────────────────────
# 4. LAG FEATURES (strictly past windows — no future leakage)
# ─────────────────────────────────────────────────────────────
print("\n── Engineering lag + EWMA features")

BUCKET_KEYS = ["zone", "corridor", "hour_block"]

def ewma_lag(series, span=3):
    """Exponentially weighted moving average, shifted 1 step (no look-ahead)."""
    return series.ewm(span=span, adjust=False).mean().shift(1)

for col, span in [("event_count", 3), ("high_impact_count", 3), ("avg_impact_score", 4)]:
    agg[f"ewma_{col}"] = (
        agg.groupby(BUCKET_KEYS, observed=True)[col]
        .transform(lambda s: ewma_lag(s, span=span))
    )


for col in ["event_count", "high_impact_count"]:
    agg[f"lag1_{col}"] = (
        agg.groupby(BUCKET_KEYS, observed=True)[col].shift(1)
    )
    agg[f"lag2_{col}"] = (
        agg.groupby(BUCKET_KEYS, observed=True)[col].shift(2)
    )

    agg[f"lag4_{col}"] = (
        agg.groupby(BUCKET_KEYS, observed=True)[col]
        .shift(4)
    )

# Rolling 3-week average (past only)
agg["roll3_event_count"] = (
    agg.groupby(BUCKET_KEYS, observed=True)["event_count"]
    .transform(lambda s: s.shift(1).rolling(3, min_periods=1).mean())
)
agg["event_volatility"] = (
    agg.groupby(BUCKET_KEYS, observed=True)["event_count"]
       .transform(
           lambda s:
           s.shift(1)
            .rolling(4, min_periods=2)
            .std()
       )
)

agg["event_volatility"] = agg["event_volatility"].fillna(0)
agg["event_count_trend"] = (
    agg["lag1_event_count"]
    - agg["lag2_event_count"]
)

agg["high_impact_trend"] = (
    agg["lag1_high_impact_count"]
    - agg["lag2_high_impact_count"]
)

# Sparsity flag
agg["bucket_sparsity"] = (agg["event_count"] == 0).astype(int)

# Fill lag NaNs with 0 (no history yet = 0 prior events)
lag_cols = [
    c for c in agg.columns
    if c.startswith(("lag", "ewma", "roll3"))
]

agg[lag_cols] = agg[lag_cols].fillna(0)

agg["event_count_trend"] = agg["event_count_trend"].fillna(0)
agg["high_impact_trend"] = agg["high_impact_trend"].fillna(0)
agg[lag_cols] = agg[lag_cols].fillna(0)

print(f"  Lag/EWMA features added: {lag_cols}")

# ─────────────────────────────────────────────────────────────
# 5. FINAL FEATURE LIST
# ─────────────────────────────────────────────────────────────
RISK_FEATURES = [
    # Bucket descriptors
    "start_dow",
    "hour_block",
    # Aggregated signals (same-week, no future)
    "event_count",
    "avg_impact_score",
    "avg_duration",
    "peak_hour_pct",
    "rain_pct",
    "fog_pct",
    "avg_visibility",
    "avg_lane_block",
    "road_closure_pct",
    "tech_hub_pct",
    "corroborated_pct",
    "ipl_pct",
    "holiday_pct",
    "bucket_sparsity",
    "event_count_trend",
    "high_impact_trend",
    # Lag features (past-only)
    *lag_cols,
]

# Categorical encoding for zone/corridor
from sklearn.preprocessing import LabelEncoder
for col in ["zone", "corridor"]:
    le = LabelEncoder()
    agg[f"{col}_enc"] = le.fit_transform(agg[col].astype(str))
    RISK_FEATURES.append(f"{col}_enc")

available_risk_features = [f for f in RISK_FEATURES if f in agg.columns]
X_risk = agg[available_risk_features].copy().fillna(0)
y_risk = agg["target_next_week_high_impact"].values

# ─────────────────────────────────────────────────────────────
# 6. TIME-BASED CV ON WEEK
# ─────────────────────────────────────────────────────────────
print(f"\n── TimeSeriesSplit(5) over {agg['start_week'].nunique()} weeks")

# Sort by start_week to ensure chronological CV
agg_sorted = agg.sort_values("start_week").reset_index(drop=True)
X_risk_s   = agg_sorted[available_risk_features].copy().fillna(0)
y_risk_s = agg_sorted["target_next_week_high_impact"].values

tscv = TimeSeriesSplit(n_splits=5)

oof_proba_risk = np.zeros(len(X_risk_s))
fold_aucs, fold_briers, fold_prauc = [], [], []
risk_models = []

RISK_PARAMS = {
    "objective":         "binary",
    "metric":            "auc",
    "n_estimators":      600,
    "learning_rate":     0.05,
    "num_leaves":        15,
    "min_child_samples": 30,
    "subsample":         0.8,
    "colsample_bytree":  0.8,
    "scale_pos_weight":  (y_risk_s == 0).sum() / max((y_risk_s == 1).sum(), 1),
    "reg_alpha":         0.05,
    "reg_lambda":        1.0,
    "random_state":      42,
    "n_jobs":            -1,
    "verbose":           -1,
}

for fold, (tr_idx, val_idx) in enumerate(tscv.split(X_risk_s)):
    X_tr, X_val = X_risk_s.iloc[tr_idx], X_risk_s.iloc[val_idx]
    y_tr, y_val = y_risk_s[tr_idx], y_risk_s[val_idx]

    if len(np.unique(y_val)) < 2:
        print(f"  Fold {fold+1} | skipped (single class in val)")
        continue

    model = lgb.LGBMClassifier(**RISK_PARAMS)
    model.fit(
        X_tr,
        y_tr,
        eval_set=[(X_val, y_val)],
        callbacks=[
            lgb.early_stopping(50, verbose=False),
            lgb.log_evaluation(-1)
        ]
    )
    proba = model.predict_proba(X_val)[:, 1]
    oof_proba_risk[val_idx] = proba

    auc    = roc_auc_score(y_val, proba)
    prauc  = average_precision_score(y_val, proba)
    brier  = brier_score_loss(y_val, proba)
    fold_aucs.append(auc)
    fold_prauc.append(prauc)
    fold_briers.append(brier)
    print(f"  Fold {fold+1} | AUC: {auc:.3f} | PR-AUC: {prauc:.3f} | Brier: {brier:.4f} | best_iter: {model.best_iteration_}")
    risk_models.append(model)

print(f"\n  Mean OOF AUC:    {np.mean(fold_aucs):.3f}  (target: >0.75)")
print(f"  Mean OOF PR-AUC: {np.mean(fold_prauc):.3f}")
print(f"  Mean OOF Brier:  {np.mean(fold_briers):.4f}  (target: <0.25)")

# ─────────────────────────────────────────────────────────────
# 7. FINAL MODEL + CALIBRATION
# ─────────────────────────────────────────────────────────────
best_iter = int(np.mean([m.best_iteration_ for m in risk_models]) * 1.1)
final_risk = lgb.LGBMClassifier(**{**RISK_PARAMS, "n_estimators": best_iter})
final_risk.fit(X_risk_s, y_risk_s)
imp = pd.DataFrame({
    "feature": available_risk_features,
    "importance": final_risk.feature_importances_
}).sort_values("importance", ascending=False)

print("\nTop 20 Risk Features")
print(imp.head(20))
final_risk.booster_.save_model(os.path.join(OUTPUT_DIR, "risk_model.txt"))
print(f"\n✓ Raw risk model saved → outputs/risk_model.txt")

# Isotonic calibration: manually calibrate raw proba on holdout fold
from sklearn.isotonic import IsotonicRegression
last_tr, last_val = list(tscv.split(X_risk_s))[-1]
base_for_cal = lgb.LGBMClassifier(**{**RISK_PARAMS, "n_estimators": best_iter})
base_for_cal.fit(X_risk_s.iloc[last_tr], y_risk_s[last_tr])
raw_proba_val = base_for_cal.predict_proba(X_risk_s.iloc[last_val])[:, 1]
iso_reg = IsotonicRegression(out_of_bounds="clip")
iso_reg.fit(raw_proba_val, y_risk_s[last_val])
class CalibratedWrapper:
    def __init__(self, base, cal): self.base = base; self.cal = cal
    def predict_proba_calibrated(self, X):
        return self.cal.transform(self.base.predict_proba(X)[:, 1])
calibrated = CalibratedWrapper(base_for_cal, iso_reg)

cal_path = os.path.join(OUTPUT_DIR, "risk_model_calibrated.pkl")
with open(cal_path, "wb") as f:
    pickle.dump({"model": calibrated, "features": available_risk_features}, f)
print(f"✓ Calibrated risk model saved → {cal_path}")

# ─────────────────────────────────────────────────────────────
# 8. CALIBRATION PLOT
# ─────────────────────────────────────────────────────────────
print("\n── Calibration Plot ─────────────────────────────────────")
val_mask = oof_proba_risk > 0   # only folds that were scored
if val_mask.sum() > 20:
    fraction_pos, mean_pred = calibration_curve(
        y_risk_s[val_mask], oof_proba_risk[val_mask], n_bins=10, strategy="quantile"
    )
    plt.figure(figsize=(6, 5))
    plt.plot(mean_pred, fraction_pos, "s-", label="Model")
    plt.plot([0, 1], [0, 1], "k--", label="Perfect calibration")
    plt.xlabel("Mean predicted probability")
    plt.ylabel("Fraction of positives")
    plt.title("Risk Model Calibration Curve")
    plt.legend()
    plt.tight_layout()
    cal_plot_path = os.path.join(OUTPUT_DIR, "risk_calibration_plot.png")
    plt.savefig(cal_plot_path, dpi=120, bbox_inches="tight")
    plt.close()
    print(f"  ✓ Calibration plot saved → {cal_plot_path}")

# ─────────────────────────────────────────────────────────────
# 9. ROC + PR CURVES
# ─────────────────────────────────────────────────────────────
from sklearn.metrics import roc_curve, precision_recall_curve

if val_mask.sum() > 20:
    fpr, tpr, _ = roc_curve(y_risk_s[val_mask], oof_proba_risk[val_mask])
    prec, rec, _ = precision_recall_curve(y_risk_s[val_mask], oof_proba_risk[val_mask])

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

    ax1.plot(fpr, tpr, label=f"AUC = {np.mean(fold_aucs):.3f}")
    ax1.plot([0, 1], [0, 1], "k--")
    ax1.set_xlabel("False Positive Rate"); ax1.set_ylabel("True Positive Rate")
    ax1.set_title("ROC Curve — Zone Risk Model"); ax1.legend()

    ax2.plot(rec, prec, label=f"PR-AUC = {np.mean(fold_prauc):.3f}")
    ax2.axhline(y_risk_s.mean(), color="k", linestyle="--", label="Baseline")
    ax2.set_xlabel("Recall"); ax2.set_ylabel("Precision")
    ax2.set_title("Precision-Recall Curve — Zone Risk Model"); ax2.legend()

    plt.tight_layout()
    roc_path = os.path.join(OUTPUT_DIR, "risk_roc_pr_curves.png")
    plt.savefig(roc_path, dpi=120, bbox_inches="tight")
    plt.close()
    print(f"  ✓ ROC + PR curves saved → {roc_path}")

# ─────────────────────────────────────────────────────────────
# 10. OOF RISK PREDICTIONS CSV
# ─────────────────────────────────────────────────────────────
oof_risk_df = agg_sorted[["zone", "corridor", "start_dow", "hour_block", "start_week",
                           "event_count", "high_impact_count", "target_next_week_high_impact"]].copy()
oof_risk_df["oof_risk_proba"]  = oof_proba_risk
oof_risk_df["oof_risk_pred"]   = (oof_proba_risk >= 0.5).astype(int)
oof_path = os.path.join(OUTPUT_DIR, "oof_risk_predictions.csv")
oof_risk_df.to_csv(oof_path, index=False)
print(f"\n✓ OOF risk predictions saved → {oof_path}")

# ─────────────────────────────────────────────────────────────
# 11. SAVE AGGREGATED TABLE FOR LAYER 4
# ─────────────────────────────────────────────────────────────
# Attach final risk scores to aggregated table
agg_sorted["risk_proba"] = final_risk.predict_proba(X_risk_s)[:, 1]
agg_sorted["risk_label"] = pd.cut(
    agg_sorted["risk_proba"],
    bins=[0, 0.3, 0.6, 0.8, 1.0],
    labels=["LOW", "MEDIUM", "HIGH", "CRITICAL"],
)
agg_path = os.path.join(OUTPUT_DIR, "risk_agg.csv")
agg_sorted.to_csv(agg_path, index=False)
print(f"✓ Aggregated risk table saved → {agg_path}")

# ─────────────────────────────────────────────────────────────
# 12. METADATA
# ─────────────────────────────────────────────────────────────
meta = {
    "features":       available_risk_features,
    "oof_auc":        float(np.mean(fold_aucs)),
    "oof_prauc":      float(np.mean(fold_prauc)),
    "oof_brier":      float(np.mean(fold_briers)),
    "target_balance": float(y_risk_s.mean()),
    "n_buckets":      int(len(agg_sorted)),
}
with open(os.path.join(OUTPUT_DIR, "layer3_meta.json"), "w") as f:
    json.dump(meta, f, indent=2)

print("\n" + "=" * 60)
print("Layer 3 complete.")
print(f"  OOF AUC:    {np.mean(fold_aucs):.3f}")
print(f"  OOF PR-AUC: {np.mean(fold_prauc):.3f}")
print(f"  OOF Brier:  {np.mean(fold_briers):.4f}")
print("=" * 60)
