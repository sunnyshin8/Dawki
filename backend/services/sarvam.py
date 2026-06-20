"""
Sarvam AI service wrapper : corrected against official API docs.

Translate endpoint : POST https://api.sarvam.ai/translate
  Body: { input, source_language_code, target_language_code, model, speaker_gender, mode }
  Response: { translated_text }

TTS endpoint       : POST https://api.sarvam.ai/text-to-speech
  Body: { text, target_language_code, speaker, model }
  Response: { audios: [base64_string] }

Auth header: api-subscription-key: <key>

Falls back gracefully when SARVAM_API_KEY is not set.
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_BASE = "https://api.sarvam.ai"

# Language code mapping: our short codes → Sarvam BCP-47 codes
LANG_MAP = {
    "en": "en-IN",
    "kn": "kn-IN",
    "hi": "hi-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "ml": "ml-IN",
}


def _has_key() -> bool:
    return bool(SARVAM_API_KEY and SARVAM_API_KEY not in ("", "your_sarvam_key_here"))


def _auth_headers() -> dict:
    return {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }


def translate_text(text: str, target_lang: str = "kn") -> str:
    """
    Translate text to target_lang using Sarvam Translate API.
    Falls back to original text when API key is absent or call fails.

    Official body: { input, source_language_code, target_language_code }
    Official response: { translated_text }
    """
    if not _has_key():
        return text  # graceful no-op

    sarvam_lang = LANG_MAP.get(target_lang, "kn-IN")
    try:
        resp = requests.post(
            f"{SARVAM_BASE}/translate",
            headers=_auth_headers(),
            json={
                "input": text,
                "source_language_code": "en-IN",
                "target_language_code": sarvam_lang,
                "model": "sarvam-translate:v1",
                "speaker_gender": "Male",
                "mode": "formal",
            },
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get("translated_text", text)
    except Exception as e:
        print(f"[Sarvam translate error] {e}")
        return text


def text_to_speech(text: str, lang: str = "en") -> dict:
    """
    Convert text to speech using Sarvam TTS API.
    Returns { audio_base64: str, format: 'wav' } or { audio_base64: None } on fallback.

    Official body: { text, target_language_code, speaker, model }
    Official response: { audios: [base64_string] }
    """
    if not _has_key():
        return {"audio_base64": None, "format": None}

    sarvam_lang = LANG_MAP.get(lang, "en-IN")
    try:
        resp = requests.post(
            f"{SARVAM_BASE}/text-to-speech",
            headers=_auth_headers(),
            json={
                "text": text,
                "target_language_code": sarvam_lang,
                "speaker": "meera",  # supported by bulbul:v3
                "model": "bulbul:v3",
            },
            timeout=15,
        )
        resp.raise_for_status()
        audios = resp.json().get("audios", [])
        if audios:
            return {"audio_base64": audios[0], "format": "wav"}
        return {"audio_base64": None, "format": None}
    except Exception as e:
        print(f"[Sarvam TTS error] {e}")
        return {"audio_base64": None, "format": None}


def broadcast_alert(alert_text: str, alert_type: str = "Traffic Alert") -> dict:
    """
    Translate an alert into all supported Indic languages.
    Returns { original, alert_type, translations: { lang_code: translated_text }, has_key }.
    Falls back to original text for each lang when API key is absent.
    """
    languages = ["kn", "hi", "ta", "te", "ml"]
    translations: dict[str, str] = {"en": alert_text}

    for lang in languages:
        translations[lang] = translate_text(alert_text, lang)

    return {
        "original": alert_text,
        "alert_type": alert_type,
        "translations": translations,
        "has_key": _has_key(),
    }
