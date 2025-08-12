import React, { useState, useEffect } from 'react';
import { FormField, Input, Select, Textarea } from '../../../../../../../components/shared/FormField';
import { Info, AlertCircle } from 'lucide-react';

interface PaperDetailsFormProps {
  formData: {
    title: string;
    paper_code: string;
    paper_number: string;
    variant_number?: string;
    exam_session: string;
    exam_year: number | string;
    duration?: number | string;
    total_marks?: number | string;
    language?: string;
    paper_type?: string;
    notes?: string;
    status?: string;
  };
  formErrors: Record<string, string>;
  onChange: (field: string, value: any) => void;
  disabled?: boolean;
  parsedData?: any;
  sessionOptions?: Array<{ value: string; label: string }>;
  languageOptions?: Array<{ value: string; label: string }>;
  paperTypeOptions?: Array<{ value: string; label: string }>;
  statusOptions?: Array<{ value: string; label: string }>;
}

export function PaperDetailsForm({
  formData,
  formErrors,
  onChange,
  disabled = false,
  parsedData,
  sessionOptions = [
    { value: 'February/March', label: 'February/March' },
    { value: 'May/June', label: 'May/June' },
    { value: 'October/November', label: 'October/November' },
    { value: 'Other', label: 'Other' }
  ],
  languageOptions = [
    { value: 'English', label: 'English' },
    { value: 'Arabic', label: 'Arabic' }
  ],
  paperTypeOptions = [
    { value: 'QP Only', label: 'QP Only' },
    { value: 'MS Only', label: 'MS Only' },
    { value: 'Both QP and MS', label: 'Both QP and MS' }
  ],
  statusOptions = [
    { value: 'active', label: 'Active – Confirmed and ready for use' },
    { value: 'draft', label: 'Draft – Needs review' },
    { value: 'inactive', label: 'Inactive' }
  ]
}: PaperDetailsFormProps) {
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});
  
  // Helper function to extract field from parsedData with fallbacks
  const extractField = (fieldName: string, defaultValue: any = '') => {
    // First check in paper_metadata
    if (parsedData?.paper_metadata && parsedData.paper_metadata[fieldName] !== undefined) {
      return parsedData.paper_metadata[fieldName];
    }
    
    // Then check at root level
    if (parsedData && parsedData[fieldName] !== undefined) {
      return parsedData[fieldName];
    }
    
    // For subject, program, provider - check in first question
    if (['subject', 'program', 'provider'].includes(fieldName) && 
        parsedData?.questions && 
        parsedData.questions.length > 0 && 
        parsedData.questions[0][fieldName] !== undefined) {
      return parsedData.questions[0][fieldName];
    }
    
    // For subject, program, provider - check in question_analysis
    if (['subject', 'program', 'provider'].includes(fieldName) && 
        parsedData?.question_analysis && 
        parsedData.question_analysis.length > 0 && 
        parsedData.question_analysis[0][fieldName] !== undefined) {
      return parsedData.question_analysis[0][fieldName];
    }
    
    return defaultValue;
  };
  
  // Extract original values from parsedData for reference
  useEffect(() => {
    if (!parsedData) return;
    
    const values: Record<string, string> = {};
    
    // Extract all fields using the helper function
    values.title = extractField('title') || extractField('paper_title', '');
    values.paper_code = extractField('paper_code', '');
    values.paper_number = extractField('paper_number', '');
    values.variant_number = extractField('variant_number') || extractField('variant', '');
    values.exam_session = extractField('exam_session') || extractField('session', '');
    
    const rawYear = extractField('exam_year') || extractField('year');
    values.exam_year = rawYear ? rawYear.toString() : '';
    
    values.duration = extractField('duration', '');
    
    const rawMarks = extractField('total_marks');
    values.total_marks = rawMarks ? rawMarks.toString() : '';
    
    values.language = extractField('language', 'English');
    values.paper_type = extractField('paper_type', 'Both QP and MS');
    values.notes = extractField('notes') || extractField('description', '');
    
    setOriginalValues(values);
  }, [parsedData]);
  
  // Function to reset a field to its original value
  const resetField = (field: string) => {
    if (originalValues[field]) {
      onChange(field, originalValues[field]);
    }
  };
  
  // Helper to show original value if different from current
  const renderOriginalValue = (field: string, currentValue: string) => {
    if (originalValues[field] && originalValues[field] !== currentValue) {
      return (
        <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center">
          <Info className="h-3 w-3 mr-1" />
          <span>Original: {originalValues[field]}</span>
          <button 
            className="ml-2 text-blue-700 dark:text-blue-300 hover:underline"
            onClick={() => resetField(field)}
            type="button"
          >
            Reset
          </button>
        </div>
      );
    }
    return null;
  };
  
  // Check if we have missing required fields from the JSON
  const hasMissingRequiredFields = () => {
    const requiredFields = ['paper_code', 'exam_year', 'exam_session'];
    return requiredFields.some(field => !originalValues[field]);
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {hasMissingRequiredFields() && (
        <div className="md:col-span-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md flex items-start mb-4">
          <AlertCircle className="h-5 w-5 text-amber-500 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
              Missing Required Fields
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Some required fields were not found in the JSON data. Please fill them in manually.
            </p>
          </div>
        </div>
      )}
      
      <FormField
        id="title"
        label="Paper Title"
        error={formErrors.title}
        description="Optional, max 120 characters"
      >
        <Input
          id="title"
          name="title"
          placeholder="Enter paper title"
          value={formData?.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          disabled={disabled}
          maxLength={120}
        />
        {renderOriginalValue('title', formData?.title || '')}
      </FormField>
      
      <FormField
        id="paper_code"
        label="Paper Code"
        required
        error={formErrors.paper_code}
        description="Format: 0000/00 (e.g., 0452/12)"
      >
        <Input
          id="paper_code"
          name="paper_code"
          placeholder="e.g., 0452/12"
          value={formData?.paper_code || ''}
          onChange={(e) => onChange('paper_code', e.target.value)}
          disabled={disabled}
        />
        {renderOriginalValue('paper_code', formData?.paper_code || '')}
      </FormField>
      
      <FormField
        id="paper_number"
        label="Paper Number"
        required
        error={formErrors.paper_number}
        description="The paper number (e.g., 12)"
      >
        <Input
          id="paper_number"
          name="paper_number"
          placeholder="e.g., 12"
          value={formData?.paper_number || ''}
          onChange={(e) => onChange('paper_number', e.target.value)}
          disabled={disabled}
        />
        {renderOriginalValue('paper_number', formData?.paper_number || '')}
      </FormField>
      
      <FormField
        id="exam_year"
        label="Paper Year"
        required
        error={formErrors.exam_year}
        description="4-digit year (2000-present)"
      >
        <Input
          id="exam_year"
          name="exam_year"
          type="text"
          min={1990}
          max={new Date().getFullYear() + 1}
          placeholder="e.g., 2023"
          value={formData?.exam_year || ''}
          onChange={(e) => {
            // If input is empty, pass empty string
            if (e.target.value === '') {
              onChange('exam_year', '');
            } else {
              // Otherwise parse as integer
              const parsedYear = parseInt(e.target.value);
              onChange('exam_year', isNaN(parsedYear) ? '' : parsedYear);
            }
          }}
          disabled={disabled}
        />
        {renderOriginalValue('exam_year', String(formData?.exam_year || ''))}
      </FormField>
      
      <FormField
        id="exam_session"
        label="Exam Session"
        required
        error={formErrors.exam_session}
        description="The exam session"
      >
        <Select
          id="exam_session"
          name="exam_session"
          options={sessionOptions}
          value={formData?.exam_session || ''}
          onChange={(value) => onChange('exam_session', value)}
          disabled={disabled}
        />
        {renderOriginalValue('exam_session', formData?.exam_session || '')}
      </FormField>
      
      <FormField
        id="variant_number"
        label="Variant Number"
        error={formErrors.variant_number}
        description="Optional variant number"
      >
        <Input
          id="variant_number"
          name="variant_number"
          placeholder="e.g., 1"
          value={formData?.variant_number || ''}
          onChange={(e) => onChange('variant_number', e.target.value)}
          disabled={disabled}
        />
        {renderOriginalValue('variant_number', formData?.variant_number || '')}
      </FormField>
      
      <FormField
        id="duration"
        label="Duration (minutes)"
        error={formErrors.duration}
        description="The duration of the exam in minutes"
      >
        <Input
          id="duration"
          name="duration"
          type="text"
          placeholder="e.g., 90"
          value={formData?.duration || ''}
          onChange={(e) => onChange('duration', e.target.value.trim())}
          disabled={disabled}
        />
        {renderOriginalValue('duration', String(formData?.duration || ''))}
      </FormField>
      
      <FormField
        id="total_marks"
        label="Total Marks"
        error={formErrors.total_marks}
        description="The total marks for the paper"
      >
        <Input
          id="total_marks"
          name="total_marks"
          type="text"
          placeholder="e.g., 80"
          value={formData?.total_marks || ''}
          onChange={(e) => onChange('total_marks', parseInt(e.target.value) || '')}
          disabled={disabled}
        />
        {renderOriginalValue('total_marks', String(formData?.total_marks || ''))}
      </FormField>

      <FormField
        id="language"
        label="Language"
        required
        error={formErrors.language}
        description="The language of the paper"
      >
        <Select
          id="language"
          name="language"
          options={languageOptions}
          value={formData?.language || 'English'}
          onChange={(value) => onChange('language', value)}
          disabled={disabled}
        />
        {renderOriginalValue('language', formData?.language || 'English')}
      </FormField>
      
      <FormField
        id="paper_type"
        label="Paper Type"
        required
        error={formErrors.paper_type}
        description="Type of paper content"
      >
        <Select
          id="paper_type"
          name="paper_type"
          options={paperTypeOptions}
          value={formData?.paper_type || 'Both QP and MS'}
          onChange={(value) => onChange('paper_type', value)}
          disabled={disabled}
        />
        {renderOriginalValue('paper_type', formData?.paper_type || 'Both QP and MS')}
      </FormField>
      
      <FormField
        id="notes"
        label="Notes"
        error={formErrors.notes}
        description="Optional notes about this paper (max 500 characters)"
        className="md:col-span-2"
      >
        <Textarea
          id="notes"
          name="notes"
          placeholder="Enter notes about this paper"
          value={formData?.notes || ''}
          onChange={(e) => onChange('notes', e.target.value)}
          disabled={disabled}
          maxLength={500}
          rows={3}
        />
        {renderOriginalValue('notes', formData?.notes || '')}
      </FormField>
      
      <FormField
        id="status"
        label="Status"
        required
        error={formErrors.status}
        description="Set the status of this paper"
      >
        <Select
          id="status"
          name="status"
          options={statusOptions}
          value={formData?.status || 'draft'} // Default to 'draft'
          onChange={(value) => onChange('status', value)}
          disabled={disabled}
        />
      </FormField>
    </div>
  );
}