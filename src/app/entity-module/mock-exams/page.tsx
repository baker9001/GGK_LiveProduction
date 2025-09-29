'use client';

import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  Filter,
  GraduationCap,
  Layers,
  LineChart,
  Plus,
  Search,
  Sparkles,
  Users
} from 'lucide-react';
import { useUser } from '../../../contexts/UserContext';
import { useAccessControl } from '../../../hooks/useAccessControl';
import { Button } from '../../../components/shared/Button';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { FilterCard } from '../../../components/shared/FilterCard';
import { SlideInForm } from '../../../components/shared/SlideInForm';
import { FormField, Input, Select, Textarea } from '../../../components/shared/FormField';
import { ToggleSwitch } from '../../../components/shared/ToggleSwitch';
import { SearchableMultiSelect } from '../../../components/shared/SearchableMultiSelect';
import { ProgressBar } from '../../../components/shared/ProgressBar';

interface MockExamTeacher {
  id: string;
  name: string;
  role: string;
}

type MockExamStatus = 'planned' | 'scheduled' | 'completed' | 'in_review';

type MockExamMode = 'In-person' | 'Digital (exam hall)' | 'Remote proctored';

interface MockExam {
  id: string;
  title: string;
  board: string;
  program: string;
  subject: string;
  paper: string;
  gradeBands: string[];
  sections: string[];
  examWindow: string;
  scheduledStart: string;
  durationMinutes: number;
  readiness: number;
  status: MockExamStatus;
  deliveryMode: MockExamMode;
  teachers: MockExamTeacher[];
  studentCohorts: string[];
  studentCount: number;
  flaggedStudents: number;
  aiProctoringEnabled: boolean;
  releaseAnalyticsToStudents: boolean;
  allowRetakes: boolean;
  notes?: string;
}

interface FilterState {
  search: string;
  programs: string[];
  boards: string[];
  subjects: string[];
  grades: string[];
  statuses: string[];
  examWindow: string;
  teacherIds: string[];
  showOnlyFlagged: boolean;
}

interface CreateMockExamFormState {
  title: string;
  board: string;
  program: string;
  subject: string;
  paper: string;
  gradeBands: string[];
  sections: string[];
  examWindow: string;
  scheduledStart: string;
  durationMinutes: string;
  deliveryMode: MockExamMode;
  teachers: string[];
  studentCohorts: string[];
  aiProctoringEnabled: boolean;
  releaseAnalyticsToStudents: boolean;
  allowRetakes: boolean;
  notes: string;
}

type FormErrors = Partial<Record<keyof CreateMockExamFormState, string>>;

const programOptions = [
  { value: 'Cambridge IGCSE', label: 'Cambridge IGCSE' },
  { value: 'Pearson Edexcel IGCSE', label: 'Pearson Edexcel IGCSE' },
  { value: 'Cambridge O Level', label: 'Cambridge O Level' }
];

const boardOptions = [
  { value: 'Cambridge International', label: 'Cambridge International' },
  { value: 'Pearson Edexcel', label: 'Pearson Edexcel' },
  { value: 'Oxford AQA', label: 'Oxford AQA' }
];

const subjectOptions = [
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'English Language', label: 'English Language' },
  { value: 'Physics', label: 'Physics' },
  { value: 'Biology', label: 'Biology' },
  { value: 'Chemistry', label: 'Chemistry' },
  { value: 'Business Studies', label: 'Business Studies' }
];

const paperOptions = [
  { value: 'Paper 1', label: 'Paper 1' },
  { value: 'Paper 2', label: 'Paper 2' },
  { value: 'Paper 3', label: 'Paper 3' },
  { value: 'Specimen', label: 'Specimen (school authored)' }
];

const gradeOptions = [
  { value: 'Year 10', label: 'Year 10' },
  { value: 'Year 11', label: 'Year 11' },
  { value: 'Year 12', label: 'Year 12' }
];

const sectionOptions = [
  { value: '10A', label: 'Year 10 - Section A' },
  { value: '10B', label: 'Year 10 - Section B' },
  { value: '11A', label: 'Year 11 - Section A' },
  { value: '11B', label: 'Year 11 - Section B' },
  { value: '11C', label: 'Year 11 - Section C' },
  { value: '12A', label: 'Year 12 - Section A' }
];

const examWindowOptions = [
  { value: 'all', label: 'All Terms' },
  { value: 'Term 1', label: 'Term 1' },
  { value: 'Term 2', label: 'Term 2' },
  { value: 'Term 3', label: 'Term 3' },
  { value: 'Trial Exams', label: 'Trial Exams' }
];

const deliveryModeOptions: { value: MockExamMode; label: string }[] = [
  { value: 'In-person', label: 'In-person' },
  { value: 'Digital (exam hall)', label: 'Digital (exam hall)' },
  { value: 'Remote proctored', label: 'Remote proctored' }
];

const statusOptions = [
  { value: 'planned', label: 'Planned' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_review', label: 'In review' },
  { value: 'completed', label: 'Completed' }
];

const teacherDirectory = [
  { id: 't1', label: 'Anita Patel — Head of Mathematics', role: 'Head of Mathematics' },
  { id: 't2', label: 'Michael Chen — IGCSE Maths Specialist', role: 'IGCSE Maths Specialist' },
  { id: 't3', label: 'Sarah Al-Khalifa — English Faculty Lead', role: 'English Faculty Lead' },
  { id: 't4', label: 'David Njoroge — Science Coordinator', role: 'Science Coordinator' },
  { id: 't5', label: 'Laura Sánchez — Biology Teacher', role: 'Biology Teacher' }
];

const studentCohorts = [
  { id: 'year11_math', label: 'Year 11 Cambridge IGCSE Mathematics (48 students)', studentCount: 48 },
  { id: 'year11_english', label: 'Year 11 English Language (52 students)', studentCount: 52 },
  { id: 'year10_science', label: 'Year 10 Coordinated Science (44 students)', studentCount: 44 },
  { id: 'year12_business', label: 'Year 12 Business Studies (36 students)', studentCount: 36 }
];

const initialMockExams: MockExam[] = [
  {
    id: 'mock-001',
    title: 'Year 11 Mathematics Mock – Paper 2 (Extended)',
    board: 'Cambridge International',
    program: 'Cambridge IGCSE',
    subject: 'Mathematics',
    paper: 'Paper 2',
    gradeBands: ['Year 11'],
    sections: ['11A', '11B'],
    examWindow: 'Term 2',
    scheduledStart: dayjs().add(14, 'day').hour(9).minute(0).second(0).toISOString(),
    durationMinutes: 120,
    readiness: 68,
    status: 'planned',
    deliveryMode: 'In-person',
    teachers: [
      { id: 't1', name: 'Anita Patel', role: 'Head of Mathematics' },
      { id: 't2', name: 'Michael Chen', role: 'IGCSE Maths Specialist' }
    ],
    studentCohorts: ['year11_math'],
    studentCount: 48,
    flaggedStudents: 6,
    aiProctoringEnabled: false,
    releaseAnalyticsToStudents: true,
    allowRetakes: false,
    notes: 'Focus on algebraic manipulation, functions and extended paper problem solving. Diagnostic review shared with team.'
  },
  {
    id: 'mock-002',
    title: 'Year 11 English Language Mock – Paper 2',
    board: 'Cambridge International',
    program: 'Cambridge IGCSE',
    subject: 'English Language',
    paper: 'Paper 2',
    gradeBands: ['Year 11'],
    sections: ['11A', '11C'],
    examWindow: 'Term 1',
    scheduledStart: dayjs().subtract(7, 'day').hour(8).minute(30).second(0).toISOString(),
    durationMinutes: 120,
    readiness: 74,
    status: 'in_review',
    deliveryMode: 'Digital (exam hall)',
    teachers: [
      { id: 't3', name: 'Sarah Al-Khalifa', role: 'English Faculty Lead' }
    ],
    studentCohorts: ['year11_english'],
    studentCount: 52,
    flaggedStudents: 3,
    aiProctoringEnabled: true,
    releaseAnalyticsToStudents: false,
    allowRetakes: true,
    notes: 'Scripts under examiner moderation. Spoken language mock scheduled with same cohort next week.'
  },
  {
    id: 'mock-003',
    title: 'Year 10 Coordinated Science Mock – Biology & Chemistry blend',
    board: 'Pearson Edexcel',
    program: 'Pearson Edexcel IGCSE',
    subject: 'Biology',
    paper: 'Specimen',
    gradeBands: ['Year 10'],
    sections: ['10A', '10B'],
    examWindow: 'Trial Exams',
    scheduledStart: dayjs().add(32, 'day').hour(10).minute(15).second(0).toISOString(),
    durationMinutes: 135,
    readiness: 61,
    status: 'scheduled',
    deliveryMode: 'Remote proctored',
    teachers: [
      { id: 't4', name: 'David Njoroge', role: 'Science Coordinator' },
      { id: 't5', name: 'Laura Sánchez', role: 'Biology Teacher' }
    ],
    studentCohorts: ['year10_science'],
    studentCount: 44,
    flaggedStudents: 9,
    aiProctoringEnabled: true,
    releaseAnalyticsToStudents: true,
    allowRetakes: false,
    notes: 'Cross-discipline paper emphasising practical analysis. Additional intervention list shared with tutors.'
  }
];

const initialFilters: FilterState = {
  search: '',
  programs: [],
  boards: [],
  subjects: [],
  grades: [],
  statuses: [],
  examWindow: 'all',
  teacherIds: [],
  showOnlyFlagged: false
};

const initialCreateFormState: CreateMockExamFormState = {
  title: '',
  board: boardOptions[0]?.value ?? '',
  program: programOptions[0]?.value ?? '',
  subject: '',
  paper: paperOptions[0]?.value ?? '',
  gradeBands: [],
  sections: [],
  examWindow: 'Term 2',
  scheduledStart: '',
  durationMinutes: '120',
  deliveryMode: 'In-person',
  teachers: [],
  studentCohorts: [],
  aiProctoringEnabled: true,
  releaseAnalyticsToStudents: true,
  allowRetakes: false,
  notes: ''
};

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hourLabel = hours > 0 ? `${hours}h` : '';
  const minuteLabel = mins > 0 ? `${mins}m` : '';
  return `${hourLabel} ${minuteLabel}`.trim() || '—';
}

function getStatusLabel(status: MockExamStatus) {
  switch (status) {
    case 'planned':
      return 'Planned';
    case 'scheduled':
      return 'Scheduled';
    case 'in_review':
      return 'In review';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
}

export default function EntityMockExamsPage() {
  const { user } = useUser();
  const {
    isEntityAdmin,
    isSubEntityAdmin,
    isSchoolAdmin,
    isBranchAdmin,
    getUserContext
  } = useAccessControl();

  const [mockExams, setMockExams] = useState<MockExam[]>(initialMockExams);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<MockExam | null>(null);
  const [formState, setFormState] = useState<CreateMockExamFormState>(initialCreateFormState);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const cohortLookup = useMemo(() => {
    return studentCohorts.reduce<Record<string, typeof studentCohorts[number]>>((acc, cohort) => {
      acc[cohort.id] = cohort;
      return acc;
    }, {});
  }, []);

  const accessDescription = useMemo(() => {
    if (isEntityAdmin || isSubEntityAdmin) {
      return 'You can orchestrate mocks for every school and branch under your entity.';
    }

    if (isSchoolAdmin) {
      return 'You can schedule mocks for your assigned school cohorts. Coordinate with entity admins for shared papers.';
    }

    if (isBranchAdmin) {
      return 'You can view schedules and readiness insights for cohorts within your branch.';
    }

    return 'Your access is read-only. Contact your entity administrator to request additional permissions.';
  }, [isBranchAdmin, isEntityAdmin, isSchoolAdmin, isSubEntityAdmin]);

  const stats = useMemo(() => {
    const total = mockExams.length;
    const upcoming = mockExams.filter(exam => dayjs(exam.scheduledStart).isAfter(dayjs())).length;
    const flaggedStudents = mockExams.reduce((sum, exam) => sum + exam.flaggedStudents, 0);
    const aiEnabled = mockExams.filter(exam => exam.aiProctoringEnabled).length;
    const totalStudents = mockExams.reduce((sum, exam) => sum + exam.studentCount, 0);
    const averageReadiness = total
      ? Math.round(mockExams.reduce((sum, exam) => sum + exam.readiness, 0) / total)
      : 0;

    return {
      total,
      upcoming,
      flaggedStudents,
      aiEnabled,
      totalStudents,
      averageReadiness
    };
  }, [mockExams]);

  const filteredExams = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();

    return mockExams.filter(exam => {
      if (searchTerm) {
        const composite = [
          exam.title,
          exam.subject,
          exam.program,
          exam.board,
          exam.paper,
          ...exam.gradeBands,
          ...exam.sections,
          ...exam.teachers.map(teacher => teacher.name)
        ]
          .join(' ')
          .toLowerCase();

        if (!composite.includes(searchTerm)) {
          return false;
        }
      }

      if (filters.programs.length && !filters.programs.includes(exam.program)) {
        return false;
      }

      if (filters.boards.length && !filters.boards.includes(exam.board)) {
        return false;
      }

      if (filters.subjects.length && !filters.subjects.includes(exam.subject)) {
        return false;
      }

      if (filters.grades.length && !exam.gradeBands.some(grade => filters.grades.includes(grade))) {
        return false;
      }

      if (filters.statuses.length && !filters.statuses.includes(exam.status)) {
        return false;
      }

      if (filters.examWindow !== 'all' && exam.examWindow !== filters.examWindow) {
        return false;
      }

      if (filters.teacherIds.length && !exam.teachers.some(teacher => filters.teacherIds.includes(teacher.id))) {
        return false;
      }

      if (filters.showOnlyFlagged && exam.flaggedStudents === 0) {
        return false;
      }

      return true;
    });
  }, [filters, mockExams]);

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    if (!formState.title.trim()) {
      nextErrors.title = 'Add a descriptive mock exam title.';
    }

    if (!formState.subject) {
      nextErrors.subject = 'Select the subject that the mock aligns with.';
    }

    if (formState.gradeBands.length === 0) {
      nextErrors.gradeBands = 'Select at least one grade or year group.';
    }

    if (formState.scheduledStart.trim() === '') {
      nextErrors.scheduledStart = 'Provide a scheduled date and time.';
    }

    if (formState.teachers.length === 0) {
      nextErrors.teachers = 'Nominate at least one lead teacher.';
    }

    if (formState.studentCohorts.length === 0) {
      nextErrors.studentCohorts = 'Select the cohort(s) who will sit this mock.';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetFormState = () => {
    setFormState(initialCreateFormState);
    setFormErrors({});
  };

  const handleCreateMockExam = () => {
    if (!validateForm()) {
      return;
    }

    const totalStudents = formState.studentCohorts.reduce((sum, cohortId) => {
      return sum + (cohortLookup[cohortId]?.studentCount ?? 0);
    }, 0);

    const teacherEntries: MockExamTeacher[] = formState.teachers.map(teacherId => {
      const teacherInfo = teacherDirectory.find(item => item.id === teacherId);
      return {
        id: teacherId,
        name: teacherInfo?.label?.split(' — ')[0] ?? teacherId,
        role: teacherInfo?.role ?? 'Teacher'
      };
    });

    const newExam: MockExam = {
      id: crypto.randomUUID(),
      title: formState.title.trim(),
      board: formState.board,
      program: formState.program,
      subject: formState.subject,
      paper: formState.paper,
      gradeBands: formState.gradeBands,
      sections: formState.sections,
      examWindow: formState.examWindow,
      scheduledStart: new Date(formState.scheduledStart).toISOString(),
      durationMinutes: Number.parseInt(formState.durationMinutes, 10) || 120,
      readiness: 55,
      status: 'planned',
      deliveryMode: formState.deliveryMode,
      teachers: teacherEntries,
      studentCohorts: formState.studentCohorts,
      studentCount: totalStudents,
      flaggedStudents: 0,
      aiProctoringEnabled: formState.aiProctoringEnabled,
      releaseAnalyticsToStudents: formState.releaseAnalyticsToStudents,
      allowRetakes: formState.allowRetakes,
      notes: formState.notes.trim() || undefined
    };

    setMockExams(prev => [newExam, ...prev]);
    setIsCreatePanelOpen(false);
    resetFormState();
  };

  const userContext = getUserContext();

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8CC63F]/20 to-[#7AB635]/20 flex items-center justify-center">
              <ClipboardList className="w-8 h-8 text-[#8CC63F]" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mock exam orchestration</h1>
              <p className="text-gray-600 dark:text-gray-300 max-w-3xl">
                Build a Cambridge-style mock calendar that mirrors real exam pressure. Align each paper to the correct grade bands, brief staff teams, and surface readiness gaps before the actual session.
              </p>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1 text-[#8CC63F] font-medium">
                  <Sparkles className="w-4 h-4" />
                  IGCSE best practice ready
                </span>
                <span>•</span>
                <span>{accessDescription}</span>
              </div>
              {userContext?.assignedSchools && userContext.assignedSchools.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-semibold text-gray-700 dark:text-gray-200">Focus schools:</span>
                  {userContext.assignedSchools.map((school: string) => (
                    <span key={school} className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                      {school}
                    </span>
                  ))}
                </div>
              )}
              {user?.name && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Coordinated by <span className="font-medium text-gray-700 dark:text-gray-200">{user.name}</span> · Role: {user.role.split('_').map(part => part.charAt(0) + part.slice(1).toLowerCase()).join(' ')}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => {
                console.info('[Mock Exams] Export plan clicked');
              }}
            >
              Export schedule
            </Button>
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsCreatePanelOpen(true)}
            >
              Create mock exam
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <CalendarDays className="w-4 h-4 text-[#8CC63F]" />
            Upcoming mocks
          </div>
          <div className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.upcoming}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {stats.total} total mock{stats.total === 1 ? '' : 's'} across the entity
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <Users className="w-4 h-4 text-[#8CC63F]" />
            Learners impacted
          </div>
          <div className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.totalStudents}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {stats.flaggedStudents} flagged for intervention support
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <LineChart className="w-4 h-4 text-[#8CC63F]" />
            Readiness average
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.averageReadiness}%</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 pb-1">entity-wide</span>
          </div>
          <ProgressBar value={stats.averageReadiness} />
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <Sparkles className="w-4 h-4 text-[#8CC63F]" />
            Digital oversight
          </div>
          <div className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.aiEnabled}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Mocks with AI proctoring or live analytics enabled
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 min-w-[240px]">
            <FormField id="mock-search" label="Quick search" className="mb-0">
              <Input
                id="mock-search"
                placeholder="Search by exam title, subject, teacher or section"
                value={filters.search}
                onChange={event => setFilters(prev => ({ ...prev, search: event.target.value }))}
                leftIcon={<Search className="w-4 h-4 text-gray-400" />}
              />
            </FormField>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              <BarChart3 className="w-4 h-4 text-[#8CC63F]" />
              {filteredExams.length} shown
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              <BookOpen className="w-4 h-4 text-[#8CC63F]" />
              {new Set(filteredExams.flatMap(exam => exam.subject)).size} subjects
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              <GraduationCap className="w-4 h-4 text-[#8CC63F]" />
              {new Set(filteredExams.flatMap(exam => exam.gradeBands)).size} year groups
            </div>
          </div>
        </div>

        <FilterCard
          title="Advanced filters"
          onApply={() => undefined}
          onClear={() => setFilters(initialFilters)}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <SearchableMultiSelect
              label="Program"
              options={programOptions.map(option => ({ label: option.label, value: option.value }))}
              selectedValues={filters.programs}
              onChange={values => setFilters(prev => ({ ...prev, programs: values }))}
              placeholder="Select programme"
              className="green-theme"
              usePortal={false}
            />
            <SearchableMultiSelect
              label="Exam board"
              options={boardOptions.map(option => ({ label: option.label, value: option.value }))}
              selectedValues={filters.boards}
              onChange={values => setFilters(prev => ({ ...prev, boards: values }))}
              placeholder="Filter by board"
              className="green-theme"
              usePortal={false}
            />
            <SearchableMultiSelect
              label="Subject"
              options={subjectOptions.map(option => ({ label: option.label, value: option.value }))}
              selectedValues={filters.subjects}
              onChange={values => setFilters(prev => ({ ...prev, subjects: values }))}
              placeholder="Filter by subject"
              className="green-theme"
              usePortal={false}
            />
            <SearchableMultiSelect
              label="Year groups"
              options={gradeOptions.map(option => ({ label: option.label, value: option.value }))}
              selectedValues={filters.grades}
              onChange={values => setFilters(prev => ({ ...prev, grades: values }))}
              placeholder="Select year groups"
              className="green-theme"
              usePortal={false}
            />
            <SearchableMultiSelect
              label="Lead teachers"
              options={teacherDirectory.map(teacher => ({ label: teacher.label, value: teacher.id }))}
              selectedValues={filters.teacherIds}
              onChange={values => setFilters(prev => ({ ...prev, teacherIds: values }))}
              placeholder="Filter by teacher"
              className="green-theme"
              usePortal={false}
            />
            <SearchableMultiSelect
              label="Status"
              options={statusOptions.map(option => ({ label: option.label, value: option.value }))}
              selectedValues={filters.statuses}
              onChange={values => setFilters(prev => ({ ...prev, statuses: values as MockExamStatus[] }))}
              placeholder="Filter by status"
              className="green-theme"
              usePortal={false}
            />
            <FormField id="exam-window" label="Term / window" className="mb-0">
              <Select
                id="exam-window"
                value={filters.examWindow}
                onChange={value => setFilters(prev => ({ ...prev, examWindow: value }))}
                options={examWindowOptions}
                usePortal={false}
              />
            </FormField>
            <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Flagged learners</div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Show mocks where interventions are required</p>
              </div>
              <ToggleSwitch
                checked={filters.showOnlyFlagged}
                onChange={checked => setFilters(prev => ({ ...prev, showOnlyFlagged: checked }))}
                size="sm"
              />
            </div>
          </div>
        </FilterCard>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mock exam plan</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track coverage, staffing, and learner impact before releasing timetable notices to families.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Always align Cambridge paper durations and calculator rules with the official handbook.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th scope="col" className="px-6 py-3">Mock exam</th>
                <th scope="col" className="px-6 py-3">Programme &amp; board</th>
                <th scope="col" className="px-6 py-3">Year groups</th>
                <th scope="col" className="px-6 py-3">Teaching team</th>
                <th scope="col" className="px-6 py-3">Learner impact</th>
                <th scope="col" className="px-6 py-3">Schedule</th>
                <th scope="col" className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredExams.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    No mock exams match the current filters. Adjust filters or create a new mock.
                  </td>
                </tr>
              )}

              {filteredExams.map(exam => {
                const sectionsSummary = exam.sections.length > 0
                  ? exam.sections.join(', ')
                  : 'All sections';

                return (
                  <tr key={exam.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">{exam.title}</span>
                          <StatusBadge status={getStatusLabel(exam.status).toLowerCase()} size="xs" />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Layers className="w-4 h-4" />
                          <span>{exam.paper}</span>
                          <span>•</span>
                          <span>{exam.deliveryMode}</span>
                        </div>
                        {exam.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{exam.notes}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        <div className="font-medium">{exam.program}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{exam.board}</div>
                        <div className="inline-flex items-center gap-1 text-xs text-[#8CC63F]">
                          <BookOpen className="w-3.5 h-3.5" />
                          {exam.subject}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {exam.gradeBands.map(grade => (
                            <span key={grade} className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#8CC63F]/10 text-[#7AB635] text-xs font-medium">
                              {grade}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{sectionsSummary}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        {exam.teachers.slice(0, 2).map(teacher => (
                          <div key={teacher.id} className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#8CC63F]" />
                            <div>
                              <div className="font-medium">{teacher.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{teacher.role}</div>
                            </div>
                          </div>
                        ))}
                        {exam.teachers.length > 2 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            +{exam.teachers.length - 2} additional teacher{exam.teachers.length - 2 === 1 ? '' : 's'}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#8CC63F]" />
                          <span>{exam.studentCount} students</span>
                        </div>
                        <ProgressBar value={exam.readiness} size="sm" showLabel labelFormat={(value) => `${value}% readiness`} />
                        <div className="text-xs text-amber-600 dark:text-amber-400">
                          {exam.flaggedStudents} flagged for mentoring
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        <div className="font-medium">
                          {dayjs(exam.scheduledStart).format('DD MMM YYYY, HH:mm')}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Duration: {formatDuration(exam.durationMinutes)}
                        </div>
                        <div className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {exam.examWindow}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top text-right">
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Filter className="w-3.5 h-3.5" />}
                          onClick={() => setSelectedExam(exam)}
                        >
                          View detail
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Download className="w-3.5 h-3.5" />}
                          onClick={() => {
                            console.info('[Mock Exams] Download briefing for', exam.id);
                          }}
                        >
                          Briefing pack
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#8CC63F]/10 via-white to-[#7AB635]/10 dark:from-[#8CC63F]/10 dark:via-gray-900 dark:to-[#7AB635]/10 border border-[#8CC63F]/20 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">IGCSE consultant tips</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Sequence mocks to mirror the real exam timetable, then release analytics to tutors within 24 hours. Pair each mock with targeted small-group interventions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-[#8CC63F]/30">
              <Sparkles className="w-4 h-4 text-[#8CC63F]" />
              Share examiner-style feedback templates with teachers.
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-[#8CC63F]/30">
              <Users className="w-4 h-4 text-[#8CC63F]" />
              Cross-check SEN access arrangements per cohort.
            </div>
          </div>
        </div>
      </div>

      <SlideInForm
        title="Create mock exam"
        isOpen={isCreatePanelOpen}
        onClose={() => {
          setIsCreatePanelOpen(false);
          resetFormState();
        }}
        onSave={handleCreateMockExam}
        saveButtonText="Add to plan"
        footerContent={(
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={() => console.info('[Mock Exams] Preview timetable placeholder')}
          >
            Preview timetable
          </Button>
        )}
        width="xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <FormField id="mock-title" label="Mock exam title" required error={formErrors.title}>
              <Input
                id="mock-title"
                placeholder="E.g. Year 11 Mathematics Mock – Paper 4 (Extended)"
                value={formState.title}
                onChange={event => setFormState(prev => ({ ...prev, title: event.target.value }))}
              />
            </FormField>
            <FormField id="mock-program" label="Programme" required>
              <Select
                id="mock-program"
                value={formState.program}
                onChange={value => setFormState(prev => ({ ...prev, program: value }))}
                options={programOptions}
                usePortal={false}
              />
            </FormField>
            <FormField id="mock-board" label="Exam board" required>
              <Select
                id="mock-board"
                value={formState.board}
                onChange={value => setFormState(prev => ({ ...prev, board: value }))}
                options={boardOptions}
                usePortal={false}
              />
            </FormField>
            <FormField id="mock-subject" label="Subject" required error={formErrors.subject}>
              <Select
                id="mock-subject"
                value={formState.subject}
                onChange={value => setFormState(prev => ({ ...prev, subject: value }))}
                options={subjectOptions}
                usePortal={false}
              />
            </FormField>
            <FormField id="mock-paper" label="Paper" required>
              <Select
                id="mock-paper"
                value={formState.paper}
                onChange={value => setFormState(prev => ({ ...prev, paper: value }))}
                options={paperOptions}
                usePortal={false}
              />
            </FormField>
            <SearchableMultiSelect
              label="Year groups"
              options={gradeOptions.map(option => ({ label: option.label, value: option.value }))}
              selectedValues={formState.gradeBands}
              onChange={values => setFormState(prev => ({ ...prev, gradeBands: values }))}
              placeholder="Select year groups"
              className="green-theme"
              usePortal={false}
            />
            {formErrors.gradeBands && (
              <p className="text-xs text-red-500">{formErrors.gradeBands}</p>
            )}
            <SearchableMultiSelect
              label="Class sections"
              options={sectionOptions.map(option => ({ label: option.label, value: option.value }))}
              selectedValues={formState.sections}
              onChange={values => setFormState(prev => ({ ...prev, sections: values }))}
              placeholder="Optional — choose sections"
              className="green-theme"
              usePortal={false}
            />
            <FormField id="mock-window" label="Term / window" required>
              <Select
                id="mock-window"
                value={formState.examWindow}
                onChange={value => setFormState(prev => ({ ...prev, examWindow: value }))}
                options={examWindowOptions.filter(option => option.value !== 'all')}
                usePortal={false}
              />
            </FormField>
          </div>
          <div className="space-y-6">
            <FormField id="mock-datetime" label="Scheduled date & time" required error={formErrors.scheduledStart}>
              <Input
                id="mock-datetime"
                type="datetime-local"
                value={formState.scheduledStart}
                onChange={event => setFormState(prev => ({ ...prev, scheduledStart: event.target.value }))}
              />
            </FormField>
            <FormField id="mock-duration" label="Duration (minutes)" required>
              <Input
                id="mock-duration"
                type="number"
                min="45"
                step="15"
                value={formState.durationMinutes}
                onChange={event => setFormState(prev => ({ ...prev, durationMinutes: event.target.value }))}
              />
            </FormField>
            <FormField id="mock-delivery" label="Delivery mode" required>
              <Select
                id="mock-delivery"
                value={formState.deliveryMode}
                onChange={value => setFormState(prev => ({ ...prev, deliveryMode: value as MockExamMode }))}
                options={deliveryModeOptions}
                usePortal={false}
              />
            </FormField>
            <SearchableMultiSelect
              label="Lead teachers"
              options={teacherDirectory.map(teacher => ({ label: teacher.label, value: teacher.id }))}
              selectedValues={formState.teachers}
              onChange={values => setFormState(prev => ({ ...prev, teachers: values }))}
              placeholder="Assign responsible teachers"
              className="green-theme"
              usePortal={false}
            />
            {formErrors.teachers && (
              <p className="text-xs text-red-500">{formErrors.teachers}</p>
            )}
            <SearchableMultiSelect
              label="Learner cohorts"
              options={studentCohorts.map(cohort => ({ label: cohort.label, value: cohort.id }))}
              selectedValues={formState.studentCohorts}
              onChange={values => setFormState(prev => ({ ...prev, studentCohorts: values }))}
              placeholder="Select cohorts impacted"
              className="green-theme"
              usePortal={false}
            />
            {formErrors.studentCohorts && (
              <p className="text-xs text-red-500">{formErrors.studentCohorts}</p>
            )}
            <div className="space-y-4">
              <ToggleSwitch
                checked={formState.aiProctoringEnabled}
                onChange={checked => setFormState(prev => ({ ...prev, aiProctoringEnabled: checked }))}
                label="Enable AI proctoring"
                description="Recommended for digital mocks or remote sittings. Provides live malpractice alerts."
              />
              <ToggleSwitch
                checked={formState.releaseAnalyticsToStudents}
                onChange={checked => setFormState(prev => ({ ...prev, releaseAnalyticsToStudents: checked }))}
                label="Release analytics to learners"
                description="Share examiner-style feedback and mark schemes instantly after moderation."
              />
              <ToggleSwitch
                checked={formState.allowRetakes}
                onChange={checked => setFormState(prev => ({ ...prev, allowRetakes: checked }))}
                label="Allow supervised retakes"
                description="Enable for targeted catch-up groups after first sitting."
              />
            </div>
            <FormField id="mock-notes" label="Briefing notes">
              <Textarea
                id="mock-notes"
                rows={4}
                placeholder="Add any examiner reminders, accommodation notes, or grade boundary expectations."
                value={formState.notes}
                onChange={event => setFormState(prev => ({ ...prev, notes: event.target.value }))}
              />
            </FormField>
          </div>
        </div>
        <div className="mt-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300">
          Once created, share the briefing pack with assigned teachers and confirm invigilation on the organisation calendar.
        </div>
      </SlideInForm>

      <SlideInForm
        title={selectedExam ? selectedExam.title : 'Mock exam detail'}
        isOpen={Boolean(selectedExam)}
        onClose={() => setSelectedExam(null)}
        onSave={() => setSelectedExam(null)}
        saveButtonText="Close"
        footerContent={selectedExam ? (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={() => console.info('[Mock Exams] Download analytics for', selectedExam.id)}
          >
            Export analytics
          </Button>
        ) : undefined}
        width="xl"
      >
        {selectedExam && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Programme overview</h4>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#8CC63F]" />
                    {selectedExam.subject}
                  </div>
                  <div>{selectedExam.program}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{selectedExam.board}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Paper: {selectedExam.paper}</div>
                </div>
              </div>
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Schedule</h4>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <div>{dayjs(selectedExam.scheduledStart).format('dddd, DD MMM YYYY')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {dayjs(selectedExam.scheduledStart).format('HH:mm')} • {formatDuration(selectedExam.durationMinutes)} • {selectedExam.deliveryMode}
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {selectedExam.examWindow}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Teaching team</h4>
                <div className="space-y-3">
                  {selectedExam.teachers.map(teacher => (
                    <div key={teacher.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-[#8CC63F] mt-1" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{teacher.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{teacher.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Learner readiness</h4>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Students sitting</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{selectedExam.studentCount}</span>
                  </div>
                  <ProgressBar value={selectedExam.readiness} />
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    {selectedExam.flaggedStudents} students flagged for intervention across cohorts {selectedExam.studentCohorts.map(cohortId => cohortLookup[cohortId]?.label.split('(')[0]?.trim()).join(', ')}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Analytics shared with learners: {selectedExam.releaseAnalyticsToStudents ? 'Yes' : 'No'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    AI proctoring enabled: {selectedExam.aiProctoringEnabled ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
            </div>

            {selectedExam.notes && (
              <div className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Briefing notes</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">{selectedExam.notes}</p>
              </div>
            )}
          </div>
        )}
      </SlideInForm>
    </div>
  );
}
