export interface DashboardFilters {
  timeRange: {
    start: Date;
    end: Date;
    preset: '7d' | '30d' | '90d' | 'ytd' | 'custom';
  };
  regionId?: string;
  programId?: string;
  providerId?: string;
  subjectId?: string;
}

export interface KPIData {
  totalCompanies: number;
  totalSchools: number;
  totalBranches: number;
  activeLicenses: number;
  expiringLicenses30d: number;
  teachers: number;
  students: number;
  trends: Record<string, { pct: number; direction: 'up' | 'down' | 'flat' }>;
}

export interface ChartData {
  licensesBySubject: Array<{ subject: string; active: number }>;
  newUsersByRole: Array<{ date: string; teachers: number; students: number; admins: number }>;
}

export interface ActivityEvent {
  id: string;
  time: string;
  actorName: string;
  action: 'create' | 'update' | 'delete' | 'assign' | 'renew' | 'extend' | 'expand';
  target: string;
  scope: string;
}

export interface SchoolStats {
  id: string;
  schoolName: string;
  companyName: string;
  regionProgram: string;
  activeStudents: number;
  trendPct: number;
}

export interface SysAdminDashboardData {
  kpis: KPIData;
  charts: ChartData;
  recentActivity: ActivityEvent[];
  topSchools: SchoolStats[];
}

export interface FilterOption {
  id: string;
  label: string;
}
