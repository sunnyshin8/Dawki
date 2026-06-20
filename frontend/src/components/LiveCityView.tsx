'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Script from 'next/script';
import {
  Radar, AlertOctagon, ShieldAlert, CheckCircle,
  Radio, Tv, Loader2, RefreshCw, Locate, Compass,
  Plus, Minus, Map,
} from 'lucide-react';
import { fetchRisk } from '../services/api';

interface LiveCityViewProps { language: string; }

// ─── Node definitions with real GPS ───────────────────────────────────────
interface CorridorNode {
  id: string; name: string; nameKa: string;
  lat: number; lon: number; zone: string; corridor: string;
  // SVG position (2D view)
  x: number; y: number;
  // live
  riskScore: number; riskLevel: string;
  eventCount: number; highImpact: number;
  status: string; statusLevel: 'success' | 'warning' | 'error';
  peakTimeMsg: string; color: string;
}

const BASE_NODES: Omit<CorridorNode, 'riskScore' | 'riskLevel' | 'eventCount' | 'highImpact' | 'status' | 'statusLevel' | 'peakTimeMsg' | 'color'>[] = [
  { id: 'corr-1', name: 'ORR East 1', nameKa: 'ಹೊರ ವರ್ತುಲ ರಸ್ತೆ', lat: 12.9279, lon: 77.6801, zone: 'East Zone 1', corridor: 'ORR East 1', x: 75, y: 50 },
  { id: 'corr-2', name: 'Hosur Road', nameKa: 'ಹೊಸೂರು ರಸ್ತೆ', lat: 12.8452, lon: 77.6635, zone: 'South Zone 1', corridor: 'Hosur Road', x: 60, y: 78 },
  { id: 'corr-3', name: 'Tumkur Road', nameKa: 'ತುಮಕೂರು ರಸ್ತೆ', lat: 13.0335, lon: 77.5640, zone: 'West Zone 1', corridor: 'Tumkur Road', x: 22, y: 42 },
  { id: 'corr-4', name: 'Bellary Road', nameKa: 'ಬಳ್ಳಾರಿ ರಸ್ತೆ', lat: 13.0359, lon: 77.5978, zone: 'North Zone 1', corridor: 'Bellary Road 1', x: 48, y: 16 },
  { id: 'corr-5', name: 'Silk Board', nameKa: 'ಸಿಲ್ಕ್ ಬೋರ್ಡ್', lat: 12.9175, lon: 77.6223, zone: 'South Zone 1', corridor: 'Hosur Road', x: 56, y: 66 },
  { id: 'corr-6', name: 'Electronic City', nameKa: 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ', lat: 12.8399, lon: 77.6770, zone: 'South Zone 1', corridor: 'Hosur Road', x: 64, y: 91 },
  { id: 'corr-7', name: 'Whitefield', nameKa: 'ವೈಟ್‌ಫೀಲ್ಡ್', lat: 12.9698, lon: 77.7499, zone: 'East Zone 1', corridor: 'ORR East 1', x: 86, y: 44 },
  { id: 'corr-8', name: 'Manyata Tech', nameKa: 'ಮಣ್ಯಾತ ಟೆಕ್', lat: 13.0475, lon: 77.6211, zone: 'North Zone 1', corridor: 'Bellary Road 1', x: 54, y: 10 },
];

// Corridor polyline paths for 3D Mappls map (model-colored by risk)
const CORRIDOR_PATHS: Record<string, { lat: number; lng: number }[][]> = {
  'ORR East 1': [[{ lat: 12.9698, lng: 77.7499 }, { lat: 12.9476, lng: 77.7053 }, { lat: 12.9279, lng: 77.6801 }, { lat: 12.9175, lng: 77.6223 }]],
  'Hosur Road': [[{ lat: 12.9716, lng: 77.5946 }, { lat: 12.8780, lng: 77.6200 }, { lat: 12.8452, lng: 77.6635 }, { lat: 12.8399, lng: 77.6770 }]],
  'Tumkur Road': [[{ lat: 12.9716, lng: 77.5946 }, { lat: 13.0050, lng: 77.5720 }, { lat: 13.0335, lng: 77.5640 }]],
  'Bellary Road 1': [[{ lat: 12.9716, lng: 77.5946 }, { lat: 13.0070, lng: 77.5940 }, { lat: 13.0359, lng: 77.5978 }, { lat: 13.0475, lng: 77.6211 }]],
};

const MAPPLS_KEY = process.env.NEXT_PUBLIC_MAPPLS_API_KEY || '';
const TOMTOM_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || '';

const blank: Omit<CorridorNode, 'id' | 'name' | 'nameKa' | 'lat' | 'lon' | 'zone' | 'corridor' | 'x' | 'y'> = {
  riskScore: 0, riskLevel: 'LOW', eventCount: 0, highImpact: 0,
  status: 'Connecting…', statusLevel: 'success', peakTimeMsg: 'Fetching live data…', color: '#94a3b8',
};
const init = (): CorridorNode[] => BASE_NODES.map(n => ({ ...n, ...blank }));

function riskColor(score: number) {
  if (score > 70) return '#ba1a1a';
  if (score > 40) return '#c05400';
  return '#006b57';
}

declare global { interface Window { mappls: any; } }

// ─── Component ─────────────────────────────────────────────────────────────
export default function LiveCityView({ language }: LiveCityViewProps) {
  const [nodes, setNodes] = useState<CorridorNode[]>(init);
  const [selectedId, setSelectedId] = useState('corr-1');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [loadingRisks, setLoadingRisks] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [activeToast, setActiveToast] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [dispatchedStates, setDispatchedStates] = useState<Record<string, boolean>>({});
  const [trafficVisible, setTrafficVisible] = useState(true);
  const [incidentsVisible, setIncidentsVisible] = useState(true);
  const [sdkReady, setSdkReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapScale, setMapScale] = useState(1);

  const mapRef = useRef<any>(null);
  const polylinesRef = useRef<any[]>([]);
  const markersRef = useRef<Record<string, any>>({});

  const selectedNode = nodes.find(n => n.id === selectedId) ?? nodes[0];
  const topHotspot = nodes.reduce((a, b) => b.riskScore > a.riskScore ? b : a, nodes[0]);
  const highRiskCount = nodes.filter(n => n.riskScore >= 70).length;
  const statusStamp = lastSync ? lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

  const showToast = useCallback((msg: string) => {
    setActiveToast(msg);
    setTimeout(() => setActiveToast(cur => cur === msg ? null : cur), 5000);
  }, []);

  // ── Fetch live risk for all nodes ─────────────────────────────────────────
  const loadRisks = useCallback(async (spinner = false) => {
    if (spinner) setLoadingRisks(true);
    const hour = new Date().getHours();
    try {
      const updated = await Promise.all(BASE_NODES.map(async n => {
        try {
          const r = await fetchRisk(n.zone, n.corridor, hour);
          const score = Math.round(r.risk_score * 100);
          const color = riskColor(score);
          let status = 'Clear Flow';
          let statusLevel: CorridorNode['statusLevel'] = 'success';
          if (score > 70) { status = 'Diverted Route Suggested'; statusLevel = 'error'; }
          else if (score > 40) { status = 'Officers Dispatched'; statusLevel = 'warning'; }
          return {
            ...n, riskScore: score, riskLevel: r.risk_level,
            eventCount: r.event_count ?? 0, highImpact: r.high_impact_count ?? 0,
            status, statusLevel, color,
            peakTimeMsg: `Risk: ${r.risk_level}. Events recorded: ${r.event_count ?? 0}. High-impact: ${r.high_impact_count ?? 0}.`
          };
        } catch {
          return { ...n, ...blank };
        }
      }));
      setNodes(updated as CorridorNode[]);
      setLastSync(new Date());
      // Update 3D map polylines with new risk colors
      if (mapRef.current && viewMode === '3d') updatePolylines(updated as CorridorNode[]);
    } finally {
      if (spinner) setLoadingRisks(false);
    }
  }, [viewMode]);

  // Auto-refresh
  useEffect(() => {
    loadRisks(true);
    const t = setInterval(() => loadRisks(false), 60_000);
    return () => clearInterval(t);
  }, []);

  // ── Add TomTom traffic tile layers to Mappls 3D map ─────────────────────
  const addTomTomLayers = useCallback((map: any) => {
    if (!TOMTOM_KEY) return;
    try {
      // Flow layer: relative-delay colours (green → yellow → red)
      if (!map.getSource('tt-flow')) {
        map.addSource('tt-flow', {
          type: 'raster',
          tiles: [
            `https://api.tomtom.com/traffic/map/4/tile/flow/relative-delay/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`,
          ],
          tileSize: 256,
          attribution: '© TomTom Traffic',
        });
        map.addLayer({
          id: 'tt-flow-layer',
          type: 'raster',
          source: 'tt-flow',
          paint: { 'raster-opacity': 0.72 },
          layout: { visibility: 'visible' },
        });
      }
      // Incidents layer: icons for accidents, roadworks, closures
      if (!map.getSource('tt-incidents')) {
        map.addSource('tt-incidents', {
          type: 'raster',
          tiles: [
            `https://api.tomtom.com/traffic/map/4/tile/incidents/s3/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`,
          ],
          tileSize: 256,
          attribution: '© TomTom Incidents',
        });
        map.addLayer({
          id: 'tt-incidents-layer',
          type: 'raster',
          source: 'tt-incidents',
          paint: { 'raster-opacity': 0.85 },
          layout: { visibility: 'visible' },
        });
      }
    } catch (e) {
      console.warn('TomTom layer init error:', e);
    }
  }, []);

  // Toggle TomTom flow visibility
  const toggleTraffic = useCallback(() => {
    if (!mapRef.current) return;
    const vis = trafficVisible ? 'none' : 'visible';
    try { mapRef.current.setLayoutProperty?.('tt-flow-layer', 'visibility', vis); } catch { }
    setTrafficVisible(p => !p);
  }, [trafficVisible]);

  // Toggle TomTom incidents visibility
  const toggleIncidents = useCallback(() => {
    if (!mapRef.current) return;
    const vis = incidentsVisible ? 'none' : 'visible';
    try { mapRef.current.setLayoutProperty?.('tt-incidents-layer', 'visibility', vis); } catch { }
    setIncidentsVisible(p => !p);
  }, [incidentsVisible]);


  const updatePolylines = useCallback((currentNodes: CorridorNode[]) => {
    // Remove old polylines
    polylinesRef.current.forEach(p => { try { p.remove?.(); } catch { } });
    polylinesRef.current = [];
    if (!mapRef.current || !window.mappls) return;

    // Get representative risk color per corridor type
    const corridorRisk: Record<string, number> = {};
    currentNodes.forEach(n => {
      if (!corridorRisk[n.corridor] || n.riskScore > corridorRisk[n.corridor]) {
        corridorRisk[n.corridor] = n.riskScore;
      }
    });

    Object.entries(CORRIDOR_PATHS).forEach(([corrName, paths]) => {
      const score = corridorRisk[corrName] ?? 0;
      const color = riskColor(score);
      paths.forEach(path => {
        try {
          const poly = new window.mappls.Polyline({
            map: mapRef.current,
            path,
            strokeColor: color,
            strokeOpacity: 0.92,
            strokeWeight: 7,
            zIndex: 5,
          });
          polylinesRef.current.push(poly);
        } catch (e) { console.warn('Polyline error:', e); }
      });
    });
  }, []);

  const initMap = useCallback(() => {
    if (!window.mappls || mapRef.current) return;

    const doInit = () => {
      try {
        const map = new window.mappls.Map('mappls-3d-view', {
          center: [77.5946, 12.9716],
          zoom: 12,
          zoomControl: false,
          pitch: 52,
          bearing: -20,
        });
        mapRef.current = map;

        const onLoad = () => {
          setMapReady(true);
          // TomTom traffic tiles
          addTomTomLayers(map);
          // Draw model-predicted corridor colors
          updatePolylines(nodes);

          // Add clickable node markers
          BASE_NODES.forEach(n => {
            try {
              const marker = new window.mappls.Marker({
                position: { lat: n.lat, lng: n.lon },
                map,
                title: n.name,
                zIndex: 50,
                draggable: false,
              });
              if (marker.addListener) {
                marker.addListener('click', () => {
                  setSelectedId(n.id);
                  try {
                    map.flyTo?.({ center: [n.lon, n.lat], zoom: 14, pitch: 55, bearing: -15 });
                    map.setCenter?.([n.lon, n.lat]);
                    map.setZoom?.(14);
                  } catch { }
                });
              }
              markersRef.current[n.id] = marker;
            } catch { }
          });
        };

        if (map.on) { map.on('load', onLoad); }
        else { setTimeout(onLoad, 1000); }
      } catch (e) { console.error('Mappls 3D init error:', e); }
    };

    if (window.mappls.initialize) {
      window.mappls.initialize({ key: MAPPLS_KEY }, doInit);
    } else { doInit(); }
  }, [nodes, updatePolylines]);

  // Initialize map when switching to 3D for the first time
  useEffect(() => {
    if (viewMode === '3d' && sdkReady && !mapRef.current) {
      setTimeout(initMap, 150);
    }
  }, [viewMode, sdkReady, initMap]);

  // When risk data updates while in 3D mode, update polylines
  useEffect(() => {
    if (viewMode === '3d' && mapRef.current && mapReady) {
      updatePolylines(nodes);
    }
  }, [nodes, viewMode, mapReady]);

  // Fly to selected node in 3D
  useEffect(() => {
    if (viewMode === '3d' && mapRef.current) {
      const n = nodes.find(x => x.id === selectedId);
      if (!n) return;
      try {
        mapRef.current.flyTo?.({ center: [n.lon, n.lat], zoom: 13, pitch: 55, bearing: -15 });
        mapRef.current.setCenter?.([n.lon, n.lat]);
      } catch { }
    }
  }, [selectedId, viewMode]);

  // Zoom controls (2D scale, 3D map)
  const zoomIn = () => { if (viewMode === '2d') setMapScale(p => Math.min(1.5, p + 0.15)); else { try { mapRef.current?.zoomIn?.(); } catch { } } };
  const zoomOut = () => { if (viewMode === '2d') setMapScale(p => Math.max(0.7, p - 0.15)); else { try { mapRef.current?.zoomOut?.(); } catch { } } };
  const resetView = () => { if (viewMode === '2d') setMapScale(1); else { try { mapRef.current?.setCenter?.([77.5946, 12.9716]); mapRef.current?.setZoom?.(12); } catch { } } };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fade-in w-full max-w-7xl mx-auto px-1 select-none relative">

      {/* Mappls SDK (always load so 3D is ready when user toggles) */}
      <Script
        id="mappls-sdk"
        src={`https://apis.mappls.com/advancedmaps/api/${MAPPLS_KEY}/map_sdk?v=3.0&layer=vector`}
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
        onError={() => console.warn('Mappls SDK unavailable')}
      />

      {/* Toast */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900/95 text-white text-xs font-sans px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/10 animate-fade-in max-w-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-medium pr-1">{activeToast}</span>
          <button onClick={() => setActiveToast(null)} className="font-mono text-slate-400 hover:text-white ml-auto pl-1 cursor-pointer">×</button>
        </div>
      )}

      {/* ── LEFT: Map area ─────────────────────────────────────────────────── */}
      <div className="flex-grow flex flex-col gap-4">

        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="font-sans font-extrabold text-2xl md:text-3xl text-on-surface tracking-tight mb-1">
              {language === 'kn' ? 'ಲೈವ್ ಸಿಟಿ ವ್ಯೂ' : 'Live Sector View'}
            </h2>
            <p className="font-sans text-sm text-on-surface-variant">
              {viewMode === '2d'
                ? 'Animated 2D : live model risk colours on all corridors. Click a node for telemetry.'
                : '3D Mappls view : corridor lines coloured by our AI model predictions. Click a pin to fly there.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => loadRisks(true)}
              className="hidden md:flex items-center gap-1.5 bg-white/75 hover:bg-white border border-slate-200 shadow-sm py-2 px-3 rounded-xl font-sans text-xs font-semibold text-primary transition-all cursor-pointer">
              <RefreshCw size={13} className={loadingRisks ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={() => setViewMode(v => v === '2d' ? '3d' : '2d')}
              className="flex items-center gap-2 bg-white/75 hover:bg-white border border-slate-200 shadow-sm py-2 px-4 rounded-xl font-sans text-xs font-semibold text-primary transition-all cursor-pointer">
              {viewMode === '2d'
                ? <><Compass className="w-4 h-4" /> 3D Mappls View</>
                : <><Map className="w-4 h-4" /> 2D Animated View</>}
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="glass-card rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Live Risk Feed</span>
              <p className="font-sans text-sm font-bold text-on-surface">{loadingRisks ? 'Refreshing…' : 'Backend connected'}</p>
            </div>
            <div className={`w-2.5 h-2.5 rounded-full ${loadingRisks ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
          </div>
          <div className="glass-card rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Top Hotspot</span>
              <p className="font-sans text-sm font-bold text-on-surface">
                {loadingRisks ? ':' : `${topHotspot.name} · ${topHotspot.riskScore}%`}
              </p>
            </div>
            {!loadingRisks && (
              <span className="font-mono text-[10px] font-bold text-white px-2.5 py-1 rounded-full" style={{ backgroundColor: topHotspot.color }}>
                {topHotspot.statusLevel.toUpperCase()}
              </span>
            )}
          </div>
          <div className="glass-card rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Last Synced</span>
              <p className="font-sans text-sm font-bold text-on-surface">{statusStamp}</p>
            </div>
            <span className="font-mono text-[10px] font-bold text-on-surface-variant">{highRiskCount} high risk</span>
          </div>
        </div>

        {/* ── MAP VIEWPORT ───────────────────────────────────────────────── */}
        <div className="w-full h-[480px] bg-[#edf4ff]/55 border border-white/60 backdrop-blur-md rounded-3xl overflow-hidden relative shadow-lg flex items-center justify-center">

          {/* ── 2D Animated View ─────────────────────────────────────────── */}
          <div className={`w-full h-full absolute inset-0 transition-opacity duration-500 ${viewMode === '2d' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>

            {/* Top-left badge */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 pointer-events-none">
              <span className="font-mono text-[9px] font-semibold text-slate-500 uppercase tracking-widest bg-white/90 py-1 px-3 rounded-full border border-slate-200/60 shadow-xs">
                Bengaluru Network Mapping
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-sans text-[10px] text-slate-600 bg-white/95 py-0.5 px-2.5 rounded-full border border-slate-200/40 shadow-xs">
                  {loadingRisks ? 'Syncing live data…' : 'Telemetry Active'}
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-xl shadow-md flex flex-col gap-2 min-w-[150px]">
              <span className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-widest">Model Risk Legend</span>
              <div className="h-px bg-slate-100" />
              {[['#006b57', 'Low (< 40%)'], ['#c05400', 'Medium (40–70%)'], ['#ba1a1a', 'High (> 70%)']].map(([c, l]) => (
                <div key={l} className="flex items-center gap-2">
                  <span className="w-3 h-1.5 rounded shrink-0" style={{ backgroundColor: c }} />
                  <span className="font-sans text-[9px] text-slate-600">{l}</span>
                </div>
              ))}
              <div className="h-px bg-slate-100" />
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-0.5 bg-[#7c3aed]" />
                <span className="font-sans text-[9px] text-slate-500">Purple Line (Metro)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-0.5 bg-[#059669]" />
                <span className="font-sans text-[9px] text-slate-500">Green Line (Metro)</span>
              </div>
            </div>

            {/* MAP CANVAS */}
            <div className="w-full h-full relative flex items-center justify-center transition-all duration-700 ease-out"
              style={{ transform: `scale(${mapScale})` }}>

              {/* Holographic ring */}
              <div className="absolute w-[520px] h-[520px] border border-dashed border-sky-200/50 rounded-full animate-spin [animation-duration:120s] opacity-25" />

              {/* SVG MAP */}
              <svg className="absolute w-[625px] h-[415px]" viewBox="0 0 600 400" fill="none">
                <defs>
                  <pattern id="bgrid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e8effe" strokeWidth="0.7" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#bgrid)" opacity="0.8" />

                {/* Water */}
                <path d="M 240 50 Q 280 30 330 45 Q 355 65 315 80 Q 275 85 240 50 Z" fill="#e0f2fe" stroke="#bae6fd" strokeWidth="1.5" opacity="0.85" />
                <text x="305" y="66" fontSize="8" fill="#0284c7" textAnchor="middle" opacity="0.8">Hebbal Lake</text>
                <path d="M 410 190 Q 430 170 460 185 Q 480 205 450 220 Q 420 225 410 190 Z" fill="#e0f2fe" stroke="#bae6fd" strokeWidth="1.5" opacity="0.85" />
                <text x="445" y="210" fontSize="8" fill="#0284c7" opacity="0.8">Ulsoor Lake</text>

                {/* Parks */}
                <rect x="250" y="210" width="65" height="42" rx="12" fill="#f0fdf4" stroke="#dcfce7" strokeWidth="1.5" opacity="0.9" />
                <text x="282" y="235" fontSize="8" fill="#059669" textAnchor="middle" opacity="0.8">Cubbon Park</text>

                {/* Zones */}
                <path d="M 230 160 Q 300 140 370 160 Q 380 230 350 260 Q 280 270 230 250 Z" fill="#fef08a" fillOpacity="0.10" stroke="#fef08a" strokeWidth="1" strokeDasharray="4 2" />
                <path d="M 370 140 Q 560 120 580 180 T 500 340 Q 400 340 380 250 Z" fill="#e0f2fe" fillOpacity="0.12" stroke="#bae6fd" strokeWidth="1" strokeDasharray="4 2" />
                <path d="M 220 250 H 380 Q 400 350 380 390 H 200 Z" fill="#ffedd5" fillOpacity="0.08" stroke="#fed7aa" strokeWidth="1" strokeDasharray="4 2" />
                <path d="M 210 20 Q 380 30 430 70 Q 370 140 230 140 Z" fill="#e0e7ff" fillOpacity="0.10" stroke="#c7d2fe" strokeWidth="1" strokeDasharray="4 2" />
                <path d="M 50 120 Q 230 140 230 250 Q 180 350 100 380 Z" fill="#f0fdf4" fillOpacity="0.12" stroke="#bbf7d0" strokeWidth="1" strokeDasharray="4 2" />

                {/* Metro */}
                <path d="M 105 315 L 245 200 L 320 195 L 390 185 L 470 125 L 530 173" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeDasharray="4 3" opacity="0.8" />
                <path d="M 175 120 L 205 160 L 245 200 L 270 245 L 260 270 L 185 295" fill="none" stroke="#059669" strokeWidth="2.5" strokeDasharray="4 3" opacity="0.8" />
                <circle cx="245" cy="200" r="4.5" fill="white" stroke="#1e293b" strokeWidth="1.5" />
                <text x="245" y="210" fontSize="7" fill="#1e293b" textAnchor="middle" fontWeight="bold">Majestic</text>

                {/* ── LIVE-COLOURED CORRIDORS ── */}
                {/* Bellary Road */}
                <path d="M 290 50 L 300 200" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
                <path d="M 290 50 L 300 200" fill="none" strokeWidth="6" strokeLinecap="round" opacity="0.85"
                  stroke={nodes.find(n => n.id === 'corr-4')?.color ?? '#94a3b8'} />
                <text x="282" y="125" fontSize="8" fill={nodes.find(n => n.id === 'corr-4')?.color ?? '#94a3b8'} transform="rotate(86,282,125)" fontWeight="bold">Bellary Road (NH-44)</text>

                {/* Tumkur Road */}
                <path d="M 132 168 L 300 200" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
                <path d="M 132 168 L 300 200" fill="none" strokeWidth="6" strokeLinecap="round" opacity="0.85"
                  stroke={nodes.find(n => n.id === 'corr-3')?.color ?? '#94a3b8'} />
                <text x="195" y="178" fontSize="8" fill={nodes.find(n => n.id === 'corr-3')?.color ?? '#94a3b8'} transform="rotate(11,195,178)" fontWeight="bold">Tumkur Road (NH-48)</text>

                {/* Hosur Road */}
                <path d="M 300 200 L 415 352" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
                <path d="M 300 200 L 415 352" fill="none" strokeWidth="6" strokeLinecap="round" opacity="0.85"
                  stroke={nodes.find(n => n.id === 'corr-2')?.color ?? '#94a3b8'} />
                <text x="345" y="260" fontSize="8" fill={nodes.find(n => n.id === 'corr-2')?.color ?? '#94a3b8'} transform="rotate(53,345,260)" fontWeight="bold">Hosur Road Expressway</text>

                {/* ORR East */}
                <path d="M 290 50 Q 560 80 470 260" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
                <path d="M 290 50 Q 560 80 470 260" fill="none" strokeWidth="6" strokeLinecap="round" opacity="0.85"
                  stroke={nodes.find(n => n.id === 'corr-1')?.color ?? '#94a3b8'} />
                <text x="460" y="145" fontSize="8" fill={nodes.find(n => n.id === 'corr-1')?.color ?? '#94a3b8'} transform="rotate(-62,460,145)" fontWeight="bold">ORR East Corridor</text>

                {/* Secondary roads */}
                <path d="M 320 195 L 390 185 L 470 125 L 530 125" fill="none" stroke="#94a3b8" strokeWidth="3" opacity="0.35" />
                <path d="M 260 270 L 255 320 L 250 395" fill="none" stroke="#94a3b8" strokeWidth="3.5" opacity="0.35" />
                <path d="M 105 315 L 245 200" fill="none" stroke="#cbd5e1" strokeWidth="4" opacity="0.5" />

                {/* Landmark dots */}
                {[
                  [325, 212, 'Brigade Rd'], [320, 172, 'Commercial St'], [305, 315, 'BTM Layout'],
                  [255, 331, 'JP Nagar'], [220, 276, 'Basavanagudi'], [185, 306, 'Banashankari'],
                  [395, 224, 'Domlur'], [470, 214, 'Marathahalli'], [540, 235, 'Varthur'],
                  [340, 85, 'Manyata Tech Park'], [275, 119, 'RT Nagar'], [280, 18, 'Yelahanka'],
                  [165, 184, 'Rajajinagar'], [105, 324, 'Kengeri'],
                ].map(([cx, cy, label]) => (
                  <g key={String(label)}>
                    <circle cx={Number(cx)} cy={Number(cy)} r="1.5" fill="#94a3b8" />
                    <text x={Number(cx)} y={Number(cy) + 9} fontSize="6" fill="#64748b" textAnchor="middle">{label}</text>
                  </g>
                ))}

                {/* Major junctions */}
                <circle cx="290" cy="50" r="10" fill="white" stroke="#94a3b8" strokeWidth="2" />
                <circle cx="290" cy="50" r="4" fill="#475569" />
                <text x="238" y="38" fontSize="8" fill="#64748b">Hebbal Flyover</text>
                <circle cx="360" cy="312" r="11" fill="white" stroke="#94a3b8" strokeWidth="2" />
                <circle cx="360" cy="312" r="4" fill="#475569" />
                <text x="312" y="332" fontSize="8" fill="#64748b">Silk Board Junction</text>
                <circle cx="478" cy="158" r="9" fill="white" stroke="#94a3b8" strokeWidth="1.5" />
                <circle cx="478" cy="158" r="3" fill="#475569" />
                <text x="492" y="161" fontSize="8" fill="#64748b">K.R. Puram</text>
                <circle cx="300" cy="200" r="14" fill="#f8fafc" stroke="#475569" strokeWidth="2" />
                <circle cx="300" cy="200" r="5" fill="#0f172a" />
              </svg>

              {/* ── Live Risk Node Buttons ── */}
              {nodes.map(corr => {
                const isSelected = selectedId === corr.id;
                return (
                  <button key={corr.id} id={`btn-node-${corr.id}`}
                    onClick={() => setSelectedId(corr.id)}
                    className="absolute p-2 rounded-full cursor-pointer flex flex-col items-center gap-1 transition-all duration-300 z-30 group"
                    style={{ left: `${corr.x}%`, top: `${corr.y}%`, transform: 'translate(-50%,-50%)' }}>
                    <div className="relative flex items-center justify-center">
                      <span className="absolute w-8 h-8 rounded-full opacity-35 animate-ping"
                        style={{ backgroundColor: corr.color }} />
                      <div className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-md transition-all duration-300 ${isSelected ? 'scale-125 shadow-xl ring-2 ring-primary/40' : 'scale-100 hover:scale-110'}`}
                        style={{ backgroundColor: corr.color }}>
                        <Radio size={10} className="text-white animate-pulse" />
                      </div>
                    </div>
                    <div className={`bg-white/95 border border-slate-200 hover:border-slate-300 backdrop-blur-md text-slate-800 font-sans font-extrabold text-[9px] py-1 px-2.5 rounded-full shadow-md whitespace-nowrap transition-all flex items-center gap-1.5 ${isSelected ? 'opacity-100 ring-1 ring-primary/20' : 'opacity-85 group-hover:opacity-100'}`}>
                      <span>{corr.name}</span>
                      {loadingRisks
                        ? <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                        : <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full text-white font-black" style={{ backgroundColor: corr.color }}>{corr.riskScore}%</span>
                      }
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 3D Mappls View ─────────────────────────────────────────── */}
          <div className={`w-full h-full absolute inset-0 transition-opacity duration-500 ${viewMode === '3d' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            {/* Mappls map container */}
            <div id="mappls-3d-view" className="w-full h-full" />

            {/* Loading overlay */}
            {viewMode === '3d' && (!sdkReady || !mapReady) && (
              <div className="absolute inset-0 bg-[#edf4ff]/90 flex flex-col items-center justify-center gap-3 z-10">
                <Loader2 size={32} className="text-primary animate-spin" />
                <p className="font-sans text-sm font-semibold text-on-surface-variant">
                  {!sdkReady ? 'Loading Mappls 3D SDK…' : 'Rendering Bengaluru in 3D…'}
                </p>
                <p className="font-sans text-xs text-on-surface-variant/60">
                  Corridor colours show AI model risk predictions
                </p>
              </div>
            )}

            {/* 3D info + TomTom traffic toggles */}
            {viewMode === '3d' && mapReady && (
              <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-xl shadow-md flex flex-col gap-2.5 min-w-[190px]">

                {/* AI Model legend */}
                <span className="font-mono text-[9px] font-bold text-primary uppercase tracking-widest">AI Model Corridors</span>
                <div className="h-px bg-slate-100" />
                {[['#006b57', 'Low risk flow'], ['#c05400', 'Moderate congestion'], ['#ba1a1a', 'High risk / divert']].map(([c, l]) => (
                  <div key={l} className="flex items-center gap-2">
                    <span className="w-4 h-2 rounded shrink-0" style={{ backgroundColor: c }} />
                    <span className="font-sans text-[9px] text-slate-600">{l}</span>
                  </div>
                ))}

                <div className="h-px bg-slate-100" />

                {/* TomTom Traffic Layer toggles */}
                <span className="font-mono text-[9px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  TomTom Live Traffic
                </span>
                <button
                  onClick={toggleTraffic}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[9px] font-mono font-bold border cursor-pointer transition-all ${trafficVisible
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                    }`}
                >
                  <span>Flow Layer</span>
                  <span className={`w-2 h-2 rounded-full ${trafficVisible ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </button>
                <button
                  onClick={toggleIncidents}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[9px] font-mono font-bold border cursor-pointer transition-all ${incidentsVisible
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                    }`}
                >
                  <span>Incidents</span>
                  <span className={`w-2 h-2 rounded-full ${incidentsVisible ? 'bg-red-500' : 'bg-slate-300'}`} />
                </button>

                <div className="h-px bg-slate-100" />
                <p className="font-sans text-[9px] text-slate-400 leading-snug">
                  Click any pin to fly · TomTom real-time + AI model predictions
                </p>
              </div>
            )}
          </div>

          {/* Zoom & Reset controls (works for both views) */}
          <div className="absolute bottom-4 left-4 z-20 flex gap-2">
            {[{ label: '+', fn: zoomIn }, { label: '−', fn: zoomOut }].map(({ label, fn }) => (
              <button key={label} onClick={fn} className="w-9 h-9 bg-white hover:bg-slate-50 rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-primary cursor-pointer active:scale-95 transition-all font-bold text-lg">{label}</button>
            ))}
            <button onClick={resetView} className="w-9 h-9 bg-white hover:bg-slate-50 rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-primary cursor-pointer active:scale-95 transition-all">
              <Locate size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Detail Panel ──────────────────────────────────────────── */}
      <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0">

        <div className="glass-card rounded-2xl p-6 flex flex-col gap-5 border-2 border-primary/20">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-mono text-[9px] font-bold text-primary uppercase tracking-widest bg-primary/10 py-1 px-2.5 rounded-full">
                Focused Telemetry Node
              </span>
              <h3 className="font-sans font-extrabold text-[#005bb1] text-xl mt-2 leading-none">{selectedNode.name}</h3>
              <p className="font-sans text-xs text-on-surface-variant font-medium mt-1">{selectedNode.nameKa}</p>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="font-mono text-[10px] text-on-surface-variant font-bold uppercase">Risk Index</span>
              {loadingRisks
                ? <Loader2 size={20} className="text-primary animate-spin mt-1" />
                : <span className="font-sans font-black text-2xl" style={{ color: selectedNode.color }}>{selectedNode.riskScore}%</span>
              }
            </div>
          </div>

          <div className="h-px bg-slate-200/60" />

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant font-bold block">Live Hotspot Summary</span>
                <span className="font-sans text-sm font-bold text-on-surface block">{loadingRisks ? '…' : topHotspot.name}</span>
              </div>
              {!loadingRisks && (
                <span className="font-mono text-[10px] font-bold text-white px-2.5 py-1 rounded-full" style={{ backgroundColor: topHotspot.color }}>
                  {topHotspot.riskScore}%
                </span>
              )}
            </div>
            <p className="font-sans text-xs text-on-surface-variant mt-2">{topHotspot.peakTimeMsg}</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              {selectedNode.statusLevel === 'error' ? <AlertOctagon size={16} className="text-error shrink-0 mt-0.5" />
                : selectedNode.statusLevel === 'warning' ? <ShieldAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  : <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />}
              <div>
                <span className="font-mono text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Real-Time Status</span>
                <span className="font-sans font-bold text-sm text-on-surface mt-0.5 block">{selectedNode.status}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Radio size={16} className="text-primary shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-mono text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Peak Projection Bulletin</span>
                <span className="font-sans text-xs text-on-surface leading-snug mt-0.5 block">{selectedNode.peakTimeMsg}</span>
              </div>
            </div>
            {!loadingRisks && (
              <div className="flex gap-2 flex-wrap">
                <span className="bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[9px] font-bold px-2.5 py-1 rounded-full">Events: {selectedNode.eventCount}</span>
                <span className="bg-red-50 border border-red-100 text-red-700 font-mono text-[9px] font-bold px-2.5 py-1 rounded-full">High-Impact: {selectedNode.highImpact}</span>
                <span className="font-mono text-[9px] font-bold px-2.5 py-1 rounded-full border"
                  style={{ backgroundColor: selectedNode.color + '18', borderColor: selectedNode.color + '44', color: selectedNode.color }}>
                  {selectedNode.riskLevel}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <button id={`btn-dispatch-${selectedNode.id}`}
              onClick={() => { setDispatchedStates(p => ({ ...p, [selectedNode.id]: true })); showToast(`Units deployed to ${selectedNode.name}.`); }}
              disabled={dispatchedStates[selectedNode.id]}
              className={`w-full py-2.5 rounded-xl font-sans font-bold text-xs shadow-sm transition-all text-center cursor-pointer ${dispatchedStates[selectedNode.id] ? 'bg-emerald-100 text-emerald-800 cursor-not-allowed border border-emerald-300' : 'bg-primary hover:bg-primary/90 text-white'}`}>
              {dispatchedStates[selectedNode.id] ? '✓ Dispatch Active' : 'Dispatch Field Personnel'}
            </button>
            <button onClick={() => showToast(`Bypass alert published for ${selectedNode.name}.`)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-on-surface-variant rounded-xl font-sans font-semibold text-xs border border-slate-200 text-center cursor-pointer transition-all">
              Broadcast Route Deviation Alert
            </button>
          </div>
        </div>

        {/* Camera Simulation */}
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
              <Tv size={14} className="text-primary animate-pulse" /> Sector Camera Simulation
            </h4>
            <button onClick={() => setCameraActive(p => !p)} className="text-[10px] font-mono text-primary font-bold hover:underline cursor-pointer">
              {cameraActive ? 'Pause Feeds' : 'Resume Feeds'}
            </button>
          </div>
          <div className="w-full h-44 bg-slate-950 rounded-xl relative overflow-hidden border border-slate-800 shadow-md flex items-center justify-center">
            {cameraActive ? (
              <>
                <div className="absolute top-2 left-2 z-10 font-mono text-[8px] text-emerald-400 font-bold bg-black/40 px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  CAM_{selectedNode.id.toUpperCase()}_LIVE
                </div>
                <div className="absolute top-2 right-2 z-10 font-mono text-[8px] text-slate-300 font-semibold bg-black/40 px-2 py-0.5 rounded">FPS: 30.00</div>
                <div className="absolute w-8 h-8 border border-white/20 rounded-full" />
                <div className="absolute w-12 h-0.5 bg-white/10" />
                <div className="absolute h-12 w-0.5 bg-white/10" />
                <div className="absolute w-full h-[1.5px] bg-emerald-400/35 left-0 animate-bounce" />
                <div className="absolute text-emerald-400 text-[10px] font-mono animate-pulse text-center leading-tight">
                  <span className="font-bold block">DETECTING ENTRAINMENT PROFILE…</span>
                  <span className="text-[8px] opacity-75">
                    Vehicle Count: {selectedNode.riskScore > 70 ? '82/min' : selectedNode.riskScore > 40 ? '55/min' : '28/min'} · {selectedNode.riskLevel}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-slate-400 font-mono text-xs font-semibold uppercase">Feed Suspended</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
