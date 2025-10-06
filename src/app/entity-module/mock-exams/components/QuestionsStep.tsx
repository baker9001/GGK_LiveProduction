'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  X,
  Plus,
  Eye,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  FileText,
  Globe,
  Building2,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button, IconButton } from '../../../../components/shared/Button';
import { Input } from '../../../../components/shared/FormField';
import { SearchableMultiSelect } from '../../../../components/shared/SearchableMultiSelect';
import { QuestionPreviewModal } from './QuestionPreviewModal';

export interface QuestionBankItem {
  id: string;
  question_number: number | null;
  question_description: string | null;
  marks: number | null;
  type: string | null;
  difficulty: string | null;
  scope: 'global' | 'custom';
  school_id: string | null;
  school_name: string | null;
  is_shared: boolean;
  question_bank_tag: string | null;
  year: number | null;
  topic_id: string | null;
  topic_name: string | null;
  subtopic_id: string | null;
  subtopic_name: string | null;
  subject_name: string | null;
  sub_questions_count: number;
  attachments_count: number;
  sub_questions?: Array<{
    id: string;
    description: string | null;
    marks: number | null;
    level: number;
    sub_question_number: string | null;
  }>;
}

export interface SelectedQuestion {
  id: string;
  questionId: string;
  sequence: number;
  marks: number | null;
  isOptional: boolean;
}

interface QuestionsStepProps {
  selectedQuestions: SelectedQuestion[];
  onQuestionsChange: (questions: SelectedQuestion[]) => void;
  subjectId: string | null;
  schoolIds: string[];
  companyId: string | null;
}

interface QuestionFilters {
  scope: 'all' | 'global' | 'custom';
  years: string[];
  topics: string[];
  subtopics: string[];
  types: string[];
  difficulties: string[];
  search: string;
}

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
];

const QUESTION_TYPE_OPTIONS = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'tf', label: 'True/False' },
  { value: 'descriptive', label: 'Descriptive' },
  { value: 'calculation', label: 'Calculation' }
];

const ITEMS_PER_PAGE = 20;

export function QuestionsStep({
  selectedQuestions,
  onQuestionsChange,
  subjectId,
  schoolIds,
  companyId
}: QuestionsStepProps) {
  const [filters, setFilters] = useState<QuestionFilters>({
    scope: 'all',
    years: [],
    topics: [],
    subtopics: [],
    types: [],
    difficulties: [],
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [previewQuestion, setPreviewQuestion] = useState<QuestionBankItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Mock data for development - replace with actual API call
  const questionBank: QuestionBankItem[] = useMemo(() => {
    // TODO: Fetch from API based on subjectId, schoolIds, and filters
    return [];
  }, [subjectId, schoolIds, filters]);

  // Filter question bank based on filters
  const filteredQuestions = useMemo(() => {
    let results = questionBank;

    // Scope filter
    if (filters.scope !== 'all') {
      results = results.filter(q => q.scope === filters.scope);
    }

    // Year filter
    if (filters.years.length > 0) {
      results = results.filter(q => q.year && filters.years.includes(q.year.toString()));
    }

    // Topic filter
    if (filters.topics.length > 0) {
      results = results.filter(q => q.topic_name && filters.topics.includes(q.topic_name));
    }

    // Subtopic filter
    if (filters.subtopics.length > 0) {
      results = results.filter(q => q.subtopic_name && filters.subtopics.includes(q.subtopic_name));
    }

    // Type filter
    if (filters.types.length > 0) {
      results = results.filter(q => q.type && filters.types.includes(q.type));
    }

    // Difficulty filter
    if (filters.difficulties.length > 0) {
      results = results.filter(q => q.difficulty && filters.difficulties.includes(q.difficulty));
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(q =>
        q.question_description?.toLowerCase().includes(searchLower) ||
        q.question_number?.toString().includes(searchLower)
      );
    }

    return results;
  }, [questionBank, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);
  const paginatedQuestions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredQuestions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredQuestions, currentPage]);

  // Extract available filter options from question bank
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    questionBank.forEach(q => {
      if (q.year) years.add(q.year.toString());
    });
    return Array.from(years).sort().reverse().map(year => ({ value: year, label: year }));
  }, [questionBank]);

  const availableTopics = useMemo(() => {
    const topics = new Set<string>();
    questionBank.forEach(q => {
      if (q.topic_name) topics.add(q.topic_name);
    });
    return Array.from(topics).sort().map(topic => ({ value: topic, label: topic }));
  }, [questionBank]);

  const availableSubtopics = useMemo(() => {
    const subtopics = new Set<string>();
    let questions = questionBank;

    if (filters.topics.length > 0) {
      questions = questions.filter(q => q.topic_name && filters.topics.includes(q.topic_name));
    }

    questions.forEach(q => {
      if (q.subtopic_name) subtopics.add(q.subtopic_name);
    });
    return Array.from(subtopics).sort().map(subtopic => ({ value: subtopic, label: subtopic }));
  }, [questionBank, filters.topics]);

  // Handlers
  const handleAddQuestion = useCallback((question: QuestionBankItem) => {
    if (selectedQuestions.some(sq => sq.questionId === question.id)) {
      toast.error('This question is already selected');
      return;
    }

    const maxSequence = selectedQuestions.reduce((max, q) => Math.max(max, q.sequence), 0);
    const newQuestion: SelectedQuestion = {
      id: crypto.randomUUID(),
      questionId: question.id,
      sequence: maxSequence + 1,
      marks: question.marks,
      isOptional: false
    };

    onQuestionsChange([...selectedQuestions, newQuestion]);
  }, [selectedQuestions, onQuestionsChange]);

  const handleRemoveQuestion = useCallback((index: number) => {
    const updated = selectedQuestions.filter((_, i) => i !== index);
    // Renumber sequences
    const renumbered = updated.map((q, i) => ({ ...q, sequence: i + 1 }));
    onQuestionsChange(renumbered);
  }, [selectedQuestions, onQuestionsChange]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    const updated = [...selectedQuestions];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    // Renumber sequences
    const renumbered = updated.map((q, i) => ({ ...q, sequence: i + 1 }));
    onQuestionsChange(renumbered);
  }, [selectedQuestions, onQuestionsChange]);

  const handleMoveUp = useCallback((index: number) => {
    if (index > 0) {
      handleReorder(index, index - 1);
    }
  }, [handleReorder]);

  const handleMoveDown = useCallback((index: number) => {
    if (index < selectedQuestions.length - 1) {
      handleReorder(index, index + 1);
    }
  }, [handleReorder, selectedQuestions.length]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      handleReorder(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, handleReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      scope: 'all',
      years: [],
      topics: [],
      subtopics: [],
      types: [],
      difficulties: [],
      search: ''
    });
    setCurrentPage(1);
  }, []);

  const handlePreview = useCallback((question: QuestionBankItem) => {
    setPreviewQuestion(question);
    setIsPreviewOpen(true);
  }, []);

  const hasActiveFilters = filters.scope !== 'all' || filters.years.length > 0 ||
                          filters.topics.length > 0 || filters.subtopics.length > 0 ||
                          filters.types.length > 0 || filters.difficulties.length > 0 ||
                          filters.search !== '';

  // Get question details for selected questions
  const selectedQuestionsWithDetails = useMemo(() => {
    return selectedQuestions.map(sq => {
      const question = questionBank.find(q => q.id === sq.questionId);
      return { ...sq, question };
    });
  }, [selectedQuestions, questionBank]);

  return (
    <div className="h-full flex flex-col">
      {/* Info Banner */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
              Select Questions for Your Mock Exam
            </h4>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              Choose questions from the global question bank or your school's custom questions.
              Drag and drop to reorder questions in your exam paper.
            </p>
          </div>
        </div>
      </div>

      {/* Two Panel Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Left Panel - Available Questions */}
        <div className="flex flex-col min-h-0 border border-gray-200 rounded-lg bg-white dark:border-gray-800 dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Available Questions
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
            {/* Scope Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilters(f => ({ ...f, scope: 'all' }))}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filters.scope === 'all'
                    ? 'bg-[#8CC63F] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, scope: 'global' }))}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  filters.scope === 'global'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                Global
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, scope: 'custom' }))}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  filters.scope === 'custom'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                Custom
              </button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  leftIcon={<X className="h-4 w-4" />}
                  className="ml-auto"
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search questions..."
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                className="pl-10"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 gap-3">
              <SearchableMultiSelect
                label="Year"
                options={availableYears}
                selectedValues={filters.years}
                onChange={(years) => setFilters(f => ({ ...f, years }))}
                placeholder="All years"
              />
              <SearchableMultiSelect
                label="Topic"
                options={availableTopics}
                selectedValues={filters.topics}
                onChange={(topics) => setFilters(f => ({ ...f, topics, subtopics: [] }))}
                placeholder="All topics"
              />
              <SearchableMultiSelect
                label="Sub-topic"
                options={availableSubtopics}
                selectedValues={filters.subtopics}
                onChange={(subtopics) => setFilters(f => ({ ...f, subtopics }))}
                placeholder="All subtopics"
              />
              <SearchableMultiSelect
                label="Type"
                options={QUESTION_TYPE_OPTIONS}
                selectedValues={filters.types}
                onChange={(types) => setFilters(f => ({ ...f, types }))}
                placeholder="All types"
              />
            </div>
          </div>

          {/* Question List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {paginatedQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  No questions found
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  {hasActiveFilters ? 'Try adjusting your filters' : 'No questions available for this subject'}
                </p>
              </div>
            ) : (
              paginatedQuestions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  isSelected={selectedQuestions.some(sq => sq.questionId === question.id)}
                  onAdd={() => handleAddQuestion(question)}
                  onPreview={() => handlePreview(question)}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <IconButton
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </IconButton>
                <IconButton
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </IconButton>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Selected Questions */}
        <div className="flex flex-col min-h-0 border border-gray-200 rounded-lg bg-white dark:border-gray-800 dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Selected Questions
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>

          {/* Selected Questions List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <FileText className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  No questions selected
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  Add questions from the available questions panel
                </p>
              </div>
            ) : (
              selectedQuestionsWithDetails.map((item, index) => (
                <SelectedQuestionCard
                  key={item.id}
                  item={item}
                  index={index}
                  totalCount={selectedQuestions.length}
                  isDragging={draggedIndex === index}
                  isDragOver={dragOverIndex === index}
                  onRemove={() => handleRemoveQuestion(index)}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onPreview={() => item.question && handlePreview(item.question)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <QuestionPreviewModal
        question={previewQuestion}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewQuestion(null);
        }}
      />
    </div>
  );
}

// Question Card Component
interface QuestionCardProps {
  question: QuestionBankItem;
  isSelected: boolean;
  onAdd: () => void;
  onPreview: () => void;
}

function QuestionCard({ question, isSelected, onAdd, onPreview }: QuestionCardProps) {
  const scopeBadge = question.scope === 'global' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
      <Globe className="h-3 w-3" />
      Global
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
      <Building2 className="h-3 w-3" />
      Custom
    </span>
  );

  const difficultyColor = {
    easy: 'bg-green-500',
    medium: 'bg-yellow-500',
    hard: 'bg-red-500'
  }[question.difficulty || 'medium'] || 'bg-gray-500';

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-[#8CC63F] transition-colors dark:border-gray-800 dark:hover:border-[#8CC63F]">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-white">
            Q{question.question_number || '?'}
          </span>
          {scopeBadge}
          {question.difficulty && (
            <div className={`w-2 h-2 rounded-full ${difficultyColor}`} title={question.difficulty} />
          )}
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            variant="ghost"
            size="icon-sm"
            onClick={onPreview}
            aria-label="Preview question"
          >
            <Eye className="h-4 w-4" />
          </IconButton>
          <Button
            variant="default"
            size="sm"
            onClick={onAdd}
            disabled={isSelected}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            {isSelected ? 'Added' : 'Add'}
          </Button>
        </div>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-2">
        {question.question_description || 'No description available'}
      </p>

      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        {question.marks !== null && (
          <span>{question.marks} mark{question.marks !== 1 ? 's' : ''}</span>
        )}
        {question.sub_questions_count > 0 && (
          <span>{question.sub_questions_count} part{question.sub_questions_count !== 1 ? 's' : ''}</span>
        )}
        {question.attachments_count > 0 && (
          <span>{question.attachments_count} attachment{question.attachments_count !== 1 ? 's' : ''}</span>
        )}
        {question.topic_name && (
          <span className="truncate">{question.topic_name}</span>
        )}
      </div>
    </div>
  );
}

// Selected Question Card Component
interface SelectedQuestionCardProps {
  item: SelectedQuestion & { question?: QuestionBankItem };
  index: number;
  totalCount: number;
  isDragging: boolean;
  isDragOver: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onPreview: () => void;
}

function SelectedQuestionCard({
  item,
  index,
  totalCount,
  isDragging,
  isDragOver,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onPreview
}: SelectedQuestionCardProps) {
  const { question } = item;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`border rounded-lg p-4 transition-all cursor-move ${
        isDragging
          ? 'opacity-50 scale-95 border-[#8CC63F]'
          : isDragOver
          ? 'border-2 border-[#8CC63F] border-dashed bg-[#8CC63F]/10'
          : 'border-gray-200 dark:border-gray-800'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2">
          <GripVertical className="h-5 w-5 text-gray-400 cursor-grab active:cursor-grabbing" />
          <span className="font-semibold text-lg text-[#8CC63F] min-w-[2rem]">
            {item.sequence}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
              Q{question?.question_number || '?'}: {question?.question_description || 'Question details loading...'}
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              {question && (
                <IconButton
                  variant="ghost"
                  size="icon-sm"
                  onClick={onPreview}
                  aria-label="Preview question"
                >
                  <Eye className="h-4 w-4" />
                </IconButton>
              )}
              <IconButton
                variant="ghost"
                size="icon-sm"
                onClick={onMoveUp}
                disabled={index === 0}
                aria-label="Move up"
              >
                <ChevronUp className="h-4 w-4" />
              </IconButton>
              <IconButton
                variant="ghost"
                size="icon-sm"
                onClick={onMoveDown}
                disabled={index === totalCount - 1}
                aria-label="Move down"
              >
                <ChevronDown className="h-4 w-4" />
              </IconButton>
              <IconButton
                variant="ghost"
                size="icon-sm"
                onClick={onRemove}
                aria-label="Remove question"
              >
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </div>
          </div>

          {question && (
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              {question.marks !== null && (
                <span>{question.marks} marks</span>
              )}
              {question.sub_questions_count > 0 && (
                <span>{question.sub_questions_count} parts</span>
              )}
              {question.topic_name && (
                <span className="truncate">{question.topic_name}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
