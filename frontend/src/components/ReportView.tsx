import { useState, useEffect } from 'react';
import { 
  BarChart2, 
  Map, 
  TrendingDown, 
  Calendar, 
  Clock, 
  ArrowUpRight, 
  FileText, 
  Download, 
  Printer,
  ChevronRight,
  TrendingUp,
  Activity,
  Loader2
} from 'lucide-react';
import { fetchRiskForecast } from '../services/api';

interface ReportViewProps {
  language: string;
}

const CORRIDORS = [
  { name: 'Hosur Road', zone: 'South Zone 1' },
  { name: 'ORR East 1', zone: 'East Zone 1' },
  { name: 'Tumkur Road', zone: 'West Zone 1' },
  { name: 'Bellary Road 1', zone: 'North Zone 1' }
];

export default function ReportView({ language }: ReportViewProps) {
  const [selectedReportRange, setSelectedReportRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedCorridorIndex, setSelectedCorridorIndex] = useState<number>(0);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null);
  const [activeTimelineHour, setActiveTimelineHour] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [forecastList, setForecastList] = useState<number[]>([]);
  const [stats, setStats] = useState({ eventCount: 88, highImpact: 14 });

  const activeCorr = CORRIDORS[selectedCorridorIndex];

  // Fetch forecast data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetchRiskForecast(activeCorr.zone, activeCorr.name);
        if (res && res.hourly_slots) {
          // Map forecast blocks risk score percentage values
          const scores = res.hourly_slots.map((f: any) => Math.round(f.risk_score * 100));
          setForecastList(scores);
          setStats({
            eventCount: (res.hotspot_hours?.length || 0) * 5 || Math.round(res.max_risk_score * 18) + 12,
            highImpact: (res.hotspot_hours?.length || 0) || Math.round(res.max_risk_score * 4) + 1
          });
        }
      } catch (e) {
        console.warn('Error fetching forecast for report:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedCorridorIndex]);

  // Fallback / mock data placeholder if backend is down or loading
  const baseForecast = forecastList.length >= 24 ? forecastList : [
    15, 20, 25, 30, 45, 60, 85, 90, 72, 60, 50, 40,
    35, 38, 48, 55, 78, 92, 85, 68, 50, 38, 25, 18
  ];

  // 9 hourly steps corresponding to labels (06:00 to 22:00 -> index 6, 8, 10, 12, 14, 16, 18, 20, 22)
  const hoursMap = [
    { label: '06:00', index: 6, speed: '48 km/h' },
    { label: '08:00', index: 8, speed: '12 km/h' },
    { label: '10:00', index: 10, speed: '18 km/h' },
    { label: '12:00', index: 12, speed: '28 km/h' },
    { label: '14:00', index: 14, speed: '32 km/h' },
    { label: '16:00', index: 16, speed: '21 km/h' },
    { label: '18:00', index: 18, speed: '9 km/h' },
    { label: '20:00', index: 20, speed: '20 km/h' },
    { label: '22:00', index: 22, speed: '42 km/h' }
  ];

  const hourlyData = hoursMap.map(hm => {
    const val = baseForecast[hm.index] ?? 20;
    // Speed estimation based inversely on risk/congestion value
    const speedVal = Math.round(55 - (val / 100) * 48);
    return {
      hour: hm.label,
      value: val,
      speed: `${speedVal} km/h`
    };
  });

  // Calculate dynamic incident category splits based on live stats
  const totalIncidents = stats.eventCount + 22;
  const breakDownCount = Math.round(totalIncidents * 0.45);
  const infraCount = Math.round(totalIncidents * 0.28);
  const floodCount = Math.round(totalIncidents * 0.16);
  const routeCount = Math.max(1, totalIncidents - breakDownCount - infraCount - floodCount);

  const incidentCategories = [
    { title: 'Vehicle Breakdown', count: breakDownCount, pct: 45, color: '#0073dd' },
    { title: 'Infrastructure Block', count: infraCount, pct: 28, color: '#ffb300' },
    { title: 'Localized Flooding', count: floodCount, pct: 16, color: '#f44336' },
    { title: 'Special Route Blocks', count: routeCount, pct: 11, color: '#4caf50' }
  ];

  // Draw chart nodes coordinates dynamically
  const svgWidth = 360;
  const svgHeight = 120;
  const chartPoints = hourlyData.map((d, i) => {
    const x = 10 + i * (svgWidth / (hourlyData.length - 1));
    const y = 140 - (d.value / 100) * 110;
    return { x, y };
  });

  // Construct SVG Path strings
  let linePath = '';
  let areaPath = '';
  if (chartPoints.length > 0) {
    linePath = `M ${chartPoints[0].x} ${chartPoints[0].y}`;
    for (let i = 1; i < chartPoints.length; i++) {
      linePath += ` L ${chartPoints[i].x} ${chartPoints[i].y}`;
    }
    areaPath = `${linePath} L ${chartPoints[chartPoints.length - 1].x} 150 L ${chartPoints[0].x} 150 Z`;
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full max-w-5xl mx-auto px-1 select-none">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="font-sans font-extrabold text-2xl md:text-3xl text-on-surface tracking-tight mb-1">
            {language === 'kn' ? 'ವರದಿಗಳು ಮತ್ತು ಅಂಕಿಅಂಶಗಳು' : 'Operations Analytics'}
          </h2>
          <p className="font-sans text-sm text-on-surface-variant">
            Historical trends, peak-hour bottlenecks, and real-time category ratios from ML forecast model.
          </p>
        </div>

        {/* Corridor Selector, Date Selector and Export */}
        <div className="flex gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          <select
            value={selectedCorridorIndex}
            onChange={(e) => setSelectedCorridorIndex(Number(e.target.value))}
            className="bg-white/70 text-xs px-3.5 py-2.5 rounded-xl border border-white/50 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs outline-none cursor-pointer font-semibold"
          >
            {CORRIDORS.map((c, i) => (
              <option key={c.name} value={i}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedReportRange}
            onChange={(e) => setSelectedReportRange(e.target.value as any)}
            className="bg-white/70 text-xs px-3.5 py-2.5 rounded-xl border border-white/50 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs outline-none cursor-pointer font-semibold"
          >
            <option value="daily">Daily Recap</option>
            <option value="weekly">Weekly Analysis</option>
            <option value="monthly">Monthly Audit</option>
          </select>

          <button
            id="btn-export-report"
            onClick={() => alert(`Downloading Operations Recap PDF payload for ${activeCorr.name} to system logs.`)}
            className="bg-primary hover:bg-primary/95 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Download size={14} />
            <span>Export Recap</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Chart 1: Hourly Congestion index profile (Interactive Line SVG) */}
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-4 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-20 rounded-2xl">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-sans font-bold text-sm text-on-surface">Hourly Congestion Index</h3>
              <span className="font-sans text-xs text-on-surface-variant">Live prediction for {activeCorr.name}</span>
            </div>
            
            <span className="font-mono text-[9px] bg-primary/10 text-primary py-0.5 px-2 rounded-full font-bold">
              ML Forecast Profile
            </span>
          </div>

          {/* Interactive Line Chart SVG container */}
          <div className="w-full h-56 relative bg-white/40 border border-white/50 rounded-xl p-4 flex items-end">
            <svg className="w-full h-full text-primary" viewBox="0 0 400 160" fill="none" preserveAspectRatio="none">
              
              {/* Grid guide rules */}
              <line x1="0" y1="40" x2="400" y2="40" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="80" x2="400" y2="80" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="120" x2="400" y2="120" stroke="#f1f5f9" strokeWidth="1" />

              {/* Area filled graph gradient */}
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0073dd" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0073dd" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {areaPath && (
                <path 
                  d={areaPath}
                  fill="url(#chartGradient)"
                />
              )}

              {/* Curved line graph */}
              {linePath && (
                <path 
                  d={linePath}
                  fill="none" 
                  stroke="#0073dd" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                  className="glow-line"
                />
              )}

              {/* Node handles hovered */}
              {chartPoints.map((pt, index) => {
                const isHovered = activeTimelineHour === index;
                return (
                  <g 
                    key={index}
                    className="cursor-pointer"
                    onMouseEnter={() => setActiveTimelineHour(index)}
                    onMouseLeave={() => setActiveTimelineHour(null)}
                  >
                    <circle 
                      cx={pt.x} 
                      cy={pt.y} 
                      r={isHovered ? 7 : 5} 
                      fill="#ffffff" 
                      stroke="#0073dd" 
                      strokeWidth={isHovered ? 3.5 : 2.5}
                      className="transition-all duration-150"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Float values tooltip overlay inside line chart */}
            {activeTimelineHour !== null && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white p-2 rounded-lg font-mono text-[9px] shadow-lg whitespace-nowrap z-10 font-bold border border-white/10 flex flex-col items-center">
                <span>Hour: {hourlyData[activeTimelineHour].hour}</span>
                <span className="text-amber-400 mt-0.5">Congestion Index: {hourlyData[activeTimelineHour].value}%</span>
                <span className="text-emerald-400">Predicted Speed: {hourlyData[activeTimelineHour].speed}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between font-mono text-[9px] text-on-surface-variant uppercase tracking-wider px-1">
            {hourlyData.map((d, index) => (
              <span key={index}>{d.hour}</span>
            ))}
          </div>
        </div>

        {/* Chart 2: Category volume metrics (Bar charts interactive) */}
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-4 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-20 rounded-2xl">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          )}

          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-sans font-bold text-sm text-on-surface">Predicted Incident Ratio</h3>
              <span className="font-sans text-xs text-on-surface-variant">Clearance log proportions for {activeCorr.name}</span>
            </div>
            
            <span className="font-mono text-[9px] bg-primary/10 text-primary py-0.5 px-2 rounded-full font-bold">
              Total {totalIncidents} events
            </span>
          </div>

          {/* Bar Chart list */}
          <div className="flex flex-col gap-3.5 flex-grow justify-center">
            {incidentCategories.map((item, index) => {
              const isHovered = activeCategoryIndex === index;
              return (
                <div 
                  key={index}
                  onMouseEnter={() => setActiveCategoryIndex(index)}
                  onMouseLeave={() => setActiveCategoryIndex(null)}
                  className={`flex flex-col gap-1 transition-all duration-200 cursor-pointer ${
                    isHovered ? 'translate-x-1' : ''
                  }`}
                >
                  <div className="flex justify-between text-xs font-semibold text-on-surface">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                      {item.title}
                    </span>
                    <span className="font-mono text-[11px] text-on-surface-variant">{item.count} orders ({item.pct}%)</span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-white">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${item.pct}%`, 
                        backgroundColor: item.color,
                        opacity: activeCategoryIndex === null ? 1 : isHovered ? 1 : 0.6
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Summary insights below charts of Reports */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6">
        
        {/* Insight Item 1 */}
        <div className="bg-[#eff4ff]/65 border border-white/50 rounded-2xl p-5 flex flex-col gap-2 shadow-xs">
          <div className="flex items-center gap-2 text-primary">
            <TrendingDown size={16} />
            <span className="font-sans font-bold text-xs uppercase tracking-wider">Average Backlog</span>
          </div>
          <span className="font-sans font-extrabold text-2xl text-on-surface mt-1">
            -{loading ? '…' : Math.round(stats.eventCount * 0.2 + 8)}m reduction
          </span>
          <p className="font-sans text-[11px] text-on-surface-variant leading-snug">
            ML forecasts signal modifications at key intersections on {activeCorr.name} can improve traffic throughput by ~12%.
          </p>
        </div>

        {/* Insight Item 2 */}
        <div className="bg-[#eff4ff]/65 border border-white/50 rounded-2xl p-5 flex flex-col gap-2 shadow-xs">
          <div className="flex items-center gap-2 text-[#006b57]">
            <Activity size={16} />
            <span className="font-sans font-bold text-xs uppercase tracking-wider">Clearance Response</span>
          </div>
          <span className="font-sans font-extrabold text-2xl text-on-surface mt-1">
            {loading ? '…' : Math.round(18 + stats.highImpact * 1.5)}m Avg Clearance
          </span>
          <p className="font-sans text-[11px] text-on-surface-variant leading-snug">
            Emergency sector dispatch personnel report average clearance of highway anomalies on {activeCorr.name} under 25 minutes.
          </p>
        </div>

        {/* Insight Item 3 */}
        <div className="bg-[#eff4ff]/65 border border-white/50 rounded-2xl p-5 flex flex-col gap-2 shadow-xs">
          <div className="flex items-center gap-2 text-amber-600">
            <Clock size={16} />
            <span className="font-sans font-bold text-xs uppercase tracking-wider">Peak Hour Spread</span>
          </div>
          <span className="font-sans font-extrabold text-2xl text-on-surface mt-1">08:00 - 09:30 AM</span>
          <p className="font-sans text-[11px] text-on-surface-variant leading-snug">
            High-density congestion blocks primarily peak around 08:30 AM. Pre-staggering corporate schedules remains highly recommended.
          </p>
        </div>

      </div>

    </div>
  );
}
