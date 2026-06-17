import { useState } from 'react';
import { ActiveTab } from '../types';
import { LANGUAGES } from '../data';
import { 
  Bell, 
  Menu,
  Globe, 
  User, 
  X,
  Radar, 
  Clock, 
  Map, 
  AlertTriangle, 
  BarChart2, 
  UserCheck,
  Flame
} from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeLanguage: string;
  setActiveLanguage: (lang: string) => void;
  unreadNotificationsCount?: number;
  onEmergencyTrigger: () => void;
}

export default function Header({
  activeTab,
  setActiveTab,
  activeLanguage,
  setActiveLanguage,
  unreadNotificationsCount = 3,
  onEmergencyTrigger
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

  const navItems = [
    { id: 'live-city-view', label: 'Live City View', icon: Radar },
    { id: 'best-time-to-travel', label: 'Best Time to Travel', icon: Clock },
    { id: 'routes', label: 'Routes', icon: Map },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
    { id: 'admin', label: 'Admin', icon: UserCheck }
  ] as const;

  const notifications = [
    { id: 'not-1', msg: 'CRITICAL: Multiple collision at Silk Board Junction', time: '10m ago' },
    { id: 'not-2', msg: 'ALERT: Rainfall warning in Central Sector', time: '30m ago' },
    { id: 'not-3', msg: 'ROAD: Tunnel maintenance scheduled on NICE road', time: '1h ago' }
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[#f8f9ff]/70 backdrop-blur-xl border-b border-white/30 shadow-[0_4px_30px_rgba(42,140,255,0.03)] h-20 shrink-0 select-none">
        <div className="flex justify-between items-center w-full px-4 md:px-12 h-full max-w-7xl mx-auto">
          {/* Brand & Mobile Menu Button */}
          <div className="flex items-center gap-4">
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-on-surface p-2.5 rounded-xl hover:bg-white/50 border border-white/40 shadow-sm transition-colors cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <span 
              onClick={() => setActiveTab('best-time-to-travel')}
              className="font-sans font-extrabold text-2xl tracking-tighter text-primary cursor-pointer hover:opacity-90 select-none"
            >
              Dawki
            </span>
          </div>

          <div className="flex-grow"></div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Language Dropdown Selector */}
            <div className="flex items-center gap-1.5 bg-white/60 hover:bg-white border border-white/50 px-3 py-1.5 rounded-xl transition-all shadow-sm">
              <Globe size={15} className="text-primary shrink-0" />
              <div className="flex flex-col text-left">
                <span className="font-sans text-[8px] text-on-surface-variant font-bold uppercase tracking-wider leading-none">Language</span>
                <select
                  id="select-language-dropdown"
                  value={activeLanguage}
                  onChange={(e) => setActiveLanguage(e.target.value)}
                  className="bg-transparent text-primary font-sans text-xs font-semibold focus:outline-none pr-1 cursor-pointer border-none appearance-none"
                  style={{ background: 'none' }}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} className="text-on-surface font-sans text-xs bg-white">
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notifications Button */}
            <div className="relative">
              <button
                id="btn-notifications-toggle"
                onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
                className={`p-2.5 rounded-full hover:bg-primary-container/10 transition-all border border-white/50 bg-white/60 text-primary flex items-center justify-center relative cursor-pointer ${
                  notificationPanelOpen ? 'scale-95 bg-white shadow-sm' : ''
                }`}
              >
                <Bell size={18} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-error rounded-full border border-white animate-bounce" />
                )}
              </button>

              {/* High-fidelity Notifications Overlay */}
              {notificationPanelOpen && (
                <div 
                  id="notifications-overlay"
                  className="absolute right-0 mt-3 w-80 bg-white/95 backdrop-blur-md border border-white/50 shadow-2xl rounded-2xl p-4 flex flex-col gap-3 z-50 animate-fade-in"
                >
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="font-sans font-bold text-sm text-on-surface">Sector Alerts</h3>
                    <button 
                      onClick={() => setNotificationPanelOpen(false)}
                      className="text-on-surface-variant hover:text-on-surface p-1 rounded-full cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {notifications.map((not) => (
                      <div key={not.id} className="p-2.5 bg-[#f8f9ff] hover:bg-primary/5 rounded-xl border border-white transition-all cursor-pointer">
                        <p className="font-sans text-xs text-on-surface font-medium leading-normal">{not.msg}</p>
                        <span className="font-mono text-[9px] text-on-surface-variant mt-1.5 block text-right">{not.time}</span>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => { setActiveTab('admin'); setNotificationPanelOpen(false); }}
                    className="w-full text-center py-2 bg-primary/10 hover:bg-primary/15 text-primary rounded-xl font-sans text-xs font-semibold cursor-pointer"
                  >
                    Manage Operations Center
                  </button>
                </div>
              )}
            </div>

            {/* Account Icon */}
            <button
              onClick={() => setActiveTab('admin')}
              className="p-2.5 rounded-full hover:bg-primary-container/10 transition-all border border-white/50 bg-white/60 text-primary flex items-center justify-center cursor-pointer"
            >
              <User size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex select-none animate-fade-in">
          {/* Backdrop blur click receiver */}
          <div 
            id="mobile-menu-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
          />

          {/* Sidebar Drawer */}
          <div className="relative w-80 bg-[#eff4ff] h-full flex flex-col justify-between p-6 shadow-2xl z-50">
            <div>
              <div className="flex justify-between items-center mb-8 px-2">
                <span className="font-sans font-extrabold text-2xl tracking-tighter text-primary">Dawki</span>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 bg-white/60 hover:bg-white rounded-xl border border-white/50 text-on-surface-variant cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mobile Languages Toggle inside Menu */}
              <div className="mb-6 bg-white/50 p-2.5 rounded-2xl border border-white/40 shadow-sm">
                <p className="font-sans font-bold text-xs text-on-surface-variant mb-2 px-1">Select Language</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setActiveLanguage(lang.code);
                        setMobileMenuOpen(false);
                      }}
                      className={`py-1.5 px-2 rounded-lg font-sans text-xs font-semibold ${
                        activeLanguage === lang.code 
                          ? 'bg-primary text-white' 
                          : 'bg-white/40 text-on-surface-variant'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation Items */}
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-4 px-4 py-3 rounded-xl font-sans text-sm transition-all duration-200 text-left cursor-pointer ${
                        isActive 
                          ? 'bg-primary text-white font-bold' 
                          : 'text-on-surface-variant hover:bg-white/50'
                      }`}
                    >
                      <Icon size={18} className={`${isActive ? 'text-white' : 'text-on-surface-variant'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Emergency & Footer */}
            <div className="flex flex-col gap-4">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onEmergencyTrigger();
                }}
                className="w-full py-3 px-4 bg-error text-white rounded-xl font-sans font-semibold text-sm shadow-[0_4px_12px_rgba(186,26,26,0.2)] hover:bg-red-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Flame size={16} />
                <span>Emergency Protocol</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
