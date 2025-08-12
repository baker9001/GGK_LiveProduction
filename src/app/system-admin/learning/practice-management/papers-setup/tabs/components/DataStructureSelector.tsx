import React, { useState, useEffect } from 'react';
import { CheckCircle, Info, PlusCircle } from 'lucide-react';
import { FormField, Select } from '../../../../../../../components/shared/FormField';
import { Button } from '../../../../../../../components/shared/Button';
import { cn } from '../../../../../../../lib/utils';

interface DataStructureOption {
  value: string;
  label: string;
  region: string;
  program: string;
  provider: string;
  subject: string;
}

interface DataStructureSelectorProps {
  dataStructureOptions: DataStructureOption[];
  value: string;
  onChange: (value: string) => void;
  isLoading: boolean;
  error?: string;
  onCreateNew?: () => void;
  matchingDataStructureFound: boolean | null;
}

export function DataStructureSelector({
  dataStructureOptions,
  value,
  onChange,
  isLoading,
  error,
  onCreateNew,
  matchingDataStructureFound
}: DataStructureSelectorProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
      <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">Academic Structure</h3>
      
      <FormField
        id="data_structure_id"
        label="Data Structure"
        required
        error={error}
        description="Select the academic structure for this paper"
      >
        <Select
          id="data_structure_id"
          name="data_structure_id"
          options={dataStructureOptions.map(option => ({
            value: option.value,
            label: `${option.subject} (${option.region} / ${option.program} / ${option.provider})`
          }))}
          value={value}
          onChange={onChange}
          disabled={isLoading}
        />
      </FormField>
      
      {matchingDataStructureFound === false && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md flex items-start">
          <Info className="h-5 w-5 text-amber-500 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0" /> 
          <div className="flex-1">
            <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Data Structure Not Found
            </h4>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              The academic structure for this paper doesn't exist yet. Please select an existing structure or create a new one in the Education Catalogue section.
            </p>
            {onCreateNew && (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                  leftIcon={<PlusCircle className="h-4 w-4 mr-1" />}
                  onClick={onCreateNew}
                >
                  Create New Structure
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {matchingDataStructureFound === true && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md flex items-start">
          <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-green-800 dark:text-green-300">
              Data Structure Selected
            </h4>
            <p className="mt-1 text-sm text-green-700 dark:text-green-400">
              This paper will be linked to the selected academic structure.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}