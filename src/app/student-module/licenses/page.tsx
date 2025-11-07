import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Key,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  BookOpen,
  Award,
  Sparkles,
  Info
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../contexts/UserContext';
import { EntityLicenseService } from '../../../services/entityLicenseService';
import { Button } from '../../../components/shared/Button';
import { ConfirmationDialog } from '../../../components/shared/ConfirmationDialog';
import { toast } from '../../../components/shared/Toast';

interface StudentLicense {
  id: string;
  license_id: string;
  status: string;
  assigned_at: string;
  activated_on?: string;
  valid_from_snapshot: string;
  valid_to_snapshot: string;
  expires_at: string;
  license: {
    data_structures: {
      edu_subjects: { name: string };
      programs: { name: string };
      providers: { name: string };
      regions: { name: string };
    };
  };
}

export default function StudentLicensesPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [selectedLicense, setSelectedLicense] = useState<StudentLicense | null>(null);
  const [showActivationDialog, setShowActivationDialog] = useState(false);

  const { data: studentId } = useQuery({
    queryKey: ['student-id', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error} = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      // Explicitly return null instead of undefined to prevent cache issues
      return data?.id ?? null;
    },
    enabled: !!user?.id
  });

  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ['student-licenses', studentId],
    queryFn: async () => {
      if (!studentId) return [];

      const { data, error } = await supabase
        .from('student_licenses')
        .select(`
          id,
          license_id,
          status,
          assigned_at,
          activated_on,
          valid_from_snapshot,
          valid_to_snapshot,
          expires_at,
          licenses!inner (
            data_structures!inner (
              edu_subjects!inner (name),
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
      return data as StudentLicense[];
    },
    enabled: !!studentId,
    staleTime: 30 * 1000
  });

  const activateMutation = useMutation({
    mutationFn: async (licenseId: string) => {
      return await EntityLicenseService.activateStudentLicense(licenseId, studentId);
    },
      onSuccess: (result) => {
        if (result.success) {
          toast.success('License activated successfully! You can now access the content.');
          queryClient.invalidateQueries(['student-licenses']);
          setShowActivationDialog(false);
          setSelectedLicense(null);
        } else {
          toast.error(result.error || result.message || 'Failed to activate license');
        }
      },
      onError: (error) => {
        console.error('Activation error:', error);
        toast.error('Failed to activate license. Please try again.');
      }
    }
  );

  const handleActivate = (license: StudentLicense) => {
    setSelectedLicense(license);
    setShowActivationDialog(true);
  };

  const confirmActivation = () => {
    if (selectedLicense) {
      activateMutation.mutate(selectedLicense.license_id);
    }
  };

  const getStatusBadge = (license: StudentLicense) => {
    const validTo = new Date(license.valid_to_snapshot);
    const validFrom = new Date(license.valid_from_snapshot);
    const now = new Date();
    const isExpired = validTo < now;
    const notYetValid = validFrom > now;
    const daysUntilExpiry = Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (isExpired) {
      return {
        color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
        icon: XCircle,
        text: 'Expired'
      };
    }

    if (notYetValid) {
      return {
        color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700',
        icon: Clock,
        text: 'Not Yet Valid'
      };
    }

    switch (license.status) {
      case 'ASSIGNED_PENDING_ACTIVATION':
        return {
          color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
          icon: Clock,
          text: `Pending Activation${daysUntilExpiry <= 30 ? ` (${daysUntilExpiry}d left)` : ''}`
        };
      case 'CONSUMED_ACTIVATED':
        return {
          color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
          icon: CheckCircle,
          text: daysUntilExpiry <= 30 ? `Active (${daysUntilExpiry}d left)` : 'Active'
        };
      default:
        return {
          color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700',
          icon: AlertTriangle,
          text: license.status
        };
    }
  };

  const pendingLicenses = licenses.filter(l => l.status === 'ASSIGNED_PENDING_ACTIVATION');
  const activeLicenses = licenses.filter(l => l.status === 'CONSUMED_ACTIVATED');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8CC63F] mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your licenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[#8CC63F]/20 to-[#7AB635]/20 rounded-full flex items-center justify-center">
            <Key className="w-8 h-8 text-[#8CC63F]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              My Licenses
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              View and activate your assigned learning licenses
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {pendingLicenses.length}
            </div>
            <div className="text-sm text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1 mt-1">
              <Clock className="w-4 h-4" />
              Pending Activation
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {activeLicenses.length}
            </div>
            <div className="text-sm text-green-700 dark:text-green-300 flex items-center justify-center gap-1 mt-1">
              <CheckCircle className="w-4 h-4" />
              Active Licenses
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {licenses.length}
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300 flex items-center justify-center gap-1 mt-1">
              <Award className="w-4 h-4" />
              Total Licenses
            </div>
          </div>
        </div>
      </div>

      {pendingLicenses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Pending Activation ({pendingLicenses.length})
            </h2>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-900 dark:text-amber-100">
                  Action Required: Activate Your Licenses
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  These licenses have been assigned to you but require explicit activation before you can access the content.
                  Once activated, the license cannot be deactivated or transferred.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingLicenses.map((license) => {
              const badge = getStatusBadge(license);
              const Icon = badge.icon;
              const validFrom = new Date(license.valid_from_snapshot);
              const validTo = new Date(license.valid_to_snapshot);
              const now = new Date();
              const canActivateNow = now >= validFrom && now <= validTo;

              return (
                <div
                  key={license.id}
                  className="bg-white dark:bg-gray-800 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {license.license.data_structures.edu_subjects.name}
                      </h3>
                    </div>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${badge.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {badge.text}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Program:</span>
                      <span>{license.license.data_structures.programs.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Provider:</span>
                      <span>{license.license.data_structures.providers.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">Valid:</span>
                      <span>{validFrom.toLocaleDateString()} - {validTo.toLocaleDateString()}</span>
                    </div>
                  </div>

                  {!canActivateNow && validFrom > now && (
                    <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 mb-3 text-xs text-gray-700 dark:text-gray-300">
                      <Info className="w-4 h-4 inline mr-1" />
                      This license can be activated starting from {validFrom.toLocaleDateString()}
                    </div>
                  )}

                  <Button
                    onClick={() => handleActivate(license)}
                    disabled={!canActivateNow}
                    leftIcon={<Sparkles className="w-4 h-4" />}
                    className="w-full"
                  >
                    {canActivateNow ? 'Activate License' : 'Not Yet Available'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeLicenses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Active Licenses ({activeLicenses.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeLicenses.map((license) => {
              const badge = getStatusBadge(license);
              const Icon = badge.icon;
              const validFrom = new Date(license.valid_from_snapshot);
              const validTo = new Date(license.valid_to_snapshot);
              const activatedOn = license.activated_on ? new Date(license.activated_on) : null;

              return (
                <div
                  key={license.id}
                  className="bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded-lg p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {license.license.data_structures.edu_subjects.name}
                      </h3>
                    </div>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${badge.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {badge.text}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Program:</span>
                      <span>{license.license.data_structures.programs.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Provider:</span>
                      <span>{license.license.data_structures.providers.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">Expires:</span>
                      <span>{validTo.toLocaleDateString()}</span>
                    </div>
                    {activatedOn && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">Activated:</span>
                        <span>{activatedOn.toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {licenses.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Key className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Licenses Assigned
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have any licenses assigned to you yet. Contact your administrator if you need access to learning materials.
          </p>
        </div>
      )}

      <ConfirmationDialog
        isOpen={showActivationDialog}
        title="Activate License"
        message={selectedLicense ? `Are you sure you want to activate the license for "${selectedLicense.license.data_structures.edu_subjects.name}"? Once activated, this license cannot be deactivated or transferred to another student.` : ''}
        confirmText="Activate License"
        cancelText="Cancel"
        confirmVariant="primary"
        onConfirm={confirmActivation}
        onCancel={() => {
          setShowActivationDialog(false);
          setSelectedLicense(null);
        }}
        loading={activateMutation.isLoading}
      />
    </div>
  );
}
