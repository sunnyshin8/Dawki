"use client";

import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import BestTimeToTravel from '../components/BestTimeToTravel';
import RoutesAnalysis from '../components/RoutesAnalysis';
import LiveCityView from '../components/LiveCityView';
import AlertsCatalog from '../components/AlertsCatalog';
import ReportView from '../components/ReportView';
import AdminPanel from '../components/AdminPanel';
import { ActiveTab } from '../types';
import { Siren, Volume2 } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('best-time-to-travel');
  const [activeLanguage, setActiveLanguage] = useState<string>('en');
  const [emergencyActive, setEmergencyActive] = useState<boolean>(false);

  const triggerEmergencyProtocol = () => {
    setEmergencyActive(true);
  };

  const deactivateEmergencyProtocol = () => {
    setEmergencyActive(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-tr from-[#f4f7ff] via-[#f1f5f9] to-[#ffffff] relative font-sans text-on-surface antialiased select-none">
      
      {/* 1. Left Sidebar (Desktop only) */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onEmergencyTrigger={triggerEmergencyProtocol}
      />

      {/* 2. Main Content & Header wrap */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Header (Language, notifications, mobile trigger) */}
        <Header 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          activeLanguage={activeLanguage}
          setActiveLanguage={setActiveLanguage}
          onEmergencyTrigger={triggerEmergencyProtocol}
        />

        {/* Outer Tab Content Workspace Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 hide-scrollbar">
          <div className="max-w-7xl mx-auto w-full h-full">
            {activeTab === 'best-time-to-travel' && (
              <BestTimeToTravel language={activeLanguage} />
            )}
            
            {activeTab === 'routes' && (
              <RoutesAnalysis language={activeLanguage} />
            )}
            
            {activeTab === 'live-city-view' && (
              <LiveCityView language={activeLanguage} />
            )}

            {activeTab === 'alerts' && (
              <AlertsCatalog language={activeLanguage} />
            )}

            {activeTab === 'reports' && (
              <ReportView language={activeLanguage} />
            )}

            {activeTab === 'admin' && (
              <AdminPanel language={activeLanguage} />
            )}
          </div>
        </main>
      </div>

      {/* 3. Emergency Siren Protocol Alert Modal (flashing orange-red vignette overlay) */}
      {emergencyActive && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-red-950/70 backdrop-blur-md animate-fade-in select-none">
          {/* Flashing screen borders */}
          <div className="absolute inset-0 border-8 border-red-600 animate-[pulse_1s_infinite] pointer-events-none" />
          
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl relative border-t-8 border-error flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 text-error flex items-center justify-center mb-5 animate-bounce">
              <Siren size={36} className="animate-pulse" />
            </div>

            <h3 className="font-sans font-black text-2xl text-red-900 leading-tight">
              Emergency Protocol Initiated
            </h3>
            
            <p className="font-sans text-sm text-red-600 mt-2 font-bold uppercase tracking-widest flex items-center gap-1.5 justify-center">
              <Volume2 size={12} className="animate-ping" />
              Bengaluru City Sectors Alignment
            </p>

            <div className="h-px bg-red-100 w-full my-4" />

            <div className="space-y-3 w-full text-left bg-red-50/50 p-4 rounded-2xl border border-red-100 font-sans text-xs text-red-800 leading-normal">
              <div className="flex items-start gap-2">
                <span className="font-bold text-red-950 shrink-0">■ COMMAND:</span>
                <span>Signal priority modules overridden on all central arterials. Stagnant backlog duration reduced to signal-hold threshold.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-red-950 shrink-0">■ ROUTING:</span>
                <span>Alternative detour matrices broadcasting automatically as mobile cellular route prompts for commuters heading South.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-red-950 shrink-0">■ PERSONNEL:</span>
                <span>Standby reserve units activated. Sector command officer assignments bumped across all critical nodes.</span>
              </div>
            </div>

            <button
              id="btn-deactivate-emergency"
              onClick={deactivateEmergencyProtocol}
              className="mt-6 w-full py-4 bg-red-950 hover:bg-slate-905 text-white rounded-2xl font-sans font-bold text-sm shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:bg-red-900 active:scale-99 transition-all cursor-pointer"
            >
              Deactivate Emergency Sirens / Reset Grid Command
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
