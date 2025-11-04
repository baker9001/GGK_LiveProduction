import { Question, SubQuestion } from '../../page';

const attachmentKeywords = ['figure', 'diagram', 'graph', 'image', 'illustration'];

const hasAttachmentReference = (content?: string) => {
  if (!content) return false;

  const normalized = content.toLowerCase();
  return attachmentKeywords.some((keyword) => normalized.includes(keyword));
};

export const questionNeedsAttachment = (question: Question) => {
  const questionNeeds = hasAttachmentReference(question.question_description);
  const questionHasAttachment = (question.attachments?.length ?? 0) > 0;

  if (questionNeeds && !questionHasAttachment) {
    return true;
  }

  return question.parts.some((part) => subQuestionNeedsAttachment(part));
};

export const subQuestionNeedsAttachment = (subQuestion: SubQuestion) => {
  const needsAttachment = hasAttachmentReference(subQuestion.question_description);
  const hasAttachment = (subQuestion.attachments?.length ?? 0) > 0;

  return needsAttachment && !hasAttachment;
};

export const getDifficultyClassName = (difficulty?: string) => {
  switch (difficulty) {
    case 'easy':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'medium':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    case 'hard':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

export const getQuestionStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return 'Confirmed';
    case 'qa_review':
      return 'QA Review';
    case 'draft':
      return 'Draft';
    default:
      return status ? status.replace('_', ' ') : 'Unknown';
  }
};

export const getPaperStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return 'Published';
    case 'qa_review':
      return 'Under QA';
    case 'draft':
      return 'Draft';
    case 'inactive':
      return 'Archived';
    default:
      return status ? status.replace('_', ' ') : 'Unknown';
  }
};

/**
 * Natural sort function for question numbers
 * Handles alphanumeric sorting correctly (1, 2, 3, ..., 10, 11 AND 1a, 1b, 2a, 2b)
 * @param a First question number
 * @param b Second question number
 * @returns Sort comparison result
 */
export const naturalSort = (a: string, b: string): number => {
  // Split strings into numeric and text parts
  const regex = /(\d+)|(\D+)/g;
  const aParts = a.match(regex) || [];
  const bParts = b.match(regex) || [];

  const maxLength = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLength; i++) {
    const aPart = aParts[i] || '';
    const bPart = bParts[i] || '';

    // If one part is missing, the shorter one comes first
    if (!aPart) return -1;
    if (!bPart) return 1;

    const aIsNum = /^\d+$/.test(aPart);
    const bIsNum = /^\d+$/.test(bPart);

    if (aIsNum && bIsNum) {
      // Both are numbers, compare numerically
      const diff = parseInt(aPart, 10) - parseInt(bPart, 10);
      if (diff !== 0) return diff;
    } else if (aIsNum) {
      // Numbers come before text
      return -1;
    } else if (bIsNum) {
      // Text comes after numbers
      return 1;
    } else {
      // Both are text, compare alphabetically
      const textCompare = aPart.localeCompare(bPart);
      if (textCompare !== 0) return textCompare;
    }
  }

  return 0;
};

/**
 * Format part label with consistent styling
 * Converts various input formats to standardized display format
 * @param label The part label (e.g., "a", "Part a", "(a)", "i", etc.)
 * @param index Fallback index if no label provided
 * @returns Formatted part label (e.g., "Part (a)")
 */
export const formatPartLabel = (label?: string | null, index?: number): string => {
  if (!label && typeof index === 'number') {
    // Generate label from index: 0 -> a, 1 -> b, etc.
    const letter = String.fromCharCode(97 + index);
    return `Part (${letter})`;
  }

  if (!label) {
    return 'Part';
  }

  // Clean the label
  let cleanLabel = label.trim();

  // If already in format "Part (x)" or "Part x", return as is
  if (/^Part\s*\([a-z0-9]+\)$/i.test(cleanLabel)) {
    return cleanLabel;
  }

  // Extract the actual letter/number from various formats
  let match = cleanLabel.match(/\(([a-z0-9]+)\)/i);
  if (match) {
    return `Part (${match[1].toLowerCase()})`;
  }

  // Try to extract from "Part a", "Part 1", etc.
  match = cleanLabel.match(/Part\s+([a-z0-9]+)/i);
  if (match) {
    return `Part (${match[1].toLowerCase()})`;
  }

  // If it's just a letter or number, wrap it
  if (/^[a-z0-9]+$/i.test(cleanLabel)) {
    return `Part (${cleanLabel.toLowerCase()})`;
  }

  // Default: return what we have with "Part" prefix if missing
  if (!cleanLabel.toLowerCase().startsWith('part')) {
    return `Part ${cleanLabel}`;
  }

  return cleanLabel;
};

/**
 * Get the short label for part badge display
 * Extracts just the letter/number for compact display
 * @param label The part label
 * @param index Fallback index
 * @returns Short label (e.g., "a", "i", "1")
 */
export const getPartShortLabel = (label?: string | null, index?: number): string => {
  if (!label && typeof index === 'number') {
    return String.fromCharCode(97 + index);
  }

  if (!label) {
    return '?';
  }

  // Try to extract from parentheses
  let match = label.match(/\(([a-z0-9]+)\)/i);
  if (match) {
    return match[1].toLowerCase();
  }

  // Try to extract from "Part a", "Part 1", etc.
  match = label.match(/Part\s+([a-z0-9]+)/i);
  if (match) {
    return match[1].toLowerCase();
  }

  // If it's just a letter or number
  if (/^[a-z0-9]+$/i.test(label.trim())) {
    return label.trim().toLowerCase();
  }

  // Default: take last character or first character
  const cleaned = label.trim();
  return cleaned.charAt(cleaned.length - 1) || cleaned.charAt(0) || '?';
};

/**
 * Sort sub-questions by their part labels naturally
 * Handles alphabetical (a, b, c) and roman numerals (i, ii, iii)
 */
export const sortSubQuestionsByLabel = (parts: SubQuestion[]): SubQuestion[] => {
  return [...parts].sort((a, b) => {
    const labelA = getPartShortLabel(a.part_label, 0);
    const labelB = getPartShortLabel(b.part_label, 0);

    // Use natural sort for the labels
    return naturalSort(labelA, labelB);
  });
};

