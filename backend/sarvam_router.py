"""
Sarvam AI FastAPI router.
Exposes /sarvam/translate, /sarvam/tts, and /sarvam/alert-broadcast.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from backend.services.sarvam import translate_text, text_to_speech, broadcast_alert

router = APIRouter(prefix="/sarvam", tags=["sarvam"])


class TranslateRequest(BaseModel):
    text: str
    target_lang: str = "kn"  # en | kn | hi | ta | te | ml


class TTSRequest(BaseModel):
    text: str
    lang: str = "en"


class AlertBroadcastRequest(BaseModel):
    alert_text: str
    alert_type: str = "Traffic Alert"


@router.post("/translate")
def sarvam_translate(payload: TranslateRequest):
    """Translate text to a target Indian language."""
    result = translate_text(payload.text, payload.target_lang)
    return {
        "original": payload.text,
        "translated_text": result,
        "target_lang": payload.target_lang,
    }


@router.post("/tts")
def sarvam_tts(payload: TTSRequest):
    """Convert text to speech audio (base64 WAV)."""
    result = text_to_speech(payload.text, payload.lang)
    return {
        "text": payload.text,
        "lang": payload.lang,
        "audio_base64": result["audio_base64"],
        "format": result["format"],
    }


@router.post("/alert-broadcast")
def sarvam_alert_broadcast(payload: AlertBroadcastRequest):
    """
    Translate an alert into all 5 Indic languages.
    Returns dict with translations for en, kn, hi, ta, te, ml.
    """
    return broadcast_alert(payload.alert_text, payload.alert_type)
