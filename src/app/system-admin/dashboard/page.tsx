'use client';

/**
 * System Admin Dashboard
 *
 * Modern, accessible, token-driven dashboard with live Supabase data.
 * All queries are read-only with graceful fallbacks.
 */

import React, { useMemo, useState } from 'react';
import {
  RefreshCw,
  Download,
  Building2,
  School,
  MapPin,
  Key,
  Users,
  GraduationCap,
  Clock,
  Activity,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { KPIStat } from '../../../components/shared/KPIStat';
import { TimeRangePicker, type TimeRange } from '../../../components/shared/TimeRangePicker';
import { EmptyState } from '../../../components/shared/EmptyState';
import { DataTable, type Column } from '../../../components/shared/DataTable';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/shared/Card';
import { Button } from '../../../components/shared/Button';
import { FilterPanel, FilterGroup, FilterRow } from '../../../components/shared/FilterPanel';
import { Badge, type BadgeProps } from '../../../components/shared/Badge';
import { Select } from '../../../components/shared/Select';
import { useSysAdminDashboard, useFilterOptions } from './hooks/useSysAdminDashboard';
import type { ActivityEvent, SchoolStats } from './hooks/types';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { cn } from '../../../lib/utils';

// Helper to get initial time range
function getInitialTimeRange(): TimeRange {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - 30);
  start.setHours(0, 0, 0, 0);

  return { start, end, preset: '30d' };
}

export default function SystemAdminDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>(getInitialTimeRange());
  const [regionId, setRegionId] = useState<string>('');
  const [programId, setProgramId] = useState<string>('');
  const [providerId, setProviderId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');

  const { data: dashboardData, isLoading, error, refetch } = useSysAdminDashboard({
    timeRange,
    regionId: regionId || undefined,
    programId: programId || undefined,
    providerId: providerId || undefined,
    subjectId: subjectId || undefined
  });

  const { data: filterOptions = { regions: [], programs: [], providers: [], subjects: [] }, isLoading: isLoadingFilters } = useFilterOptions();

  const activeFilterCount = useMemo(
    () => [regionId, programId, providerId, subjectId].filter(Boolean).length,
    [programId, providerId, regionId, subjectId]
  );

  // Convert filter options to Select component format
  const regionOptions = [
    { value: '', label: 'All Regions' },
    ...(filterOptions?.regions || []).map(r => ({ value: r.id, label: r.label }))
  ];

  const programOptions = [
    { value: '', label: 'All Programs' },
    ...(filterOptions?.programs || []).map(p => ({ value: p.id, label: p.label }))
  ];

  const providerOptions = [
    { value: '', label: 'All Providers' },
    ...(filterOptions?.providers || []).map(p => ({ value: p.id, label: p.label }))
  ];

  const subjectOptions = [
    { value: '', label: 'All Subjects' },
    ...(filterOptions?.subjects || []).map(s => ({ value: s.id, label: s.label }))
  ];

  const handleRefresh = () => {
    refetch();
  };

  const handleExportCSV = () => {
    if (!dashboardData) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Companies', dashboardData.kpis.totalCompanies],
      ['Total Schools', dashboardData.kpis.totalSchools],
      ['Total Branches', dashboardData.kpis.totalBranches],
      ['Active Licenses', dashboardData.kpis.activeLicenses],
      ['Licenses Expiring (30d)', dashboardData.kpis.expiringLicenses30d],
      ['Teachers', dashboardData.kpis.teachers],
      ['Students', dashboardData.kpis.students]
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearFilters = () => {
    setTimeRange(getInitialTimeRange());
    setRegionId('');
    setProgramId('');
    setProviderId('');
    setSubjectId('');
  };

  const actionBadgeVariants: Record<ActivityEvent['action'], BadgeProps['variant']> = {
    create: 'success',
    update: 'info',
    delete: 'danger',
    assign: 'primary',
    renew: 'primary',
    extend: 'info',
    expand: 'info'
  };

  // Activity columns
  const activityColumns: Column<ActivityEvent>[] = [
    {
      id: 'time',
      header: 'Time',
      accessorFn: (row) => new Date(row.time).toLocaleString(),
      enableSorting: true
    },
    {
      id: 'actorName',
      header: 'Actor',
      accessorKey: 'actorName',
      enableSorting: true
    },
    {
      id: 'action',
      header: 'Action',
      accessorFn: (row) => (
        <Badge
          size="sm"
          variant={actionBadgeVariants[row.action] ?? 'default'}
          className="capitalize"
        >
          {row.action}
        </Badge>
      )
    },
    {
      id: 'target',
      header: 'Target',
      accessorKey: 'target'
    },
    {
      id: 'scope',
      header: 'Scope',
      accessorKey: 'scope'
    }
  ];

  // School stats columns
  const schoolColumns: Column<SchoolStats>[] = [
    {
      id: 'schoolName',
      header: 'School',
      accessorKey: 'schoolName',
      enableSorting: true
    },
    {
      id: 'companyName',
      header: 'Company',
      accessorKey: 'companyName',
      enableSorting: true
    },
    {
      id: 'regionProgram',
      header: 'Region/Program',
      accessorKey: 'regionProgram'
    },
    {
      id: 'activeStudents',
      header: 'Active Students',
      accessorFn: (row) => row.activeStudents.toLocaleString(),
      enableSorting: true
    },
    {
      id: 'trend',
      header: 'Trend',
      accessorFn: (row) => {
        if (row.trendPct === 0) return '-';
        const direction = row.trendPct > 0 ? 'up' : row.trendPct < 0 ? 'down' : 'flat';
        return (
          <span
            className={cn(
              'text-sm font-medium',
              direction === 'up' && 'text-emerald-600 dark:text-emerald-400',
              direction === 'down' && 'text-red-600 dark:text-red-400',
              direction === 'flat' && 'text-theme-muted'
            )}
          >
            {row.trendPct > 0 ? '+' : ''}{row.trendPct.toFixed(1)}%
          </span>
        );
      }
    }
  ];

  const dashboardCardClass = 'bg-card border border-filter shadow-theme-elevated transition-theme hover:shadow-theme-popover';

  return (
    <div className="min-h-screen bg-theme-page text-theme-primary">
      <div className="mx-auto max-w-7xl px-20 py-20">
        <PageHeader
          title="System Admin Dashboard"
          subtitle="Monitor licensing health, user growth, and platform operations using the refreshed GGK design system."
          actions={(
            <div className="flex flex-wrap items-center gap-12">
              <Button
                variant="secondary"
                onClick={handleRefresh}
                disabled={isLoading}
                loading={isLoading}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Refresh Data
              </Button>
              <Button
                onClick={handleExportCSV}
                disabled={!dashboardData}
                leftIcon={<Download className="h-4 w-4" />}
              >
                Export CSV
              </Button>
            </div>
          )}
        />

        <div className="space-y-24">
          <FilterPanel
            title="Dashboard Filters"
            activeFilterCount={activeFilterCount}
            onClear={activeFilterCount > 0 ? handleClearFilters : undefined}
          >
            <TimeRangePicker value={timeRange} onChange={setTimeRange} className="max-w-xl" />

            <FilterRow>
              <FilterGroup label="Region">
                <Select
                  id="region-filter"
                  value={regionId}
                  onChange={setRegionId}
                  options={regionOptions}
                  placeholder="All Regions"
                  searchable={true}
                  disabled={isLoadingFilters}
                />
              </FilterGroup>

              <FilterGroup label="Program">
                <Select
                  id="program-filter"
                  value={programId}
                  onChange={setProgramId}
                  options={programOptions}
                  placeholder="All Programs"
                  searchable={true}
                  disabled={isLoadingFilters}
                />
              </FilterGroup>

              <FilterGroup label="Provider">
                <Select
                  id="provider-filter"
                  value={providerId}
                  onChange={setProviderId}
                  options={providerOptions}
                  placeholder="All Providers"
                  searchable={true}
                  disabled={isLoadingFilters}
                />
              </FilterGroup>

              <FilterGroup label="Subject">
                <Select
                  id="subject-filter"
                  value={subjectId}
                  onChange={setSubjectId}
                  options={subjectOptions}
                  placeholder="All Subjects"
                  searchable={true}
                  disabled={isLoadingFilters}
                />
              </FilterGroup>
            </FilterRow>
          </FilterPanel>

          {/* KPI Grid - Unified sizes with light colors */}
          <div className="grid grid-cols-1 gap-20 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-ggk-xl p-20 border border-blue-100 dark:border-blue-800">
              <KPIStat
                label="Total Companies"
                value={dashboardData?.kpis.totalCompanies || 0}
                caption="Active companies"
                icon={Building2}
                iconColor="from-blue-500 to-blue-600"
                loading={isLoading}
                animationDelay={0}
              />
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-ggk-xl p-20 border border-purple-100 dark:border-purple-800">
              <KPIStat
                label="Total Schools"
                value={dashboardData?.kpis.totalSchools || 0}
                caption="Active schools"
                icon={School}
                iconColor="from-purple-500 to-purple-600"
                loading={isLoading}
                animationDelay={100}
              />
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-ggk-xl p-20 border border-orange-100 dark:border-orange-800">
              <KPIStat
                label="Total Branches"
                value={dashboardData?.kpis.totalBranches || 0}
                caption="Active branches"
                icon={MapPin}
                iconColor="from-orange-500 to-orange-600"
                loading={isLoading}
                animationDelay={200}
              />
            </div>
            <div className="bg-ggk-success-50 dark:bg-ggk-success-900/20 rounded-ggk-xl p-20 border border-ggk-success-100 dark:border-ggk-success-800">
              <KPIStat
                label="Active Licenses"
                value={dashboardData?.kpis.activeLicenses || 0}
                caption="Current period"
                icon={Key}
                iconColor="from-[#8CC63F] to-[#7AB635]"
                trend={dashboardData?.kpis.trends.activeLicenses}
                loading={isLoading}
                animationDelay={300}
              />
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-ggk-xl p-20 border border-amber-100 dark:border-amber-800">
              <KPIStat
                label="Expiring Soon"
                value={dashboardData?.kpis.expiringLicenses30d || 0}
                caption="Within 30 days"
                icon={Clock}
                iconColor="from-amber-500 to-amber-600"
                loading={isLoading}
                animationDelay={400}
              />
            </div>
            <div className="bg-teal-50 dark:bg-teal-900/20 rounded-ggk-xl p-20 border border-teal-100 dark:border-teal-800">
              <KPIStat
                label="Teachers"
                value={dashboardData?.kpis.teachers || 0}
                caption="Active teachers"
                icon={Users}
                iconColor="from-teal-500 to-teal-600"
                trend={dashboardData?.kpis.trends.teachers}
                loading={isLoading}
                animationDelay={500}
              />
            </div>
            <div className="bg-pink-50 dark:bg-pink-900/20 rounded-ggk-xl p-20 border border-pink-100 dark:border-pink-800">
              <KPIStat
                label="Students"
                value={dashboardData?.kpis.students || 0}
                caption="Active students"
                icon={GraduationCap}
                iconColor="from-pink-500 to-pink-600"
                trend={dashboardData?.kpis.trends.students}
                loading={isLoading}
                animationDelay={600}
              />
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-20 lg:grid-cols-2">
            <Card className={cn(dashboardCardClass)} padding="lg">
              <CardHeader className="flex items-start gap-12" accent={false}>
                <div className="flex items-start gap-12">
                  <span className="flex h-12 w-12 items-center justify-center rounded-ggk-xl bg-ggk-primary-100 text-ggk-primary-700">
                    <Key className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle className="text-lg">Active Licenses by Subject</CardTitle>
                    <CardDescription>Top 10 subjects</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-0">
                {error ? (
                  <EmptyState
                    icon={<AlertCircle className="h-10 w-10 text-amber-500" />}
                    title="Unable to load chart data"
                    description="Please try refreshing the dashboard."
                    action={{ label: 'Retry', onClick: handleRefresh }}
                  />
                ) : isLoading ? (
                  <div className="flex h-[320px] items-center justify-center text-theme-muted animate-pulse">
                    Loading chart...
                  </div>
                ) : dashboardData?.charts.licensesBySubject.length === 0 ? (
                  <EmptyState
                    icon={<Key className="h-12 w-12 text-ggk-primary-500" />}
                    title="No License Data"
                    description="No active licenses found for the selected period."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={dashboardData?.charts.licensesBySubject}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.4)" />
                      <XAxis
                        dataKey="subject"
                        tick={{ fill: 'rgb(107,114,128)', fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis tick={{ fill: 'rgb(107,114,128)', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgb(var(--color-card-bg))',
                          border: '1px solid var(--color-border)',
                          borderRadius: '12px',
                          boxShadow: 'var(--shadow-popover)'
                        }}
                      />
                      <Bar dataKey="active" fill="#8CC63F" radius={[12, 12, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className={cn(dashboardCardClass)} padding="lg">
              <CardHeader className="flex items-start gap-12" accent={false}>
                <div className="flex items-start gap-12">
                  <span className="flex h-12 w-12 items-center justify-center rounded-ggk-xl bg-ggk-primary-100 text-ggk-primary-700">
                    <TrendingUp className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle className="text-lg">New Users by Role</CardTitle>
                    <CardDescription>Daily breakdown</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-0">
                {error ? (
                  <EmptyState
                    icon={<AlertCircle className="h-10 w-10 text-amber-500" />}
                    title="Unable to load chart data"
                    description="Please try refreshing the dashboard."
                    action={{ label: 'Retry', onClick: handleRefresh }}
                  />
                ) : isLoading ? (
                  <div className="flex h-[320px] items-center justify-center text-theme-muted animate-pulse">
                    Loading chart...
                  </div>
                ) : dashboardData?.charts.newUsersByRole.length === 0 ? (
                  <EmptyState
                    icon={<Users className="h-12 w-12 text-ggk-primary-500" />}
                    title="No User Data"
                    description="No new users registered during the selected period."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={dashboardData?.charts.newUsersByRole}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.4)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: 'rgb(107,114,128)', fontSize: 12 }}
                        tickFormatter={(value) =>
                          new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        }
                      />
                      <YAxis tick={{ fill: 'rgb(107,114,128)', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgb(var(--color-card-bg))',
                          border: '1px solid var(--color-border)',
                          borderRadius: '12px',
                          boxShadow: 'var(--shadow-popover)'
                        }}
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="teachers" stroke="#8CC63F" strokeWidth={2} dot={{ fill: '#8CC63F' }} />
                      <Line type="monotone" dataKey="students" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                      <Line type="monotone" dataKey="admins" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tables Row */}
          <div className="grid grid-cols-1 gap-20 lg:grid-cols-2">
            <Card className={cn(dashboardCardClass)} padding="lg">
              <CardHeader className="flex items-start gap-12" accent={false}>
                <div className="flex items-start gap-12">
                  <span className="flex h-12 w-12 items-center justify-center rounded-ggk-xl bg-ggk-primary-100 text-ggk-primary-700">
                    <Activity className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                    <CardDescription>Latest 15 events</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-0">
                {error ? (
                  <EmptyState
                    icon={<AlertCircle className="h-10 w-10 text-amber-500" />}
                    title="Unable to load activity data"
                    description="Please try refreshing the dashboard."
                    action={{ label: 'Retry', onClick: handleRefresh }}
                  />
                ) : isLoading ? (
                  <div className="space-y-8">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 w-full animate-pulse rounded-ggk-lg bg-theme-subtle" />
                    ))}
                  </div>
                ) : dashboardData?.recentActivity.length === 0 ? (
                  <EmptyState
                    icon={<Activity className="h-12 w-12 text-ggk-primary-500" />}
                    title="No Activity"
                    description="No recent activity found for the selected period."
                  />
                ) : (
                  <DataTable
                    data={dashboardData?.recentActivity || []}
                    columns={activityColumns}
                    keyField="id"
                    emptyMessage="No activity found"
                    className="max-h-96 overflow-auto border border-filter shadow-none"
                  />
                )}
              </CardContent>
            </Card>

            <Card className={cn(dashboardCardClass)} padding="lg">
              <CardHeader className="flex items-start gap-12" accent={false}>
                <div className="flex items-start gap-12">
                  <span className="flex h-12 w-12 items-center justify-center rounded-ggk-xl bg-ggk-primary-100 text-ggk-primary-700">
                    <School className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle className="text-lg">Top Schools by Active Students</CardTitle>
                    <CardDescription>Filtered by time range</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-0">
                {error ? (
                  <EmptyState
                    icon={<AlertCircle className="h-10 w-10 text-amber-500" />}
                    title="Unable to load school data"
                    description="Please try refreshing the dashboard."
                    action={{ label: 'Retry', onClick: handleRefresh }}
                  />
                ) : isLoading ? (
                  <div className="space-y-8">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 w-full animate-pulse rounded-ggk-lg bg-theme-subtle" />
                    ))}
                  </div>
                ) : dashboardData?.topSchools.length === 0 ? (
                  <EmptyState
                    icon={<School className="h-12 w-12 text-ggk-primary-500" />}
                    title="No School Data"
                    description="No schools found matching the selected filters."
                    action={{
                      label: 'View All Schools',
                      href: '/app/system-admin/tenants'
                    }}
                  />
                ) : (
                  <DataTable
                    data={dashboardData?.topSchools || []}
                    columns={schoolColumns}
                    keyField="id"
                    emptyMessage="No schools found"
                    className="max-h-96 overflow-auto border border-filter shadow-none"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
