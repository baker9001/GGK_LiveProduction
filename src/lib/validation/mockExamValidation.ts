/**
 * Mock Exam Validation Utilities
 *
 * Provides real-time validation with IGCSE-specific compliance checks
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  suggestion?: string;
}

// IGCSE Standard Duration Guidelines (in minutes)
const IGCSE_DURATION_GUIDELINES: Record<string, number> = {
  'Paper 1': 45,
  'Paper 2': 90,
  'Paper 3': 120,
  'Paper 4': 150,
  'Specimen': 120,
};

// Subjects with specific calculator rules
const CALCULATOR_REQUIRED_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Economics',
  'Business Studies',
];

const CALCULATOR_NOT_ALLOWED_SUBJECTS = [
  'Mathematics (Non-Calculator)',
];

/**
 * Validate exam title
 */
export function validateExamTitle(title: string): ValidationResult {
  if (!title || !title.trim()) {
    return {
      isValid: false,
      error: 'Exam title is required',
    };
  }

  if (title.trim().length < 10) {
    return {
      isValid: false,
      error: 'Title should be at least 10 characters for clarity',
      suggestion: 'Include year group, subject, and paper number',
    };
  }

  if (title.length > 200) {
    return {
      isValid: false,
      error: 'Title is too long (maximum 200 characters)',
    };
  }

  // Check for common patterns
  const hasYearGroup = /year\s+\d+|grade\s+\d+|y\d+|g\d+/i.test(title);
  const hasPaper = /paper\s+\d+|p\d+/i.test(title);

  if (!hasYearGroup || !hasPaper) {
    return {
      isValid: true,
      warning: 'Consider including year group and paper number for easier identification',
    };
  }

  return { isValid: true };
}

/**
 * Validate exam duration against IGCSE guidelines
 */
export function validateDuration(
  durationMinutes: number,
  paperType: string,
  subject?: string
): ValidationResult {
  if (!durationMinutes || durationMinutes < 30) {
    return {
      isValid: false,
      error: 'Duration must be at least 30 minutes',
    };
  }

  if (durationMinutes > 300) {
    return {
      isValid: false,
      error: 'Duration cannot exceed 5 hours (300 minutes)',
      warning: 'Verify with official Cambridge specifications',
    };
  }

  // Check against IGCSE guidelines
  const guideline = IGCSE_DURATION_GUIDELINES[paperType];
  if (guideline) {
    const difference = Math.abs(durationMinutes - guideline);
    const percentageDiff = (difference / guideline) * 100;

    if (percentageDiff > 20) {
      return {
        isValid: true,
        warning: `Standard duration for ${paperType} is ${guideline} minutes`,
        suggestion: `Consider using ${guideline} minutes to match IGCSE specifications`,
      };
    }

    if (difference > 0 && difference <= 15) {
      return {
        isValid: true,
        warning: `Close to standard ${guideline} minutes. Verify this matches your exam board requirements.`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate scheduled date and time
 */
export function validateScheduledDateTime(scheduledStart: string): ValidationResult {
  if (!scheduledStart) {
    return {
      isValid: false,
      error: 'Scheduled date and time is required',
    };
  }

  const examDate = new Date(scheduledStart);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check if date is in the past
  if (examDate < now) {
    return {
      isValid: false,
      error: 'Cannot schedule exam in the past',
    };
  }

  // Warn if exam is less than 24 hours away
  if (examDate < tomorrow) {
    return {
      isValid: true,
      warning: 'Exam is scheduled within 24 hours',
      suggestion: 'Ensure all materials and staff are prepared',
    };
  }

  // Check if scheduled on weekend
  const dayOfWeek = examDate.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      isValid: true,
      warning: 'Exam is scheduled on a weekend',
    };
  }

  // Check for unusual times
  const hour = examDate.getHours();
  if (hour < 7 || hour > 18) {
    return {
      isValid: true,
      warning: 'Exam is scheduled outside typical school hours (7 AM - 6 PM)',
    };
  }

  return { isValid: true };
}

/**
 * Validate school selection
 */
export function validateSchools(schoolIds: string[]): ValidationResult {
  if (!schoolIds || schoolIds.length === 0) {
    return {
      isValid: false,
      error: 'Select at least one school',
    };
  }

  if (schoolIds.length > 10) {
    return {
      isValid: true,
      warning: 'Large multi-school coordination may require additional planning',
      suggestion: 'Consider designating a coordinating school',
    };
  }

  return { isValid: true };
}

/**
 * Validate year groups selection
 */
export function validateYearGroups(yearGroupIds: string[]): ValidationResult {
  if (!yearGroupIds || yearGroupIds.length === 0) {
    return {
      isValid: false,
      error: 'Select at least one year group',
    };
  }

  if (yearGroupIds.length > 5) {
    return {
      isValid: true,
      warning: 'Multiple year groups selected',
      suggestion: 'Ensure exam difficulty is appropriate for all selected groups',
    };
  }

  return { isValid: true };
}

/**
 * Validate teacher assignments
 */
export function validateTeachers(teacherIds: string[]): ValidationResult {
  if (!teacherIds || teacherIds.length === 0) {
    return {
      isValid: false,
      error: 'Assign at least one lead teacher',
    };
  }

  if (teacherIds.length === 1) {
    return {
      isValid: true,
      warning: 'Only one lead teacher assigned',
      suggestion: 'Consider assigning a backup teacher for contingency',
    };
  }

  if (teacherIds.length > 10) {
    return {
      isValid: true,
      warning: 'Large teaching team',
      suggestion: 'Ensure clear role assignments and communication protocols',
    };
  }

  return { isValid: true };
}

/**
 * Validate student capacity
 */
export function validateStudentCapacity(
  estimatedStudents: number,
  venues?: number
): ValidationResult {
  if (estimatedStudents === 0) {
    return {
      isValid: true,
      warning: 'No students estimated',
      suggestion: 'Verify student cohorts and sections are correctly selected',
    };
  }

  if (estimatedStudents > 500) {
    return {
      isValid: true,
      warning: 'Large student cohort (500+ students)',
      suggestion: 'Ensure adequate venues, invigilators, and materials are prepared',
    };
  }

  if (venues && venues > 0) {
    const studentsPerVenue = Math.ceil(estimatedStudents / venues);
    if (studentsPerVenue > 50) {
      return {
        isValid: true,
        warning: `Average of ${studentsPerVenue} students per venue`,
        suggestion: 'Consider additional venues to maintain exam conditions',
      };
    }
  }

  return { isValid: true };
}

/**
 * Get calculator requirements for subject
 */
export function getCalculatorRequirements(subject: string): {
  required?: boolean;
  notAllowed?: boolean;
  note?: string;
} {
  if (CALCULATOR_NOT_ALLOWED_SUBJECTS.some(s => subject.toLowerCase().includes(s.toLowerCase()))) {
    return {
      notAllowed: true,
      note: 'Calculators are NOT permitted for this exam',
    };
  }

  if (CALCULATOR_REQUIRED_SUBJECTS.some(s => subject.toLowerCase().includes(s.toLowerCase()))) {
    return {
      required: true,
      note: 'Students will need calculators. Verify model requirements.',
    };
  }

  return {};
}

/**
 * Comprehensive form validation
 */
export function validateMockExamForm(formData: {
  title: string;
  subject?: string;
  paper: string;
  schools: string[];
  gradeBands: string[];
  scheduledStart: string;
  durationMinutes: string;
  teachers: string[];
  estimatedStudents?: number;
}): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  results.title = validateExamTitle(formData.title);
  results.schools = validateSchools(formData.schools);
  results.gradeBands = validateYearGroups(formData.gradeBands);
  results.scheduledStart = validateScheduledDateTime(formData.scheduledStart);
  results.teachers = validateTeachers(formData.teachers);

  const duration = parseInt(formData.durationMinutes);
  if (!isNaN(duration)) {
    results.duration = validateDuration(duration, formData.paper, formData.subject);
  }

  if (formData.estimatedStudents) {
    results.students = validateStudentCapacity(formData.estimatedStudents);
  }

  return results;
}

/**
 * Check if form has any errors
 */
export function hasValidationErrors(results: Record<string, ValidationResult>): boolean {
  return Object.values(results).some(result => !result.isValid);
}

/**
 * Get all validation messages
 */
export function getValidationMessages(results: Record<string, ValidationResult>): {
  errors: string[];
  warnings: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  Object.values(results).forEach(result => {
    if (result.error) errors.push(result.error);
    if (result.warning) warnings.push(result.warning);
    if (result.suggestion) suggestions.push(result.suggestion);
  });

  return { errors, warnings, suggestions };
}
