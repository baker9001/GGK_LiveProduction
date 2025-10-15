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
  List
} from 'lucide-react';
import { Button } from './Button';
import { QuestionReviewStatus, ReviewProgress, ReviewStatus } from './QuestionReviewStatus';
import { EnhancedQuestionDisplay, QuestionDisplayData, QuestionPart } from './EnhancedQuestionDisplay';
import { TestSimulationMode } from './TestSimulationMode';
import { supabase } from '../../lib/supabase';
import { toast } from './Toast';
import { cn } from '../../lib/utils';

type EditableCorrectAnswer = NonNullable<QuestionDisplayData['correct_answers']>[number];
type EditableOption = NonNullable<QuestionDisplayData['options']>[number];

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
  onAllQuestionsReviewed?: () => void;
  onImportReady?: (canImport: boolean) => void;
  requireSimulation?: boolean;
  onQuestionUpdate?: (questionId: string, updates: Partial<QuestionDisplayData>) => void;
  onRequestSnippingTool?: (questionId: string) => void;
}

export const QuestionImportReviewWorkflow: React.FC<QuestionImportReviewWorkflowProps> = ({
  questions,
  paperTitle,
  paperDuration,
  totalMarks,
  importSessionId,
  onAllQuestionsReviewed,
  onImportReady,
  requireSimulation = false,
  onQuestionUpdate,
  onRequestSnippingTool
}) => {
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, ReviewStatus>>({});
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [syncError, setSyncError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const isInitializedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const commitQuestionUpdate = useCallback(
    (question: QuestionDisplayData, updates: Partial<QuestionDisplayData>) => {
      if (onQuestionUpdate) {
        onQuestionUpdate(question.id, updates);
      } else {
        console.warn('Question update attempted without handler', { questionId: question.id, updates });
      }
    },
    [onQuestionUpdate]
  );

  const handleQuestionFieldChange = <K extends keyof QuestionDisplayData>(
    question: QuestionDisplayData,
    field: K,
    value: QuestionDisplayData[K]
  ) => {
    commitQuestionUpdate(question, { [field]: value } as Partial<QuestionDisplayData>);
  };

  const handleCorrectAnswerChange = (
    question: QuestionDisplayData,
    index: number,
    updates: Partial<EditableCorrectAnswer>
  ) => {
    const answers = Array.isArray(question.correct_answers) ? [...question.correct_answers] : [];
    const existing = answers[index] || { answer: '' };
    answers[index] = { ...existing, ...updates };
    commitQuestionUpdate(question, { correct_answers: answers });
  };

  const handleAddCorrectAnswer = (question: QuestionDisplayData) => {
    const answers = Array.isArray(question.correct_answers) ? [...question.correct_answers] : [];
    answers.push({ answer: '', marks: answers.length > 0 ? answers[answers.length - 1]?.marks ?? 1 : 1 });
    commitQuestionUpdate(question, { correct_answers: answers });
  };

  const handleRemoveCorrectAnswer = (question: QuestionDisplayData, index: number) => {
    if (!question.correct_answers) return;
    const answers = question.correct_answers.filter((_, idx) => idx !== index);
    commitQuestionUpdate(question, { correct_answers: answers });
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

  const renderAnswerEditorList = (
    answers: EditableCorrectAnswer[] | undefined,
    config: {
      onChange: (index: number, updates: Partial<EditableCorrectAnswer>) => void;
      onRemove: (index: number) => void;
      onAdd: () => void;
      title: string;
      emptyLabel: string;
      keyPrefix: string;
    }
  ) => {
    const list = Array.isArray(answers) ? answers : [];

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
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Answer text</label>
                <textarea
                  value={answer?.answer ?? ''}
                  onChange={event => config.onChange(index, { answer: event.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="flex flex-col gap-2 md:w-24">
                <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Marks</label>
                <input
                  type="number"
                  min={0}
                  value={answer?.marks ?? 0}
                  onChange={event => {
                    const value = Number(event.target.value);
                    config.onChange(index, { marks: Number.isNaN(value) ? undefined : value });
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Unit / context</label>
                <input
                  type="text"
                  value={answer?.unit ?? ''}
                  onChange={event => config.onChange(index, { unit: event.target.value })}
                  placeholder="e.g. cm, kg"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Answer requirement</label>
                <input
                  type="text"
                  value={answer?.answer_requirement ?? ''}
                  onChange={event => config.onChange(index, { answer_requirement: event.target.value })}
                  placeholder="e.g. 2 significant figures"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Notes</label>
                <input
                  type="text"
                  value={answer?.context ?? ''}
                  onChange={event => config.onChange(index, { context: event.target.value })}
                  placeholder="Marker notes or context"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(answer?.accepts_equivalent_phrasing)}
                    onChange={event => config.onChange(index, { accepts_equivalent_phrasing: event.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Accept equivalent phrasing
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(answer?.error_carried_forward)}
                    onChange={event => config.onChange(index, { error_carried_forward: event.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Label</label>
                <input
                  type="text"
                  value={option?.label ?? String.fromCharCode(65 + index)}
                  onChange={event => config.onChange(index, { label: event.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Option text</label>
                <textarea
                  value={option?.text ?? ''}
                  onChange={event => config.onChange(index, { text: event.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
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
    if (isInitializedRef.current && reviewSessionId) {
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
  }, [reviewStatuses, simulationResults, requireSimulation, onAllQuestionsReviewed, onImportReady]);

  const initializeReviewSession = useCallback(async () => {
    // Check if already initialized
    if (isInitializedRef.current && reviewSessionId) {
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
      let sessionId = reviewSessionId;

      if (!sessionId && importSessionId) {
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
            setReviewSessionId(sessionId);

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
        setReviewSessionId(sessionId);
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
  }, [importSessionId, memoizedQuestions.length, paperTitle, paperDuration, totalMarks, requireSimulation, reviewSessionId]);

  const handleToggleReview = async (questionId: string) => {
    if (!reviewSessionId) return;

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
        .eq('review_session_id', reviewSessionId)
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

      toast.success(newReviewedState ? 'Question marked as reviewed' : 'Review status removed');
    } catch (error) {
      console.error('Error updating review status:', error);
      toast.error('Failed to update review status');
    }
  };

  const handleStartSimulation = () => {
    // Validate questions before starting simulation
    const invalidQuestions = memoizedQuestions.filter(q =>
      !q.id || !q.question_number || !q.question_text || q.marks === undefined
    );

    if (invalidQuestions.length > 0) {
      toast.error(`${invalidQuestions.length} question(s) have missing required data. Please fix before starting test.`);
      console.error('Invalid questions:', invalidQuestions);
      return;
    }

    setShowSimulation(true);
  };

  const handleRetrySync = () => {
    isInitializedRef.current = false;
    setReviewSessionId(null);
    setSyncError(null);
    initializeReviewSession();
  };

  const handleSimulationComplete = async (results: SimulationResults) => {
    if (!reviewSessionId) return;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Save simulation results to database
      const { error } = await supabase
        .from('question_import_simulation_results')
        .insert({
          review_session_id: reviewSessionId,
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
        .eq('id', reviewSessionId);

      setSimulationResults(results);
      toast.success('Simulation completed successfully');
    } catch (error) {
      console.error('Error saving simulation results:', error);
      toast.error('Failed to save simulation results');
    }
  };

  const handleSimulationExit = () => {
    setShowSimulation(false);
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

  if (showSimulation) {
    return (
      <TestSimulationMode
        questions={memoizedQuestions}
        paperTitle={paperTitle}
        duration={paperDuration}
        totalMarks={totalMarks}
        onComplete={handleSimulationComplete}
        onExit={handleSimulationExit}
        allowPause={true}
        showAnswersOnCompletion={true}
      />
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
          <div className="flex gap-2">
            <Button onClick={expandAll} variant="outline" size="sm">
              Expand All
            </Button>
            <Button onClick={collapseAll} variant="outline" size="sm">
              Collapse All
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
          const attachmentsCount = Array.isArray(question.attachments) ? question.attachments.length : 0;
          const hasFigureAttachment = attachmentsCount > 0;
          const baseCardClass = status.isReviewed
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
              className={cn('rounded-xl transition-all shadow-sm border', baseCardClass, figureHighlightClass)}
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
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {question.marks} mark{question.marks === 1 ? '' : 's'} • {question.question_type}
                    </p>
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
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Question text</label>
                        <textarea
                          value={question.question_text}
                          onChange={(event) => handleQuestionFieldChange(question, 'question_text', event.target.value)}
                          rows={4}
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Marks</label>
                        <input
                          type="number"
                          min={0}
                          value={question.marks}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            handleQuestionFieldChange(question, 'marks', Number.isNaN(value) ? question.marks : value);
                          }}
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Question type</label>
                        <select
                          value={question.question_type}
                          onChange={(event) =>
                            handleQuestionFieldChange(
                              question,
                              'question_type',
                              event.target.value as QuestionDisplayData['question_type']
                            )
                          }
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        >
                          {questionTypeOptions.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                          {!questionTypeOptions.some((type) => type.value === question.question_type) && (
                            <option value={question.question_type}>{question.question_type}</option>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Difficulty</label>
                        <input
                          type="text"
                          value={question.difficulty ?? ''}
                          onChange={(event) => handleQuestionFieldChange(question, 'difficulty', event.target.value)}
                          placeholder="e.g. Easy, Medium, Hard"
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Topic</label>
                        <input
                          type="text"
                          value={question.topic ?? ''}
                          onChange={(event) => handleQuestionFieldChange(question, 'topic', event.target.value)}
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Subtopic</label>
                        <input
                          type="text"
                          value={question.subtopic ?? ''}
                          onChange={(event) => handleQuestionFieldChange(question, 'subtopic', event.target.value)}
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Answer format</label>
                        <input
                          type="text"
                          value={question.answer_format ?? ''}
                          onChange={(event) => handleQuestionFieldChange(question, 'answer_format', event.target.value)}
                          placeholder="e.g. multi_line"
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Answer requirement</label>
                        <input
                          type="text"
                          value={question.answer_requirement ?? ''}
                          onChange={(event) => handleQuestionFieldChange(question, 'answer_requirement', event.target.value)}
                          placeholder="e.g. Include working"
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={requiresFigure}
                            onChange={(event) =>
                              commitQuestionUpdate(question, {
                                figure_required: event.target.checked,
                                figure: event.target.checked
                              })
                            }
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          Figure attachment required
                        </label>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Toggle off if the question no longer needs an accompanying image.
                        </span>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Hint</label>
                        <textarea
                          value={question.hint ?? ''}
                          onChange={(event) => handleQuestionFieldChange(question, 'hint', event.target.value)}
                          rows={2}
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Explanation</label>
                        <textarea
                          value={question.explanation ?? ''}
                          onChange={(event) => handleQuestionFieldChange(question, 'explanation', event.target.value)}
                          rows={2}
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        />
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
                    })}
                  </section>

                  {Array.isArray(question.parts) && question.parts.length > 0 && (
                    <section className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Parts & subparts</h4>
                      {question.parts.map((part, partIndex) => {
                        const partRequiresFigure = Boolean(part.figure_required ?? part.figure);
                        const partHasAttachments = Array.isArray(part.attachments) ? part.attachments.length > 0 : false;

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
                              <div>
                                <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Part label</label>
                                <input
                                  type="text"
                                  value={part.part_label ?? part.part ?? ''}
                                  onChange={(event) =>
                                    handlePartFieldChange(question, partIndex, {
                                      part_label: event.target.value,
                                      part: event.target.value
                                    })
                                  }
                                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Marks</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={part.marks ?? 0}
                                  onChange={(event) => {
                                    const value = Number(event.target.value);
                                    handlePartFieldChange(question, partIndex, {
                                      marks: Number.isNaN(value) ? part.marks : value
                                    });
                                  }}
                                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Part question text</label>
                              <textarea
                                value={part.question_text ?? ''}
                                onChange={(event) => handlePartFieldChange(question, partIndex, { question_text: event.target.value })}
                                rows={3}
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                              />
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div>
                                <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Answer format</label>
                                <input
                                  type="text"
                                  value={part.answer_format ?? ''}
                                  onChange={(event) => handlePartFieldChange(question, partIndex, { answer_format: event.target.value })}
                                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Answer requirement</label>
                                <input
                                  type="text"
                                  value={part.answer_requirement ?? ''}
                                  onChange={(event) => handlePartFieldChange(question, partIndex, { answer_requirement: event.target.value })}
                                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                />
                              </div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div>
                                <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Hint</label>
                                <textarea
                                  value={part.hint ?? ''}
                                  onChange={(event) => handlePartFieldChange(question, partIndex, { hint: event.target.value })}
                                  rows={2}
                                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Explanation</label>
                                <textarea
                                  value={part.explanation ?? ''}
                                  onChange={(event) => handlePartFieldChange(question, partIndex, { explanation: event.target.value })}
                                  rows={2}
                                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                />
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <input
                                  type="checkbox"
                                  checked={partRequiresFigure}
                                  onChange={(event) => handlePartFieldChange(question, partIndex, { figure_required: event.target.checked })}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                Figure required for this part
                              </label>
                            </div>

                            {renderAnswerEditorList(part.correct_answers, {
                              onAdd: () => handleAddPartCorrectAnswer(question, partIndex),
                              onChange: (answerIndex, updates) => handlePartCorrectAnswerChange(question, partIndex, answerIndex, updates),
                              onRemove: (answerIndex) => handleRemovePartCorrectAnswer(question, partIndex, answerIndex),
                              title: 'Correct answers',
                              emptyLabel: 'Provide the expected answer for this part.',
                              keyPrefix: `question-${question.id}-part-${partIndex}`
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
                                  const subRequiresFigure = Boolean(subpart.figure_required ?? subpart.figure);
                                  const subHasAttachments = Array.isArray(subpart.attachments)
                                    ? subpart.attachments.length > 0
                                    : false;

                                  return (
                                    <div
                                      key={`question-${question.id}-part-${partIndex}-sub-${subpart.id ?? subIndex}`}
                                      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div>
                                          <h6 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            Subpart {(subpart.part_label || subpart.part || String.fromCharCode(97 + subIndex)).toUpperCase()}
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
                                        <div>
                                          <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Subpart label</label>
                                          <input
                                            type="text"
                                            value={subpart.part_label ?? subpart.part ?? ''}
                                            onChange={(event) =>
                                              handleSubpartFieldChange(question, partIndex, subIndex, {
                                                part_label: event.target.value,
                                                part: event.target.value
                                              })
                                            }
                                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Marks</label>
                                          <input
                                            type="number"
                                            min={0}
                                            value={subpart.marks ?? 0}
                                            onChange={(event) => {
                                              const value = Number(event.target.value);
                                              handleSubpartFieldChange(question, partIndex, subIndex, {
                                                marks: Number.isNaN(value) ? subpart.marks : value
                                              });
                                            }}
                                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Subpart question text</label>
                                        <textarea
                                          value={subpart.question_text ?? ''}
                                          onChange={(event) =>
                                            handleSubpartFieldChange(question, partIndex, subIndex, {
                                              question_text: event.target.value
                                            })
                                          }
                                          rows={2}
                                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                        />
                                      </div>
                                      <div className="grid gap-3 md:grid-cols-2">
                                        <div>
                                          <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Answer format</label>
                                          <input
                                            type="text"
                                            value={subpart.answer_format ?? ''}
                                            onChange={(event) =>
                                              handleSubpartFieldChange(question, partIndex, subIndex, {
                                                answer_format: event.target.value
                                              })
                                            }
                                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Answer requirement</label>
                                          <input
                                            type="text"
                                            value={subpart.answer_requirement ?? ''}
                                            onChange={(event) =>
                                              handleSubpartFieldChange(question, partIndex, subIndex, {
                                                answer_requirement: event.target.value
                                              })
                                            }
                                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                          />
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
                      question={question}
                      showAnswers={true}
                      showHints={true}
                      showExplanations={true}
                      showAttachments={true}
                      compact={false}
                      highlightCorrect={true}
                      defaultExpandedSections={{ hint: true, explanation: true }}
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
    </div>
  );
};
