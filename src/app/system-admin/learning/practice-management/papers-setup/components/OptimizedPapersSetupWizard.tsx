/**
 * OptimizedPapersSetupWizard Component
 * Optimized wrapper for the papers setup wizard with performance improvements
 * Uses extracted hooks and memoization for better performance
 */

import React, { useState, useCallback, useMemo, Suspense, lazy, useEffect } from 'react';
import { FileText, Upload, Database, CheckCircle } from 'lucide-react';
import { toast } from '../../../../../../components/shared/Toast';
import { ProgressBar } from '../../../../../../components/shared/ProgressBar';
import { DataTableSkeleton } from '../../../../../../components/shared/DataTableSkeleton';
import { PapersSetupErrorBoundary } from './PapersSetupErrorBoundary';
import { supabase } from '../../../../../../lib/supabase';

// Lazy load heavy tabs
const UploadTab = lazy(() => import('../tabs/UploadTab'));
const MetadataTab = lazy(() => import('../tabs/MetadataTab'));
const StructureTab = lazy(() => import('../tabs/StructureTab'));
const QuestionsTab = lazy(() => import('../tabs/QuestionsTab'));

export interface WizardStep {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  optional?: boolean;
}

interface OptimizedPapersSetupWizardProps {
  initialStep?: string;
  onComplete?: (paperId: string, details: any) => void;
}

export const OptimizedPapersSetupWizard: React.FC<OptimizedPapersSetupWizardProps> = ({
  initialStep = 'upload',
  onComplete
}) => {
  // Wizard state
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // Session data
  const [importSession, setImportSession] = useState<any>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [savedPaperDetails, setSavedPaperDetails] = useState<any>(null);
  const [existingPaperId, setExistingPaperId] = useState<string | null>(null);

  // Staged attachments (shared across steps)
  const [stagedAttachments, setStagedAttachments] = useState<Record<string, any[]>>({});

  // 🔧 FIX: Persist importSession ID to localStorage to maintain session across navigation
  const STORAGE_KEY = 'papers_setup_import_session_id';

  // Load existing import session from localStorage on mount
  useEffect(() => {
    const restoreImportSession = async () => {
      const storedSessionId = localStorage.getItem(STORAGE_KEY);

      if (storedSessionId && !importSession) {
        console.log('[OptimizedWizard] 🔄 Restoring import session from localStorage:', storedSessionId);

        try {
          const { data: session, error } = await supabase
            .from('question_import_sessions')
            .select('*')
            .eq('id', storedSessionId)
            .maybeSingle();

          if (error) {
            console.error('[OptimizedWizard] ❌ Error restoring session:', error);
            localStorage.removeItem(STORAGE_KEY);
            return;
          }

          if (session) {
            console.log('[OptimizedWizard] ✅ Import session restored successfully');
            setImportSession(session);
          } else {
            console.log('[OptimizedWizard] ⚠️ Session not found in database, clearing localStorage');
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch (err) {
          console.error('[OptimizedWizard] ❌ Exception restoring session:', err);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    };

    restoreImportSession();
  }, []); // Only run on mount

  // Save importSession ID to localStorage whenever it changes
  useEffect(() => {
    if (importSession?.id) {
      console.log('[OptimizedWizard] 💾 Saving import session ID to localStorage:', importSession.id);
      localStorage.setItem(STORAGE_KEY, importSession.id);
    }
  }, [importSession?.id]);

  // Clear localStorage when wizard is completed or abandoned
  useEffect(() => {
    return () => {
      // Cleanup on unmount if all steps are completed
      if (completedSteps.has('questions')) {
        console.log('[OptimizedWizard] 🧹 Clearing import session from localStorage (wizard completed)');
        localStorage.removeItem(STORAGE_KEY);
      }
    };
  }, [completedSteps]);

  // Define steps with memoization
  const steps = useMemo<WizardStep[]>(() => [
    {
      id: 'upload',
      label: 'Upload & Extract',
      icon: Upload,
      status: completedSteps.has('upload') ? 'completed' : currentStep === 'upload' ? 'in_progress' : 'pending'
    },
    {
      id: 'metadata',
      label: 'Paper Metadata',
      icon: FileText,
      status: completedSteps.has('metadata') ? 'completed' : currentStep === 'metadata' ? 'in_progress' : 'pending'
    },
    {
      id: 'structure',
      label: 'Verify Structure',
      icon: Database,
      status: completedSteps.has('structure') ? 'completed' : currentStep === 'structure' ? 'in_progress' : 'pending'
    },
    {
      id: 'questions',
      label: 'Review Questions',
      icon: CheckCircle,
      status: completedSteps.has('questions') ? 'completed' : currentStep === 'questions' ? 'in_progress' : 'pending'
    }
  ], [currentStep, completedSteps]);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  }, [currentStep, steps]);

  // Navigation handlers with useCallback for performance
  const handleNext = useCallback((stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));

    const currentIndex = steps.findIndex(s => s.id === stepId);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  }, [steps]);

  const handlePrevious = useCallback((stepId: string) => {
    const currentIndex = steps.findIndex(s => s.id === stepId);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  }, [steps]);

  const handleGoToStep = useCallback((stepId: string) => {
    // Only allow going to completed steps or the current step
    if (completedSteps.has(stepId) || stepId === currentStep) {
      setCurrentStep(stepId);
    } else {
      toast.error('Please complete the previous steps first');
    }
  }, [completedSteps, currentStep]);

  // Data handlers
  const handleUploadComplete = useCallback((session: any, data: any) => {
    setImportSession(session);
    setParsedData(data);
    handleNext('upload');
  }, [handleNext]);

  const handleMetadataSave = useCallback((paperId: string, details: any) => {
    setExistingPaperId(paperId);
    setSavedPaperDetails(details);
    handleNext('metadata');
  }, [handleNext]);

  const handleStructureVerified = useCallback(() => {
    handleNext('structure');
  }, [handleNext]);

  const handleQuestionsComplete = useCallback((paperId: string) => {
    setCompletedSteps(prev => new Set([...prev, 'questions']));
    toast.success('Papers setup completed successfully!');

    if (onComplete) {
      onComplete(paperId, savedPaperDetails);
    }
  }, [savedPaperDetails, onComplete]);

  // Update staged attachments
  const updateStagedAttachments = useCallback((questionId: string, attachments: any[]) => {
    setStagedAttachments(prev => ({
      ...prev,
      [questionId]: attachments
    }));
  }, []);

  // Render step content with lazy loading and error boundaries
  const renderStepContent = useMemo(() => {
    const loadingFallback = (
      <div className="flex items-center justify-center py-12">
        <DataTableSkeleton />
      </div>
    );

    switch (currentStep) {
      case 'upload':
        return (
          <PapersSetupErrorBoundary showDetails>
            <Suspense fallback={loadingFallback}>
              <UploadTab
                onNext={handleUploadComplete}
                existingSession={importSession}
              />
            </Suspense>
          </PapersSetupErrorBoundary>
        );

      case 'metadata':
        return (
          <PapersSetupErrorBoundary showDetails>
            <Suspense fallback={loadingFallback}>
              <MetadataTab
                importSession={importSession}
                parsedData={parsedData}
                onSave={handleMetadataSave}
                onPrevious={() => handlePrevious('metadata')}
              />
            </Suspense>
          </PapersSetupErrorBoundary>
        );

      case 'structure':
        return (
          <PapersSetupErrorBoundary showDetails>
            <Suspense fallback={loadingFallback}>
              <StructureTab
                importSession={importSession}
                parsedData={parsedData}
                onNext={handleStructureVerified}
                onPrevious={() => handlePrevious('structure')}
              />
            </Suspense>
          </PapersSetupErrorBoundary>
        );

      case 'questions':
        return (
          <PapersSetupErrorBoundary showDetails>
            <Suspense fallback={loadingFallback}>
              <QuestionsTab
                importSession={importSession}
                parsedData={parsedData}
                existingPaperId={existingPaperId}
                savedPaperDetails={savedPaperDetails}
                onPrevious={() => handlePrevious('questions')}
                onContinue={handleQuestionsComplete}
                stagedAttachments={stagedAttachments}
                updateStagedAttachments={updateStagedAttachments}
              />
            </Suspense>
          </PapersSetupErrorBoundary>
        );

      default:
        return <div>Invalid step</div>;
    }
  }, [
    currentStep,
    importSession,
    parsedData,
    existingPaperId,
    savedPaperDetails,
    stagedAttachments,
    handleUploadComplete,
    handleMetadataSave,
    handleStructureVerified,
    handleQuestionsComplete,
    handlePrevious,
    updateStagedAttachments
  ]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with Progress */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Papers Setup Wizard
          </h1>

          {/* Progress Bar */}
          <ProgressBar
            progress={progressPercentage}
            className="mb-4"
          />

          {/* Steps */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => handleGoToStep(step.id)}
                  className={`
                    flex flex-col items-center space-y-2 transition-all
                    ${step.status === 'completed' || step.status === 'in_progress'
                      ? 'cursor-pointer hover:opacity-80'
                      : 'cursor-not-allowed opacity-50'
                    }
                  `}
                  disabled={step.status === 'pending'}
                >
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${step.status === 'completed'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                        : step.status === 'in_progress'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                      }
                    `}
                  >
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`
                      text-xs font-medium
                      ${step.status === 'in_progress'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400'
                      }
                    `}
                  >
                    {step.label}
                  </span>
                </button>

                {index < steps.length - 1 && (
                  <div
                    className={`
                      flex-1 h-0.5 mx-2
                      ${steps[index + 1].status === 'completed'
                        ? 'bg-green-300'
                        : 'bg-gray-200 dark:bg-gray-700'
                      }
                    `}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderStepContent}
      </div>
    </div>
  );
};

export default OptimizedPapersSetupWizard;
