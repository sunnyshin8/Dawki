import { useState } from 'react';
import { 
  Sparkles, 
  MapPin, 
  AlertTriangle, 
  Timer, 
  Map, 
  Maximize2, 
  Compass, 
  Search,
  CheckCircle,
  Clock,
  ExternalLink,
  Plus,
  Minus,
  Locate
} from 'lucide-react';
import { INITIAL_ROUTES } from '../data';
import { RouteOption } from '../types';

interface RoutesAnalysisProps {
  language: string;
}

export default function RoutesAnalysis({ language }: RoutesAnalysisProps) {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('hosur');
  const [zoomLevel, setZoomLevel] = useState<number>(3); // mock scale 1-5
  const [searchQuery, setSearchQuery] = useState('');

  const activeRoute = INITIAL_ROUTES.find(r => r.id === selectedRouteId) || INITIAL_ROUTES[0];

  // Map route alerts
  const getAlertsForRoute = (routeId: string) => {
    switch(routeId) {
      case 'hosur':
        return [
          {
            id: 'al-1',
            type: 'accident',
            title: 'Accident at Silk Board Junction',
            desc: 'Multi-vehicle collision reported 10 mins ago. Expect heavy backups.',
            impact: '+25m impact',
            severity: 'critical'
          },
          {
            id: 'al-4',
            type: 'checkpoint',
            title: 'Police Speed Enforcement Check',
            desc: 'Laser speed limit controls active near Madiwala.',
            impact: 'Speed limit advisory: 60km/h',
            severity: 'low'
          }
        ];
      case 'inner-ring':
        return [
          {
            id: 'al-2',
            type: 'construction',
            title: 'Construction on Marathahalli Bridge',
            desc: 'Lane closures in effect until 05:00 AM tomorrow. Expect heavy bottlenecking.',
            impact: '+12m impact',
            severity: 'medium'
          }
        ];
      case 'nice-road':
        return [
          {
            id: 'al-3',
            type: 'clear',
            title: 'No Active Hazardous Incidents',
            desc: 'NICE Toll routes reporting complete clearance on active corridors.',
            impact: 'Seamless Flow',
            severity: 'safe'
          }
        ];
      default:
        return [];
    }
  };

  const activeAlerts = getAlertsForRoute(selectedRouteId);

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full max-w-5xl mx-auto px-1 select-none">
      {/* Search and Route info header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-sans font-extrabold text-2xl md:text-3xl text-on-surface tracking-tight mb-1">
            {language === 'kn' ? 'ಮಾರ್ಗ ವಿಶ್ಲೇಷಣೆ' : 'Route Analysis'}
          </h2>
          <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
            <span className="font-semibold text-primary">Vidhana Soudha</span>
            <span className="font-mono text-slate-300">➜</span>
            <span className="font-semibold text-[#006b57]">Electronic City Phase 1</span>
          </div>
        </div>

        {/* Real-time Address Input Query */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search locations, checkpoints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/60 focus:bg-white text-xs px-4 py-2.5 pl-10 rounded-xl border border-white/50 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          />
          <Search size={14} className="absolute left-3.5 top-3.5 text-on-surface-variant/60" />
        </div>
      </div>

      {/* Map visual showcase card with Interactive SVG graphics */}
      <div className="w-full h-80 md:h-96 rounded-2xl aero-card overflow-hidden relative shadow-lg group">
        {/* Holographic background map grid representation */}
        <div className="absolute inset-0 bg-slate-50 opacity-[0.9] overflow-hidden">
          <svg className="w-full h-full text-slate-200" viewBox="0 0 800 480" fill="none">
            {/* Fine grids */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" />
                <circle cx="0" cy="0" r="1.5" fill="#005db5" fillOpacity="0.15" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Graphic landmarks styled beautifully */}
            <circle cx="100" cy="200" r="6" fill="#0073dd" fillOpacity="0.1" />
            <circle cx="100" cy="200" r="2" fill="#0073dd" />
            <text x="100" y="218" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#717785">Vidhana Soudha</text>

            <circle cx="700" cy="280" r="6" fill="#006b57" fillOpacity="0.1" />
            <circle cx="700" cy="280" r="2" fill="#006b57" />
            <text x="640" y="298" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#717785">Electronic City P1</text>

            {/* Grid route paths */}
            {/* Outer Ring path */}
            <path 
              d="M 100 200 Q 250 80 440 220 T 700 280" 
              fill="none" 
              stroke={selectedRouteId === 'inner-ring' ? '#0073dd' : '#cbd5e1'} 
              strokeWidth={selectedRouteId === 'inner-ring' ? '5' : '3'} 
              className={`transition-all duration-300 ${selectedRouteId === 'inner-ring' ? 'glow-line' : 'opacity-60'}`}
              strokeLinecap="round"
            />

            {/* Nice Road path */}
            <path 
              d="M 100 200 L 280 340 L 520 340 L 700 280" 
              fill="none" 
              stroke={selectedRouteId === 'nice-road' ? '#58fcd4' : '#cbd5e1'} 
              strokeWidth={selectedRouteId === 'nice-road' ? '5' : '3'} 
              className={`transition-all duration-200 ${selectedRouteId === 'nice-road' ? 'glow-line' : 'opacity-60'}`}
              strokeLinecap="round"
            />

            {/* Hosur Road path (Active alert line) */}
            <path 
              d="M 100 200 L 250 200 L 485 240 L 700 280" 
              fill="none" 
              stroke={selectedRouteId === 'hosur' ? '#ba1a1a' : '#cbd5e1'} 
              strokeWidth={selectedRouteId === 'hosur' ? '5' : '3'} 
              className={`transition-all duration-200 ${selectedRouteId === 'hosur' ? 'glow-line' : 'opacity-60'}`}
              strokeLinecap="round"
            />

            {/* Highlighted Glowing Flowing dots */}
            <circle r="4" fill={selectedRouteId === 'hosur' ? '#ba1a1a' : selectedRouteId === 'inner-ring' ? '#0073dd' : '#58fcd4'} className="animate-ping">
              <animateMotion dur="5s" repeatCount="indefinite" path={activeRoute.svgPath} />
            </circle>
            <circle r="3" fill="#ffffff">
              <animateMotion dur="5s" repeatCount="indefinite" path={activeRoute.svgPath} />
            </circle>
          </svg>
        </div>

        {/* Map Header Indicators */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 relative z-10 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-primary/20 flex items-center gap-2 shadow-sm font-semibold text-xs text-on-surface">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span>Route A ({selectedRouteId === 'hosur' ? 'Selected' : 'Hosur Rd'})</span>
          </div>
          <div className="bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-teal-500/20 flex items-center gap-2 shadow-sm font-semibold text-xs text-on-surface">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
            <span>Route B ({selectedRouteId === 'inner-ring' ? 'Selected' : 'Inner Ring'})</span>
          </div>
        </div>

        {/* Floating control buttons */}
        <div className="absolute bottom-4 right-4 flex gap-2 z-20">
          <button 
            onClick={() => setZoomLevel(Math.min(zoomLevel + 1, 5))}
            className="w-10 h-10 bg-white/90 hover:bg-white backdrop-blur-md rounded-xl shadow-md flex items-center justify-center text-on-surface hover:text-primary transition-colors cursor-pointer"
            title="Zoom In"
          >
            <Plus size={16} />
          </button>
          <button 
            onClick={() => setZoomLevel(Math.max(zoomLevel - 1, 1))}
            className="w-10 h-10 bg-white/90 hover:bg-white backdrop-blur-md rounded-xl shadow-md flex items-center justify-center text-on-surface hover:text-primary transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <Minus size={16} />
          </button>
          <button 
            onClick={() => setZoomLevel(3)}
            className="w-10 h-10 bg-white/90 hover:bg-white backdrop-blur-md rounded-xl shadow-md flex items-center justify-center text-primary transition-colors cursor-pointer"
            title="Center Map"
          >
            <Locate size={16} />
          </button>
        </div>

        {/* Small Risk Level Meter */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-white/50 flex flex-col items-center gap-1.5 pointer-events-none select-none">
          <span className="font-mono text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Risk Pct</span>
          <div className="w-14 bg-slate-200 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                activeRoute.riskLevel === 'High' ? 'bg-error' : activeRoute.riskLevel === 'Medium' ? 'bg-amber-400' : 'bg-emerald-400'
              }`} 
              style={{ width: `${activeRoute.riskPct}%` }}
            />
          </div>
          <span className="font-sans font-bold text-xs text-on-surface mt-0.5">{activeRoute.riskPct}%</span>
        </div>
      </div>

      {/* Grid: Route Cards Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {INITIAL_ROUTES.map((route) => {
          const isSelected = selectedRouteId === route.id;
          const isHigh = route.riskLevel === 'High';
          const isMedium = route.riskLevel === 'Medium';
          
          return (
            <button
              key={route.id}
              id={`btn-route-option-${route.id}`}
              onClick={() => setSelectedRouteId(route.id)}
              className={`w-full text-left aero-card rounded-2xl p-5 aero-interactive cursor-pointer border-l-4 relative overflow-hidden group ${
                isSelected 
                  ? 'border-primary outline-slate-300' 
                  : isHigh 
                    ? 'border-l-error' 
                    : isMedium 
                      ? 'border-l-amber-400' 
                      : 'border-l-[#006b57]'
              }`}
            >
              {/* Subtle design map svg graphics in background of card */}
              <div className="absolute top-3 right-3 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity">
                <Map size={64} className="text-primary" />
              </div>

              <div className="flex justify-between items-start mb-4 relative z-10 w-full">
                <div>
                  <span className={`font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    route.id === 'hosur' 
                      ? 'bg-red-100 text-red-800' 
                      : route.id === 'inner-ring' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {route.id === 'hosur' ? 'Fastest' : route.id === 'inner-ring' ? 'Balanced' : 'Safest'}
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

              {/* Lower Risk bar */}
              <div className="space-y-2.5 relative z-10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant">Congestion Risk</span>
                  <span className={`font-mono text-[10px] font-bold uppercase ${
                    isHigh ? 'text-error' : isMedium ? 'text-amber-500' : 'text-[#006b57]'
                  }`}>
                    {route.riskLevel}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      isHigh ? 'bg-[#ba1a1a]' : isMedium ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} 
                    style={{ width: `${route.riskPct}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Route Details and Live Alerts list */}
      <div className="mt-2 pb-6">
        {/* Description brief of chosen path */}
        <div className="bg-[#eff4ff]/65 border border-white/50 rounded-2xl p-5 mb-5 shadow-sm">
          <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-primary mb-1">Route Profile & Impact Analysis</h4>
          <p className="font-sans text-xs text-on-surface leading-relaxed">
            {activeRoute.description} Calculated travel speed averages <span className="font-semibold">{selectedRouteId === 'nice-road' ? '45 km/h' : '23 km/h'}</span> over the course of the day. Check lane advisories under the Live Alerts panel below.
          </p>
        </div>

        {/* Live Alerts */}
        <div className="flex items-center gap-2.5 mb-4">
          <AlertTriangle size={18} className="text-error" />
          <h3 className="font-sans font-bold text-sm text-on-surface">Live Alerts for {activeRoute.name}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeAlerts.map((alertItem) => (
            <div 
              key={alertItem.id} 
              className={`glass-card rounded-2xl p-5 flex.gap-4 flex items-start border-l-4 shadow-sm hover:translate-y-[-1px] transition-transform cursor-pointer ${
                alertItem.severity === 'critical' 
                  ? 'border-l-error' 
                  : alertItem.severity === 'medium' 
                    ? 'border-l-amber-500' 
                    : alertItem.severity === 'safe' 
                      ? 'border-l-[#006b57]' 
                      : 'border-l-primary'
              }`}
            >
              <div className="flex gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  alertItem.severity === 'critical' 
                    ? 'bg-red-50 text-error' 
                    : alertItem.severity === 'medium' 
                      ? 'bg-amber-50 text-amber-600' 
                      : alertItem.severity === 'safe' 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : 'bg-blue-50 text-primary'
                }`}>
                  <AlertTriangle size={18} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-xs text-on-surface">{alertItem.title}</h4>
                  <p className="font-sans text-[11px] text-on-surface-variant leading-snug mt-1">{alertItem.desc}</p>
                  <span className={`font-mono text-[9px] font-bold block mt-2 ${
                    alertItem.severity === 'critical' ? 'text-error' : alertItem.severity === 'medium' ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {alertItem.impact}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
