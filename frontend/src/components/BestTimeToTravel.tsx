import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin, Locate, ArrowUpDown, Sparkles, CloudRain, Calendar,
  TrendingDown, AlertTriangle, Timer, CheckCircle, Clock,
  Volume2, VolumeX, Flame, ShieldCheck, Loader2, RefreshCw,
} from 'lucide-react';
// AI_INSIGHTS removed : generated dynamically from live /predict response below
import {
  getZoneAndCorridor, fetchRisk, fetchPredict,
  fetchRiskForecast, textToSpeech, RiskForecastResponse,
} from '../services/api';

interface BestTimeToTravelProps { language: string; }

const LANG_LABELS: Record<string, string> = {
  en: 'English', kn: 'ಕನ್ನಡ', hi: 'हिंदी', ta: 'தமிழ்', te: 'తెలుగు', ml: 'മലയാളം',
};

// Fallback list when API is unavailable
const FALLBACK_PLACES = [
  'Electronic City', 'Hosur Road', 'Silk Board', 'Whitefield', 'Bellandur',
  'Outer Ring Road', 'Peenya', 'Tumkur Road', 'MG Road', 'Vidhana Soudha',
  'Bellary Road', 'Airport (BIAL)', 'Yelahanka', 'Hebbal', 'Koramangala',
  'BTM Layout', 'Jayanagar', 'Bannerghatta Road', 'JP Nagar', 'Manyata Tech Park',
  'Marathahalli', 'Indiranagar', 'Domlur', 'Sarjapur Road', 'HSR Layout',
];

interface Suggestion { name: string; address: string; lat: number; lon: number; }

// ─── Mappls-powered Place Input ────────────────────────────────────────────
function PlaceInput({
  id, value, onChange, placeholder, icon: Icon, iconColor,
}: {
  id: string; value: string; onChange: (v: string, lat?: number, lon?: number) => void;
  placeholder: string; icon: any; iconColor: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  // Fixed-position dropdown coordinates
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQuery(value); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputWrapRef.current && !inputWrapRef.current.contains(e.target as Node)) {
        // Also check if clicking inside the portal dropdown
        const portal = document.getElementById(`portal-${id}`);
        if (portal && portal.contains(e.target as Node)) return;
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [id]);

  const recalcPos = () => {
    if (inputWrapRef.current) {
      const r = inputWrapRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width });
    }
  };

  // Fetch from Mappls API route with debounce
  const fetchSuggestions = async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions(FALLBACK_PLACES.filter(p => p.toLowerCase().includes(q.toLowerCase()))
        .map(name => ({ name, address: 'Bengaluru', lat: 0, lon: 0 })));
      return;
    }
    setApiLoading(true);
    try {
      const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.suggestions?.length > 0) {
        setSuggestions(data.suggestions);
      } else {
        // Fallback to static list
        setSuggestions(
          FALLBACK_PLACES
            .filter(p => p.toLowerCase().includes(q.toLowerCase()))
            .map(name => ({ name, address: 'Bengaluru', lat: 0, lon: 0 }))
        );
      }
    } catch {
      setSuggestions(
        FALLBACK_PLACES
          .filter(p => p.toLowerCase().includes(q.toLowerCase()))
          .map(name => ({ name, address: 'Bengaluru', lat: 0, lon: 0 }))
      );
    } finally {
      setApiLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleFocus = () => {
    recalcPos();
    setOpen(true);
    if (!query) {
      setSuggestions(FALLBACK_PLACES.map(name => ({ name, address: 'Bengaluru', lat: 0, lon: 0 })));
    } else {
      fetchSuggestions(query);
    }
  };

  const select = (s: Suggestion) => {
    setQuery(s.name);
    onChange(s.name, s.lat || undefined, s.lon || undefined);
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <>
      <div ref={inputWrapRef} className="flex-1 min-w-0">
        <div className="glass-input rounded-xl flex items-center px-4 py-3 gap-3 w-full">
          <Icon size={18} className={`${iconColor} shrink-0`} />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-mono text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">
              {placeholder}
            </span>
            <input
              id={id}
              type="text"
              value={query}
              placeholder="Type to search places..."
              onChange={handleChange}
              onFocus={handleFocus}
              autoComplete="off"
              className="w-full bg-transparent border-none p-0 focus:ring-0 font-sans font-semibold text-sm text-on-surface placeholder:text-on-surface-variant/40 placeholder:font-normal"
            />
          </div>
          {apiLoading && <Loader2 size={13} className="text-primary animate-spin shrink-0" />}
        </div>
      </div>

      {/* Fixed-position portal dropdown : renders above ALL elements */}
      {open && suggestions.length > 0 && (
        <div
          id={`portal-${id}`}
          style={{
            position: 'fixed',
            top: dropPos.top,
            left: dropPos.left,
            width: dropPos.width,
            zIndex: 9999,
          }}
          className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
        >
          {suggestions.map((s, i) => (
            <button
              key={`${s.name}-${i}`}
              onMouseDown={() => select(s)}
              className="w-full text-left px-4 py-2.5 flex items-start gap-2.5 hover:bg-[#eff4ff] hover:text-primary border-b border-slate-50 last:border-0 transition-colors"
            >
              <MapPin size={13} className="text-primary/60 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-sans text-sm font-semibold text-on-surface truncate">{s.name}</p>
                {s.address && s.address !== 'Bengaluru' && (
                  <p className="font-sans text-[10px] text-on-surface-variant truncate">{s.address}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function BestTimeToTravel({ language }: BestTimeToTravelProps) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originCoords, setOriginCoords] = useState<{ lat?: number; lon?: number }>({});
  const [destCoords, setDestCoords] = useState<{ lat?: number; lon?: number }>({});

  const [recommendedDeparture, setRecommendedDeparture] = useState(':');
  const [expectedDuration, setExpectedDuration] = useState(':');
  const [activeWindowId, setActiveWindowId] = useState<'rec' | 'early' | 'mid' | 'avoid'>('rec');
  const [leftHandle, setLeftHandle] = useState(30);
  const [rightHandle, setRightHandle] = useState(48);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<any>(null);
  const [livePredict, setLivePredict] = useState<any>(null);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [forecast, setForecast] = useState<RiskForecastResponse | null>(null);

  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const routeReady = origin.trim().length > 1 && destination.trim().length > 1;

  const loadLiveData = useCallback(async () => {
    if (!routeReady) return;
    setLoading(true);
    setError(null);
    try {
      const mapped = getZoneAndCorridor(origin, destination);
      // Override with Mappls coordinates if available
      if (originCoords.lat) { mapped.lat = originCoords.lat; mapped.lon = originCoords.lon!; }

      const [earlyR, recR, midR, avoidR, midDayR, afternoonR, eveningR, nightR, liveP, forecastData] =
        await Promise.all([
          fetchRisk(mapped.zone, mapped.corridor, 6),
          fetchRisk(mapped.zone, mapped.corridor, 7),
          fetchRisk(mapped.zone, mapped.corridor, 10),
          fetchRisk(mapped.zone, mapped.corridor, 8),
          fetchRisk(mapped.zone, mapped.corridor, 12),
          fetchRisk(mapped.zone, mapped.corridor, 16),
          fetchRisk(mapped.zone, mapped.corridor, 18),
          fetchRisk(mapped.zone, mapped.corridor, 20),
          fetchPredict({
            lat: mapped.lat, lon: mapped.lon,
            zone: mapped.zone, corridor: mapped.corridor,
            event_type: 'None', priority: 0,
          }),
          fetchRiskForecast(mapped.zone, mapped.corridor),
        ]);

      setForecast(forecastData);
      const baseEta = liveP.eta_minutes || 35;
      const earlyDur = Math.max(15, Math.round(baseEta * (0.85 + earlyR.risk_score * 0.3)));
      const recDur = Math.max(15, Math.round(baseEta * (0.95 + recR.risk_score * 0.4)));
      const midDur = Math.max(15, Math.round(baseEta * (1.0 + midR.risk_score * 0.5)));
      const avoidDur = Math.max(15, Math.round(baseEta * (1.3 + avoidR.risk_score * 0.8)));

      const earlySavings = avoidDur - earlyDur;
      const recSavings = avoidDur - recDur;
      const midSavings = avoidDur - midDur;

      const safeDep = forecastData?.safe_departure_hours ?? [];
      const earlyH = safeDep.find((h: number) => h >= 5 && h <= 7) ?? 6;
      const recH = safeDep.find((h: number) => h >= 7 && h <= 9) ?? 7;
      const midH = safeDep.find((h: number) => h >= 10 && h <= 12) ?? 10;

      const fmt = (h: number) => {
        const ap = h < 12 ? 'AM' : 'PM';
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${h12.toString().padStart(2, '0')}:${h < 9 ? '45' : '30'} ${ap}`;
      };

      const data = {
        early: { riskScore: earlyR.risk_score, riskLevel: earlyR.risk_level, duration: `${earlyDur} mins`, savings: earlySavings > 0 ? `Saves ${earlySavings}m` : `+${Math.abs(earlySavings)}m`, savingsPct: `${Math.round((earlySavings / avoidDur) * 100)}%`, dynamicTime: fmt(earlyH) },
        rec: { riskScore: recR.risk_score, riskLevel: recR.risk_level, duration: `${recDur} mins`, savings: recSavings > 0 ? `Saves ${recSavings}m` : `+${Math.abs(recSavings)}m`, savingsPct: `${Math.round((recSavings / avoidDur) * 100)}%`, dynamicTime: fmt(recH) },
        mid: { riskScore: midR.risk_score, riskLevel: midR.risk_level, duration: `${midDur} mins`, savings: midSavings > 0 ? `Saves ${midSavings}m` : `+${Math.abs(midSavings)}m`, savingsPct: `${Math.round((midSavings / avoidDur) * 100)}%`, dynamicTime: fmt(midH) },
        avoid: { riskScore: avoidR.risk_score, riskLevel: avoidR.risk_level, duration: `${avoidDur} mins`, savings: 'Peak traffic : worst window', savingsPct: '0%', dynamicTime: '08:30 AM' },
      };

      setLiveData(data);
      setLivePredict(liveP);
      setRecommendedDeparture(data.rec.dynamicTime);
      setExpectedDuration(data.rec.duration);
      setTimelineData([
        { label: 'Early Flow', timeRange: '06:00–08:00', ...earlyR, width: '15%' },
        { label: 'Morning Peak', timeRange: '08:00–10:00', ...avoidR, width: '20%' },
        { label: 'Mid-Day Flow', timeRange: '10:00–14:00', ...midDayR, width: '25%' },
        { label: 'Afternoon Transit', timeRange: '14:00–17:00', ...afternoonR, width: '15%' },
        { label: 'Evening Peak', timeRange: '17:00–20:00', ...eveningR, width: '15%' },
        { label: 'Night Flow', timeRange: '20:00–24:00', ...nightR, width: '10%' },
      ]);
    } catch (err: any) {
      setError('Could not reach the backend. Make sure the server is running on port 8001.');
    } finally {
      setLoading(false);
    }
  }, [origin, destination, originCoords]);

  useEffect(() => {
    if (!routeReady) {
      setLiveData(null); setLivePredict(null); setTimelineData([]);
      setForecast(null); setRecommendedDeparture(':'); setExpectedDuration(':');
      return;
    }
    const t = setTimeout(loadLiveData, 500);
    return () => clearTimeout(t);
  }, [origin, destination]);

  const swapRoute = () => {
    setOrigin(destination); setDestination(origin);
    setOriginCoords(destCoords); setDestCoords(originCoords);
  };

  const alternatives = liveData ? [
    { id: 'early', title: 'Early Bird', time: liveData.early.dynamicTime, impact: liveData.early.riskLevel === 'LOW' ? 'BEST' : liveData.early.riskLevel === 'MEDIUM' ? 'OKAY' : 'AVOID', desc: 'Beat the rush : lowest risk window.', savings: liveData.early.savings, duration: liveData.early.duration, savingsPct: liveData.early.savingsPct },
    { id: 'rec', title: 'Optimal Window', time: liveData.rec.dynamicTime, impact: liveData.rec.riskLevel === 'LOW' ? 'RECOMMENDED' : liveData.rec.riskLevel === 'MEDIUM' ? 'OKAY' : 'AVOID', desc: 'AI-recommended balanced departure.', savings: liveData.rec.savings, duration: liveData.rec.duration, savingsPct: liveData.rec.savingsPct },
    { id: 'mid', title: 'Mid-Morning Flow', time: liveData.mid.dynamicTime, impact: liveData.mid.riskLevel === 'LOW' ? 'BEST' : liveData.mid.riskLevel === 'MEDIUM' ? 'OKAY' : 'AVOID', desc: 'Traffic subsides after morning peak.', savings: liveData.mid.savings, duration: liveData.mid.duration, savingsPct: liveData.mid.savingsPct },
    { id: 'avoid', title: 'Peak Commute', time: liveData.avoid.dynamicTime, impact: 'AVOID', desc: 'Highest density : stop & go expected.', savings: liveData.avoid.savings, duration: liveData.avoid.duration, savingsPct: '0%' },
  ] : [];

  const selectWindow = (id: 'rec' | 'early' | 'mid' | 'avoid') => {
    setActiveWindowId(id);
    const f = alternatives.find(a => a.id === id);
    if (f) {
      setRecommendedDeparture(f.time); setExpectedDuration(f.duration);
      if (id === 'early') { setLeftHandle(20); setRightHandle(35); }
      else if (id === 'rec') { setLeftHandle(30); setRightHandle(48); }
      else if (id === 'mid') { setLeftHandle(60); setRightHandle(75); }
      else { setLeftHandle(40); setRightHandle(55); }
    }
  };

  const handleTTS = async () => {
    if (ttsPlaying && audioRef.current) { audioRef.current.pause(); setTtsPlaying(false); return; }
    setTtsLoading(true);
    try {
      const txt = language === 'kn'
        ? `ಶಿಫಾರಸು ಮಾಡಿದ ನಿರ್ಗಮನ ಸಮಯ ${recommendedDeparture}. ಅವಧಿ ${expectedDuration}.`
        : `Recommended departure is ${recommendedDeparture}. Expected duration is ${expectedDuration}.`;
      const res = await textToSpeech(txt, language);
      if (res.audio_base64) {
        const audio = new Audio(`data:audio/wav;base64,${res.audio_base64}`);
        audioRef.current = audio;
        audio.onended = () => setTtsPlaying(false);
        audio.play(); setTtsPlaying(true);
      } else {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(
          `Recommended departure at ${recommendedDeparture}. Expected ${expectedDuration}.`
        ));
      }
    } catch (e) { console.error('TTS error:', e); }
    finally { setTtsLoading(false); }
  };

  const hotspotHours = forecast?.hotspot_hours ?? [];
  const safeHours = forecast?.safe_departure_hours ?? [];
  const peakLabel = forecast?.peak_block_label ?? '';

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full max-w-5xl mx-auto px-1 select-none">
      {/* Header */}
      <div>
        <h2 className="font-sans font-extrabold text-2xl md:text-3xl text-on-surface tracking-tight mb-1">
          {language === 'kn' ? 'ಪ್ರಯಾಣ ಯೋಜನೆ' : 'Plan Your Journey'}
        </h2>
        <p className="font-sans text-sm text-on-surface-variant">
          {language === 'kn'
            ? 'ದಟ್ಟಣೆಯನ್ನು ತಪ್ಪಿಸಲು ಸೂಕ್ತ ನಿರ್ಗಮನ ಸಮಯ ಹುಡುಕಿ.'
            : 'Search your origin and destination to get real-time AI departure recommendations.'}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={16} className="shrink-0 text-red-500" />
          <span className="flex-1">{error}</span>
          <button onClick={loadLiveData} className="flex items-center gap-1.5 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-full font-semibold text-xs transition-colors cursor-pointer">
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Search + Forecast grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 flex flex-col gap-5">
          {/* Place inputs */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center w-full">
            <PlaceInput
              id="origin"
              value={origin}
              onChange={(v, lat, lon) => { setOrigin(v); if (lat) setOriginCoords({ lat, lon }); }}
              placeholder="Origin"
              icon={Locate}
              iconColor="text-primary"
            />
            <button onClick={swapRoute} id="btn-swap-route"
              className="w-10 h-10 shrink-0 rounded-full bg-white shadow-md border border-white/80 hover:bg-[#eff4ff] hover:text-primary hover:rotate-180 transition-all duration-300 flex items-center justify-center text-on-surface-variant cursor-pointer self-center">
              <ArrowUpDown size={16} />
            </button>
            <PlaceInput
              id="destination"
              value={destination}
              onChange={(v, lat, lon) => { setDestination(v); if (lat) setDestCoords({ lat, lon }); }}
              placeholder="Destination"
              icon={MapPin}
              iconColor="text-error"
            />
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* Time slider */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="font-sans font-bold text-sm text-on-surface">Target Arrival Window</span>
              <span className="font-mono text-xs bg-primary/10 text-primary py-1 px-3 rounded-full font-bold">
                {leftHandle < 35 ? '07:30 AM' : leftHandle < 50 ? '09:00 AM' : '10:30 AM'} – {rightHandle < 50 ? '08:45 AM' : rightHandle < 70 ? '10:00 AM' : '11:45 AM'}
              </span>
            </div>
            <div className="w-full h-12 relative flex items-center">
              <div className="absolute w-full h-2.5 bg-slate-200/80 rounded-full border border-white/50 shadow-inner" />
              <div className="absolute h-2.5 bg-gradient-to-r from-primary-container to-primary rounded-full"
                style={{ left: `${leftHandle}%`, right: `${100 - rightHandle}%` }} />
              <button type="button" className="absolute w-5 h-5 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] border-2 border-primary-container cursor-ew-resize hover:scale-110 transition-transform"
                style={{ left: `calc(${leftHandle}% - 10px)` }} onClick={() => setLeftHandle(leftHandle === 30 ? 20 : 30)} />
              <button type="button" className="absolute w-5 h-5 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] border-2 border-primary cursor-ew-resize hover:scale-110 transition-transform"
                style={{ left: `calc(${rightHandle}% - 10px)` }} onClick={() => setRightHandle(rightHandle === 48 ? 65 : 48)} />
            </div>
            <div className="flex justify-between font-mono text-[9px] text-on-surface-variant uppercase tracking-wider px-1 -mt-2.5">
              <span>06:00 AM</span><span>08:00 AM</span><span>10:00 AM</span><span>12:00 PM</span>
            </div>
          </div>
        </div>

        {/* Live Forecast panel */}
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-white/40 pb-3">
            <div className={`w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 ${loading ? 'animate-pulse' : ''}`}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            </div>
            <h3 className="font-sans font-bold text-sm text-on-surface">Live Route Forecast</h3>
          </div>

          {!routeReady ? (
            <div className="text-center font-sans text-xs text-on-surface-variant py-6 leading-relaxed">
              <MapPin size={24} className="mx-auto mb-2 text-primary/30" />
              Search and select origin & destination above.
            </div>
          ) : livePredict ? (
            <div className="bg-[#eff4ff]/60 border border-[#bcd5ff] p-4 rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-sans text-on-surface-variant font-medium">Predicted Severity:</span>
                <span className={`font-mono font-extrabold uppercase px-2 py-0.5 rounded ${livePredict.severity === 'Critical' ? 'bg-red-100 text-red-800' : livePredict.severity === 'High' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                  }`}>{livePredict.severity}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-sans text-on-surface-variant font-medium">Real-Time ETA:</span>
                <span className="font-mono font-bold text-primary">{livePredict.eta_minutes} mins</span>
              </div>
              <div className="h-px bg-[#bcd5ff]/40 my-1" />
              <div className="flex items-center gap-2 text-xs text-on-surface">
                <CloudRain size={14} className="text-primary shrink-0" />
                <span>Weather: <span className="font-semibold">{livePredict.weather?.condition}</span> ({livePredict.weather?.temperature_c ?? livePredict.weather?.temp}°C)</span>
              </div>
            </div>
          ) : loading ? (
            <div className="text-center text-xs text-on-surface-variant py-4">Loading insights...</div>
          ) : null}

          <div className="flex flex-col gap-3 mt-1">
            {/* Live insights built from real /predict API response */}
            {livePredict ? (() => {
              const temp = livePredict.weather?.temperature_c ?? livePredict.weather?.temp ?? '?';
              const cond = livePredict.weather?.condition ?? 'Unknown';
              const eta = livePredict.eta_minutes ?? '?';
              const sev = livePredict.severity ?? 'Unknown';
              const wind = livePredict.weather?.wind_kph ?? livePredict.weather?.wind_speed;
              const vis = livePredict.weather?.visibility_km ?? livePredict.weather?.visibility;
              const isRainy = /rain|drizzle|shower|storm|thunder/i.test(cond);
              const isHot = typeof temp === 'number' && temp > 33;
              const insights = [
                {
                  icon: isRainy ? CloudRain : TrendingDown,
                  color: isRainy ? 'text-error' : 'text-primary',
                  text: isRainy
                    ? `Rain detected: ${cond} at ${temp}°C. Expect 20–40% higher congestion on wet roads.`
                    : `Weather: ${cond}, ${temp}°C.${isHot ? ' Heat may slow tyre response : increase following distance.' : ' Conditions are favourable for travel.'}`,
                },
                {
                  icon: Calendar,
                  color: 'text-secondary',
                  text: `AI model predicts ${sev} severity congestion. Estimated travel time: ${eta} minutes from departure.`,
                },
                {
                  icon: TrendingDown,
                  color: 'text-primary',
                  text: wind
                    ? `Wind: ${wind} km/h · Visibility: ${vis ?? ':'} km. ${Number(wind) > 30 ? 'High winds : avoid two-wheelers on expressways.' : 'Good visibility for all vehicle types.'}`
                    : `Real-time backend severity: ${sev}. Recommend departing at the optimal window above.`,
                },
              ];
              return insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/40 p-3 rounded-xl border border-white/50 shadow-sm hover:bg-white/60 transition-all">
                  <ins.icon size={16} className={`${ins.color} shrink-0 mt-0.5`} />
                  <p className="font-sans text-xs text-on-surface leading-snug">{ins.text}</p>
                </div>
              ));
            })() : (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-start gap-3 bg-white/30 p-3 rounded-xl border border-white/40 animate-pulse">
                    <div className="w-4 h-4 rounded bg-slate-200 shrink-0 mt-0.5" />
                    <div className="w-full h-3 rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!routeReady && (
        <div className="glass-card rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-3 border border-dashed border-slate-200">
          <div className="w-14 h-14 rounded-full bg-primary/8 flex items-center justify-center">
            <MapPin size={26} className="text-primary/50" />
          </div>
          <h3 className="font-sans font-bold text-sm text-on-surface">No route selected</h3>
          <p className="font-sans text-xs text-on-surface-variant max-w-xs leading-relaxed">
            Search and select your origin and destination from the Mappls-powered search above. Live traffic risk and optimal departure times will load instantly.
          </p>
        </div>
      )}

      {routeReady && (
        <>
          {/* Hotspot Predictions */}
          {(hotspotHours.length > 0 || safeHours.length > 0) && (
            <div className="glass-card rounded-2xl p-6 flex flex-col gap-4 border border-red-100/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                    <Flame size={15} className="text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-sm text-on-surface">Future Hotspot Predictions</h3>
                    <p className="font-sans text-xs text-on-surface-variant mt-0.5">{forecast?.zone} · {forecast?.corridor}</p>
                  </div>
                </div>
                {peakLabel && (
                  <div className="bg-red-50 border border-red-100 text-red-700 font-mono text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                    <Flame size={10} /> Peak: {peakLabel}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hotspotHours.length > 0 && (
                  <div className="bg-red-50/60 border border-red-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={14} className="text-red-500" />
                      <span className="font-mono text-[10px] font-bold text-red-700 uppercase tracking-wider">Avoid These Hours</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {hotspotHours.map((h: number) => (
                        <span key={h} className="bg-red-100 border border-red-200 text-red-800 font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                          {h.toString().padStart(2, '0')}:00
                        </span>
                      ))}
                    </div>
                    <p className="font-sans text-[11px] text-red-600 mt-2">Risk ≥ 60%. Expect significant delays.</p>
                  </div>
                )}
                {safeHours.length > 0 && (
                  <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      <span className="font-mono text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Best Departure Hours</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {safeHours.slice(0, 8).map((h: number) => (
                        <span key={h} className="bg-emerald-100 border border-emerald-200 text-emerald-800 font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                          {h.toString().padStart(2, '0')}:00
                        </span>
                      ))}
                    </div>
                    <p className="font-sans text-[11px] text-emerald-600 mt-2">Risk &lt; 30% : AI-verified low congestion.</p>
                  </div>
                )}
              </div>

              {forecast && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-sans text-xs font-semibold text-on-surface">24-Hour Risk Profile</span>
                    <div className="flex gap-3 font-mono text-[9px] text-on-surface-variant uppercase">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Low</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Med</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> High</span>
                    </div>
                  </div>
                  <div className="h-6 w-full rounded-lg overflow-hidden flex shadow-inner border border-white/40">
                    {forecast.hourly_slots.map((slot, i) => {
                      const color = slot.risk_level === 'LOW' ? 'bg-emerald-400' : slot.risk_level === 'MEDIUM' ? 'bg-amber-400' : 'bg-red-500';
                      return (
                        <div key={i} className={`flex-1 ${color} relative group cursor-pointer`}
                          style={{ opacity: 0.3 + slot.risk_score * 0.7 }}
                          title={`${slot.hour_label}: ${slot.risk_level} (${Math.round(slot.risk_score * 100)}%)`}>
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white font-mono text-[8px] py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                            {slot.hour_label} {Math.round(slot.risk_score * 100)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between font-mono text-[9px] text-on-surface-variant mt-1">
                    <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-end mb-1">
              <div>
                <h3 className="font-sans font-bold text-sm text-on-surface">Route Density Timeline</h3>
                <span className="font-sans text-xs text-on-surface-variant">Real-time forecast for {origin} ➔ {destination}</span>
              </div>
              <div className="flex gap-4 font-mono text-[10px] text-on-surface-variant uppercase font-semibold">
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Flowing</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Moderated</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Jammed</div>
              </div>
            </div>
            <div className="relative w-full h-14 rounded-xl overflow-hidden shadow-inner border border-white/40 flex">
              {loading ? (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center gap-2 font-sans text-xs text-on-surface-variant">
                  <Loader2 size={14} className="animate-spin" /> Loading live timeline...
                </div>
              ) : timelineData.length > 0 ? (
                timelineData.map((slot, i) => {
                  const c = slot.risk_level === 'LOW' ? 'from-emerald-500/20 via-emerald-500/35 to-emerald-500/20'
                    : slot.risk_level === 'MEDIUM' ? 'from-amber-500/30 via-amber-500/45 to-amber-500/30'
                      : 'from-red-500/40 via-red-600/60 to-red-500/40';
                  return (
                    <div key={i} className={`h-full relative group cursor-pointer border-r border-white/20 bg-gradient-to-r ${c}`} style={{ width: slot.width }}>
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white font-mono text-[9px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 shadow-lg font-bold">
                        {slot.label} ({slot.timeRange}): {slot.risk_level} ({Math.round(slot.risk_score * 100)}%)
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center font-sans text-xs text-on-surface-variant">Select a route to see timeline.</div>
              )}
              <div className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 shadow-[0_0_8px_rgba(0,115,221,0.8)] transition-all duration-300"
                style={{ left: activeWindowId === 'early' ? '10%' : activeWindowId === 'rec' ? '20%' : activeWindowId === 'mid' ? '45%' : '25%' }}>
                <div className="absolute -top-3.5 -translate-x-1/2 bg-primary text-white font-mono text-[8px] font-bold py-0.5 px-2 rounded-full shadow-md uppercase">
                  {recommendedDeparture}
                </div>
              </div>
            </div>
            <div className="flex justify-between font-mono text-[10px] text-on-surface-variant font-medium px-2">
              <span>12 AM</span><span>4 AM</span><span>8 AM</span><span>12 PM</span><span>4 PM</span><span>8 PM</span><span>12 AM</span>
            </div>
          </div>

          {/* Bottom grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
            <div className="flex flex-col gap-4">
              <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[160px] border-2 border-white/60 bg-gradient-to-br from-white/90 to-primary/5">
                <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#eff4ff]/65 rounded-full blur-2xl" />
                <span className="font-sans font-bold text-xs text-on-surface-variant mb-1 flex items-center gap-1.5 relative z-10 uppercase tracking-widest">
                  <CheckCircle size={14} className="text-[#006b57]" /> Optimal Commuter Departure
                </span>
                <div className="font-sans font-extrabold text-[#005bb1] text-5xl leading-tight mb-2 tracking-tight drop-shadow-sm relative z-10">
                  {loading ? <Loader2 size={36} className="animate-spin text-primary/40" /> : recommendedDeparture}
                </div>
                <div className="bg-secondary-container/50 border border-secondary text-on-secondary-container px-4 py-1 rounded-full font-mono text-[11px] font-bold flex items-center gap-2 relative z-10 mb-3">
                  <Clock size={12} /> Expected: {expectedDuration}
                </div>
                <button id="btn-tts-departure" onClick={handleTTS} disabled={ttsLoading || !liveData}
                  className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-sm ${ttsPlaying ? 'bg-primary text-white animate-pulse' : 'bg-white/80 border border-primary/20 text-primary hover:bg-primary/10'} disabled:opacity-60 disabled:cursor-not-allowed`}>
                  {ttsLoading ? <Loader2 size={14} className="animate-spin" /> : ttsPlaying ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  <span>{ttsLoading ? 'Loading...' : ttsPlaying ? 'Stop' : `Read Aloud (${LANG_LABELS[language] ?? 'EN'})`}</span>
                </button>
              </div>
              {(() => {
                const hr = timelineData.find(s => s.risk_level === 'HIGH' || s.risk_level === 'CRITICAL');
                if (!hr) return null;
                return (
                  <div className="bg-red-50/70 border border-red-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-error text-white flex items-center justify-center shrink-0"><AlertTriangle size={18} /></div>
                    <div>
                      <h4 className="font-sans font-bold text-xs text-red-900 uppercase">Avoid Departure Slot</h4>
                      <p className="font-sans text-xs text-red-700 mt-0.5">Departing during <span className="font-bold">{hr.label}</span> ({hr.timeRange}) adds delays. AI predicts <span className="font-bold">{Math.round(hr.risk_score * 100)}%</span> risk.</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="glass-card rounded-2xl p-5 flex flex-col gap-3">
              <h3 className="font-sans font-bold text-sm text-on-surface mb-1.5 px-1">Alternative Departure Windows</h3>
              {alternatives.length === 0 ? (
                <div className="text-center text-xs text-on-surface-variant py-8">{loading ? 'Calculating windows...' : 'No data.'}</div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {alternatives.map(item => {
                    const isActive = activeWindowId === item.id;
                    const isAvoid = item.impact === 'AVOID';
                    const isBest = item.impact === 'BEST' || item.impact === 'RECOMMENDED';
                    return (
                      <button key={item.id} id={`btn-window-alt-${item.id}`} onClick={() => selectWindow(item.id as any)}
                        className={`w-full text-left p-3.5 rounded-xl flex items-center justify-between transition-all duration-300 shadow-sm border cursor-pointer ${isActive ? 'bg-white border-primary-container scale-[1.015] shadow-md' : 'bg-white/40 border-white/50 hover:bg-white'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center ${isActive ? 'bg-primary text-white' : 'bg-slate-100 border border-slate-200 text-on-surface-variant'}`}>
                            <span className="font-sans font-bold text-xs leading-none">{item.time.split(' ')[0]}</span>
                            <span className="font-mono text-[8px] leading-none uppercase font-bold mt-1">{item.time.split(' ')[1]}</span>
                          </div>
                          <div>
                            <h4 className={`font-sans font-bold text-xs ${isActive ? 'text-primary' : 'text-on-surface'}`}>{item.title}</h4>
                            <p className="font-sans text-[11px] text-on-surface-variant leading-snug mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full font-mono text-[9px] font-bold uppercase flex items-center gap-1 ${isAvoid ? 'bg-error-container text-on-error-container' : isBest ? 'bg-emerald-100 text-[#005141]' : 'bg-amber-100 text-amber-900'}`}>
                          <Timer size={10} />{item.savings}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
