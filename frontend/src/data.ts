import { RouteOption, TrafficEvent, suggestedAction, Corridor } from './types';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'ml', label: 'മലയാളം' }
];

export const INITIAL_ROUTES: RouteOption[] = [
  {
    id: 'hosur',
    name: 'Via Hosur Road',
    nameKa: 'ಹೊಸೂರು ರಸ್ತೆ ಮೂಲಕ',
    distance: '18.5 km',
    duration: 42,
    riskLevel: 'High',
    riskPct: 75,
    description: 'Multi-vehicle collision near Central Silk Board causing heavy delays on flyover.',
    svgPath: 'M 10 380 Q 200 120 400 320 T 780 120'
  },
  {
    id: 'inner-ring',
    name: 'Via Inner Ring Rd',
    nameKa: 'ಹೊರ ವರ್ತುಲ ರಸ್ತೆ ಮೂಲಕ',
    distance: '21.2 km',
    duration: 51,
    riskLevel: 'Medium',
    riskPct: 45,
    description: 'Moderate flow with minor waterlogging near Domlur. Construction has lane restrictions.',
    svgPath: 'M 10 380 Q 250 350 450 150 T 780 120'
  },
  {
    id: 'nice-road',
    name: 'Via NICE Road',
    nameKa: 'ನೈಸ್ ರಸ್ತೆ ಮೂಲಕ',
    distance: '28.0 km',
    duration: 58,
    riskLevel: 'Low',
    riskPct: 20,
    description: 'Completely flowing normal clear of construction. Longer distance but zero stop-and-go.',
    svgPath: 'M 10 380 L 300 380 L 500 240 L 780 120'
  }
];

export const INITIAL_EVENTS: TrafficEvent[] = [
  {
    id: 'EV-902',
    type: 'Major Accident',
    zone: 'South',
    corridor: 'Hosur Rd - Silk Board',
    duration: '45m remaining',
    impact: 'CRITICAL',
    icon: 'AlertOctagon',
    details: 'Collision of three container trucks on high-speed lane. Crane dispatched, clearance underway.'
  },
  {
    id: 'EV-881',
    type: 'Waterlogging',
    zone: 'East',
    corridor: 'ORR - Bellandur',
    duration: '120m predicted',
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
    icon: 'UserCheck',
    details: 'High-security convoy movement. Temporary rolling blockades of 5-10 minutes.'
  },
  {
    id: 'EV-610',
    type: 'Road Works',
    zone: 'West',
    corridor: 'Tumkur Rd - Peenya',
    duration: 'Ongoing (3 Days)',
    impact: 'LOW',
    icon: 'Hammer',
    details: 'Bridge expansion joint repairs. Standard single lane layout, low impact outside peak hours.'
  }
];

export const INITIAL_SUGGESTED_ACTIONS: suggestedAction[] = [
  {
    id: 'SA-01',
    title: 'Deploy 3 officers to Hosur Rd',
    description: 'To assist with major accident clearance near Central Silk Board.',
    type: 'deploy',
    targetId: 'hosur',
    icon: 'Locate',
    executed: false
  },
  {
    id: 'SA-02',
    title: 'Re-route reserve from North to ORR',
    description: 'To manage sudden surge due to waterlogging delays (+2hrs) near Bellandur.',
    type: 'reroute',
    icon: 'ArrowLeftRight',
    executed: false
  },
  {
    id: 'SA-03',
    title: 'Approve overtime for Zone C officers',
    description: 'Provide administrative allowance support for VVIP corridor security team.',
    type: 'overtime',
    icon: 'CheckSquare',
    executed: false
  }
];

export const INITIAL_CORRIDORS: Corridor[] = [
  {
    id: 'corr-1',
    name: 'ORR East 1',
    nameKa: 'ಹೊರ ವರ್ತುಲ ರಸ್ತೆ',
    riskScore: 0,
    peakTimeMsg: 'Fetching live data...',
    status: 'Connecting...',
    statusLevel: 'success',
    trend: 'stable',
    color: '#94a3b8',
    x: 75,
    y: 50
  },
  {
    id: 'corr-2',
    name: 'Hosur Road',
    nameKa: 'ಹೊಸೂರು ರಸ್ತೆ',
    riskScore: 0,
    peakTimeMsg: 'Fetching live data...',
    status: 'Connecting...',
    statusLevel: 'success',
    trend: 'stable',
    color: '#94a3b8',
    x: 60,
    y: 78
  },
  {
    id: 'corr-3',
    name: 'Tumkur Road',
    nameKa: 'ತುಮಕೂರು ರಸ್ತೆ',
    riskScore: 0,
    peakTimeMsg: 'Fetching live data...',
    status: 'Connecting...',
    statusLevel: 'success',
    trend: 'stable',
    color: '#94a3b8',
    x: 22,
    y: 42
  },
  {
    id: 'corr-4',
    name: 'Bellary Road',
    nameKa: 'ಬಳ್ಳಾರಿ ರಸ್ತೆ',
    riskScore: 0,
    peakTimeMsg: 'Fetching live data...',
    status: 'Connecting...',
    statusLevel: 'success',
    trend: 'stable',
    color: '#94a3b8',
    x: 48,
    y: 16
  }
];

// AI_INSIGHTS are now generated dynamically from live weather/risk data
// See BestTimeToTravel.tsx : buildLiveInsights(livePredict, forecast)

