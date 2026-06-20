import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, MapPin, AlertTriangle, Timer, Map, Compass, Search,
  CheckCircle, Clock, Plus, Minus, Locate, CloudRain, Zap, Activity, Loader2
} from 'lucide-react';
import { RouteOption } from '../types';
import { fetchRisk, fetchPredict, getZoneAndCorridor } from '../services/api';

const FALLBACK_PLACES = [
  'Electronic City', 'Hosur Road', 'Silk Board', 'Whitefield', 'Bellandur',
  'Outer Ring Road', 'Peenya', 'Tumkur Road', 'MG Road', 'Vidhana Soudha',
  'Bellary Road', 'Airport (BIAL)', 'Yelahanka', 'Hebbal', 'Koramangala',
  'BTM Layout', 'Jayanagar', 'Bannerghatta Road', 'JP Nagar', 'Manyata Tech Park',
  'Marathahalli', 'Indiranagar', 'Domlur', 'Sarjapur Road', 'HSR Layout',
];

interface Suggestion { name: string; address: string; lat: number; lon: number; }

interface RoutesAnalysisProps {
  language: string;
}

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
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputWrapRef.current && !inputWrapRef.current.contains(e.target as Node)) {
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
        setSuggestions(FALLBACK_PLACES.filter(p => p.toLowerCase().includes(q.toLowerCase()))
          .map(name => ({ name, address: 'Bengaluru', lat: 0, lon: 0 })));
      }
    } catch {
      setSuggestions(FALLBACK_PLACES.filter(p => p.toLowerCase().includes(q.toLowerCase()))
        .map(name => ({ name, address: 'Bengaluru', lat: 0, lon: 0 })));
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
        <div className="bg-white/60 focus-within:bg-white border border-white/50 rounded-xl flex items-center px-3.5 py-2.5 gap-2.5 w-full shadow-sm">
          <Icon size={15} className={`${iconColor} shrink-0`} />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-mono text-[8px] text-on-surface-variant font-bold uppercase tracking-wider leading-none mb-0.5">
              {placeholder}
            </span>
            <input
              id={id}
              type="text"
              value={query}
              onChange={handleChange}
              onFocus={handleFocus}
              autoComplete="off"
              className="w-full bg-transparent border-none p-0 focus:ring-0 font-sans font-semibold text-xs text-on-surface placeholder:text-on-surface-variant/40"
            />
          </div>
          {apiLoading && <Loader2 size={13} className="text-primary animate-spin shrink-0" />}
        </div>
      </div>

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
              className="w-full text-left px-4 py-2.5 flex items-start gap-2.5 hover:bg-[#eff4ff] hover:text-primary border-b border-slate-50 last:border-0 transition-colors cursor-pointer"
            >
              <MapPin size={13} className="text-primary/60 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-sans text-xs font-semibold text-on-surface truncate">{s.name}</p>
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

// Extended RouteOption with corridor score and live weather
interface LiveRoute extends RouteOption {
  corridorScore: number;
  weatherCondition: string;
  weatherTemp: number;
  severity: string;
  etaMinutes: number;
}

function buildCorridorScore(riskScore: number, etaMinutes: number, condition: string): number {
  const baseEta = 35;
  const etaPenalty = Math.min(100, Math.max(0, ((etaMinutes - baseEta) / baseEta) * 100));
  const weatherPenalty = (
    condition.toLowerCase().includes('rain') ? 70 :
      condition.toLowerCase().includes('fog') ? 60 :
        condition.toLowerCase().includes('storm') ? 90 :
          10
  );
  return Math.round(riskScore * 50 + etaPenalty * 0.3 + weatherPenalty * 0.2);
}

function buildDynamicAlerts(routeId: string, riskRes: any, predictRes: any) {
  const alerts: any[] = [];
  const risk = riskRes.risk_level as string;
  const sev = predictRes.severity as string;
  const cond = (predictRes.weather?.condition ?? '').toLowerCase();
  const eta = predictRes.eta_minutes as number;
  const temp = predictRes.weather?.temperature_c ?? predictRes.weather?.temp ?? '--';

  if (risk === 'HIGH' || risk === 'CRITICAL') {
    alerts.push({
      id: `${routeId}-risk`,
      type: 'congestion',
      title: `${risk} Congestion Risk on Corridor`,
      desc: `Live model scores this corridor at ${Math.round(riskRes.risk_score * 100)}% risk with ${riskRes.event_count} active incidents. ${riskRes.high_impact_count} high-impact events recorded.`,
      impact: `+${Math.round(eta * 0.3)}m delay predicted`,
      severity: risk === 'CRITICAL' ? 'critical' : 'medium',
    });
  }

  if (sev === 'Critical' || sev === 'High') {
    alerts.push({
      id: `${routeId}-sev`,
      type: 'incident',
      title: `${sev} Severity Incident Detected`,
      desc: `LightGBM classifier predicts ${sev.toLowerCase()} impact. Estimated clearance time: ${Math.round(eta)} minutes.`,
      impact: `ETA: ${Math.round(eta)}m`,
      severity: sev === 'Critical' ? 'critical' : 'medium',
    });
  }

  if (cond.includes('rain') || cond.includes('storm') || cond.includes('fog')) {
    alerts.push({
      id: `${routeId}-weather`,
      type: 'weather',
      title: `Weather Advisory: ${predictRes.weather?.condition}`,
      desc: `Current conditions: ${predictRes.weather?.condition} at ${temp}°C. Reduced visibility and wet roads increase incident probability.`,
      impact: 'Reduce speed  slippery conditions',
      severity: cond.includes('storm') ? 'critical' : 'medium',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: `${routeId}-clear`,
      type: 'clear',
      title: 'No Active Hazardous Incidents',
      desc: `Corridor reporting clear flow. Weather: ${predictRes.weather?.condition ?? 'Clear'} (${temp}°C). ETA approximately ${Math.round(eta)} minutes.`,
      impact: 'Seamless Flow',
      severity: 'safe',
    });
  }

  return alerts;
}

export default function RoutesAnalysis({ language }: RoutesAnalysisProps) {
  const [origin, setOrigin] = useState('Vidhana Soudha');
  const [destination, setDestination] = useState('Electronic City Phase 1');
  const [destCoords, setDestCoords] = useState<{ lat?: number; lon?: number }>({});

  const [selectedRouteId, setSelectedRouteId] = useState<string>('hosur');
  const [zoomLevel, setZoomLevel] = useState<number>(3);
  const [loading, setLoading] = useState(false);
  const [dynamicAlerts, setDynamicAlerts] = useState<Record<string, any[]>>({});
  const [routes, setRoutes] = useState<LiveRoute[]>([]);

  // Compute dynamic routes options list
  useEffect(() => {
    let active = true;
    async function loadLiveRoutes() {
      setLoading(true);
      try {
        const mapped = getZoneAndCorridor(origin, destination);
        if (destCoords.lat) {
          mapped.lat = destCoords.lat;
          mapped.lon = destCoords.lon!;
        }

        const routeOptionsList: RouteOption[] = [
          {
            id: 'hosur',
            name: `Via ${mapped.corridor}`,
            nameKa: `${mapped.corridor} ಮೂಲಕ`,
            distance: destCoords.lat ? '19.8 km' : '18.5 km',
            duration: 38,
            riskLevel: 'Low',
            riskPct: 15,
            description: `Main route mapping directly to ${mapped.corridor}.`,
            svgPath: 'M 100 200 L 250 200 L 485 240 L 700 280'
          },
          {
            id: 'inner-ring',
            name: 'Via Inner Ring Rd',
            nameKa: 'ಹೊರ ವರ್ತುಲ ರಸ್ತೆ ಮೂಲಕ',
            distance: '21.2 km',
            duration: 51,
            riskLevel: 'Medium',
            riskPct: 45,
            description: 'Moderate alternative route corridor mapping to ORR East 1.',
            svgPath: 'M 100 200 Q 250 80 440 220 T 700 280'
          },
          {
            id: 'nice-road',
            name: 'Via NICE Road',
            nameKa: 'ನೈಸ್ ರಸ್ತೆ ಮೂಲಕ',
            distance: '28.0 km',
            duration: 58,
            riskLevel: 'Low',
            riskPct: 20,
            description: 'Longer distance highway route corridor mapping to Tumkur Road.',
            svgPath: 'M 100 200 L 280 340 L 520 340 L 700 280'
          }
        ];

        const allAlerts: Record<string, any[]> = {};
        const updated = await Promise.all(routeOptionsList.map(async route => {
          let routeZone = mapped.zone;
          let routeCorr = mapped.corridor;
          let routeLat = mapped.lat;
          let routeLon = mapped.lon;

          if (route.id === 'inner-ring') {
            routeZone = 'East Zone 1';
            routeCorr = 'ORR East 1';
            routeLat = 12.9279;
            routeLon = 77.6801;
          } else if (route.id === 'nice-road') {
            routeZone = 'West Zone 1';
            routeCorr = 'Tumkur Road';
            routeLat = 13.0335;
            routeLon = 77.5640;
          }

          const now = new Date();
          try {
            const [riskRes, predictRes] = await Promise.all([
              fetchRisk(routeZone, routeCorr, now.getHours()),
              fetchPredict({
                lat: routeLat, lon: routeLon,
                zone: routeZone, corridor: routeCorr,
                event_type: 'None', priority: 0,
              })
            ]);

            const cond = predictRes.weather?.condition ?? 'Clear';
            const temp = predictRes.weather?.temperature_c ?? predictRes.weather?.temp ?? 0;
            const score = buildCorridorScore(riskRes.risk_score, predictRes.eta_minutes, cond);

            allAlerts[route.id] = buildDynamicAlerts(route.id, riskRes, predictRes);

            return {
              ...route,
              duration: Math.round(predictRes.eta_minutes),
              riskPct: Math.round(riskRes.risk_score * 100),
              riskLevel: riskRes.risk_level as any,
              corridorScore: score,
              weatherCondition: cond,
              weatherTemp: typeof temp === 'number' ? temp : Number(temp),
              severity: predictRes.severity,
              etaMinutes: predictRes.eta_minutes,
              description: `Real-time forecast: ${predictRes.severity} impact, ${Math.round(predictRes.eta_minutes)}m travel. Weather: ${cond} (${temp}°C).`,
            } as LiveRoute;
          } catch {
            allAlerts[route.id] = [{ id: `${route.id}-err`, type: 'clear', title: 'Live data unavailable', desc: 'Using last known data for this route.', impact: 'N/A', severity: 'low' }];
            return { ...route, corridorScore: 50, weatherCondition: 'N/A', weatherTemp: 0, severity: 'Low', etaMinutes: route.duration } as LiveRoute;
          }
        }));

        if (active) {
          setRoutes(updated);
          setDynamicAlerts(allAlerts);
        }
      } catch (err) {
        console.error('Error fetching routes live data:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLiveRoutes();
    return () => { active = false; };
  }, [origin, destination, destCoords]);

  const activeRoute = routes.find(r => r.id === selectedRouteId) || routes[0] || {
    id: 'hosur', name: 'Via Hosur Road', nameKa: 'ಹೊಸೂರು ರಸ್ತೆ ಮೂಲಕ', duration: 40, distance: '18km', riskLevel: 'Low', riskPct: 15, description: '', svgPath: ''
  };
  const activeAlerts = dynamicAlerts[selectedRouteId] ?? [];
  const bestRouteId = routes.reduce((best, r) => r.corridorScore < best.corridorScore ? r : best, routes[0])?.id;

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full max-w-5xl mx-auto px-1 select-none">

      {/* Search inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/40 p-4 rounded-2xl border border-white/50 shadow-sm">
        <PlaceInput
          id="routes-origin"
          value={origin}
          onChange={(v) => setOrigin(v)}
          placeholder="Origin checkpoint"
          icon={MapPin}
          iconColor="text-primary"
        />
        <PlaceInput
          id="routes-destination"
          value={destination}
          onChange={(v, lat, lon) => {
            setDestination(v);
            if (lat) setDestCoords({ lat, lon });
          }}
          placeholder="Destination checkpoint"
          icon={MapPin}
          iconColor="text-[#006b57]"
        />
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 px-1">
        <div>
          <h2 className="font-sans font-extrabold text-2xl md:text-3xl text-on-surface tracking-tight mb-1">
            {language === 'kn' ? 'ಮಾರ್ಗ ವಿಶ್ಲೇಷಣೆ' : 'Route Analysis'}
          </h2>
          <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
            <span className="font-semibold text-primary">{origin}</span>
            <span className="font-mono text-slate-300">➜</span>
            <span className="font-semibold text-[#006b57]">{destination}</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="w-full h-80 md:h-96 rounded-2xl aero-card overflow-hidden relative shadow-lg group">
        <div className="absolute inset-0 bg-slate-50 opacity-[0.9] overflow-hidden">
          <svg className="w-full h-full text-slate-200" viewBox="0 0 800 480" fill="none">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" />
                <circle cx="0" cy="0" r="1.5" fill="#005db5" fillOpacity="0.15" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <circle cx="100" cy="200" r="6" fill="#0073dd" fillOpacity="0.1" />
            <circle cx="100" cy="200" r="2" fill="#0073dd" />
            <text x="100" y="218" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#717785">{origin}</text>

            <circle cx="700" cy="280" r="6" fill="#006b57" fillOpacity="0.1" />
            <circle cx="700" cy="280" r="2" fill="#006b57" />
            <text x="600" y="298" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#717785">{destination}</text>

            <path d="M 100 200 Q 250 80 440 220 T 700 280" fill="none"
              stroke={selectedRouteId === 'inner-ring' ? '#0073dd' : '#cbd5e1'}
              strokeWidth={selectedRouteId === 'inner-ring' ? '5' : '3'}
              className={`transition-all duration-300 ${selectedRouteId === 'inner-ring' ? 'glow-line' : 'opacity-60'}`}
              strokeLinecap="round" />

            <path d="M 100 200 L 280 340 L 520 340 L 700 280" fill="none"
              stroke={selectedRouteId === 'nice-road' ? '#58fcd4' : '#cbd5e1'}
              strokeWidth={selectedRouteId === 'nice-road' ? '5' : '3'}
              className={`transition-all duration-200 ${selectedRouteId === 'nice-road' ? 'glow-line' : 'opacity-60'}`}
              strokeLinecap="round" />

            <path d="M 100 200 L 250 200 L 485 240 L 700 280" fill="none"
              stroke={selectedRouteId === 'hosur' ? '#ba1a1a' : '#cbd5e1'}
              strokeWidth={selectedRouteId === 'hosur' ? '5' : '3'}
              className={`transition-all duration-200 ${selectedRouteId === 'hosur' ? 'glow-line' : 'opacity-60'}`}
              strokeLinecap="round" />

            {activeRoute.svgPath && (
              <>
                <circle r="4" fill={selectedRouteId === 'hosur' ? '#ba1a1a' : selectedRouteId === 'inner-ring' ? '#0073dd' : '#58fcd4'} className="animate-ping">
                  <animateMotion dur="5s" repeatCount="indefinite" path={activeRoute.svgPath} />
                </circle>
                <circle r="3" fill="#ffffff">
                  <animateMotion dur="5s" repeatCount="indefinite" path={activeRoute.svgPath} />
                </circle>
              </>
            )}
          </svg>
        </div>

        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-primary/20 flex items-center gap-2 shadow-sm font-semibold text-xs text-on-surface">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span>Route A ({selectedRouteId === 'hosur' ? 'Selected' : 'Direct'})</span>
          </div>
          <div className="bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-teal-500/20 flex items-center gap-2 shadow-sm font-semibold text-xs text-on-surface">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
            <span>Route B ({selectedRouteId === 'inner-ring' ? 'Selected' : 'Inner Ring'})</span>
          </div>
        </div>

        {/* Weather overlay badge */}
        {activeRoute.weatherCondition && activeRoute.weatherCondition !== 'Loading...' && (
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-white/50 flex flex-col items-center gap-1.5 pointer-events-none select-none">
            <span className="font-mono text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Live Weather</span>
            <span className="font-sans font-bold text-[11px] text-on-surface">{activeRoute.weatherCondition}</span>
            <span className="font-mono text-[10px] text-primary font-bold">{activeRoute.weatherTemp}°C</span>
          </div>
        )}

        <div className="absolute bottom-4 right-4 flex gap-2 z-20">
          <button onClick={() => setZoomLevel(Math.min(zoomLevel + 1, 5))}
            className="w-10 h-10 bg-white/90 hover:bg-white backdrop-blur-md rounded-xl shadow-md flex items-center justify-center text-on-surface hover:text-primary transition-colors cursor-pointer" title="Zoom In">
            <Plus size={16} />
          </button>
          <button onClick={() => setZoomLevel(Math.max(zoomLevel - 1, 1))}
            className="w-10 h-10 bg-white/90 hover:bg-white backdrop-blur-md rounded-xl shadow-md flex items-center justify-center text-on-surface hover:text-primary transition-colors cursor-pointer" title="Zoom Out">
            <Minus size={16} />
          </button>
          <button onClick={() => setZoomLevel(3)}
            className="w-10 h-10 bg-white/90 hover:bg-white backdrop-blur-md rounded-xl shadow-md flex items-center justify-center text-primary transition-colors cursor-pointer" title="Center Map">
            <Locate size={16} />
          </button>
        </div>
      </div>

      {/* Route Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {routes.map(route => {
          const isSelected = selectedRouteId === route.id;
          const isHigh = route.riskLevel === 'High';
          const isMedium = route.riskLevel === 'Medium';
          const isBest = route.id === bestRouteId;
          const scoreColor = route.corridorScore <= 30 ? 'bg-emerald-400' : route.corridorScore <= 60 ? 'bg-amber-400' : 'bg-red-500';

          return (
            <button
              key={route.id}
              id={`btn-route-option-${route.id}`}
              onClick={() => setSelectedRouteId(route.id)}
              className={`w-full text-left aero-card rounded-2xl p-5 aero-interactive cursor-pointer border-l-4 relative overflow-hidden group ${isSelected ? 'border-primary outline-slate-300 font-bold shadow-md scale-102' : isHigh ? 'border-l-error' : isMedium ? 'border-l-amber-400' : 'border-l-[#006b57]'
                }`}
            >
              <div className="absolute top-3 right-3 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity">
                <Map size={64} className="text-primary" />
              </div>

              <div className="flex justify-between items-start mb-3 relative z-10 w-full">
                <div>
                  <span className={`font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isBest ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-black'
                    : route.id === 'hosur' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                    {isBest ? '★ AI Recommended' : route.id === 'hosur' ? 'Fastest' : 'Alternative'}
                  </span>
                  <h3 className="font-sans font-extrabold text-sm text-on-surface mt-2">{route.name}</h3>
                  <p className="font-sans text-[11px] text-on-surface-variant font-medium mt-0.5">{route.nameKa}</p>
                </div>
                <div className="text-right">
                  <span className="font-sans font-extrabold text-primary text-3xl leading-none block">
                    {route.duration}<span className="text-sm font-semibold opacity-85 ml-0.5">m</span>
                  </span>
                  <span className="font-mono text-[9px] font-bold text-on-surface-variant mt-1.5 block">{route.distance}</span>
                </div>
              </div>

              {/* Congestion Risk bar */}
              <div className="space-y-1.5 relative z-10 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant">Congestion Risk</span>
                  <span className={`font-mono text-[10px] font-bold uppercase ${isHigh ? 'text-error' : isMedium ? 'text-amber-500' : 'text-[#006b57]'}`}>
                    {route.riskLevel}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all duration-300 ${isHigh ? 'bg-[#ba1a1a]' : isMedium ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    style={{ width: `${route.riskPct}%` }} />
                </div>
              </div>

              {/* Corridor Score Gauge */}
              <div className="space-y-1 relative z-10 bg-slate-50/80 rounded-xl p-2.5 border border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[9px] text-on-surface-variant uppercase font-bold tracking-wider flex items-center gap-1">
                    <Activity size={9} /> Corridor Score
                  </span>
                  <span className={`font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded ${route.corridorScore <= 30 ? 'bg-emerald-100 text-emerald-800'
                    : route.corridorScore <= 60 ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                    }`}>
                    {route.corridorScore}/100
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all duration-700 ${scoreColor}`}
                    style={{ width: `${route.corridorScore}%` }} />
                </div>
                <p className="font-mono text-[9px] text-on-surface-variant">
                  Weather: {route.weatherCondition} · {route.weatherTemp}°C
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Route Details & Live Alerts */}
      <div className="mt-2 pb-6">
        <div className="bg-[#eff4ff]/65 border border-white/50 rounded-2xl p-5 mb-5 shadow-sm">
          <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-primary mb-1">Route Profile & Impact Analysis</h4>
          <p className="font-sans text-xs text-on-surface leading-relaxed">
            {activeRoute.description}{' '}
            Calculated travel speed averages <span className="font-semibold">{selectedRouteId === 'nice-road' ? '45 km/h' : '23 km/h'}</span> over the course of the day.
            {loading && <span className="text-amber-600 ml-1">(Updating live data...)</span>}
          </p>
        </div>

        <div className="flex items-center gap-2.5 mb-4">
          <AlertTriangle size={18} className="text-error" />
          <h3 className="font-sans font-bold text-sm text-on-surface">Live Alerts for {activeRoute.name}</h3>
          {loading && <span className="font-mono text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Updating...</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeAlerts.map(alertItem => (
            <div
              key={alertItem.id}
              className={`glass-card rounded-2xl p-5 flex items-start gap-4 border-l-4 shadow-sm hover:translate-y-[-1px] transition-transform cursor-pointer ${alertItem.severity === 'critical' ? 'border-l-error'
                : alertItem.severity === 'medium' ? 'border-l-amber-500'
                  : alertItem.severity === 'safe' ? 'border-l-[#006b57]'
                    : 'border-l-primary'
                }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${alertItem.severity === 'critical' ? 'bg-red-50 text-error'
                : alertItem.severity === 'medium' ? 'bg-amber-50 text-amber-600'
                  : alertItem.severity === 'safe' ? 'bg-emerald-50 text-emerald-600'
                    : alertItem.type === 'weather' ? 'bg-blue-50 text-primary'
                      : 'bg-blue-50 text-primary'
                }`}>
                {alertItem.type === 'weather' ? <CloudRain size={18} className={alertItem.severity === 'critical' ? 'animate-pulse' : ''} />
                  : alertItem.severity === 'safe' ? <CheckCircle size={18} />
                    : <AlertTriangle size={18} className={alertItem.severity === 'critical' ? 'animate-pulse' : ''} />}
              </div>
              <div>
                <h4 className="font-sans font-bold text-xs text-on-surface">{alertItem.title}</h4>
                <p className="font-sans text-[11px] text-on-surface-variant leading-snug mt-1">{alertItem.desc}</p>
                <span className={`font-mono text-[9px] font-bold block mt-2 ${alertItem.severity === 'critical' ? 'text-error'
                  : alertItem.severity === 'medium' ? 'text-amber-600'
                    : 'text-emerald-600'
                  }`}>
                  {alertItem.impact}
                </span>
              </div>
            </div>
          ))}
          {activeAlerts.length === 0 && !loading && (
            <div className="md:col-span-2 glass-card rounded-2xl p-8 text-center text-on-surface-variant text-sm">
              No live alerts for this route right now.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
