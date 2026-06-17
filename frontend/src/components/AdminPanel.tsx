import { useState } from 'react';
import { 
  AlertTriangle, Clock, Users, ShieldAlert, CheckCircle2, 
  Send, HelpCircle, ArrowUpRight, ArrowDownRight, ChevronRight, Activity, X
} from 'lucide-react';

interface EventItem {
  id: string;
  type: string;
  zone: string;
  corridor: string;
  duration: string;
  impact: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  icon: string;
  details: string;
}

export default function AdminPanel({ language }: { language: string }) {
  // Active state counts
  const [activeEventsCount, setActiveEventsCount] = useState(34);
  const [criticalCount, setCriticalCount] = useState(8);
  const [avgClearance, setAvgClearance] = useState(42);
  const [officerDeployment, setOfficerDeployment] = useState(842);

  // Suggested actions state
  const [suggestedActions, setSuggestedActions] = useState([
    {
      id: 'SA-01',
      title: 'Deploy 3 dispatch officers to Hosur Rd',
      description: 'To assist with major accident clearance near Central Silk Board flyover.',
      executed: false
    },
    {
      id: 'SA-02',
      title: 'Re-route response reserves to ORR East 1',
      description: 'Anticipated waterlogging delays near Bellandur corridor.',
      executed: false
    },
    {
      id: 'SA-03',
      title: 'Approve overtime logs for Zone C',
      description: 'Administrative support for VVIP central sector alignment.',
      executed: false
    }
  ]);

  // Event table entries
  const [events, setEvents] = useState<EventItem[]>([
    {
      id: 'EV-902',
      type: 'Major Accident',
      zone: 'South',
      corridor: 'Hosur Rd - Silk Board',
      duration: '~45m remaining',
      impact: 'CRITICAL',
      icon: 'AlertTriangle',
      details: 'Collision of three container trucks on high-speed lane. Crane dispatched, clearance underway.'
    },
    {
      id: 'EV-881',
      type: 'Waterlogging',
      zone: 'East',
      corridor: 'ORR - Bellandur',
      duration: '~120m predicted',
      impact: 'HIGH',
      icon: 'CloudRain',
      details: 'Heavy localized shower caused 1.5 ft water pooling on underpass service road. Pumps operating.'
    },
    {
      id: 'EV-742',
      type: 'VVIP Movement',
      zone: 'Central',
      corridor: 'Vidhana Soudha Rd',
      duration: 'Scheduled 14:00',
      impact: 'MEDIUM',
      icon: 'Activity',
      details: 'VVIP central motorcade movement. Temporary rolling blockade of 5-10 minutes.'
    },
    {
      id: 'EV-610',
      type: 'Road Works',
      zone: 'West',
      corridor: 'Tumkur Rd - Peenya',
      duration: 'Ongoing (3 Days)',
      impact: 'LOW',
      icon: 'Wrench',
      details: 'Bridge joint repairs. Standard single lane layout, low impact outside peak hours.'
    }
  ]);

  // Selected event for interactive overlay details drawer
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Triggering suggested actions updates state counters dynamically!
  const executeAction = (id: string) => {
    setSuggestedActions(prev => prev.map(act => {
      if (altActionMatches(act.id, id)) {
        if (!act.executed) {
          // Update corresponding operational counters
          setOfficerDeployment(cnt => cnt + 3);
          setActiveEventsCount(cnt => Math.max(12, cnt - 1));
          
          if (id === 'SA-01') {
            // resolve major accident or critical count
            setCriticalCount(c => Math.max(0, c - 1));
            setEvents(eList => eList.filter(item => item.id !== 'EV-902'));
          }
        }
        return { ...act, executed: true };
      }
      return act;
    }));
  };

  const altActionMatches = (actId: string, id: string) => actId === id;

  // Review Event Action
  const reviewEvent = (evt: EventItem) => {
    setSelectedEvent(evt);
  };

  // Resolve active event from review drawer
  const resolveActiveEvent = (eventId: string, impact: string) => {
    setEvents(prev => prev.filter(evt => evt.id !== eventId));
    setActiveEventsCount(cnt => Math.max(0, cnt - 1));
    if (impact === 'CRITICAL' || impact === 'HIGH') {
      setCriticalCount(cnt => Math.max(0, cnt - 1));
    }
    setAvgClearance(time => Math.max(30, time - 2));
    setSelectedEvent(null);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full max-w-7xl mx-auto px-1 select-none">
      {/* Search and Route info header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-sans font-extrabold text-2xl md:text-3xl text-on-surface tracking-tight mb-1">
            {language === 'kn' ? 'ಕಾರ್ಯಾಚರಣೆಗಳ ಅವಲೋಕನ' : 'Operations Overview'}
          </h2>
          <p className="font-sans text-sm text-on-surface-variant">
            Real-time sector status, incident logging, and manpower dispatch for Bengaluru Sector.
          </p>
        </div>
        <div className="font-mono text-[10px] text-emerald-600 font-bold tracking-wider uppercase flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>Live updates active</span>
        </div>
      </div>

      {/* Operations KPI Metric Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div className="aero-card rounded-2xl p-6 relative overflow-hidden flex flex-col gap-4">
          <div className="flex justify-between items-center text-on-surface-variant">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider">Active Events</span>
            <ShieldAlert size={18} className="text-primary" />
          </div>
          <div className="flex items-baseline justify-between select-none">
            <span className="font-sans font-extrabold text-4xl text-on-surface leading-tight">
              {activeEventsCount}
            </span>
            <span className="font-mono text-[10px] font-bold text-emerald-600 flex items-center bg-emerald-50 px-2 py-0.5 rounded">
              <ArrowDownRight size={10} className="mr-0.5" /> 12%
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="aero-card rounded-2xl p-6 relative overflow-hidden flex flex-col gap-4 bg-gradient-to-br from-white to-red-50/5">
          <div className="flex justify-between items-center text-on-surface-variant">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider">Critical Reports</span>
            <AlertTriangle size={18} className="text-error" />
          </div>
          <div className="flex items-baseline justify-between select-none">
            <span className="font-sans font-extrabold text-4xl text-error leading-tight">
              {criticalCount < 10 ? `0${criticalCount}` : criticalCount}
            </span>
            <span className="font-mono text-[10px] font-bold text-red-600 flex items-center bg-red-50 px-2 py-0.5 rounded">
              <ArrowUpRight size={10} className="mr-0.5" /> +3
            </span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="aero-card rounded-2xl p-6 relative overflow-hidden flex flex-col gap-4">
          <div className="flex justify-between items-center text-on-surface-variant">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider">Avg Clearance</span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between select-none">
            <span className="font-sans font-extrabold text-4xl text-on-surface leading-tight">
              {avgClearance}<span className="text-sm font-semibold opacity-80 ml-0.5">m</span>
            </span>
            <span className="font-mono text-[10px] font-bold text-emerald-600 flex items-center bg-emerald-50 px-2 py-0.5 rounded">
              <ArrowDownRight size={10} className="mr-0.5" /> 5m
            </span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="aero-card rounded-2xl p-6 relative overflow-hidden flex flex-col gap-4">
          <div className="flex justify-between items-center text-on-surface-variant">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider">Officers Deployed</span>
            <Users size={18} className="text-[#006b57]" />
          </div>
          <div className="flex items-baseline justify-between select-none">
            <span className="font-sans font-extrabold text-4xl text-on-surface leading-tight">
              {officerDeployment}
            </span>
            <span className="font-sans text-[10px] font-bold text-on-surface-variant bg-slate-100 px-2.5 py-0.5 rounded">
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Scrolling Text Live Dispatch Ticker */}
      <div className="w-full bg-[#1e293b] text-white py-2.5 px-6 rounded-xl overflow-hidden flex items-center gap-4 shadow-md select-none border border-slate-700/50">
        <div className="flex-shrink-0 flex items-center gap-2 font-mono font-extrabold text-[10px] uppercase tracking-wider border-r border-slate-700 pr-5 select-none text-red-400">
          <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
          <span>Live Feed Log</span>
        </div>
        <div className="flex-grow overflow-hidden relative">
          <div className="inline-block whitespace-nowrap animate-pulse flex gap-16 font-mono text-[11px] tracking-wide text-slate-300">
            <span>🔴 CONGESTION: Hosur Road - Silk Board flyover backlog extended up to +25m delay</span>
            <span>🟢 INCIDENT: Koramangala minor water logging completely pumped and cleared</span>
            <span>🔷 EVENT: Chinnaswamy cricket match scheduled at 16:00. Commuters advised to avoid central sector routes.</span>
          </div>
        </div>
      </div>

      {/* Two Column Grid layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left main: Incident log table */}
        <div className="xl:col-span-8 aero-card rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-sans font-bold text-sm text-on-surface flex items-center gap-2">
              <span className="w-2 h-2 rounded bg-primary" />
              Active Incident Management
            </h3>
            <span className="font-mono text-[10px] text-on-surface-variant font-bold">Showing {events.length} active logs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 font-mono text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                  <th className="py-3 px-2">Type</th>
                  <th className="py-3 px-2">Zone</th>
                  <th className="py-3 px-2">Corridor Area</th>
                  <th className="py-3 px-2 hidden md:table-cell text-right">Remaining Est</th>
                  <th className="py-3 px-2 text-center">Impact</th>
                  <th className="py-3 px-2 text-right">Dispatch Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-xs text-on-surface">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-on-surface-variant font-medium">
                      All incidents registered today have been cleared.
                    </td>
                  </tr>
                ) : (
                  events.map((evt) => {
                    const isCritical = evt.impact === 'CRITICAL';
                    const isHigh = evt.impact === 'HIGH';
                    return (
                      <tr key={evt.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-2 font-semibold">
                          <div className="flex flex-col">
                            <span>{evt.type}</span>
                            <span className="font-mono text-[9px] text-on-surface-variant">{evt.id}</span>
                          </div>
                        </td>
                        <td className="py-4 px-2 font-semibold text-primary">{evt.zone}</td>
                        <td className="py-4 px-2 text-on-surface">{evt.corridor}</td>
                        <td className="py-4 px-2 hidden md:table-cell text-right font-mono font-medium text-on-surface-variant">{evt.duration}</td>
                        <td className="py-4 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-extrabold tracking-wide ${
                            isCritical ? 'bg-red-100 text-red-800' : isHigh ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {evt.impact}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <button
                            id={`btn-review-${evt.id}`}
                            onClick={() => reviewEvent(evt)}
                            className="bg-white border border-slate-200 text-primary hover:bg-primary hover:text-white transition-all px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ml-auto"
                          >
                            <span>Review</span>
                            <ChevronRight size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right main: Manpower and actions */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          {/* Manpower Graph segmented */}
          <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
            <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-on-surface">Manpower Allocation Status</h4>
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="font-mono text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Deployment by Corridor</span>
                <span className="font-sans font-bold text-xs text-primary">842 Total</span>
              </div>
              <div className="h-8 w-full bg-slate-100 rounded-xl overflow-hidden flex border border-white">
                <div className="bg-primary hover:opacity-90 w-[35%] transition-all cursor-pointer relative group" title="South Zone Dispatch Officers: 35%">
                  <div className="absolute bottom-full mb-1 left-1.5 bg-slate-900 text-white text-[8px] p-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">South: 35%</div>
                </div>
                <div className="bg-amber-400 hover:opacity-90 w-[25%] transition-all cursor-pointer relative group" title="East Zone Dispatch Officers: 25%">
                  <div className="absolute bottom-full mb-1 left-1.5 bg-slate-900 text-white text-[8px] p-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">East: 25%</div>
                </div>
                <div className="bg-[#006b57] hover:opacity-90 w-[20%] transition-all cursor-pointer relative group" title="Central Zone Dispatch Officers: 20%">
                  <div className="absolute bottom-full mb-1 left-1.5 bg-slate-900 text-white text-[8px] p-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Central: 20%</div>
                </div>
                <div className="bg-slate-400 hover:opacity-90 w-[20%] transition-all cursor-pointer relative group" title="West Zone Dispatch Officers: 20%">
                  <div className="absolute bottom-full mb-1 left-1.5 bg-slate-900 text-white text-[8px] p-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">West: 20%</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 font-mono text-[9px] font-bold text-on-surface-variant">
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary" /> South (35%)</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> East (25%)</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#006b57]" /> Central (20%)</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-400" /> W/N (20%)</div>
              </div>
            </div>
          </div>

          {/* Actionable checklists */}
          <div className="glass-card rounded-2xl p-5 flex flex-col gap-3">
            <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-on-surface">Suggested AI Actions</h4>
            <div className="flex flex-col gap-3">
              {suggestedActions.map((act) => (
                <div 
                  key={act.id} 
                  className={`p-3 rounded-xl border transition-all flex items-start gap-3 relative group ${
                    act.executed 
                      ? 'bg-slate-50 border-slate-200 opacity-60' 
                      : 'bg-white/70 hover:bg-white border-white/50 shadow-sm'
                  }`}
                >
                  <div className="flex-grow">
                    <p className={`font-sans font-bold text-xs ${act.executed ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                      {act.title}
                    </p>
                    <p className="font-sans text-[10px] text-on-surface-variant leading-snug mt-1">{act.description}</p>
                  </div>
                  {act.executed ? (
                    <div className="text-emerald-600 p-1">
                      <CheckCircle2 size={16} />
                    </div>
                  ) : (
                    <button
                      id={`btn-deploy-action-${act.id}`}
                      onClick={() => executeAction(act.id)}
                      className="bg-primary/10 hover:bg-primary hover:text-white text-primary p-1.5 rounded-lg opacity-80 group-hover:opacity-100 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                      title="Send Dispatch Command"
                    >
                      <Send size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Review Event Dialog Overlay Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm select-none animate-fade-in">
          <div 
            onClick={() => setSelectedEvent(null)} 
            className="fixed inset-0 cursor-pointer" 
          />
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative z-10 border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="font-mono text-[9px] text-primary font-bold uppercase tracking-wider bg-primary/10 py-0.5 px-2 rounded-full">Event Information Log</span>
                <h3 className="font-sans font-extrabold text-lg text-on-surface mt-1">{selectedEvent.type}</h3>
              </div>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3 py-2">
              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3 font-sans text-xs">
                <div>
                  <span className="text-on-surface-variant block uppercase font-mono text-[9px]">ID Code</span>
                  <span className="font-bold text-on-surface">{selectedEvent.id}</span>
                </div>
                <div>
                  <span className="font-mono text-[9px] text-on-surface-variant uppercase">Impact Status</span>
                  <span className={`block font-bold text-xs ${
                    selectedEvent.impact === 'CRITICAL' ? 'text-error' : 'text-[#c05400]'
                  }`}>{selectedEvent.impact}</span>
                </div>
                <div className="mt-2">
                  <span className="font-mono text-[9px] text-on-surface-variant uppercase">Zone Sector</span>
                  <span className="font-bold text-on-surface block">{selectedEvent.zone}</span>
                </div>
                <div className="p-1 mt-2">
                  <span className="font-mono text-[9px] text-on-surface-variant uppercase">Corridor Location</span>
                  <span className="font-bold text-on-surface break-words block">{selectedEvent.corridor}</span>
                </div>
              </div>

              <div>
                <h4 className="font-sans font-bold text-xs text-on-surface mb-1">Operational Description</h4>
                <p className="font-sans text-xs text-on-surface-variant leading-relaxed p-3 bg-[#f8f9ff] rounded-xl border border-white/60">
                  {selectedEvent.details || "No additional logs registered for this event."}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-6">
              <button
                id="btn-resolve-event"
                onClick={() => {
                  alert(`Dispatched clearance signal to local sector unit. Resolved incident ${selectedEvent.id}.`);
                  resolveActiveEvent(selectedEvent.id, selectedEvent.impact);
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-sans font-bold text-xs transition-colors cursor-pointer text-center"
              >
                Clear & Resolve Incident
              </button>
              <button
                onClick={() => setSelectedEvent(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-on-surface-variant rounded-xl font-sans font-bold text-xs transition-colors cursor-pointer text-center"
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
