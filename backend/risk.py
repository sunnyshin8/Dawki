from fastapi import APIRouter
from backend.schemas import RiskRequest

import pandas as pd

router = APIRouter()

risk_df = pd.read_csv("outputs/risk_agg.csv")


@router.post("/risk")

def risk(payload: RiskRequest):

    
    
    print("INPUT ZONE:", repr(payload.zone))
    print("INPUT CORRIDOR:", repr(payload.corridor))

    print("\nSample zones:")
    print(risk_df["zone"].drop_duplicates().head(20).tolist())

    print("\nSample corridors:")
    print(risk_df["corridor"].drop_duplicates().head(20).tolist())


    hour_block = payload.hour // 4

# Level 1: exact match
    subset = risk_df[
        (risk_df["zone"] == payload.zone)
        &
        (risk_df["corridor"] == payload.corridor)
        &
        (risk_df["hour_block"] == hour_block)
    ]

    # Level 2: corridor + hour
    if len(subset) == 0:
        subset = risk_df[
            (risk_df["corridor"] == payload.corridor)
            &
            (risk_df["hour_block"] == hour_block)
        ]

    # Level 3: corridor only
    if len(subset) == 0:
        subset = risk_df[
            risk_df["corridor"] == payload.corridor
        ]

    # Level 4: zone only
    if len(subset) == 0:
        subset = risk_df[
            risk_df["zone"] == payload.zone
        ]

    # Final fallback
    if len(subset) == 0:
        return {
            "risk_score": None,
            "risk_level": "UNKNOWN",
            "message": "No historical data available"
        }

    row = subset.sort_values(
        "start_week",
        ascending=False
    ).iloc[0]

    return {
        "risk_score": float(row["risk_proba"]),
        "risk_level": str(row["risk_label"]),
        "event_count": int(row["event_count"]),
        "high_impact_count": int(row["high_impact_count"])
    }
from backend.schemas import (
    RiskRequest,
    RiskResponse
)

@router.post(
    "/risk",
    response_model=RiskResponse
)
def risk(payload: RiskRequest):
    ...