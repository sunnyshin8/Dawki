from fastapi import APIRouter
import json

router = APIRouter()

with open("outputs/layer2_meta.json", "r") as f:
    layer2 = json.load(f)

with open("outputs/layer3_meta.json", "r") as f:
    layer3 = json.load(f)


@router.get("/model-info")
def model_info():

    return {
        "severity_classifier": {
            "weighted_f1": round(
                layer2["oof_weighted_f1"], 3
            ),
            "classes": layer2["clf_classes"]
        },

        "eta_regressor": {
            "mae_minutes": round(
                layer2["oof_mae"], 2
            )
        },

        "risk_model": {
            "auc": round(
                layer3["oof_auc"], 3
            ),
            "prauc": round(
                layer3["oof_prauc"], 3
            ),
            "brier": round(
                layer3["oof_brier"], 3
            )
        }
    }