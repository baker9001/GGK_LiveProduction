import React from 'react';
import { AlertCircle } from 'lucide-react';

interface StructureTabProps {
  importSession: any;
  parsedData: any;
  onNext: (data: any) => void;
  onPrevious: () => void;
}

const StructureTab: React.FC<StructureTabProps> = ({ importSession, parsedData, onNext, onPrevious }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Structure Tab - Under Development
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          This tab is currently being implemented. Please check back later.
        </p>
      </div>
    </div>
  );
};

export default StructureTab;
