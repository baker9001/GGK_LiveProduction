/**
 * Dashboard Data Hook
 *
 * Fetches and aggregates dashboard data from Supabase.
 * All queries are read-only with graceful fallbacks for missing tables.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../lib/supabase';
import type { DashboardFilters, SysAdminDashboardData } from './types';

/**
 * Calculate trend percentage comparing current period to previous period
 */
function calculateTrend(current: number, previous: number): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0) {
    return { pct: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'flat' };
  }

  const pct = ((current - previous) / previous) * 100;
  const direction = pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat';

  return { pct: Math.abs(pct), direction };
}

/**
 * Main dashboard data hook
 */
export function useSysAdminDashboard(filters: DashboardFilters) {
  return useQuery({
    queryKey: ['sysAdminDashboard', filters],
    queryFn: async () => {
      const { timeRange, regionId, programId, providerId, subjectId } = filters;
      const { start, end } = timeRange;

      // Calculate previous period for trend comparison
      const periodLength = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - periodLength);
      const prevEnd = new Date(start);

      // Initialize dashboard data structure
      const data: SysAdminDashboardData = {
        kpis: {
          totalCompanies: 0,
          totalSchools: 0,
          totalBranches: 0,
          activeLicenses: 0,
          expiringLicenses30d: 0,
          teachers: 0,
          students: 0,
          trends: {}
        },
        charts: {
          licensesBySubject: [],
          newUsersByRole: []
        },
        recentActivity: [],
        topSchools: []
      };

      try {
        // KPI: Total Companies
        const { count: companiesCount } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        data.kpis.totalCompanies = companiesCount || 0;

        // KPI: Total Schools (filtered by region/program if provided)
        let schoolsQuery = supabase
          .from('schools')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        if (regionId) {
          schoolsQuery = schoolsQuery.eq('region_id', regionId);
        }

        const { count: schoolsCount } = await schoolsQuery;
        data.kpis.totalSchools = schoolsCount || 0;

        // KPI: Total Branches
        let branchesQuery = supabase
          .from('branches')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        const { count: branchesCount } = await branchesQuery;
        data.kpis.totalBranches = branchesCount || 0;

        // KPI: Active Licenses
        let licensesQuery = supabase
          .from('licenses')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .gte('end_date', start.toISOString())
          .lte('start_date', end.toISOString());

        if (subjectId) {
          licensesQuery = licensesQuery.eq('subject_id', subjectId);
        }

        const { count: activeLicensesCount } = await licensesQuery;
        data.kpis.activeLicenses = activeLicensesCount || 0;

        // Previous period licenses for trend
        const { count: prevLicensesCount } = await supabase
          .from('licenses')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .gte('end_date', prevStart.toISOString())
          .lte('start_date', prevEnd.toISOString());

        data.kpis.trends.activeLicenses = calculateTrend(
          data.kpis.activeLicenses,
          prevLicensesCount || 0
        );

        // KPI: Licenses Expiring in 30 days
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);

        const { count: expiringCount } = await supabase
          .from('licenses')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .gte('end_date', new Date().toISOString())
          .lte('end_date', expiryDate.toISOString());

        data.kpis.expiringLicenses30d = expiringCount || 0;

        // KPI: Teachers
        let teachersQuery = supabase
          .from('teachers')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        const { count: teachersCount } = await teachersQuery;
        data.kpis.teachers = teachersCount || 0;

        // Previous period teachers
        const { count: prevTeachersCount } = await supabase
          .from('teachers')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .lte('created_at', prevEnd.toISOString());

        data.kpis.trends.teachers = calculateTrend(
          data.kpis.teachers,
          prevTeachersCount || 0
        );

        // KPI: Students
        let studentsQuery = supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        const { count: studentsCount } = await studentsQuery;
        data.kpis.students = studentsCount || 0;

        // Previous period students
        const { count: prevStudentsCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .lte('created_at', prevEnd.toISOString());

        data.kpis.trends.students = calculateTrend(
          data.kpis.students,
          prevStudentsCount || 0
        );

        // Chart: Licenses by Subject
        const { data: licensesBySubject } = await supabase
          .from('licenses')
          .select('subject_id, edu_subjects(name)')
          .eq('status', 'active')
          .gte('end_date', start.toISOString())
          .lte('start_date', end.toISOString());

        if (licensesBySubject) {
          const subjectMap = new Map<string, number>();

          licensesBySubject.forEach((license: any) => {
            const subjectName = license.edu_subjects?.name || 'Unknown';
            subjectMap.set(subjectName, (subjectMap.get(subjectName) || 0) + 1);
          });

          data.charts.licensesBySubject = Array.from(subjectMap.entries())
            .map(([subject, active]) => ({ subject, active }))
            .sort((a, b) => b.active - a.active)
            .slice(0, 10);
        }

        // Chart: New Users by Role (daily aggregation)
        const { data: newTeachers } = await supabase
          .from('teachers')
          .select('created_at')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: true });

        const { data: newStudents } = await supabase
          .from('students')
          .select('created_at')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: true });

        const { data: newAdmins } = await supabase
          .from('admin_users')
          .select('created_at')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: true });

        // Aggregate by date
        const dateMap = new Map<string, { teachers: number; students: number; admins: number }>();

        [newTeachers, newStudents, newAdmins].forEach((users, roleIndex) => {
          const roleKey = ['teachers', 'students', 'admins'][roleIndex] as 'teachers' | 'students' | 'admins';

          users?.forEach((user: any) => {
            const date = new Date(user.created_at).toISOString().split('T')[0];
            if (!dateMap.has(date)) {
              dateMap.set(date, { teachers: 0, students: 0, admins: 0 });
            }
            const entry = dateMap.get(date)!;
            entry[roleKey]++;
          });
        });

        data.charts.newUsersByRole = Array.from(dateMap.entries())
          .map(([date, counts]) => ({ date, ...counts }))
          .sort((a, b) => a.date.localeCompare(b.date));

        // Recent Activity (from audit_logs or status_history tables)
        const { data: auditLogs } = await supabase
          .from('audit_logs')
          .select('id, created_at, user_id, action, table_name, record_id, users(name)')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: false })
          .limit(15);

        if (auditLogs) {
          data.recentActivity = auditLogs.map((log: any) => ({
            id: log.id,
            time: new Date(log.created_at).toISOString(),
            actorName: log.users?.name || 'System',
            action: log.action as any || 'update',
            target: `${log.table_name} #${log.record_id}`,
            scope: 'System'
          }));
        }

        // Top Schools by Active Students
        const { data: schoolsData } = await supabase
          .from('schools')
          .select(`
            id,
            name,
            company_id,
            companies(name),
            region_id,
            edu_regions(name),
            students(count)
          `)
          .eq('is_active', true)
          .order('students(count)', { ascending: false })
          .limit(10);

        if (schoolsData) {
          data.topSchools = schoolsData.map((school: any) => ({
            id: school.id,
            schoolName: school.name,
            companyName: school.companies?.name || 'N/A',
            regionProgram: school.edu_regions?.name || 'N/A',
            activeStudents: school.students?.[0]?.count || 0,
            trendPct: 0 // TODO: Calculate trend when historical data is available
          }));
        }

      } catch (error) {
        console.error('[Dashboard] Error fetching data:', error);
        // Return empty data structure on error - graceful degradation
      }

      return data;
    },
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false
  });
}

/**
 * Hook to fetch filter options (regions, programs, providers, subjects)
 */
export function useFilterOptions() {
  return useQuery({
    queryKey: ['dashboardFilterOptions'],
    queryFn: async () => {
      const options = {
        regions: [] as Array<{ id: string; label: string }>,
        programs: [] as Array<{ id: string; label: string }>,
        providers: [] as Array<{ id: string; label: string }>,
        subjects: [] as Array<{ id: string; label: string }>
      };

      try {
        // Fetch regions
        const { data: regions } = await supabase
          .from('edu_regions')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        options.regions = regions?.map(r => ({ id: r.id, label: r.name })) || [];

        // Fetch programs
        const { data: programs } = await supabase
          .from('edu_programs')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        options.programs = programs?.map(p => ({ id: p.id, label: p.name })) || [];

        // Fetch providers
        const { data: providers } = await supabase
          .from('edu_providers')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        options.providers = providers?.map(p => ({ id: p.id, label: p.name })) || [];

        // Fetch subjects
        const { data: subjects } = await supabase
          .from('edu_subjects')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        options.subjects = subjects?.map(s => ({ id: s.id, label: s.name })) || [];

      } catch (error) {
        console.error('[Dashboard] Error fetching filter options:', error);
      }

      return options;
    },
    staleTime: 300000 // 5 minutes
  });
}
