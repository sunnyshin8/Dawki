import sys
import os
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://localhost:8001"
SARVAM_KEY = os.getenv("SARVAM_API_KEY") or os.getenv("NEXT_PUBLIC_SARVAM_API_KEY")

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

SAMPLE_PREDICT = {
    "lat": 12.8452,
    "lon": 77.6635,
    "zone": "South Zone 1",
    "corridor": "Hosur Road",
    "event_type": "None",
    "priority": 0,
}

SAMPLE_RISK = {
    "zone": "South Zone 1",
    "corridor": "Hosur Road",
    "hour": 8,
}

results: list[tuple[str, bool, str]] = []


def check(name: str, fn):
    """Run a check function, record pass/fail."""
    try:
        fn()
        results.append((name, True, ""))
        print(f"  {GREEN}[PASS]{RESET} {name}")
    except AssertionError as e:
        results.append((name, False, str(e)))
        print(f"  {RED}[FAIL]{RESET} {name}: {e}")
    except Exception as e:
        results.append((name, False, str(e)))
        print(f"  {RED}[FAIL]{RESET} {name}: {e}")


# ─── Test functions ───────────────────────────────────────────────────────────

def test_health():
    r = requests.get(f"{BASE_URL}/health", timeout=10)
    assert r.status_code == 200, f"Status {r.status_code}"
    data = r.json()
    assert data.get("status") == "healthy", f"status != healthy: {data}"


def test_model_info():
    r = requests.get(f"{BASE_URL}/model-info", timeout=10)
    assert r.status_code == 200, f"Status {r.status_code}"
    data = r.json()
    assert "severity_classifier" in data, "missing severity_classifier"
    assert "eta_regressor" in data, "missing eta_regressor"
    assert "risk_model" in data, "missing risk_model"
    f1 = data["severity_classifier"]["weighted_f1"]
    assert isinstance(f1, float) and f1 > 0, f"Bad F1: {f1}"
    print(f"       Severity F1={f1}  ETA MAE={data['eta_regressor']['mae_minutes']}m  Risk AUC={data['risk_model']['auc']}", end="")


def test_predict():
    r = requests.post(f"{BASE_URL}/predict", json=SAMPLE_PREDICT, timeout=15)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text[:200]}"
    data = r.json()
    assert "severity" in data, f"missing severity: {data}"
    assert "eta_minutes" in data, f"missing eta_minutes: {data}"
    assert "weather" in data, f"missing weather: {data}"
    assert isinstance(data["eta_minutes"], float), f"eta_minutes not float: {data['eta_minutes']}"
    print(f"       severity={data['severity']}  eta={data['eta_minutes']}m  weather={data['weather'].get('condition', '?')}", end="")


def test_risk():
    r = requests.post(f"{BASE_URL}/risk", json=SAMPLE_RISK, timeout=10)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text[:200]}"
    data = r.json()
    assert "risk_score" in data, f"missing risk_score: {data}"
    assert "risk_level" in data, f"missing risk_level: {data}"
    assert 0.0 <= data["risk_score"] <= 1.0, f"risk_score out of range: {data['risk_score']}"
    print(f"       score={data['risk_score']:.3f}  level={data['risk_level']}  match={data['match_type']}", end="")


def test_risk_forecast():
    params = {"zone": "South Zone 1", "corridor": "Hosur Road"}
    r = requests.get(f"{BASE_URL}/risk/forecast", params=params, timeout=10)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text[:200]}"
    data = r.json()
    assert "hourly_slots" in data, f"missing hourly_slots: {data}"
    assert len(data["hourly_slots"]) == 24, f"expected 24 slots, got {len(data['hourly_slots'])}"
    assert "hotspot_hours" in data, "missing hotspot_hours"
    assert "safe_departure_hours" in data, "missing safe_departure_hours"
    assert "peak_block_label" in data, "missing peak_block_label"
    print(f"       peak={data['peak_block_label']}  hotspots={data['hotspot_hours']}  safe={data['safe_departure_hours'][:4]}...", end="")


def test_sarvam_translate():
    if not SARVAM_KEY:
        results.append(("POST /sarvam/translate", None, "SKIPPED : SARVAM_API_KEY not set"))
        print(f"  {YELLOW}[SKIP]{RESET} POST /sarvam/translate: skipped (no API key)")
        return
    payload = {"text": "Heavy traffic on Hosur Road. Expect delays.", "target_lang": "kn"}
    r = requests.post(f"{BASE_URL}/sarvam/translate", json=payload, timeout=15)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text[:200]}"
    data = r.json()
    assert "translated_text" in data, f"missing translated_text: {data}"
    translated = data["translated_text"]
    assert isinstance(translated, str) and len(translated) > 0, "empty translated_text"
    print(f"       '{translated[:60]}...'", end="")
    results.append(("POST /sarvam/translate", True, ""))
    print(f"\n  {GREEN}[PASS]{RESET} POST /sarvam/translate", end="\n")
    return


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print(f"\n{BOLD}{CYAN}Dawki API : End-to-End Verification{RESET}")
    print(f"{CYAN}Target: {BASE_URL}{RESET}")
    print("-" * 55)

    check("GET  /health",          test_health)
    check("GET  /model-info",      test_model_info);   print()
    check("POST /predict",         test_predict);      print()
    check("POST /risk",            test_risk);         print()
    check("GET  /risk/forecast",   test_risk_forecast); print()
    test_sarvam_translate()

    print("\n" + "-" * 55)
    passed  = sum(1 for _, ok, _ in results if ok is True)
    skipped = sum(1 for _, ok, _ in results if ok is None)
    failed  = sum(1 for _, ok, _ in results if ok is False)
    total   = len(results)

    print(f"{BOLD}Results: {GREEN}{passed} passed{RESET}  {YELLOW}{skipped} skipped{RESET}  {RED}{failed} failed{RESET}  (of {total})")

    if failed:
        print(f"\n{RED}Failed checks:{RESET}")
        for name, ok, msg in results:
            if ok is False:
                print(f"  * {name}: {msg}")
        sys.exit(1)
    else:
        print(f"\n{GREEN}{BOLD}[OK] All checks passed! Frontend -> FastAPI -> Models -> Weather path is healthy.{RESET}")
        sys.exit(0)


if __name__ == "__main__":
    main()
