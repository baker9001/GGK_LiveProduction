import React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { cn } from '../../../../../../../lib/utils';

interface ExtractionValidationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  onViewReport: () => void;
  summary: {
    totalErrors: number;
    missingAnswers: number;
    invalidAlternatives: number;
    invalidOperators: number;
  };
}

export function ExtractionValidationDialog({
  isOpen,
  onClose,
  onProceed,
  onViewReport,
  summary
}: ExtractionValidationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-black/30 max-w-lg w-full overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
          <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
            Extraction Validation Failed
          </h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            The extraction validation found {summary.totalErrors} errors that need to be addressed before importing.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-900 dark:text-red-100">{summary.missingAnswers}</div>
              <div className="text-sm text-red-700 dark:text-red-300">Missing Answers</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-900 dark:text-red-100">{summary.invalidAlternatives}</div>
              <div className="text-sm text-red-700 dark:text-red-300">Invalid Alternatives</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 col-span-2">
              <div className="text-2xl font-bold text-red-900 dark:text-red-100">{summary.invalidOperators}</div>
              <div className="text-sm text-red-700 dark:text-red-300">Invalid Operators</div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <Button variant="outline" onClick={onViewReport}>View Full Report</Button>
          <Button variant="default" onClick={onClose}>Fix Errors</Button>
        </div>
      </div>
    </div>
  );
}

interface SimulationWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
}

export function SimulationWarningDialog({ isOpen, onClose, onProceed }: SimulationWarningDialogProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
          <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">Simulation Not Completed</h3>
        </div>
        <div className="px-6 py-4">
          <p className="text-gray-700 dark:text-gray-300 mb-4">Exam simulation is recommended but has not been completed yet.</p>
        </div>
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>Go Back</Button>
          <Button variant="default" onClick={onProceed}>Proceed Anyway</Button>
        </div>
      </div>
    </div>
  );
}

interface UnmappedQuestionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  unmappedCount: number;
  unmappedNumbers: string;
}

export function UnmappedQuestionsDialog({ isOpen, onClose, onProceed, unmappedCount, unmappedNumbers }: UnmappedQuestionsDialogProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
          <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">Unmapped Questions Found</h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          <p className="text-gray-700 dark:text-gray-300">{unmappedCount} question{unmappedCount !== 1 ? 's are' : ' is'} not mapped to units and topics.</p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">Unmapped Questions:</h4>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-mono">{unmappedNumbers}</p>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <Button variant="outline" onClick={onProceed}>Proceed Anyway</Button>
          <Button variant="default" onClick={onClose}>Map Questions</Button>
        </div>
      </div>
    </div>
  );
}

interface ExtractionWarningsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  warningCount: number;
}

export function ExtractionWarningsDialog({ isOpen, onClose, warningCount }: ExtractionWarningsDialogProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
          <Info className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">Extraction Warnings Detected</h3>
        </div>
        <div className="px-6 py-4">
          <p className="text-gray-700 dark:text-gray-300">The extraction validation found {warningCount} warnings. Check console for details.</p>
        </div>
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <Button variant="default" onClick={onClose}>Continue</Button>
        </div>
      </div>
    </div>
  );
}
