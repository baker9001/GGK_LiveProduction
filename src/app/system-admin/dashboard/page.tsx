'use client';

/**
 * System Admin Dashboard
 *
 * Modern, accessible, token-driven dashboard with live Supabase data.
 * All queries are read-only with graceful fallbacks.
 */

import React, { useState } from 'react';
import { RefreshCw, Download, Building2, School, MapPin, Key, Users, GraduationCap, Clock, Activity, TrendingUp, Filter } from 'lucide-react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { DashboardCard } from '../../../components/shared/DashboardCard';
import { KPIStat } from '../../../components/shared/KPIStat';
import { TimeRangePicker, type TimeRange } from '../../../components/shared/TimeRangePicker';
import { EmptyState } from '../../../components/shared/EmptyState';
import { DataTable, type Column } from '../../../components/shared/DataTable';
import { useSysAdminDashboard, useFilterOptions } from './hooks/useSysAdminDashboard';
import type { ActivityEvent, SchoolStats } from './hooks/types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

  const { data: filterOptions } = useFilterOptions();

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
        <span className={cn(
          'px-2 py-1 text-xs font-medium rounded-md',
          row.action === 'create' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          row.action === 'update' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          row.action === 'delete' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          (row.action === 'assign' || row.action === 'renew') && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
        )}>
          {row.action}
        </span>
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
          <span className={cn(
            'text-sm font-medium',
            direction === 'up' && 'text-green-600 dark:text-green-400',
            direction === 'down' && 'text-red-600 dark:text-red-400'
          )}>
            {row.trendPct > 0 ? '+' : ''}{row.trendPct.toFixed(1)}%
          </span>
        );
      }
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title="System Admin Dashboard"
        subtitle="Overview & quick actions"
      />

      <div className="px-6 pb-6 space-y-6">
        {/* Filter Row */}
        <DashboardCard
          icon={Filter}
          className="bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-800/90 dark:to-gray-800/70 backdrop-blur-2xl border-white/60 dark:border-gray-700/60"
        >
          <div className="space-y-4">
            <TimeRangePicker value={timeRange} onChange={setTimeRange} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Region Filter */}
              <div>
                <label htmlFor="region-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Region
                </label>
                <select
                  id="region-filter"
                  value={regionId}
                  onChange={(e) => setRegionId(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600',
                    'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
                    'focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent',
                    'transition-all duration-200'
                  )}
                >
                  <option value="">All Regions</option>
                  {filterOptions?.regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Program Filter */}
              <div>
                <label htmlFor="program-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Program
                </label>
                <select
                  id="program-filter"
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600',
                    'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
                    'focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent',
                    'transition-all duration-200'
                  )}
                >
                  <option value="">All Programs</option>
                  {filterOptions?.programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Provider Filter */}
              <div>
                <label htmlFor="provider-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Provider
                </label>
                <select
                  id="provider-filter"
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600',
                    'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
                    'focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent',
                    'transition-all duration-200'
                  )}
                >
                  <option value="">All Providers</option>
                  {filterOptions?.providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Filter */}
              <div>
                <label htmlFor="subject-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject
                </label>
                <select
                  id="subject-filter"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600',
                    'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
                    'focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent',
                    'transition-all duration-200'
                  )}
                >
                  <option value="">All Subjects</option>
                  {filterOptions?.subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg',
                  'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300',
                  'border border-gray-300 dark:border-gray-600',
                  'hover:bg-gray-50 dark:hover:bg-gray-700',
                  'focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:ring-offset-1',
                  'transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                Refresh
              </button>

              <button
                onClick={handleExportCSV}
                disabled={!dashboardData}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg',
                  'bg-gradient-to-r from-[#8CC63F] to-[#7AB635] text-white',
                  'hover:shadow-md',
                  'focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:ring-offset-1',
                  'transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </DashboardCard>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPIStat
            label="Total Companies"
            value={dashboardData?.kpis.totalCompanies || 0}
            caption="Active companies"
            icon={Building2}
            iconColor="from-blue-500 to-blue-600"
            loading={isLoading}
            animationDelay={0}
          />
          <KPIStat
            label="Total Schools"
            value={dashboardData?.kpis.totalSchools || 0}
            caption="Active schools"
            icon={School}
            iconColor="from-purple-500 to-purple-600"
            loading={isLoading}
            animationDelay={100}
          />
          <KPIStat
            label="Total Branches"
            value={dashboardData?.kpis.totalBranches || 0}
            caption="Active branches"
            icon={MapPin}
            iconColor="from-orange-500 to-orange-600"
            loading={isLoading}
            animationDelay={200}
          />
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
          <KPIStat
            label="Expiring Soon"
            value={dashboardData?.kpis.expiringLicenses30d || 0}
            caption="Within 30 days"
            icon={Clock}
            iconColor="from-amber-500 to-amber-600"
            loading={isLoading}
            animationDelay={400}
          />
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

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Licenses by Subject */}
          <DashboardCard
            title="Active Licenses by Subject"
            subtitle="Top 10 subjects"
            icon={Key}
            loading={isLoading}
            error={error ? 'Failed to load chart data' : undefined}
            onRetry={handleRefresh}
            animationDelay={700}
          >
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Loading chart...</div>
              </div>
            ) : dashboardData?.charts.licensesBySubject.length === 0 ? (
              <EmptyState
                icon={<Key className="h-12 w-12" />}
                title="No License Data"
                description="No active licenses found for the selected period."
              />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={dashboardData?.charts.licensesBySubject}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="subject"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="active" fill="#8CC63F" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </DashboardCard>

          {/* New Users by Role */}
          <DashboardCard
            title="New Users by Role"
            subtitle="Daily breakdown"
            icon={TrendingUp}
            loading={isLoading}
            error={error ? 'Failed to load chart data' : undefined}
            onRetry={handleRefresh}
            animationDelay={800}
          >
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Loading chart...</div>
              </div>
            ) : dashboardData?.charts.newUsersByRole.length === 0 ? (
              <EmptyState
                icon={<Users className="h-12 w-12" />}
                title="No User Data"
                description="No new users registered during the selected period."
              />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={dashboardData?.charts.newUsersByRole}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
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
          </DashboardCard>
        </div>

        {/* Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <DashboardCard
            title="Recent Activity"
            subtitle="Latest 15 events"
            icon={Activity}
            loading={isLoading}
            error={error ? 'Failed to load activity data' : undefined}
            onRetry={handleRefresh}
            animationDelay={900}
          >
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse h-12 bg-gray-200 dark:bg-gray-700 rounded" />
                ))}
              </div>
            ) : dashboardData?.recentActivity.length === 0 ? (
              <EmptyState
                icon={<Activity className="h-12 w-12" />}
                title="No Activity"
                description="No recent activity found for the selected period."
              />
            ) : (
              <DataTable
                data={dashboardData?.recentActivity || []}
                columns={activityColumns}
                keyField="id"
                emptyMessage="No activity found"
                className="max-h-96 overflow-auto"
              />
            )}
          </DashboardCard>

          {/* Top Schools */}
          <DashboardCard
            title="Top Schools by Active Students"
            subtitle="Filtered by time range"
            icon={School}
            loading={isLoading}
            error={error ? 'Failed to load school data' : undefined}
            onRetry={handleRefresh}
            animationDelay={1000}
          >
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse h-12 bg-gray-200 dark:bg-gray-700 rounded" />
                ))}
              </div>
            ) : dashboardData?.topSchools.length === 0 ? (
              <EmptyState
                icon={<School className="h-12 w-12" />}
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
                className="max-h-96 overflow-auto"
              />
            )}
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
