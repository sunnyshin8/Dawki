export type ActiveTab = 'live-city-view' | 'best-time-to-travel' | 'routes' | 'alerts' | 'reports' | 'admin';

export type TrafficRiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface RouteOption {
  id: string;
  name: string;
  nameKa: string;
  distance: string;
  duration: number; // in minutes
  riskLevel: TrafficRiskLevel;
  riskPct: number; // 0 to 100
  description: string;
  svgPath: string; // for animated map overlay representation
}

export interface TrafficEvent {
  id: string;
  type: string;
  zone: string;
  corridor: string;
  duration: string;
  impact: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  icon: string;
  details?: string;
  timeAdded?: string;
}

export interface suggestedAction {
  id: string;
  title: string;
  description: string;
  type: 'deploy' | 'reroute' | 'overtime' | 'resolved';
  targetId?: string;
  icon: string;
  executed: boolean;
}

export interface Corridor {
  id: string;
  name: string;
  nameKa: string;
  riskScore: number; // 0 to 100
  peakTimeMsg: string;
  status: string;
  statusLevel: 'error' | 'warning' | 'success';
  trend: 'up' | 'down' | 'stable';
  color: string;
  x: number; // coordinates for map representation
  y: number;
}
