'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  GripVertical,
  Info,
  Layers,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Button, IconButton } from '../../../../components/shared/Button';
import { FormField, Input, Select, Textarea } from '../../../../components/shared/FormField';
import { ToggleSwitch } from '../../../../components/shared/ToggleSwitch';
import { SearchableMultiSelect } from '../../../../components/shared/SearchableMultiSelect';
import {
  useMockExamStatusTransition,
  useMockExamStatusWizard,
} from '../../../../hooks/useMockExams';
import type {
  MockExamInstructionRecord,
  MockExamLifecycleStatus,
  QuestionBankItem,
} from '../../../../services/mockExamService';
import { StageTransitionPayload } from '../../../../services/mockExamService';
import toast from 'react-hot-toast';

export type MockExamStatus = MockExamLifecycleStatus;

type StageFieldType = 'checkbox' | 'text' | 'textarea' | 'date' | 'datetime' | 'time' | 'number';

interface StageFieldDefinition {
  key: string;
  label: string;
  type: StageFieldType;
  required?: boolean;
  description?: string;
  placeholder?: string;
}

interface StageDefinition {
  status: MockExamStatus;
  label: string;
  description: string;
  icon: React.ReactNode;
  fields?: StageFieldDefinition[];
  notesFieldKey?: string;
  showInstructionsSetup?: boolean;
  showQuestionSelection?: boolean;
  emphasis?: string[];
}

interface InstructionFormState {
  id?: string;
  audience: MockExamInstructionRecord['audience'];
  instructions: string;
}

interface QuestionSelectionFormState {
  id?: string;
  sourceType: 'bank' | 'custom';
  questionId?: string;
  customQuestion?: Record<string, any> | null;
  marks?: number | null;
  sequence: number;
  isOptional?: boolean;
}

interface StatusTransitionWizardProps {
  examId: string;
  isOpen: boolean;
  currentStatus: MockExamStatus;
  onClose: () => void;
  onSuccess: () => void;
}

const STATUS_ORDER: Record<MockExamStatus, number> = {
  draft: 1,
  planned: 2,
  scheduled: 3,
  materials_ready: 4,
  in_progress: 5,
  grading: 6,
  moderation: 7,
  analytics_released: 8,
  completed: 9,
  cancelled: 10,
};

const ALLOWED_TRANSITIONS: Record<MockExamStatus, MockExamStatus[]> = {
  draft: ['planned', 'cancelled'],
  planned: ['draft', 'scheduled', 'cancelled'],
  scheduled: ['planned', 'materials_ready', 'in_progress', 'cancelled'],
  materials_ready: ['scheduled', 'in_progress', 'cancelled'],
  in_progress: ['grading', 'cancelled'],
  grading: ['moderation', 'analytics_released', 'cancelled'],
  moderation: ['grading', 'analytics_released', 'cancelled'],
  analytics_released: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const DEFAULT_INSTRUCTION_AUDIENCES: MockExamInstructionRecord['audience'][] = [
  'students',
  'invigilators',
  'markers',
  'teachers',
];

const MAX_CUSTOM_QUESTION_MARKS = 100;

function getQuestionPreview(question: QuestionBankItem): string {
  const base = question.question_text || question.question_description || 'Question';
  const truncated = base.length > 90 ? `${base.slice(0, 90)}…` : base;
  const marks = question.marks ? `${question.marks} mark${question.marks === 1 ? '' : 's'}` : 'Unscored';
  const prefix = question.question_number ? `Q${question.question_number}` : 'Question';
  return `${prefix}: ${truncated} (${marks})`;
}

const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    status: 'draft',
    label: 'Draft',
    description: 'Capture the core exam brief before sharing with stakeholders.',
    icon: <FileText className="w-4 h-4" />,
    fields: [
      {
        key: 'briefingComplete',
        label: 'Exam briefing outline prepared',
        type: 'checkbox',
        required: true,
      },
      {
        key: 'intendedCohort',
        label: 'Intended cohort summary',
        type: 'textarea',
        description: 'Outline the target classes, expected student numbers, and any SEN considerations.',
      },
      {
        key: 'notes',
        label: 'Draft notes',
        type: 'textarea',
      },
    ],
    notesFieldKey: 'notes',
  },
  {
    status: 'planned',
    label: 'Planned',
    description: 'Confirm timing, communication, and staffing before publishing the mock.',
    icon: <ClipboardList className="w-4 h-4" />,
    fields: [
      {
        key: 'scopeConfirmed',
        label: 'Scope confirmed with programme lead',
        type: 'checkbox',
        required: true,
      },
      {
        key: 'communicationDate',
        label: 'Parent communication date',
        type: 'date',
      },
      {
        key: 'teacherBriefingDate',
        label: 'Teacher briefing date',
        type: 'date',
      },
      {
        key: 'notes',
        label: 'Planning notes',
        type: 'textarea',
      },
    ],
    notesFieldKey: 'notes',
  },
  {
    status: 'scheduled',
    label: 'Scheduled',
    description: 'Lock in venues, invigilators, and operational readiness.',
    icon: <Layers className="w-4 h-4" />,
    fields: [
      {
        key: 'venueConfirmed',
        label: 'Venues confirmed and booked',
        type: 'checkbox',
        required: true,
      },
      {
        key: 'invigilatorsAssigned',
        label: 'Invigilators assigned',
        type: 'checkbox',
        required: true,
      },
      {
        key: 'accessArrangementChecks',
        label: 'Access arrangement checks complete',
        type: 'checkbox',
      },
      {
        key: 'notes',
        label: 'Scheduling notes',
        type: 'textarea',
      },
    ],
    notesFieldKey: 'notes',
  },
  {
    status: 'materials_ready',
    label: 'Materials ready',
    description: 'Finalise papers, mark schemes, and briefing packs for staff and candidates.',
    icon: <Sparkles className="w-4 h-4" />,
    fields: [
      {
        key: 'paperVersion',
        label: 'Paper version reference',
        type: 'text',
        required: true,
        placeholder: 'e.g. May 2025 Paper 2 v3',
      },
      {
        key: 'markSchemeReady',
        label: 'Mark scheme verified and uploaded',
        type: 'checkbox',
        required: true,
      },
      {
        key: 'qaChecksComplete',
        label: 'QA checks completed (peer review + proofreading)',
        type: 'checkbox',
        required: true,
      },
      {
        key: 'notes',
        label: 'Materials notes',
        type: 'textarea',
      },
    ],
    notesFieldKey: 'notes',
    showInstructionsSetup: true,
    showQuestionSelection: true,
  },
  {
    status: 'in_progress',
    label: 'In progress',
    description: 'Track exam delivery and any incidents requiring intervention.',
    icon: <ArrowRight className="w-4 h-4" />,
    fields: [
      {
        key: 'examStartTime',
        label: 'Actual start time',
        type: 'datetime',
        required: true,
      },
      {
        key: 'incidentsReported',
        label: 'Incidents reported',
        type: 'textarea',
        description: 'Log clashes, access needs, or irregularities noted by invigilators.',
      },
      {
        key: 'notes',
        label: 'Delivery notes',
        type: 'textarea',
      },
    ],
    notesFieldKey: 'notes',
  },
  {
    status: 'grading',
    label: 'Grading',
    description: 'Coordinate marking workflow and ensure deadlines are met.',
    icon: <Users className="w-4 h-4" />,
    fields: [
      {
        key: 'markersAssigned',
        label: 'Markers assigned and briefed',
        type: 'checkbox',
        required: true,
      },
      {
        key: 'markingDeadline',
        label: 'Marking deadline',
        type: 'date',
        required: true,
      },
      {
        key: 'notes',
        label: 'Grading notes',
        type: 'textarea',
      },
    ],
    notesFieldKey: 'notes',
  },
  {
    status: 'moderation',
    label: 'Moderation',
    description: 'Cross-check scripts to ensure consistency and fairness.',
    icon: <Layers className="w-4 h-4" />,
    fields: [
      {
        key: 'moderationLead',
        label: 'Moderation lead',
        type: 'text',
        required: true,
      },
      {
        key: 'moderationSummary',
        label: 'Moderation findings summary',
        type: 'textarea',
      },
      {
        key: 'notes',
        label: 'Moderation notes',
        type: 'textarea',
      },
    ],
    notesFieldKey: 'notes',
  },
  {
    status: 'analytics_released',
    label: 'Analytics released',
    description: 'Share outcomes with tutors, families, and learners.',
    icon: <Sparkles className="w-4 h-4" />,
    fields: [
      {
        key: 'releaseDate',
        label: 'Release date',
        type: 'date',
        required: true,
      },
      {
        key: 'releaseChannels',
        label: 'Release channels',
        type: 'textarea',
        description: 'E.g. MIS upload, tutor briefing, student dashboard, parent report.',
      },
      {
        key: 'notes',
        label: 'Analytics notes',
        type: 'textarea',
      },
    ],
    notesFieldKey: 'notes',
  },
  {
    status: 'completed',
    label: 'Completed',
    description: 'Close the loop with a targeted improvement plan.',
    icon: <CheckCircle2 className="w-4 h-4" />,
    fields: [
      {
        key: 'postExamReview',
        label: 'Post-exam review highlights',
        type: 'textarea',
        required: true,
      },
      {
        key: 'interventionPlan',
        label: 'Intervention plan summary',
        type: 'textarea',
      },
      {
        key: 'notes',
        label: 'Completion notes',
        type: 'textarea',
      },
    ],
    notesFieldKey: 'notes',
  },
  {
    status: 'cancelled',
    label: 'Cancelled',
    description: 'Provide an audit trail explaining why the mock was withdrawn.',
    icon: <AlertTriangle className="w-4 h-4" />,
    fields: [
      {
        key: 'cancellationReason',
        label: 'Cancellation reason',
        type: 'textarea',
        required: true,
        description: 'Explain the decision, who authorised it, and follow-up actions.',
      },
    ],
    notesFieldKey: 'cancellationReason',
  },
];

const stageDefinitionMap = new Map<MockExamStatus, StageDefinition>(
  STAGE_DEFINITIONS.map(definition => [definition.status, definition]),
);

const allowedStageSet = (status: MockExamStatus) => new Set<MockExamStatus>([
  status,
  ...(ALLOWED_TRANSITIONS[status] || []),
]);

const getFieldInputType = (type: StageFieldType) => {
  switch (type) {
    case 'date':
      return 'date';
    case 'time':
      return 'time';
    case 'datetime':
      return 'datetime-local';
    case 'number':
      return 'number';
    default:
      return 'text';
  }
};

function normaliseSequences(items: QuestionSelectionFormState[]): QuestionSelectionFormState[] {
  return items
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((item, index) => ({
      ...item,
      sequence: index + 1,
    }));
}

export function StatusTransitionWizard({
  examId,
  isOpen,
  currentStatus,
  onClose,
  onSuccess,
}: StatusTransitionWizardProps) {
  const {
    data: wizardData,
    isLoading,
    isFetching,
  } = useMockExamStatusWizard(isOpen ? examId : undefined);
  const transitionMutation = useMockExamStatusTransition();

  const [activeStage, setActiveStage] = useState<MockExamStatus>(currentStatus);
  const [stageFormState, setStageFormState] = useState<Record<MockExamStatus, Record<string, any>>>({});
  const [stageErrors, setStageErrors] = useState<Record<MockExamStatus, Record<string, string>>>({});
  const [instructionsState, setInstructionsState] = useState<InstructionFormState[]>([]);
  const [removedInstructionIds, setRemovedInstructionIds] = useState<string[]>([]);
  const [questionState, setQuestionState] = useState<QuestionSelectionFormState[]>([]);
  const [selectedBankQuestionIds, setSelectedBankQuestionIds] = useState<string[]>([]);
  const [removedQuestionIds, setRemovedQuestionIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setActiveStage(currentStatus);
      setStageErrors({});
    }
  }, [isOpen, currentStatus]);

  useEffect(() => {
    if (!wizardData) return;

    const nextFormState: Record<MockExamStatus, Record<string, any>> = {};
    wizardData.stageProgress.forEach(record => {
      const definition = stageDefinitionMap.get(record.stage as MockExamStatus);
      const baseRequirements = { ...(record.requirements || {}) };
      if (definition?.notesFieldKey && record.notes) {
        baseRequirements[definition.notesFieldKey] = record.notes;
      } else if (record.notes) {
        baseRequirements.notes = record.notes;
      }
      nextFormState[record.stage as MockExamStatus] = baseRequirements;
    });
    setStageFormState(nextFormState);

    if (wizardData.instructions.length > 0) {
      const defaultAudienceOrder = new Map(
        DEFAULT_INSTRUCTION_AUDIENCES.map((audience, index) => [audience, index]),
      );

      const existingInstructions = wizardData.instructions.map((instruction, index) => ({
        id: instruction.id,
        audience: instruction.audience as InstructionFormState['audience'],
        instructions: instruction.instructions || '',
        originalIndex: index,
      }));

      const sortedInstructions = existingInstructions
        .sort((a, b) => {
          const orderA = defaultAudienceOrder.get(a.audience) ?? DEFAULT_INSTRUCTION_AUDIENCES.length + a.originalIndex;
          const orderB = defaultAudienceOrder.get(b.audience) ?? DEFAULT_INSTRUCTION_AUDIENCES.length + b.originalIndex;
          if (orderA === orderB) {
            return a.originalIndex - b.originalIndex;
          }
          return orderA - orderB;
        })
        .map(({ originalIndex: _originalIndex, ...rest }) => rest);

      const existingAudiences = new Set(sortedInstructions.map(item => item.audience));

      const missingDefaults = DEFAULT_INSTRUCTION_AUDIENCES.filter(audience => !existingAudiences.has(audience)).map(
        audience => ({
          audience,
          instructions: '',
        }),
      );

      setInstructionsState([...sortedInstructions, ...missingDefaults]);
    } else {
      setInstructionsState(
        DEFAULT_INSTRUCTION_AUDIENCES.map(audience => ({
          audience,
          instructions: '',
        })),
      );
    }
    setRemovedInstructionIds([]);

    const selectionRecords = wizardData.questionSelections
      .map(selection => ({
        id: selection.id,
        sourceType: selection.source_type,
        questionId: selection.question_id || undefined,
        customQuestion: selection.custom_question || null,
        marks:
          selection.marks !== null && selection.marks !== undefined
            ? Number(selection.marks)
            : selection.question_bank_item?.marks ?? null,
        sequence: selection.sequence,
        isOptional: selection.is_optional ?? false,
      }))
      .sort((a, b) => a.sequence - b.sequence);

    setQuestionState(selectionRecords);
    setSelectedBankQuestionIds(
      selectionRecords
        .filter(item => item.sourceType === 'bank' && item.questionId)
        .map(item => item.questionId as string),
    );
    setRemovedQuestionIds([]);
  }, [wizardData]);

  const stageProgressMap = useMemo(() => {
    if (!wizardData) return new Map<MockExamStatus, { completed: boolean; completed_at: string | null }>();
    return new Map(
      wizardData.stageProgress.map(record => [record.stage as MockExamStatus, {
        completed: record.completed,
        completed_at: record.completed_at,
      }]),
    );
  }, [wizardData]);

  const allowedStages = useMemo(() => allowedStageSet(currentStatus), [currentStatus]);

  const questionOptions = useMemo(() => {
    if (!wizardData?.questionBank) return [];
    return wizardData.questionBank.map(option => ({
      value: option.id,
      label: getQuestionPreview(option),
    }));
  }, [wizardData?.questionBank]);

  const handleStageFieldChange = (status: MockExamStatus, key: string, value: any) => {
    setStageFormState(prev => ({
      ...prev,
      [status]: {
        ...(prev[status] || {}),
        [key]: value,
      },
    }));

    setStageErrors(prev => {
      if (!prev[status]) return prev;
      const { [key]: _removed, ...rest } = prev[status];
      return {
        ...prev,
        [status]: rest,
      };
    });
  };

  const handleAddInstruction = () => {
    setInstructionsState(prev => ([
      ...prev,
      {
        audience: 'other',
        instructions: '',
      },
    ]));
  };

  const handleInstructionChange = (index: number, updates: Partial<InstructionFormState>) => {
    setInstructionsState(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        ...updates,
      };
      return next;
    });
  };

  const handleRemoveInstruction = (index: number) => {
    setInstructionsState(prev => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed?.id) {
        setRemovedInstructionIds(prevIds => (prevIds.includes(removed.id!) ? prevIds : [...prevIds, removed.id!]));
      }
      if (next.length === 0) {
        return [
          {
            audience: 'students',
            instructions: '',
          },
        ];
      }
      return next;
    });
  };

  const handleQuestionSelectionChange = (values: string[]) => {
    setSelectedBankQuestionIds(values);

    setQuestionState(prev => {
      const currentBankSelections = prev.filter(item => item.sourceType === 'bank');
      const removed = currentBankSelections.filter(item => item.questionId && !values.includes(item.questionId));
      const additions = values.filter(value => !currentBankSelections.some(item => item.questionId === value));

      if (removed.length > 0) {
        setRemovedQuestionIds(prevIds => {
          const nextIds = [...prevIds];
          removed.forEach(record => {
            if (record.id && !nextIds.includes(record.id)) {
              nextIds.push(record.id);
            }
          });
          return nextIds;
        });
      }

      const nextRecords = prev.filter(
        item => !(item.sourceType === 'bank' && item.questionId && removed.some(removedItem => removedItem.questionId === item.questionId)),
      );

      const maxSequence = nextRecords.reduce((max, item) => Math.max(max, item.sequence), 0);

      additions.forEach((questionId, additionIndex) => {
        const bankItem = wizardData?.questionBank.find(item => item.id === questionId);
        nextRecords.push({
          sourceType: 'bank',
          questionId,
          marks: bankItem?.marks ?? null,
          sequence: maxSequence + additionIndex + 1,
          isOptional: false,
        });
      });

      return normaliseSequences(nextRecords);
    });
  };

  const handleQuestionFieldChange = (index: number, updates: Partial<QuestionSelectionFormState>) => {
    setQuestionState(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        ...updates,
      };
      return normaliseSequences(next);
    });
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestionState(prev => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed?.id) {
        setRemovedQuestionIds(prevIds => (prevIds.includes(removed.id!) ? prevIds : [...prevIds, removed.id!]));
      }
      const normalised = normaliseSequences(next);
      setSelectedBankQuestionIds(
        normalised
          .filter(item => item.sourceType === 'bank' && item.questionId)
          .map(item => item.questionId as string),
      );
      return normalised;
    });
  };

  const handleAddCustomQuestion = () => {
    setQuestionState(prev => {
      const nextSequence = prev.reduce((max, item) => Math.max(max, item.sequence), 0) + 1;
      return normaliseSequences([
        ...prev,
        {
          sourceType: 'custom',
          customQuestion: {
            prompt: '',
            type: 'descriptive',
            answer: '',
            guidance: '',
          },
          marks: null,
          sequence: nextSequence,
          isOptional: false,
        },
      ]);
    });
  };

  const handleReorderQuestion = (index: number, direction: 'up' | 'down') => {
    setQuestionState(prev => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) {
        return prev;
      }
      const temp = next[targetIndex];
      next[targetIndex] = next[index];
      next[index] = temp;
      return normaliseSequences(next);
    });
  };

  const validateStage = (): boolean => {
    const definition = stageDefinitionMap.get(activeStage);
    if (!definition) return true;

    const errors: Record<string, string> = {};
    const values = stageFormState[activeStage] || {};

    definition.fields?.forEach(field => {
      const value = values[field.key];
      if (field.required) {
        if (field.type === 'checkbox') {
          if (!value) {
            errors[field.key] = 'Required';
          }
        } else if (value === undefined || value === null || String(value).trim() === '') {
          errors[field.key] = 'Required';
        }
      }
    });

    if (definition.showInstructionsSetup) {
      const hasInstruction = instructionsState.some(instruction => instruction.instructions && instruction.instructions.trim().length > 0);
      if (!hasInstruction) {
        errors.instructions = 'Add at least one instruction set.';
      }
    }

    if (definition.showQuestionSelection) {
      const validSelections = questionState.filter(selection => {
        if (selection.sourceType === 'bank') {
          return Boolean(selection.questionId);
        }
        const prompt = selection.customQuestion?.prompt || selection.customQuestion?.question || selection.customQuestion?.text;
        return Boolean(prompt && String(prompt).trim().length > 0);
      });
      if (validSelections.length === 0) {
        errors.questionSelections = 'Select questions or add a custom item.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setStageErrors(prev => ({
        ...prev,
        [activeStage]: errors,
      }));
      toast.error('Please resolve the highlighted items.');
      return false;
    }

    setStageErrors(prev => ({
      ...prev,
      [activeStage]: {},
    }));

    return true;
  };

  const buildPayload = (): StageTransitionPayload | null => {
    // Defensive checks with detailed logging
    if (!wizardData) {
      console.error('[Wizard] Payload build failed: wizardData is null/undefined');
      return null;
    }

    if (!wizardData.exam) {
      console.error('[Wizard] Payload build failed: wizardData.exam is null/undefined', { wizardData });
      return null;
    }

    const definition = stageDefinitionMap.get(activeStage);
    if (!definition) {
      console.error('[Wizard] Payload build failed: No stage definition found', {
        activeStage,
        availableStages: Array.from(stageDefinitionMap.keys())
      });
      return null;
    }

    console.log('[Wizard] Building payload for stage:', activeStage, { examId, currentStatus });

    const rawValues = { ...(stageFormState[activeStage] || {}) };
    let notesValue: string | null | undefined = undefined;
    if (definition.notesFieldKey && definition.notesFieldKey in rawValues) {
      notesValue = rawValues[definition.notesFieldKey];
      delete rawValues[definition.notesFieldKey];
    }

    if (typeof notesValue === 'string') {
      const trimmed = notesValue.trim();
      notesValue = trimmed.length > 0 ? trimmed : null;
    }

    const forwardMove = STATUS_ORDER[activeStage] > STATUS_ORDER[currentStatus];
    const backwardMove = STATUS_ORDER[activeStage] < STATUS_ORDER[currentStatus];

    const trimmedInstructions = instructionsState.map(instruction => ({
      ...instruction,
      instructions: instruction.instructions ?? '',
    }));

    const instructionsPayload = definition.showInstructionsSetup
      ? trimmedInstructions
          .filter(instruction => instruction.instructions.trim().length > 0)
          .map(instruction => ({
            id: instruction.id,
            audience: instruction.audience,
            instructions: instruction.instructions.trim(),
          }))
      : undefined;

    const blankInstructionIds = definition.showInstructionsSetup
      ? trimmedInstructions
          .filter(instruction => !instruction.instructions.trim() && instruction.id)
          .map(instruction => instruction.id as string)
      : [];

    const questionsPayload = definition.showQuestionSelection
      ? {
          selectedQuestions: questionState
            .filter(selection => {
              if (selection.sourceType === 'bank') {
                return Boolean(selection.questionId);
              }
              const prompt = selection.customQuestion?.prompt || selection.customQuestion?.question || selection.customQuestion?.text;
              return Boolean(prompt && String(prompt).trim().length > 0);
            })
            .map(selection => ({
              id: selection.id,
              sourceType: selection.sourceType,
              questionId: selection.sourceType === 'bank' ? selection.questionId : undefined,
              customQuestion: selection.sourceType === 'custom'
                ? {
                    ...selection.customQuestion,
                    prompt:
                      selection.customQuestion?.prompt ||
                      selection.customQuestion?.question ||
                      selection.customQuestion?.text,
                    marks: selection.marks ?? null,
                  }
                : undefined,
              marks: selection.marks ?? null,
              sequence: selection.sequence,
              isOptional: selection.isOptional ?? false,
            })),
          removedQuestionIds,
        }
      : undefined;

    const reason = definition.status === 'cancelled' ? (notesValue?.trim() || undefined) : undefined;

    const payload: StageTransitionPayload = {
      examId,
      currentStatus,
      targetStatus: activeStage,
      reason,
      stageData: {
        formData: rawValues,
        notes: notesValue !== undefined ? notesValue : undefined,
        completed: forwardMove ? true : backwardMove ? false : undefined,
        instructions: instructionsPayload,
        removedInstructionIds:
          removedInstructionIds.length > 0 || blankInstructionIds.length > 0
            ? Array.from(new Set([...removedInstructionIds, ...blankInstructionIds]))
            : undefined,
        questionSelections: questionsPayload,
      },
    };

    return payload;
  };

  const handleSubmit = async () => {
    // Prevent submission while data is loading
    if (isLoading || isFetching) {
      toast.error('Wizard data is still loading. Please wait...');
      return;
    }

    // Ensure wizard data is loaded
    if (!wizardData) {
      toast.error('Failed to load exam data. Please close and reopen the wizard.');
      return;
    }

    if (!wizardData.exam) {
      toast.error('Exam data is incomplete. Please check your permissions and try again.');
      console.error('[Wizard] Submit blocked: exam data missing', { examId, wizardData });
      return;
    }

    if (!validateStage()) {
      return;
    }

    const payload = buildPayload();
    if (!payload) {
      toast.error('Unable to build status update payload. Check console for details.');
      console.error('[Wizard] Payload building failed. Check logs above for specific reason.');
      return;
    }

    console.log('[Wizard] Submitting payload:', payload);

    try {
      await transitionMutation.mutateAsync(payload);
      toast.success(`Status updated to ${stageDefinitionMap.get(activeStage)?.label ?? activeStage}`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('[Wizard] Failed to transition status:', error);

      // Check for specific error types
      if (error?.message?.includes('permission') || error?.message?.includes('policy')) {
        toast.error('Permission denied. You may not have access to modify this exam.');
      } else if (error?.message?.includes('network') || error?.code === 'PGRST301') {
        toast.error('Network error. Please check your connection and try again.');
      } else if (error?.message?.includes('validation')) {
        toast.error('Validation failed. Please check all required fields.');
      } else {
        const message = error?.message || 'Unable to update status. Please try again.';
        toast.error(message);
      }
    }
  };

  if (!isOpen) {
    return null;
  }

  const definition = stageDefinitionMap.get(activeStage);
  const errorsForStage = stageErrors[activeStage] || {};
  const exam = wizardData?.exam;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-6xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-start justify-between border-b border-gray-200 p-6 dark:border-gray-800">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Change mock exam status</h2>
            {exam && (
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <div className="font-medium text-gray-800 dark:text-gray-100">{exam.title}</div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>{exam.board_name ?? 'Board not set'}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{exam.programme_name ?? 'Programme not set'}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{exam.subject_name ?? 'Subject not set'}</span>
                  {exam.scheduled_date && (
                    <span className="hidden sm:inline">•</span>
                  )}
                  {exam.scheduled_date && (
                    <span>
                      {dayjs(`${exam.scheduled_date}${exam.scheduled_time ? `T${exam.scheduled_time}` : ''}`).format('DD MMM YYYY')}
                      {exam.scheduled_time ? ` · ${dayjs(`${exam.scheduled_date}T${exam.scheduled_time}`).format('HH:mm')}` : ''}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {transitionMutation.isPending && <Loader2 className="h-5 w-5 animate-spin text-[#8CC63F]" />}
            <IconButton
              variant="ghost"
              size="icon"
              aria-label="Close status wizard"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </IconButton>
          </div>
        </div>
        <div className="flex max-h-[70vh] flex-col gap-0 lg:flex-row">
          <aside className="w-full border-b border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-900/60 lg:w-72 lg:border-b-0 lg:border-r">
            <div className="space-y-3">
              {STAGE_DEFINITIONS.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]).map(stage => {
                const stageProgress = stageProgressMap.get(stage.status);
                const isActive = stage.status === activeStage;
                const isAllowed = allowedStages.has(stage.status);
                const isComplete = stageProgress?.completed;
                return (
                  <button
                    key={stage.status}
                    type="button"
                    onClick={() => isAllowed && setActiveStage(stage.status)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      isActive
                        ? 'border-[#8CC63F] bg-white shadow dark:border-[#8CC63F] dark:bg-gray-900'
                        : isAllowed
                          ? 'border-transparent bg-white/60 hover:border-[#8CC63F]/40 hover:bg-white dark:border-transparent dark:bg-gray-900/70 dark:hover:border-[#8CC63F]/40'
                          : 'cursor-not-allowed border-transparent bg-white/40 opacity-60 dark:bg-gray-900/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${
                          isComplete
                            ? 'bg-[#8CC63F]/10 text-[#8CC63F]'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {stage.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {stage.label}
                            {isComplete && <CheckCircle2 className="h-4 w-4 text-[#8CC63F]" />}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{stage.description}</div>
                        </div>
                      </div>
                      {isAllowed ? (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Info className="h-4 w-4 text-gray-300" />
                      )}
                    </div>
                    {stageProgress?.completed_at && (
                      <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                        Completed on {dayjs(stageProgress.completed_at).format('DD MMM YYYY HH:mm')}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>
          <main className="flex-1 overflow-y-auto p-6">
            {isLoading || isFetching ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin text-[#8CC63F]" />
                <p>Loading exam data…</p>
                <p className="text-xs text-gray-400">Please wait while we fetch the wizard context</p>
              </div>
            ) : !wizardData?.exam ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
                <AlertTriangle className="h-12 w-12 text-red-500" />
                <p className="font-semibold text-gray-900 dark:text-white">Failed to Load Exam Data</p>
                <p className="text-sm text-center max-w-md">Unable to retrieve exam information. This may be due to permissions or a network issue.</p>
                <Button variant="default" onClick={() => {
                  window.location.reload();
                }} className="mt-4">Reload Page</Button>
              </div>
            ) : (
              <div className="space-y-6">
                {definition && (
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8CC63F]/10 text-[#8CC63F]">
                        {definition.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{definition.label}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{definition.description}</p>
                      </div>
                    </div>
                  </div>
                )}

                {definition?.fields && definition.fields.length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                        Stage requirements
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Info className="h-4 w-4" />
                        Complete the minimum checklist before advancing.
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {definition.fields.map(field => {
                        const value = stageFormState[activeStage]?.[field.key];
                        const error = errorsForStage[field.key];

                        if (field.type === 'checkbox') {
                          return (
                            <div key={field.key} className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                              <ToggleSwitch
                                checked={Boolean(value)}
                                onChange={checked => handleStageFieldChange(activeStage, field.key, checked)}
                                label={field.label}
                                description={field.description}
                              />
                              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
                            </div>
                          );
                        }

                        return (
                          <FormField
                            key={field.key}
                            id={`${activeStage}-${field.key}`}
                            label={field.label}
                            required={field.required}
                            description={field.description}
                            error={error}
                          >
                            {field.type === 'textarea' ? (
                              <Textarea
                                value={value ?? ''}
                                onChange={event => handleStageFieldChange(activeStage, field.key, event.target.value)}
                                placeholder={field.placeholder}
                                rows={4}
                              />
                            ) : (
                              <Input
                                type={getFieldInputType(field.type)}
                                value={value ?? ''}
                                onChange={event => handleStageFieldChange(activeStage, field.key, event.target.value)}
                                placeholder={field.placeholder}
                                max={field.type === 'number' ? MAX_CUSTOM_QUESTION_MARKS : undefined}
                              />
                            )}
                          </FormField>
                        );
                      })}
                    </div>
                  </div>
                )}

                {definition?.showInstructionsSetup && (
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                          Exam instructions
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Provide tailored briefings for candidates, invigilators, and marking teams. These will feed into the
                          generated briefing packs.
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleAddInstruction} leftIcon={<Plus className="h-4 w-4" />}>
                        Add audience
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {instructionsState.map((instruction, index) => (
                        <div
                          key={instruction.id ?? index}
                          className="rounded-lg border border-gray-200 p-4 shadow-sm dark:border-gray-800"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <Select
                              value={instruction.audience}
                              options={[
                                { value: 'students', label: 'Students' },
                                { value: 'invigilators', label: 'Invigilators' },
                                { value: 'markers', label: 'Markers' },
                                { value: 'teachers', label: 'Teachers' },
                                { value: 'admins', label: 'Admins' },
                                { value: 'other', label: 'Other' },
                              ]}
                              onChange={value => handleInstructionChange(index, { audience: value as InstructionFormState['audience'] })}
                            />
                            <IconButton
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Remove instructions"
                              onClick={() => handleRemoveInstruction(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </IconButton>
                          </div>
                          <Textarea
                            rows={4}
                            value={instruction.instructions}
                            onChange={event => handleInstructionChange(index, { instructions: event.target.value })}
                            placeholder="Key instructions, equipment reminders, or escalation routes."
                          />
                        </div>
                      ))}
                    </div>
                    {errorsForStage.instructions && (
                      <p className="mt-2 text-sm text-red-500">{errorsForStage.instructions}</p>
                    )}
                  </div>
                )}

                {definition?.showQuestionSelection && (
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                          Question selection
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Curate questions from the IGCSE master bank or draft bespoke items. Selected questions will be
                          version-controlled for this mock.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={handleAddCustomQuestion} leftIcon={<Plus className="h-4 w-4" />}>
                          Add custom question
                        </Button>
                      </div>
                    </div>
                    <div className="mb-4">
                      <SearchableMultiSelect
                        label="Add bank questions"
                        options={questionOptions}
                        selectedValues={selectedBankQuestionIds}
                        onChange={handleQuestionSelectionChange}
                        placeholder="Search the question bank"
                      />
                    </div>
                    <div className="space-y-3">
                      {questionState.length === 0 && (
                        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                          No questions selected yet. Use the selector above or add a custom question.
                        </div>
                      )}
                      {questionState.map((question, index) => {
                        const isCustom = question.sourceType === 'custom';
                        const optionDetails = wizardData?.questionBank.find(item => item.id === question.questionId);
                        return (
                          <div
                            key={question.id ?? `${question.sourceType}-${index}`}
                            className="rounded-lg border border-gray-200 p-4 shadow-sm dark:border-gray-800"
                          >
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                                <GripVertical className="h-4 w-4 text-gray-300" />
                                <span>{isCustom ? 'Custom question' : optionDetails ? getQuestionPreview(optionDetails) : 'Bank question'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleReorderQuestion(index, 'up')}
                                  disabled={index === 0}
                                  aria-label="Move question up"
                                >
                                  <ChevronRight className="h-4 w-4 rotate-[-90deg]" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleReorderQuestion(index, 'down')}
                                  disabled={index === questionState.length - 1}
                                  aria-label="Move question down"
                                >
                                  <ChevronRight className="h-4 w-4 rotate-90" />
                                </Button>
                                <IconButton
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Remove question"
                                  onClick={() => handleRemoveQuestion(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </IconButton>
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-4">
                              <FormField id={`sequence-${index}`} label="Sequence" required>
                                <Input
                                  type="number"
                                  min={1}
                                  value={question.sequence}
                                  onChange={event => handleQuestionFieldChange(index, {
                                    sequence: Math.max(1, Number(event.target.value) || 1),
                                  })}
                                />
                              </FormField>
                              <FormField id={`marks-${index}`} label="Marks">
                                <Input
                                  type="number"
                                  min={0}
                                  max={MAX_CUSTOM_QUESTION_MARKS}
                                  value={question.marks ?? ''}
                                  onChange={event => handleQuestionFieldChange(index, {
                                    marks: event.target.value === '' ? null : Number(event.target.value),
                                  })}
                                />
                              </FormField>
                              <div className="md:col-span-2">
                                <ToggleSwitch
                                  checked={question.isOptional ?? false}
                                  onChange={checked => handleQuestionFieldChange(index, { isOptional: checked })}
                                  label="Optional question"
                                  description="Mark as optional for differentiated pathways."
                                />
                              </div>
                            </div>
                            {isCustom && (
                              <div className="mt-4 space-y-3">
                                <FormField id={`custom-prompt-${index}`} label="Question prompt" required>
                                  <Textarea
                                    rows={4}
                                    value={question.customQuestion?.prompt ?? ''}
                                    onChange={event => handleQuestionFieldChange(index, {
                                      customQuestion: {
                                        ...question.customQuestion,
                                        prompt: event.target.value,
                                      },
                                    })}
                                    placeholder="Enter the question stem, including any diagrams or context references."
                                  />
                                </FormField>
                                <FormField id={`custom-answer-${index}`} label="Expected answer / mark scheme">
                                  <Textarea
                                    rows={3}
                                    value={question.customQuestion?.answer ?? ''}
                                    onChange={event => handleQuestionFieldChange(index, {
                                      customQuestion: {
                                        ...question.customQuestion,
                                        answer: event.target.value,
                                      },
                                    })}
                                    placeholder="Provide indicative answers, acceptable alternatives, or marking notes."
                                  />
                                </FormField>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {errorsForStage.questionSelections && (
                      <p className="mt-2 text-sm text-red-500">{errorsForStage.questionSelections}</p>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {activeStage === currentStatus ? 'Update stage data' : `Move to ${definition?.label ?? activeStage}`}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {activeStage === currentStatus
                        ? 'Save the latest checklist information without changing the status.'
                        : 'The status history and audit trail will be updated.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={onClose} leftIcon={<Minus className="h-4 w-4" />}>
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      onClick={handleSubmit}
                      disabled={transitionMutation.isPending || isLoading || isFetching || !wizardData?.exam}
                      leftIcon={<ArrowRight className="h-4 w-4" />}
                    >
                      {transitionMutation.isPending ? 'Updating…' : (isLoading || isFetching) ? 'Loading…' : activeStage === currentStatus ? 'Save stage data' : 'Confirm transition'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
