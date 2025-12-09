import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  PlayCircle,
  FileCheck,
  CheckCircle,
  AlertTriangle,
  Download,
  Eye,
  Flag,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Plus,
  Trash2,
  Image as ImageIcon,
  AlertCircle,
  List,
  Paperclip,
  Scissors,
  ZoomIn,
  FileText,
  Loader2,
  Save
} from 'lucide-react';
import { Button } from './Button';
import { QuestionReviewStatus, ReviewProgress, ReviewStatus } from './QuestionReviewStatus';
import { EnhancedQuestionDisplay, QuestionDisplayData, QuestionPart } from './EnhancedQuestionDisplay';
import { supabase } from '../../lib/supabase';
import { toast } from './Toast';
import { cn } from '../../lib/utils';
import { FormField, Input, Select } from './FormField';
import { RichTextEditor } from './RichTextEditor';
import { TableTemplateImportReviewService } from '../../services/TableTemplateImportReviewService';
import {
  deriveAnswerRequirement as deriveAnswerRequirementLegacy,
  getAnswerRequirementExplanation,
  validateAnswerRequirement
} from '../../lib/extraction/answerRequirementDeriver';
import {
  ANSWER_FORMAT_OPTIONS,
  ANSWER_REQUIREMENT_OPTIONS,
  deriveAnswerFormat,
  deriveAnswerRequirement
} from '../../lib/constants/answerOptions';
import EnhancedAnswerFormatSelector from './EnhancedAnswerFormatSelector';
import DynamicAnswerField from './DynamicAnswerField';

const formatOptionLabel = (value: string) =>
  value
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

type EditableCorrectAnswer = NonNullable<QuestionDisplayData['correct_answers']>[number];
type EditableOption = NonNullable<QuestionDisplayData['options']>[number];

const countAttachmentsInParts = (parts?: QuestionPart[]): number => {
  if (!Array.isArray(parts)) {
    return 0;
  }

  return parts.reduce((total, part) => {
    const directAttachments = Array.isArray(part.attachments) ? part.attachments.length : 0;
    const subpartAttachments = countAttachmentsInParts(part.subparts);
    return total + directAttachments + subpartAttachments;
  }, 0);
};

const getQuestionAttachmentCount = (question: QuestionDisplayData): number => {
  const directAttachments = Array.isArray(question.attachments) ? question.attachments.length : 0;
  return directAttachments + countAttachmentsInParts(question.parts);
};

interface UnitRecord {
  id: string;
  name: string;
}

interface TopicRecord {
  id: string;
  name: string;
  unit_id: string | null;
}

interface SubtopicRecord {
  id: string;
  name: string;
  topic_id: string | null;
}

interface SimulationResults {
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  partiallyCorrect: number;
  incorrectAnswers: number;
  totalMarks: number;
  earnedMarks: number;
  percentage: number;
  timeSpent: number;
  questionResults: Array<{
    questionId: string;
    questionNumber: string;
    isCorrect: boolean;
    earnedMarks: number;
    totalMarks: number;
    userAnswer: any;
    correctAnswers: any[];
    feedback: string;
  }>;
}

interface QuestionImportReviewWorkflowProps {
  questions: QuestionDisplayData[];
  paperTitle: string;
  paperDuration?: string;
  totalMarks: number;
  importSessionId?: string;
  subjectId?: string;
  onAllQuestionsReviewed?: () => void;
  onImportReady?: (canImport: boolean) => void;
  onReviewSummaryChange?: (summary: {
    total: number;
    reviewed: number;
    withIssues: number;
    allReviewed: boolean;
  }) => void;
  onReviewLoadingChange?: (isLoading: boolean) => void;
  requireSimulation?: boolean;
  onQuestionUpdate?: (questionId: string, updates: Partial<QuestionDisplayData>) => void;
  onRequestSnippingTool?: (questionId: string, context?: { partIndex?: number; subpartIndex?: number }) => void;
  onRequestAttachmentDelete?: (attachmentKey: string, attachmentId: string) => void;
  onRequestSimulation?: () => void;
  simulationResults?: SimulationResults | null;
  simulationCompleted?: boolean;
  validationErrors?: Record<string, string[]>;
}

export const QuestionImportReviewWorkflow: React.FC<QuestionImportReviewWorkflowProps> = ({
  questions,
  paperTitle,
  paperDuration,
  totalMarks,
  importSessionId,
  subjectId,
  onAllQuestionsReviewed,
  onImportReady,
  onReviewSummaryChange,
  onReviewLoadingChange,
  requireSimulation = false,
  onQuestionUpdate,
  onRequestSnippingTool,
  onRequestAttachmentDelete,
  onRequestSimulation,
  simulationResults: externalSimulationResults,
  simulationCompleted: externalSimulationCompleted = false,
  validationErrors = {}
}) => {
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, ReviewStatus>>({});
  const simulationResults = externalSimulationResults;
  const simulationCompleted = externalSimulationCompleted;
  // Stores the review session ID (from question_import_review_sessions table)
  // This is different from importSessionId which is the paper import session ID
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [syncError, setSyncError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [topics, setTopics] = useState<TopicRecord[]>([]);
  const [subtopics, setSubtopics] = useState<SubtopicRecord[]>([]);
  const [isLoadingTaxonomy, setIsLoadingTaxonomy] = useState(false);
  const taxonomyErrorNotifiedRef = useRef(false);
  const [isBulkReviewing, setIsBulkReviewing] = useState(false);
  // Template storage for complex answer formats (table_completion, etc.)
  const [questionTemplates, setQuestionTemplates] = useState<Record<string, any>>({});
  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<number>(Date.now());

  const isInitializedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTaxonomy = async () => {
      setIsLoadingTaxonomy(true);
      try {
        let unitsRes, topicsRes, subtopicsRes;

        if (subjectId) {
          unitsRes = await supabase
            .from('edu_units')
            .select('id, name')
            .eq('subject_id', subjectId)
            .eq('status', 'active')
            .order('name', { ascending: true });

          if (unitsRes.error) throw unitsRes.error;

          const unitIds = (unitsRes.data ?? []).map(u => u.id);

          if (unitIds.length > 0) {
            topicsRes = await supabase
              .from('edu_topics')
              .select('id, name, unit_id')
              .in('unit_id', unitIds)
              .eq('status', 'active')
              .order('name', { ascending: true });

            if (topicsRes.error) throw topicsRes.error;

            const topicIds = (topicsRes.data ?? []).map(t => t.id);

            if (topicIds.length > 0) {
              subtopicsRes = await supabase
                .from('edu_subtopics')
                .select('id, name, topic_id')
                .in('topic_id', topicIds)
                .eq('status', 'active')
                .order('name', { ascending: true });

              if (subtopicsRes.error) throw subtopicsRes.error;
            } else {
              subtopicsRes = { data: [], error: null };
            }
          } else {
            topicsRes = { data: [], error: null };
            subtopicsRes = { data: [], error: null };
          }
        } else {
          [unitsRes, topicsRes, subtopicsRes] = await Promise.all([
            supabase.from('edu_units').select('id, name').order('name', { ascending: true }),
            supabase.from('edu_topics').select('id, name, unit_id').order('name', { ascending: true }),
            supabase.from('edu_subtopics').select('id, name, topic_id').order('name', { ascending: true })
          ]);

          if (unitsRes.error || topicsRes.error || subtopicsRes.error) {
            throw unitsRes.error || topicsRes.error || subtopicsRes.error;
          }
        }

        if (!isMounted) {
          return;
        }

        setUnits(unitsRes.data ?? []);
        setTopics(topicsRes.data ?? []);
        setSubtopics(subtopicsRes.data ?? []);
        taxonomyErrorNotifiedRef.current = false;

        console.log('✅ Taxonomy loaded (filtered by subject):', {
          subjectId,
          unitsCount: unitsRes.data?.length ?? 0,
          topicsCount: topicsRes.data?.length ?? 0,
          subtopicsCount: subtopicsRes.data?.length ?? 0
        });
      } catch (error) {
        console.error('Failed to load academic taxonomy data', error);
        if (!taxonomyErrorNotifiedRef.current) {
          toast.error('Unable to load units and topics. Please refresh or try again later.');
          taxonomyErrorNotifiedRef.current = true;
        }
      } finally {
        if (isMounted) {
          setIsLoadingTaxonomy(false);
        }
      }
    };

    fetchTaxonomy();

    return () => {
      isMounted = false;
    };
  }, [subjectId]);

  // Save question updates to database (debounced)
  const debouncedSaveToDatabase = useCallback(
    async (updatedQuestions: QuestionDisplayData[]) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setSaveStatus('saving');

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          if (!importSessionId) {
            console.warn('[Auto-Save] No import session ID, skipping save');
            setSaveStatus('idle');
            return;
          }

          // Fetch current session data
          const { data: session, error: fetchError } = await supabase
            .from('past_paper_import_sessions')
            .select('working_json, raw_json')
            .eq('id', importSessionId)
            .single();

          if (fetchError) {
            console.error('[Auto-Save] Failed to fetch session:', fetchError);
            throw fetchError;
          }

          // Get base JSON structure (preserve metadata)
          const baseJson = session.working_json || session.raw_json || {};

          // Build updated working_json with latest question data
          const workingJson = {
            ...baseJson,
            questions: updatedQuestions.map(q => ({
              ...q,
              last_updated: new Date().toISOString()
            }))
          };

          // Save to database
          const { error: updateError } = await supabase
            .from('past_paper_import_sessions')
            .update({
              working_json: workingJson,
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', importSessionId);

          if (updateError) {
            console.error('[Auto-Save] Failed to save:', updateError);
            throw updateError;
          }

          console.log(`[Auto-Save] Saved ${updatedQuestions.length} questions to working_json`);
          lastSaveRef.current = Date.now();
          setSaveStatus('saved');

          // Reset to idle after showing saved status
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
          console.error('[Auto-Save] Error:', error);
          setSaveStatus('error');
          toast.error('Failed to save changes automatically. Please try refreshing.');

          // Retry once after error
          setTimeout(() => setSaveStatus('idle'), 3000);
        }
      }, 1500); // 1.5 second debounce
    },
    [importSessionId]
  );

  const commitQuestionUpdate = useCallback(
    (question: QuestionDisplayData, updates: Partial<QuestionDisplayData>) => {
      // Update parent state (optimistic update)
      if (onQuestionUpdate) {
        onQuestionUpdate(question.id, updates);
      } else {
        console.warn('Question update attempted without handler', { questionId: question.id, updates });
      }

      // Trigger debounced save to database
      // We pass the entire questions array which will be updated by parent
      // The save will happen after debounce delay
      if (questions && questions.length > 0) {
        // Find and update the question in the array
        const updatedQuestions = questions.map(q =>
          q.id === question.id ? { ...q, ...updates } : q
        );
        debouncedSaveToDatabase(updatedQuestions);
      }
    },
    [onQuestionUpdate, questions, debouncedSaveToDatabase]
  );

  const normalizeName = useCallback((value?: string | null) => value?.trim().toLowerCase() ?? '', []);

  const taxonomyMaps = useMemo(() => {
    const unitsById = new Map<string, UnitRecord>();
    const unitsByName = new Map<string, UnitRecord>();
    const topicsById = new Map<string, TopicRecord>();
    const topicsByName = new Map<string, TopicRecord>();
    const subtopicsById = new Map<string, SubtopicRecord>();
    const subtopicsByName = new Map<string, SubtopicRecord>();

    units.forEach(unit => {
      unitsById.set(unit.id, unit);
      unitsByName.set(normalizeName(unit.name), unit);
    });

    topics.forEach(topic => {
      topicsById.set(topic.id, topic);
      topicsByName.set(normalizeName(topic.name), topic);
    });

    subtopics.forEach(subtopic => {
      subtopicsById.set(subtopic.id, subtopic);
      subtopicsByName.set(normalizeName(subtopic.name), subtopic);
    });

    return {
      unitsById,
      unitsByName,
      topicsById,
      topicsByName,
      subtopicsById,
      subtopicsByName
    };
  }, [normalizeName, units, topics, subtopics]);

  const getEffectiveSelections = useCallback(
    (question: QuestionDisplayData) => {
      const normalizedSubtopic = normalizeName(question.subtopic);
      const normalizedTopic = normalizeName(question.topic);
      const normalizedUnit = normalizeName(question.unit);

      const explicitSubtopic = question.subtopic_id ? taxonomyMaps.subtopicsById.get(question.subtopic_id) : null;
      const matchedSubtopic = explicitSubtopic || (normalizedSubtopic ? taxonomyMaps.subtopicsByName.get(normalizedSubtopic) ?? null : null);

      const explicitTopic = question.topic_id ? taxonomyMaps.topicsById.get(question.topic_id) : null;
      const matchedTopicFromSubtopic = matchedSubtopic?.topic_id ? taxonomyMaps.topicsById.get(matchedSubtopic.topic_id) ?? null : null;
      const matchedTopic =
        explicitTopic || matchedTopicFromSubtopic || (normalizedTopic ? taxonomyMaps.topicsByName.get(normalizedTopic) ?? null : null);

      const explicitUnit = question.unit_id ? taxonomyMaps.unitsById.get(question.unit_id) : null;
      const matchedUnitFromTopic = matchedTopic?.unit_id ? taxonomyMaps.unitsById.get(matchedTopic.unit_id) ?? null : null;
      const matchedUnit =
        explicitUnit || matchedUnitFromTopic || (normalizedUnit ? taxonomyMaps.unitsByName.get(normalizedUnit) ?? null : null);

      return {
        unitId: matchedUnit?.id ?? '',
        topicId: matchedTopic?.id ?? '',
        subtopicId: matchedSubtopic?.id ?? ''
      };
    },
    [normalizeName, taxonomyMaps]
  );

  const handleUnitSelect = useCallback(
    (question: QuestionDisplayData, unitId: string) => {
      if (!unitId) {
        commitQuestionUpdate(question, {
          unit_id: null,
          unit: '',
          topic_id: null,
          topic: '',
          subtopic_id: null,
          subtopic: ''
        });
        return;
      }

      const selectedUnit = taxonomyMaps.unitsById.get(unitId) ?? null;
      commitQuestionUpdate(question, {
        unit_id: unitId,
        unit: selectedUnit?.name ?? '',
        topic_id: null,
        topic: '',
        subtopic_id: null,
        subtopic: ''
      });
    },
    [commitQuestionUpdate, taxonomyMaps.unitsById]
  );

  const handleTopicSelect = useCallback(
    (question: QuestionDisplayData, topicId: string) => {
      if (!topicId) {
        commitQuestionUpdate(question, {
          topic_id: null,
          topic: '',
          subtopic_id: null,
          subtopic: ''
        });
        return;
      }

      const selectedTopic = taxonomyMaps.topicsById.get(topicId) ?? null;
      const parentUnit = selectedTopic?.unit_id ? taxonomyMaps.unitsById.get(selectedTopic.unit_id) ?? null : null;

      const currentSubtopic = question.subtopic_id ? taxonomyMaps.subtopicsById.get(question.subtopic_id) ?? null : null;
      const shouldClearSubtopic = !currentSubtopic || currentSubtopic.topic_id !== topicId;

      const nextUnitId = parentUnit?.id ?? (question.unit_id ? question.unit_id : null);
      const nextUnitName =
        parentUnit?.name ??
        (nextUnitId ? taxonomyMaps.unitsById.get(nextUnitId)?.name ?? question.unit ?? '' : question.unit ?? '');

      commitQuestionUpdate(question, {
        topic_id: topicId,
        topic: selectedTopic?.name ?? '',
        unit_id: nextUnitId,
        unit: nextUnitName,
        subtopic_id: shouldClearSubtopic ? null : question.subtopic_id ?? null,
        subtopic: shouldClearSubtopic ? '' : question.subtopic ?? ''
      });
    },
    [commitQuestionUpdate, taxonomyMaps.topicsById, taxonomyMaps.unitsById, taxonomyMaps.subtopicsById]
  );

  const handleSubtopicSelect = useCallback(
    (question: QuestionDisplayData, subtopicId: string) => {
      if (!subtopicId) {
        commitQuestionUpdate(question, {
          subtopic_id: null,
          subtopic: ''
        });
        return;
      }

      const selectedSubtopic = taxonomyMaps.subtopicsById.get(subtopicId) ?? null;
      const parentTopic = selectedSubtopic?.topic_id ? taxonomyMaps.topicsById.get(selectedSubtopic.topic_id) ?? null : null;
      const parentUnit = parentTopic?.unit_id ? taxonomyMaps.unitsById.get(parentTopic.unit_id) ?? null : null;

      commitQuestionUpdate(question, {
        subtopic_id: subtopicId,
        subtopic: selectedSubtopic?.name ?? '',
        topic_id: parentTopic?.id ?? question.topic_id ?? null,
        topic: parentTopic?.name ?? question.topic ?? '',
        unit_id: parentUnit?.id ?? question.unit_id ?? null,
        unit: parentUnit?.name ?? question.unit ?? ''
      });
    },
    [commitQuestionUpdate, taxonomyMaps.subtopicsById, taxonomyMaps.topicsById, taxonomyMaps.unitsById]
  );

  const autoFillAnswerFields = useCallback((question: QuestionDisplayData) => {
    const updates: Partial<QuestionDisplayData> = {};

    // Only auto-fill for descriptive and complex questions
    // MCQ and TF questions should NOT have these fields auto-filled
    const questionType = question.question_type || 'descriptive';
    if (questionType === 'mcq' || questionType === 'tf') {
      return updates; // Return empty updates for MCQ and TF questions
    }

    // Auto-fill answer_format if empty (only for descriptive/complex questions)
    if (!question.answer_format) {
      const derivedFormat = deriveAnswerFormat({
        type: questionType,
        question_description: question.question_text || '',
        correct_answers: question.correct_answers || [],
        has_direct_answer: true,
        is_contextual_only: false
      });

      if (derivedFormat) {
        updates.answer_format = derivedFormat;
      }
    }

    // Auto-fill answer_requirement if empty (only for descriptive/complex questions)
    if (!question.answer_requirement) {
      const derivedRequirement = deriveAnswerRequirement({
        type: questionType,
        correct_answers: question.correct_answers || [],
        total_alternatives: question.total_alternatives,
        has_direct_answer: true,
        is_contextual_only: false
      });

      if (derivedRequirement) {
        updates.answer_requirement = derivedRequirement;
      }
    }

    return updates;
  }, []);

  const handleQuestionFieldChange = <K extends keyof QuestionDisplayData>(
    question: QuestionDisplayData,
    field: K,
    value: QuestionDisplayData[K]
  ) => {
    const updates: Partial<QuestionDisplayData> = { [field]: value };

    // Determine the effective question type
    const effectiveType = (field === 'question_type' ? value : question.question_type) as string;

    // Only auto-fill for descriptive and complex questions, not for MCQ or TF
    const shouldAutoFill = effectiveType !== 'mcq' && effectiveType !== 'tf';

    // Auto-fill answer_format when question_type changes (only for descriptive/complex)
    if (field === 'question_type' && !question.answer_format && shouldAutoFill) {
      const derivedFormat = deriveAnswerFormat({
        type: value as string,
        question_description: question.question_text || '',
        correct_answers: question.correct_answers || [],
        has_direct_answer: true,
        is_contextual_only: false
      });

      if (derivedFormat) {
        updates.answer_format = derivedFormat;
      }
    }

    // Auto-fill answer_requirement when question_type or answer_format changes (only for descriptive/complex)
    if ((field === 'question_type' || field === 'answer_format') && !question.answer_requirement && shouldAutoFill) {
      const derivedRequirement = deriveAnswerRequirement({
        type: effectiveType,
        correct_answers: question.correct_answers || [],
        total_alternatives: question.total_alternatives,
        has_direct_answer: true,
        is_contextual_only: false
      });

      if (derivedRequirement) {
        updates.answer_requirement = derivedRequirement;
      }
    }

    commitQuestionUpdate(question, updates as Partial<QuestionDisplayData>);
  };

  const handleCorrectAnswerChange = (
    question: QuestionDisplayData,
    index: number,
    updates: Partial<EditableCorrectAnswer>
  ) => {
    const answers = Array.isArray(question.correct_answers) ? [...question.correct_answers] : [];
    const existing = answers[index] || { answer: '' };
    answers[index] = { ...existing, ...updates };

    const questionUpdates: Partial<QuestionDisplayData> = { correct_answers: answers };

    // Formats that require specialized components (should NOT trigger auto-fill)
    const complexFormats = [
      'code', 'audio', 'file_upload', 'table', 'table_completion',
      'diagram', 'graph', 'structural_diagram', 'chemical_structure'
    ];

    const isComplexFormat = question.answer_format && complexFormats.includes(question.answer_format);

    // Auto-fill answer fields if not set (only for descriptive/complex questions)
    // Skip auto-fill for complex formats that have their own specialized editors
    const questionType = question.question_type || 'descriptive';
    const shouldAutoFill = questionType !== 'mcq' && questionType !== 'tf' && !isComplexFormat;

    if (shouldAutoFill && (!question.answer_format || !question.answer_requirement)) {
      const autoFilled = autoFillAnswerFields({
        ...question,
        correct_answers: answers
      });
      Object.assign(questionUpdates, autoFilled);
    }

    commitQuestionUpdate(question, questionUpdates);
  };

  const handleAddCorrectAnswer = (question: QuestionDisplayData) => {
    const answers = Array.isArray(question.correct_answers) ? [...question.correct_answers] : [];
    answers.push({ answer: '', marks: answers.length > 0 ? answers[answers.length - 1]?.marks ?? 1 : 1 });

    const questionUpdates: Partial<QuestionDisplayData> = { correct_answers: answers };

    // Formats that require specialized components (should NOT trigger auto-fill)
    const complexFormats = [
      'code', 'audio', 'file_upload', 'table', 'table_completion',
      'diagram', 'graph', 'structural_diagram', 'chemical_structure'
    ];

    const isComplexFormat = question.answer_format && complexFormats.includes(question.answer_format);

    // Auto-fill answer fields if not set (only for descriptive/complex questions)
    // Skip auto-fill for complex formats that have their own specialized editors
    const questionType = question.question_type || 'descriptive';
    const shouldAutoFill = questionType !== 'mcq' && questionType !== 'tf' && !isComplexFormat;

    if (shouldAutoFill && (!question.answer_format || !question.answer_requirement)) {
      const autoFilled = autoFillAnswerFields({
        ...question,
        correct_answers: answers
      });
      Object.assign(questionUpdates, autoFilled);
    }

    commitQuestionUpdate(question, questionUpdates);
  };

  const handleRemoveCorrectAnswer = (question: QuestionDisplayData, index: number) => {
    if (!question.correct_answers) return;
    const answers = question.correct_answers.filter((_, idx) => idx !== index);

    const questionUpdates: Partial<QuestionDisplayData> = { correct_answers: answers };

    // Formats that require specialized components (should NOT trigger auto-fill)
    const complexFormats = [
      'code', 'audio', 'file_upload', 'table', 'table_completion',
      'diagram', 'graph', 'structural_diagram', 'chemical_structure'
    ];

    const isComplexFormat = question.answer_format && complexFormats.includes(question.answer_format);

    // Auto-fill answer fields if not set (only for descriptive/complex questions)
    // Skip auto-fill for complex formats that have their own specialized editors
    const questionType = question.question_type || 'descriptive';
    const shouldAutoFill = questionType !== 'mcq' && questionType !== 'tf' && !isComplexFormat;

    if (shouldAutoFill && (!question.answer_format || !question.answer_requirement)) {
      const autoFilled = autoFillAnswerFields({
        ...question,
        correct_answers: answers
      });
      Object.assign(questionUpdates, autoFilled);
    }

    commitQuestionUpdate(question, questionUpdates);
  };

  const handleOptionChange = (
    question: QuestionDisplayData,
    index: number,
    updates: Partial<EditableOption>
  ) => {
    const options = Array.isArray(question.options) ? [...question.options] : [];
    const existing = options[index] || { label: String.fromCharCode(65 + index), text: '', is_correct: false };
    options[index] = { ...existing, ...updates };
    commitQuestionUpdate(question, { options });
  };

  const handleAddOption = (question: QuestionDisplayData) => {
    const options = Array.isArray(question.options) ? [...question.options] : [];
    const nextLabel = String.fromCharCode(65 + options.length);
    options.push({ label: nextLabel, text: '', is_correct: options.length === 0 });
    commitQuestionUpdate(question, { options });
  };

  const handleRemoveOption = (question: QuestionDisplayData, index: number) => {
    if (!question.options) return;
    const options = question.options.filter((_, idx) => idx !== index).map((opt, idx) => ({
      ...opt,
      label: opt.label || String.fromCharCode(65 + idx)
    }));
    commitQuestionUpdate(question, { options });
  };

  const updateParts = (
    question: QuestionDisplayData,
    transformer: (parts: QuestionPart[]) => QuestionPart[]
  ) => {
    if (!Array.isArray(question.parts)) {
      return;
    }

    const nextParts = transformer(question.parts);
    commitQuestionUpdate(question, { parts: nextParts });
  };

  const handlePartFieldChange = (
    question: QuestionDisplayData,
    partIndex: number,
    updates: Partial<QuestionPart>
  ) => {
    updateParts(question, parts =>
      parts.map((part, idx) => (idx === partIndex ? { ...part, ...updates } : part))
    );
  };

  const handlePartCorrectAnswerChange = (
    question: QuestionDisplayData,
    partIndex: number,
    answerIndex: number,
    updates: Partial<EditableCorrectAnswer>
  ) => {
    updateParts(question, parts =>
      parts.map((part, idx) => {
        if (idx !== partIndex) return part;
        const partAnswers = Array.isArray(part.correct_answers) ? [...part.correct_answers] : [];
        const existing = partAnswers[answerIndex] || { answer: '' };
        partAnswers[answerIndex] = { ...existing, ...updates };
        return { ...part, correct_answers: partAnswers };
      })
    );
  };

  const handleAddPartCorrectAnswer = (question: QuestionDisplayData, partIndex: number) => {
    updateParts(question, parts =>
      parts.map((part, idx) => {
        if (idx !== partIndex) return part;
        const partAnswers = Array.isArray(part.correct_answers) ? [...part.correct_answers] : [];
        partAnswers.push({ answer: '', marks: partAnswers.length > 0 ? partAnswers[partAnswers.length - 1]?.marks ?? 1 : 1 });
        return { ...part, correct_answers: partAnswers };
      })
    );
  };

  const handleRemovePartCorrectAnswer = (question: QuestionDisplayData, partIndex: number, answerIndex: number) => {
    updateParts(question, parts =>
      parts.map((part, idx) => {
        if (idx !== partIndex) return part;
        const partAnswers = Array.isArray(part.correct_answers)
          ? part.correct_answers.filter((_, ansIdx) => ansIdx !== answerIndex)
          : [];
        return { ...part, correct_answers: partAnswers };
      })
    );
  };

  const handlePartOptionChange = (
    question: QuestionDisplayData,
    partIndex: number,
    optionIndex: number,
    updates: Partial<EditableOption>
  ) => {
    updateParts(question, parts =>
      parts.map((part, idx) => {
        if (idx !== partIndex) return part;
        const partOptions = Array.isArray(part.options) ? [...part.options] : [];
        const existing = partOptions[optionIndex] || {
          label: String.fromCharCode(65 + optionIndex),
          text: '',
          is_correct: false
        };
        partOptions[optionIndex] = { ...existing, ...updates };
        return { ...part, options: partOptions };
      })
    );
  };

  const handleAddPartOption = (question: QuestionDisplayData, partIndex: number) => {
    updateParts(question, parts =>
      parts.map((part, idx) => {
        if (idx !== partIndex) return part;
        const partOptions = Array.isArray(part.options) ? [...part.options] : [];
        const nextLabel = String.fromCharCode(65 + partOptions.length);
        partOptions.push({ label: nextLabel, text: '', is_correct: partOptions.length === 0 });
        return { ...part, options: partOptions };
      })
    );
  };

  const handleRemovePartOption = (question: QuestionDisplayData, partIndex: number, optionIndex: number) => {
    updateParts(question, parts =>
      parts.map((part, idx) => {
        if (idx !== partIndex) return part;
        if (!Array.isArray(part.options)) return { ...part, options: [] };
        const partOptions = part.options
          .filter((_, optIdx) => optIdx !== optionIndex)
          .map((opt, optIdx) => ({
            ...opt,
            label: opt.label || String.fromCharCode(65 + optIdx)
          }));
        return { ...part, options: partOptions };
      })
    );
  };

  const handleSubpartFieldChange = (
    question: QuestionDisplayData,
    partIndex: number,
    subpartIndex: number,
    updates: Partial<QuestionPart>
  ) => {
    updateParts(question, parts =>
      parts.map((part, idx) => {
        if (idx !== partIndex) return part;
        if (!Array.isArray(part.subparts)) return part;
        const subparts = part.subparts.map((subpart, sIdx) => (sIdx === subpartIndex ? { ...subpart, ...updates } : subpart));
        return { ...part, subparts };
      })
    );
  };

  const handleSubpartCorrectAnswerChange = (
    question: QuestionDisplayData,
    partIndex: number,
    subpartIndex: number,
    answerIndex: number,
    updates: Partial<EditableCorrectAnswer>
  ) => {
    updateParts(question, parts =>
      parts.map((part, idx) => {
        if (idx !== partIndex) return part;
        if (!Array.isArray(part.subparts)) return part;
        const subparts = part.subparts.map((subpart, sIdx) => {
          if (sIdx !== subpartIndex) return subpart;
          const subAnswers = Array.isArray(subpart.correct_answers) ? [...subpart.correct_answers] : [];
          const existing = subAnswers[answerIndex] || { answer: '' };
          subAnswers[answerIndex] = { ...existing, ...updates };
          return { ...subpart, correct_answers: subAnswers };
        });
        return { ...part, subparts };
      })
    );
  };

  const handleAddSubpartCorrectAnswer = (
    question: QuestionDisplayData,
    partIndex: number,
    subpartIndex: number
  ) => {
    updateParts(question, parts =>
      parts.map((part, idx) => {
        if (idx !== partIndex) return part;
        if (!Array.isArray(part.subparts)) return part;
        const subparts = part.subparts.map((subpart, sIdx) => {
          if (sIdx !== subpartIndex) return subpart;
          const subAnswers = Array.isArray(subpart.correct_answers) ? [...subpart.correct_answers] : [];
          subAnswers.push({ answer: '', marks: subAnswers.length > 0 ? subAnswers[subAnswers.length - 1]?.marks ?? 1 : 1 });
          return { ...subpart, correct_answers: subAnswers };
        });
        return { ...part, subparts };
      })
    );
  };

  const handleRemoveSubpartCorrectAnswer = (
    question: QuestionDisplayData,
    partIndex: number,
    subpartIndex: number,
    answerIndex: number
  ) => {
    updateParts(question, parts =>
      parts.map((part, idx) => {
        if (idx !== partIndex) return part;
        if (!Array.isArray(part.subparts)) return part;
        const subparts = part.subparts.map((subpart, sIdx) => {
          if (sIdx !== subpartIndex) return subpart;
          const subAnswers = Array.isArray(subpart.correct_answers)
            ? subpart.correct_answers.filter((_, ansIdx) => ansIdx !== answerIndex)
            : [];
          return { ...subpart, correct_answers: subAnswers };
        });
        return { ...part, subparts };
      })
    );
  };

  const handleSubpartOptionChange = (
    question: QuestionDisplayData,
    partIndex: number,
    subpartIndex: number,
    optionIndex: number,
    updates: Partial<EditableOption>
  ) => {
    updateParts(question, parts =>
      parts.map((part, idx) => {
        if (idx !== partIndex) return part;
        if (!Array.isArray(part.subparts)) return part;
        const subparts = part.subparts.map((subpart, sIdx) => {
          if (sIdx !== subpartIndex) return subpart;
          const subOptions = Array.isArray(subpart.options) ? [...subpart.options] : [];
          const existing = subOptions[optionIndex] || {
            label: String.fromCharCode(65 + optionIndex),
            text: '',
            is_correct: false
          };
          subOptions[optionIndex] = { ...existing, ...updates };
          return { ...subpart, options: subOptions };
        });
        return { ...part, subparts };
      })
    );
  };

  const handleAddSubpartOption = (
    question: QuestionDisplayData,
    partIndex: number,
    subpartIndex: number
  ) => {
    updateParts(question, parts =>
      parts.map((part, idx) => {
        if (idx !== partIndex) return part;
        if (!Array.isArray(part.subparts)) return part;
        const subparts = part.subparts.map((subpart, sIdx) => {
          if (sIdx !== subpartIndex) return subpart;
          const subOptions = Array.isArray(subpart.options) ? [...subpart.options] : [];
          const nextLabel = String.fromCharCode(65 + subOptions.length);
          subOptions.push({ label: nextLabel, text: '', is_correct: subOptions.length === 0 });
          return { ...subpart, options: subOptions };
        });
        return { ...part, subparts };
      })
    );
  };

  const handleRemoveSubpartOption = (
    question: QuestionDisplayData,
    partIndex: number,
    subpartIndex: number,
    optionIndex: number
  ) => {
    updateParts(question, parts =>
      parts.map((part, idx) => {
        if (idx !== partIndex) return part;
        if (!Array.isArray(part.subparts)) return part;
        const subparts = part.subparts.map((subpart, sIdx) => {
          if (sIdx !== subpartIndex) return subpart;
          const subOptions = Array.isArray(subpart.options)
            ? subpart.options.filter((_, optIdx) => optIdx !== optionIndex).map((opt, optIdx) => ({
                ...opt,
                label: opt.label || String.fromCharCode(65 + optIdx)
              }))
            : [];
          return { ...subpart, options: subOptions };
        });
        return { ...part, subparts };
      })
    );
  };

  // Handle template saves for complex answer formats
  const handleTemplateSave = useCallback(async (questionId: string, template: any) => {
    console.log('[Template Save] ========== TEMPLATE SAVE STARTED ==========');
    console.log('[Template Save] Question ID:', questionId);
    console.log('[Template Save] importSessionId:', importSessionId);
    console.log('[Template Save] Template data:', template);
    console.log('[Template Save] Template headers:', template.headers);
    console.log('[Template Save] Template rows/cols:', template.rows, '/', template.columns);
    console.log('[Template Save] Template cells count:', template.cells?.length);

    // Store in local state for immediate access
    setQuestionTemplates(prev => ({
      ...prev,
      [questionId]: template
    }));

    // ✅ SOLUTION 2: Direct database save to review tables
    if (importSessionId && template.rows && template.columns && Array.isArray(template.cells)) {
      console.log('[Template Save] ✅ Attempting DIRECT save to review tables');

      try {
        const result = await TableTemplateImportReviewService.saveTemplateForReview({
          importSessionId: importSessionId,
          questionIdentifier: questionId,
          isSubquestion: false,
          rows: template.rows,
          columns: template.columns,
          headers: template.headers || [],
          title: template.title,
          description: template.description,
          cells: template.cells
        });

        if (result.success) {
          console.log('[Template Save] ✅ SUCCESS! Saved to review database, template ID:', result.templateId);
          toast.success('✅ Template saved to database!', {
            description: 'Changes are persisted and will migrate on import approval',
            duration: 3000
          });
        } else {
          console.error('[Template Save] ❌ Failed to save to review database:', result.error);
          toast.error('Failed to save template to database', {
            description: result.error,
            duration: 5000
          });
        }
      } catch (error) {
        console.error('[Template Save] ❌ Exception during save:', error);
        toast.error('Error saving template', {
          description: error instanceof Error ? error.message : 'Unknown error',
          duration: 5000
        });
      }
    } else {
      console.warn('[Template Save] ⚠️ Cannot save to review tables:', {
        hasReviewSessionId: !!importSessionId,
        hasRows: !!template.rows,
        hasColumns: !!template.columns,
        hasCells: Array.isArray(template.cells)
      });
    }

    // Find the question in the current questions array
    const question = questions.find(q => q.id === questionId);
    if (!question) {
      console.error('[Template Save] ❌ Question not found:', questionId);
      return;
    }

    console.log('[Template Save] Found question:', question.id, question.question_number);

    // Convert template to correct_answers format
    // For table_completion, store the entire template as a JSON string in correct_answers
    const templateAnswer = {
      answer_text: JSON.stringify(template),
      marks: template.cells?.filter((c: any) => c.cellType === 'editable').length || 1,
      answer_type: 'table_template'
    };

    // Update the question's correct_answers
    const updatedAnswers = [templateAnswer];

    console.log('[Template Save] Created answer object:', {
      answer_type: templateAnswer.answer_type,
      marks: templateAnswer.marks,
      answer_text_length: templateAnswer.answer_text.length,
      answer_text_preview: templateAnswer.answer_text.substring(0, 200)
    });

    console.log('[Template Save] Calling commitQuestionUpdate with correct_answers');

    // Trigger the question update which will auto-save
    commitQuestionUpdate(question, { correct_answers: updatedAnswers });

    console.log('[Template Save] ========== TEMPLATE SAVE COMPLETE ==========');
  }, [questions, commitQuestionUpdate, importSessionId]);

  // Save all questions to database immediately
  const saveAllQuestionsToDatabase = useCallback(async () => {
    if (!importSessionId) {
      console.warn('[Save All] No import session ID');
      return;
    }

    try {
      setSaveStatus('saving');
      console.log('[Save All] Saving all questions...');

      // Fetch current session
      const { data: session, error: fetchError } = await supabase
        .from('past_paper_import_sessions')
        .select('working_json, raw_json')
        .eq('id', importSessionId)
        .single();

      if (fetchError) throw fetchError;

      const baseJson = session.working_json || session.raw_json || {};

      const workingJson = {
        ...baseJson,
        questions: questions.map(q => ({
          ...q,
          last_updated: new Date().toISOString()
        }))
      };

      const { error: updateError } = await supabase
        .from('past_paper_import_sessions')
        .update({
          working_json: workingJson,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', importSessionId);

      if (updateError) throw updateError;

      console.log(`[Save All] Successfully saved ${questions.length} questions`);
      lastSaveRef.current = Date.now();
      setSaveStatus('saved');
      toast.success('All changes saved successfully');

      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('[Save All] Failed to save:', error);
      setSaveStatus('error');
      toast.error('Failed to save all changes');
    }
  }, [importSessionId, questions]);

  const renderAnswerEditorList = (
    answers: EditableCorrectAnswer[] | undefined,
    config: {
      onChange: (index: number, updates: Partial<EditableCorrectAnswer>) => void;
      onRemove: (index: number) => void;
      onAdd: () => void;
      title: string;
      emptyLabel: string;
      keyPrefix: string;
    },
    questionContext?: {
      id: string;
      question_type?: string;
      answer_format?: string | null;
      answer_requirement?: string | null;
      marks?: number;
      subject?: string;
    }
  ) => {
    const list = Array.isArray(answers) ? answers : [];

    // Formats that require specialized components (should use DynamicAnswerField)
    const complexFormats = [
      'code', 'audio', 'file_upload', 'table', 'table_completion',
      'diagram', 'graph', 'structural_diagram', 'chemical_structure'
    ];

    const useComplexInput = questionContext?.answer_format &&
      complexFormats.includes(questionContext.answer_format);

    // If format requires specialized component, use DynamicAnswerField
    if (useComplexInput && questionContext) {
      // For table_completion format, extract template from correct_answers if it exists
      let initialValue: string | undefined;
      if (questionContext.answer_format === 'table_completion' && list.length > 0) {
        console.log('[Template Load] ========== TEMPLATE LOAD STARTED ==========');
        console.log('[Template Load] Question ID:', questionContext.id);
        console.log('[Template Load] Answer format:', questionContext.answer_format);
        console.log('[Template Load] correct_answers list:', list);
        console.log('[Template Load] correct_answers count:', list.length);

        const templateAnswer = list.find(
          (ans: any) => ans.answer_type === 'table_template' || ans.answer_text
        );

        console.log('[Template Load] Found template answer:', templateAnswer);

        if (templateAnswer?.answer_text) {
          initialValue = templateAnswer.answer_text;
          console.log('[Template Load] ✅ Template data found');
          console.log('[Template Load] Template length:', initialValue.length);
          console.log('[Template Load] Template preview:', initialValue.substring(0, 200));

          // Try to parse and log the template structure
          try {
            const parsed = JSON.parse(initialValue);
            console.log('[Template Load] Parsed template:', {
              headers: parsed.headers,
              rows: parsed.rows,
              columns: parsed.columns,
              cellsCount: parsed.cells?.length
            });
          } catch (e) {
            console.error('[Template Load] ❌ Failed to parse template:', e);
          }
        } else {
          console.warn('[Template Load] ⚠️ No template data found in correct_answers');
        }

        // NOTE: preview_data (student answers) is loaded separately by DynamicAnswerField
        // via question.preview_data prop (line 1213). Do NOT overwrite initialValue here!
        // initialValue contains the template structure from correct_answers
        // preview_data contains student/test data and is passed via question prop
        console.log('[Template Load] Template structure loaded. Preview data will be loaded from question.preview_data prop.');
        console.log('[Template Load] ========== TEMPLATE LOAD COMPLETE ==========');
      }

      return (
        <div className="space-y-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Using specialized input for "{questionContext.answer_format}" format</p>
                <p className="text-blue-700 dark:text-blue-300">
                  The answer field below uses the same component students will see, allowing you to preview and test the question format.
                </p>
              </div>
            </div>
          </div>

          {/* Diagnostic info - remove after debugging */}
          {!importSessionId && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800 text-sm">
                <span className="font-semibold">⚠️ Debug:</span>
                <span>Review session not initialized yet (importSessionId is null)</span>
              </div>
            </div>
          )}

          <DynamicAnswerField
            key={`${questionContext.id}-${importSessionId || 'loading'}`}
            question={{
              id: questionContext.id,
              type: questionContext.question_type || 'descriptive',
              subject: questionContext.subject || subjectId,
              answer_format: questionContext.answer_format,
              answer_requirement: questionContext.answer_requirement,
              marks: questionContext.marks,
              correct_answers: list,
              // CRITICAL FIX: Pass preview_data for table completion student answers
              preview_data: (questions.find(q => q.id === questionContext.id) as any)?.preview_data
            }}
            value={initialValue}
            mode="admin"
            forceTemplateEditor={true}
            importSessionId={importSessionId}
            questionIdentifier={questionContext.id}
            onTemplateSave={(template) => handleTemplateSave(questionContext.id, template)}
            onChange={(newAnswers) => {
              console.log('[QuestionImportReviewWorkflow] onChange received:', typeof newAnswers, newAnswers);

              // Handle table_completion student data (preview/test data)
              if (questionContext.answer_format === 'table_completion' && typeof newAnswers === 'string') {
                try {
                  const parsed = JSON.parse(newAnswers);
                  console.log('[QuestionImportReviewWorkflow] Parsed table completion data:', parsed);

                  // Store student/preview data separately from template structure
                  if (parsed && 'studentAnswers' in parsed) {
                    console.log('[QuestionImportReviewWorkflow] Storing table preview data');
                    const question = questions.find(q => q.id === questionContext.id);
                    if (question) {
                      commitQuestionUpdate(question, {
                        preview_data: newAnswers // Store as JSON string
                      });
                    }
                    return;
                  }
                } catch (e) {
                  console.warn('[QuestionImportReviewWorkflow] Failed to parse table completion data:', e);
                }
              }

              // Handle array-based answers (normal flow)
              if (Array.isArray(newAnswers) && newAnswers.length > 0) {
                // Update each answer
                newAnswers.forEach((newAnswer, index) => {
                  if (index < list.length) {
                    config.onChange(index, newAnswer);
                  }
                });
              }
            }}
          />
        </div>
      );
    }

    // For simple formats, use the existing RichTextEditor approach
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <FileCheck className="h-4 w-4" /> {config.title}
          </h4>
          <Button
            size="sm"
            variant="outline"
            onClick={config.onAdd}
          >
            <Plus className="h-4 w-4 mr-1" /> Add answer
          </Button>
        </div>

        {list.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-4 text-sm text-gray-600 dark:text-gray-300">
            {config.emptyLabel}
          </div>
        )}

        {list.map((answer, index) => (
          <div
            key={`${config.keyPrefix}-answer-${index}`}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3"
          >
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <FormField
                id={`${config.keyPrefix}-answer-${index}-text`}
                label="Answer text"
                className="mb-0"
              >
                <RichTextEditor
                  value={answer?.answer ?? ''}
                  onChange={(content) => config.onChange(index, { answer: content })}
                  placeholder="Describe the expected answer or mark scheme"
                  ariaLabel="Correct answer rich text editor"
                  className="min-h-[160px]"
                />
              </FormField>
              <FormField
                id={`${config.keyPrefix}-answer-${index}-marks`}
                label="Marks"
                className="mb-0 md:w-24"
              >
                <Input
                  id={`${config.keyPrefix}-answer-${index}-marks`}
                  type="number"
                  min={0}
                  value={(answer?.marks ?? 0).toString()}
                  onChange={event => {
                    const value = Number(event.target.value);
                    config.onChange(index, { marks: Number.isNaN(value) ? undefined : value });
                  }}
                />
              </FormField>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <FormField
                id={`${config.keyPrefix}-answer-${index}-unit`}
                label="Unit / context"
                className="mb-0"
              >
                <Input
                  id={`${config.keyPrefix}-answer-${index}-unit`}
                  value={answer?.unit ?? ''}
                  onChange={event => config.onChange(index, { unit: event.target.value })}
                  placeholder="e.g. cm, kg"
                />
              </FormField>
              <FormField
                id={`${config.keyPrefix}-answer-${index}-requirement`}
                label="Answer requirement"
                className="mb-0"
              >
                <Input
                  id={`${config.keyPrefix}-answer-${index}-requirement`}
                  value={answer?.answer_requirement ?? ''}
                  onChange={event => config.onChange(index, { answer_requirement: event.target.value })}
                  placeholder="e.g. 2 significant figures"
                />
              </FormField>
              <FormField
                id={`${config.keyPrefix}-answer-${index}-notes`}
                label="Notes"
                className="mb-0"
              >
                <Input
                  id={`${config.keyPrefix}-answer-${index}-notes`}
                  value={answer?.context ?? ''}
                  onChange={event => config.onChange(index, { context: event.target.value })}
                  placeholder="Marker notes or context"
                />
              </FormField>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(answer?.accepts_equivalent_phrasing)}
                    onChange={event => config.onChange(index, { accepts_equivalent_phrasing: event.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-[#8CC63F] focus:ring-[#8CC63F]"
                  />
                  Accept equivalent phrasing
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(answer?.error_carried_forward)}
                    onChange={event => config.onChange(index, { error_carried_forward: event.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-[#8CC63F] focus:ring-[#8CC63F]"
                  />
                  Allow error carried forward
                </label>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => config.onRemove(index)}
                aria-label="Remove answer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderOptionsEditorList = (
    options: EditableOption[] | undefined,
    config: {
      onChange: (index: number, updates: Partial<EditableOption>) => void;
      onRemove: (index: number) => void;
      onAdd: () => void;
      title: string;
      emptyLabel: string;
      keyPrefix: string;
    }
  ) => {
    const list = Array.isArray(options) ? options : [];

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <List className="h-4 w-4" /> {config.title}
          </h4>
          <Button
            size="sm"
            variant="outline"
            onClick={config.onAdd}
          >
            <Plus className="h-4 w-4 mr-1" /> Add option
          </Button>
        </div>

        {list.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-4 text-sm text-gray-600 dark:text-gray-300">
            {config.emptyLabel}
          </div>
        )}

        {list.map((option, index) => (
          <div
            key={`${config.keyPrefix}-option-${index}`}
            className={cn(
              'rounded-lg border p-4 space-y-3 transition-colors',
              option?.is_correct
                ? 'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-900/20'
                : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
            )}
          >
            <div className="grid gap-3 md:grid-cols-[80px_minmax(0,1fr)]">
              <FormField
                id={`${config.keyPrefix}-option-${index}-label`}
                label="Label"
                className="mb-0"
              >
                <Input
                  id={`${config.keyPrefix}-option-${index}-label`}
                  value={option?.label ?? String.fromCharCode(65 + index)}
                  onChange={event => config.onChange(index, { label: event.target.value })}
                />
              </FormField>
              <FormField
                id={`${config.keyPrefix}-option-${index}-text`}
                label="Option text"
                className="mb-0"
              >
                <RichTextEditor
                  value={option?.text ?? ''}
                  onChange={(content) => config.onChange(index, { text: content })}
                  placeholder="Enter the option text"
                  ariaLabel="Answer option rich text editor"
                  className="min-h-[140px]"
                />
              </FormField>
            </div>

            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={Boolean(option?.is_correct)}
                  onChange={event => config.onChange(index, { is_correct: event.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                Mark as correct answer
              </label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => config.onRemove(index)}
                aria-label="Remove option"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render inline attachment display with preview
  const renderInlineAttachments = (
    attachments: any[] | undefined,
    contextLabel: string
  ) => {
    if (!attachments || attachments.length === 0) {
      return null;
    }

    return (
      <div className="mt-3 space-y-2">
        <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <ImageIcon className="h-3.5 w-3.5" />
          Attached Figure{attachments.length > 1 ? 's' : ''} for {contextLabel}
        </h5>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-3">
            {attachments.map((attachment, index) => {
              const imageSrc = attachment.url || attachment.file_url || attachment.dataUrl || attachment.data;
              const fileName = attachment.file_name || `Attachment ${index + 1}`;
              const isImage = imageSrc && (
                attachment.file_type?.startsWith('image/') ||
                imageSrc.startsWith('data:image/') ||
                /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName)
              );

              return (
                <div
                  key={attachment.id || index}
                  className="group relative bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-md"
                  style={{ maxWidth: '200px' }}
                >
                  {isImage && imageSrc ? (
                    <div className="relative">
                      <img
                        src={imageSrc}
                        alt={fileName}
                        className="w-full h-auto object-contain"
                        style={{ maxHeight: '150px' }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button
                          className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-full p-2 shadow-lg hover:scale-110 transition-transform"
                          onClick={() => {
                            // Preview image in a modal or new window
                            const preview = window.open('', '_blank');
                            if (preview) {
                              preview.document.write(`<img src="${imageSrc}" style="max-width: 100%; height: auto;" />`);
                            }
                          }}
                          title="Preview image"
                        >
                          <ZoomIn className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-gray-500 dark:text-gray-400">
                      <FileText className="h-8 w-8 mb-2" />
                      <p className="text-xs text-center truncate w-full px-2">{fileName}</p>
                    </div>
                  )}
                  <div className="px-2 py-1.5 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate" title={fileName}>
                      {fileName}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const questionTypeOptions = useMemo(
    () => [
      { value: 'mcq' as const, label: 'Multiple choice' },
      { value: 'tf' as const, label: 'True / False' },
      { value: 'descriptive' as const, label: 'Descriptive' },
      { value: 'calculation' as const, label: 'Calculation' },
      { value: 'diagram' as const, label: 'Diagram' },
      { value: 'essay' as const, label: 'Essay' }
    ],
    []
  );

  const difficultyOptions = useMemo(
    () =>
      ['Easy', 'Medium', 'Hard'].map(value => ({
        value,
        label: value,
      })),
    []
  );

  const answerFormatOptions = useMemo(
    () =>
      ANSWER_FORMAT_OPTIONS.map(option => ({
        value: option.value,
        label: option.label,
      })),
    []
  );

  const answerRequirementOptions = useMemo(
    () =>
      ANSWER_REQUIREMENT_OPTIONS.map(option => ({
        value: option.value,
        label: option.label,
      })),
    []
  );
  // Memoize questions array to prevent unnecessary re-renders
  const memoizedQuestions = useMemo(() => {
    return questions.map(q => ({
      ...q,
      correct_answers: q.correct_answers || [] // Ensure correct_answers is always an array
    }));
  }, [questions, importSessionId]);

  // Initialize review session
  useEffect(() => {
    // Prevent duplicate initialization
    if (isInitializedRef.current && importSessionId) {
      return;
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    initializeReviewSession();

    return () => {
      // Cleanup: abort any pending operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [importSessionId]); // Only depend on importSessionId, not questions

  // Check if ready to import
  useEffect(() => {
    const allReviewed = Object.values(reviewStatuses).every(status => status.isReviewed);
    const simulationPassed = !requireSimulation || (simulationResults && simulationResults.percentage >= 70);
    const canImport = allReviewed && simulationPassed;

    if (allReviewed && onAllQuestionsReviewed) {
      onAllQuestionsReviewed();
    }

    if (onImportReady) {
      onImportReady(canImport);
    }

    if (onReviewSummaryChange) {
      const total = memoizedQuestions.length;
      const reviewed = Object.values(reviewStatuses).filter(status => status.isReviewed).length;
      const withIssues = Object.values(reviewStatuses).filter(status => status.hasIssues).length;

      onReviewSummaryChange({
        total,
        reviewed,
        withIssues,
        allReviewed: total > 0 && reviewed === total,
      });
    }
  }, [
    reviewStatuses,
    simulationResults,
    requireSimulation,
    onAllQuestionsReviewed,
    onImportReady,
    onReviewSummaryChange,
    memoizedQuestions.length,
  ]);

  useEffect(() => {
    if (onReviewLoadingChange) {
      onReviewLoadingChange(isInitializing);
    }
  }, [isInitializing, onReviewLoadingChange]);

  // Auto-fill empty answer_format and answer_requirement fields when questions load
  useEffect(() => {
    if (!memoizedQuestions || memoizedQuestions.length === 0 || isInitializing) {
      return;
    }

    // Check each question and auto-fill if needed
    memoizedQuestions.forEach(question => {
      if (!question.answer_format || !question.answer_requirement) {
        const updates = autoFillAnswerFields(question);

        if (Object.keys(updates).length > 0) {
          console.log(`Auto-filling answer fields for question ${question.question_number}:`, updates);
          commitQuestionUpdate(question, updates);
        }
      }
    });
  }, [memoizedQuestions, isInitializing, autoFillAnswerFields, commitQuestionUpdate]);

  const initializeReviewSession = useCallback(async () => {
    // Check if already initialized
    if (isInitializedRef.current && importSessionId) {
      console.log('Review session already initialized, skipping...');
      return;
    }

    try {
      setIsInitializing(true);
      setSyncError(null);

      console.log('Initializing review session...', { importSessionId, questionCount: memoizedQuestions.length });

      // Get current user with retry
      let user = null;
      let authRetries = 0;
      while (authRetries < 3) {
        try {
          const { data, error } = await supabase.auth.getUser();
          if (error) throw error;
          user = data.user;
          break;
        } catch (authError) {
          authRetries++;
          console.warn(`Auth attempt ${authRetries} failed:`, authError);
          if (authRetries === 3) throw authError;
          await new Promise(resolve => setTimeout(resolve, 1000 * authRetries));
        }
      }

      if (!user) {
        setSyncError('User not authenticated. Please log in again.');
        toast.error('User not authenticated');
        return;
      }

      // Check if there's an existing review session
      let sessionId: string | null = null;

      if (importSessionId) {
        try {
          const { data: existingSession, error: sessionError } = await supabase
            .from('question_import_review_sessions')
            .select('*')
            .eq('paper_import_session_id', importSessionId)
            .eq('user_id', user.id)
            .eq('status', 'in_progress')
            .maybeSingle();

          if (sessionError) {
            console.error('Error fetching existing session:', sessionError);
            throw sessionError;
          }

          if (existingSession) {
            console.log('Found existing review session:', existingSession.id);
            sessionId = existingSession.id;
            setLocalSessionId(sessionId);

            // Load existing review statuses
            const { data: existingStatuses, error: statusError } = await supabase
              .from('question_import_review_status')
              .select('*')
              .eq('review_session_id', sessionId);

            if (statusError) {
              console.error('Error fetching review statuses:', statusError);
              throw statusError;
            }

            if (existingStatuses && existingStatuses.length > 0) {
              const statusMap: Record<string, ReviewStatus> = {};
              existingStatuses.forEach(status => {
                statusMap[status.question_identifier] = {
                  questionId: status.question_identifier,
                  isReviewed: status.is_reviewed,
                  reviewedAt: status.reviewed_at,
                  hasIssues: status.has_issues,
                  issueCount: status.issue_count,
                  needsAttention: status.needs_attention
                };
              });
              setReviewStatuses(statusMap);
              console.log(`Loaded ${existingStatuses.length} existing review statuses`);
            }

            // Load simulation results if they exist
            const { data: simResults, error: simError } = await supabase
              .from('question_import_simulation_results')
              .select('*')
              .eq('review_session_id', sessionId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (simError) {
              console.warn('Error fetching simulation results (non-critical):', simError);
            } else if (simResults) {
              setSimulationResults({
                totalQuestions: simResults.total_questions,
                answeredQuestions: simResults.answered_questions,
                correctAnswers: simResults.correct_answers,
                partiallyCorrect: simResults.partially_correct,
                incorrectAnswers: simResults.incorrect_answers,
                totalMarks: simResults.total_marks,
                earnedMarks: parseFloat(simResults.earned_marks),
                percentage: parseFloat(simResults.percentage),
                timeSpent: simResults.time_spent_seconds,
                questionResults: simResults.question_results || []
              });
              console.log('Loaded simulation results');
            }
          }
        } catch (err) {
          console.error('Error loading existing session:', err);
          // Continue to create new session
        }
      }

      // Create new session if needed
      if (!sessionId && importSessionId) {
        console.log('Creating new review session...');
        const { data: newSession, error } = await supabase
          .from('question_import_review_sessions')
          .insert({
            paper_import_session_id: importSessionId,
            user_id: user.id,
            total_questions: memoizedQuestions.length,
            simulation_required: requireSimulation,
            metadata: {
              paper_title: paperTitle,
              paper_duration: paperDuration,
              total_marks: totalMarks
            }
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating review session:', error);
          throw error;
        }

        sessionId = newSession.id;
        setLocalSessionId(sessionId);
        console.log('Created new review session:', sessionId);

        // Initialize review statuses for all questions
        const initialStatuses = memoizedQuestions.map(q => ({
          review_session_id: sessionId,
          question_identifier: q.id,
          question_number: q.question_number,
          question_data: q,
          is_reviewed: false,
          has_issues: false,
          issue_count: 0,
          validation_status: 'pending'
        }));

        const { error: statusError } = await supabase
          .from('question_import_review_status')
          .insert(initialStatuses);

        if (statusError) {
          console.error('Error inserting review statuses:', statusError);
          throw statusError;
        }

        // Initialize local state
        const statusMap: Record<string, ReviewStatus> = {};
        memoizedQuestions.forEach(q => {
          statusMap[q.id] = {
            questionId: q.id,
            isReviewed: false,
            hasIssues: false,
            issueCount: 0,
            needsAttention: false
          };
        });
        setReviewStatuses(statusMap);
        console.log(`Initialized ${memoizedQuestions.length} review statuses`);
      }

      // Mark as initialized
      isInitializedRef.current = true;
      console.log('Review session initialization complete');
    } catch (error: any) {
      console.error('Error initializing review session:', error);
      const errorMessage = error?.message || 'Failed to initialize review session';
      setSyncError(errorMessage);
      toast.error(`Unable to sync question review progress: ${errorMessage}`);
      setRetryCount(prev => prev + 1);
    } finally {
      setIsInitializing(false);
    }
  }, [importSessionId, memoizedQuestions.length, paperTitle, paperDuration, totalMarks, requireSimulation, importSessionId]);

  const handleToggleReview = async (questionId: string) => {
    if (!localSessionId) return;

    const currentStatus = reviewStatuses[questionId];
    const newReviewedState = !currentStatus?.isReviewed;

    try {
      // Update in database
      const { error } = await supabase
        .from('question_import_review_status')
        .update({
          is_reviewed: newReviewedState,
          reviewed_at: newReviewedState ? new Date().toISOString() : null,
          reviewed_by: newReviewedState ? (await supabase.auth.getUser()).data.user?.id : null
        })
        .eq('review_session_id', localSessionId)
        .eq('question_identifier', questionId);

      if (error) throw error;

      // Update local state
      setReviewStatuses(prev => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          isReviewed: newReviewedState,
          reviewedAt: newReviewedState ? new Date().toISOString() : undefined
        }
      }));

      toast.success(
        newReviewedState ? 'Question marked as reviewed' : 'Review status removed',
        {
          id: 'question-review-status',
          duration: 3500,
        },
      );
    } catch (error) {
      console.error('Error updating review status:', error);
      toast.error('Failed to update review status', {
        id: 'question-review-error',
      });
    }
  };

  const handleMarkAllReviewed = useCallback(async () => {
    if (!localSessionId) {
      return;
    }

    const unreviewedQuestionIds = memoizedQuestions
      .map(question => question.id)
      .filter((id): id is string => Boolean(id) && !reviewStatuses[id]?.isReviewed);

    if (unreviewedQuestionIds.length === 0) {
      toast.info('All questions are already marked as reviewed.', {
        id: 'question-bulk-review-info',
      });
      return;
    }

    setIsBulkReviewing(true);

    try {
      const now = new Date().toISOString();
      const { data: userData } = await supabase.auth.getUser();
      const reviewerId = userData?.user?.id ?? null;

      const { error } = await supabase
        .from('question_import_review_status')
        .update({
          is_reviewed: true,
          reviewed_at: now,
          reviewed_by: reviewerId,
        })
        .eq('review_session_id', localSessionId)
        .in('question_identifier', unreviewedQuestionIds);

      if (error) {
        throw error;
      }

      setReviewStatuses(prev => {
        const updated = { ...prev };
        unreviewedQuestionIds.forEach(id => {
          const existing = updated[id];
          updated[id] = {
            ...(existing ?? { questionId: id }),
            isReviewed: true,
            reviewedAt: now,
          };
        });
        return updated;
      });

      toast.success(`Marked ${unreviewedQuestionIds.length} question${unreviewedQuestionIds.length === 1 ? '' : 's'} as reviewed.`, {
        id: 'question-bulk-review-success',
        duration: 4000,
      });
    } catch (error) {
      console.error('Failed to mark all questions as reviewed:', error);
      toast.error('Unable to mark all questions as reviewed. Please try again.', {
        id: 'question-bulk-review-error',
      });
    } finally {
      setIsBulkReviewing(false);
    }
  }, [memoizedQuestions, localSessionId, reviewStatuses]);

  const handleStartSimulation = () => {
    // Validate questions before requesting simulation from parent
    const invalidQuestions = memoizedQuestions.filter(q =>
      !q.id || !q.question_number || !q.question_text || q.marks === undefined
    );

    if (invalidQuestions.length > 0) {
      toast.error(
        `${invalidQuestions.length} question(s) have missing required data. Please fix before starting test.`,
        {
          id: 'question-validation-error',
          duration: 6000,
        },
      );
      console.error('Invalid questions:', invalidQuestions);
      return;
    }

    // Request parent component to handle simulation
    if (onRequestSimulation) {
      onRequestSimulation();
    } else {
      toast.error('Simulation is not available in this context. Use the main test simulation button.', {
        id: 'question-simulation-error',
      });
    }
  };

  const handleRetrySync = () => {
    isInitializedRef.current = false;
    setLocalSessionId(null);
    setSyncError(null);
    initializeReviewSession();
  };

  const handleSimulationComplete = async (results: SimulationResults) => {
    if (!localSessionId) return;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Save simulation results to database
      const { error } = await supabase
        .from('question_import_simulation_results')
        .insert({
          review_session_id: localSessionId,
          user_id: user.id,
          simulation_completed_at: new Date().toISOString(),
          total_questions: results.totalQuestions,
          answered_questions: results.answeredQuestions,
          correct_answers: results.correctAnswers,
          partially_correct: results.partiallyCorrect,
          incorrect_answers: results.incorrectAnswers,
          total_marks: results.totalMarks,
          earned_marks: results.earnedMarks,
          percentage: results.percentage,
          time_spent_seconds: results.timeSpent,
          passed: results.percentage >= 70,
          pass_threshold: 70.0,
          question_results: results.questionResults
        });

      if (error) throw error;

      // Update review session
      await supabase
        .from('question_import_review_sessions')
        .update({
          simulation_completed: true,
          simulation_passed: results.percentage >= 70,
          updated_at: new Date().toISOString()
        })
        .eq('id', localSessionId);

      setSimulationResults(results);
      toast.success('Simulation completed successfully');
    } catch (error) {
      console.error('Error saving simulation results:', error);
      toast.error('Failed to save simulation results');
    }
  };


  const toggleQuestionExpansion = (questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedQuestions(new Set(questions.map(q => q.id)));
  };

  const collapseAll = () => {
    setExpandedQuestions(new Set());
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initializing review session...</p>
        </div>
      </div>
    );
  }


  const reviewedCount = Object.values(reviewStatuses).filter(s => s.isReviewed).length;
  const questionsWithIssues = Object.values(reviewStatuses).filter(s => s.hasIssues).length;
  const allReviewed = reviewedCount === memoizedQuestions.length;
  const simulationPassed = simulationResults && simulationResults.percentage >= 70;

  return (
    <div className="space-y-6">
      {/* Sync Error Banner */}
      {syncError && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                Unable to sync question review progress
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                {syncError}
              </p>
              <Button onClick={handleRetrySync} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review Progress Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              Question Review & Validation
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {memoizedQuestions.length} question{memoizedQuestions.length !== 1 ? 's' : ''}
              </span>
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click any question card to expand/collapse. Review each question carefully before importing to the question bank.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button onClick={expandAll} variant="outline" size="sm">
              Expand All
            </Button>
            <Button onClick={collapseAll} variant="outline" size="sm">
              Collapse All
            </Button>
            <Button
              onClick={handleMarkAllReviewed}
              variant="success"
              size="sm"
              leftIcon={<CheckCircle className="h-4 w-4" />}
              loading={isBulkReviewing}
              loadingText="Confirming..."
              disabled={memoizedQuestions.length === 0 || reviewedCount === memoizedQuestions.length}
              tooltip="Mark every question in this import as reviewed"
            >
              Confirm All
            </Button>
          </div>
        </div>

        <ReviewProgress
          total={memoizedQuestions.length}
          reviewed={reviewedCount}
          withIssues={questionsWithIssues}
        />

        {/* Simulation Card */}
        {requireSimulation && (
          <div className="mt-6 pt-6 border-t border-blue-200 dark:border-blue-700">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <PlayCircle className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Test Simulation {simulationResults ? '(Completed)' : '(Required)'}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {simulationResults
                      ? `Score: ${simulationResults.percentage}% (${simulationResults.earnedMarks}/${simulationResults.totalMarks} marks)`
                      : 'Complete a test simulation to validate question quality'
                    }
                  </p>
                  {simulationResults && (
                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                      <span>✓ {simulationResults.correctAnswers} correct</span>
                      <span>⚠ {simulationResults.partiallyCorrect} partial</span>
                      <span>✗ {simulationResults.incorrectAnswers} incorrect</span>
                      <span>⏱ {Math.floor(simulationResults.timeSpent / 60)}m {simulationResults.timeSpent % 60}s</span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                onClick={handleStartSimulation}
                variant={simulationResults ? 'outline' : 'default'}
                size="sm"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                {simulationResults ? 'Retake Test' : 'Start Test'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {memoizedQuestions.map((question, index) => {
          const status = reviewStatuses[question.id] || {
            questionId: question.id,
            isReviewed: false,
            hasIssues: false,
            issueCount: 0
          };
          const isExpanded = expandedQuestions.has(question.id);
          const requiresFigure = Boolean(question.figure_required ?? question.figure);
          const attachmentsCount = getQuestionAttachmentCount(question);
          const hasFigureAttachment = attachmentsCount > 0;
          const attachmentBadgeLabel = attachmentsCount > 0
            ? `${attachmentsCount} attachment${attachmentsCount === 1 ? '' : 's'}`
            : requiresFigure
            ? 'Attachment missing'
            : null;
          const attachmentBadgeClass = attachmentsCount > 0
            ? requiresFigure
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200';
          const { unitId: selectedUnitId, topicId: selectedTopicId, subtopicId: selectedSubtopicId } =
            getEffectiveSelections(question);
          const selectedUnit = selectedUnitId ? units.find(unit => unit.id === selectedUnitId) : undefined;
          const selectedTopic = selectedTopicId ? topics.find(topic => topic.id === selectedTopicId) : undefined;
          const selectedSubtopic = selectedSubtopicId
            ? subtopics.find(subtopic => subtopic.id === selectedSubtopicId)
            : undefined;
          const availableTopics = selectedUnitId
            ? topics.filter(topic => (topic.unit_id ?? '') === selectedUnitId)
            : topics;
          const availableSubtopics = selectedTopicId
            ? subtopics.filter(subtopic => (subtopic.topic_id ?? '') === selectedTopicId)
            : subtopics;
          const unitPlaceholder = isLoadingTaxonomy
            ? 'Loading units...'
            : units.length === 0
            ? 'No units available'
            : !selectedUnitId && question.unit
            ? `Current: ${question.unit}`
            : 'Select unit...';
          const topicPlaceholder = isLoadingTaxonomy
            ? 'Loading topics...'
            : availableTopics.length === 0
            ? selectedUnitId
              ? 'No topics for selected unit'
              : 'No topics available'
            : !selectedTopicId && question.topic
            ? `Current: ${question.topic}`
            : 'Select topic...';
          const subtopicPlaceholder = isLoadingTaxonomy
            ? 'Loading subtopics...'
            : availableSubtopics.length === 0
            ? selectedTopicId
              ? 'No subtopics for selected topic'
              : 'No subtopics available'
            : !selectedSubtopicId && question.subtopic
            ? `Current: ${question.subtopic}`
            : 'Select subtopic...';
          const questionTypeSelectOptions = [...questionTypeOptions];
          if (
            question.question_type &&
            !questionTypeSelectOptions.some(option => option.value === question.question_type)
          ) {
            questionTypeSelectOptions.push({
              value: question.question_type,
              label: formatOptionLabel(question.question_type),
            });
          }
          const difficultyValue = question.difficulty ?? '';
          const difficultySelectOptions = [...difficultyOptions];
          if (difficultyValue && !difficultySelectOptions.some(option => option.value === difficultyValue)) {
            difficultySelectOptions.push({ value: difficultyValue, label: formatOptionLabel(difficultyValue) });
          }
          const unitOptions = units.map(unit => ({ value: unit.id, label: unit.name }));
          if (selectedUnitId && !unitOptions.some(option => option.value === selectedUnitId)) {
            unitOptions.push({
              value: selectedUnitId,
              label: selectedUnit?.name ?? question.unit ?? 'Selected unit unavailable',
            });
          }
          const topicOptions = availableTopics.map(topic => ({ value: topic.id, label: topic.name }));
          if (selectedTopicId && !topicOptions.some(option => option.value === selectedTopicId)) {
            topicOptions.push({
              value: selectedTopicId,
              label: selectedTopic?.name ?? question.topic ?? 'Selected topic unavailable',
            });
          }
          const subtopicOptions = availableSubtopics.map(subtopic => ({ value: subtopic.id, label: subtopic.name }));
          if (selectedSubtopicId && !subtopicOptions.some(option => option.value === selectedSubtopicId)) {
            subtopicOptions.push({
              value: selectedSubtopicId,
              label: selectedSubtopic?.name ?? question.subtopic ?? 'Selected subtopic unavailable',
            });
          }
          const answerFormatValue = question.answer_format ?? '';
          const answerFormatSelectOptions = [...answerFormatOptions];
          if (answerFormatValue && !answerFormatSelectOptions.some(option => option.value === answerFormatValue)) {
            answerFormatSelectOptions.push({ value: answerFormatValue, label: formatOptionLabel(answerFormatValue) });
          }
          const answerRequirementValue = question.answer_requirement ?? '';
          const answerRequirementSelectOptions = [...answerRequirementOptions];
          if (
            answerRequirementValue &&
            !answerRequirementSelectOptions.some(option => option.value === answerRequirementValue)
          ) {
            answerRequirementSelectOptions.push({
              value: answerRequirementValue,
              label: formatOptionLabel(answerRequirementValue),
            });
          }
          // Check if this question has validation errors
          const hasValidationErrors = validationErrors[question.id] && validationErrors[question.id].length > 0;
          const validationErrorMessages = hasValidationErrors ? validationErrors[question.id] : [];

          const baseCardClass = hasValidationErrors
            ? 'border-red-400 dark:border-red-600 bg-red-50/30 dark:bg-red-900/10 ring-2 ring-red-400/60'
            : status.isReviewed
            ? 'border-green-300 dark:border-green-700 bg-green-50/30 dark:bg-green-900/10'
            : status.hasIssues
            ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50/30 dark:bg-yellow-900/10'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900';
          const figureHighlightClass = requiresFigure
            ? hasFigureAttachment
              ? 'ring-1 ring-green-300/40'
              : 'border-amber-300 dark:border-amber-500 ring-2 ring-amber-300/60 bg-amber-50/30 dark:bg-amber-900/20'
            : '';

          return (
            <div
              key={question.id}
              className={cn('rounded-xl transition-all shadow-sm border', baseCardClass, hasValidationErrors ? '' : figureHighlightClass)}
            >
              <div
                className="px-6 py-4 flex items-center justify-between gap-6 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                onClick={() => toggleQuestionExpansion(question.id)}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleQuestionExpansion(question.id);
                    }}
                    className="mt-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    aria-label={isExpanded ? 'Collapse question' : 'Expand question'}
                  >
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Question {question.question_number}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">#{index + 1}</span>
                      {hasValidationErrors && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
                          title={validationErrorMessages.join('; ')}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {validationErrorMessages.length} Validation Error{validationErrorMessages.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {requiresFigure && (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            hasFigureAttachment
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
                          )}
                        >
                          <ImageIcon className="h-3 w-3" />
                          {hasFigureAttachment ? 'Figure attached' : 'Figure required'}
                        </span>
                      )}
                      {attachmentBadgeLabel && (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            attachmentBadgeClass
                          )}
                        >
                          <Paperclip className="h-3 w-3" />
                          {attachmentBadgeLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {question.marks} mark{question.marks === 1 ? '' : 's'} • {question.question_type}
                    </p>
                    {(question.unit || question.topic || question.subtopic || question.difficulty || question.answer_requirement || question.answer_format) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {question.unit && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                            Unit: {question.unit}
                          </span>
                        )}
                        {question.topic && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-200">
                            Topic: {question.topic}
                          </span>
                        )}
                        {question.subtopic && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-200">
                            {question.subtopic}
                          </span>
                        )}
                        {question.difficulty && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium capitalize text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                            {question.difficulty} difficulty
                          </span>
                        )}
                        {question.answer_requirement && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800/60 dark:text-slate-200">
                            Requirement: {question.answer_requirement}
                          </span>
                        )}
                        {question.answer_format && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                            Format: {question.answer_format}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <QuestionReviewStatus
                  status={status}
                  onToggleReview={handleToggleReview}
                  showLabel={true}
                  size="md"
                />
              </div>

              {isExpanded && (
                <div className="p-6 space-y-6 animate-in fade-in duration-200">
                  {hasValidationErrors && (
                    <div className="rounded-lg border-2 border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20 p-4 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                            Validation Errors Detected
                          </p>
                          <p className="text-xs text-red-800 dark:text-red-200">
                            This question has data quality issues that prevent it from being used in the test simulation. Please review and fix the following:
                          </p>
                          <ul className="mt-2 space-y-1 text-xs text-red-800 dark:text-red-200">
                            {validationErrorMessages.map((error, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>{error}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                  {requiresFigure && (
                    <div
                      className={cn(
                        'rounded-lg border p-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between',
                        hasFigureAttachment
                          ? 'border-green-200 bg-green-50 dark:border-green-700/60 dark:bg-green-900/15'
                          : 'border-amber-300 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-full',
                            hasFigureAttachment
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-100'
                          )}
                        >
                          <AlertCircle className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {hasFigureAttachment ? 'Figure ready for review' : 'This question needs a supporting figure'}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            Attach the relevant illustration so students have the correct visual reference during the exam.
                          </p>
                          {attachmentsCount > 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {attachmentsCount} attachment{attachmentsCount === 1 ? '' : 's'} linked to this question.
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={hasFigureAttachment ? 'outline' : 'default'}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (onRequestSnippingTool) {
                              onRequestSnippingTool(question.id);
                            } else {
                              toast.error('Snipping tool is not available in this workflow');
                            }
                          }}
                        >
                          <ImageIcon className="h-4 w-4 mr-1" /> Launch snipping tool
                        </Button>
                      </div>
                    </div>
                  )}

                  <section className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Question details</h4>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <FormField
                        id={`${question.id}-question-text`}
                        label="Question text"
                        className="mb-0 md:col-span-2 lg:col-span-3"
                      >
                        <RichTextEditor
                          value={question.question_text ?? ''}
                          onChange={(content) =>
                            handleQuestionFieldChange(question, 'question_text', content as QuestionDisplayData['question_text'])
                          }
                          placeholder="Compose the full question stem..."
                          ariaLabel="Question text editor"
                        />
                        {renderInlineAttachments(question.attachments, `Question ${question.question_number}`)}
                      </FormField>

                      <FormField
                        id={`${question.id}-marks`}
                        label="Marks"
                        className="mb-0"
                      >
                        <Input
                          id={`${question.id}-marks`}
                          type="number"
                          min={0}
                          value={(question.marks ?? 0).toString()}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            handleQuestionFieldChange(question, 'marks', Number.isNaN(value) ? question.marks : value);
                          }}
                        />
                      </FormField>

                      <FormField
                        id={`${question.id}-question-type`}
                        label="Question type"
                        className="mb-0"
                      >
                        <Select
                          id={`${question.id}-question-type`}
                          value={question.question_type ?? ''}
                          onChange={(value) =>
                            handleQuestionFieldChange(
                              question,
                              'question_type',
                              (value || undefined) as QuestionDisplayData['question_type']
                            )
                          }
                          options={questionTypeSelectOptions}
                          placeholder="Select question type"
                          usePortal={false}
                        />
                      </FormField>

                      <FormField
                        id={`${question.id}-difficulty`}
                        label="Difficulty"
                        className="mb-0"
                      >
                        <Select
                          id={`${question.id}-difficulty`}
                          value={difficultyValue}
                          onChange={(value) =>
                            handleQuestionFieldChange(
                              question,
                              'difficulty',
                              (value || null) as QuestionDisplayData['difficulty']
                            )
                          }
                          options={difficultySelectOptions}
                          placeholder="Select difficulty"
                          usePortal={false}
                        />
                      </FormField>

                      <FormField
                        id={`${question.id}-unit`}
                        label="Unit"
                        className="mb-0"
                      >
                        <Select
                          id={`${question.id}-unit`}
                          value={selectedUnitId ?? ''}
                          onChange={(value) => handleUnitSelect(question, value)}
                          options={unitOptions}
                          disabled={isLoadingTaxonomy || units.length === 0}
                          placeholder={unitPlaceholder}
                          usePortal={false}
                        />
                      </FormField>

                      <FormField
                        id={`${question.id}-topic`}
                        label="Topic"
                        className="mb-0"
                      >
                        <Select
                          id={`${question.id}-topic`}
                          value={selectedTopicId ?? ''}
                          onChange={(value) => handleTopicSelect(question, value)}
                          options={topicOptions}
                          disabled={
                            isLoadingTaxonomy ||
                            (selectedUnitId ? availableTopics.length === 0 : topics.length === 0)
                          }
                          placeholder={topicPlaceholder}
                          usePortal={false}
                        />
                      </FormField>

                      <FormField
                        id={`${question.id}-subtopic`}
                        label="Subtopic"
                        className="mb-0"
                      >
                        <Select
                          id={`${question.id}-subtopic`}
                          value={selectedSubtopicId ?? ''}
                          onChange={(value) => handleSubtopicSelect(question, value)}
                          options={subtopicOptions}
                          disabled={
                            isLoadingTaxonomy ||
                            (selectedTopicId ? availableSubtopics.length === 0 : subtopics.length === 0)
                          }
                          placeholder={subtopicPlaceholder}
                          usePortal={false}
                        />
                      </FormField>

                      {/* Enhanced Answer Format and Requirement Selector with Validation */}
                      <div className="mb-4 md:col-span-2 lg:col-span-3">
                        <EnhancedAnswerFormatSelector
                          answerFormat={question.answer_format || null}
                          answerRequirement={question.answer_requirement || null}
                          onFormatChange={(value) =>
                            handleQuestionFieldChange(
                              question,
                              'answer_format',
                              (value || null) as QuestionDisplayData['answer_format']
                            )
                          }
                          onRequirementChange={(value) =>
                            handleQuestionFieldChange(
                              question,
                              'answer_requirement',
                              (value || null) as QuestionDisplayData['answer_requirement']
                            )
                          }
                          questionType={question.question_type || 'descriptive'}
                          correctAnswersCount={question.correct_answers?.length || 0}
                          showValidation={true}
                          disabled={false}
                          className="w-full"
                        />
                      </div>

                      <FormField
                        id={`${question.id}-hint`}
                        label="Hint"
                        className="mb-0 md:col-span-2 lg:col-span-3"
                      >
                        <RichTextEditor
                          value={question.hint ?? ''}
                          onChange={(content) =>
                            handleQuestionFieldChange(question, 'hint', content as QuestionDisplayData['hint'])
                          }
                          placeholder="Add any hints that should appear for learners"
                          ariaLabel="Hint rich text editor"
                          className="min-h-[140px]"
                        />
                      </FormField>

                      <FormField
                        id={`${question.id}-explanation`}
                        label="Explanation"
                        className="mb-0 md:col-span-2 lg:col-span-3"
                      >
                        <RichTextEditor
                          value={question.explanation ?? ''}
                          onChange={(content) =>
                            handleQuestionFieldChange(
                              question,
                              'explanation',
                              content as QuestionDisplayData['explanation']
                            )
                          }
                          placeholder="Describe the full explanation or mark scheme guidance"
                          ariaLabel="Explanation rich text editor"
                        />
                      </FormField>

                      <div className="md:col-span-2 lg:col-span-3">
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800/40">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${requiresFigure ? 'bg-[#8CC63F]' : 'bg-gray-400'} transition-colors`}>
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Figure Requirement</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                  {requiresFigure
                                    ? 'Students must reference a diagram or figure'
                                    : 'No diagram or figure needed for this question'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                commitQuestionUpdate(question, {
                                  figure_required: !requiresFigure,
                                  figure: !requiresFigure
                                })
                              }
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:ring-offset-2 ${
                                requiresFigure ? 'bg-[#8CC63F]' : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                              role="switch"
                              aria-checked={requiresFigure}
                              aria-label="Toggle figure requirement"
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                                  requiresFigure ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {(question.question_type === 'mcq' || (question.options && question.options.length > 0)) && (
                    <section className="space-y-3">
                      {renderOptionsEditorList(question.options, {
                        onAdd: () => handleAddOption(question),
                        onChange: (optionIndex, updates) => handleOptionChange(question, optionIndex, updates),
                        onRemove: (optionIndex) => handleRemoveOption(question, optionIndex),
                        title: 'Answer options',
                        emptyLabel: 'No answer options provided. Add options if this question should be multiple choice.',
                        keyPrefix: `question-${question.id}`
                      })}
                    </section>
                  )}

                  <section className="space-y-3">
                    {renderAnswerEditorList(question.correct_answers, {
                      onAdd: () => handleAddCorrectAnswer(question),
                      onChange: (answerIndex, updates) => handleCorrectAnswerChange(question, answerIndex, updates),
                      onRemove: (answerIndex) => handleRemoveCorrectAnswer(question, answerIndex),
                      title: 'Correct answers & mark scheme',
                      emptyLabel: 'No correct answers defined. Add mark scheme entries so the system can validate responses.',
                      keyPrefix: `question-${question.id}`
                    }, {
                      id: question.id,
                      question_type: question.question_type,
                      answer_format: question.answer_format,
                      answer_requirement: question.answer_requirement,
                      marks: question.marks,
                      subject: subjectId
                    })}
                  </section>

                  {Array.isArray(question.parts) && question.parts.length > 0 && (
                    <section className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Parts & subparts</h4>
                      {question.parts.map((part, partIndex) => {
                        const partRequiresFigure = Boolean(part.figure_required ?? part.figure);
                        const partHasAttachments = Array.isArray(part.attachments)
                          ? part.attachments.some(att => att.file_url?.startsWith('data:'))
                          : false;
                        const partAnswerFormatValue = part.answer_format ?? '';
                        const partAnswerFormatOptions = [...answerFormatOptions];
                        if (
                          partAnswerFormatValue &&
                          !partAnswerFormatOptions.some(option => option.value === partAnswerFormatValue)
                        ) {
                          partAnswerFormatOptions.push({
                            value: partAnswerFormatValue,
                            label: formatOptionLabel(partAnswerFormatValue),
                          });
                        }
                        const partAnswerRequirementValue = part.answer_requirement ?? '';
                        const partAnswerRequirementOptions = [...answerRequirementOptions];
                        if (
                          partAnswerRequirementValue &&
                          !partAnswerRequirementOptions.some(option => option.value === partAnswerRequirementValue)
                        ) {
                          partAnswerRequirementOptions.push({
                            value: partAnswerRequirementValue,
                            label: formatOptionLabel(partAnswerRequirementValue),
                          });
                        }

                        return (
                          <div
                            key={`question-${question.id}-part-${part.id ?? partIndex}`}
                            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40 p-4 space-y-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 font-semibold uppercase">
                                  {(part.part_label || part.part || String.fromCharCode(97 + partIndex)).slice(0, 2)}
                                </span>
                                <div>
                                  <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    Part {part.part_label || part.part || String.fromCharCode(97 + partIndex)}
                                  </h5>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {part.marks ?? 0} mark{part.marks === 1 ? '' : 's'} • {part.answer_format || 'format not set'}
                                  </p>
                                </div>
                              </div>
                              {partRequiresFigure && (
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                    partHasAttachments
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200'
                                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
                                  )}
                                >
                                  <ImageIcon className="h-3 w-3" />
                                  {partHasAttachments ? 'Figure attached' : 'Figure required'}
                                </span>
                              )}
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                              <FormField
                                id={`question-${question.id}-part-${partIndex}-label`}
                                label="Part label"
                                className="mb-0"
                              >
                                <Input
                                  id={`question-${question.id}-part-${partIndex}-label`}
                                  value={part.part_label ?? part.part ?? ''}
                                  onChange={(event) =>
                                    handlePartFieldChange(question, partIndex, {
                                      part_label: event.target.value,
                                      part: event.target.value
                                    })
                                  }
                                />
                              </FormField>
                              <FormField
                                id={`question-${question.id}-part-${partIndex}-marks`}
                                label="Marks"
                                className="mb-0"
                              >
                                <Input
                                  id={`question-${question.id}-part-${partIndex}-marks`}
                                  type="number"
                                  min={0}
                                  value={(part.marks ?? 0).toString()}
                                  onChange={(event) => {
                                    const value = Number(event.target.value);
                                    handlePartFieldChange(question, partIndex, {
                                      marks: Number.isNaN(value) ? part.marks : value
                                    });
                                  }}
                                />
                              </FormField>
                            </div>
                            {partRequiresFigure && (
                              <div
                                className={cn(
                                  'rounded-lg border p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
                                  partHasAttachments
                                    ? 'border-green-200 bg-green-50 dark:border-green-700/60 dark:bg-green-900/15'
                                    : 'border-amber-300 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20'
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <ImageIcon
                                    className={cn(
                                      'h-4 w-4',
                                      partHasAttachments ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                                    )}
                                  />
                                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                    {partHasAttachments ? 'Figure attached to this part' : 'This part requires a supporting figure'}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant={partHasAttachments ? 'outline' : 'default'}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (onRequestSnippingTool) {
                                      onRequestSnippingTool(question.id, { partIndex });
                                    } else {
                                      toast.error('Snipping tool is not available');
                                    }
                                  }}
                                >
                                  <Scissors className="h-3.5 w-3.5 mr-1" /> Launch snipping tool
                                </Button>
                              </div>
                            )}
                            <FormField
                              id={`question-${question.id}-part-${partIndex}-text`}
                              label="Part question text"
                              className="mb-0"
                            >
                              <RichTextEditor
                                value={part.question_text ?? ''}
                                onChange={(content) =>
                                  handlePartFieldChange(question, partIndex, { question_text: content })
                                }
                                placeholder="Write the content for this part"
                                ariaLabel="Part question text editor"
                              />
                              {renderInlineAttachments(part.attachments, `Part ${part.part_label || part.part || String.fromCharCode(97 + partIndex)}`)}
                            </FormField>
                            {/* Enhanced Answer Format and Requirement for Part */}
                            <div className="mb-3">
                              <EnhancedAnswerFormatSelector
                                answerFormat={part.answer_format || null}
                                answerRequirement={part.answer_requirement || null}
                                onFormatChange={(value) =>
                                  handlePartFieldChange(question, partIndex, { answer_format: value || null })
                                }
                                onRequirementChange={(value) =>
                                  handlePartFieldChange(question, partIndex, { answer_requirement: value || null })
                                }
                                questionType={question.question_type || 'descriptive'}
                                correctAnswersCount={part.correct_answers?.length || 0}
                                showValidation={true}
                                disabled={false}
                                className="w-full"
                              />
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <FormField
                                id={`question-${question.id}-part-${partIndex}-hint`}
                                label="Hint"
                                className="mb-0"
                              >
                                <RichTextEditor
                                  value={part.hint ?? ''}
                                  onChange={(content) => handlePartFieldChange(question, partIndex, { hint: content })}
                                  placeholder="Optional hint for this part"
                                  ariaLabel="Part hint editor"
                                  className="min-h-[140px]"
                                />
                              </FormField>
                              <FormField
                                id={`question-${question.id}-part-${partIndex}-explanation`}
                                label="Explanation"
                                className="mb-0"
                              >
                                <RichTextEditor
                                  value={part.explanation ?? ''}
                                  onChange={(content) =>
                                    handlePartFieldChange(question, partIndex, { explanation: content })
                                  }
                                  placeholder="Explain the answer expectations for this part"
                                  ariaLabel="Part explanation editor"
                                />
                              </FormField>
                            </div>
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800/40">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${partRequiresFigure ? 'bg-[#8CC63F]' : 'bg-gray-400'} transition-colors`}>
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Figure Requirement</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                      {partRequiresFigure
                                        ? 'Students must reference a diagram or figure'
                                        : 'No diagram or figure needed for this part'}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handlePartFieldChange(question, partIndex, { figure_required: !partRequiresFigure })}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:ring-offset-2 ${
                                    partRequiresFigure ? 'bg-[#8CC63F]' : 'bg-gray-300 dark:bg-gray-600'
                                  }`}
                                  role="switch"
                                  aria-checked={partRequiresFigure}
                                  aria-label="Toggle figure requirement"
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                                      partRequiresFigure ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>

                            {renderAnswerEditorList(part.correct_answers, {
                              onAdd: () => handleAddPartCorrectAnswer(question, partIndex),
                              onChange: (answerIndex, updates) => handlePartCorrectAnswerChange(question, partIndex, answerIndex, updates),
                              onRemove: (answerIndex) => handleRemovePartCorrectAnswer(question, partIndex, answerIndex),
                              title: 'Correct answers',
                              emptyLabel: 'Provide the expected answer for this part.',
                              keyPrefix: `question-${question.id}-part-${partIndex}`
                            }, {
                              id: `${question.id}-part-${partIndex}`,
                              question_type: question.question_type,
                              answer_format: part.answer_format,
                              answer_requirement: part.answer_requirement,
                              marks: part.marks,
                              subject: subjectId
                            })}

                            {Array.isArray(part.options) && part.options.length > 0 && (
                              renderOptionsEditorList(part.options, {
                                onAdd: () => handleAddPartOption(question, partIndex),
                                onChange: (optionIndex, updates) => handlePartOptionChange(question, partIndex, optionIndex, updates),
                                onRemove: (optionIndex) => handleRemovePartOption(question, partIndex, optionIndex),
                                title: 'Answer options',
                                emptyLabel: 'Add answer options if students should choose from a list.',
                                keyPrefix: `question-${question.id}-part-${partIndex}`
                              })
                            )}

                            {Array.isArray(part.subparts) && part.subparts.length > 0 && (
                              <div className="space-y-4 border-t border-dashed border-gray-300 pt-4 dark:border-gray-700/60">
                                {part.subparts.map((subpart, subIndex) => {
                                  // CRITICAL FIX: Only show figure UI when figure_required is explicitly true OR figure flag is true
                                  // BUT distinguish between "figure required" (from JSON) vs "figure attached" (has actual attachments)
                                  const subRequiresFigure = Boolean(subpart.figure_required ?? subpart.figure);
                                  const subHasAttachments = Array.isArray(subpart.attachments)
                                    ? subpart.attachments.some(att => att.file_url?.startsWith('data:'))
                                    : false;
                                  const subAnswerFormatValue = subpart.answer_format ?? '';
                                  const subAnswerFormatOptions = [...answerFormatOptions];
                                  if (
                                    subAnswerFormatValue &&
                                    !subAnswerFormatOptions.some(option => option.value === subAnswerFormatValue)
                                  ) {
                                    subAnswerFormatOptions.push({
                                      value: subAnswerFormatValue,
                                      label: formatOptionLabel(subAnswerFormatValue),
                                    });
                                  }
                                  const subAnswerRequirementValue = subpart.answer_requirement ?? '';
                                  const subAnswerRequirementOptions = [...answerRequirementOptions];
                                  if (
                                    subAnswerRequirementValue &&
                                    !subAnswerRequirementOptions.some(option => option.value === subAnswerRequirementValue)
                                  ) {
                                    subAnswerRequirementOptions.push({
                                      value: subAnswerRequirementValue,
                                      label: formatOptionLabel(subAnswerRequirementValue),
                                    });
                                  }

                                  return (
                                    <div
                                      key={`question-${question.id}-part-${partIndex}-sub-${subpart.id ?? subIndex}`}
                                      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div>
                                          <h6 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            Subpart {(() => {
                                              const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
                                              return (subpart.subpart_label || romanNumerals[subIndex] || String(subIndex + 1)).toUpperCase();
                                            })()}
                                          </h6>
                                          <p className="text-xs text-gray-600 dark:text-gray-400">
                                            {subpart.marks ?? 0} mark{subpart.marks === 1 ? '' : 's'} • {subpart.answer_format || 'format not set'}
                                          </p>
                                        </div>
                                        {subRequiresFigure && (
                                          <span
                                            className={cn(
                                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                              subHasAttachments
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200'
                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
                                            )}
                                          >
                                            <ImageIcon className="h-3 w-3" />
                                            {subHasAttachments ? 'Figure attached' : 'Figure required'}
                                          </span>
                                        )}
                                      </div>

                                      <div className="grid gap-3 md:grid-cols-2">
                                        <FormField
                                          id={`question-${question.id}-part-${partIndex}-sub-${subIndex}-label`}
                                          label="Subpart label"
                                          className="mb-0"
                                        >
                                          <Input
                                            id={`question-${question.id}-part-${partIndex}-sub-${subIndex}-label`}
                                            value={(() => {
                                              const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
                                              return subpart.subpart_label || romanNumerals[subIndex] || String(subIndex + 1);
                                            })()}
                                            onChange={(event) =>
                                              handleSubpartFieldChange(question, partIndex, subIndex, {
                                                subpart_label: event.target.value
                                              })
                                            }
                                            placeholder={(() => {
                                              const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
                                              return `e.g., ${romanNumerals[subIndex] || String(subIndex + 1)}`;
                                            })()}
                                          />
                                        </FormField>
                                        <FormField
                                          id={`question-${question.id}-part-${partIndex}-sub-${subIndex}-marks`}
                                          label="Marks"
                                          className="mb-0"
                                        >
                                          <Input
                                            id={`question-${question.id}-part-${partIndex}-sub-${subIndex}-marks`}
                                            type="number"
                                            min={0}
                                            value={(subpart.marks ?? 0).toString()}
                                            onChange={(event) => {
                                              const value = Number(event.target.value);
                                              handleSubpartFieldChange(question, partIndex, subIndex, {
                                                marks: Number.isNaN(value) ? subpart.marks : value
                                              });
                                            }}
                                          />
                                        </FormField>
                                      </div>
                                      {subRequiresFigure && (
                                        <div
                                          className={cn(
                                            'rounded-lg border p-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
                                            subHasAttachments
                                              ? 'border-green-200 bg-green-50 dark:border-green-700/60 dark:bg-green-900/15'
                                              : 'border-amber-300 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20'
                                          )}
                                        >
                                          <div className="flex items-center gap-2">
                                            <ImageIcon
                                              className={cn(
                                                'h-3.5 w-3.5',
                                                subHasAttachments ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                                              )}
                                            />
                                            <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                              {subHasAttachments ? 'Figure attached to this subpart' : 'This subpart requires a supporting figure'}
                                            </p>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant={subHasAttachments ? 'outline' : 'default'}
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              if (onRequestSnippingTool) {
                                                onRequestSnippingTool(question.id, { partIndex, subpartIndex: subIndex });
                                              } else {
                                                toast.error('Snipping tool is not available');
                                              }
                                            }}
                                          >
                                            <Scissors className="h-3.5 w-3.5 mr-1" /> Launch snipping tool
                                          </Button>
                                        </div>
                                      )}
                                      <FormField
                                        id={`question-${question.id}-part-${partIndex}-sub-${subIndex}-text`}
                                        label="Subpart question text"
                                        className="mb-0"
                                      >
                                        <RichTextEditor
                                          value={subpart.question_text ?? ''}
                                          onChange={(content) =>
                                            handleSubpartFieldChange(question, partIndex, subIndex, {
                                              question_text: content
                                            })
                                          }
                                          placeholder="Detail the prompt for this subpart"
                                          ariaLabel="Subpart question text editor"
                                        />
                                        {renderInlineAttachments(subpart.attachments, `Subpart ${(() => {
                                          const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
                                          return (subpart.subpart_label || romanNumerals[subIndex] || String(subIndex + 1)).toUpperCase();
                                        })()}`)}
                                      </FormField>
                                      {/* Enhanced Answer Format and Requirement for Subpart */}
                                      <div className="mb-3">
                                        <EnhancedAnswerFormatSelector
                                          answerFormat={subpart.answer_format || null}
                                          answerRequirement={subpart.answer_requirement || null}
                                          onFormatChange={(value) =>
                                            handleSubpartFieldChange(question, partIndex, subIndex, {
                                              answer_format: value || null
                                            })
                                          }
                                          onRequirementChange={(value) =>
                                            handleSubpartFieldChange(question, partIndex, subIndex, {
                                              answer_requirement: value || null
                                            })
                                          }
                                          questionType={question.question_type || 'descriptive'}
                                          correctAnswersCount={subpart.correct_answers?.length || 0}
                                          showValidation={true}
                                          disabled={false}
                                          className="w-full"
                                        />
                                      </div>
                                      <div className="grid gap-3 md:grid-cols-2">
                                        <FormField
                                          id={`question-${question.id}-part-${partIndex}-sub-${subIndex}-hint`}
                                          label="Hint"
                                          className="mb-0"
                                        >
                                          <RichTextEditor
                                            value={subpart.hint ?? ''}
                                            onChange={(content) => handleSubpartFieldChange(question, partIndex, subIndex, { hint: content })}
                                            placeholder="Optional hint for this subpart"
                                            ariaLabel="Subpart hint editor"
                                            className="min-h-[140px]"
                                          />
                                        </FormField>
                                        <FormField
                                          id={`question-${question.id}-part-${partIndex}-sub-${subIndex}-explanation`}
                                          label="Explanation"
                                          className="mb-0"
                                        >
                                          <RichTextEditor
                                            value={subpart.explanation ?? ''}
                                            onChange={(content) =>
                                              handleSubpartFieldChange(question, partIndex, subIndex, { explanation: content })
                                            }
                                            placeholder="Explain the answer expectations for this subpart"
                                            ariaLabel="Subpart explanation editor"
                                            className="min-h-[140px]"
                                          />
                                        </FormField>
                                      </div>
                                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800/40">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${subRequiresFigure ? 'bg-[#8CC63F]' : 'bg-gray-400'} transition-colors`}>
                                              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                              </svg>
                                            </div>
                                            <div>
                                              <p className="text-sm font-medium text-gray-900 dark:text-white">Figure Requirement</p>
                                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                                {subRequiresFigure
                                                  ? 'Students must reference a diagram or figure'
                                                  : 'No diagram or figure needed for this subpart'}
                                              </p>
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleSubpartFieldChange(question, partIndex, subIndex, { figure_required: !subRequiresFigure })}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:ring-offset-2 ${
                                              subRequiresFigure ? 'bg-[#8CC63F]' : 'bg-gray-300 dark:bg-gray-600'
                                            }`}
                                            role="switch"
                                            aria-checked={subRequiresFigure}
                                            aria-label="Toggle figure requirement"
                                          >
                                            <span
                                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                                                subRequiresFigure ? 'translate-x-6' : 'translate-x-1'
                                              }`}
                                            />
                                          </button>
                                        </div>
                                      </div>

                                      {renderAnswerEditorList(subpart.correct_answers, {
                                        onAdd: () => handleAddSubpartCorrectAnswer(question, partIndex, subIndex),
                                        onChange: (answerIndex, updates) =>
                                          handleSubpartCorrectAnswerChange(question, partIndex, subIndex, answerIndex, updates),
                                        onRemove: (answerIndex) =>
                                          handleRemoveSubpartCorrectAnswer(question, partIndex, subIndex, answerIndex),
                                        title: 'Correct answers',
                                        emptyLabel: 'Define the expected responses for this subpart.',
                                        keyPrefix: `question-${question.id}-part-${partIndex}-sub-${subIndex}`
                                      }, {
                                        id: `${question.id}-part-${partIndex}-sub-${subIndex}`,
                                        question_type: question.question_type,
                                        answer_format: subpart.answer_format,
                                        answer_requirement: subpart.answer_requirement,
                                        marks: subpart.marks,
                                        subject: subjectId
                                      })}

                                      {Array.isArray(subpart.options) && subpart.options.length > 0 && (
                                        renderOptionsEditorList(subpart.options, {
                                          onAdd: () => handleAddSubpartOption(question, partIndex, subIndex),
                                          onChange: (optionIndex, updates) =>
                                            handleSubpartOptionChange(question, partIndex, subIndex, optionIndex, updates),
                                          onRemove: (optionIndex) =>
                                            handleRemoveSubpartOption(question, partIndex, subIndex, optionIndex),
                                          title: 'Answer options',
                                          emptyLabel: 'Provide answer options for this subpart if needed.',
                                          keyPrefix: `question-${question.id}-part-${partIndex}-sub-${subIndex}`
                                        })
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </section>
                  )}

                  <section className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Preview</h4>
                    <EnhancedQuestionDisplay
                      key={`${question.id}-${question.answer_format || 'default'}`}
                      question={question}
                      showAnswers={true}
                      showHints={true}
                      showExplanations={true}
                      showAttachments={true}
                      compact={false}
                      highlightCorrect={true}
                      defaultExpandedSections={{ hint: true, explanation: true }}
                      onAttachmentRemove={onRequestAttachmentDelete}
                    />
                  </section>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Import Ready Status */}
      {allReviewed && (
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                All Questions Reviewed!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                {requireSimulation && !simulationPassed
                  ? 'Complete the test simulation to proceed with import.'
                  : 'You can now proceed to import these questions to the question bank.'}
              </p>
              {requireSimulation && !simulationPassed && (
                <Button onClick={handleStartSimulation} variant="default" size="sm">
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Complete Required Simulation
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auto-Save Status Indicator */}
      {saveStatus === 'saving' && (
        <div className="fixed bottom-4 right-4 bg-blue-100 dark:bg-blue-900/90 text-blue-800 dark:text-blue-100 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 border border-blue-200 dark:border-blue-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="font-medium">Saving changes...</span>
        </div>
      )}

      {saveStatus === 'saved' && (
        <div className="fixed bottom-4 right-4 bg-green-100 dark:bg-green-900/90 text-green-800 dark:text-green-100 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 border border-green-200 dark:border-green-700">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">All changes saved</span>
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="fixed bottom-4 right-4 bg-red-100 dark:bg-red-900/90 text-red-800 dark:text-red-100 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 border border-red-200 dark:border-red-700">
          <AlertCircle className="h-5 w-5" />
          <div>
            <p className="font-medium">Failed to save changes</p>
            <p className="text-xs mt-1">Changes are saved locally. Refresh to retry.</p>
          </div>
        </div>
      )}
    </div>
  );
};
