import { ActiveTab } from '../types';
import { 
  Radar, 
  Clock, 
  Map, 
  AlertTriangle, 
  BarChart2, 
  ShieldAlert, 
  Flame, 
  Settings, 
  HelpCircle,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onEmergencyTrigger: () => void;
  operativeName?: string;
  avatarUrl?: string;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  onEmergencyTrigger,
  operativeName = "Operative 42",
  avatarUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuC_UF7lWgG6lG6p-V1UARurUyiP9NCZZ9d38AFNHMkcqAi5ywpWZaQt9wCO5XfvRVlsU1LsNcNkh6FUypa3ec6qOJhor-FSMOwnxfchtVc8iZFqQe9yXh8ya2uXeRCsyadYqsJtxspe6ZpV2COWoSDb9BZ6YgMKWGKfnZKtgAxjw8nM2dSUXcN1HzCWnlTWtkXqByGe39xIDsDyAW9_UyIoUYxiQNuwHf2hC6Sxr9gaTdB0M0dhDiPmbBuo0l18vDDgRZt4oI0aTHCg"
}: SidebarProps) {
  
  const navItems = [
    { id: 'live-city-view', label: 'Live City View', icon: Radar },
    { id: 'best-time-to-travel', label: 'Best Time to Travel', icon: Clock },
    { id: 'routes', label: 'Routes', icon: Map },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
    { id: 'admin', label: 'Admin', icon: UserCheck }
  ] as const;

  return (
    <aside className="hidden lg:flex flex-col p-6 gap-4 h-screen sticky top-0 w-72 bg-[#eff4ff]/90 backdrop-blur-lg border-r border-white/40 shadow-xl justify-between shrink-0 z-40 select-none">
      {/* Brand & Sector */}
      <div>
        <div className="flex items-center gap-4 mb-8 mt-2 px-2">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md bg-primary-container flex items-center justify-center shrink-0">
            <img 
              src={avatarUrl} 
              alt={operativeName} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="font-sans font-bold text-lg text-primary tracking-tight leading-tight">Dawki</h1>
            <p className="font-mono text-[10px] text-on-surface-variant tracking-wider uppercase">Bengaluru Sector</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl font-sans text-sm transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-primary text-white font-bold shadow-md scale-102 hover:bg-primary/90' 
                    : 'text-on-surface-variant hover:bg-white/50 hover:translate-x-1'
                }`}
              >
                <Icon size={18} className={`${isActive ? 'text-white' : 'text-on-surface-variant'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Emergency & Footer Actions */}
      <div className="flex flex-col gap-4">
        {/* Urgent Emergency Action Button */}
        <button
          id="btn-emergency-protocol"
          onClick={onEmergencyTrigger}
          className="w-full py-3.5 px-4 bg-error text-white rounded-xl font-sans font-semibold text-sm shadow-[0_4px_16px_rgba(186,26,26,0.3)] hover:bg-red-700 hover:shadow-lg hover:scale-101 active:scale-99 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Flame size={16} className="animate-pulse" />
          <span>Emergency Protocol</span>
        </button>

        {/* Bottom Small settings support */}
        <div className="flex flex-col gap-1 border-t border-white/40 pt-4">
          <button 
            id="btn-sidebar-settings"
            onClick={() => setActiveTab('routes')}
            className="flex items-center gap-3 p-2 rounded-lg text-on-surface-variant text-xs hover:bg-white/40 hover:text-primary transition-all text-left cursor-pointer"
          >
            <Settings size={14} />
            <span>Settings & Routing Preferences</span>
          </button>
          
          <button 
            id="btn-sidebar-support"
            onClick={() => alert("Bengaluru Sector Command Support: Dial +91 80 2294 2276 for dispatch queries.")}
            className="flex items-center gap-3 p-2 rounded-lg text-on-surface-variant text-xs hover:bg-white/40 hover:text-primary transition-all text-left cursor-pointer"
          >
            <HelpCircle size={14} />
            <span>System Support</span>
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 pt-3 border-t border-white/20">
          <div className="relative">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-white bg-slate-200">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_UF7lWgG6lG6p-V1UARurUyiP9NCZZ9d38AFNHMkcqAi5ywpWZaQt9wCO5XfvRVlsU1LsNcNkh6FUypa3ec6qOJhor-FSMOwnxfchtVc8iZFqQe9yXh8ya2uXeRCsyadYqsJtxspe6ZpV2COWoSDb9BZ6YgMKWGKfnZKtgAxjw8nM2dSUXcN1HzCWnlTWtkXqByGe39xIDsDyAW9_UyIoUYxiQNuwHf2hC6Sxr9gaTdB0M0dhDiPmbBuo0l18vDDgRZt4oI0aTHCg" 
                alt="Operative Profile" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-semibold text-xs text-on-surface leading-tight">{operativeName}</span>
            <span className="font-mono text-[9px] text-emerald-600 font-bold tracking-wider uppercase">Active Duty</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
