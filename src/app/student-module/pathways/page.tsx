import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, BookOpen, CalendarCheck, Route } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../contexts/UserContext';
import { getPublicUrl } from '../../../lib/storageHelpers';

interface StudentLicenseSubjectRow {
  id: string;
  status: string;
  assigned_at: string | null;
  valid_from_snapshot: string | null;
  valid_to_snapshot: string | null;
  expires_at: string | null;
  licenses: {
    id: string;
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
  const validTo = row.valid_to_snapshot || row.expires_at;
  const validFrom = row.valid_from_snapshot;

  if (validTo) {
    const parsedValidTo = new Date(validTo);
    if (!Number.isNaN(parsedValidTo.getTime()) && parsedValidTo < now) {
      return { status: 'expired', priority: 0 };
    }
  }

  if (validFrom) {
    const parsedValidFrom = new Date(validFrom);
    if (!Number.isNaN(parsedValidFrom.getTime()) && parsedValidFrom > now) {
      return { status: 'pending', priority: 1 };
    }
  }

  switch (row.status) {
    case 'CONSUMED_ACTIVATED':
      return { status: 'active', priority: STATUS_PRIORITY.CONSUMED_ACTIVATED };
    case 'ASSIGNED_PENDING_ACTIVATION':
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

function SubjectLogo({ logoUrl, subjectName }: { logoUrl: string | null; subjectName: string }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${subjectName} logo`}
        className="h-14 w-14 rounded-full object-cover border border-gray-200 dark:border-gray-700"
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
    <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200 flex items-center justify-center text-lg font-semibold border border-emerald-200 dark:border-emerald-800">
      {initials || <BookOpen className="h-6 w-6" />}
    </div>
  );
}

function SubjectStatusBadge({ status }: { status: 'active' | 'pending' | 'expired' }) {
  const config = {
    active: {
      label: 'Active',
      className: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
    },
    pending: {
      label: 'Activation Required',
      className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-800'
    },
    expired: {
      label: 'Expired',
      className: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-200 border-rose-200 dark:border-rose-800'
    }
  }[status];

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.className}`}>
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

  const { data: studentId, isLoading: isLoadingStudent } = useQuery(
    ['student-id', user?.id],
    async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data?.id as string | null;
    },
    { enabled: !!user?.id }
  );

  const {
    data: subjects = [],
    isLoading: isLoadingSubjects,
    error: subjectsError
  } = useQuery(
    ['student-learning-path-subjects', studentId],
    async () => {
      if (!studentId) return [] as LearningPathSubjectCard[];

      const { data, error } = await supabase
        .from('student_licenses')
        .select(`
          id,
          status,
          assigned_at,
          valid_from_snapshot,
          valid_to_snapshot,
          expires_at,
          licenses!inner (
            id,
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
        .in('status', ['ASSIGNED_PENDING_ACTIVATION', 'CONSUMED_ACTIVATED'])
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
          licenseStatus: row.status,
          assignedAt: row.assigned_at,
          validFrom: row.valid_from_snapshot || row.assigned_at,
          validTo: row.valid_to_snapshot || row.expires_at,
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
    {
      enabled: !!studentId,
      staleTime: 5 * 60 * 1000
    }
  );

  React.useEffect(() => {
    if (subjectsError) {
      // Surface Supabase errors in the console to aid future debugging (e.g. RLS or schema issues)
      console.error('Failed to fetch student learning pathway subjects', subjectsError);
    }
  }, [subjectsError]);

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {subjects.map(subject => {
            const validFrom = formatDate(subject.validFrom);
            const validTo = formatDate(subject.validTo);

            return (
              <div
                key={subject.subjectId}
                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4 mb-4">
                  <SubjectLogo logoUrl={subject.logoUrl} subjectName={subject.subjectName} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {subject.subjectName}
                      </h3>
                      <SubjectStatusBadge status={subject.status} />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {subject.programName}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700 dark:text-gray-200">Provider</span>
                    <span>{subject.providerName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700 dark:text-gray-200">Region</span>
                    <span>{subject.regionName}</span>
                  </div>
                  {(validFrom || validTo) && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700 dark:text-gray-200">License</span>
                      <span>
                        {validFrom ? `From ${validFrom}` : 'Available'}
                        {validTo ? ` • Until ${validTo}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
