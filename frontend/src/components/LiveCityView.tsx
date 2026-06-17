import { useState } from 'react';
import { 
  Radar, 
  TrendingUp, 
  TrendingDown, 
  Maximize2, 
  ExternalLink, 
  Map, 
  Sliders, 
  Compass,
  AlertOctagon,
  Wrench,
  ShieldAlert,
  CloudRain,
  ChevronRight,
  Radio,
  Tv,
  CheckCircle,
  Plus,
  Minus,
  Locate
} from 'lucide-react';
import { INITIAL_CORRIDORS } from '../data';
import { Corridor } from '../types';

interface LiveCityViewProps {
  language: string;
}

export default function LiveCityView({ language }: LiveCityViewProps) {
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('corr-1');
  const [mapScale, setMapScale] = useState<number>(1);
  const [rotated, setRotated] = useState<boolean>(false);
  const [cameraFeedSimulating, setCameraFeedSimulating] = useState<boolean>(true);
  const [activeToast, setActiveToast] = useState<string | null>(null);

  const activeCorridor = INITIAL_CORRIDORS.find(c => c.id === selectedCorridorId) || INITIAL_CORRIDORS[0];

  const handleNodeClick = (id: string) => {
    setSelectedCorridorId(id);
  };

  // Dispatch officer to active corridor
  const [dispatchedStates, setDispatchedStates] = useState<Record<string, boolean>>({});

  const triggerDispatch = (id: string) => {
    setDispatchedStates(p => ({ ...p, [id]: true }));
    showToast(`Officer dispatch active: Units deployed to verify congestion profile at ${activeCorridor.name}.`);
  };

  const showToast = (message: string) => {
    setActiveToast(message);
    setTimeout(() => {
      setActiveToast((current) => current === message ? null : current);
    }, 5000);
  };

  // Neighborhood localities for virtual floating badges
  const LOCALITY_CALLOUTS = [
    { name: 'MG Road', tag: 'CBD Core', risk: '45%', x: 53.3, y: 48.0, color: '#f59e0b' },
    { name: 'Indiranagar', tag: 'Commercial Hub', risk: '38%', x: 65.0, y: 46.2, color: '#10b981' },
    { name: 'Whitefield', tag: 'IT Export Zone', risk: '55%', x: 88.3, y: 43.2, color: '#3b82f6' },
    { name: 'Bellandur', tag: 'Tech Corridor', risk: '84%', x: 77.5, y: 63.7, color: '#ef4444' },
    { name: 'Electronic City', tag: 'Industrial/IT', risk: '61%', x: 66.7, y: 91.2, color: '#f59e0b' },
    { name: 'Jayanagar', tag: 'Residential Core', risk: '24%', x: 43.3, y: 67.5, color: '#10b981' }
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fade-in w-full max-w-7xl mx-auto px-1 select-none relative">
      
      {/* Toast notification overlay */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white text-xs font-sans px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/10 animate-fade-in max-w-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-medium pr-1">{activeToast}</span>
          <button onClick={() => setActiveToast(null)} className="font-mono text-slate-400 hover:text-white ml-auto pl-1">×</button>
        </div>
      )}

      {/* LEFT: Live Map container with 3D elements */}
      <div className="flex-grow flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="font-sans font-extrabold text-2xl md:text-3xl text-on-surface tracking-tight mb-1">
              {language === 'kn' ? 'ಲೈವ್ ಸಿಟಿ ವ್ಯೂ' : 'Live Sector View'}
            </h2>
            <p className="font-sans text-sm text-on-surface-variant">
              Tapped nodes reveal real-time camera simulation telemetry, peak times, and recommended route deviations.
            </p>
          </div>

          {/* Isometric Toggle rotation button */}
          <button
            onClick={() => setRotated(!rotated)}
            className="hidden md:flex items-center gap-2 bg-white/75 hover:bg-white border border-slate-200 shadow-sm py-2 px-4 rounded-xl font-sans text-xs font-semibold text-primary transition-all cursor-pointer"
          >
            <Compass className={`w-4 h-4 transition-transform duration-500 ${rotated ? 'rotate-180' : ''}`} />
            <span>{rotated ? 'True Grid Map' : 'Isometric 3D View'}</span>
          </button>
        </div>

        {/* 3D Map Viewport Screen */}
        <div className="w-full h-96 md:h-[480px] bg-[#edf4ff]/55 border border-white/60 backdrop-blur-md rounded-3xl overflow-hidden relative shadow-lg flex items-center justify-center">
          
          {/* Compass & Scale Controls overlay inside viewport */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 pointer-events-none">
            <span className="font-mono text-[9px] font-semibold text-slate-500 uppercase tracking-widest bg-white/90 py-1 px-3 rounded-full border border-slate-200/60 shadow-xs">
              Bengaluru Network Mapping
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-sans text-[10px] text-slate-600 bg-white/95 py-0.5 px-2.5 rounded-full border border-slate-200/40 shadow-xs">Telemetry Active</span>
            </div>
          </div>

          {/* Subtle Legend (placed flat on top-right of the viewport for legibility) */}
          <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-md border border-slate-200 p-3.5 rounded-xl shadow-md flex flex-col gap-2 pointer-events-auto min-w-[170px] max-w-[210px]">
            <span className="font-sans text-[3px] font-bold text-slate-500 uppercase tracking-widest block">Map Legend</span>
            
            <div className="h-px bg-slate-100" />
            
            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Transit Corridors</span>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-1 rounded bg-[#0284c7]" />
                <span className="font-sans text-[9px] text-slate-600 font-medium">Low (Bellary Rd)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-1 rounded bg-[#006b57]" />
                <span className="font-sans text-[9px] text-slate-600 font-medium">Stable (Tumkur Rd)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-1 rounded bg-[#c05400]" />
                <span className="font-sans text-[9px] text-slate-600 font-medium">Elevated (Hosur Rd)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-1 rounded bg-[#ba1a1a]" />
                <span className="font-sans text-[9px] text-slate-600 font-medium">Critical (ORR East)</span>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Metro Networks</span>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-0.5 bg-[#7c3aed] border-t border-dashed" />
                <span className="font-sans text-[9px] text-slate-600 font-medium">Purple Line (E-W)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-0.5 bg-[#059669] border-t border-dashed" />
                <span className="font-sans text-[9px] text-slate-600 font-medium">Green Line (N-S)</span>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded bg-yellow-100 border border-yellow-300 opacity-60" />
              <span className="font-sans text-[9px] text-slate-500 font-medium">Regional Zones</span>
            </div>
          </div>

          {/* Map zoom controls */}
          <div className="absolute bottom-4 left-4 z-20 flex gap-2">
            <button 
              onClick={() => setMapScale(p => Math.min(1.4, p + 0.15))}
              className="w-9 h-9 bg-white hover:bg-slate-50 rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-primary cursor-pointer transition-all active:scale-95"
              title="Zoom Map"
            >
              <Plus size={15} />
            </button>
            <button 
              onClick={() => setMapScale(p => Math.max(0.7, p - 0.15))}
              className="w-9 h-9 bg-white hover:bg-slate-50 rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-primary cursor-pointer transition-all active:scale-95"
              title="Zoom Map Out"
            >
              <Minus size={15} />
            </button>
            <button 
              onClick={() => { setMapScale(1); setRotated(false); }}
              className="w-9 h-9 bg-white hover:bg-slate-50 rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-primary cursor-pointer transition-all active:scale-95"
              title="Reset View"
            >
              <Locate size={15} />
            </button>
          </div>

          {/* MAP CANVAS GRID CONTAINER */}
          <div 
            className="w-full h-full relative flex items-center justify-center transition-all duration-700 ease-out"
            style={{ 
              transform: rotated 
                ? `rotateX(52deg) rotateZ(-30deg) scale(${mapScale * 0.95})` 
                : `scale(${mapScale})`,
              transformStyle: 'preserve-3d'
            }}
          >
            
            {/* Holographic floor plane */}
            <div className="absolute w-[520px] h-[520px] border border-dashed border-sky-200/50 rounded-full animate-spin [animation-duration:120s] opacity-25" />
            
            {/* Elegant stylized top-down Map SVG backdrop of Bengaluru corridors */}
            <svg className="absolute w-[625px] h-[415px]" viewBox="0 0 600 400" fill="none">
              {/* Soft blueprint grid */}
              <defs>
                <pattern id="bengaluru-blueprint-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e8effe" strokeWidth="0.7" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#bengaluru-blueprint-grid)" opacity="0.8" />

              {/* Waterbodies (Hebbal Lake & Ulsoor Lake in soft light-blue pastel tones) */}
              <path d="M 240 50 Q 280 30 330 45 Q 355 65 315 80 Q 275 85 240 50 Z" fill="#e0f2fe" stroke="#bae6fd" strokeWidth="1.5" opacity="0.85" />
              <text x="305" y="66" className="font-sans text-[8px] font-bold text-sky-600 fill-current opacity-80" transform="rotate(-5, 305, 66)">Hebbal Lake</text>

              <path d="M 410 190 Q 430 170 460 185 Q 480 205 450 220 Q 420 225 410 190 Z" fill="#e0f2fe" stroke="#bae6fd" strokeWidth="1.5" opacity="0.85" />
              <text x="445" y="210" className="font-sans text-[8px] font-bold text-sky-600 fill-current opacity-80">Ulsoor Lake</text>

              {/* Greenery / parks (Cubbon Park) */}
              <rect x="250" y="210" width="65" height="42" rx="12" fill="#f0fdf4" stroke="#dcfce7" strokeWidth="1.5" opacity="0.9" />
              <text x="282" y="235" className="font-sans text-[8px] font-bold text-emerald-600 fill-current opacity-80" textAnchor="middle">Cubbon Park</text>

              {/* Lalbagh Gardens */}
              <ellipse cx="270" cy="245" rx="18" ry="12" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1" opacity="0.8" />
              <text x="270" y="247" className="font-sans text-[6px] font-semibold text-emerald-700 fill-current" textAnchor="middle">Lalbagh</text>

              {/* REGIONAL URBAN SECTORS (Pale shaded zones for regional representation) */}
              {/* CBD Zone */}
              <path d="M 230 160 Q 300 140 370 160 Q 380 230 350 260 Q 280 270 230 250 Z" fill="#fef08a" fillOpacity="0.10" stroke="#fef08a" strokeWidth="1" strokeDasharray="4 2" />
              <text x="300" y="222" className="font-mono text-[8px] font-bold text-amber-600/30 fill-current tracking-widest uppercase" textAnchor="middle">CBD CORE</text>

              {/* East IT Corridor Zone */}
              <path d="M 370 140 Q 560 120 580 180 T 500 340 Q 400 340 380 250 Z" fill="#e0f2fe" fillOpacity="0.12" stroke="#bae6fd" strokeWidth="1" strokeDasharray="4 2" />
              <text x="480" y="235" className="font-mono text-[8px] font-bold text-sky-600/30 fill-current tracking-wider" textAnchor="middle">IT CORRIDOR ZONE</text>

              {/* South Bengaluru Zone */}
              <path d="M 220 250 H 380 Q 400 350 380 390 H 200 Z" fill="#ffedd5" fillOpacity="0.08" stroke="#fed7aa" strokeWidth="1" strokeDasharray="4 2" />
              <text x="290" y="335" className="font-mono text-[8px] font-bold text-orange-600/25 fill-current tracking-wider" textAnchor="middle">RESIDENTIAL SOUTH</text>

              {/* North / NE Zone */}
              <path d="M 210 20 Q 380 30 430 70 Q 370 140 230 140 Z" fill="#e0e7ff" fillOpacity="0.10" stroke="#c7d2fe" strokeWidth="1" strokeDasharray="4 2" />
              <text x="310" y="100" className="font-mono text-[8px] font-bold text-indigo-600/30 fill-current tracking-wider" textAnchor="middle">NORTHERN TRANSIT</text>

              {/* West Zone */}
              <path d="M 50 120 Q 230 140 230 250 Q 180 350 100 380 Z" fill="#f0fdf4" fillOpacity="0.12" stroke="#bbf7d0" strokeWidth="1" strokeDasharray="4 2" />
              <text x="135" y="260" className="font-mono text-[8px] font-bold text-emerald-600/25 fill-current tracking-wider" textAnchor="middle">WEST SECTOR</text>

              {/* METRO NETWORKS */}
              {/* Purple Line (E-W) */}
              <path d="M 105 315 L 245 200 L 320 195 L 390 185 L 470 125 L 530 173" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeDasharray="4 3" opacity="0.8" />
              {/* Green Line (N-S) */}
              <path d="M 175 120 L 205 160 L 245 200 L 270 245 L 260 270 L 185 295" fill="none" stroke="#059669" strokeWidth="2.5" strokeDasharray="4 3" opacity="0.8" />

              {/* Metro Station Dots */}
              <circle cx="245" cy="200" r="4.5" fill="white" stroke="#1e293b" strokeWidth="1.5" />
              <text x="245" y="210" className="font-sans text-[7px] font-black fill-slate-800" textAnchor="middle">Majestic</text>

              <circle cx="175" cy="120" r="3" fill="white" stroke="#059669" strokeWidth="1.2" />
              <text x="175" y="112" className="font-sans text-[6.5px] font-semibold fill-slate-500" textAnchor="middle">Yeshwanthpur</text>

              <circle cx="320" cy="195" r="3" fill="white" stroke="#7c3aed" strokeWidth="1.2" />
              <text x="320" y="188" className="font-sans text-[6px] font-semibold fill-slate-500" textAnchor="middle">MG Road Stn</text>

              <circle cx="390" cy="185" r="3" fill="white" stroke="#7c3aed" strokeWidth="1.2" />
              <circle cx="470" cy="125" r="3" fill="white" stroke="#7c3aed" strokeWidth="1.2" />

              {/* Highways & Corridors */}
              <path d="M 290 50 Q 560 80 470 260 T 360 380" fill="none" stroke="#e2e8f0" strokeWidth="11" strokeLinecap="round" opacity="0.7" />
              <path d="M 290 50 Q 560 80 470 260 T 360 380" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="6 4" opacity="0.6" />

              {/* Corridor 4: Bellary Road */}
              <path d="M 290 50 L 300 200" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
              <path d="M 290 50 L 300 200" fill="none" stroke="#0284c7" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
              <text x="282" y="125" className="font-sans text-[8px] font-black text-sky-800 fill-current" transform="rotate(86, 282, 125)">Bellary Road (NH-44)</text>

              {/* Corridor 3: Tumkur Road */}
              <path d="M 132 168 L 300 200" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
              <path d="M 132 168 L 300 200" fill="none" stroke="#006b57" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
              <text x="195" y="178" className="font-sans text-[8px] font-black text-emerald-800 fill-current" transform="rotate(11, 195, 178)">Tumkur Road (NH-48)</text>

              {/* Corridor 2: Hosur Road */}
              <path d="M 300 200 L 415 352" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
              <path d="M 300 200 L 415 352" fill="none" stroke="#c05400" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
              <text x="345" y="260" className="font-sans text-[8px] font-black text-amber-900 fill-current" transform="rotate(53, 345, 260)">Hosur Road Expressway</text>

              {/* Corridor 1: ORR East 1 */}
              <path d="M 290 50 Q 560 80 470 260" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
              <path d="M 290 50 Q 560 80 470 260" fill="none" stroke="#ba1a1a" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
              <text x="460" y="145" className="font-sans text-[8px] font-black text-red-800 fill-current" transform="rotate(-62, 460, 145)">ORR East Corridor</text>

              {/* Secondary roads for rich virtual look */}
              <path d="M 320 195 L 390 185 L 470 125 L 530 125" fill="none" stroke="#94a3b8" strokeWidth="3" opacity="0.35" />
              <path d="M 260 270 L 255 320 L 250 395" fill="none" stroke="#94a3b8" strokeWidth="3.5" opacity="0.35" />
              <path d="M 105 315 L 245 200" fill="none" stroke="#cbd5e1" strokeWidth="4" opacity="0.5" />
              <path d="M 80 215 L 245 200" fill="none" stroke="#94a3b8" strokeWidth="3" opacity="0.3" />

              {/* Secondary Road Labels */}
              <text x="420" y="172" className="font-sans text-[5.5px] font-semibold text-slate-400 fill-current">Old Madras Rd</text>
              <text x="242" y="350" className="font-sans text-[5.5px] font-semibold text-slate-400 fill-current" transform="rotate(-86, 242, 350)">Bannerghatta Rd</text>
              <text x="145" y="275" className="font-sans text-[5.5px] font-semibold text-slate-400 fill-current" transform="rotate(-38, 145, 275)">Mysore Road</text>

              {/* Neighborhood Landmark Dots */}
              <circle cx="325" cy="212" r="1.5" fill="#94a3b8" />
              <text x="328" y="215" className="font-sans text-[6px] font-bold text-slate-500 fill-current">Brigade Rd</text>
              
              <circle cx="320" cy="172" r="1.5" fill="#94a3b8" />
              <text x="312" y="167" className="font-sans text-[6px] font-bold text-slate-400 fill-current">Commercial St</text>

              <circle cx="305" cy="305" r="1.5" fill="#64748b" opacity="0.6" />
              <text x="305" y="315" className="font-sans text-[6.5px] font-semibold text-slate-500 fill-current" textAnchor="middle">BTM Layout</text>

              <circle cx="255" cy="320" r="1.5" fill="#64748b" opacity="0.6" />
              <text x="255" y="331" className="font-sans text-[6.5px] font-semibold text-slate-500 fill-current" textAnchor="middle">JP Nagar</text>

              <circle cx="220" cy="265" r="1.5" fill="#64748b" opacity="0.6" />
              <text x="220" y="276" className="font-sans text-[6.5px] font-bold text-slate-500 fill-current" textAnchor="middle">Basavanagudi</text>

              <circle cx="185" cy="295" r="1.5" fill="#64748b" opacity="0.6" />
              <text x="185" y="306" className="font-sans text-[6.5px] font-semibold text-slate-500 fill-current" textAnchor="middle">Banashankari</text>

              <circle cx="395" cy="215" r="1.5" fill="#94a3b8" />
              <text x="395" y="224" className="font-sans text-[6.5px] font-semibold text-slate-500 fill-current" textAnchor="middle">Domlur</text>

              <circle cx="470" cy="205" r="2" fill="#475569" />
              <text x="470" y="214" className="font-sans text-[6.5px] font-bold text-slate-500 fill-current" textAnchor="middle">Marathahalli</text>

              <circle cx="540" cy="225" r="1.5" fill="#94a3b8" />
              <text x="540" y="235" className="font-sans text-[6.5px] font-semibold text-slate-500 fill-current" textAnchor="middle">Varthur</text>

              <circle cx="340" cy="75" r="2" fill="#4338ca" opacity="0.5" />
              <text x="340" y="85" className="font-sans text-[6.5px] font-bold text-indigo-700/70 fill-current" textAnchor="middle">Manyata Tech Park</text>

              <circle cx="275" cy="110" r="1.5" fill="#94a3b8" />
              <text x="275" y="119" className="font-sans text-[6.5px] font-semibold text-slate-500 fill-current" textAnchor="middle">RT Nagar</text>

              <circle cx="280" cy="25" r="2" fill="#4338ca" />
              <text x="280" y="18" className="font-sans text-[6.5px] font-bold text-indigo-700 fill-current" textAnchor="middle">Yelahanka</text>

              <circle cx="165" cy="175" r="1.5" fill="#94a3b8" />
              <text x="165" y="184" className="font-sans text-[6.5px] font-bold text-slate-500 fill-current" textAnchor="middle">Rajajinagar</text>

              <circle cx="105" cy="315" r="1.5" fill="#64748b" />
              <text x="105" y="324" className="font-sans text-[6.5px] font-bold text-slate-500 fill-current" textAnchor="middle">Kengeri</text>

              {/* Junction indicators */}
              <circle cx="290" cy="50" r="10" fill="white" stroke="#94a3b8" strokeWidth="2" />
              <circle cx="290" cy="50" r="4" fill="#475569" />
              <text x="238" y="38" className="font-sans text-[8px] font-bold text-slate-500 fill-current">Hebbal Flyover</text>

              <circle cx="360" cy="312" r="11" fill="white" stroke="#94a3b8" strokeWidth="2" />
              <circle cx="360" cy="312" r="4" fill="#475569" />
              <text x="312" y="332" className="font-sans text-[8px] font-bold text-slate-500 fill-current">Silk Board Junction</text>

              <circle cx="478" cy="158" r="9" fill="white" stroke="#94a3b8" strokeWidth="1.5" />
              <circle cx="478" cy="158" r="3" fill="#475569" />
              <text x="492" y="161" className="font-sans text-[8px] font-bold text-slate-500 fill-current">K.R. Puram</text>

              <circle cx="300" cy="200" r="14" fill="#f8fafc" stroke="#475569" strokeWidth="2" />
              <circle cx="300" cy="200" r="5" fill="#0f172a" />
            </svg>

            {/* Stylized 3D blocks representing Bengaluru sectors */}
            <div 
              className="absolute bg-white/95 border border-slate-200 w-14 h-12 rounded-lg flex flex-col items-center justify-end font-mono text-[7px] font-bold text-slate-600 shadow-md p-1"
              style={{ 
                left: '265px', 
                top: '185px', 
                transform: rotated ? 'translateZ(15px)' : 'none',
                transformStyle: 'preserve-3d'
              }}
            >
              <span className="text-center uppercase leading-none block font-extrabold text-slate-800">C.B.D.</span>
              <span className="text-[6px] tracking-tight block">Vidhana Soudha</span>
            </div>

            <div 
              className="absolute bg-sky-50/90 border border-sky-100 w-16 h-12 rounded-lg flex flex-col items-center justify-end font-mono text-[7px] font-bold text-sky-800 shadow-md p-1"
              style={{ 
                left: '375px', 
                top: '290px', 
                transform: rotated ? 'translateZ(20px)' : 'none',
                transformStyle: 'preserve-3d'
              }}
            >
              <div className="w-1 h-1 rounded-full bg-sky-400 absolute top-1" />
              <span className="text-center uppercase leading-none block font-extrabold text-sky-900 leading-tight">Electronic City</span>
            </div>

            <div 
              className="absolute bg-emerald-50/90 border border-emerald-100 w-14 h-12 rounded-lg flex flex-col items-center justify-end font-mono text-[7px] font-bold text-emerald-800 shadow-md p-1"
              style={{ 
                left: '435px', 
                top: '120px', 
                transform: rotated ? 'translateZ(15px)' : 'none',
                transformStyle: 'preserve-3d'
              }}
            >
              <span className="text-center uppercase leading-none block font-extrabold text-emerald-900">Whitefield</span>
            </div>

            <div 
              className="absolute bg-neutral-50/95 border border-neutral-200 w-12 h-11 rounded-lg flex flex-col items-center justify-end font-mono text-[7px] font-bold text-neutral-700 shadow-md p-1"
              style={{ 
                left: '105px', 
                top: '145px', 
                transform: rotated ? 'translateZ(15px)' : 'none',
                transformStyle: 'preserve-3d'
              }}
            >
              <span className="text-center uppercase leading-none block font-extrabold text-neutral-800 text-[6.5px]">Peenya Ind.</span>
            </div>

            {/* ELEVATED FLOATING CALLOUT LABELS FOR LOCALITIES */}
            {LOCALITY_CALLOUTS.map((loc, idx) => (
              <div
                key={`locality-call-${idx}`}
                className="absolute z-20 pointer-events-none transition-all duration-300"
                style={{
                  left: `${loc.x}%`,
                  top: `${loc.y}%`,
                  transform: rotated ? 'translateZ(25px) translate(-50%, -50%)' : 'translate(-50%, -50%) scale(0.9)',
                  transformStyle: 'preserve-3d'
                }}
              >
                <div className="bg-white/95 border border-slate-200/80 rounded-xl px-2.5 py-1.5 shadow-md flex flex-col gap-0.5 min-w-[105px]">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-sans font-extrabold text-[8px] text-slate-800 whitespace-nowrap">{loc.name}</span>
                    <span 
                      className="text-[7.5px] font-mono leading-none px-1 py-0.5 rounded-full text-white font-bold"
                      style={{ backgroundColor: loc.color }}
                    >
                      {loc.risk}
                    </span>
                  </div>
                  <span className="font-sans text-[6.5px] font-medium text-slate-400 uppercase tracking-tight">{loc.tag}</span>
                </div>
              </div>
            ))}

            {/* Interactive Node Anchors (Tapped points) */}
            {INITIAL_CORRIDORS.map((corr) => {
              const isSelected = selectedCorridorId === corr.id;
              return (
                <button
                  key={corr.id}
                  id={`btn-corridor-node-${corr.id}`}
                  onClick={() => handleNodeClick(corr.id)}
                  className="absolute p-2 rounded-full cursor-pointer flex flex-col items-center gap-1 transition-all duration-300 z-30 group"
                  style={{
                    left: `${corr.x}%`,
                    top: `${corr.y}%`,
                    transform: rotated ? 'translateZ(30px) translate(-50%, -50%)' : 'translate(-50%, -50%)'
                  }}
                >
                  {/* Glowing pulsing halo */}
                  <div className="relative flex items-center justify-center">
                    <span 
                      className="absolute w-8 h-8 rounded-full opacity-[0.35] animate-ping"
                      style={{ backgroundColor: corr.color }}
                    />
                    <div 
                      className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-md transition-all duration-300 ${
                        isSelected ? 'scale-125 shadow-xl ring-2 ring-primary/40' : 'scale-100 hover:scale-110'
                      }`}
                      style={{ backgroundColor: corr.color }}
                    >
                      <Radio size={10} className="text-white animate-pulse" />
                    </div>
                  </div>

                  {/* Floating ID badge with current risk / utilization level in pill */}
                  <div className={`bg-white/95 border border-slate-200 hover:border-slate-300 backdrop-blur-md text-slate-800 font-sans font-extrabold text-[9px] py-1 px-2.5 rounded-full shadow-md whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 ${
                    isSelected ? 'opacity-100 scale-102 ring-1 ring-primary/20' : 'opacity-85 group-hover:opacity-100 group-hover:scale-101'
                  }`}>
                    <span>{corr.name}</span>
                    <span 
                      className="text-[8px] font-mono px-1.5 py-0.5 rounded-full text-white font-black"
                      style={{ backgroundColor: corr.color }}
                    >
                      {corr.riskScore}%
                    </span>
                  </div>
                </button>
              );
            })}

          </div>
        </div>
      </div>

      {/* RIGHT: Focused corridor details panel & Simulated video feed */}
      <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0">
        
        {/* Focused Corridor telemetry Card */}
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-5 border-2 border-primary/20">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-mono text-[9px] font-bold text-primary uppercase tracking-widest bg-primary/10 py-1 px-2.5 rounded-full">Focused Telemetry Node</span>
              <h3 className="font-sans font-extrabold text-[#005bb1] text-xl mt-2 leading-none">{activeCorridor.name}</h3>
              <p className="font-sans text-xs text-on-surface-variant font-medium mt-1">{activeCorridor.nameKa}</p>
            </div>
            
            {/* Risk Badge */}
            <div className="text-right flex flex-col items-end">
              <span className="font-mono text-[10px] text-on-surface-variant font-bold uppercase">Risk Index</span>
              <span 
                className="font-sans font-black text-2xl"
                style={{ color: activeCorridor.color }}
              >
                {activeCorridor.riskScore}%
              </span>
            </div>
          </div>

          <div className="h-px bg-slate-200/60" />

          {/* Status information */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              {activeCorridor.statusLevel === 'error' ? (
                <AlertOctagon size={16} className="text-error shrink-0 mt-0.5" />
              ) : activeCorridor.statusLevel === 'warning' ? (
                <ShieldAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-mono text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Real-time status</span>
                <span className="font-sans font-bold text-sm text-on-surface leading-tight mt-0.5 block">{activeCorridor.status}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Radio size={16} className="text-primary shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-mono text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Peak projection bulletin</span>
                <span className="font-sans text-xs text-on-surface leading-snug mt-0.5 block">{activeCorridor.peakTimeMsg}</span>
              </div>
            </div>
          </div>

          {/* Action trigger buttons inside detail */}
          <div className="flex flex-col gap-2 mt-2">
            <button
              id={`btn-dispatch-corridor-${activeCorridor.id}`}
              onClick={() => triggerDispatch(activeCorridor.id)}
              disabled={dispatchedStates[activeCorridor.id]}
              className={`w-full py-2.5 rounded-xl font-sans font-bold text-xs shadow-sm transition-all text-center cursor-pointer ${
                dispatchedStates[activeCorridor.id]
                  ? 'bg-emerald-100 text-emerald-800 cursor-not-allowed border border-emerald-300'
                  : 'bg-primary hover:bg-primary/90 text-white hover:scale-101'
              }`}
            >
              {dispatchedStates[activeCorridor.id] ? '✓ Dispatch Personnel Active' : 'Dispatch Field Personnel'}
            </button>
            <button
              onClick={() => showToast(`Bypass alert successfully published across digital signage networks near ${activeCorridor.name}.`)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-on-surface-variant rounded-xl font-sans font-semibold text-xs border border-slate-200 hover:scale-101 text-center cursor-pointer transition-all"
            >
              Broadcast Route Deviation Alert
            </button>
          </div>
        </div>

        {/* Real-time simulation viewport card (Camera feed simulation) */}
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-3 relative select-none">
          <div className="flex justify-between items-center">
            <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
              <Tv size={14} className="text-primary animate-pulse" />
              Sector Camera Simulation
            </h4>
            <button 
              onClick={() => setCameraFeedSimulating(!cameraFeedSimulating)}
              className="text-[10px] font-mono text-primary font-bold hover:underline cursor-pointer"
            >
              {cameraFeedSimulating ? 'Pause Feeds' : 'Resume feeds'}
            </button>
          </div>

          {/* Simulated scanning camera layout */}
          <div className="w-full h-44 bg-slate-950 rounded-xl relative overflow-hidden border border-slate-800 shadow-md flex items-center justify-center select-none">
            
            {cameraFeedSimulating ? (
              <>
                {/* Simulated live visual overlay lines */}
                <div className="absolute top-2 left-2 z-10 font-mono text-[8px] text-emerald-400 font-bold bg-black/40 px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>CAM_{activeCorridor.id.toUpperCase()}_LIVE</span>
                </div>
                
                <div className="absolute top-2 right-2 z-10 font-mono text-[8px] text-slate-300 font-semibold uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded">
                  FPS: 30.00
                </div>

                {/* Reticle guide crosshair */}
                <div className="absolute w-8 h-8 border border-white/20 rounded-full" />
                <div className="absolute w-12 h-0.5 bg-white/10" />
                <div className="absolute h-12 w-0.5 bg-white/10" />

                {/* Scanning sweep line moving up and down */}
                <div className="absolute w-full h-[1.5px] bg-emerald-400/35 left-0 animate-[bounce_3s_infinite]" />

                {/* Simulated pixelated cars graphics */}
                <div className="absolute text-emerald-400 text-[10px] font-mono animate-pulse text-center leading-tight">
                  <span className="font-bold text-center block">DETECTING ENTRAINMENT PROFILE...</span>
                  <span className="text-[8px] opacity-75">Vehicle Count: {activeCorridor.riskScore > 80 ? '82/min' : '40/min'}</span>
                </div>
              </>
            ) : (
              <div className="text-slate-400 font-mono text-xs font-semibold uppercase tracking-wider">
                Feed Suspended
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
