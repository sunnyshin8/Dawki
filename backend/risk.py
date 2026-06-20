from fastapi import APIRouter, Query
from backend.schemas import RiskRequest, RiskResponse
from typing import List

import pandas as pd

router = APIRouter()

risk_df = pd.read_csv("outputs/risk_agg.csv")


def _get_risk_for_block(zone: str, corridor: str, hour_block: int) -> dict:
    """Internal helper: returns risk info for a given zone/corridor/hour_block."""
    # Convert block index (0-5) to hour value (0.0, 4.0, 8.0, 12.0, 16.0, 20.0)
    csv_hour = float(hour_block * 4) if hour_block < 6 else float(hour_block)

    subset = risk_df[
        (risk_df["zone"] == zone)
        & (risk_df["corridor"] == corridor)
        & (risk_df["hour_block"] == csv_hour)
    ]
    match_type = "exact"

    if len(subset) == 0:
        match_type = "corridor_hour"
        subset = risk_df[
            (risk_df["corridor"] == corridor)
            & (risk_df["hour_block"] == csv_hour)
        ]

    if len(subset) == 0:
        match_type = "corridor"
        subset = risk_df[risk_df["corridor"] == corridor]

    if len(subset) == 0:
        match_type = "zone"
        subset = risk_df[risk_df["zone"] == zone]

    if len(subset) == 0:
        return {
            "risk_score": 0.0,
            "risk_level": "UNKNOWN",
            "event_count": 0,
            "high_impact_count": 0,
            "match_type": "none",
        }

    row = subset.sort_values("start_week", ascending=False).iloc[0]
    return {
        "risk_score": float(row["risk_proba"]),
        "risk_level": str(row["risk_label"]),
        "event_count": int(row["event_count"]),
        "high_impact_count": int(row["high_impact_count"]),
        "match_type": match_type,
    }


@router.post("/risk", response_model=RiskResponse)
def risk(payload: RiskRequest):
    hour_block = payload.hour // 4
    return _get_risk_for_block(payload.zone, payload.corridor, hour_block)


@router.get("/risk/forecast")
def risk_forecast(
    zone: str = Query(..., description="Zone name, e.g. 'South Zone 1'"),
    corridor: str = Query(..., description="Corridor name, e.g. 'Hosur Road'"),
):
    """
    Returns a 24-hour risk forecast for a corridor broken into 6 four-hour blocks.
    Each block is expanded into 4 hourly slots for frontend rendering.
    Also returns peak_block, safe_blocks, hotspot_hours, and safe_departure_hours.
    """
    BLOCK_LABELS = [
        "00:00–04:00", "04:00–08:00", "08:00–12:00",
        "12:00–16:00", "16:00–20:00", "20:00–24:00",
    ]

    hourly_slots = []
    block_results = []

    for block in range(6):
        data = _get_risk_for_block(zone, corridor, block)
        block_results.append(data)
        start_hour = block * 4
        for h in range(4):
            hour = start_hour + h
            hourly_slots.append({
                "hour": hour,
                "hour_label": f"{hour:02d}:00",
                "hour_block": block,
                "block_label": BLOCK_LABELS[block],
                "risk_score": data["risk_score"],
                "risk_level": data["risk_level"],
            })

    scores = [b["risk_score"] for b in block_results]
    peak_block = int(scores.index(max(scores)))
    safe_blocks = [i for i, s in enumerate(scores) if s < 0.35]
    hotspot_hours = [slot["hour"] for slot in hourly_slots if slot["risk_score"] >= 0.6]
    safe_departure_hours = [slot["hour"] for slot in hourly_slots if slot["risk_score"] < 0.3]

    return {
        "zone": zone,
        "corridor": corridor,
        "hourly_slots": hourly_slots,
        "peak_block": peak_block,
        "peak_block_label": BLOCK_LABELS[peak_block],
        "safe_blocks": safe_blocks,
        "hotspot_hours": hotspot_hours,
        "safe_departure_hours": safe_departure_hours,
        "max_risk_score": max(scores),
        "min_risk_score": min(scores),
    }
