const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RiskPayload {
  zone: string;
  corridor: string;
  hour: number;
}

export interface RiskResponse {
  risk_score: number;
  risk_level: string;
  event_count: number;
  high_impact_count: number;
  match_type: string;
}

export interface HourlySlot {
  hour: number;
  hour_label: string;
  hour_block: number;
  block_label: string;
  risk_score: number;
  risk_level: string;
}

export interface RiskForecastResponse {
  zone: string;
  corridor: string;
  hourly_slots: HourlySlot[];
  peak_block: number;
  peak_block_label: string;
  safe_blocks: number[];
  hotspot_hours: number[];
  safe_departure_hours: number[];
  max_risk_score: number;
  min_risk_score: number;
}

export interface PredictPayload {
  lat: number;
  lon: number;
  zone: string;
  corridor: string;
  event_type: string;
  priority: number;
}

export interface WeatherInfo {
  temp?: number;
  temperature_c?: number;
  humidity?: number;
  wind_speed?: number;
  wind_kph?: number;
  visibility?: number;
  visibility_km?: number;
  condition: string;
  [key: string]: any;
}

export interface PredictResponse {
  severity: string;
  eta_minutes: number;
  weather: WeatherInfo;
}

export interface ModelInfoResponse {
  severity_classifier: {
    weighted_f1: number;
    classes: string[];
  };
  eta_regressor: {
    mae_minutes: number;
  };
  risk_model: {
    auc: number;
    prauc: number;
    brier: number;
  };
}

export interface TranslateResponse {
  original: string;
  translated_text: string;
  target_lang: string;
}

export interface TTSResponse {
  text: string;
  lang: string;
  audio_base64: string | null;
  format: string | null;
}

export interface AlertBroadcastResponse {
  original: string;
  alert_type: string;
  translations: Record<string, string>;
  has_key: boolean;
}

// ─── Zone / Corridor Mapper ───────────────────────────────────────────────────

/**
 * Maps search terms / origin-destination descriptions to one of the exact
 * zones and corridors used by the model.
 */
export function getZoneAndCorridor(origin: string, destination: string) {
  const text = `${origin} ${destination}`.toLowerCase();

  let zone = 'South Zone 1';
  let corridor = 'Hosur Road';
  let lat = 12.9716;
  let lon = 77.5946;

  if (
    text.includes('whitefield') ||
    text.includes('bellandur') ||
    text.includes('orr east') ||
    text.includes('outer ring')
  ) {
    zone = 'East Zone 1';
    corridor = 'ORR East 1';
    lat = 12.9279;
    lon = 77.6801;
  } else if (
    text.includes('tumkur') ||
    text.includes('peenya') ||
    text.includes('west')
  ) {
    zone = 'West Zone 1';
    corridor = 'Tumkur Road';
    lat = 13.0335;
    lon = 77.564;
  } else if (
    text.includes('vidhana') ||
    text.includes('cbd') ||
    text.includes('central') ||
    text.includes('soudha')
  ) {
    zone = 'Central Zone 1';
    corridor = 'CBD 1';
    lat = 12.9796;
    lon = 77.5906;
  } else if (
    text.includes('bellary') ||
    text.includes('airport') ||
    text.includes('north') ||
    text.includes('yelahanka')
  ) {
    zone = 'North Zone 1';
    corridor = 'Bellary Road 1';
    lat = 13.0359;
    lon = 77.5978;
  } else if (
    text.includes('electronic') ||
    text.includes('hosur') ||
    text.includes('south') ||
    text.includes('silk board')
  ) {
    zone = 'South Zone 1';
    corridor = 'Hosur Road';
    lat = 12.8452;
    lon = 77.6635;
  }

  return { zone, corridor, lat, lon };
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export async function fetchRisk(
  zone: string,
  corridor: string,
  hour: number,
): Promise<RiskResponse> {
  const response = await fetch(`${API_URL}/risk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zone, corridor, hour }),
  });
  if (!response.ok) throw new Error(`Failed to fetch risk: ${response.statusText}`);
  return response.json();
}

export async function fetchRiskForecast(
  zone: string,
  corridor: string,
): Promise<RiskForecastResponse> {
  const params = new URLSearchParams({ zone, corridor });
  const response = await fetch(`${API_URL}/risk/forecast?${params}`);
  if (!response.ok) throw new Error(`Failed to fetch risk forecast: ${response.statusText}`);
  return response.json();
}

export async function fetchPredict(payload: PredictPayload): Promise<PredictResponse> {
  const response = await fetch(`${API_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: payload.lat,
      lon: payload.lon,
      zone: payload.zone,
      corridor: payload.corridor,
      event_type: payload.event_type,
      priority: payload.priority,
    }),
  });
  if (!response.ok) throw new Error(`Failed to fetch prediction: ${response.statusText}`);
  return response.json();
}

export async function fetchModelInfo(): Promise<ModelInfoResponse> {
  const response = await fetch(`${API_URL}/model-info`);
  if (!response.ok) throw new Error(`Failed to fetch model info: ${response.statusText}`);
  return response.json();
}

export async function translateText(
  text: string,
  targetLang: string,
): Promise<TranslateResponse> {
  const response = await fetch(`${API_URL}/sarvam/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, target_lang: targetLang }),
  });
  if (!response.ok) throw new Error(`Sarvam translate failed: ${response.statusText}`);
  return response.json();
}

export async function textToSpeech(text: string, lang: string): Promise<TTSResponse> {
  const response = await fetch(`${API_URL}/sarvam/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, lang }),
  });
  if (!response.ok) throw new Error(`Sarvam TTS failed: ${response.statusText}`);
  return response.json();
}

export async function broadcastAlert(
  alertText: string,
  alertType: string = 'Traffic Alert',
): Promise<AlertBroadcastResponse> {
  const response = await fetch(`${API_URL}/sarvam/alert-broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alert_text: alertText, alert_type: alertType }),
  });
  if (!response.ok) throw new Error(`Sarvam alert-broadcast failed: ${response.statusText}`);
  return response.json();
}
