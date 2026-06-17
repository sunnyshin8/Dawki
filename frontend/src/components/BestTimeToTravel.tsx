import { useState } from 'react';
import { 
  MapPin, 
  Locate, 
  ArrowUpDown, 
  Sparkles, 
  CloudRain, 
  Calendar, 
  TrendingDown, 
  AlertTriangle,
  Timer,
  CheckCircle,
  Sun,
  Moon,
  Clock
} from 'lucide-react';
import { AI_INSIGHTS } from '../data';

interface BestTimeToTravelProps {
  language: string;
}

export default function BestTimeToTravel({ language }: BestTimeToTravelProps) {
  // Input states
  const [origin, setOrigin] = useState('Electronic City');
  const [destination, setDestination] = useState('Whitefield');
  
  // Suggested time states
  const [recommendedDeparture, setRecommendedDeparture] = useState('07:45 AM');
  const [expectedDuration, setExpectedDuration] = useState('45 mins');
  const [typicalSavings, setTypicalSavings] = useState('60%');
  const [activeWindowId, setActiveWindowId] = useState<'rec' | 'early' | 'mid' | 'avoid'>('rec');

  // Time window slider state
  const [leftHandle, setLeftHandle] = useState(30); // percentages
  const [rightHandle, setRightHandle] = useState(48);

  const swapRoute = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  // Alternative windows options
  const alternatives = [
    {
      id: 'early',
      title: 'Early Bird',
      time: '06:45 AM',
      impact: 'BEST',
      desc: 'Beat the rush entirely.',
      savings: 'Saves 40m',
      duration: '35 mins',
      savingsPct: '75%'
    },
    {
      id: 'rec',
      title: 'Optimal Window',
      time: '07:45 AM',
      impact: 'RECOMMENDED',
      desc: 'Saves around 45 mins total.',
      savings: 'Saves ~45m',
      duration: '45 mins',
      savingsPct: '60%'
    },
    {
      id: 'mid',
      title: 'Mid-Morning Flow',
      time: '10:30 AM',
      impact: 'OKAY',
      desc: 'Traffic subsides after early peak.',
      savings: 'Saves 25m',
      duration: '50 mins',
      savingsPct: '40%'
    },
    {
      id: 'avoid',
      title: 'Peak Commute',
      time: '08:30 AM',
      impact: 'AVOID',
      desc: 'Highest density of stop & go.',
      savings: 'Adds 35m',
      duration: '80 mins',
      savingsPct: '0%'
    }
  ];

  const selectWindow = (id: 'rec' | 'early' | 'mid' | 'avoid') => {
    setActiveWindowId(id);
    const found = alternatives.find(alt => alt.id === id);
    if (found) {
      setRecommendedDeparture(found.time);
      setExpectedDuration(found.duration);
      setTypicalSavings(found.savingsPct);
      
      // Update dummy slider representation
      if (id === 'early') {
        setLeftHandle(20);
        setRightHandle(35);
      } else if (id === 'rec') {
        setLeftHandle(30);
        setRightHandle(48);
      } else if (id === 'mid') {
        setLeftHandle(60);
        setRightHandle(75);
      } else {
        setLeftHandle(40);
        setRightHandle(55);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full max-w-5xl mx-auto px-1 select-none">
      {/* Search and Planner Head */}
      <div>
        <h2 className="font-sans font-extrabold text-2xl md:text-3xl text-on-surface tracking-tight mb-1">
          {language === 'kn' ? 'ಪ್ರಯಾಣ ಯೋಜನೆ' : 'Plan Your Journey'}
        </h2>
        <p className="font-sans text-sm text-on-surface-variant">
          {language === 'kn' 
            ? 'ದಟ್ಟಣೆಯನ್ನು ತಪ್ಪಿಸಲು ಮತ್ತು ನಿಮ್ಮ ಪ್ರವಾಸದ ಸಮಯವನ್ನು ಕಡಿಮೆ ಮಾಡಲು ಸೂಕ್ತ ನಿರ್ಗಮನ ಸಮಯವನ್ನು ಹುಡುಕಿ.'
            : 'Find the optimal departure time to bypass congestion and reduce your commute.'}
        </p>
      </div>

      {/* Top Section: Inputs and AI Insights Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Card: Input Journey Fields */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 flex flex-col gap-5 relative group">
          <div className="absolute inset-0 bg-primary/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center relative z-10 w-full">
            {/* Origin */}
            <div className="flex-1 glass-input rounded-xl flex items-center px-4 py-3 gap-3 relative">
              <Locate size={18} className="text-primary" />
              <div className="flex flex-col flex-1">
                <span className="font-mono text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Origin</span>
                <input 
                  type="text" 
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full bg-transparent border-none p-0 focus:ring-0 font-sans font-semibold text-sm text-on-surface"
                />
              </div>
            </div>

            {/* Swap Trigger Pill */}
            <button 
              onClick={swapRoute} 
              id="btn-swap-route"
              className="w-10 h-10 shrink-0 rounded-full bg-white shadow-md border border-white/80 hover:bg-[#eff4ff] hover:text-primary hover:rotate-180 transition-all duration-300 flex items-center justify-center text-on-surface-variant cursor-pointer self-center"
              title="Swap fields"
            >
              <ArrowUpDown size={16} />
            </button>

            {/* Destination */}
            <div className="flex-1 glass-input rounded-xl flex items-center px-4 py-3 gap-3 relative">
              <MapPin size={18} className="text-error" />
              <div className="flex flex-col flex-1">
                <span className="font-mono text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Destination</span>
                <input 
                  type="text" 
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-transparent border-none p-0 focus:ring-0 font-sans font-semibold text-sm text-on-surface"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-1" />

          {/* Time slider widget */}
          <div className="flex flex-col gap-4 relative z-10">
            <div className="flex justify-between items-center">
              <span className="font-sans font-bold text-sm text-on-surface">Target Arrival Window</span>
              <span id="target-window-label" className="font-mono text-xs bg-primary/10 text-primary py-1 px-3 rounded-full font-bold">
                {leftHandle < 35 ? '07:30 AM' : leftHandle < 50 ? '09:00 AM' : '10:30 AM'} - {rightHandle < 50 ? '08:45 AM' : rightHandle < 70 ? '10:00 AM' : '11:45 AM'}
              </span>
            </div>

            {/* Simulated interactive track */}
            <div className="w-full h-12 relative flex items-center">
              {/* Main Background Track */}
              <div className="absolute w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden border border-white/50 shadow-inner" />
              
              {/* Highlight Active Range Fill */}
              <div 
                className="absolute h-2.5 bg-gradient-to-r from-primary-container to-primary rounded-full glow-line"
                style={{ left: `${leftHandle}%`, right: `${100 - rightHandle}%` }}
              />

              {/* Slider Handles */}
              <button 
                type="button"
                id="slider-handle-left"
                className="absolute w-5 h-5 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] border-2 border-primary-container cursor-ew-resize active:scale-110 hover:scale-105 transition-transform"
                style={{ left: `calc(${leftHandle}% - 10px)` }}
                onClick={() => setLeftHandle(leftHandle === 30 ? 20 : 30)}
              />
              <button 
                type="button"
                id="slider-handle-right"
                className="absolute w-5 h-5 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] border-2 border-primary cursor-ew-resize active:scale-110 hover:scale-105 transition-transform"
                style={{ left: `calc(${rightHandle}% - 10px)` }}
                onClick={() => setRightHandle(rightHandle === 48 ? 65 : 48)}
              />
            </div>

            {/* Tick landmarks */}
            <div className="flex justify-between font-mono text-[9px] text-on-surface-variant uppercase tracking-wider px-1 -mt-2.5">
              <span>06:00 AM</span>
              <span>08:00 AM</span>
              <span>10:00 AM</span>
              <span>12:00 PM</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Travel AI Insights */}
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-white/40 pb-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Sparkles size={16} />
            </div>
            <h3 className="font-sans font-bold text-sm text-on-surface">Travel AI Insights</h3>
          </div>

          <div className="flex flex-col gap-3">
            {AI_INSIGHTS.map((insight) => {
              const Icon = insight.type === 'rain' ? CloudRain : insight.type === 'protocol' ? Calendar : TrendingDown;
              return (
                <div 
                  key={insight.id} 
                  className="flex items-start gap-3 bg-white/40 p-3 rounded-xl border border-white/50 shadow-sm hover:scale-101 hover:bg-white/60 transition-all duration-300"
                >
                  <Icon size={16} className={`${insight.color} shrink-0 mt-0.5`} />
                  <p className="font-sans text-xs text-on-surface leading-snug">{insight.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mid: Congestion Forecast Timeline */}
      <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex justify-between items-end mb-1">
          <div>
            <h3 className="font-sans font-bold text-sm text-on-surface">Route Density Timeline</h3>
            <span className="font-sans text-xs text-on-surface-variant">Real-time segment forecast for {origin} ➔ {destination}</span>
          </div>
          <div className="flex gap-4 font-mono text-[10px] text-on-surface-variant uppercase font-semibold">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Flowing</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Moderated</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Jammed</div>
          </div>
        </div>

        {/* Timeline Bar */}
        <div className="relative w-full h-14 rounded-xl overflow-hidden shadow-inner border border-white/40 flex">
          {/* Segmented Gradient representation of traffic */}
          <div className="h-full w-[24%] bg-gradient-to-r from-emerald-500/20 via-emerald-500/30 to-amber-500/30 flex items-center justify-center border-r border-white/20" />
          <div className="h-full w-[16%] bg-gradient-to-r from-amber-500/40 via-red-500/50 to-red-600/60 relative group cursor-pointer border-r border-white/20">
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white font-mono text-[9px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-lg font-bold">
              Morning Rush (08:00 - 09:30)
            </div>
          </div>
          <div className="h-full w-[25%] bg-gradient-to-r from-amber-500/30 via-emerald-500/30 to-amber-500/40 border-r border-white/20" />
          <div className="h-full w-[20%] bg-gradient-to-r from-red-500/50 via-red-600/60 to-amber-500/40 relative group cursor-pointer border-r border-white/20">
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white font-mono text-[9px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-lg font-bold">
              Evening Peak (17:30 - 19:30)
            </div>
          </div>
          <div className="h-full w-[15%] bg-gradient-to-r from-emerald-500/30 to-emerald-500/20" />

          {/* Scrubber indicator at Active Window Choice */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 shadow-[0_0_8px_rgba(0,115,221,0.8)] transition-all duration-300"
            style={{ 
              left: activeWindowId === 'early' ? '20%' : 
                    activeWindowId === 'rec' ? '33%' : 
                    activeWindowId === 'mid' ? '65%' : '44%' 
            }}
          >
            <div className="absolute -top-3.5 -translate-x-1/2 bg-primary text-white font-mono text-[8px] font-bold py-0.5 px-2 rounded-full shadow-md uppercase tracking-wider">
              {recommendedDeparture}
            </div>
          </div>
        </div>

        {/* Timeline labels */}
        <div className="flex justify-between font-mono text-[10px] text-on-surface-variant font-medium px-2">
          <span>12 AM</span>
          <span>4 AM</span>
          <span>8 AM</span>
          <span>12 PM</span>
          <span>4 PM</span>
          <span>8 PM</span>
          <span>12 AM</span>
        </div>
      </div>

      {/* Bottom Grid: Dynamic Calculation cards and Alternatives selection list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
        
        {/* Left column: Dynamic summary block and Warning */}
        <div className="flex flex-col gap-4 justify-between h-full">
          {/* Main Departure Card */}
          <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden flex-1 group min-h-[160px] border-2 border-white/60 bg-gradient-to-br from-white/90 to-primary/5">
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#eff4ff]/65 rounded-full blur-2xl" />
            <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-primary-container/5 rounded-full blur-2xl" />
            
            <span className="font-sans font-bold text-xs text-on-surface-variant mb-1 flex items-center gap-1.5 relative z-10 uppercase tracking-widest">
              <CheckCircle size={14} className="text-[#006b57]" />
              Optimal Commuter Departure
            </span>
            <div className="font-sans font-extrabold text-[#005bb1] text-5xl leading-tight mb-2 tracking-tight drop-shadow-sm select-none relative z-10">
              {recommendedDeparture}
            </div>
            <div className="bg-secondary-container/50 border border-secondary text-on-secondary-container px-4 py-1 rounded-full font-mono text-[11px] font-bold flex items-center gap-2 relative z-10 backdrop-blur-md">
              <Clock size={12} />
              Expected Duration: {expectedDuration}
            </div>
          </div>

          {/* Caution Card */}
          <div className="bg-red-50/70 border border-red-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-error text-white flex items-center justify-center shrink-0 shadow-md">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h4 className="font-sans font-bold text-xs text-red-900 uppercase tracking-wider">Avoid Departure Slot</h4>
              <p className="font-sans text-xs text-red-700 leading-snug mt-0.5">
                Departing between <span className="font-semibold">08:00 AM</span> and <span className="font-semibold">09:15 AM</span> will append roughly <span className="font-bold">+35 minutes</span> to your typical journey time.
              </p>
            </div>
          </div>
        </div>

        {/* Right column: Interactive options matching designs */}
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-3">
          <h3 className="font-sans font-bold text-sm text-on-surface mb-1.5 px-1">Alternative Departure Windows</h3>
          
          <div className="flex flex-col gap-2.5">
            {alternatives.map((item) => {
              const isActive = activeWindowId === item.id;
              const isAvoid = item.impact === 'AVOID';
              const isBest = item.impact === 'BEST' || item.impact === 'RECOMMENDED';
              
              return (
                <button
                  key={item.id}
                  id={`btn-window-alt-${item.id}`}
                  onClick={() => selectWindow(item.id as any)}
                  className={`w-full text-left p-3.5 rounded-xl flex items-center justify-between group transition-all duration-300 shadow-sm border cursor-pointer ${
                    isActive 
                      ? 'bg-white border-primary-container scale-101.5 shadow-md' 
                      : 'bg-white/40 border-white/50 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Compact Time Block */}
                    <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center transition-colors ${
                      isActive 
                        ? 'bg-primary text-white font-bold' 
                        : 'bg-slate-100 border border-slate-200 text-on-surface-variant'
                    }`}>
                      <span className="font-sans font-bold text-xs leading-none">{item.time.split(' ')[0]}</span>
                      <span className="font-mono text-[8px] leading-none uppercase font-bold mt-1">{item.time.split(' ')[1]}</span>
                    </div>

                    <div>
                      <h4 className={`font-sans font-bold text-xs ${isActive ? 'text-primary' : 'text-on-surface'}`}>{item.title}</h4>
                      <p className="font-sans text-[11=6px] text-on-surface-variant text-[11px] leading-snug mt-0.5">{item.desc}</p>
                    </div>
                  </div>

                  {/* Impact Tag Badge */}
                  <span className={`px-2.5 py-1 rounded-full font-mono text-[9px] font-bold tracking-wide uppercase flex items-center gap-1 ${
                    isAvoid 
                      ? 'bg-error-container text-on-error-container' 
                      : isBest 
                        ? 'bg-emerald-100 text-[#005141]' 
                        : 'bg-amber-100 text-amber-900'
                  }`}>
                    <Timer size={10} />
                    {item.savings}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
