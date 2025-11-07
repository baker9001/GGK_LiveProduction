import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, BookOpen, CalendarCheck, Route } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../contexts/UserContext';
import { getPublicUrl } from '../../../lib/storageHelpers';

interface StudentLicenseSubjectRow {
  id: string;
  assigned_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  licenses: {
    id: string;
    status: string;
    data_structures: {
      id: string;
      edu_subjects: {
        id: string;
        name: string;
        logo_url: string | null;
      } | null;
      programs: { name: string | null } | null;
      providers: { name: string | null } | null;
      regions: { name: string | null } | null;
    } | null;
  } | null;
}

interface LearningPathSubjectCard {
  subjectId: string;
  subjectName: string;
  programName: string;
  providerName: string;
  regionName: string;
  logoUrl: string | null;
  status: 'active' | 'pending' | 'expired';
  licenseStatus: string;
  assignedAt?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
}

const STATUS_PRIORITY: Record<string, number> = {
  CONSUMED_ACTIVATED: 3,
  ASSIGNED_PENDING_ACTIVATION: 2,
  REVOKED: 1
};

function resolveLicenseStatus(row: StudentLicenseSubjectRow): {
  status: 'active' | 'pending' | 'expired';
  priority: number;
} {
  const now = new Date();
  const licenseStatus = row.licenses?.status;

  // Check if student license is inactive
  if (!row.is_active) {
    return { status: 'expired', priority: 0 };
  }

  // Check expiration date
  if (row.expires_at) {
    const parsedExpiry = new Date(row.expires_at);
    if (!Number.isNaN(parsedExpiry.getTime()) && parsedExpiry < now) {
      return { status: 'expired', priority: 0 };
    }
  }

  // Determine status based on license status
  // Handle both uppercase with underscores AND lowercase status values
  const normalizedStatus = licenseStatus?.toLowerCase();
  switch (normalizedStatus) {
    case 'consumed_activated':
    case 'active':
      return { status: 'active', priority: STATUS_PRIORITY.CONSUMED_ACTIVATED };
    case 'assigned_pending_activation':
    case 'pending':
      return { status: 'pending', priority: STATUS_PRIORITY.ASSIGNED_PENDING_ACTIVATION };
    default:
      return { status: 'expired', priority: STATUS_PRIORITY.REVOKED };
  }
}

function LearningPathwayHeader() {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#8CC63F]/20 to-[#7AB635]/20 flex items-center justify-center">
            <Route className="w-7 h-7 text-[#7AB635]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
              Your Learning Pathway
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Explore the subjects that have been assigned to you. Activate your licenses to access all available content.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2">
          <CalendarCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-200">
            Assignments update instantly as licenses are activated
          </span>
        </div>
      </div>
    </div>
  );
}

function SubjectHeaderImage({ logoUrl, subjectName }: { logoUrl: string | null; subjectName: string }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${subjectName} logo`}
        className="w-full aspect-square object-cover"
      />
    );
  }

  const initials = subjectName
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-full aspect-square bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 text-emerald-700 dark:text-emerald-200 flex items-center justify-center">
      <div className="text-6xl font-bold">
        {initials || <BookOpen className="h-20 w-20" />}
      </div>
    </div>
  );
}

function SubjectStatusBadge({ status }: { status: 'active' | 'pending' | 'expired' }) {
  const config = {
    active: {
      label: 'Active',
      icon: '✓',
      className: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30'
    },
    pending: {
      label: 'Activate Now',
      icon: '⚡',
      className: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30 animate-pulse'
    },
    expired: {
      label: 'Expired',
      icon: '✕',
      className: 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30'
    }
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm ${config.className}`}>
      <span className="text-sm">{config.icon}</span>
      {config.label}
    </span>
  );
}

function formatDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default function LearningPathPage() {
  const { user } = useUser();
  const navigate = useNavigate();

  const { data: studentId, isLoading: isLoadingStudent, error: studentError } = useQuery({
    queryKey: ['student-id', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[LearningPathway] Error fetching student:', error);
        throw error;
      }

      // Explicitly return null instead of undefined to prevent cache issues
      return data?.id ?? null;
    },
    enabled: !!user?.id,
    retry: 1
  });

  const {
    data: subjects = [],
    isLoading: isLoadingSubjects,
    error: subjectsError
  } = useQuery({
    queryKey: ['student-learning-path-subjects', studentId],
    queryFn: async () => {
      if (!studentId) return [] as LearningPathSubjectCard[];

      const { data, error } = await supabase
        .from('student_licenses')
        .select(`
          id,
          assigned_at,
          expires_at,
          is_active,
          licenses!inner (
            id,
            status,
            data_structures!inner (
              id,
              edu_subjects!inner (id, name, logo_url),
              programs!inner (name),
              providers!inner (name),
              regions!inner (name)
            )
          )
        `)
        .eq('student_id', studentId)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      const subjectMap = new Map<string, LearningPathSubjectCard & { priority: number }>();

      (data as StudentLicenseSubjectRow[]).forEach(row => {
        const dataStructure = row.licenses?.data_structures;
        const subject = dataStructure?.edu_subjects;
        if (!dataStructure || !subject) return;

        const key = subject.id;
        const { status, priority } = resolveLicenseStatus(row);
        const existing = subjectMap.get(key);

        const normalized: LearningPathSubjectCard & { priority: number } = {
          subjectId: subject.id,
          subjectName: subject.name,
          programName: dataStructure.programs?.name || 'Program not specified',
          providerName: dataStructure.providers?.name || 'Provider not specified',
          regionName: dataStructure.regions?.name || 'Region not specified',
          logoUrl: getPublicUrl('subject-logos', subject.logo_url),
          status,
          licenseStatus: row.licenses?.status || 'UNKNOWN',
          assignedAt: row.assigned_at,
          validFrom: row.assigned_at,
          validTo: row.expires_at,
          priority
        };

        if (!existing || priority > existing.priority) {
          subjectMap.set(key, normalized);
        }
      });

      return Array.from(subjectMap.values())
        .sort((a, b) => a.subjectName.localeCompare(b.subjectName))
        .map(({ priority, ...subject }) => subject);
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000
  });

  React.useEffect(() => {
    if (subjectsError) {
      // Surface Supabase errors in the console to aid future debugging (e.g. RLS or schema issues)
      console.error('Failed to fetch student learning pathway subjects', subjectsError);
    }
  }, [subjectsError]);

  // Invalidate student ID query when user changes to prevent stale cache
  React.useEffect(() => {
    return () => {
      // This cleanup runs when user context changes
      // Note: React Query automatically handles this with the query key dependency
    };
  }, [user?.id]);

  const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'string' && error.trim()) {
      return error;
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    return 'An unexpected error occurred. Please try again later.';
  };

  const isLoading = isLoadingStudent || isLoadingSubjects;

  return (
    <div className="p-6">
      <LearningPathwayHeader />

      {/* Show error if student record not found */}
      {!isLoadingStudent && studentError && (
        <div className="border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-1" />
          <div>
            <p className="font-semibold">Unable to load student information</p>
            <p className="text-sm opacity-90">
              {getErrorMessage(studentError)}
            </p>
          </div>
        </div>
      )}

      {/* Show message if student record doesn't exist */}
      {!isLoadingStudent && !studentError && !studentId && (
        <div className="border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-1" />
          <div>
            <p className="font-semibold">Student profile not found</p>
            <p className="text-sm opacity-90">
              Your student profile has not been created yet. Please contact your administrator.
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`loading-card-${index}`}
              className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="h-14 w-14 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && subjectsError && (
        <div className="border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-1" />
          <div>
            <p className="font-semibold">Unable to load your learning pathway</p>
            <p className="text-sm opacity-90">
              {getErrorMessage(subjectsError)}
            </p>
          </div>
        </div>
      )}

      {!isLoading && !subjectsError && subjects.length === 0 && (
        <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center bg-white dark:bg-gray-800">
          <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">No subjects assigned yet</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Your assigned subjects will appear here as soon as your administrator issues learning licenses to your account. Check back later or contact your school administrator if you believe this is a mistake.
          </p>
        </div>
      )}

      {!isLoading && !subjectsError && subjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {subjects.map(subject => {
            const validFrom = formatDate(subject.validFrom);
            const validTo = formatDate(subject.validTo);

            const handleCardClick = () => {
              // Only navigate if license is active
              if (subject.status === 'active') {
                navigate(`/app/student-module/pathways/materials/${subject.subjectId}`, {
                  state: {
                    subjectName: subject.subjectName,
                    subjectLogo: subject.logoUrl
                  }
                });
              }
            };

            return (
              <div
                key={subject.subjectId}
                onClick={handleCardClick}
                className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100 dark:border-gray-700/50 hover:border-[#8CC63F]/30 hover:-translate-y-2"
              >
                {/* Gradient Accent Bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00BCD4] via-[#8CC63F] to-[#FF6B6B] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Header Image with Overlay */}
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <SubjectHeaderImage logoUrl={subject.logoUrl} subjectName={subject.subjectName} />

                  {/* Floating Status Badge */}
                  <div className="absolute top-3 right-3 z-20">
                    <SubjectStatusBadge status={subject.status} />
                  </div>

                  {/* Subject Title Overlay on Hover */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 z-20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="text-lg font-bold text-white drop-shadow-lg">
                      {subject.subjectName}
                    </h3>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6">
                  {/* Title (visible when not hovering) */}
                  <div className="group-hover:opacity-0 transition-opacity duration-300">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 truncate">
                      {subject.subjectName}
                    </h3>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-1 w-12 bg-gradient-to-r from-[#8CC63F] to-[#00BCD4] rounded-full" />
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        {subject.programName}
                      </p>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="space-y-3.5">
                    {/* Provider */}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-100/50 dark:border-blue-800/30">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00BCD4] to-[#0097A7] flex items-center justify-center flex-shrink-0 shadow-sm">
                        <BookOpen className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5">Provider</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{subject.providerName}</p>
                      </div>
                    </div>

                    {/* Region */}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100/50 dark:border-emerald-800/30">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8CC63F] to-[#7AB635] flex items-center justify-center flex-shrink-0 shadow-sm">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-0.5">Region</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{subject.regionName}</p>
                      </div>
                    </div>

                    {/* License Period */}
                    {(validFrom || validTo) && (
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-100/50 dark:border-orange-800/30">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B6B] to-[#EE5A52] flex items-center justify-center flex-shrink-0 shadow-sm">
                          <CalendarCheck className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-0.5">License</p>
                          <p className="text-xs font-semibold text-gray-900 dark:text-white leading-relaxed">
                            {validFrom && <span className="block">{validFrom}</span>}
                            {validTo && <span className="block text-gray-600 dark:text-gray-300">Until {validTo}</span>}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Hint on Hover */}
                  <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center justify-center gap-2 text-[#8CC63F] text-sm font-semibold">
                      <span>Start Learning</span>
                      <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
