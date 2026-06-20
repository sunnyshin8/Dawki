import { useState, useEffect } from 'react';
import {
  AlertTriangle, Search, MapPin, Bell, Clock, ShieldAlert,
  CloudRain, Globe, X, Languages, Volume2, CheckCircle
} from 'lucide-react';
import { INITIAL_EVENTS } from '../data';
import { TrafficEvent } from '../types';
import { getZoneAndCorridor, fetchPredict, fetchRisk, broadcastAlert } from '../services/api';

interface AlertsCatalogProps {
  language: string;
}

// Enrich TrafficEvent with live /predict data
interface LiveEvent extends TrafficEvent {
  etaMinutes?: number;
  weatherCondition?: string;
  weatherTemp?: number;
}

const IMPACT_PRIORITY: Record<string, number> = {
  'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1
};

const LANG_NAMES: Record<string, string> = {
  en: 'English', kn: 'ಕನ್ನಡ', hi: 'हिंदी', ta: 'தமிழ்', te: 'తెలుగు', ml: 'മലയാളം'
};

export default function AlertsCatalog({ language }: AlertsCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [localEvents, setLocalEvents] = useState<LiveEvent[]>(INITIAL_EVENTS);

  // Report form
  const [showReportForm, setShowReportForm] = useState(false);
  const [newType, setNewType] = useState('Major Accident');
  const [newZone, setNewZone] = useState('South');
  const [newCorridor, setNewCorridor] = useState('Hosur Road');
  const [newPriority, setNewPriority] = useState<number>(3);
  const [newDetails, setNewDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Broadcast modal
  const [broadcastModal, setBroadcastModal] = useState<null | { id: string; type: string; translations: Record<string, string>; has_key: boolean }>(null);
  const [broadcastLoading, setBroadcastLoading] = useState<Record<string, boolean>>({});
  const [broadcastedStates, setBroadcastedStates] = useState<Record<string, boolean>>({});

  // Load live data
  useEffect(() => {
    let active = true;
    async function loadLiveAlerts() {
      try {
        const updated = await Promise.all(INITIAL_EVENTS.map(async evt => {
          const mapping = getZoneAndCorridor(evt.zone, evt.corridor);
          const priority = IMPACT_PRIORITY[evt.impact] || 1;
          try {
            const predictRes = await fetchPredict({
              lat: mapping.lat, lon: mapping.lon,
              zone: mapping.zone, corridor: mapping.corridor,
              event_type: evt.type, priority,
            });
            return {
              ...evt,
              etaMinutes: predictRes.eta_minutes,
              weatherCondition: predictRes.weather?.condition ?? '',
              weatherTemp: predictRes.weather?.temperature_c ?? predictRes.weather?.temp ?? 0,
              duration: `${Math.round(predictRes.eta_minutes)}m remaining`,
              impact: predictRes.severity.toUpperCase() as any,
              details: `${evt.details ?? ''} (Live: ${predictRes.weather?.condition}, ${predictRes.weather?.temperature_c ?? predictRes.weather?.temp}°C)`,
            } as LiveEvent;
          } catch {
            return evt as LiveEvent;
          }
        }));
        if (active) setLocalEvents(updated);
      } catch (err) {
        console.error('Error fetching live alerts:', err);
      }
    }
    loadLiveAlerts();
    return () => { active = false; };
  }, []);

  // Auto-generate alerts from high-risk corridors
  useEffect(() => {
    const RISK_CORRIDORS = [
      { zone: 'South Zone 1', corridor: 'Hosur Road', label: 'Hosur Rd', sector: 'South' },
      { zone: 'East Zone 1', corridor: 'ORR East 1', label: 'ORR East', sector: 'East' },
    ];
    async function checkHotspots() {
      const now = new Date();
      for (const c of RISK_CORRIDORS) {
        try {
          const r = await fetchRisk(c.zone, c.corridor, now.getHours());
          if (r.risk_level === 'HIGH' || r.risk_level === 'CRITICAL') {
            const syntheticId = `AUTO-${c.corridor.replace(/\s/g, '')}-${now.getHours()}`;
            setLocalEvents(prev => {
              if (prev.some(e => e.id === syntheticId)) return prev;
              const newEvt: LiveEvent = {
                id: syntheticId,
                type: 'High Risk Corridor',
                zone: c.sector,
                corridor: c.label,
                duration: `Risk: ${Math.round(r.risk_score * 100)}%`,
                impact: r.risk_level === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
                icon: 'AlertTriangle',
                details: `AI model detected ${r.risk_level} congestion risk on ${c.corridor}. ${r.event_count} incidents, ${r.high_impact_count} high-impact.`,
                etaMinutes: undefined,
                weatherCondition: '',
                weatherTemp: 0,
              };
              return [newEvt, ...prev];
            });
          }
        } catch { }
      }
    }
    checkHotspots();
  }, []);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const mapping = getZoneAndCorridor(newZone, newCorridor);
      const predictRes = await fetchPredict({
        lat: mapping.lat, lon: mapping.lon,
        zone: `${newZone} Zone 1`, corridor: newCorridor,
        event_type: newType, priority: newPriority,
      });
      const newEvent: LiveEvent = {
        id: `EV-${Math.floor(100 + Math.random() * 900)}`,
        type: newType, zone: newZone, corridor: newCorridor,
        duration: `${Math.round(predictRes.eta_minutes)}m remaining`,
        impact: predictRes.severity.toUpperCase() as any,
        icon: newType === 'Major Accident' ? 'AlertOctagon' : 'CloudRain',
        details: `${newDetails} (Forecast: ${predictRes.weather?.condition}, ${predictRes.weather?.temperature_c ?? predictRes.weather?.temp}°C)`,
        etaMinutes: predictRes.eta_minutes,
        weatherCondition: predictRes.weather?.condition ?? '',
        weatherTemp: Number(predictRes.weather?.temperature_c ?? predictRes.weather?.temp ?? 0),
      };
      setLocalEvents(prev => [newEvent, ...prev]);
      setNewDetails('');
      setShowReportForm(false);
      alert(`Submitted! LightGBM predicts severity: ${predictRes.severity}, ETA: ${Math.round(predictRes.eta_minutes)} mins.`);
    } catch (err) {
      alert('Prediction error: ' + err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBroadcast = async (id: string, type: string, details: string) => {
    setBroadcastLoading(prev => ({ ...prev, [id]: true }));
    try {
      const alertText = `${type}: ${details}`;
      const result = await broadcastAlert(alertText, type);
      setBroadcastedStates(prev => ({ ...prev, [id]: true }));
      setBroadcastModal({ id, type, translations: result.translations, has_key: result.has_key });
    } catch (err) {
      console.error('Broadcast error:', err);
      alert('Broadcast failed: ' + err);
    } finally {
      setBroadcastLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const filteredEvents = localEvents.filter(evt => {
    const matchesSearch = evt.type.toLowerCase().includes(searchTerm.toLowerCase())
      || evt.corridor.toLowerCase().includes(searchTerm.toLowerCase())
      || evt.zone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesImpact = activeFilter === 'ALL' || evt.impact === activeFilter;
    const matchesZone = selectedZone === 'ALL' || evt.zone === selectedZone;
    return matchesSearch && matchesImpact && matchesZone;
  });

  const zones = ['ALL', 'South', 'East', 'Central', 'West'];

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full max-w-5xl mx-auto px-1 select-none">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-sans font-extrabold text-2xl md:text-3xl text-on-surface tracking-tight mb-1">
            {language === 'kn' ? 'ಲೈವ್ ಎಚ್ಚರಿಕೆಗಳು' : 'Live Alerts Command'}
          </h2>
          <p className="font-sans text-sm text-on-surface-variant">
            Broadcast global road conditions, dispatch bulletins, and weather-related restrictions.
          </p>
        </div>
        <button onClick={() => setShowReportForm(!showReportForm)}
          className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all">
          {showReportForm ? 'Close Intake Form' : 'AI Incident Intake'}
        </button>
      </div>

      {/* Report Form */}
      {showReportForm && (
        <form onSubmit={handleReportSubmit} className="glass-card rounded-2xl p-6 flex flex-col gap-4 border border-primary/20 bg-white/80 animate-fade-in">
          <h3 className="font-sans font-extrabold text-sm text-on-surface border-b pb-2 flex items-center gap-2">
            <ShieldAlert size={16} className="text-primary" />
            AI-Powered Incident Intake Pipeline
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[9px] text-on-surface-variant font-bold uppercase">Incident Type</label>
              <select value={newType} onChange={e => setNewType(e.target.value)} className="bg-slate-50 border p-2.5 rounded-xl cursor-pointer font-semibold outline-none">
                <option value="Major Accident">Major Accident</option>
                <option value="Waterlogging">Waterlogging</option>
                <option value="VVIP Movement">VVIP Movement</option>
                <option value="Road Works">Road Works</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[9px] text-on-surface-variant font-bold uppercase">Priority Level</label>
              <select value={newPriority} onChange={e => setNewPriority(Number(e.target.value))} className="bg-slate-50 border p-2.5 rounded-xl cursor-pointer font-semibold outline-none">
                <option value={4}>Critical (Tier 1)</option>
                <option value={3}>High (Tier 2)</option>
                <option value={2}>Medium (Tier 3)</option>
                <option value={1}>Low (Tier 4)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[9px] text-on-surface-variant font-bold uppercase">Zone Sector</label>
              <select value={newZone} onChange={e => setNewZone(e.target.value)} className="bg-slate-50 border p-2.5 rounded-xl cursor-pointer font-semibold outline-none">
                <option value="South">South Sector</option>
                <option value="East">East Sector</option>
                <option value="Central">Central Sector</option>
                <option value="West">West Sector</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[9px] text-on-surface-variant font-bold uppercase">Corridor Area</label>
              <select value={newCorridor} onChange={e => setNewCorridor(e.target.value)} className="bg-slate-50 border p-2.5 rounded-xl cursor-pointer font-semibold outline-none">
                <option value="Hosur Road">Hosur Road</option>
                <option value="ORR East 1">ORR East 1</option>
                <option value="CBD 1">CBD 1</option>
                <option value="Tumkur Road">Tumkur Road</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 text-xs">
            <label className="font-mono text-[9px] text-on-surface-variant font-bold uppercase">Incident Details</label>
            <textarea value={newDetails} onChange={e => setNewDetails(e.target.value)}
              placeholder="Provide a detailed description..."
              className="bg-slate-50 border p-2.5 rounded-xl min-h-[80px] outline-none" required />
          </div>
          <button type="submit" disabled={submitting}
            className="bg-[#006b57] hover:bg-[#005241] text-white text-xs font-bold py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer disabled:bg-slate-300">
            {submitting ? 'Running LightGBM Predictor...' : 'Submit to Prediction Pipeline'}
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="glass-card rounded-2xl p-5 flex flex-col md:flex-row gap-4 justify-between items-center bg-white/40 border border-white/50 shadow-sm">
        <div className="relative w-full md:w-72">
          <input type="text" placeholder="Search active alerts..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white/70 focus:bg-white text-xs px-4 py-2.5 pl-10 rounded-xl border border-white/50 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm" />
          <Search size={14} className="absolute left-3.5 top-3.5 text-on-surface-variant/60" />
        </div>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map(impact => (
            <button key={impact} onClick={() => setActiveFilter(impact)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${activeFilter === impact ? 'bg-primary text-white shadow-sm' : 'bg-white/50 text-on-surface-variant hover:bg-white'
                }`}>
              {impact}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="font-mono text-[10px] text-on-surface-variant font-bold uppercase whitespace-nowrap">Zone:</span>
          <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)}
            className="bg-white/60 text-xs px-3 py-2 rounded-xl border border-white/50 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs outline-none cursor-pointer flex-grow md:flex-grow-0">
            {zones.map(z => <option key={z} value={z}>{z === 'ALL' ? 'All Zones' : `${z} Sector`}</option>)}
          </select>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
        {filteredEvents.length === 0 ? (
          <div className="md:col-span-2 glass-card rounded-2xl p-12 text-center text-on-surface-variant flex flex-col items-center justify-center gap-3">
            <Bell size={32} className="text-secondary/50 animate-bounce" />
            <p className="font-sans font-bold text-sm">No Active Alert Bulletins Found</p>
            <p className="font-sans text-xs">There are no reports fitting the current selection.</p>
          </div>
        ) : filteredEvents.map(evt => {
          const isCritical = evt.impact === 'CRITICAL';
          const isHigh = evt.impact === 'HIGH';
          const isBroadcasted = broadcastedStates[evt.id];
          const isBroadcastingNow = broadcastLoading[evt.id];
          const liveEvt = evt as LiveEvent;
          const hasEta = typeof liveEvt.etaMinutes === 'number';
          const hasWeather = liveEvt.weatherCondition && liveEvt.weatherCondition !== '';
          // ETA bar: assume max 120 minutes
          const etaPct = hasEta ? Math.min(100, Math.round((liveEvt.etaMinutes! / 120) * 100)) : 0;

          return (
            <div key={evt.id}
              className="aero-card rounded-2xl p-6 flex flex-col gap-4 border-t-4 shadow-sm hover:scale-[1.01] hover:shadow-md transition-all duration-300 relative overflow-hidden group"
              style={{ borderTopColor: isCritical ? '#ba1a1a' : isHigh ? '#c05400' : '#005bb1' }}>

              {/* Impact badge */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 font-mono text-[9px] font-bold">
                <span className={`px-2 py-0.5 rounded leading-none ${isCritical ? 'bg-red-50 text-red-700' : 'bg-primary/5 text-primary'}`}>
                  {evt.impact}
                </span>
              </div>

              {/* Core info */}
              <div className="flex gap-4 items-start">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isCritical ? 'bg-red-50 text-error' : 'bg-blue-50 text-primary'}`}>
                  <AlertTriangle size={20} className={isCritical ? 'animate-pulse' : ''} />
                </div>
                <div>
                  <h3 className="font-sans font-extrabold text-sm text-on-surface">{evt.type}</h3>
                  <p className="font-sans text-xs text-on-surface-variant leading-relaxed mt-1">
                    {evt.details ?? 'Active operational incident report.'}
                  </p>
                </div>
              </div>

              {/* Weather chip */}
              {hasWeather && (
                <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-100 rounded-xl px-3 py-2">
                  <CloudRain size={13} className="text-blue-500 shrink-0" />
                  <span className="font-sans text-[11px] text-blue-700 font-medium">
                    {liveEvt.weatherCondition}
                    {liveEvt.weatherTemp ? ` · ${liveEvt.weatherTemp}°C` : ''}
                  </span>
                </div>
              )}

              {/* ETA progress bar */}
              {hasEta && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[10px] text-on-surface-variant font-bold uppercase flex items-center gap-1">
                      <Clock size={9} /> Estimated Clearance
                    </span>
                    <span className="font-mono font-bold text-primary text-[10px]">
                      {Math.round(liveEvt.etaMinutes!)} min remaining
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${isCritical ? 'bg-red-500' : isHigh ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      style={{ width: `${etaPct}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="h-px bg-slate-100 my-1" />

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-xs mt-1">
                <div>
                  <span className="font-mono text-[9px] text-on-surface-variant font-bold uppercase block">Corridor Sector</span>
                  <span className="font-sans font-bold text-on-surface flex items-center gap-1 mt-0.5">
                    <MapPin size={12} className="text-primary shrink-0" />
                    {evt.corridor}
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[9px] text-on-surface-variant font-bold uppercase block">Zone Location</span>
                  <span className="font-sans font-bold text-primary mt-0.5 block">{evt.zone} Sector</span>
                </div>
              </div>

              {/* Broadcast button */}
              <div className="flex gap-2.5 mt-1 pt-2">
                <button
                  id={`btn-alerts-broadcast-${evt.id}`}
                  onClick={() => handleBroadcast(evt.id, evt.type, evt.details ?? evt.type)}
                  disabled={isBroadcastingNow}
                  className={`flex-1 py-2.5 rounded-xl font-sans font-bold text-xs shadow-sm transition-all text-center cursor-pointer flex items-center justify-center gap-2 ${isBroadcasted
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : isBroadcastingNow
                        ? 'bg-slate-100 text-slate-500 cursor-wait'
                        : 'bg-primary hover:bg-primary/95 text-white active:scale-98'
                    }`}
                >
                  {isBroadcasted ? <><CheckCircle size={13} /> View Translations</>
                    : isBroadcastingNow ? <><Globe size={13} className="animate-spin" /> Translating...</>
                      : <><Globe size={13} /> Transmit Live Broadcast</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Multilingual Broadcast Modal */}
      {broadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div onClick={() => setBroadcastModal(null)} className="fixed inset-0 cursor-pointer" />
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative z-10 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="font-mono text-[9px] text-primary font-bold uppercase tracking-wider bg-primary/10 py-0.5 px-2 rounded-full flex items-center gap-1 w-fit">
                  <Languages size={9} /> Multilingual Broadcast
                </span>
                <h3 className="font-sans font-extrabold text-base text-on-surface mt-1">{broadcastModal.type}</h3>
                {!broadcastModal.has_key && (
                  <p className="font-sans text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 mt-2">
                    ⚠️ Sarvam API key not set : showing original text for all languages. Add <code className="font-mono text-[10px]">SARVAM_API_KEY</code> to <code className="font-mono text-[10px]">.env</code> for real translations.
                  </p>
                )}
              </div>
              <button onClick={() => setBroadcastModal(null)}
                className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-full hover:bg-slate-100 transition-all cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {Object.entries(broadcastModal.translations).map(([lang, text]) => (
                <div key={lang} className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase">
                      {lang.toUpperCase()}
                    </span>
                    <span className="font-sans text-[10px] text-on-surface-variant">{LANG_NAMES[lang] ?? lang}</span>
                  </div>
                  <p className="font-sans text-xs text-on-surface leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            <button onClick={() => setBroadcastModal(null)}
              className="w-full mt-4 py-2.5 bg-primary text-white rounded-xl font-bold text-xs cursor-pointer hover:bg-primary/90 transition-all">
              Close Broadcast Panel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
