import React from 'react';
import { FormField, Select } from '../../../../../../../components/shared/FormField';

interface StatusSelectorProps {
  value: 'active' | 'inactive' | 'draft';
  onChange: (value: 'active' | 'inactive' | 'draft') => void;
  error?: string;
  disabled?: boolean;
  description?: string;
  parsedData?: any;
}

export function StatusSelector({
  value,
  onChange,
  error,
  disabled = false,
  description = "Set the status of this paper. Active papers are visible to users.",
  parsedData
}: StatusSelectorProps) {
  // Determine if we have enough data to suggest an active status
  const hasCompleteData = parsedData && 
    parsedData.paper_metadata && 
    parsedData.paper_metadata.paper_code && 
    parsedData.paper_metadata.exam_year && 
    parsedData.paper_metadata.exam_session;

  return (
    <FormField
      id="status"
      label="Status"
      required
      error={error}
      description={description}
    >
      <Select
        id="status"
        name="status"
        options={[
          { value: 'active', label: 'Active - Confirmed and ready for use' },
          { value: 'draft', label: 'Draft - Needs review' },
          { value: 'inactive', label: 'Inactive - Hidden from users' }
        ]}
        value={value}
        onChange={(value) => onChange(value as 'active' | 'inactive' | 'draft')}
        disabled={disabled}
      />
      
      {!hasCompleteData && value === 'active' && (
        <div className="mt-2 text-sm text-amber-600 dark:text-amber-400">
          This paper may be missing important metadata. Consider setting it to "Draft" until all information is complete.
        </div>
      )}
    </FormField>
  );
}