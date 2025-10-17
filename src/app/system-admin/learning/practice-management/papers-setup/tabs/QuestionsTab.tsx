// src/app/system-admin/learning/practice-management/papers-setup/tabs/QuestionsTab.tsx

/**
 * QuestionsTab Component - Enhanced with Exam Simulation
 * 
 * FIXED VERSION: Corrected attachment handling and validation
 * 
 * Key fixes:
 * - Standardized attachment key generation
 * - Fixed validation to check correct attachment keys
 * - Fixed scroll-to-question functionality
 * - Ensured attachment state synchronization
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  AlertCircle, CheckCircle, XCircle, AlertTriangle, Edit2, Save, X, 
  ChevronDown, ChevronRight, FileText, Image, Upload, Scissors, 
  Trash2, Eye, Link, BarChart3, Paperclip, Clock, Hash, Database,
  Loader2, Info, RefreshCw, ImageOff, Plus, Copy, FlaskConical,
  Calculator, PenTool, Table, Code, Mic, LineChart, FileUp,
  HelpCircle, BookOpen, Lightbulb, Target, Award, PlayCircle,
  Flag, CheckSquare, FileCheck, ShieldCheck
} from 'lucide-react';

// Import shared components
import { Button } from '../../../../../../components/shared/Button';
import { toast } from '../../../../../../components/shared/Toast';
import { PDFSnippingTool } from '../../../../../../components/shared/PDFSnippingTool';
import { ConfirmationDialog } from '../../../../../../components/shared/ConfirmationDialog';
import { StatusBadge } from '../../../../../../components/shared/StatusBadge';
import { type ReviewStatus } from '../../../../../../components/shared/QuestionReviewStatus';
import { DataTableSkeleton } from '../../../../../../components/shared/DataTableSkeleton';
import { Select } from '../../../../../../components/shared/Select';
import { SearchableMultiSelect } from '../../../../../../components/shared/SearchableMultiSelect';

// Import UnifiedTestSimulation component
import { UnifiedTestSimulation } from '../../../../../../components/shared/UnifiedTestSimulation';

// Import data operations (with optional validateQuestionsForImport)
import {
  fetchDataStructureInfo,
  fetchImportedQuestions,
  checkExistingQuestions,
  autoMapQuestions,
  importQuestions,
  fixIncompleteQuestions,
  getQuestionDescription,
  requiresFigure,
  detectAnswerFormat,
  ensureArray,
  ensureString,
  type QuestionMapping,
  type DataStructureInfo,
  type ImportResult
} from '../../../../../../lib/data-operations/questionsDataOperations';

// Import extraction parsers
import {
  parseForwardSlashAnswers,
  extractAllValidAlternatives,
  getAlternativeCount
} from '../../../../../../lib/extraction/forwardSlashParser';
import {
  parseAndOrOperators,
  analyzeAnswerLogic,
  extractRequiredComponents,
  extractOptionalComponents
} from '../../../../../../lib/extraction/andOrOperatorParser';
import {
  validateAnswerStructure,
  batchValidateAnswers,
  getValidationSummary,
  type ValidationIssue
} from '../../../../../../lib/extraction/answerValidator';
import {
  validateQuestionsBeforeImport,
  formatValidationErrors,
  getValidationReportSummary,
  type PreImportValidationResult
} from '../../../../../../lib/extraction/preImportValidation';
import {
  deriveAnswerRequirement,
  type AnswerRequirement
} from '../../../../../../lib/extraction/answerRequirementDeriver';

// Import sub-components and utilities
import { QuestionsReviewSection } from './components/QuestionsReviewSection';
import QuestionSupportMatrix from './components/QuestionSupportMatrix';
import DynamicAnswerField from '../../../../../../components/shared/DynamicAnswerField';
import { QuestionImportReviewWorkflow } from '../../../../../../components/shared/QuestionImportReviewWorkflow';
import type { QuestionDisplayData } from '../../../../../../components/shared/EnhancedQuestionDisplay';
import { supabase } from '../../../../../../lib/supabase';
import { cn } from '../../../../../../lib/utils';
import { ExtractionRules, QuestionSupportSummary } from '../types';
import { ErrorBoundary } from '../../../../../../components/shared/ErrorBoundary';

// Try to import validateQuestionsForImport if it exists
let validateQuestionsForImport: any;
try {
  const dataOps = require('../../../../../../lib/data-operations/questionsDataOperations');
  validateQuestionsForImport = dataOps.validateQuestionsForImport;
} catch (e) {
  console.warn('validateQuestionsForImport not available, using fallback validation');
}

// Answer format configuration for better UI/UX
const answerFormatConfig = {
  single_word: { icon: Hash, color: 'blue', label: 'Single Word', hint: 'One word answer expected' },
  single_line: { icon: FileText, color: 'blue', label: 'Short Answer', hint: 'Brief answer in one line' },
  two_items: { icon: Copy, color: 'purple', label: 'Two Items', hint: 'Two separate answers required' },
  two_items_connected: { icon: Link, color: 'purple', label: 'Connected Items', hint: 'Two related items (e.g., X and Y)' },
  multi_line: { icon: FileText, color: 'indigo', label: 'Multi-line', hint: 'Detailed answer with multiple points' },
  multi_line_labeled: { icon: BookOpen, color: 'indigo', label: 'Labeled Parts', hint: 'Answer with labeled sections (A, B, C...)' },
  calculation: { icon: Calculator, color: 'green', label: 'Calculation', hint: 'Show working and final answer' },
  equation: { icon: Calculator, color: 'green', label: 'Equation', hint: 'Mathematical or chemical equation' },
  chemical_structure: { icon: FlaskConical, color: 'orange', label: 'Chemical Structure', hint: 'Draw molecular structure' },
  structural_diagram: { icon: FlaskConical, color: 'orange', label: 'Structural Diagram', hint: 'Draw structural representation' },
  diagram: { icon: PenTool, color: 'pink', label: 'Diagram', hint: 'Draw or sketch diagram' },
  table: { icon: Table, color: 'cyan', label: 'Table', hint: 'Organize data in table format' },
  graph: { icon: LineChart, color: 'teal', label: 'Graph', hint: 'Plot graph with labeled axes' },
  code: { icon: Code, color: 'gray', label: 'Code', hint: 'Write programming code' },
  audio: { icon: Mic, color: 'red', label: 'Audio Recording', hint: 'Record audio response' },
  file_upload: { icon: FileUp, color: 'yellow', label: 'File Upload', hint: 'Upload document or file' }
};

const manualAnswerFormats = new Set([
  'diagram',
  'chemical_structure',
  'structural_diagram',
  'table',
  'graph',
  'multi_line',
  'multi_line_labeled',
  'file_upload'
]);

const sanitizeQuestionForStorage = (question: unknown): any => {
  const transform = (value: any): any => {
    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map(transform);
    }

    if (value && typeof value === 'object') {
      const result: Record<string, any> = {};
      Object.entries(value as Record<string, any>).forEach(([key, nestedValue]) => {
        const transformed = transform(nestedValue);
        if (transformed !== undefined) {
          result[key] = transformed;
        }
      });
      return result;
    }

    return value;
  };

  try {
    if (typeof structuredClone === 'function') {
      return transform(structuredClone(question));
    }
  } catch (error) {
    console.warn('structuredClone failed when sanitizing question data:', error);
  }

  try {
    return JSON.parse(
      JSON.stringify(question, (_, value) => (typeof value === 'bigint' ? value.toString() : value))
    );
  } catch (error) {
    console.warn('JSON serialization failed when sanitizing question data:', error);
    return transform(question);
  }
};

type InlineConfirmationOptions = {
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: string;
};

type PendingConfirmationState = InlineConfirmationOptions & {
  resolve: (value: boolean) => void;
};

const normalizeText = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
};

const isExactTextMatch = (a: any, b: any): boolean => {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);
  return normalizedA !== '' && normalizedA === normalizedB;
};

const isLooseTextMatch = (a: any, b: any): boolean => {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);
  if (!normalizedA || !normalizedB) return false;
  return normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA);
};

const findUniqueMatch = <T,>(
  items: T[],
  candidate: any,
  getters: Array<(item: T) => any>
): T | null => {
  const normalizedCandidate = normalizeText(candidate);
  if (!normalizedCandidate) return null;

  for (const getter of getters) {
    const exactMatches = items.filter(item => isExactTextMatch(getter(item), candidate));
    if (exactMatches.length === 1) {
      return exactMatches[0];
    }
  }

  for (const getter of getters) {
    const looseMatches = items.filter(item => isLooseTextMatch(getter(item), candidate));
    if (looseMatches.length === 1) {
      return looseMatches[0];
    }
  }

  return null;
};

const extractNameCandidates = (value: any): string[] => {
  if (value === null || value === undefined) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap(item => extractNameCandidates(item))
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,/]/)
      .map(part => part.trim())
      .filter(part => part.length > 0);
  }

  return [String(value)];
};

interface QuestionsTabProps {
  importSession: any;
  parsedData: any;
  existingPaperId: string | null;
  savedPaperDetails: any;
  onPrevious: () => void;
  onContinue: () => void;
  extractionRules?: ExtractionRules;
  updateStagedAttachments?: (questionId: string, attachments: any[]) => void;
  stagedAttachments?: Record<string, any[]>;
}

interface ProcessedQuestion {
  id: string;
  question_number: string;
  question_text: string;
  question_type: string;
  marks: number;
  unit?: string;
  unit_id?: string | null;
  topic: string;
  topic_id?: string | null;
  subtopic: string;
  subtopic_id?: string | null;
  difficulty: string;
  status: string;
  figure: boolean;
  figure_required?: boolean;
  attachments: string[];
  hint?: string;
  explanation?: string;
  answer_format?: string;
  answer_requirement?: string;
  total_alternatives?: number;
  parts?: ProcessedPart[];
  correct_answers?: ProcessedAnswer[];
  options?: ProcessedOption[];
  mcq_type?: string;
  match_pairs?: any[];
  left_column?: any[];
  right_column?: any[];
  correct_sequence?: any[];
  partial_credit?: any;
  partial_marking?: any;
  conditional_marking?: any;
  // Store original data for mapping
  original_topics?: string[];
  original_subtopics?: string[];
  original_unit?: string;
  // Simulation tracking
  simulation_flags?: string[];
  simulation_notes?: string;
}

interface ProcessedPart {
  id?: string; // Add id field for parts
  part: string;
  question_text: string;
  marks: number;
  answer_format: string;
  answer_requirement?: string;
  figure?: boolean;
  figure_required?: boolean;
  attachments?: string[];
  hint?: string;
  explanation?: string;
  subparts?: ProcessedSubpart[];
  correct_answers?: ProcessedAnswer[];
  options?: ProcessedOption[];
  requires_manual_marking?: boolean;
  marking_criteria?: any;
  mcq_type?: string;
  match_pairs?: any[];
  left_column?: any[];
  right_column?: any[];
  correct_sequence?: any[];
  partial_credit?: any;
  partial_marking?: any;
  conditional_marking?: any;
}

interface ProcessedSubpart {
  id?: string; // Add id field for subparts
  subpart: string;
  question_text: string;
  marks: number;
  answer_format: string;
  answer_requirement?: string;
  correct_answers?: ProcessedAnswer[];
  options?: ProcessedOption[];
  hint?: string;
  explanation?: string;
  figure?: boolean; // Add figure field to track requirement
  figure_required?: boolean;
  mcq_type?: string;
  match_pairs?: any[];
  left_column?: any[];
  right_column?: any[];
  correct_sequence?: any[];
  partial_credit?: any;
  partial_marking?: any;
  conditional_marking?: any;
}

interface ProcessedAnswer {
  answer: string;
  marks: number;
  alternative_id: number;
  linked_alternatives?: number[];
  alternative_type?: string;
  context?: any;
  unit?: string;
  measurement_details?: any;
  accepts_equivalent_phrasing?: boolean;
  error_carried_forward?: boolean;
  answer_requirement?: string;
  total_alternatives?: number;
  validation_issues?: string[];
  answer_logic?: 'simple' | 'all_required' | 'any_accepted' | 'complex';
  required_components?: string[];
  optional_components?: string[];
  needs_context?: boolean;
}

interface ProcessedOption {
  label: string;
  text: string;
  is_correct: boolean;
}

interface SimulationResult {
  completed: boolean;
  completedAt?: string;
  flaggedQuestions: string[];
  issues: Array<{
    questionId: string;
    type: 'error' | 'warning' | 'info';
    message: string;
  }>;
  recommendations: string[];
  overallScore?: number;
  timeSpent?: number;
}

// FIXED: Standardized attachment key generation
const generateAttachmentKey = (questionId: string, partIndex?: number, subpartIndex?: number): string => {
  let key = questionId;
  if (partIndex !== undefined) {
    key += `_p${partIndex}`;
  }
  if (subpartIndex !== undefined) {
    key += `_s${subpartIndex}`;
  }
  return key;
};

type SimulationAttachment = {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
};

const guessMimeTypeFromSource = (source: string): string | undefined => {
  if (!source) {
    return undefined;
  }

  if (source.startsWith('data:')) {
    const mime = source.slice(5, source.indexOf(';'));
    return mime || undefined;
  }

  const extensionMatch = source.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  if (!extensionMatch) {
    return undefined;
  }

  const extension = extensionMatch[1].toLowerCase();
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };

  return mimeMap[extension];
};

const deriveFileNameFromUrl = (source: string): string | undefined => {
  if (!source || source.startsWith('data:')) {
    return undefined;
  }

  const cleaned = source.split('?')[0].split('#')[0];
  const segments = cleaned.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  return lastSegment ? decodeURIComponent(lastSegment) : undefined;
};

const normalizeAttachmentForSimulation = (
  attachment: any,
  fallbackPrefix: string,
  index: number
): SimulationAttachment | null => {
  if (!attachment) {
    return null;
  }

  if (typeof attachment === 'string') {
    const trimmed = attachment.trim();
    if (!trimmed) {
      return null;
    }

    const fileName = deriveFileNameFromUrl(trimmed) || `Attachment_${index + 1}`;
    const fileType = guessMimeTypeFromSource(trimmed) || 'image/png';

    return {
      id: `${fallbackPrefix}_att_${index}`,
      file_url: trimmed,
      file_name: fileName,
      file_type: fileType
    };
  }

  const urlCandidates = [
    attachment.file_url,
    attachment.url,
    attachment.dataUrl,
    attachment.data,
    attachment.preview,
    attachment.publicUrl,
    attachment.public_url,
    attachment.signedUrl,
    attachment.signed_url,
    attachment.path
  ];

  const fileUrl = urlCandidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0)?.trim();

  if (!fileUrl) {
    return null;
  }

  const nameCandidates = [
    attachment.file_name,
    attachment.name,
    attachment.fileName,
    attachment.originalName,
    attachment.filename,
    attachment.title
  ];

  const resolvedName = nameCandidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0)?.trim();
  const fileName = resolvedName || deriveFileNameFromUrl(fileUrl) || `Attachment_${index + 1}`;

  const typeCandidates = [attachment.file_type, attachment.type, attachment.mime_type];
  const resolvedType = typeCandidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0)?.trim();
  const fileType = resolvedType || guessMimeTypeFromSource(fileUrl) || 'image/png';

  return {
    id: String(attachment.id ?? `${fallbackPrefix}_att_${index}`),
    file_url: fileUrl,
    file_name: fileName,
    file_type: fileType
  };
};

const mergeAttachmentSources = (
  primary: any,
  secondary: any,
  fallbackPrefix: string
): SimulationAttachment[] => {
  const primaryArray = ensureArray(primary);
  const secondaryArray = ensureArray(secondary);
  const combined = [
    ...primaryArray.map((item, index) => ({ item, index })),
    ...secondaryArray.map((item, index) => ({ item, index: index + primaryArray.length }))
  ];

  const seen = new Set<string>();

  return combined.reduce<SimulationAttachment[]>((acc, { item, index }) => {
    const normalized = normalizeAttachmentForSimulation(item, fallbackPrefix, index);

    if (normalized) {
      const dedupeKey = `${normalized.file_url}::${normalized.file_name}`;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        acc.push(normalized);
      }
    }

    return acc;
  }, []);
};

function QuestionsTabInner({
  importSession,
  parsedData,
  existingPaperId,
  savedPaperDetails,
  onPrevious,
  onContinue,
  extractionRules,
  updateStagedAttachments,
  stagedAttachments = {}
}: QuestionsTabProps) {
  // Critical data validation - prevent rendering with invalid state
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  // State management
  const [questions, setQuestions] = useState<ProcessedQuestion[]>([]);
  const [paperMetadata, setPaperMetadata] = useState<any>({
    title: '',
    exam_board: '',
    qualification: '',
    subject: '',
    paper_code: '',
    paper_name: '',
    exam_year: '',
    exam_session: '',
    paper_duration: '',
    total_marks: 0,
  });
  const [expandedQuestions, setExpandedQuestions] = useState(new Set<string>());
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [editingMetadata, setEditingMetadata] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [showSnippingTool, setShowSnippingTool] = useState(false);
  const [attachmentTarget, setAttachmentTarget] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmationState | null>(null);
  const [pdfFile, setPdfFile] = useState<any>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Record<string, any[]>>({});
  const [deleteAttachmentConfirm, setDeleteAttachmentConfirm] = useState<any>(null);
  const [showValidation, setShowValidation] = useState(false);
  
  // Data structure states
  const [dataStructureInfo, setDataStructureInfo] = useState<DataStructureInfo | null>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [subtopics, setSubtopics] = useState<any[]>([]);
  const [questionMappings, setQuestionMappings] = useState<Record<string, QuestionMapping>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [isImporting, setIsImporting] = useState(false);
  const [existingQuestionNumbers, setExistingQuestionNumbers] = useState<Set<number>>(new Set());
  const [autoMappingInProgress, setAutoMappingInProgress] = useState(false);
  const [academicStructureLoaded, setAcademicStructureLoaded] = useState(false);

  // Simulation states
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationPaper, setSimulationPaper] = useState<any>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  // Review workflow states
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, ReviewStatus>>({});
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [currentReviewerId, setCurrentReviewerId] = useState<string | null>(null);

  const requestInlineConfirmation = useCallback(
    (options: InlineConfirmationOptions) =>
      new Promise<boolean>(resolve => {
        console.log('📋 Requesting inline confirmation:', options.title);
        setPendingConfirmation({
          ...options,
          resolve,
        });
      }),
    []
  );

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const questionsRef = useRef<Record<string, HTMLDivElement>>({});
  const reviewSyncPromiseRef = useRef<Promise<void> | null>(null);

  const paperTitleForMetadata = useMemo(
    () => savedPaperDetails?.paper_name || paperMetadata.title || '',
    [savedPaperDetails?.paper_name, paperMetadata.title]
  );

  const paperCodeForMetadata = useMemo(
    () => savedPaperDetails?.paper_code || paperMetadata.paper_code || '',
    [savedPaperDetails?.paper_code, paperMetadata.paper_code]
  );

  // Helper arrays
  const Roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];

  // Helper function to compute question support summary
  const computeQuestionSupportSummary = (items: ProcessedQuestion[]): QuestionSupportSummary => {
    const summary: QuestionSupportSummary = {
      totalQuestions: items.length,
      questionTypeCounts: {},
      answerFormatCounts: {},
      answerRequirementCounts: {},
      optionTypeCounts: {},
      contextTypes: {},
      structureFlags: {
        hasParts: false,
        hasSubparts: false,
        hasFigures: false,
        hasAttachments: false,
        hasContext: false,
        hasHints: false,
        hasExplanations: false,
        hasOptions: false,
        hasMatching: false,
        hasSequencing: false
      },
      logicFlags: {
        alternativeLinking: false,
        allRequired: false,
        anyOf: false,
        alternativeMethods: false,
        contextUsage: false,
        multiMark: false,
        componentMarking: false,
        manualMarking: false,
        partialCredit: false,
        errorCarriedForward: false,
        reverseArgument: false,
        acceptsEquivalentPhrasing: false
      }
    };

    const incrementCount = (map: Record<string, number>, key?: string | null) => {
      if (!key) return;
      const normalized = String(key);
      map[normalized] = (map[normalized] || 0) + 1;
    };

    const registerContextType = (type?: string | null) => {
      if (!type) return;
      const normalized = String(type);
      summary.contextTypes[normalized] = (summary.contextTypes[normalized] || 0) + 1;
    };

    const registerRequirement = (requirement?: string) => {
      if (!requirement) return;
      incrementCount(summary.answerRequirementCounts, requirement);
      const normalized = requirement.toLowerCase();
      if (normalized.includes('any')) {
        summary.logicFlags.anyOf = true;
        summary.logicFlags.alternativeLinking = true;
      }
      if (normalized.includes('all') || normalized.includes('both')) {
        summary.logicFlags.allRequired = true;
      }
      if (normalized.includes('alternative')) {
        summary.logicFlags.alternativeMethods = true;
      }
      if (normalized.includes('owtte')) {
        summary.logicFlags.acceptsEquivalentPhrasing = true;
      }
      if (normalized.includes('ecf')) {
        summary.logicFlags.errorCarriedForward = true;
      }
      if (normalized.includes('ora')) {
        summary.logicFlags.reverseArgument = true;
      }
    };

    const registerAnswer = (answer?: ProcessedAnswer) => {
      if (!answer) return;

      if (answer.context) {
        summary.structureFlags.hasContext = true;
        summary.logicFlags.contextUsage = true;
        if (Array.isArray(answer.context)) {
          answer.context.forEach((ctx: any) => {
            if (ctx?.type) {
              registerContextType(ctx.type);
            }
          });
        } else if (typeof answer.context === 'object' && answer.context.type) {
          registerContextType(answer.context.type);
        }
      }

      if (answer.unit) {
        summary.structureFlags.hasContext = true;
        summary.logicFlags.contextUsage = true;
        registerContextType('unit');
      }

      if (answer.measurement_details) {
        summary.structureFlags.hasContext = true;
        summary.logicFlags.contextUsage = true;
        registerContextType('measurement');
      }

      if (typeof answer.marks === 'number' && answer.marks > 1) {
        summary.logicFlags.multiMark = true;
      }

      if (answer.partial_credit || answer.partial_marks) {
        summary.logicFlags.partialCredit = true;
      }

      if (answer.error_carried_forward) {
        summary.logicFlags.errorCarriedForward = true;
      }

      if (answer.accepts_reverse_argument) {
        summary.logicFlags.reverseArgument = true;
      }

      if (answer.accepts_equivalent_phrasing) {
        summary.logicFlags.acceptsEquivalentPhrasing = true;
      }

      if (typeof answer.total_alternatives === 'number' && answer.total_alternatives > 1) {
        summary.logicFlags.alternativeLinking = true;
      }

      if (Array.isArray(answer.linked_alternatives) && answer.linked_alternatives.length > 0) {
        summary.logicFlags.alternativeLinking = true;
      }

      if (answer.alternative_type) {
        const normalized = answer.alternative_type.toLowerCase();
        if (normalized.includes('all') || normalized.includes('both')) {
          summary.logicFlags.allRequired = true;
        }
        if (normalized.includes('any') || normalized.includes('one')) {
          summary.logicFlags.anyOf = true;
          summary.logicFlags.alternativeLinking = true;
        }
        if (normalized.includes('alt')) {
          summary.logicFlags.alternativeMethods = true;
        }
      }

      if (answer.answer_requirement) {
        registerRequirement(answer.answer_requirement);
      }
    };

    const registerAnswerCarrier = (item?: {
      answer_format?: string;
      answer_requirement?: string;
      correct_answers?: ProcessedAnswer[];
      marks?: number;
      figure?: boolean;
      figure_required?: boolean;
      attachments?: any[];
      hint?: string;
      explanation?: string;
      requires_manual_marking?: boolean;
      mcq_type?: string;
      match_pairs?: any[];
      left_column?: any[];
      right_column?: any[];
      correct_sequence?: any[];
      partial_credit?: any;
      partial_marking?: any;
      conditional_marking?: any;
      context_type?: string;
      context_fields?: Array<{ type?: string }>;
      options?: ProcessedOption[];
    }) => {
      if (!item) return;

      if (item.answer_format) {
        incrementCount(summary.answerFormatCounts, item.answer_format);
        if (manualAnswerFormats.has(item.answer_format)) {
          summary.logicFlags.manualMarking = true;
        }
      }

      registerRequirement(item.answer_requirement);

      if (item.context_type) {
        summary.structureFlags.hasContext = true;
        summary.logicFlags.contextUsage = true;
        registerContextType(item.context_type);
      }

      if (Array.isArray(item.context_fields) && item.context_fields.length > 0) {
        summary.structureFlags.hasContext = true;
        summary.logicFlags.contextUsage = true;
        item.context_fields.forEach(field => registerContextType(field?.type));
      }

      if (Array.isArray((item as any).options) && (item as any).options.length > 0) {
        summary.structureFlags.hasOptions = true;
        const optionType = item.mcq_type || item.answer_requirement || 'multiple_choice';
        incrementCount(summary.optionTypeCounts, optionType);
      }

      if (item.match_pairs || (item.left_column && item.right_column)) {
        summary.structureFlags.hasMatching = true;
        incrementCount(summary.optionTypeCounts, 'matching');
      }

      if (item.correct_sequence && Array.isArray(item.correct_sequence) && item.correct_sequence.length > 0) {
        summary.structureFlags.hasSequencing = true;
        incrementCount(summary.optionTypeCounts, 'sequencing');
      }

      if (item.partial_credit || item.partial_marking) {
        summary.logicFlags.partialCredit = true;
      }

      if (Array.isArray(item.correct_answers) && item.correct_answers.length > 0) {
        if (item.correct_answers.length > 1) {
          summary.logicFlags.alternativeLinking = true;
        }
        item.correct_answers.forEach(registerAnswer);
      }

      if (typeof item.marks === 'number' && item.marks > 1) {
        summary.logicFlags.multiMark = true;
      }

      if (item.hint) {
        summary.structureFlags.hasHints = true;
      }

      if (item.explanation) {
        summary.structureFlags.hasExplanations = true;
      }

      if (item.figure || item.figure_required) {
        summary.structureFlags.hasFigures = true;
      }

      if (Array.isArray(item.attachments) && item.attachments.length > 0) {
        summary.structureFlags.hasAttachments = true;
      }

      if (item.requires_manual_marking) {
        summary.logicFlags.manualMarking = true;
      }
    };

    items.forEach(question => {
      incrementCount(summary.questionTypeCounts, question.question_type || 'descriptive');

      if (question.parts && question.parts.length > 0) {
        summary.structureFlags.hasParts = true;
      }

      registerAnswerCarrier(question);

      if (question.parts) {
        question.parts.forEach(part => {
          registerAnswerCarrier(part);
          if (part.subparts && part.subparts.length > 0) {
            summary.structureFlags.hasSubparts = true;
            part.subparts.forEach(subpart => {
              registerAnswerCarrier(subpart);
            });
          }
        });
      }
    });

    summary.logicFlags.componentMarking = summary.structureFlags.hasParts || summary.structureFlags.hasSubparts;

    return summary;
  };

  const questionSupportSummary = useMemo<QuestionSupportSummary>(
    () => computeQuestionSupportSummary(questions),
    [questions]
  );

  // Calculate average marks for display
  const averageMarks = useMemo(() => {
    if (questions.length === 0) return 0;
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
    return totalMarks / questions.length;
  }, [questions]);

  // Add global error handler for debugging - MUST BE AFTER STATE DECLARATIONS
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('=== GLOBAL ERROR CAUGHT ===');
      console.error('Error:', event.error);
      console.error('Message:', event.message);
      console.error('Source:', event.filename);
      console.error('Line:', event.lineno, 'Column:', event.colno);
      toast.error(`JavaScript Error: ${event.message}`, { duration: 5000 });
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('=== UNHANDLED PROMISE REJECTION ===');
      console.error('Reason:', event.reason);
      toast.error(`Unhandled Promise: ${event.reason}`, { duration: 5000 });
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Test function for debugging - accessible from console
    (window as any).testImportButton = () => {
      console.log('=== TEST IMPORT BUTTON ===');
      console.log('Questions:', questions);
      console.log('Mappings:', questionMappings);
      console.log('Attachments:', attachments);
      console.log('DataStructure:', dataStructureInfo);
      console.log('ExistingPaperId:', existingPaperId);
      console.log('RequiresFigure function exists:', typeof requiresFigure === 'function');
      console.log('ValidateQuestionsForImport exists:', typeof validateQuestionsForImport === 'function');
      
      // Try to run validation
      try {
        const errors = validateQuestionsWithAttachments();
        console.log('Validation successful, errors:', errors);
      } catch (err) {
        console.error('Validation failed:', err);
      }
      
      return 'Test complete - check console for results';
    };
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      delete (window as any).testImportButton;
    };
  }, [questions, questionMappings, attachments, dataStructureInfo, existingPaperId]);

  // Safe wrapper for requiresFigure function
  const safeRequiresFigure = (item: any): boolean => {
    try {
      if (typeof requiresFigure === 'function') {
        return requiresFigure(item);
      }
      // Fallback logic if function is not available
      if (item?.figure) return true;
      const text = (item?.question_text || item?.question || '').toLowerCase();
      return text.includes('figure') || text.includes('diagram') || text.includes('graph') || text.includes('image');
    } catch (error) {
      console.warn('Error in requiresFigure:', error);
      return item?.figure || false;
    }
  };

  const resolveFigureFlag = (item: any): boolean => {
    if (!item) return false;
    if (typeof item.figure === 'boolean') {
      return item.figure;
    }
    return safeRequiresFigure(item);
  };

  const resolveFigureRequirement = (item: any): boolean => {
    if (!item) return false;
    if (typeof item.figure_required === 'boolean') {
      return item.figure_required;
    }
    return resolveFigureFlag(item);
  };

  // Helper function to parse answer requirement from mark scheme text
  // Returns undefined (not empty string) when unable to determine requirement
  const parseAnswerRequirement = (markSchemeText: string, marks: number): string | undefined => {
    if (!markSchemeText || typeof markSchemeText !== 'string') {
      return undefined;
    }

    const text = markSchemeText.toLowerCase();

    // Check for specific patterns
    if (text.includes('any two from') || text.includes('any 2 from')) {
      return 'any_2_from';
    }
    if (text.includes('any three from') || text.includes('any 3 from')) {
      return 'any_3_from';
    }
    if (text.includes('any one from') || text.includes('any 1 from')) {
      return 'single_choice';
    }
    if (text.includes('both required') || text.includes('both needed')) {
      return 'both_required';
    }
    if (text.includes('all required') || text.includes('all needed')) {
      return 'all_required';
    }
    if (text.includes('alternative method') || text.includes('alternative approach')) {
      return 'alternative_methods';
    }
    if (text.includes('owtte') || text.includes('words to that effect')) {
      return 'alternative_methods';
    }

    // IGCSE specific patterns
    if (text.includes('name') && text.includes('two') && !text.includes('between')) {
      return 'any_2_from';
    }
    if (text.includes('state') && text.includes('give') && text.includes('reason')) {
      return 'both_required';
    }
    if (text.includes('either') && text.includes('or')) {
      return 'single_choice';
    }

    // Check based on marks and answer count
    if (marks === 2 && text.includes(' and ')) {
      return 'both_required';
    }

    // Check for forward slashes indicating alternatives
    const slashCount = (text.match(/\//g) || []).length;
    if (slashCount >= 2) {
      return 'any_one_from';
    }
    
    return undefined;
  };

  // Fetch data structure information with retry logic
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const loadWithRetry = async () => {
      if (!savedPaperDetails?.data_structure_id) {
        console.warn('Cannot load data structure: data_structure_id is missing');
        return;
      }

      while (retryCount < maxRetries && isMounted) {
        try {
          await loadDataStructureInfo();
          break;
        } catch (error) {
          retryCount++;
          console.error(`Failed to load data structure (attempt ${retryCount}/${maxRetries}):`, error);

          if (retryCount < maxRetries && isMounted) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          } else if (isMounted) {
            toast.error('Failed to load academic structure. Some features may not work correctly.');
            setAcademicStructureLoaded(false);
          }
        }
      }
    };

    loadWithRetry();

    return () => {
      isMounted = false;
    };
  }, [savedPaperDetails?.data_structure_id]);

  const loadDataStructureInfo = async () => {
    try {
      setAcademicStructureLoaded(false);

      if (!savedPaperDetails?.data_structure_id) {
        throw new Error('Missing data_structure_id in savedPaperDetails');
      }

      const result = await fetchDataStructureInfo(savedPaperDetails.data_structure_id);

      // Validate the returned data structure
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid data structure response');
      }

      if (!result.dataStructure) {
        throw new Error('Missing dataStructure in response');
      }

      setDataStructureInfo(result.dataStructure);

      // Safely set units with validation
      const units = Array.isArray(result.units) ? result.units : [];
      setUnits(units);

      // Ensure topics are properly loaded with their relationships
      const allTopics = Array.isArray(result.topics) ? result.topics : [];
      const allSubtopics = Array.isArray(result.subtopics) ? result.subtopics : [];

      // Set all topics and subtopics
      setTopics(allTopics);
      setSubtopics(allSubtopics);

      console.log('Loaded data structure:', {
        units: units.length,
        topics: allTopics.length,
        subtopics: allSubtopics.length,
        topicSample: allTopics[0],
        subtopicSample: allSubtopics[0]
      });

      if (units.length === 0) {
        console.warn('No units loaded - this may cause mapping issues');
      }

      if (allTopics.length === 0) {
        console.warn('No topics loaded - this may cause mapping issues');
      }

      setAcademicStructureLoaded(true);
    } catch (error) {
      console.error('Error loading data structure info:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load academic structure information';
      toast.error(errorMessage);
      setAcademicStructureLoaded(false);
      throw error; // Re-throw for retry logic
    }
  };

  // Initialize questions from parsed data with comprehensive error handling
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        setInitializationError(null);
        setLoading(true);

        // Validate critical props before proceeding
        if (!importSession && !parsedData) {
          throw new Error('Missing required data: importSession or parsedData');
        }

        if (!existingPaperId) {
          console.warn('existingPaperId is not set, tab may not be fully initialized');
        }

        if (!savedPaperDetails?.data_structure_id) {
          throw new Error('Missing data_structure_id in savedPaperDetails');
        }

        if (parsedData) {
          if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
            throw new Error('Invalid parsedData: questions array is missing or malformed');
          }
          if (isMounted) {
            await initializeFromParsedData(parsedData);
          }
        } else if (importSession?.id) {
          if (isMounted) {
            await loadImportedQuestions();
          }
        }

        if (isMounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize QuestionsTab:', error);
        if (isMounted) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
          setInitializationError(errorMessage);
          toast.error(`Initialization failed: ${errorMessage}`);
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [importSession, parsedData, existingPaperId, savedPaperDetails]);

  // Check existing questions after questions are loaded
  useEffect(() => {
    if (questions.length > 0 && existingPaperId) {
      loadExistingQuestions();
    }
  }, [questions, existingPaperId]);

  useEffect(() => {
    let isCancelled = false;

    const runSync = async () => {
      if (reviewSyncPromiseRef.current) {
        try {
          await reviewSyncPromiseRef.current;
        } catch (previousError) {
          console.warn('Previous review sync failed:', previousError);
        }

        if (isCancelled) {
          return;
        }
      }

      const syncPromise = (async () => {
        if (!importSession?.id || questions.length === 0) {
          if (!isCancelled) {
            setReviewStatuses({});
            setReviewSessionId(null);
            setReviewLoading(false);
          }
          return;
        }

        if (!isCancelled) {
          setReviewLoading(true);
        }

        try {
          const {
            data: { user },
            error: authError
          } = await supabase.auth.getUser();

          if (authError) {
            throw authError;
          }

          if (!user) {
            if (!isCancelled) {
              setReviewStatuses(prev => {
                const fallback: Record<string, ReviewStatus> = {};
                questions.forEach(q => {
                  fallback[q.id] = prev[q.id] || { questionId: q.id, isReviewed: false };
                });
                return fallback;
              });
              setReviewLoading(false);
            }
            return;
          }

          if (!isCancelled) {
            setCurrentReviewerId(user.id);
          }

          let sessionId = reviewSessionId;

          if (!sessionId) {
            const { data: existingSession, error: sessionError } = await supabase
              .from('question_import_review_sessions')
              .select('*')
              .eq('paper_import_session_id', importSession.id)
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (sessionError) throw sessionError;
            if (existingSession) {
              sessionId = existingSession.id;
            }
          }

          if (!sessionId) {
            const { data: newSession, error: createError } = await supabase
              .from('question_import_review_sessions')
              .insert({
                paper_import_session_id: importSession.id,
                user_id: user.id,
                paper_id: existingPaperId,
                total_questions: questions.length,
                simulation_required: true,
                metadata: {
                  paper_title: paperTitleForMetadata,
                  paper_code: paperCodeForMetadata,
                  created_from_ui: 'QuestionsTab'
                }
              })
              .select()
              .single();

            if (createError) throw createError;
            sessionId = newSession.id;
          }

          if (!sessionId) return;

          if (!isCancelled) {
            setReviewSessionId(sessionId);
          }

          const { data: existingStatuses, error: statusesError } = await supabase
            .from('question_import_review_status')
            .select('*')
            .eq('review_session_id', sessionId);

          if (statusesError) throw statusesError;

          const statusMap: Record<string, ReviewStatus> = {};
          const missingQuestionIds: string[] = [];

          questions.forEach(q => {
            const match = existingStatuses?.find(status => status.question_identifier === q.id);
            if (match) {
              statusMap[q.id] = {
                questionId: q.id,
                isReviewed: match.is_reviewed,
                reviewedAt: match.reviewed_at || undefined,
                hasIssues: match.has_issues,
                issueCount: match.issue_count,
                needsAttention: match.needs_attention
              };
            } else {
              statusMap[q.id] = { questionId: q.id, isReviewed: false };
              missingQuestionIds.push(q.id);
            }
          });

          if (missingQuestionIds.length > 0) {
            const rows = missingQuestionIds
              .map(questionId => {
                const question = questions.find(q => q.id === questionId);
                if (!question) return null;

                const sanitizedQuestion = sanitizeQuestionForStorage(question);

                const questionIndex = questions.findIndex(q => q.id === questionId);
                const fallbackNumber = questionIndex >= 0 ? String(questionIndex + 1) : questionId;

                return {
                  review_session_id: sessionId,
                  question_identifier: questionId,
                  question_number: question.question_number ? String(question.question_number) : fallbackNumber,
                  question_data: sanitizedQuestion,
                  is_reviewed: false,
                  validation_status: 'pending'
                };
              })
              .filter((row): row is {
                review_session_id: string;
                question_identifier: string;
                question_number: string;
                question_data: any;
                is_reviewed: boolean;
                validation_status: string;
              } => row !== null);

            if (rows.length > 0) {
              const { error: upsertError } = await supabase
                .from('question_import_review_status')
                .upsert(rows, {
                  onConflict: 'review_session_id,question_identifier',
                  ignoreDuplicates: true
                });

              if (upsertError) throw upsertError;
            }
          }

          if (!isCancelled) {
            setReviewStatuses(statusMap);
          }

          const reviewedCount = Object.values(statusMap).filter(status => status.isReviewed).length;

          const sessionUpdate: Record<string, any> = {
            total_questions: questions.length,
            questions_reviewed: reviewedCount,
            updated_at: new Date().toISOString(),
            status: reviewedCount === questions.length && questions.length > 0 ? 'completed' : 'in_progress'
          };

          sessionUpdate.completed_at =
            sessionUpdate.status === 'completed' ? new Date().toISOString() : null;

          const { error: updateError } = await supabase
            .from('question_import_review_sessions')
            .update(sessionUpdate)
            .eq('id', sessionId);

          if (updateError) throw updateError;
        } catch (error) {
          console.error('Failed to synchronize review workflow:', error);
          if (!isCancelled) {
            // Provide more specific error messages
            let errorMessage = 'Unable to sync question review progress.';
            if (error instanceof Error) {
              if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Network error: Unable to connect to database. Working offline.';
              } else if (error.message.includes('auth')) {
                errorMessage = 'Authentication error: Please refresh the page and try again.';
              }
            }
            toast.error(errorMessage);

            // Set fallback review statuses to allow continued work
            setReviewStatuses(prev => {
              const fallback: Record<string, ReviewStatus> = {};
              questions.forEach(q => {
                fallback[q.id] = prev[q.id] || { questionId: q.id, isReviewed: false };
              });
              return fallback;
            });
          }
        } finally {
          if (!isCancelled) {
            setReviewLoading(false);
          }
        }
      })();

      reviewSyncPromiseRef.current = syncPromise;

      try {
        await syncPromise;
      } finally {
        if (reviewSyncPromiseRef.current === syncPromise) {
          reviewSyncPromiseRef.current = null;
        }
      }
    };

    runSync();

    return () => {
      isCancelled = true;
    };
  }, [importSession?.id, questions, existingPaperId, paperTitleForMetadata, paperCodeForMetadata]);

  // Auto-fill mappings from parsed data
  useEffect(() => {
    if (parsedData && questions.length > 0 && units.length > 0) {
      // Auto-fill mappings from parsed data if available
      const mappings: Record<string, QuestionMapping> = {};
      questions.forEach((q, index) => {
        // Check if parsed data has mapping information
        const originalQuestion = parsedData.questions?.[index];
        if (!originalQuestion) {
          mappings[q.id] = {
            chapter_id: '',
            topic_ids: [],
            subtopic_ids: []
          };
          return;
        }

        const toId = (value: any): string => (value === null || value === undefined ? '' : String(value));

        const matchUnit = (candidate: any) =>
          findUniqueMatch(units, candidate, [
            (unit: any) => unit.name,
            (unit: any) => unit.code,
            (unit: any) => unit.short_name,
            (unit: any) => unit.display_name
          ]);

        const matchTopicInList = (availableTopics: any[], name: string) =>
          findUniqueMatch(availableTopics, name, [
            (topic: any) => topic.name,
            (topic: any) => topic.code,
            (topic: any) => topic.alias
          ]);

        const matchSubtopicInList = (availableSubtopics: any[], name: string) =>
          findUniqueMatch(availableSubtopics, name, [
            (subtopic: any) => subtopic.name,
            (subtopic: any) => subtopic.code,
            (subtopic: any) => subtopic.alias
          ]);

        const unitCandidates = [
          originalQuestion.unit,
          originalQuestion.chapter,
          originalQuestion.unit_name,
          originalQuestion.chapter_name,
          originalQuestion.unit?.name,
          q.original_unit
        ];

        let chapterId = '';
        for (const candidate of unitCandidates) {
          const match = matchUnit(candidate);
          if (match) {
            chapterId = toId(match.id);
            break;
          }
        }

        const topicIdSet = new Set<string>();
        const subtopicIdSet = new Set<string>();

        const topicNames = [
          ...extractNameCandidates(originalQuestion.topics),
          ...extractNameCandidates(originalQuestion.topic),
          ...extractNameCandidates(q.original_topics),
          ...extractNameCandidates(q.topic)
        ];

        const subtopicNames = [
          ...extractNameCandidates(originalQuestion.subtopics),
          ...extractNameCandidates(originalQuestion.subtopic),
          ...extractNameCandidates(q.original_subtopics),
          ...extractNameCandidates(q.subtopic)
        ];

        const ensureUnitFromTopic = (topic: any) => {
          if (!topic) return;
          const topicUnitId = toId(topic.unit_id);
          if (!topicUnitId) return;
          if (!chapterId) {
            chapterId = topicUnitId;
          }
        };

        const considerTopic = (name: string) => {
          if (!name) return;

          const availableTopics = chapterId
            ? topics.filter(t => toId(t.unit_id) === chapterId)
            : topics;

          let match = matchTopicInList(availableTopics, name);

          if (!match && !chapterId) {
            match = matchTopicInList(topics, name);
          }

          if (match) {
            const matchUnitId = toId(match.unit_id);
            if (chapterId && matchUnitId && matchUnitId !== chapterId) {
              return;
            }

            ensureUnitFromTopic(match);

            const topicId = toId(match.id);
            if (topicId) {
              topicIdSet.add(topicId);
            }
          }
        };

        const considerSubtopic = (name: string) => {
          if (!name) return;

          const relatedSubtopics = topicIdSet.size > 0
            ? subtopics.filter(s => topicIdSet.has(toId(s.topic_id)))
            : [];

          let match = matchSubtopicInList(relatedSubtopics, name);

          if (!match) {
            match = matchSubtopicInList(subtopics, name);
          }

          if (!match) return;

          const parentTopic = topics.find(t => toId(t.id) === toId(match.topic_id));
          if (!parentTopic) return;

          const parentUnitId = toId(parentTopic.unit_id);
          if (chapterId && parentUnitId && parentUnitId !== chapterId) {
            return;
          }

          ensureUnitFromTopic(parentTopic);

          const parentTopicId = toId(parentTopic.id);
          if (parentTopicId) {
            topicIdSet.add(parentTopicId);
          }

          const subtopicId = toId(match.id);
          if (subtopicId) {
            subtopicIdSet.add(subtopicId);
          }
        };

        subtopicNames.forEach(considerSubtopic);
        topicNames.forEach(considerTopic);
        subtopicNames.forEach(considerSubtopic);

        if (!chapterId && topicIdSet.size > 0) {
          const inferredTopic = topics.find(t => toId(t.id) === Array.from(topicIdSet)[0]);
          if (inferredTopic) {
            chapterId = toId(inferredTopic.unit_id);
          }
        }

        if (chapterId) {
          const validTopicIds = Array.from(topicIdSet).filter(topicId => {
            const topic = topics.find(t => toId(t.id) === topicId);
            return topic && toId(topic.unit_id) === chapterId;
          });
          topicIdSet.clear();
          validTopicIds.forEach(id => topicIdSet.add(id));

          const validSubtopicIds = Array.from(subtopicIdSet).filter(subtopicId => {
            const subtopic = subtopics.find(s => toId(s.id) === subtopicId);
            if (!subtopic) return false;
            const parentTopic = topics.find(t => toId(t.id) === toId(subtopic.topic_id));
            if (!parentTopic || toId(parentTopic.unit_id) !== chapterId) {
              return false;
            }
            topicIdSet.add(toId(parentTopic.id));
            return true;
          });
          subtopicIdSet.clear();
          validSubtopicIds.forEach(id => subtopicIdSet.add(id));
        }

        mappings[q.id] = {
          chapter_id: chapterId,
          topic_ids: Array.from(topicIdSet),
          subtopic_ids: Array.from(subtopicIdSet)
        };
      });

      console.log('Final question mappings:', mappings);
      console.log('Sample mapping for first question:', mappings[questions[0]?.id]);

      setQuestionMappings(mappings);
    }
  }, [academicStructureLoaded, parsedData, questions, units, topics, subtopics]);

  // Auto-map questions when academic structure is loaded
  useEffect(() => {
    if (questions.length > 0 && units.length > 0 && topics.length > 0 && Object.keys(questionMappings).length > 0) {
      const alreadyMapped = Object.values(questionMappings).some(
        (mapping: QuestionMapping) => mapping?.chapter_id || (mapping?.topic_ids && mapping.topic_ids.length > 0)
      );
      
      if (!alreadyMapped && !autoMappingInProgress) {
        const timer = setTimeout(() => {
          handleAutoMapQuestions(false);
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [units.length, topics.length, subtopics.length, questions.length, Object.keys(questionMappings).length, autoMappingInProgress]);

  // Load simulation results from import session
  useEffect(() => {
    if (importSession?.metadata?.simulation_results) {
      setSimulationResult(importSession.metadata.simulation_results);
    }
  }, [importSession]);

  const initializeFromParsedData = async (data: any): Promise<void> => {
    try {
      setLoading(true);

      // Validate input data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data: expected object');
      }

      if (!Array.isArray(data.questions)) {
        throw new Error('Invalid data: questions must be an array');
      }

      if (data.questions.length === 0) {
        throw new Error('No questions found in parsed data');
      }

      // Extract paper metadata with all available fields and validation
      const metadata = {
        title: String(data.title || data.paper_name || data.paper_code || 'Untitled Paper'),
        exam_board: String(data.exam_board || data.board || 'Unknown'),
        qualification: String(data.qualification || data.level || ''),
        subject: String(data.subject || ''),
        paper_code: String(data.paper_code || data.code || ''),
        paper_name: String(data.paper_name || data.name || ''),
        exam_year: String(data.exam_year || data.year || ''),
        exam_session: String(data.exam_session || data.session || ''),
        paper_duration: String(data.paper_duration || data.duration || ''),
        total_marks: parseInt(String(data.total_marks || '0')) || 0,
        // Additional fields that might be in the parsed data
        region: String(data.region || ''),
        program: String(data.program || ''),
        provider: String(data.provider || ''),
        subject_code: String(data.subject_code || '')
      };
      setPaperMetadata(metadata);

      // Process questions with enhanced extraction rules and error recovery
      let processedQuestions: ProcessedQuestion[] = [];
      try {
        processedQuestions = processQuestions(data.questions, metadata);

        if (processedQuestions.length === 0) {
          throw new Error('No valid questions were processed');
        }
      } catch (processingError) {
        console.error('Error processing questions:', processingError);
        throw new Error(`Failed to process questions: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`);
      }

      setQuestions(processedQuestions);

      // Initialize question mappings
      const mappings: Record<string, QuestionMapping> = {};
      processedQuestions.forEach(q => {
        mappings[q.id] = {
          chapter_id: '',
          topic_ids: [],
          subtopic_ids: []
        };
      });
      setQuestionMappings(mappings);

      // Initialize attachments from staged attachments
      if (stagedAttachments && typeof stagedAttachments === 'object') {
        setAttachments(stagedAttachments);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error initializing questions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process questions data';
      toast.error(errorMessage);
      setLoading(false);
      throw error; // Re-throw to be caught by initialization handler
    }
  };

  const processQuestions = (rawQuestions: any[], paperContext: { subject?: string }): ProcessedQuestion[] => {
    // Validate input
    if (!Array.isArray(rawQuestions)) {
      throw new Error('rawQuestions must be an array');
    }

    const normalizedSubject = paperContext.subject?.toLowerCase() || '';
    const processedQuestions: ProcessedQuestion[] = [];

    for (let index = 0; index < rawQuestions.length; index++) {
      try {
        const q = rawQuestions[index];

        // Skip invalid questions
        if (!q || typeof q !== 'object') {
          console.warn(`Skipping invalid question at index ${index}:`, q);
          continue;
        }

        const questionId = `q_${index + 1}`;

        const rawQuestionText = ensureString(
          q.question_text ?? q.question_description ?? q.question
        ) || '';
        const rawTopic = ensureString(q.topic) || ensureString(q.topics?.[0]) || '';
        const rawSubtopic = ensureString(q.subtopic) || ensureString(q.subtopics?.[0]) || '';
        const rawUnit = ensureString(q.unit) || ensureString(q.chapter) || '';
        const optionsArray = Array.isArray(q.options)
          ? q.options
          : (q.options && typeof q.options === 'object'
            ? Object.values(q.options)
            : []);

        // Enhanced question type detection
        let questionType = q.type;
        if (!questionType) {
          if (Array.isArray(q.parts) && q.parts.length > 0) {
            questionType = 'complex';
          } else if (optionsArray.length > 0) {
            questionType = 'mcq';
          } else if (
            q.answer_format === 'true_false' ||
            (rawQuestionText && rawQuestionText.toLowerCase().includes('true or false')) ||
            (optionsArray.length === 2 && optionsArray.every((opt: any) => /true|false/i.test(opt?.text || opt?.option_text)))
          ) {
            questionType = 'tf';
          } else {
            questionType = 'descriptive';
          }
        }

        // Enhanced answer format detection for main question
        let mainAnswerFormat = q.answer_format;
        if (!mainAnswerFormat && rawQuestionText) {
          mainAnswerFormat = detectAnswerFormat(rawQuestionText);

          // Additional subject-specific detection
          const text = rawQuestionText.toLowerCase();

          if (normalizedSubject.includes('chemistry')) {
            if (text.includes('structure') || text.includes('draw the structure')) {
              mainAnswerFormat = 'chemical_structure';
            } else if (text.includes('equation') || text.includes('balanced equation')) {
              mainAnswerFormat = 'equation';
            }
          } else if (normalizedSubject.includes('physics')) {
            if (text.includes('calculate') || text.includes('find the value')) {
              mainAnswerFormat = 'calculation';
            } else if (text.includes('graph') || text.includes('plot')) {
              mainAnswerFormat = 'graph';
            }
          } else if (normalizedSubject.includes('biology')) {
            if (text.includes('diagram') || text.includes('label')) {
              mainAnswerFormat = 'diagram';
            } else if (text.includes('table') || text.includes('tabulate')) {
              mainAnswerFormat = 'table';
            }
          } else if (normalizedSubject.includes('mathematics') || normalizedSubject.includes('math')) {
            if (text.includes('prove') || text.includes('show that')) {
              mainAnswerFormat = 'calculation';
            } else if (text.includes('construct') || text.includes('draw')) {
              mainAnswerFormat = 'diagram';
            }
          }

          // IGCSE specific patterns
          if (text.includes('name') && text.includes('and') && (text.includes('two') || text.includes('2'))) {
            mainAnswerFormat = 'two_items';
          } else if (text.includes('state') && text.includes('reason')) {
            mainAnswerFormat = 'two_items_connected';
          } else if (text.match(/\([a-d]\)/i) || text.includes('(i)') || text.includes('(ii)')) {
            mainAnswerFormat = 'multi_line_labeled';
          }
        }

        // Parse answer requirement
        let answerRequirement = q.answer_requirement ? ensureString(q.answer_requirement) ?? undefined : undefined;
        if (!answerRequirement && q.correct_answers && Array.isArray(q.correct_answers) && q.correct_answers.length > 0) {
          let serializedAnswers: string | null = null;
          if (typeof q.correct_answers === 'string') {
            serializedAnswers = q.correct_answers;
          } else {
            try {
              serializedAnswers = JSON.stringify(q.correct_answers);
            } catch (serializationError) {
              console.warn(`Failed to stringify correct_answers for question ${index + 1}:`, serializationError);
              try {
                serializedAnswers = q.correct_answers
                  .map((ans: any) => ensureString(ans?.answer) || '')
                  .filter(Boolean)
                  .join(' / ');
              } catch (fallbackError) {
                console.warn(`Fallback serialization failed for question ${index + 1}:`, fallbackError);
              }
            }
          }

          if (serializedAnswers) {
            try {
              const marksValue = parseInt(String(q.marks ?? q.total_marks ?? '0')) || 0;
              answerRequirement = parseAnswerRequirement(serializedAnswers, marksValue);
            } catch (parseError) {
              console.warn(`Failed to parse answer requirement for question ${index + 1}:`, parseError);
            }
          }
        }

        const figureFlag = resolveFigureFlag(q);
        const figureRequired = resolveFigureRequirement(q);

        // Process main question with all available data
        const processedQuestion: ProcessedQuestion = {
          id: questionId,
          question_number: ensureString(q.question_number) || String(index + 1),
          question_text: rawQuestionText,
          question_type: questionType,
          marks: parseInt(String(q.total_marks ?? q.marks ?? '0')) || 0,
          unit: rawUnit,
          unit_id: q.unit_id ?? null,
          topic: rawTopic,
          topic_id: q.topic_id ?? null,
          subtopic: rawSubtopic,
          subtopic_id: q.subtopic_id ?? null,
          difficulty: q.difficulty || determineQuestionDifficulty(q),
          status: 'pending',
          figure: figureFlag,
          figure_required: figureRequired,
          attachments: ensureArray(q.attachments),
          hint: ensureString(q.hint) || '',
          explanation: ensureString(q.explanation) || '',
          parts: [],
          correct_answers: [],
          options: [],
          answer_format: mainAnswerFormat,
          answer_requirement: answerRequirement,
          total_alternatives: q.total_alternatives,
          mcq_type: q.mcq_type,
          match_pairs: q.match_pairs || q.correct_matches,
          left_column: q.left_column,
          right_column: q.right_column,
          correct_sequence: q.correct_sequence,
          partial_credit: q.partial_credit,
          partial_marking: q.partial_marking,
          conditional_marking: q.conditional_marking || q.marking_conditions,
          // Store original topics/subtopics for mapping
          original_topics: ensureArray(q.topics || q.topic),
          original_subtopics: ensureArray(q.subtopics || q.subtopic),
          original_unit: rawUnit,
          // Initialize simulation tracking
          simulation_flags: [],
          simulation_notes: ''
        };

        console.log(`Processing question ${index + 1}:`, {
          topic: processedQuestion.topic,
          original_topics: processedQuestion.original_topics,
          subtopic: processedQuestion.subtopic,
          original_subtopics: processedQuestion.original_subtopics,
          unit: processedQuestion.original_unit,
          answer_requirement: processedQuestion.answer_requirement
        });

        // Process parts if available
        if (Array.isArray(q.parts) && q.parts.length > 0) {
          processedQuestion.parts = q.parts.map((part: any, partIndex: number) =>
            processPart(part, partIndex, questionId, paperContext)
          );
        }

        // Process direct answers if no parts
        if (!Array.isArray(q.parts) || q.parts.length === 0) {
          if (q.correct_answers) {
            processedQuestion.correct_answers = processAnswers(q.correct_answers, answerRequirement);
          } else if (q.correct_answer) {
            processedQuestion.correct_answers = [{
              answer: ensureString(q.correct_answer) || '',
              marks: processedQuestion.marks,
              alternative_id: 1,
              answer_requirement: answerRequirement
            }];
          }

          if (optionsArray.length > 0) {
            processedQuestion.options = processOptions(
              optionsArray,
              q.correct_answers,
              q.correct_answer
            );
          }
        }

        processedQuestions.push(processedQuestion);
      } catch (error) {
        console.error(`Error processing question ${index + 1}:`, error);
        // Continue processing other questions instead of failing entirely
        toast.error(`Warning: Question ${index + 1} could not be processed completely`);
      }
    }

    if (processedQuestions.length === 0) {
      throw new Error('No valid questions could be processed');
    }

    return processedQuestions;
  };

  // Helper to determine question difficulty based on marks and complexity
  const determineQuestionDifficulty = (question: any): string => {
    const marks = parseInt(question.total_marks || question.marks || '0');
    const hasParts = question.parts && question.parts.length > 0;
    
    if (marks >= 8 || (hasParts && question.parts.length > 3)) return 'Hard';
    if (marks >= 4 || (hasParts && question.parts.length > 1)) return 'Medium';
    return 'Easy';
  };

  const processPart = (
    part: any,
    partIndex: number,
    parentId: string,
    paperContext: { subject?: string }
  ): ProcessedPart => {
    // FIXED: Ensure parts have IDs for consistent key generation
    const partId = part.id || `p${partIndex}`;

    // Enhanced answer format detection
    const questionText = ensureString(part.question_text || part.text || part.question || '');
    let answerFormat = part.answer_format;

    if (!answerFormat && questionText) {
      // First try auto-detection
      answerFormat = detectAnswerFormat(questionText);

      // Subject-specific enhancements
      const subject = paperContext.subject?.toLowerCase() || '';
      if (subject.includes('chemistry') && questionText.toLowerCase().includes('structure')) {
        answerFormat = 'chemical_structure';
      } else if (subject.includes('physics') && questionText.toLowerCase().includes('calculate')) {
        answerFormat = 'calculation';
      } else if (subject.includes('biology') && questionText.toLowerCase().includes('diagram')) {
        answerFormat = 'diagram';
      } else if (subject.includes('mathematics') && questionText.toLowerCase().includes('prove')) {
        answerFormat = 'calculation';
      }
      
      // IGCSE specific patterns for parts
      const textLower = questionText.toLowerCase();
      if (textLower.includes('name') && textLower.includes('two')) {
        answerFormat = 'two_items';
      } else if (textLower.includes('state') && textLower.includes('reason')) {
        answerFormat = 'two_items_connected';
      }
    }
    
    // Parse answer requirement for parts
    const answerRequirement = part.answer_requirement ||
      (part.correct_answers && part.correct_answers.length > 0 ? parseAnswerRequirement(JSON.stringify(part.correct_answers), part.marks) : undefined);

    const partFigureFlag = resolveFigureFlag(part);
    const partFigureRequired = resolveFigureRequirement(part);

    const processedPart: ProcessedPart = {
      id: partId, // FIXED: Include id in processed part
      part: part.part || String.fromCharCode(97 + partIndex), // a, b, c...
      question_text: questionText || '',
      marks: parseInt(part.marks || '0'),
      answer_format: answerFormat || 'single_line',
      answer_requirement: answerRequirement,
      figure: partFigureFlag,
      figure_required: partFigureRequired,
      attachments: ensureArray(part.attachments),
      hint: part.hint,
      explanation: part.explanation,
      subparts: [],
      correct_answers: [],
      options: [],
      requires_manual_marking: part.requires_manual_marking ||
        ['diagram', 'chemical_structure', 'table', 'graph'].includes(answerFormat || ''),
      marking_criteria: part.marking_criteria,
      mcq_type: part.mcq_type,
      match_pairs: part.match_pairs || part.correct_matches,
      left_column: part.left_column,
      right_column: part.right_column,
      correct_sequence: part.correct_sequence,
      partial_credit: part.partial_credit,
      partial_marking: part.partial_marking,
      conditional_marking: part.conditional_marking || part.marking_conditions
    };

    // Process subparts if available
    if (part.subparts && Array.isArray(part.subparts)) {
      processedPart.subparts = part.subparts.map((subpart: any, subpartIndex: number) =>
        processSubpart(subpart, subpartIndex, parentId, paperContext)
      );
    }

    // Process answers
    if (part.correct_answers) {
      processedPart.correct_answers = processAnswers(part.correct_answers, answerRequirement);
    }

    // Process options for MCQ
    if (part.options) {
      processedPart.options = processOptions(
        part.options,
        part.correct_answers,
        part.correct_answer
      );
    }

    return processedPart;
  };

  const processSubpart = (
    subpart: any,
    subpartIndex: number,
    parentId: string,
    paperContext: { subject?: string }
  ): ProcessedSubpart => {
    // FIXED: Ensure subparts have IDs that match their Roman numeral designation
    const romanNumeral = Roman[subpartIndex] || `${subpartIndex}`;
    const subpartId = subpart.id || `s${subpartIndex}`;
    const subpartLabel = subpart.subpart || `(${romanNumeral})`;
    
    // Fix: Ensure we pass a string to detectAnswerFormat
    const questionText = ensureString(subpart.question_text || subpart.text || subpart.question || '');
    const answerFormat = subpart.answer_format || (questionText ? detectAnswerFormat(questionText) : 'single_line');
    
    // Parse answer requirement for subparts
    const answerRequirement = subpart.answer_requirement || 
      (subpart.correct_answers && subpart.correct_answers.length > 0 ? parseAnswerRequirement(JSON.stringify(subpart.correct_answers), subpart.marks) : undefined);
    
    const subpartFigureFlag = resolveFigureFlag(subpart);
    const subpartFigureRequired = resolveFigureRequirement(subpart);

    const processedSubpart: ProcessedSubpart = {
      id: subpartId, // FIXED: Include id in processed subpart
      subpart: subpartLabel,
      question_text: questionText || '',
      marks: parseInt(subpart.marks || '0'),
      answer_format: answerFormat || 'single_line',
      answer_requirement: answerRequirement,
      correct_answers: subpart.correct_answers ? processAnswers(subpart.correct_answers, answerRequirement) : [],
      options: subpart.options
        ? processOptions(subpart.options, subpart.correct_answers, subpart.correct_answer)
        : [],
      hint: subpart.hint,
      explanation: subpart.explanation,
      figure: subpartFigureFlag,
      figure_required: subpartFigureRequired,
      mcq_type: subpart.mcq_type,
      match_pairs: subpart.match_pairs || subpart.correct_matches,
      left_column: subpart.left_column,
      right_column: subpart.right_column,
      correct_sequence: subpart.correct_sequence,
      partial_credit: subpart.partial_credit,
      partial_marking: subpart.partial_marking,
      conditional_marking: subpart.conditional_marking || subpart.marking_conditions
    };

    return processedSubpart;
  };

  const processAnswers = (answers: any[], answerRequirement?: string): ProcessedAnswer[] => {
    if (!Array.isArray(answers)) return [];

    return answers.map((ans, index) => {
      const answerText = ensureString(ans.answer) || '';
      const context = ans.context;

      let processedAnswer: ProcessedAnswer = {
        answer: answerText,
        marks: parseInt(ans.marks || '1'),
        alternative_id: ans.alternative_id || index + 1,
        linked_alternatives: ans.linked_alternatives,
        alternative_type: ans.alternative_type,
        context: context,
        unit: ans.unit,
        measurement_details: ans.measurement_details,
        accepts_equivalent_phrasing: ans.accepts_equivalent_phrasing,
        error_carried_forward: ans.error_carried_forward,
        answer_requirement: answerRequirement || ans.answer_requirement,
        total_alternatives: ans.total_alternatives
      };

      if (extractionRules?.forwardSlashHandling) {
        const forwardSlashResult = parseForwardSlashAnswers(answerText);

        if (forwardSlashResult.hasForwardSlash) {
          const alternatives = extractAllValidAlternatives(answerText);
          processedAnswer.total_alternatives = alternatives.length;

          if (forwardSlashResult.validationErrors.length > 0) {
            processedAnswer.validation_issues = forwardSlashResult.validationErrors;
          }
        }
      }

      if (extractionRules?.alternativeLinking) {
        const andOrResult = parseAndOrOperators(answerText);

        if (andOrResult.hasOperators) {
          const logic = analyzeAnswerLogic(answerText);
          processedAnswer.answer_logic = logic.type;
          processedAnswer.required_components = extractRequiredComponents(answerText);
          processedAnswer.optional_components = extractOptionalComponents(answerText);

          if (andOrResult.validationErrors.length > 0) {
            processedAnswer.validation_issues = [
              ...(processedAnswer.validation_issues || []),
              ...andOrResult.validationErrors
            ];
          }
        }
      }

      if (extractionRules?.answerStructure?.requireContext || extractionRules?.contextRequired) {
        const subjectRules = extractionRules?.subjectSpecific ? {
          requiresUnits: extractionRules.subjectSpecific.physics || extractionRules.subjectSpecific.chemistry,
          allowsApproximations: true,
          requiresSignificantFigures: extractionRules.subjectSpecific.physics || extractionRules.subjectSpecific.chemistry,
          allowsEquivalentPhrasing: true
        } : undefined;

        const validation = validateAnswerStructure(answerText, context, subjectRules);

        if (!validation.isValid) {
          processedAnswer.validation_issues = [
            ...(processedAnswer.validation_issues || []),
            ...validation.issues.map(issue => issue.message)
          ];
        }

        if (!validation.hasContext && !context) {
          processedAnswer.needs_context = true;
        }
      }

      return processedAnswer;
    });
  };

  const buildNormalizedOptionValue = (value: unknown): string[] => {
    const strValue = ensureString(value)?.trim();
    if (!strValue) return [];

    const lower = strValue.toLowerCase();
    const variants = new Set<string>();

    variants.add(lower);
    variants.add(lower.replace(/^option\s+/i, '').trim());

    const withoutPunctuation = lower.replace(/[\.,;:()\[\]{}]/g, '').trim();
    variants.add(withoutPunctuation);
    variants.add(withoutPunctuation.replace(/\s+/g, ''));

    return Array.from(variants).filter(Boolean);
  };

  const buildNormalizedCorrectAnswerSet = (
    correctAnswers?: any[],
    correctAnswer?: unknown
  ): Set<string> => {
    const normalized = new Set<string>();

    correctAnswers?.forEach(answer => {
      buildNormalizedOptionValue(answer?.answer).forEach(variant => normalized.add(variant));
    });

    buildNormalizedOptionValue(correctAnswer).forEach(variant => normalized.add(variant));

    return normalized;
  };

  const matchesCorrectAnswer = (value: string, normalizedAnswers: Set<string>): boolean => {
    if (!value || normalizedAnswers.size === 0) {
      return false;
    }

    return buildNormalizedOptionValue(value).some(variant => normalizedAnswers.has(variant));
  };

  const processOptions = (
    options: any[],
    correctAnswers?: any[],
    correctAnswer?: unknown
  ): ProcessedOption[] => {
    if (!Array.isArray(options)) return [];

    const normalizedAnswers = buildNormalizedCorrectAnswerSet(correctAnswers, correctAnswer);

    return options.map((opt, index) => {
      const label = opt.label || String.fromCharCode(65 + index); // A, B, C...
      const text = ensureString(opt.text || opt.option_text) || '';

      let explicitIsCorrect: boolean | undefined;
      if (typeof opt.is_correct === 'boolean') {
        explicitIsCorrect = opt.is_correct;
      } else if (typeof opt.is_correct === 'string') {
        explicitIsCorrect = opt.is_correct.toLowerCase() === 'true';
      } else if (typeof opt.is_correct === 'number') {
        explicitIsCorrect = opt.is_correct === 1;
      }

      const derivedIsCorrect =
        matchesCorrectAnswer(label, normalizedAnswers) ||
        matchesCorrectAnswer(text, normalizedAnswers) ||
        matchesCorrectAnswer(`option ${label}`, normalizedAnswers);

      return {
        label,
        text,
        is_correct: explicitIsCorrect ?? derivedIsCorrect
      };
    });
  };

  const detectQuestionType = (question: any): string => {
    if (question.type) return question.type;
    if (question.options && question.options.length > 0) return 'mcq';
    if (question.answer_format === 'true_false') return 'tf';
    return 'descriptive';
  };

  const loadImportedQuestions = async () => {
    try {
      setLoading(true);
      const data = await fetchImportedQuestions(importSession.id);
      initializeFromParsedData(data);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load questions. Please try again.');
      setLoading(false);
    }
  };

  const loadExistingQuestions = async () => {
    try {
      const existingNumbers = await checkExistingQuestions(existingPaperId!);
      // Convert all to numbers for consistent comparison
      const numberSet = new Set<number>();
      existingNumbers.forEach(num => {
        const parsed = typeof num === 'string' ? parseInt(num) : num;
        if (!isNaN(parsed)) {
          numberSet.add(parsed);
        }
      });
      setExistingQuestionNumbers(numberSet);
      console.log('Loaded existing question numbers:', numberSet);
    } catch (error) {
      console.error('Error checking existing questions:', error);
    }
  };

  // Handler to bulk auto-fill missing answer requirements
  const handleBulkAutoFillAnswerRequirements = () => {
    let filledCount = 0;
    let partFilledCount = 0;
    let subpartFilledCount = 0;

    const updatedQuestions = questions.map(question => {
      let questionUpdated = false;

      // Auto-fill main question answer requirement
      if (!question.answer_requirement || question.answer_requirement.trim() === '') {
        const derivedResult = deriveAnswerRequirement({
          questionType: question.question_type,
          answerFormat: question.answer_format,
          correctAnswers: question.correct_answers,
          totalAlternatives: question.total_alternatives,
          options: question.options
        });

        if (derivedResult.answerRequirement) {
          question.answer_requirement = derivedResult.answerRequirement;
          filledCount++;
          questionUpdated = true;
        }
      }

      // Auto-fill parts
      if (question.parts && Array.isArray(question.parts)) {
        question.parts = question.parts.map((part: any) => {
          if (!part.answer_requirement || part.answer_requirement.trim() === '') {
            const partDerivedResult = deriveAnswerRequirement({
              questionType: part.question_type || 'descriptive',
              answerFormat: part.answer_format,
              correctAnswers: part.correct_answers,
              totalAlternatives: part.total_alternatives,
              options: part.options
            });

            if (partDerivedResult.answerRequirement) {
              part.answer_requirement = partDerivedResult.answerRequirement;
              partFilledCount++;
            }
          }

          // Auto-fill subparts
          if (part.subparts && Array.isArray(part.subparts)) {
            part.subparts = part.subparts.map((subpart: any) => {
              if (!subpart.answer_requirement || subpart.answer_requirement.trim() === '') {
                const subpartDerivedResult = deriveAnswerRequirement({
                  questionType: subpart.question_type || 'descriptive',
                  answerFormat: subpart.answer_format,
                  correctAnswers: subpart.correct_answers,
                  totalAlternatives: subpart.total_alternatives,
                  options: subpart.options
                });

                if (subpartDerivedResult.answerRequirement) {
                  subpart.answer_requirement = subpartDerivedResult.answerRequirement;
                  subpartFilledCount++;
                }
              }
              return subpart;
            });
          }

          return part;
        });
      }

      return question;
    });

    setQuestions(updatedQuestions);

    const totalFilled = filledCount + partFilledCount + subpartFilledCount;
    if (totalFilled > 0) {
      let message = `Auto-filled ${filledCount} question${filledCount !== 1 ? 's' : ''}`;
      if (partFilledCount > 0) {
        message += `, ${partFilledCount} part${partFilledCount !== 1 ? 's' : ''}`;
      }
      if (subpartFilledCount > 0) {
        message += `, ${subpartFilledCount} subpart${subpartFilledCount !== 1 ? 's' : ''}`;
      }
      toast.success(message);
    } else {
      toast.info('All questions already have answer requirements set');
    }
  };

  const handleAutoMapQuestions = async (showNotification = true) => {
    if (!dataStructureInfo || units.length === 0) {
      toast.error('Academic structure not loaded yet');
      return;
    }

    setAutoMappingInProgress(true);
    try {
      // Enhanced auto-mapping that includes all question data
      const enhancedQuestions = questions.map(question => {
        // Auto-fill missing data from parsedData if available
        const originalIndex = parseInt(question.question_number) - 1;
        const originalQuestion = parsedData?.questions?.[originalIndex];

        if (originalQuestion) {
          // Map missing fields
          if (!question.hint && originalQuestion.hint) {
            question.hint = originalQuestion.hint;
          }
          if (!question.explanation && originalQuestion.explanation) {
            question.explanation = originalQuestion.explanation;
          }
          if (!question.topic && originalQuestion.topic) {
            question.topic = originalQuestion.topic;
          }
          if (!question.subtopic && originalQuestion.subtopic) {
            question.subtopic = originalQuestion.subtopic;
          }

          // Map answer requirement
          if (!question.answer_requirement && originalQuestion.answer_requirement) {
            question.answer_requirement = originalQuestion.answer_requirement;
          }

          // Map parts data
          if (question.parts && originalQuestion.parts) {
            question.parts = question.parts.map((part: any, partIndex: number) => {
              const originalPart = originalQuestion.parts[partIndex];
              if (originalPart) {
                if (!part.hint && originalPart.hint) {
                  part.hint = originalPart.hint;
                }
                if (!part.explanation && originalPart.explanation) {
                  part.explanation = originalPart.explanation;
                }
                if (!part.answer_requirement && originalPart.answer_requirement) {
                  part.answer_requirement = originalPart.answer_requirement;
                }
                // Map subparts
                if (part.subparts && originalPart.subparts) {
                  part.subparts = part.subparts.map((subpart: any, subpartIndex: number) => {
                    const originalSubpart = originalPart.subparts[subpartIndex];
                    if (originalSubpart) {
                      if (!subpart.hint && originalSubpart.hint) {
                        subpart.hint = originalSubpart.hint;
                      }
                      if (!subpart.explanation && originalSubpart.explanation) {
                        subpart.explanation = originalSubpart.explanation;
                      }
                      if (!subpart.answer_requirement && originalSubpart.answer_requirement) {
                        subpart.answer_requirement = originalSubpart.answer_requirement;
                      }
                    }
                    return subpart;
                  });
                }
              }
              return part;
            });
          }
        }

        return question;
      });

      // Now perform the mapping
      const mappingResult = await autoMapQuestions(
        enhancedQuestions,
        units,
        topics,
        subtopics,
        questionMappings
      );

      // Merge mapping results back into questions with human-readable names
      // ALSO auto-fill missing answer requirements
      const questionsWithMappings = enhancedQuestions.map(question => {
        const mapping = mappingResult.mappings[question.id];

        if (mapping) {
          // Find the unit/chapter name
          const unit = units.find(u => u.id === mapping.chapter_id);
          if (unit && !question.topic) {
            question.original_unit = unit.name;
          }

          // Find topic names
          if (mapping.topic_ids && mapping.topic_ids.length > 0) {
            const topicNames = mapping.topic_ids
              .map(topicId => {
                const topic = topics.find(t => t.id === topicId);
                return topic?.name;
              })
              .filter(Boolean);

            if (topicNames.length > 0) {
              question.topic = topicNames.join(', ');
              question.original_topics = topicNames;
            }
          }

          // Find subtopic names
          if (mapping.subtopic_ids && mapping.subtopic_ids.length > 0) {
            const subtopicNames = mapping.subtopic_ids
              .map(subtopicId => {
                const subtopic = subtopics.find(s => s.id === subtopicId);
                return subtopic?.name;
              })
              .filter(Boolean);

            if (subtopicNames.length > 0) {
              question.subtopic = subtopicNames.join(', ');
              question.original_subtopics = subtopicNames;
            }
          }
        }

        // Auto-fill answer requirement if missing or empty
        if (!question.answer_requirement || question.answer_requirement.trim() === '') {
          const derivedResult = deriveAnswerRequirement({
            questionType: question.question_type,
            answerFormat: question.answer_format,
            correctAnswers: question.correct_answers,
            totalAlternatives: question.total_alternatives,
            options: question.options
          });

          if (derivedResult.answerRequirement) {
            question.answer_requirement = derivedResult.answerRequirement;
            console.log(`Auto-filled answer requirement for Q${question.question_number}: ${derivedResult.answerRequirement} (${derivedResult.confidence} confidence)`);
          }
        }

        // Auto-fill answer requirements for parts
        if (question.parts && Array.isArray(question.parts)) {
          question.parts = question.parts.map((part: any) => {
            if (!part.answer_requirement || part.answer_requirement.trim() === '') {
              const partDerivedResult = deriveAnswerRequirement({
                questionType: part.question_type || 'descriptive',
                answerFormat: part.answer_format,
                correctAnswers: part.correct_answers,
                totalAlternatives: part.total_alternatives,
                options: part.options
              });

              if (partDerivedResult.answerRequirement) {
                part.answer_requirement = partDerivedResult.answerRequirement;
              }
            }

            // Auto-fill for subparts
            if (part.subparts && Array.isArray(part.subparts)) {
              part.subparts = part.subparts.map((subpart: any) => {
                if (!subpart.answer_requirement || subpart.answer_requirement.trim() === '') {
                  const subpartDerivedResult = deriveAnswerRequirement({
                    questionType: subpart.question_type || 'descriptive',
                    answerFormat: subpart.answer_format,
                    correctAnswers: subpart.correct_answers,
                    totalAlternatives: subpart.total_alternatives,
                    options: subpart.options
                  });

                  if (subpartDerivedResult.answerRequirement) {
                    subpart.answer_requirement = subpartDerivedResult.answerRequirement;
                  }
                }
                return subpart;
              });
            }

            return part;
          });
        }

        return question;
      });

      // Update both questions and mappings state
      setQuestions(questionsWithMappings);
      setQuestionMappings(mappingResult.mappings);

      // Run validation after mapping to update validation errors
      if (typeof validateQuestionsForImport === 'function') {
        try {
          const errors = validateQuestionsForImport(
            questionsWithMappings,
            mappingResult.mappings,
            existingQuestionNumbers,
            attachments
          );
          setValidationErrors(errors);
        } catch (err) {
          console.warn('Validation failed after auto-mapping:', err);
        }
      }

      if (showNotification) {
        const successCount = mappingResult.mappedCount + mappingResult.enhancedCount;
        toast.success(
          `Auto-mapped ${successCount} question${successCount !== 1 ? 's' : ''}: ` +
          `${mappingResult.mappedCount} newly mapped, ${mappingResult.enhancedCount} enhanced`
        );
      }
    } catch (error) {
      console.error('Error auto-mapping questions:', error);
      if (showNotification) {
        toast.error('Failed to auto-map questions');
      }
    } finally {
      setAutoMappingInProgress(false);
    }
  };

  const handleStartSimulation = () => {
    try {
      // Transform questions data for simulation format with dynamic fields support
      const transformedQuestions = questions.map((q, qIndex) => {
        const questionAttachments = mergeAttachmentSources(q.attachments, attachments[q.id], q.id);

        return {
          id: q.id,
          question_number: q.question_number,
          question_description: q.question_text,
          marks: q.marks,
          type: q.question_type as 'mcq' | 'tf' | 'descriptive',
          difficulty: q.difficulty,
          topic_name: q.topic,
          subtopic_names: [q.subtopic].filter(Boolean),
          // Dynamic answer fields
          answer_format: q.answer_format,
          answer_requirement: q.answer_requirement,
          correct_answers: q.correct_answers?.map(ans => ({
            answer: ans.answer,
            marks: ans.marks,
            alternative_id: ans.alternative_id,
            linked_alternatives: ans.linked_alternatives,
            alternative_type: ans.alternative_type,
            context: ans.context,
            unit: ans.unit,
            measurement_details: ans.measurement_details,
            accepts_equivalent_phrasing: ans.accepts_equivalent_phrasing,
            error_carried_forward: ans.error_carried_forward,
            answer_requirement: ans.answer_requirement,
            total_alternatives: ans.total_alternatives
          })),
          correct_answer: q.correct_answers?.[0]?.answer, // For MCQ compatibility
          total_alternatives: q.total_alternatives,
          subject: paperMetadata.subject, // Question-level subject context
          figure: q.figure, // Figure requirement flag
          unit_name: q.original_unit, // Unit/chapter context
          status: 'pending', // Initialize status
          options: q.options?.map((opt, index) => ({
            id: `opt_${index}`,
            label: opt.label || opt.option_label || String.fromCharCode(65 + index),
            option_text: opt.text,
            is_correct: opt.is_correct,
            order: index
          })),
          parts: q.parts?.map((p, pIndex) => {
            const partKey = generateAttachmentKey(q.id, pIndex);
            const partAttachments = mergeAttachmentSources(p.attachments, attachments[partKey], partKey);

            return {
              id: `${q.id}_p${pIndex}`,
              part_label: p.part,
              question_description: p.question_text,
              marks: p.marks,
              difficulty: q.difficulty,
              type: (() => {
                // Enhanced type detection for parts
                if (p.options && p.options.length > 0) return 'mcq';
                if (p.answer_format === 'true_false' || (p.question_text || '').toLowerCase().includes('true or false')) return 'tf';
                return 'descriptive';
              })() as 'mcq' | 'tf' | 'descriptive',
              status: 'pending',
              topic_id: q.original_topics?.[0], // Include topic mapping
              unit_name: q.original_unit,
              subtopics: q.original_subtopics?.map(st => ({ id: st, name: st })),
              // Dynamic answer fields for parts
              answer_format: p.answer_format,
              answer_requirement: p.answer_requirement,
              correct_answers: p.correct_answers?.map(ans => ({
                answer: ans.answer,
                marks: ans.marks,
                alternative_id: ans.alternative_id,
                linked_alternatives: ans.linked_alternatives,
                alternative_type: ans.alternative_type,
                context: ans.context,
                unit: ans.unit,
                measurement_details: ans.measurement_details,
                accepts_equivalent_phrasing: ans.accepts_equivalent_phrasing,
                error_carried_forward: ans.error_carried_forward,
                answer_requirement: ans.answer_requirement,
                total_alternatives: ans.total_alternatives
              })),
              correct_answer: p.correct_answers?.[0]?.answer, // For MCQ compatibility
              options: p.options?.map((opt, index) => ({
                id: `opt_${index}`,
                label: opt.label || opt.option_label || String.fromCharCode(65 + index),
                option_text: opt.text,
                is_correct: opt.is_correct,
                order: index
              })),
              // Subparts support for complex questions
              subparts: p.subparts?.map((sp, spIndex) => {
                const subpartKey = generateAttachmentKey(q.id, pIndex, spIndex);
                const subpartAttachments = mergeAttachmentSources(sp.attachments, attachments[subpartKey], subpartKey);

                return {
                  id: `${q.id}_p${pIndex}_s${spIndex}`,
                  subpart_label: sp.subpart,
                  question_description: sp.question_text,
                  marks: sp.marks,
                  answer_format: sp.answer_format,
                  answer_requirement: sp.answer_requirement,
                  correct_answers: sp.correct_answers?.map(ans => ({
                    answer: ans.answer,
                    marks: ans.marks,
                    alternative_id: ans.alternative_id,
                    linked_alternatives: ans.linked_alternatives,
                    alternative_type: ans.alternative_type,
                    context: ans.context,
                    unit: ans.unit,
                    measurement_details: ans.measurement_details,
                    accepts_equivalent_phrasing: ans.accepts_equivalent_phrasing,
                    error_carried_forward: ans.error_carried_forward,
                    answer_requirement: ans.answer_requirement,
                    total_alternatives: ans.total_alternatives
                  })),
                  options: sp.options?.map((opt, index) => ({
                    id: `opt_${index}`,
                    label: opt.label || opt.option_label || String.fromCharCode(65 + index),
                    option_text: opt.text || opt.option_text,
                    is_correct: opt.is_correct,
                    order: index
                  })),
                  attachments: subpartAttachments,
                  hint: sp.hint,
                  explanation: sp.explanation,
                  requires_manual_marking: sp.requires_manual_marking,
                  marking_criteria: sp.marking_criteria
                };
              }),
              attachments: partAttachments,
              hint: p.hint,
              explanation: p.explanation,
              requires_manual_marking: p.requires_manual_marking,
              marking_criteria: p.marking_criteria
            };
          }) || [],
          attachments: questionAttachments,
          hint: q.hint,
          explanation: q.explanation,
          requires_manual_marking: q.requires_manual_marking,
          marking_criteria: q.marking_criteria,
          // Navigation and progress tracking
          _navigation: {
            index: qIndex,
            total: questions.length,
            next: qIndex < questions.length - 1 ? questions[qIndex + 1].id : null,
            previous: qIndex > 0 ? questions[qIndex - 1].id : null
          }
        };
      });

      const simulationPaper = {
        id: 'preview',
        code: paperMetadata.paper_code,
        subject: paperMetadata.subject,
        duration: paperMetadata.paper_duration,
        total_marks: paperMetadata.total_marks,
        status: 'qa_review', // Paper status for QA mode
        provider: paperMetadata.provider,
        program: paperMetadata.program,
        exam_board: paperMetadata.exam_board,
        qualification: paperMetadata.qualification,
        exam_session: paperMetadata.exam_session,
        exam_year: paperMetadata.exam_year,
        // Validation configuration
        validation_config: {
          strict_marking: false, // Allow partial credit
          allow_equivalent_phrasing: true,
          case_sensitive: false,
          trim_whitespace: true,
          subject_specific_rules: {
            chemistry: paperMetadata.subject?.toLowerCase().includes('chemistry'),
            physics: paperMetadata.subject?.toLowerCase().includes('physics'),
            biology: paperMetadata.subject?.toLowerCase().includes('biology'),
            mathematics: paperMetadata.subject?.toLowerCase().includes('math')
          }
        },
        questions: transformedQuestions,

      };
      
      setSimulationPaper(simulationPaper);
      setShowSimulation(true);
    } catch (error) {
      console.error('Error starting simulation:', error);
      toast.error('Failed to start simulation. Please check question data.');
    }
  };

  const handleSimulationExit = async (result?: any) => {
    setShowSimulation(false);

    // Process simulation results if provided
    if (result) {
      const simulationResult: SimulationResult = {
        completed: true,
        completedAt: new Date().toISOString(),
        flaggedQuestions: result.flaggedQuestions || [],
        issues: result.issues || [],
        recommendations: result.recommendations || [],
        overallScore: result.score,
        timeSpent: result.timeElapsed
      };
      
      // Add dynamic field validation issues
      const dynamicFieldIssues: any[] = [];
      
      questions.forEach(q => {
        // Check for missing answer requirements - CRITICAL for MCQ and other structured questions
        if (!q.answer_requirement || q.answer_requirement.trim() === '') {
          const questionTypeLabel = q.question_type === 'mcq' ? 'MCQ' :
                                    q.question_type === 'tf' ? 'True/False' :
                                    q.question_type;
          dynamicFieldIssues.push({
            questionId: q.id,
            type: q.question_type === 'mcq' || q.question_type === 'tf' ? 'error' : 'warning',
            message: `${questionTypeLabel} question missing answer requirement field`
          });
        }

        // Check for dynamic answer field issues
        if (q.answer_requirement && !q.correct_answers?.length) {
          dynamicFieldIssues.push({
            questionId: q.id,
            type: 'warning',
            message: `Dynamic answer requirement "${q.answer_requirement}" but no correct answers provided`
          });
        }
        
        // Check for complex answer formats
        if (q.answer_format && ['calculation', 'equation', 'chemical_structure', 'diagram'].includes(q.answer_format)) {
          if (!q.correct_answers?.some(ans => ans.marking_criteria || ans.context)) {
            dynamicFieldIssues.push({
              questionId: q.id,
              type: 'info',
              message: `Complex answer format "${q.answer_format}" may benefit from marking criteria`
            });
          }
        }
        
        // Check for missing hints in complex questions
        if (q.marks >= 5 && !q.hint) {
          dynamicFieldIssues.push({
            questionId: q.id,
            type: 'info',
            message: `High-mark question (${q.marks} marks) could benefit from a hint`
          });
        }
        
        // Check for figure requirements - FIXED: Use consistent key format
        const questionAttachmentAssets = mergeAttachmentSources(q.attachments, attachments[q.id], q.id);

        if (q.figure && questionAttachmentAssets.length === 0) {
          dynamicFieldIssues.push({
            questionId: q.id,
            type: 'warning',
            message: 'Question requires figure but no attachment provided'
          });
        }

        // Check parts - FIXED: Use consistent key format
        q.parts?.forEach((p, pIndex) => {
          const partKey = generateAttachmentKey(q.id, pIndex);
          const partAttachmentAssets = mergeAttachmentSources(p.attachments, attachments[partKey], partKey);

          // Check for missing answer requirement in parts
          if (!p.answer_requirement || p.answer_requirement.trim() === '') {
            const partTypeLabel = p.question_type === 'mcq' ? 'MCQ' :
                                  p.question_type === 'tf' ? 'True/False' :
                                  p.question_type || 'Question';
            dynamicFieldIssues.push({
              questionId: q.id,
              type: p.question_type === 'mcq' || p.question_type === 'tf' ? 'error' : 'warning',
              message: `Part ${p.part}: ${partTypeLabel} missing answer requirement field`
            });
          }

          if (p.answer_requirement && !p.correct_answers?.length) {
            dynamicFieldIssues.push({
              questionId: q.id,
              type: 'warning',
              message: `Part ${p.part}: Dynamic requirement "${p.answer_requirement}" needs correct answers`
            });
          }

          if (p.figure && partAttachmentAssets.length === 0) {
            dynamicFieldIssues.push({
              questionId: q.id,
              type: 'warning',
              message: `Part ${p.part}: Requires figure but no attachment provided`
            });
          }

          // Check subparts for missing answer requirements
          p.subparts?.forEach((sp: any, spIndex: number) => {
            if (!sp.answer_requirement || sp.answer_requirement.trim() === '') {
              const subpartTypeLabel = sp.question_type === 'mcq' ? 'MCQ' :
                                       sp.question_type === 'tf' ? 'True/False' :
                                       sp.question_type || 'Question';
              dynamicFieldIssues.push({
                questionId: q.id,
                type: sp.question_type === 'mcq' || sp.question_type === 'tf' ? 'error' : 'warning',
                message: `Part ${p.part}(${sp.subpart}): ${subpartTypeLabel} missing answer requirement field`
              });
            }
          });
        });
      });
      
      // Process validation results from simulation
      if (result.validationResults) {
        result.validationResults.forEach((vr: any) => {
          if (!vr.isCorrect && vr.partialCredit < 1) {
            dynamicFieldIssues.push({
              questionId: vr.questionId,
              type: 'error',
              message: `Validation failed: ${vr.message || 'Answer validation issue'}`
            });
          }
        });
      }
      
      // Check time-based issues
      if (result.questionTimes) {
        Object.entries(result.questionTimes).forEach(([qId, time]: [string, any]) => {
          const question = questions.find(q => q.id === qId);
          if (question && time > 300) { // More than 5 minutes
            dynamicFieldIssues.push({
              questionId: qId,
              type: 'info',
              message: `Question took ${Math.round(time / 60)} minutes - may be too complex`
            });
          }
        });
      }
      
      // Merge dynamic field issues with simulation issues
      simulationResult.issues = [...simulationResult.issues, ...dynamicFieldIssues];
      
      // Add recommendations for dynamic fields
      if (dynamicFieldIssues.length > 0) {
        simulationResult.recommendations.push(
          'Review dynamic answer requirements and ensure all have appropriate correct answers configured'
        );
      }
      
      const hasComplexFormats = questions.some(q => 
        q.answer_format && ['calculation', 'equation', 'chemical_structure', 'diagram', 'table', 'graph'].includes(q.answer_format)
      );
      
      if (hasComplexFormats) {
        simulationResult.recommendations.push(
          'Consider adding detailed marking criteria for questions with complex answer formats'
        );
      }
      
      const missingAttachments = dynamicFieldIssues.filter(issue => 
        issue.message.includes('figure but no attachment')
      ).length;
      
      if (missingAttachments > 0) {
        simulationResult.recommendations.push(
          `Upload PDF and add ${missingAttachments} missing figure attachment(s) using the snipping tool`
        );
      }
      
      // Check overall paper balance
      const avgMarksPerQuestion = paperMetadata.total_marks / questions.length;
      if (avgMarksPerQuestion > 10) {
        simulationResult.recommendations.push(
          'Consider breaking down high-mark questions into smaller parts for better assessment'
        );
      }
      
      setSimulationResult(simulationResult);
      
      // Update questions with simulation flags
      if (simulationResult.flaggedQuestions.length > 0 || dynamicFieldIssues.length > 0) {
        setQuestions(prev => prev.map(q => {
          const issuesForQuestion = dynamicFieldIssues.filter(issue => issue.questionId === q.id);
          if (simulationResult.flaggedQuestions.includes(q.id) || issuesForQuestion.length > 0) {
            return {
              ...q,
              simulation_flags: ['flagged'],
              simulation_notes: [
                ...simulationResult.issues
                  .filter(issue => issue.questionId === q.id)
                  .map(issue => issue.message),
                ...issuesForQuestion.map(issue => issue.message)
              ].join('; ')
            };
          }
          return q;
        }));
      }
      
      // Save simulation results to import session
      if (importSession?.id) {
        try {
          const { data: existingSession } = await supabase
            .from('past_paper_import_sessions')
            .select('metadata')
            .eq('id', importSession.id)
            .single();

          await supabase
            .from('past_paper_import_sessions')
            .update({
              metadata: {
                ...(existingSession?.metadata || {}),
                simulation_results: simulationResult,
                simulation_completed: true,
                dynamic_fields_validated: true,
                validation_metadata: {
                  total_issues: simulationResult.issues.length,
                  error_count: simulationResult.issues.filter(i => i.type === 'error').length,
                  warning_count: simulationResult.issues.filter(i => i.type === 'warning').length,
                  info_count: simulationResult.issues.filter(i => i.type === 'info').length,
                  has_dynamic_fields: questions.some(q => q.answer_requirement || q.answer_format),
                  has_attachments: Object.keys(attachments).length > 0,
                  question_types: {
                    mcq: questions.filter(q => q.question_type === 'mcq').length,
                    descriptive: questions.filter(q => q.question_type === 'descriptive').length,
                    tf: questions.filter(q => q.question_type === 'tf').length
                  }
                }
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', importSession.id);
            
          toast.success('Simulation completed and results saved');
        } catch (error) {
          console.error('Error saving simulation results:', error);
          toast.error('Failed to save simulation results');
        }
      }
    }

    setSimulationPaper(null);
  };

  const handleToggleReviewStatus = useCallback(async (questionId: string) => {
    const previousStatuses = reviewStatuses;
    const currentStatus = previousStatuses[questionId] || { questionId, isReviewed: false };
    const newState = !currentStatus.isReviewed;

    const updatedStatuses: Record<string, ReviewStatus> = {
      ...previousStatuses,
      [questionId]: {
        ...currentStatus,
        questionId,
        isReviewed: newState,
        reviewedAt: newState ? new Date().toISOString() : undefined,
      },
    };

    setReviewStatuses(updatedStatuses);

    const reviewedCount = Object.values(updatedStatuses).filter(status => status.isReviewed).length;

    try {
      const userId =
        currentReviewerId ||
        (await supabase.auth.getUser()).data.user?.id ||
        null;

      if (reviewSessionId) {
        const { error: updateError } = await supabase
          .from('question_import_review_status')
          .update({
            is_reviewed: newState,
            reviewed_at: newState ? new Date().toISOString() : null,
            reviewed_by: newState ? userId : null,
            updated_at: new Date().toISOString(),
          })
          .eq('review_session_id', reviewSessionId)
          .eq('question_identifier', questionId);

        if (updateError) {
          throw updateError;
        }

        const sessionUpdate: Record<string, any> = {
          questions_reviewed: reviewedCount,
          total_questions: questions.length,
          updated_at: new Date().toISOString(),
          status: reviewedCount === questions.length && questions.length > 0 ? 'completed' : 'in_progress',
        };

        sessionUpdate.completed_at =
          sessionUpdate.status === 'completed' ? new Date().toISOString() : null;

        const { error: sessionError } = await supabase
          .from('question_import_review_sessions')
          .update(sessionUpdate)
          .eq('id', reviewSessionId);

        if (sessionError) {
          throw sessionError;
        }

      }

      toast.success(newState ? 'Question marked as reviewed' : 'Review status removed');
    } catch (error) {
      console.error('Error updating review status:', error);
      toast.error('Failed to update review status. Please try again.');
      setReviewStatuses({ ...previousStatuses });
    }
  }, [reviewStatuses, currentReviewerId, reviewSessionId, questions.length, importSession?.id]);

  // FIXED: Updated validation function with proper error handling and figure_required check
  const validateQuestionsWithAttachments = () => {
    const errors: Record<string, string[]> = {};

    try {
      questions.forEach(question => {
        const questionErrors: string[] = [];

        // Debug log for tracking
        console.log(`Validating question ${question.id}`, {
          figure_required: (question as any).figure_required,
          figure: question.figure,
          resolvedRequirement: resolveFigureRequirement(question)
        });

        // Check if question requires figure - RESPECT THE TOGGLE and JSON data!
        const shouldValidateFigure = resolveFigureRequirement(question);

        if (shouldValidateFigure) {
          const questionAttachments = attachments[question.id];
          if (!questionAttachments || questionAttachments.length === 0) {
            questionErrors.push('Figure is required but no attachment added');
          }
        }

        // Check parts for figure requirements
        if (question.parts && Array.isArray(question.parts)) {
          question.parts.forEach((part, partIndex) => {
            if (!part) return; // Skip null/undefined parts

            // Generate the key that matches how it was stored
            const partKey = generateAttachmentKey(question.id, partIndex);

            // RESPECT THE TOGGLE for parts too!
            const shouldValidatePartFigure = resolveFigureRequirement(part);

            if (shouldValidatePartFigure) {
              const partAttachments = attachments[partKey];
              if (!partAttachments || partAttachments.length === 0) {
                questionErrors.push(`Part ${part.part || String.fromCharCode(97 + partIndex)}: Figure is required but no attachment added`);
              }
            }

            // Check subparts - FIXED: Handle Roman numeral indexing properly
            if (part.subparts && Array.isArray(part.subparts)) {
              part.subparts.forEach((subpart, subpartIndex) => {
                if (!subpart) return; // Skip null/undefined subparts

                // RESPECT THE TOGGLE for subparts too!
                const shouldValidateSubpartFigure = resolveFigureRequirement(subpart);

                if (shouldValidateSubpartFigure) {
                  // Try multiple possible key formats for compatibility
                  const subpartKey = generateAttachmentKey(question.id, partIndex, subpartIndex);

                  // Check if attachment exists with primary key
                  const hasAttachment = attachments[subpartKey] && attachments[subpartKey].length > 0;

                  if (!hasAttachment) {
                    // Try alternative key formats
                    let found = false;

                    // Check all keys that might contain this subpart's attachment
                    Object.keys(attachments).forEach(key => {
                      if (key.startsWith(question.id) && key.includes(`p${partIndex}`) && key.includes(`s${subpartIndex}`)) {
                        if (attachments[key] && attachments[key].length > 0) {
                          found = true;
                        }
                      }
                    });

                    if (!found) {
                      const subpartLabel = subpart.subpart || `(${Roman[subpartIndex] || subpartIndex})`;
                      questionErrors.push(`Part ${part.part || String.fromCharCode(97 + partIndex)} Subpart ${subpartLabel}: Figure is required but no attachment added`);
                    }
                  }
                }
              });
            }
          });
        }
        
        // Check for mapping
        const mapping = questionMappings[question.id];
        if (!mapping?.chapter_id || !mapping?.topic_ids || mapping.topic_ids.length === 0) {
          questionErrors.push('Question must be mapped to a unit and at least one topic');
        }
        
        if (questionErrors.length > 0) {
          errors[question.id] = questionErrors;
        }
      });
    } catch (error) {
      console.error('Error during validation:', error);
      // Return errors collected so far even if there was an exception
    }
    
    return errors;
  };

  // FIXED IMPORT FUNCTIONS with comprehensive error handling and fallbacks
  const handleImportQuestions = async () => {
    // Add visual feedback immediately
    console.log('=== IMPORT BUTTON CLICKED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Questions to import:', questions.length);
    console.log('Existing paper ID:', existingPaperId);
    console.log('Data structure info loaded:', !!dataStructureInfo);
    console.log('Attachments:', Object.keys(attachments));
    console.log('Question mappings:', questionMappings);
    
    // Show immediate feedback to user
    toast.info('Starting import process...', { duration: 1000 });
    
    try {
      // Check prerequisites with detailed logging
      if (!existingPaperId) {
        console.error('No existing paper ID found');
        toast.error('No paper selected. Please ensure a paper is created first.');
        return;
      }
      
      if (!dataStructureInfo) {
        console.error('Data structure info not loaded');
        toast.error('Academic structure not loaded. Please refresh and try again.');
        return;
      }
      
      if (!questions || questions.length === 0) {
        console.error('No questions available to import');
        toast.error('No questions to import');
        return;
      }

      console.log('Prerequisites check passed');

      if (reviewLoading) {
        toast.info('Review progress is still syncing. Please wait a moment.');
        return;
      }

      if (!allQuestionsReviewed) {
        toast.error(`Please review all questions before importing. (${reviewedCount}/${questions.length} reviewed)`);
        return;
      }

      if (!simulationCompleted) {
        toast.error('Run the test simulation and confirm the results before importing.');
        return;
      }

      if (extractionRules && (extractionRules.forwardSlashHandling || extractionRules.alternativeLinking)) {
        console.log('Running extraction rules validation...');
        const subject = savedPaperDetails?.subject || parsedData?.subject;
        const preImportValidation = validateQuestionsBeforeImport(questions, subject);

        if (!preImportValidation.canProceed) {
          console.log('Pre-import validation failed:', preImportValidation.summary);
          const report = getValidationReportSummary(preImportValidation);
          const errorDetails = formatValidationErrors(preImportValidation.errors.slice(0, 10));

          toast.error(`Extraction validation failed:\n${errorDetails.substring(0, 200)}...`, { duration: 8000 });

          const showFullReport = await requestInlineConfirmation({
            title: 'Extraction Validation Errors',
            message: (
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <p>Extraction validation found {preImportValidation.summary.totalErrors} errors.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Missing Answers: {preImportValidation.summary.missingAnswers}</li>
                  <li>Invalid Alternatives: {preImportValidation.summary.invalidAlternatives}</li>
                  <li>Invalid Operators: {preImportValidation.summary.invalidOperators}</li>
                </ul>
                <p>View the full report in the console to review every issue.</p>
              </div>
            ),
            confirmText: 'View Report',
            cancelText: 'Fix Errors',
            confirmVariant: 'primary',
          });

          if (showFullReport) {
            console.log('=== FULL EXTRACTION VALIDATION REPORT ===');
            console.log(report);
            console.log('\n=== DETAILED ERRORS ===');
            console.log(formatValidationErrors(preImportValidation.errors));
            console.log('\n=== DETAILED WARNINGS ===');
            console.log(formatValidationErrors(preImportValidation.warnings));
          }

          return;
        } else if (preImportValidation.warnings.length > 0) {
          console.log('Pre-import validation has warnings:', preImportValidation.summary.totalWarnings);
          toast.warning(`${preImportValidation.summary.totalWarnings} warnings found. Check console for details.`, { duration: 5000 });
          console.log('=== EXTRACTION VALIDATION WARNINGS ===');
          console.log(formatValidationErrors(preImportValidation.warnings));
        } else {
          console.log('Pre-import validation passed successfully');
          toast.success('Extraction validation passed', { duration: 2000 });
        }
      }

      // Perform validation with multiple fallbacks
      let errors: Record<string, string[]> = {};
      
      try {
        // Try our custom validation first
        console.log('Running custom validation...');
        errors = validateQuestionsWithAttachments();
        console.log('Custom validation completed, errors found:', Object.keys(errors).length);
      } catch (customValidationError) {
        console.error('Custom validation failed:', customValidationError);
        
        // Fallback: Try imported validation if available
        if (typeof validateQuestionsForImport === 'function') {
          try {
            console.log('Trying imported validation function...');
            errors = validateQuestionsForImport(
              questions,
              questionMappings,
              existingQuestionNumbers,
              attachments
            );
            console.log('Imported validation completed');
          } catch (importedValidationError) {
            console.error('Imported validation also failed:', importedValidationError);
            
            // Final fallback: Basic validation
            console.log('Using basic validation fallback...');
            errors = {};
            questions.forEach(q => {
              const qErrors = [];
              const mapping = questionMappings[q.id];
              if (!mapping?.chapter_id || !mapping?.topic_ids || mapping.topic_ids.length === 0) {
                qErrors.push('Question must be mapped to a unit and at least one topic');
              }
              if (qErrors.length > 0) {
                errors[q.id] = qErrors;
              }
            });
          }
        } else {
          console.warn('validateQuestionsForImport function not found, using basic validation');
          // Basic validation as last resort
          errors = {};
          questions.forEach(q => {
            const qErrors = [];
            const mapping = questionMappings[q.id];
            if (!mapping?.chapter_id || !mapping?.topic_ids || mapping.topic_ids.length === 0) {
              qErrors.push('Question must be mapped to a unit and at least one topic');
            }
            if (qErrors.length > 0) {
              errors[q.id] = qErrors;
            }
          });
        }
      }
      
      setValidationErrors(errors);
      console.log('Validation errors set:', errors);
      
      // Check validation results
      if (Object.keys(errors).length > 0) {
        console.log('Validation errors found, showing error dialog');
        setShowValidation(true);
        
        const errorMessages = Object.entries(errors).map(([qId, errs]) => {
          const q = questions.find(question => question.id === qId);
          return `Q${q?.question_number || qId}: ${errs.join(', ')}`;
        }).slice(0, 3);
        
        const errorMessage = errorMessages.join('\n') + 
          (Object.keys(errors).length > 3 ? `\n...and ${Object.keys(errors).length - 3} more errors` : '');
        
        toast.error(`Please fix validation errors:\n${errorMessage}`, { duration: 5000 });
        return;
      }
      
      console.log('No validation errors found');

      // Check for unmapped questions (excluding already imported ones)
      const unmappedQuestions = questions.filter(q => {
        // Skip if already imported
        if (existingQuestionNumbers.has(parseInt(q.question_number))) {
          return false;
        }
        const mapping = questionMappings[q.id];
        return !mapping?.chapter_id || !mapping?.topic_ids || mapping.topic_ids.length === 0;
      });
      
      if (unmappedQuestions.length > 0) {
        console.log('Unmapped questions found:', unmappedQuestions.map(q => q.question_number));
        const unmappedNumbers = unmappedQuestions.map(q => q.question_number).join(', ');
        
        // Show unmapped questions warning
        console.log('⚠️ Showing unmapped questions dialog...');

        try {
          const proceedWithUnmapped = await requestInlineConfirmation({
            title: 'Unmapped Questions Detected',
            message: (
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium">
                  {unmappedQuestions.length} question{unmappedQuestions.length === 1 ? '' : 's'} {unmappedQuestions.length === 1 ? 'is' : 'are'} not mapped to units/topics:
                </p>
                <p className="text-xs bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 max-h-20 overflow-y-auto">
                  {unmappedNumbers}
                </p>
                <p>Questions without mapping may be harder to organize and filter later.</p>
                <p>Do you want to proceed anyway?</p>
              </div>
            ),
            confirmText: 'Proceed Anyway',
            cancelText: 'Review Mapping',
            confirmVariant: 'primary',
          });

          console.log('User choice:', proceedWithUnmapped ? 'Proceed' : 'Cancel');

          if (!proceedWithUnmapped) {
            toast.info(`Please map questions to units/topics: ${unmappedNumbers.substring(0, 50)}...`, { duration: 5000 });
            return;
          }

          toast.info('Proceeding with unmapped questions - you can map them later');
        } catch (error) {
          console.error('Error showing unmapped dialog:', error);
          // Fallback: warn but allow proceeding
          toast.warning(`${unmappedQuestions.length} questions not mapped - proceeding anyway`, { duration: 3000 });
        }
      }
      
      // Check for missing figures (warning only, don't block)
      const questionsNeedingFigures = questions.filter(q => {
        try {
          const questionRequiresFigure = resolveFigureRequirement(q);
          if (questionRequiresFigure && !attachments[q.id]?.length) {
            return true;
          }
          if (q.parts && Array.isArray(q.parts)) {
            return q.parts.some((part: any, index: number) => {
              if (!part) return false;
              const partKey = generateAttachmentKey(q.id, index);
              const partRequiresFigure = resolveFigureRequirement(part);
              return partRequiresFigure && !attachments[partKey]?.length;
            });
          }
        } catch (err) {
          console.error('Error checking figure requirements:', err);
          return false;
        }
        return false;
      });
      
      if (questionsNeedingFigures.length > 0) {
        const needsFiguresNumbers = questionsNeedingFigures.map(q => q.question_number).join(', ');
        console.log('Questions needing figures:', needsFiguresNumbers);
        toast.warning(`Questions ${needsFiguresNumbers} may need figure attachments.`, { duration: 3000 });
      }

      console.log('=== ALL VALIDATIONS PASSED ===');
      console.log('Showing confirmation dialog...');
      
      // Show confirmation dialog
      setShowConfirmDialog(true);
      
    } catch (error: any) {
      console.error('=== CRITICAL ERROR IN IMPORT HANDLER ===');
      console.error('Error details:', error);
      console.error('Error stack:', error?.stack);
      
      // Show detailed error to user
      const errorMessage = error?.message || 'Unknown error occurred';
      toast.error(`Import failed: ${errorMessage}. Check console for details.`, { duration: 7000 });
      
      // Log current state for debugging
      console.log('Current state at error:', {
        questionsCount: questions?.length,
        mappingsCount: Object.keys(questionMappings || {}).length,
        attachmentsCount: Object.keys(attachments || {}).length,
        dataStructureLoaded: !!dataStructureInfo,
        existingPaperId: existingPaperId
      });
    }
  };

  const confirmImport = async () => {
    console.log('Starting import process');
    setShowConfirmDialog(false);
    setIsImporting(true);
    setImportProgress({ current: 0, total: questions.length });

    try {
      // Prepare the correct parameters for importQuestions
      const importParams = {
        questions: questions,
        mappings: questionMappings,
        attachments: attachments,
        paperId: existingPaperId!,
        dataStructureInfo: dataStructureInfo!,
        importSessionId: importSession?.id,
        yearOverride: paperMetadata.exam_year ? parseInt(paperMetadata.exam_year) : undefined,
        existingQuestionNumbers: existingQuestionNumbers
      };
      
      console.log('Import parameters:', {
        questionCount: importParams.questions.length,
        paperId: importParams.paperId,
        dataStructureId: importParams.dataStructureInfo.id,
        mappingsCount: Object.keys(importParams.mappings).length,
        attachmentsCount: Object.keys(importParams.attachments).length,
        existingCount: importParams.existingQuestionNumbers.size
      });
      
      // Call the import function with the correct signature
      const result: ImportResult = await importQuestions({
        ...importParams,
        onProgress: (current: number, total: number) => {
          setImportProgress({ current, total });
        }
      });
      
      console.log('Import result:', result);
      
      // Handle the result
      if (result.importedQuestions.length > 0) {
        // Update import session status
        if (importSession?.id) {
          try {
            await supabase
              .from('past_paper_import_sessions')
              .update({
                questions_imported: true,
                status: 'completed',
                updated_at: new Date().toISOString(),
                metadata: {
                  ...(importSession.metadata || {}),
                  import_result: {
                    imported: result.importedQuestions.length,
                    skipped: result.skippedQuestions.length,
                    errors: result.errors.length,
                    updated: result.updatedQuestions.length
                  }
                }
              })
              .eq('id', importSession.id);
          } catch (error) {
            console.error('Error updating import session:', error);
          }
        }

        // Update paper status and flags after successful import
        if (result.importedQuestions.length > 0 && importParams.paperId) {
          try {
            await supabase
              .from('papers_setup')
              .update({
                status: 'draft', // Ensure paper is in draft status for QA review
                qa_status: 'pending', // Mark as pending QA
                questions_imported: true,
                questions_imported_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', importParams.paperId);

            console.log('Paper status updated to draft with qa_status=pending');
          } catch (error) {
            console.error('Error updating paper status:', error);
            // Don't fail the import if this update fails
          }
        }
        
        // Show success message with details
        let message = `Successfully imported ${result.importedQuestions.length} question${result.importedQuestions.length !== 1 ? 's' : ''}!`;
        
        if (result.skippedQuestions.length > 0) {
          message += `\n${result.skippedQuestions.length} question${result.skippedQuestions.length !== 1 ? 's' : ''} skipped (already imported)`;
        }
        
        if (result.updatedQuestions.length > 0) {
          message += `\n${result.updatedQuestions.length} question${result.updatedQuestions.length !== 1 ? 's' : ''} updated`;
        }
        
        toast.success(message, { duration: 5000 });
        
        // Wait a moment for the toast to show, then continue
        setTimeout(() => {
          onContinue();
        }, 2000);
        
      } else if (result.skippedQuestions.length > 0) {
        toast.info(
          `All ${result.skippedQuestions.length} questions were already imported. No new questions to add.`,
          { duration: 5000 }
        );
      } else if (result.errors.length > 0) {
        // Show detailed error information
        const errorDetails = result.errors.slice(0, 3).map((err: any) => 
          `Question ${err.question}: ${err.error}`
        ).join('\n');
        
        toast.error(
          `Failed to import questions:\n${errorDetails}${result.errors.length > 3 ? '\n...and more errors' : ''}`,
          { duration: 7000 }
        );
      } else {
        toast.warning('No questions were imported. Please check the console for details.');
      }
      
    } catch (error: any) {
      console.error('Error during import:', error);
      
      // Provide detailed error message
      let errorMessage = 'Failed to import questions. ';
      
      if (error.message) {
        errorMessage += error.message;
      } else if (typeof error === 'string') {
        errorMessage += error;
      } else {
        errorMessage += 'Please check the console for details.';
      }
      
      toast.error(errorMessage, { duration: 7000 });
      
      // Log full error details
      console.error('Full error details:', {
        error,
        questions: questions.length,
        mappings: questionMappings,
        dataStructure: dataStructureInfo,
        paperId: existingPaperId
      });
      
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  const handleEditQuestion = (question: any) => {
    setEditingQuestion(JSON.parse(JSON.stringify(question)));
  };

  const handleSaveQuestion = () => {
    if (!editingQuestion) return;
    
    setQuestions(prev => prev.map(q => 
      q.id === editingQuestion.id ? editingQuestion : q
    ));
    setEditingQuestion(null);
    toast.success('Question updated');
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
  };

  const handleToggleFigureRequired = (questionId: string, required: boolean) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId || q.question_number.toString() === questionId) {
        return { ...q, figure_required: required };
      }
      return q;
    }));
    toast.success(`Figure ${required ? 'marked as mandatory' : 'marked as optional'}`);
  };

  const toggleQuestionExpanded = (questionId: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPdfDataUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddAttachment = (questionId: string, partIndex?: number, subpartIndex?: number) => {
    if (!pdfDataUrl) {
      fileInputRef.current?.click();
      return;
    }

    setAttachmentTarget({ questionId, partIndex, subpartIndex });
    setShowSnippingTool(true);
  };

  const handleQuestionUpdateFromReview = (questionId: string, updates: Partial<QuestionDisplayData>) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== questionId) {
        return q;
      }

      return {
        ...q,
        question_text: updates.question_text ?? q.question_text,
        marks: updates.marks ?? q.marks,
        unit: updates.unit ?? q.unit,
        unit_id: updates.unit_id ?? q.unit_id,
        difficulty: updates.difficulty ?? q.difficulty,
        topic: updates.topic ?? q.topic,
        topic_id: updates.topic_id ?? q.topic_id,
        subtopic: updates.subtopic ?? q.subtopic,
        subtopic_id: updates.subtopic_id ?? q.subtopic_id,
        answer_format: updates.answer_format ?? q.answer_format,
        answer_requirement: updates.answer_requirement ?? q.answer_requirement,
        hint: updates.hint ?? q.hint,
        explanation: updates.explanation ?? q.explanation,
        correct_answers: updates.correct_answers ?? q.correct_answers,
        options: updates.options ?? q.options,
        requires_manual_marking: updates.requires_manual_marking ?? q.requires_manual_marking,
        marking_criteria: updates.marking_criteria ?? q.marking_criteria,
        parts: updates.parts ?? q.parts,
        figure_required: updates.figure_required ?? q.figure_required,
        figure: updates.figure ?? q.figure,
      };
    }));
  };

  const handleRequestSnippingTool = (questionId: string) => {
    handleAddAttachment(questionId);
  };

  const handleAttachmentUpload = (questionId: string, partPath: string[]) => {
    // FIXED: Convert part path to indices
    let partIndex: number | undefined;
    let subpartIndex: number | undefined;
    
    if (partPath && partPath.length > 0) {
      // Find the part index
      const question = questions.find(q => q.id === questionId);
      if (question && question.parts) {
        const partId = partPath[0];
        partIndex = question.parts.findIndex(p => p.id === partId || p.part === partId);
        
        // Find subpart index if exists
        if (partPath.length > 1 && partIndex >= 0) {
          const part = question.parts[partIndex];
          if (part.subparts) {
            const subpartId = partPath[1];
            subpartIndex = part.subparts.findIndex(sp => sp.id === subpartId || sp.subpart === subpartId);
          }
        }
      }
    }
    
    handleAddAttachment(questionId, partIndex, subpartIndex);
  };

  const handleFixIncompleteQuestions = async () => {
    try {
      const fixed = await fixIncompleteQuestions(
        existingPaperId!,
        importSession,
        parsedData
      );
      if (fixed.updated > 0) {
        toast.success(`Fixed ${fixed.updated} incomplete questions`);
        // Reload questions to show updates
        if (parsedData) {
          initializeFromParsedData(parsedData);
        } else if (importSession?.id) {
          loadImportedQuestions();
        }
      } else {
        toast.info('No incomplete questions found');
      }
    } catch (error) {
      console.error('Error fixing incomplete questions:', error);
      toast.error('Failed to fix incomplete questions');
    }
  };

  const saveMetadata = () => {
    setEditingMetadata(false);
    toast.success('Metadata updated');
  };

  const handleSnippingComplete = (snippedData: any) => {
    if (!attachmentTarget) return;
    
    const { questionId, partIndex, subpartIndex } = attachmentTarget;
    const attachmentKey = generateAttachmentKey(questionId, partIndex, subpartIndex);
    
    const newAttachment = {
      id: `att_${Date.now()}`,
      type: 'image',
      data: snippedData.imageDataUrl,
      dataUrl: snippedData.imageDataUrl,
      file_url: snippedData.imageDataUrl,
      name: `Figure_${questionId}${partIndex !== undefined ? `_p${partIndex}` : ''}${subpartIndex !== undefined ? `_s${subpartIndex}` : ''}.png`,
      fileName: `Figure_${questionId}${partIndex !== undefined ? `_p${partIndex}` : ''}${subpartIndex !== undefined ? `_s${subpartIndex}` : ''}.png`,
      file_name: `Figure_${questionId}${partIndex !== undefined ? `_p${partIndex}` : ''}${subpartIndex !== undefined ? `_s${subpartIndex}` : ''}.png`,
      file_type: 'image/png',
      created_at: new Date().toISOString()
    };
    
    // Store with primary key
    setAttachments(prev => {
      const updated = {
        ...prev,
        [attachmentKey]: [...(prev[attachmentKey] || []), newAttachment]
      };
      
      // Also store with alternative keys for compatibility
      if (partIndex !== undefined) {
        const question = questions.find(q => q.id === questionId);
        if (question && question.parts && question.parts[partIndex]) {
          const part = question.parts[partIndex];
          
          if (subpartIndex !== undefined && part.subparts && part.subparts[subpartIndex]) {
            const subpart = part.subparts[subpartIndex];
            // Store with alternative key formats
            const altKey = `${questionId}_part_${part.part}_subpart_${subpart.subpart}`;
            updated[altKey] = updated[attachmentKey];
          }
        }
      }
      
      return updated;
    });
    
    // Update staged attachments if callback is provided
    if (updateStagedAttachments) {
      updateStagedAttachments(attachmentKey, [...(attachments[attachmentKey] || []), newAttachment]);
    }
    
    setShowSnippingTool(false);
    setAttachmentTarget(null);
    toast.success('Attachment added');
  };

  const handleDeleteAttachment = (attachmentKey: string, attachmentId: string) => {
    console.log('🗑️ Deleting attachment:', { attachmentKey, attachmentId });

    // Safety check: ensure attachmentKey exists
    if (!attachments[attachmentKey]) {
      console.error('❌ Attachment key not found:', attachmentKey);
      console.error('Available keys:', Object.keys(attachments));
      toast.error('Failed to delete attachment: Invalid attachment key');
      return;
    }

    // Find the attachment to confirm it exists
    const attachmentToDelete = attachments[attachmentKey].find(att => att.id === attachmentId);
    if (!attachmentToDelete) {
      console.error('❌ Attachment not found:', { attachmentId, availableIds: attachments[attachmentKey].map(a => a.id) });
      toast.error('Failed to delete attachment: Attachment not found');
      return;
    }

    console.log('✅ Found attachment to delete:', attachmentToDelete);

    setAttachments(prev => {
      const updated = {
        ...prev,
        [attachmentKey]: (prev[attachmentKey] || []).filter(att => att.id !== attachmentId)
      };
      console.log('📦 Updated attachments state:', {
        key: attachmentKey,
        before: prev[attachmentKey]?.length,
        after: updated[attachmentKey].length
      });
      return updated;
    });

    // Update staged attachments
    if (updateStagedAttachments) {
      const filteredAttachments = attachments[attachmentKey].filter(att => att.id !== attachmentId);
      updateStagedAttachments(attachmentKey, filteredAttachments);
      console.log('📤 Updated staged attachments');
    }

    toast.success('Attachment deleted successfully');
  };

  // FIXED: Scroll to question function
  const scrollToQuestion = (questionId: string) => {
    // Try multiple selectors to find the element
    const element = document.getElementById(`question-${questionId}`) || 
                   document.querySelector(`[data-question-id="${questionId}"]`);
    
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Add highlight effect
      element.classList.add('ring-2', 'ring-red-500', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2');
      }, 3000);
    } else {
      console.warn(`Could not find element for question ${questionId}`);
    }
  };

  const updateQuestionMapping = (questionId: string, mapping: QuestionMapping) => {
    setQuestionMappings(prev => ({
      ...prev,
      [questionId]: mapping
    }));
  };

  const getValidationStatus = (questionId: string): 'valid' | 'warning' | 'error' => {
    const errors = validationErrors[questionId];
    const question = questions.find(q => q.id === questionId);
    
    // Check simulation flags
    if (question?.simulation_flags?.includes('flagged')) {
      return 'warning';
    }
    
    if (!errors || errors.length === 0) return 'valid';
    
    const hasError = errors.some(e => 
      e.includes('already exists') || 
      e.includes('must be mapped') ||
      e.includes('required')
    );
    
    return hasError ? 'error' : 'warning';
  };

  // Helper to get answer format configuration
  const getAnswerFormatInfo = (format: string) => {
    return answerFormatConfig[format as keyof typeof answerFormatConfig] || 
           answerFormatConfig.single_line;
  };

  // Helper to determine question complexity
  const getQuestionComplexity = (question: any) => {
    if (question.parts && question.parts.length > 0) return 'complex';
    if (question.marks > 5) return 'extended';
    if (question.marks > 2) return 'moderate';
    return 'simple';
  };

  // Enhanced render function for dynamic answer display
  const renderDynamicAnswerDisplay = (item: any, isEditing: boolean = false) => {
    if (!item.correct_answers || item.correct_answers.length === 0) {
      if (isEditing) {
        // Allow adding answers in edit mode
        return (
          <DynamicAnswerField
            question={{
              id: item.id || 'new',
              type: item.question_type || 'descriptive',
              subject: paperMetadata.subject,
              answer_format: item.answer_format,
              answer_requirement: item.answer_requirement,
              marks: item.marks,
              correct_answers: []
            }}
            mode="admin"
            onChange={(newAnswers) => {
              if (editingQuestion) {
                const updateAnswers = (obj: any, path: string[]): any => {
                  if (path.length === 0) {
                    return { ...obj, correct_answers: newAnswers };
                  }
                  const [head, ...tail] = path;
                  if (head === 'parts' && obj.parts) {
                    const partIndex = parseInt(tail[0]);
                    return {
                      ...obj,
                      parts: obj.parts.map((p: any, i: number) => 
                        i === partIndex ? updateAnswers(p, tail.slice(1)) : p
                      )
                    };
                  }
                  if (head === 'subparts' && obj.subparts) {
                    const subpartIndex = parseInt(tail[0]);
                    return {
                      ...obj,
                      subparts: obj.subparts.map((s: any, i: number) => 
                        i === subpartIndex ? updateAnswers(s, tail.slice(1)) : s
                      )
                    };
                  }
                  return obj;
                };
                
                setEditingQuestion(updateAnswers(editingQuestion, []));
              }
            }}
          />
        );
      }
      
      return (
        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
          No correct answer provided
        </div>
      );
    }

    return (
      <DynamicAnswerField
        question={{
          id: item.id || 'question',
          type: item.question_type || 'descriptive',
          subject: paperMetadata.subject,
          answer_format: item.answer_format,
          answer_requirement: item.answer_requirement,
          marks: item.marks,
          correct_answers: item.correct_answers
        }}
        mode={isEditing ? "admin" : "review"}
        showCorrectAnswer={true}
        onChange={(newAnswers) => {
          if (editingQuestion && isEditing) {
            const updateAnswers = (obj: any, path: string[]): any => {
              if (path.length === 0) {
                return { ...obj, correct_answers: newAnswers };
              }
              const [head, ...tail] = path;
              if (head === 'parts' && obj.parts) {
                const partIndex = parseInt(tail[0]);
                return {
                  ...obj,
                  parts: obj.parts.map((p: any, i: number) => 
                    i === partIndex ? updateAnswers(p, tail.slice(1)) : p
                  )
                };
              }
              if (head === 'subparts' && obj.subparts) {
                const subpartIndex = parseInt(tail[0]);
                return {
                  ...obj,
                  subparts: obj.subparts.map((s: any, i: number) => 
                    i === subpartIndex ? updateAnswers(s, tail.slice(1)) : s
                  )
                };
              }
              return obj;
            };
            
            setEditingQuestion(updateAnswers(editingQuestion, []));
          }
        }}
      />
    );
  };

  // The rest of the component remains the same...
  // [Continue with all the render methods and JSX from the original code]
  
  const renderMetadataSummary = () => {
    // ... [Keep the same implementation as in the original code]
    const metadata = paperMetadata;
    const isEditing = editingMetadata;
    
    // Calculate question statistics
    const questionStats = {
      total: questions.length,
      mcq: questions.filter(q => q.question_type === 'mcq').length,
      descriptive: questions.filter(q => q.question_type === 'descriptive').length,
      complex: questions.filter(q => q.parts && q.parts.length > 0).length,
      withFigures: questions.filter(q => q.figure_required || (q.parts && q.parts.some((p: any) => p.figure_required))).length,
      withDynamicAnswers: questions.filter(q =>
        q.answer_requirement ||
        (q.parts && q.parts.some((p: any) => p.answer_requirement))
      ).length,
      flaggedInSimulation: questions.filter(q => q.simulation_flags?.includes('flagged')).length
    };
    
    // Calculate answer format distribution
    const answerFormatDistribution: Record<string, number> = {};
    const answerRequirementDistribution: Record<string, number> = {};
    
    questions.forEach(q => {
      if (q.parts) {
        q.parts.forEach((p: any) => {
          const format = p.answer_format || 'single_line';
          answerFormatDistribution[format] = (answerFormatDistribution[format] || 0) + 1;
          
          if (p.answer_requirement) {
            answerRequirementDistribution[p.answer_requirement] = 
              (answerRequirementDistribution[p.answer_requirement] || 0) + 1;
          }
        });
      } else {
        const format = detectAnswerFormat(q.question_text || '') || 'single_line';
        answerFormatDistribution[format] = (answerFormatDistribution[format] || 0) + 1;
        
        if (q.answer_requirement) {
          answerRequirementDistribution[q.answer_requirement] = 
            (answerRequirementDistribution[q.answer_requirement] || 0) + 1;
        }
      }
    });
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Paper Metadata
          </h3>
          <div className="flex items-center gap-2">
            {simulationResult?.completed && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  Simulation Completed
                </span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingMetadata(!isEditing)}
            >
              {isEditing ? (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Exam Board</div>
            {isEditing ? (
              <input
                type="text"
                value={metadata.exam_board}
                onChange={(e) => setPaperMetadata((prev: any) => ({ ...prev, exam_board: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium dark:bg-gray-800 dark:text-white"
              />
            ) : (
              <div className="font-medium text-gray-900 dark:text-white">{metadata.exam_board || '-'}</div>
            )}
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Session/Year</div>
            {isEditing ? (
              <div className="flex gap-1">
                <input
                  type="text"
                  value={metadata.exam_session}
                  onChange={(e) => setPaperMetadata((prev: any) => ({ ...prev, exam_session: e.target.value }))}
                  className="w-1/2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium dark:bg-gray-800 dark:text-white"
                  placeholder="Session"
                />
                <input
                  type="text"
                  value={metadata.exam_year}
                  onChange={(e) => setPaperMetadata((prev: any) => ({ ...prev, exam_year: e.target.value }))}
                  className="w-1/2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium dark:bg-gray-800 dark:text-white"
                  placeholder="Year"
                />
              </div>
            ) : (
              <div className="font-medium text-gray-900 dark:text-white">
                {metadata.exam_session} {metadata.exam_year}
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Subject</div>
            {isEditing ? (
              <input
                type="text"
                value={metadata.subject}
                onChange={(e) => setPaperMetadata((prev: any) => ({ ...prev, subject: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium dark:bg-gray-800 dark:text-white"
              />
            ) : (
              <div className="font-medium text-gray-900 dark:text-white">{metadata.subject || '-'}</div>
            )}
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Duration</div>
            {isEditing ? (
              <input
                type="text"
                value={metadata.paper_duration}
                onChange={(e) => setPaperMetadata((prev: any) => ({ ...prev, paper_duration: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium dark:bg-gray-800 dark:text-white"
              />
            ) : (
              <div className="font-medium text-gray-900 dark:text-white">{metadata.paper_duration || '-'}</div>
            )}
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Paper Code</div>
            <div className="font-medium text-gray-900 dark:text-white">{metadata.paper_code || '-'}</div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Total Marks</div>
            <div className="font-medium text-gray-900 dark:text-white">{metadata.total_marks || '-'}</div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Total Questions</div>
            <div className="font-medium text-gray-900 dark:text-white">{questions.length}</div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Status</div>
            <StatusBadge status={confirmationStatus} />
          </div>
        </div>

        {/* Question Statistics */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Question Analysis
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Hash className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">MCQ</div>
                <div className="font-medium text-gray-900 dark:text-white">{questionStats.mcq}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Descriptive</div>
                <div className="font-medium text-gray-900 dark:text-white">{questionStats.descriptive}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Multi-part</div>
                <div className="font-medium text-gray-900 dark:text-white">{questionStats.complex}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <Image className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">With Figures</div>
                <div className="font-medium text-gray-900 dark:text-white">{questionStats.withFigures}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Avg Marks</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {questions.length > 0 ? (metadata.total_marks / questions.length).toFixed(1) : '0'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/20 flex items-center justify-center">
                <Link className="h-4 w-4 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Dynamic</div>
                <div className="font-medium text-gray-900 dark:text-white">{questionStats.withDynamicAnswers}</div>
              </div>
            </div>
          </div>
          
          {/* Simulation Status */}
          {simulationResult && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                  <Flag className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Flagged</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {questionStats.flaggedInSimulation}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Issues</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {simulationResult.issues?.length || 0}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Score</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {simulationResult.overallScore ? `${simulationResult.overallScore}%` : '-'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Time</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {simulationResult.timeSpent ? `${Math.floor(simulationResult.timeSpent / 60)}m` : '-'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => {
                setEditingMetadata(false);
                toast.success('Metadata updated');
              }}
              size="sm"
            >
              <Save className="h-4 w-4 mr-1" />
              Save Changes
            </Button>
          </div>
        )}
      </div>
    );
  };

  const reviewedCount = useMemo(() => (
    questions.reduce((count, question) => (
      reviewStatuses[question.id]?.isReviewed ? count + 1 : count
    ), 0)
  ), [questions, reviewStatuses]);

  const allQuestionsReviewed = questions.length > 0 && reviewedCount === questions.length;
  const simulationCompleted = Boolean(simulationResult?.completed);
  const canImport = !isImporting && !reviewLoading && questions.length > 0 && allQuestionsReviewed && simulationCompleted;

  // Show initialization error state
  if (initializationError) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-red-200 dark:border-red-800 p-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Failed to Load Questions
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {initializationError}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => {
                    setInitializationError(null);
                    setLoading(true);
                    window.location.reload();
                  }}
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                  Retry
                </Button>
                <Button
                  variant="outline"
                  onClick={onPrevious}
                >
                  Go Back
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state with more information
  if (loading || !isInitialized) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {!academicStructureLoaded ? 'Loading academic structure...' : 'Initializing questions...'}
          </p>
        </div>
      </div>
    );
  }

  // Show warning if academic structure failed to load but allow continuation
  const showAcademicStructureWarning = !academicStructureLoaded && isInitialized;

  // Show simulation if active
  if (showSimulation && simulationPaper) {
    return (
      <UnifiedTestSimulation
        paper={simulationPaper}
        onExit={(result) => handleSimulationExit(result)}
        isQAMode={true}
        onPaperStatusChange={(newStatus) => {
          // Handle paper status changes during simulation
          console.log('Paper status changed to:', newStatus);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Academic Structure Warning */}
      {showAcademicStructureWarning && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                Academic Structure Not Loaded
              </h4>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Auto-mapping and topic selection may not work correctly. You can still review and import questions manually.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Paper Metadata Summary */}
      {renderMetadataSummary()}

      {/* PDF Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            PDF Source Document
          </h3>
        </div>

        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handlePdfUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload PDF
          </Button>
          {pdfFile && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <FileText className="h-4 w-4" />
              {pdfFile.name}
            </div>
          )}
        </div>

        {pdfDataUrl && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              PDF loaded. Use the snipping tool to capture figures and attachments for questions.
            </p>
          </div>
        )}
      </div>

      {/* Action Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleAutoMapQuestions(true)}
            disabled={autoMappingInProgress || !dataStructureInfo}
          >
            {autoMappingInProgress ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Mapping...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Auto-Map Questions
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleBulkAutoFillAnswerRequirements}
            disabled={questions.length === 0}
            title="Automatically fill missing answer requirements based on question type and format"
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Auto-Fill Requirements
          </Button>

          {Object.keys(validationErrors).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowValidation(true)}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              View {Object.keys(validationErrors).length} Errors
            </Button>
          )}

          <div className="ml-auto flex items-center gap-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {questions.length} questions
            </div>
            {Object.keys(validationErrors).length > 0 && (
              <StatusBadge
                status="warning"
                text={`${Object.keys(validationErrors).length} issues`}
              />
            )}
            {simulationResult && simulationResult.overallScore !== undefined && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Simulation Score: <span className="font-medium text-gray-900 dark:text-white">{simulationResult.overallScore}%</span>
              </div>
            )}
            {simulationResult?.completed && (
              <StatusBadge
                status="success"
                text="Simulation passed"
              />
            )}
          </div>
        </div>
      </div>

      {/* Simulation Results Summary */}
      {simulationResult && simulationResult.issues.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                Simulation Issues Found
              </h4>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                {simulationResult.issues.slice(0, 3).map((issue, idx) => (
                  <li key={idx}>
                    • Question {questions.find(q => q.id === issue.questionId)?.question_number}: {issue.message}
                  </li>
                ))}
                {simulationResult.issues.length > 3 && (
                  <li>• ...and {simulationResult.issues.length - 3} more issues</li>
                )}
              </ul>
              {simulationResult.recommendations.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-xs font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                    Recommendations:
                  </h5>
                  <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-0.5">
                    {simulationResult.recommendations.map((rec, idx) => (
                      <li key={idx}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Questions Review Section */}
      <QuestionImportReviewWorkflow
        questions={(questions || []).map((q): QuestionDisplayData => ({
          id: q.id,
          question_number: q.question_number,
          question_text: q.question_text || '',
          question_type: q.question_type as 'mcq' | 'tf' | 'descriptive' | 'calculation' | 'diagram' | 'essay',
          marks: q.marks || 0,
          unit: q.original_unit ?? q.unit ?? null,
          unit_id: q.unit_id ?? null,
          difficulty: q.difficulty,
          topic: q.topic,
          topic_id: q.topic_id ?? null,
          subtopic: q.subtopic,
          subtopic_id: q.subtopic_id ?? null,
          answer_format: q.answer_format,
          answer_requirement: q.answer_requirement,
          correct_answers: Array.isArray(q.correct_answers) ? q.correct_answers : (q.correct_answers ? [q.correct_answers] : []),
          options: Array.isArray(q.options) ? q.options : [],
          attachments: attachments[q.id] || [],
          hint: q.hint,
          explanation: q.explanation,
          requires_manual_marking: q.requires_manual_marking,
          marking_criteria: q.marking_criteria,
          parts: Array.isArray(q.parts) ? q.parts : [],
          figure_required: typeof q.figure_required === 'boolean' ? q.figure_required : (q.figure ?? false),
          figure: q.figure
        }))}
        paperTitle={paperMetadata?.paper_title || paperMetadata?.paper_code || 'Untitled Paper'}
        paperDuration={paperMetadata?.paper_duration}
        totalMarks={paperMetadata?.total_marks || questions.reduce((sum, q) => sum + (q.marks || 0), 0)}
        importSessionId={importSession?.id}
        requireSimulation={true}
        onQuestionUpdate={handleQuestionUpdateFromReview}
        onRequestSnippingTool={handleRequestSnippingTool}
        onAllQuestionsReviewed={() => {
          console.log('All questions reviewed');
        }}
        onImportReady={(canImport) => {
          console.log('Import ready status:', canImport);
        }}
      />

      {/* Import Progress */}
      {isImporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Importing Questions
            </h3>
            <div className="mb-4">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      importProgress.total > 0
                        ? Math.min(100, (importProgress.current / importProgress.total) * 100)
                        : 0
                    }%`
                  }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Processing question {importProgress.current} of {importProgress.total}
            </p>
          </div>
        </div>
      )}

      {/* PDF Snipping Tool - Modal Overlay */}
      {showSnippingTool && pdfDataUrl && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
            <PDFSnippingTool
              pdfUrl={pdfDataUrl}
              onSnip={(dataUrl, fileName) => {
                if (attachmentTarget) {
                  handleSnippingComplete({ imageDataUrl: dataUrl, fileName });
                }
              }}
              onClose={() => {
                setShowSnippingTool(false);
                setAttachmentTarget(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Inline Confirmation Dialog */}
      {pendingConfirmation && (
        <ConfirmationDialog
          isOpen={true}
          onCancel={() => {
            console.log('📋 Confirmation dialog closed (cancel)');
            pendingConfirmation.resolve(false);
            setPendingConfirmation(null);
          }}
          onConfirm={() => {
            console.log('📋 Confirmation dialog confirmed');
            pendingConfirmation.resolve(true);
            setPendingConfirmation(null);
          }}
          title={pendingConfirmation.title}
          message={pendingConfirmation.message}
          confirmText={pendingConfirmation.confirmText}
          cancelText={pendingConfirmation.cancelText}
          confirmVariant={pendingConfirmation.confirmVariant ?? 'default'}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onCancel={() => setShowConfirmDialog(false)}
        onConfirm={confirmImport}
        title="Import Questions"
        message={
          <div className="space-y-3">
            <p>Are you sure you want to import {questions.length} questions?</p>
            {simulationResult?.completed && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  Exam simulation completed successfully
                </span>
              </div>
            )}
            {simulationResult?.issues && simulationResult.issues.length > 0 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Note: {simulationResult.issues.length} issues were found during simulation but can be addressed later.
                </p>
              </div>
            )}
            {simulationResult?.recommendations && simulationResult.recommendations.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                  View recommendations ({simulationResult.recommendations.length})
                </summary>
                <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  {simulationResult.recommendations.map((rec, idx) => (
                    <li key={idx} className="pl-4">• {rec}</li>
                  ))}
                </ul>
              </details>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This action cannot be undone.
            </p>
          </div>
        }
        confirmText="Import"
        confirmVariant="default"
      />

      {/* Delete Attachment Confirmation */}
      {deleteAttachmentConfirm && (
        <ConfirmationDialog
          open={true}
          onClose={() => setDeleteAttachmentConfirm(null)}
          onConfirm={() => {
            if (deleteAttachmentConfirm) {
              handleDeleteAttachment(
                deleteAttachmentConfirm.key,
                deleteAttachmentConfirm.attachmentId
              );
              setDeleteAttachmentConfirm(null);
            }
          }}
          title="Delete Attachment"
          message="Are you sure you want to delete this attachment?"
          confirmText="Delete"
          confirmVariant="danger"
        />
      )}

      {/* Validation Modal */}
      {showValidation && Object.keys(validationErrors).length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Validation Errors
              </h3>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setShowValidation(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="space-y-4">
              {Object.entries(validationErrors).map(([questionId, errors]) => {
                const question = questions.find(q => q.id === questionId);
                if (!question) return null;
                
                return (
                  <div key={questionId} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-red-800 dark:text-red-200">
                          Question {question.question_number}
                        </h4>
                        <ul className="mt-2 space-y-1 text-sm text-red-700 dark:text-red-300">
                          {errors.map((error, idx) => (
                            <li key={idx}>• {error}</li>
                          ))}
                        </ul>
                        {question.simulation_flags?.includes('flagged') && (
                          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                            <p className="text-xs text-yellow-700 dark:text-yellow-300">
                              <Flag className="h-3 w-3 inline mr-1" />
                              Flagged in simulation: {question.simulation_notes}
                            </p>
                          </div>
                        )}
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-2 text-xs text-red-600 dark:text-red-400"
                          onClick={() => {
                            setShowValidation(false);
                            scrollToQuestion(questionId);
                          }}
                        >
                          Go to question →
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowValidation(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge
              status={allQuestionsReviewed ? 'success' : 'warning'}
              text={`Reviewed ${reviewedCount}/${questions.length || 0}`}
            />
            <StatusBadge
              status={simulationCompleted ? 'success' : 'warning'}
              text={simulationCompleted ? 'Simulation complete' : 'Simulation pending'}
            />
            {reviewLoading && (
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing review data…
              </div>
            )}
            {!simulationCompleted && (
              <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
                <AlertCircle className="h-4 w-4" />
                Complete the simulation to unlock import
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            Every question must be reviewed and a full test simulation run before importing to the live question bank.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={isImporting}
          >
            Previous
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleStartSimulation}
              disabled={questions.length === 0 || isImporting}
              leftIcon={<PlayCircle className="h-4 w-4" />}
              className={cn(
                !simulationCompleted && 'border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
              )}
              aria-label={simulationCompleted ? 'Re-run test simulation' : 'Start test simulation'}
              title="Run the student test simulation to validate the paper"
            >
              {simulationCompleted ? 'Re-run Test' : 'Test & Review'}
            </Button>
            <Button
              onClick={() => {
                console.log('=== NAVIGATION IMPORT BUTTON CLICKED ===');
                console.log('Button enabled:', canImport);
                console.log('Questions count:', questions.length);
                console.log('Is importing:', isImporting);
                console.log('Simulation completed:', simulationCompleted);

                handleImportQuestions().catch(error => {
                  console.error('Error caught in button handler:', error);
                  toast.error(`Button click failed: ${error?.message || 'Unknown error'}`);
                });
              }}
              disabled={!canImport}
              className="min-w-[140px]"
              variant="primary"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  Import Questions
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export wrapped component with Error Boundary
export function QuestionsTab(props: QuestionsTabProps) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error("QuestionsTab Error Boundary caught:", error, errorInfo);
        toast.error("An unexpected error occurred in the Questions tab");
      }}
      resetKeys={[props.importSession?.id, props.existingPaperId]}
    >
      <QuestionsTabInner {...props} />
    </ErrorBoundary>
  );
}
