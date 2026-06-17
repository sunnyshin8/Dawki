import { useState } from 'react';
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
  Activity
} from 'lucide-react';

interface ReportViewProps {
  language: string;
}

export default function ReportView({ language }: ReportViewProps) {
  const [selectedReportRange, setSelectedReportRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null);
  const [activeTimelineHour, setActiveTimelineHour] = useState<number | null>(null);

  // Core volume and categorical datasets
  const incidentCategories = [
    { title: 'Vehicle Breakdown', count: 142, pct: 45, color: '#0073dd' },
    { title: 'Infrastructure Block', count: 88, pct: 28, color: '#ffb300' },
    { title: 'Localized Flooding', count: 52, pct: 16, color: '#f44336' },
    { title: 'Special Route Blocks', count: 34, pct: 11, color: '#4caf50' }
  ];

  // Hourly congestion index profile data (06:00 to 22:00)
  const hourlyData = [
    { hour: '06:00', value: 15, speed: '48 km/h' },
    { hour: '08:00', value: 85, speed: '12 km/h' },
    { hour: '10:00', value: 72, speed: '18 km/h' },
    { hour: '12:00', value: 40, speed: '28 km/h' },
    { hour: '14:00', value: 35, speed: '32 km/h' },
    { hour: '16:00', value: 55, speed: '21 km/h' },
    { hour: '18:00', value: 92, speed: '9 km/h' },
    { hour: '20:00', value: 68, speed: '20 km/h' },
    { hour: '22:00', value: 25, speed: '42 km/h' }
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full max-w-5xl mx-auto px-1 select-none">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="font-sans font-extrabold text-2xl md:text-3xl text-on-surface tracking-tight mb-1">
            {language === 'kn' ? 'ವರದಿಗಳು ಮತ್ತು ಅಂಕಿಅಂಶಗಳು' : 'Operations Analytics'}
          </h2>
          <p className="font-sans text-sm text-on-surface-variant">
            Historical sector trends, peak-hour bottlenecks, and category ratios for sector clearance.
          </p>
        </div>

        {/* Date Selector and Download PDF */}
        <div className="flex gap-2 w-full sm:w-auto">
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
            onClick={() => alert("Downloading Operations Recap PDF payload to system logs.")}
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
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-sans font-bold text-sm text-on-surface">Hourly Congestion Index</h3>
              <span className="font-sans text-xs text-on-surface-variant">Congestion % over peak hours</span>
            </div>
            
            <span className="font-mono text-[9px] bg-primary/10 text-primary py-0.5 px-2 rounded-full font-bold">
              Avg Profile
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
              <path 
                d="M 10 140 L 10 136 L 50 24 L 90 44 L 130 96 L 170 104 L 210 72 L 250 12 L 290 51 L 330 112 L 370 120 L 400 120 L 400 150 Z"
                fill="url(#chartGradient)"
              />

              {/* Curved line graph */}
              <path 
                d="M 10 136 Q 50 10 90 44 T 170 104 T 250 12 T 330 112 T 400 120"
                fill="none" 
                stroke="#0073dd" 
                strokeWidth="3.5" 
                strokeLinecap="round"
                className="glow-line"
              />

              {/* Node handles hovered */}
              {hourlyData.map((d, index) => {
                const xCoord = 10 + index * 45;
                // mock coordinates lookup
                const coordsY = [136, 44, 60, 96, 104, 72, 18, 51, 112];
                const yCoord = coordsY[index] || 100;
                const isHovered = activeTimelineHour === index;

                return (
                  <g 
                    key={index}
                    className="cursor-pointer"
                    onMouseEnter={() => setActiveTimelineHour(index)}
                    onMouseLeave={() => setActiveTimelineHour(null)}
                  >
                    <circle 
                      cx={xCoord} 
                      cy={yCoord} 
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
                <span className="text-emerald-400">Avg Speed: {hourlyData[activeTimelineHour].speed}</span>
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
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-sans font-bold text-sm text-on-surface">Incidents Breakdown</h3>
              <span className="font-sans text-xs text-on-surface-variant">Cleared log breakdown by incident tier</span>
            </div>
            
            <span className="font-mono text-[9px] bg-primary/10 text-primary py-0.5 px-2 rounded-full font-bold">
              Total 316
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
          <span className="font-sans font-extrabold text-2xl text-on-surface mt-1">-18m reduction</span>
          <p className="font-sans text-[11px] text-on-surface-variant leading-snug">
            Signal modifications at Outer Ring Road East intersection improved evening peak throughput by 12% inside the weekly audit range.
          </p>
        </div>

        {/* Insight Item 2 */}
        <div className="bg-[#eff4ff]/65 border border-white/50 rounded-2xl p-5 flex flex-col gap-2 shadow-xs">
          <div className="flex items-center gap-2 text-[#006b57]">
            <Activity size={16} />
            <span className="font-sans font-bold text-xs uppercase tracking-wider">Clearance Response</span>
          </div>
          <span className="font-sans font-extrabold text-2xl text-on-surface mt-1">22.4m Avg Clearance</span>
          <p className="font-sans text-[11px] text-on-surface-variant leading-snug">
            Emergency sector logistics team successfully clearance of major highway collision blocks under 25 minutes on average.
          </p>
        </div>

        {/* Insight Item 3 */}
        <div className="bg-[#eff4ff]/65 border border-white/50 rounded-2xl p-5 flex flex-col gap-2 shadow-xs">
          <div className="flex items-center gap-2 text-amber-600">
            <Clock size={16} />
            <span className="font-sans font-bold text-xs uppercase tracking-wider">Peak Hour Spread</span>
          </div>
          <span className="font-sans font-extrabold text-2xl text-on-surface mt-1">08:00 - 09:12 AM</span>
          <p className="font-sans text-[11px] text-on-surface-variant leading-snug">
            Core high-density traffic occurs primarily outside pre-staggered corporate office timeslots. Staggering campaigns remain recommended.
          </p>
        </div>

      </div>

    </div>
  );
}
