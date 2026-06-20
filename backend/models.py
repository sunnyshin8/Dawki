import lightgbm as lgb
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent

def load_booster(path: str | Path) -> lgb.Booster:
    model_path = Path(path)
    if not model_path.is_absolute():
        model_path = BASE_DIR / model_path

    with open(model_path, "r", encoding="utf-8", errors="ignore") as f:
        model_str = f.read().replace("\r\n", "\n")
    return lgb.Booster(model_str=model_str)

severity_clf = load_booster("outputs/severity_clf_model.txt")
severity_reg = load_booster("outputs/severity_reg_model.txt")
risk_model = load_booster("outputs/risk_model.txt")
