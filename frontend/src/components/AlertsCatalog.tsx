import { useState } from 'react';
import { 
  AlertTriangle, 
  Search, 
  MapPin, 
  Filter, 
  Calendar, 
  ArrowRight,
  ShieldAlert,
  Bell,
  Clock,
  Briefcase
} from 'lucide-react';
import { INITIAL_EVENTS } from '../data';
import { TrafficEvent } from '../types';

interface AlertsCatalogProps {
  language: string;
}

export default function AlertsCatalog({ language }: AlertsCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [localEvents, setLocalEvents] = useState<TrafficEvent[]>(INITIAL_EVENTS);

  // Filter events
  const filteredEvents = localEvents.filter(evt => {
    const matchesSearch = evt.type.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          evt.corridor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          evt.zone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesImpact = activeFilter === 'ALL' ? true : evt.impact === activeFilter;
    const matchesZone = selectedZone === 'ALL' ? true : evt.zone === selectedZone;
    return matchesSearch && matchesImpact && matchesZone;
  });

  const [broadcastedStates, setBroadcastedStates] = useState<Record<string, boolean>>({});

  const handleBroadcast = (id: string, type: string) => {
    setBroadcastedStates(prev => ({ ...prev, [id]: true }));
    alert(`BROADCAST SUCCESS: Alerts transmitted across mobile warning push nodes for incident ${id} (${type}).`);
  };

  const zones = ['ALL', 'South', 'East', 'Central', 'West'];

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full max-w-5xl mx-auto px-1 select-none">
      
      {/* Page Header */}
      <div>
        <h2 className="font-sans font-extrabold text-2xl md:text-3xl text-on-surface tracking-tight mb-1">
          {language === 'kn' ? 'ಲೈವ್ ಎಚ್ಚರಿಕೆಗಳು' : 'Live Alerts Command'}
        </h2>
        <p className="font-sans text-sm text-on-surface-variant">
          Broadcast global road conditions, dispatch bulletins, and weather-related restrictions to road users.
        </p>
      </div>

      {/* Filters Dashboard */}
      <div className="glass-card rounded-2xl p-5 flex flex-col md:flex-row gap-4 justify-between items-center bg-white/40 border border-white/50 shadow-sm relative">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search active alerts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/70 focus:bg-white text-xs px-4 py-2.5 pl-10 rounded-xl border border-white/50 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          />
          <Search size={14} className="absolute left-3.5 top-3.5 text-on-surface-variant/60" />
        </div>

        {/* Impact Level Tabs */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map((impact) => (
            <button
              key={impact}
              onClick={() => setActiveFilter(impact)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                activeFilter === impact 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'bg-white/50 text-on-surface-variant hover:bg-white'
              }`}
            >
              {impact}
            </button>
          ))}
        </div>

        {/* Zone Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="font-mono text-[10px] text-on-surface-variant font-bold uppercase whitespace-nowrap">Zone:</span>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="bg-white/60 text-xs px-3 py-2 rounded-xl border border-white/50 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs outline-none cursor-pointer flex-grow md:flex-grow-0"
          >
            {zones.map(z => (
              <option key={z} value={z}>{z === 'ALL' ? 'All Zones' : `${z} Sector`}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Alerts Catalog and List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
        {filteredEvents.length === 0 ? (
          <div className="md:col-span-2 glass-card rounded-2xl p-12 text-center text-on-surface-variant flex flex-col items-center justify-center gap-3">
            <Bell size={32} className="text-secondary/50 animate-bounce" />
            <p className="font-sans font-bold text-sm">No Active Alert Bulletins Found</p>
            <p className="font-sans text-xs">There are no reports fitting the current selection.</p>
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const isCritical = evt.impact === 'CRITICAL';
            const isHigh = evt.impact === 'HIGH';
            const isBroadcasted = broadcastedStates[evt.id];

            return (
              <div 
                key={evt.id} 
                className="aero-card rounded-2xl p-6 flex flex-col gap-4 border-t-4 shadow-sm hover:scale-101 hover:shadow-md transition-all duration-300 relative overflow-hidden group"
                style={{ borderTopColor: isCritical ? '#ba1a1a' : isHigh ? '#c05400' : '#005bb1' }}
              >
                {/* Visual badge top right */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 font-mono text-[9px] font-bold">
                  <span className={`px-2 py-0.5 rounded leading-none ${
                    isCritical ? 'bg-red-50 text-red-700' : 'bg-primary/5 text-primary'
                  }`}>
                    {evt.impact}
                  </span>
                </div>

                {/* Event core info */}
                <div className="flex gap-4 items-start">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isCritical ? 'bg-red-50 text-error' : 'bg-blue-50 text-primary'
                  }`}>
                    <AlertTriangle size={20} className={isCritical ? 'animate-pulse' : ''} />
                  </div>
                  <div>
                    <h3 className="font-sans font-extrabold text-sm text-on-surface">{evt.type}</h3>
                    <p className="font-sans text-xs text-on-surface-variant leading-relaxed mt-1">{evt.details || "Active operational incident report."}</p>
                  </div>
                </div>

                <div className="h-px bg-slate-100 my-1" />

                {/* Meta details */}
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

                {/* Broadcast actions footer inside card */}
                <div className="flex gap-2.5 mt-3 pt-2">
                  <button
                    id={`btn-alerts-broadcast-${evt.id}`}
                    onClick={() => handleBroadcast(evt.id, evt.type)}
                    className={`flex-1 py-2.5 rounded-xl font-sans font-bold text-xs shadow-sm transition-all text-center cursor-pointer ${
                      isBroadcasted 
                        ? 'bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200' 
                        : 'bg-primary hover:bg-primary/95 text-white active:scale-98'
                    }`}
                  >
                    {isBroadcasted ? '✓ Transmitted Broadcast' : 'Transmit Live Broadcast'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
