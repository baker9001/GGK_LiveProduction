// Safe wrapper for QuestionsTab with comprehensive error handling and diagnostics
import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '../../../../../../components/shared/Button';
import { ErrorBoundary } from '../../../../../../components/shared/ErrorBoundary';
import { QuestionsTab } from './QuestionsTab';

interface QuestionsTabWrapperProps {
  importSession: any;
  parsedData: any;
  existingPaperId: string | null;
  savedPaperDetails: any;
  onPrevious: () => void;
  onContinue: () => void;
  extractionRules?: any;
  updateStagedAttachments?: (questionId: string, attachments: any[]) => void;
  stagedAttachments?: Record<string, any[]>;
}

export function QuestionsTabWrapper(props: QuestionsTabWrapperProps) {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    validateProps();
  }, [props.importSession, props.parsedData, props.existingPaperId, props.savedPaperDetails]);

  const validateProps = () => {
    setIsValidating(true);
    setValidationError(null);

    try {
      console.log('=== QuestionsTab Props Validation ===');

      const diag: any = {
        timestamp: new Date().toISOString(),
        importSession: {
          exists: !!props.importSession,
          id: props.importSession?.id || 'missing',
          status: props.importSession?.status || 'missing',
          hasMetadata: !!props.importSession?.metadata,
          metadataKeys: props.importSession?.metadata ? Object.keys(props.importSession.metadata) : []
        },
        parsedData: {
          exists: !!props.parsedData,
          hasQuestions: !!props.parsedData?.questions,
          questionCount: props.parsedData?.questions?.length || 0,
          hasExamBoard: !!props.parsedData?.exam_board,
          hasQualification: !!props.parsedData?.qualification,
          keys: props.parsedData ? Object.keys(props.parsedData) : []
        },
        existingPaperId: {
          exists: !!props.existingPaperId,
          value: props.existingPaperId || 'missing'
        },
        savedPaperDetails: {
          exists: !!props.savedPaperDetails,
          hasDataStructureId: !!props.savedPaperDetails?.data_structure_id,
          dataStructureId: props.savedPaperDetails?.data_structure_id || 'missing',
          keys: props.savedPaperDetails ? Object.keys(props.savedPaperDetails) : []
        },
        extractionRules: {
          exists: !!props.extractionRules,
          keys: props.extractionRules ? Object.keys(props.extractionRules) : []
        },
        stagedAttachments: {
          exists: !!props.stagedAttachments,
          count: props.stagedAttachments ? Object.keys(props.stagedAttachments).length : 0
        }
      };

      setDiagnostics(diag);
      console.log('Diagnostics:', diag);

      // Validation checks
      const errors: string[] = [];

      if (!props.importSession) {
        errors.push('Import session is missing');
      }

      if (!props.parsedData) {
        errors.push('Parsed data is missing');
      } else {
        if (!props.parsedData.questions || props.parsedData.questions.length === 0) {
          errors.push('No questions found in parsed data');
        }
      }

      if (!props.existingPaperId) {
        errors.push('Paper ID is missing');
      }

      if (!props.savedPaperDetails) {
        errors.push('Paper details are missing');
      } else {
        if (!props.savedPaperDetails.data_structure_id) {
          errors.push('Data structure ID is missing from paper details');
        }
      }

      if (errors.length > 0) {
        const errorMessage = errors.join('; ');
        console.error('Validation failed:', errors);
        setValidationError(errorMessage);
        setIsValidating(false);
        return;
      }

      console.log('✓ All validation checks passed');
      setIsValidating(false);
    } catch (error) {
      console.error('Error during validation:', error);
      setValidationError(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
      setIsValidating(false);
    }
  };

  const handleReset = () => {
    console.log('Resetting QuestionsTab component...');
    setKey(prev => prev + 1);
    validateProps();
  };

  if (isValidating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Validating questions data...
        </p>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="max-w-2xl w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">
                Cannot Load Questions Tab
              </h2>
              <p className="text-red-800 dark:text-red-200 mb-4">
                {validationError}
              </p>

              {diagnostics && (
                <div className="bg-red-100 dark:bg-red-900/40 rounded p-3 mb-4">
                  <details>
                    <summary className="text-sm font-medium text-red-900 dark:text-red-100 cursor-pointer hover:underline">
                      Show diagnostic information
                    </summary>
                    <pre className="text-xs text-red-800 dark:text-red-200 mt-2 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {JSON.stringify(diagnostics, null, 2)}
                    </pre>
                  </details>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={props.onPrevious}
                >
                  Go Back
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                  Retry
                </Button>
              </div>

              <p className="text-xs text-red-600 dark:text-red-400 mt-4">
                Please complete the previous steps (Upload, Structure, and Metadata) before accessing the Questions tab.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      key={key}
      fallbackTitle="Questions Tab Error"
      fallbackMessage="An error occurred while rendering the questions review interface. This might be due to invalid data or a rendering issue."
      onReset={handleReset}
    >
      <QuestionsTab {...props} />
    </ErrorBoundary>
  );
}
