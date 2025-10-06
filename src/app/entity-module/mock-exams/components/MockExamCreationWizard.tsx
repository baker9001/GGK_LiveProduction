'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  Users,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Info,
  Sparkles,
  Clock,
  Building2,
  FileText
} from 'lucide-react';
import { MultiStepWizard, WizardStep } from '../../../../components/shared/MultiStepWizard';
import { FormField, Input, Select, Textarea } from '../../../../components/shared/FormField';
import { SearchableMultiSelect } from '../../../../components/shared/SearchableMultiSelect';
import { ToggleSwitch } from '../../../../components/shared/ToggleSwitch';
import { ConflictDetectionPanel } from './ConflictDetectionPanel';
import { QuestionsStep, SelectedQuestion } from './QuestionsStep';
import { useConflictDetection } from '../../../../hooks/useConflictDetection';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

export interface MockExamFormData {
  title: string;
  board: string;
  program: string;
  subject: string;
  subjectId: string;
  paper: string;
  schools: string[];
  branches: string[];
  gradeBands: string[];
  sections: string[];
  examWindow: string;
  scheduledStart: string;
  durationMinutes: string;
  deliveryMode: 'In-person' | 'Digital (exam hall)' | 'Remote proctored';
  teachers: string[];
  selectedQuestions: SelectedQuestion[];
  aiProctoringEnabled: boolean;
  releaseAnalyticsToStudents: boolean;
  allowRetakes: boolean;
  notes: string;
}

interface MockExamCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MockExamFormData) => Promise<void>;
  initialData?: Partial<MockExamFormData>;
  dataStructures: any[];
  schools: any[];
  branches: any[];
  gradeLevels: any[];
  classSections: any[];
  teachers: any[];
  isLoadingBranches?: boolean;
  isLoadingGradeLevels?: boolean;
  isLoadingTeachers?: boolean;
  onSchoolsChange?: (schoolIds: string[]) => void;
  onSubjectChange?: (subjectId: string) => void;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'basic-info',
    title: 'Basic Info',
    description: 'Set up the exam title and academic details',
    icon: <BookOpen className="w-5 h-5" />,
    estimatedMinutes: 2,
  },
  {
    id: 'scope',
    title: 'Scope & Cohort',
    description: 'Select schools, branches, and student groups',
    icon: <Building2 className="w-5 h-5" />,
    estimatedMinutes: 3,
  },
  {
    id: 'schedule',
    title: 'Schedule',
    description: 'Set date, time, and exam duration',
    icon: <Calendar className="w-5 h-5" />,
    estimatedMinutes: 2,
  },
  {
    id: 'team',
    title: 'Teaching Team',
    description: 'Assign lead teachers and staff',
    icon: <Users className="w-5 h-5" />,
    estimatedMinutes: 2,
  },
  {
    id: 'questions',
    title: 'Questions',
    description: 'Select and organize exam questions',
    icon: <FileText className="w-5 h-5" />,
    estimatedMinutes: 6,
  },
  {
    id: 'review',
    title: 'Review & Create',
    description: 'Review all details and create the mock exam',
    icon: <CheckCircle2 className="w-5 h-5" />,
    estimatedMinutes: 1,
  },
];

const PAPER_OPTIONS = [
  { value: 'Paper 1', label: 'Paper 1' },
  { value: 'Paper 2', label: 'Paper 2' },
  { value: 'Paper 3', label: 'Paper 3' },
  { value: 'Paper 4', label: 'Paper 4' },
  { value: 'Specimen', label: 'Specimen (school authored)' }
];

const EXAM_WINDOW_OPTIONS = [
  { value: 'Term 1', label: 'Term 1' },
  { value: 'Term 2', label: 'Term 2' },
  { value: 'Term 3', label: 'Term 3' },
  { value: 'Trial Exams', label: 'Trial Exams' }
];

const DELIVERY_MODE_OPTIONS = [
  { value: 'In-person', label: 'In-person' },
  { value: 'Digital (exam hall)', label: 'Digital (exam hall)', disabled: true },
  { value: 'Remote proctored', label: 'Remote proctored', disabled: true }
];

const INITIAL_FORM_DATA: MockExamFormData = {
  title: '',
  board: '',
  program: '',
  subject: '',
  subjectId: '',
  paper: 'Paper 1',
  schools: [],
  branches: [],
  gradeBands: [],
  sections: [],
  examWindow: 'Term 2',
  scheduledStart: '',
  durationMinutes: '120',
  deliveryMode: 'In-person',
  teachers: [],
  selectedQuestions: [],
  aiProctoringEnabled: false,
  releaseAnalyticsToStudents: false,
  allowRetakes: false,
  notes: ''
};

export function MockExamCreationWizard({
  isOpen,
  onClose,
  onSubmit,
  initialData = {},
  dataStructures,
  schools,
  branches,
  gradeLevels,
  classSections,
  teachers,
  isLoadingBranches = false,
  isLoadingGradeLevels = false,
  isLoadingTeachers = false,
  onSchoolsChange,
  onSubjectChange,
}: MockExamCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<MockExamFormData>({ ...INITIAL_FORM_DATA, ...initialData });
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDataStructure, setSelectedDataStructure] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Conflict detection
  const conflictParams = useMemo(() => {
    if (!formData.scheduledStart || !formData.durationMinutes || formData.schools.length === 0) {
      return null;
    }

    const dateTime = dayjs(formData.scheduledStart);
    return {
      scheduledDate: dateTime.format('YYYY-MM-DD'),
      scheduledTime: dateTime.format('HH:mm:ss'),
      durationMinutes: Number.parseInt(formData.durationMinutes, 10),
      schoolIds: formData.schools,
      branchIds: formData.branches,
      gradeLevelIds: formData.gradeBands,
      sectionIds: formData.sections,
      teacherIds: formData.teachers,
    };
  }, [formData.scheduledStart, formData.durationMinutes, formData.schools, formData.branches, formData.gradeBands, formData.sections, formData.teachers]);

  const { conflictData, isChecking, checkConflicts, hasConflicts, conflicts, warnings } = useConflictDetection(
    conflictParams,
    currentStep === 2 // Only auto-check when on schedule step
  );

  // Auto-save functionality
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      localStorage.setItem('mockExamDraft', JSON.stringify(formData));
      setLastSavedAt(new Date());
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData, isOpen]);

  // Load draft on open
  useEffect(() => {
    if (isOpen && !initialData) {
      const draft = localStorage.getItem('mockExamDraft');
      if (draft) {
        try {
          const parsedDraft = JSON.parse(draft);
          setFormData({ ...INITIAL_FORM_DATA, ...parsedDraft });
        } catch (error) {
          console.error('Failed to load draft:', error);
        }
      }
    }
  }, [isOpen, initialData]);

  // Prepare dropdown options
  const programOptions = useMemo(() => {
    const unique = new Set(dataStructures.map(ds => ds.program_name));
    return Array.from(unique).map(name => ({ value: name, label: name }));
  }, [dataStructures]);

  const boardOptions = useMemo(() => {
    const unique = new Set(dataStructures.map(ds => ds.provider_name));
    return Array.from(unique).map(name => ({ value: name, label: name }));
  }, [dataStructures]);

  const subjectOptions = useMemo(() => {
    const unique = new Set(dataStructures.map(ds => ds.subject_name));
    return Array.from(unique).map(name => ({ value: name, label: name }));
  }, [dataStructures]);

  const gradeOptions = useMemo(() => {
    return gradeLevels.map(gl => ({ value: gl.id, label: gl.name }));
  }, [gradeLevels]);

  const sectionOptions = useMemo(() => {
    return classSections.map(cs => ({
      value: cs.id,
      label: `${cs.grade_level_name} - ${cs.name} (${cs.student_count} students)`
    }));
  }, [classSections]);

  const branchOptions = useMemo(() => {
    if (!branches || branches.length === 0) return [];
    return branches.map((branch: any) => ({
      value: branch.id,
      label: `${branch.school_name} → ${branch.name}`
    }));
  }, [branches, schools]);

  const teacherDirectory = useMemo(() => {
    return teachers.map(t => ({
      id: t.id,
      label: `${t.name} — ${t.role}`,
      role: t.role
    }));
  }, [teachers]);

  const dataStructureOptions = useMemo(() => {
    return dataStructures.map(ds => ({
      value: ds.id,
      label: `${ds.provider_name} - ${ds.program_name} - ${ds.subject_name}`
    }));
  }, [dataStructures]);

  // Calculate estimated student count
  const estimatedStudentCount = useMemo(() => {
    if (formData.sections.length > 0) {
      return classSections
        .filter(cs => formData.sections.includes(cs.id))
        .reduce((sum, cs) => sum + cs.student_count, 0);
    }
    return 0;
  }, [formData.sections, classSections]);

  // Validation for each step
  const validateStep = (stepIndex: number): boolean => {
    const errors: Record<string, string> = {};

    switch (stepIndex) {
      case 0: // Basic Info
        if (!formData.title.trim()) {
          errors.title = 'Exam title is required';
        }
        if (!formData.subject) {
          errors.subject = 'Subject is required';
        }
        if (!formData.paper) {
          errors.paper = 'Paper type is required';
        }
        break;

      case 1: // Scope
        if (formData.schools.length === 0) {
          errors.schools = 'Select at least one school';
        }
        if (formData.gradeBands.length === 0) {
          errors.gradeBands = 'Select at least one year group';
        }
        break;

      case 2: // Schedule
        if (!formData.scheduledStart) {
          errors.scheduledStart = 'Scheduled date and time is required';
        }
        if (!formData.durationMinutes || parseInt(formData.durationMinutes) < 30) {
          errors.durationMinutes = 'Duration must be at least 30 minutes';
        }
        // Check for critical conflicts
        const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
        if (criticalConflicts.length > 0) {
          errors.scheduledStart = `${criticalConflicts.length} critical conflict${criticalConflicts.length !== 1 ? 's' : ''} must be resolved`;
        }
        break;

      case 3: // Team
        if (formData.teachers.length === 0) {
          errors.teachers = 'Assign at least one lead teacher';
        }
        break;

      case 4: // Questions
        if (formData.selectedQuestions.length === 0) {
          errors.questions = 'Select at least one question for the exam';
        }
        break;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStepChange = (newStep: number) => {
    if (newStep > currentStep) {
      if (!validateStep(currentStep)) {
        toast.error('Please complete all required fields before proceeding');
        return;
      }
      setCompletedSteps(prev => new Set(prev).add(currentStep));
    }
    setCurrentStep(newStep);
    setFieldErrors({});
  };

  const handleComplete = async () => {
    if (!validateStep(currentStep)) {
      toast.error('Please complete all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      localStorage.removeItem('mockExamDraft');
      setFormData(INITIAL_FORM_DATA);
      setCurrentStep(0);
      setCompletedSteps(new Set());
      toast.success('Mock exam created successfully!');
    } catch (error) {
      console.error('Failed to create mock exam:', error);
      toast.error('Failed to create mock exam. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (currentStep > 0) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmed) return;
    }
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setFieldErrors({});
    onClose();
  };

  const canGoNext = useMemo(() => {
    return validateStep(currentStep);
  }, [currentStep, formData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col">
        <MultiStepWizard
          steps={WIZARD_STEPS}
          currentStep={currentStep}
          onStepChange={handleStepChange}
          onComplete={handleComplete}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          canGoNext={canGoNext}
          completedSteps={completedSteps}
          autoSave={true}
          lastSavedAt={lastSavedAt}
        >
          {/* Step 0: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-medium mb-1">Quick Start Tip</p>
                    <p>Choose a descriptive title that includes the year group, subject, and paper number for easy identification.</p>
                  </div>
                </div>
              </div>

              <FormField id="mock-title" label="Mock exam title" required error={fieldErrors.title}>
                <Input
                  id="mock-title"
                  placeholder="E.g. Year 11 Mathematics Mock – Paper 4 (Extended)"
                  value={formData.title}
                  onChange={event => setFormData(prev => ({ ...prev, title: event.target.value }))}
                />
              </FormField>

              <FormField id="mock-data-structure" label="Programme / Board / Subject" required error={fieldErrors.subject}>
                <Select
                  id="mock-data-structure"
                  value={selectedDataStructure}
                  onChange={value => {
                    setSelectedDataStructure(value);
                    const ds = dataStructures.find(d => d.id === value);
                    if (ds) {
                      setFormData(prev => ({
                        ...prev,
                        program: ds.program_name,
                        board: ds.provider_name,
                        subject: ds.subject_name,
                        subjectId: ds.subject_id
                      }));
                      onSubjectChange?.(ds.subject_id);
                    }
                  }}
                  options={dataStructureOptions}
                  placeholder="Select exam board, programme, and subject"
                  usePortal={false}
                />
              </FormField>

              {formData.subject && (
                <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Programme</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formData.program}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Exam Board</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formData.board}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subject</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formData.subject}</p>
                  </div>
                </div>
              )}

              <FormField id="mock-paper" label="Paper" required error={fieldErrors.paper}>
                <Select
                  id="mock-paper"
                  value={formData.paper}
                  onChange={value => setFormData(prev => ({ ...prev, paper: value }))}
                  options={PAPER_OPTIONS}
                  usePortal={false}
                />
              </FormField>

              <FormField id="mock-window" label="Term / window" required>
                <Select
                  id="mock-window"
                  value={formData.examWindow}
                  onChange={value => setFormData(prev => ({ ...prev, examWindow: value }))}
                  options={EXAM_WINDOW_OPTIONS}
                  usePortal={false}
                />
              </FormField>
            </div>
          )}

          {/* Step 1: Scope & Cohort */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900 dark:text-amber-100">
                    <p className="font-medium mb-1">Selection Order</p>
                    <p>Select schools first to see available branches, year groups, and sections. Sections are optional.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <SearchableMultiSelect
                  label="Schools"
                  options={schools.map(school => ({
                    label: `${school.name} (${school.student_count} students)`,
                    value: school.id
                  }))}
                  selectedValues={formData.schools}
                  onChange={values => {
                    setFormData(prev => ({
                      ...prev,
                      schools: values,
                      branches: [],
                      gradeBands: [],
                      sections: [],
                      teachers: []
                    }));
                    onSchoolsChange?.(values);
                  }}
                  placeholder="Select schools"
                  className="green-theme"
                  usePortal={false}
                />
                {fieldErrors.schools && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.schools}
                  </p>
                )}
              </div>

              {formData.schools.length > 0 && (
                <>
                  <div className="space-y-2">
                    <SearchableMultiSelect
                      label="Branches (optional)"
                      options={branchOptions}
                      selectedValues={formData.branches}
                      onChange={values => setFormData(prev => ({ ...prev, branches: values }))}
                      placeholder={isLoadingBranches ? "Loading branches..." : "Select branches within schools"}
                      className="green-theme"
                      usePortal={false}
                      disabled={isLoadingBranches}
                    />
                    {!isLoadingBranches && branches.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        No branches configured for selected school{formData.schools.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <SearchableMultiSelect
                      label="Year groups"
                      options={gradeOptions}
                      selectedValues={formData.gradeBands}
                      onChange={values => {
                        setFormData(prev => ({
                          ...prev,
                          gradeBands: values,
                          sections: []
                        }));
                      }}
                      placeholder={isLoadingGradeLevels ? "Loading year groups..." : "Select year groups"}
                      className="green-theme"
                      usePortal={false}
                      disabled={isLoadingGradeLevels}
                    />
                    {fieldErrors.gradeBands && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {fieldErrors.gradeBands}
                      </p>
                    )}
                  </div>

                  {formData.gradeBands.length > 0 && (
                    <div className="space-y-2">
                      <SearchableMultiSelect
                        label="Class sections (optional)"
                        options={sectionOptions}
                        selectedValues={formData.sections}
                        onChange={values => setFormData(prev => ({ ...prev, sections: values }))}
                        placeholder="Select specific class sections"
                        className="green-theme"
                        usePortal={false}
                      />
                      {formData.sections.length === 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Leave empty to include all sections in selected year groups
                        </p>
                      )}
                    </div>
                  )}

                  {estimatedStudentCount > 0 && (
                    <div className="p-4 rounded-lg bg-[#8CC63F]/10 border border-[#8CC63F]/30">
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-[#8CC63F]" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Estimated Impact: {estimatedStudentCount} students
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            Based on selected sections and year groups
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 2: Schedule */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-900 dark:text-green-100">
                    <p className="font-medium mb-1">IGCSE Duration Guidelines</p>
                    <p>Cambridge IGCSE papers typically run 45-180 minutes. Verify duration matches official specifications.</p>
                  </div>
                </div>
              </div>

              <FormField id="mock-datetime" label="Scheduled date & time" required error={fieldErrors.scheduledStart}>
                <Input
                  id="mock-datetime"
                  type="datetime-local"
                  value={formData.scheduledStart}
                  onChange={event => setFormData(prev => ({ ...prev, scheduledStart: event.target.value }))}
                />
              </FormField>

              <FormField id="mock-duration" label="Duration (minutes)" required error={fieldErrors.durationMinutes}>
                <Input
                  id="mock-duration"
                  type="number"
                  min="30"
                  step="15"
                  value={formData.durationMinutes}
                  onChange={event => setFormData(prev => ({ ...prev, durationMinutes: event.target.value }))}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Common durations: 45m (Paper 1), 90m (Paper 2), 120m (Paper 3), 150m (Paper 4)
                </p>
              </FormField>

              <FormField id="mock-delivery" label="Delivery mode" required>
                <Select
                  id="mock-delivery"
                  value={formData.deliveryMode}
                  onChange={value => setFormData(prev => ({ ...prev, deliveryMode: value as any }))}
                  options={DELIVERY_MODE_OPTIONS}
                  usePortal={false}
                />
              </FormField>

              {/* Conflict Detection */}
              {conflictParams && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Schedule Conflict Check
                  </h4>
                  <ConflictDetectionPanel
                    conflicts={conflicts}
                    warnings={warnings}
                    isChecking={isChecking}
                    onCheckAgain={checkConflicts}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Teaching Team */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-purple-900 dark:text-purple-100">
                    <p className="font-medium mb-1">Teaching Team Selection</p>
                    <p>Assign lead teachers who will coordinate the mock exam. Additional invigilators can be added later.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <SearchableMultiSelect
                  label="Lead teachers"
                  options={teacherDirectory.map(teacher => ({ label: teacher.label, value: teacher.id }))}
                  selectedValues={formData.teachers}
                  onChange={values => setFormData(prev => ({ ...prev, teachers: values }))}
                  placeholder={isLoadingTeachers ? "Loading teachers..." : "Assign responsible teachers"}
                  className="green-theme"
                  usePortal={false}
                  disabled={!formData.subjectId || isLoadingTeachers}
                />
                {fieldErrors.teachers && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.teachers}
                  </p>
                )}
                {!formData.subjectId && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Subject must be selected first to filter qualified teachers
                  </p>
                )}
                {formData.subjectId && teachers.length === 0 && !isLoadingTeachers && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    No teachers found qualified for {formData.subject} in selected schools
                  </p>
                )}
              </div>

              <FormField id="mock-notes" label="Briefing notes (optional)">
                <Textarea
                  id="mock-notes"
                  rows={4}
                  placeholder="Add examiner reminders, accommodation notes, or grade boundary expectations..."
                  value={formData.notes}
                  onChange={event => setFormData(prev => ({ ...prev, notes: event.target.value }))}
                />
              </FormField>
            </div>
          )}

          {/* Step 4: Questions */}
          {currentStep === 4 && (
            <QuestionsStep
              selectedQuestions={formData.selectedQuestions}
              onQuestionsChange={(questions) => setFormData(prev => ({ ...prev, selectedQuestions: questions }))}
              subjectId={formData.subjectId}
              schoolIds={formData.schools}
              companyId={null}
            />
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-[#8CC63F]/10 border border-[#8CC63F]">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#8CC63F] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-900 dark:text-white">
                    <p className="font-medium mb-1">Ready to Create</p>
                    <p>Review all details below. You can edit any section by clicking the step indicators above.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#8CC63F]" />
                    Basic Information
                  </h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-400">Title:</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{formData.title}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-400">Subject:</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{formData.subject}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-400">Board:</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{formData.board}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-400">Paper:</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{formData.paper}</dd>
                    </div>
                  </dl>
                </div>

                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#8CC63F]" />
                    Scope & Cohort
                  </h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-400">Schools:</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{formData.schools.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-400">Year Groups:</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{formData.gradeBands.length}</dd>
                    </div>
                    {estimatedStudentCount > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600 dark:text-gray-400">Est. Students:</dt>
                        <dd className="font-medium text-[#8CC63F]">{estimatedStudentCount}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#8CC63F]" />
                    Schedule
                  </h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-400">Date & Time:</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">
                        {new Date(formData.scheduledStart).toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-400">Duration:</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{formData.durationMinutes} minutes</dd>
                    </div>
                  </dl>
                </div>

                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#8CC63F]" />
                    Teaching Team
                  </h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-400">Lead Teachers:</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{formData.teachers.length}</dd>
                    </div>
                  </dl>
                </div>

                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#8CC63F]" />
                    Questions
                  </h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-400">Total Questions:</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{formData.selectedQuestions.length}</dd>
                    </div>
                    {formData.selectedQuestions.length > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600 dark:text-gray-400">Question Range:</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">
                          Q1 - Q{formData.selectedQuestions.length}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          )}
        </MultiStepWizard>
      </div>
    </div>
  );
}
