// src/lib/utils/paperImportHelpers.ts

import React, { useState } from 'react';
import { Edit2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// 1. Subject Code Mappings
export const SUBJECT_CODE_MAPPINGS: Record<string, string> = {
  // Physics
  '0625': 'Physics',
  '0972': 'Physics',
  '9702': 'Physics',
  
  // Chemistry
  '0620': 'Chemistry',
  '0971': 'Chemistry',
  '9701': 'Chemistry',
  
  // Biology
  '0610': 'Biology',
  '0970': 'Biology',
  '9700': 'Biology',
  
  // Mathematics
  '0580': 'Mathematics',
  '0606': 'Additional Mathematics',
  '9709': 'Mathematics',
  
  // Combined Sciences
  '0653': 'Combined Science',
  '0654': 'Co-ordinated Sciences',
  
  // Computer Science
  '0478': 'Computer Science',
  '0984': 'Computer Science',
  
  // Economics
  '0455': 'Economics',
  '9708': 'Economics',
  
  // Business Studies
  '0450': 'Business Studies',
  '9609': 'Business',
  
  // Add more mappings as needed
};

// 2. Enhanced subject extraction function
export function extractSubjectInfo(subjectString: string): {
  fullName: string;
  subjectName: string;
  subjectCode: string | null;
} {
  if (!subjectString) {
    return {
      fullName: 'Unknown Subject',
      subjectName: 'Unknown Subject',
      subjectCode: null
    };
  }

  // Keep the full name as provided
  const fullName = subjectString.trim();
  
  // Try to extract code and name
  let subjectName = fullName;
  let subjectCode = null;
  
  // Handle format like "Physics - 0625"
  const dashMatch = subjectString.match(/^(.+?)\s*-\s*(\d+)$/);
  if (dashMatch) {
    subjectName = dashMatch[1].trim();
    subjectCode = dashMatch[2].trim();
  }
  
  // Handle format like "Physics (0625)"
  const parenMatch = subjectString.match(/^(.+?)\s*\((\d+)\)$/);
  if (parenMatch) {
    subjectName = parenMatch[1].trim();
    subjectCode = parenMatch[2].trim();
  }
  
  return {
    fullName,
    subjectName,
    subjectCode
  };
}

// 3. Manual override component for subject mapping
export const SubjectMappingOverride: React.FC<{
  currentSubject: string;
  onUpdate: (newSubject: string) => void;
}> = ({ currentSubject, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentSubject);
  
  const handleSave = () => {
    onUpdate(editValue);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setEditValue(currentSubject);
    setIsEditing(false);
  };
  
  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">{currentSubject}</span>
        <button
          onClick={() => setIsEditing(true)}
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        className="px-2 py-1 text-sm border rounded"
        autoFocus
      />
      <button
        onClick={handleSave}
        className="text-green-600 hover:text-green-700"
      >
        <CheckCircle className="w-4 h-4" />
      </button>
      <button
        onClick={handleCancel}
        className="text-red-600 hover:text-red-700"
      >
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  );
};

// 4. Enhanced error handling for entity creation
export async function createEntityWithRetry(
  table: string,
  payload: any,
  maxRetries: number = 3
): Promise<{ data: any; error: any }> {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase
        .from(table)
        .insert(payload)
        .select('id')
        .single();
      
      if (!error) {
        return { data, error: null };
      }
      
      // Check if it's a duplicate error
      if (error.message.includes('duplicate') || error.code === '23505') {
        // Try to find the existing entity
        const { data: existingData, error: findError } = await supabase
          .from(table)
          .select('id')
          .eq('name', payload.name)
          .single();
        
        if (!findError && existingData) {
          return { data: existingData, error: null };
        }
      }
      
      lastError = error;
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    } catch (err) {
      lastError = err;
    }
  }
  
  return { data: null, error: lastError };
}

// 5. Validation helper for imported data
export function validateImportedData(data: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!data.qualification) errors.push('Missing qualification (program)');
  if (!data.exam_board) errors.push('Missing exam board (provider)');
  if (!data.subject) errors.push('Missing subject');
  
  // Validate questions
  if (!data.questions || !Array.isArray(data.questions)) {
    errors.push('No questions found in the import file');
  } else {
    if (data.questions.length === 0) {
      warnings.push('No questions to import');
    }
    
    // Check for missing topics/units
    const missingTopics = data.questions.filter((q: any) => !q.topic);
    if (missingTopics.length > 0) {
      warnings.push(`${missingTopics.length} questions missing topic information`);
    }
    
    const missingUnits = data.questions.filter((q: any) => !q.unit);
    if (missingUnits.length > 0) {
      warnings.push(`${missingUnits.length} questions missing unit information`);
    }
  }
  
  // Paper metadata warnings
  if (!data.paper_code) warnings.push('Missing paper code');
  if (!data.exam_year) warnings.push('Missing exam year');
  if (!data.exam_session) warnings.push('Missing exam session');
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// 6. Database helper to check entity existence
export async function checkEntityExists(
  table: string,
  field: string,
  value: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq(field, value)
      .single();
    
    return !!data && !error;
  } catch {
    return false;
  }
}

// 7. Batch creation helper
export async function createEntitiesInBatch(
  entities: Array<{ table: string; payload: any }>
): Promise<{ success: number; failed: number; errors: any[] }> {
  let success = 0;
  let failed = 0;
  const errors: any[] = [];
  
  for (const entity of entities) {
    const { data, error } = await createEntityWithRetry(entity.table, entity.payload);
    
    if (data) {
      success++;
    } else {
      failed++;
      errors.push({ entity, error });
    }
  }
  
  return { success, failed, errors };
}

// 8. Subject detection helper specifically for paper codes
export function detectSubjectFromPaperCode(paperCode: string): string | null {
  // Extract numeric code from paper code (e.g., "0625/62" -> "0625")
  const codeMatch = paperCode.match(/^(\d{4})/);
  if (codeMatch) {
    const subjectCode = codeMatch[1];
    return SUBJECT_CODE_MAPPINGS[subjectCode] || null;
  }
  return null;
}

// 9. Progress tracking hook
export function useImportProgress() {
  const [progress, setProgress] = useState({
    upload: { status: 'pending', progress: 0 },
    structure: { status: 'pending', progress: 0 },
    metadata: { status: 'pending', progress: 0 },
    questions: { status: 'pending', progress: 0 }
  });
  
  const updateStepProgress = (step: string, status: string, progress: number) => {
    setProgress(prev => ({
      ...prev,
      [step]: { status, progress }
    }));
  };
  
  const getOverallProgress = () => {
    const steps = Object.values(progress);
    const totalProgress = steps.reduce((sum, step) => sum + step.progress, 0);
    return totalProgress / steps.length;
  };
  
  return { progress, updateStepProgress, getOverallProgress };
}

// 10. Session recovery helper
export async function recoverImportSession(sessionId: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('past_paper_import_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}