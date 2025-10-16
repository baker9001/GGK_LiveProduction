'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus,
  X,
  GripVertical,
  Eye,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Hash,
  FileText,
  Loader2,
  AlertCircle,
  Check,
  ArrowRight,
  MoreVertical,
  Trash2,
  Star,
  XCircle,
} from 'lucide-react';
import { Button, IconButton } from './Button';
import { Input } from './FormField';
import { SearchableMultiSelect } from './SearchableMultiSelect';
import { RichTextRenderer } from './RichTextRenderer';
import { extractPlainText } from '../../utils/richText';

export interface QuestionAttachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
}

export interface SubQuestion {
  id: string;
  part_label: string;
  question_description: string;
  marks: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  type?: 'mcq' | 'tf' | 'descriptive';
  attachments?: QuestionAttachment[];
}

export interface Question {
  id: string;
  question_number: string;
  question_description: string;
  marks: number;
  type?: 'mcq' | 'tf' | 'descriptive' | 'multi_part';
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string;
  topic_id?: string;
  subtopic?: string;
  year?: string;
  parts?: SubQuestion[];
  attachments?: QuestionAttachment[];
  isOptional?: boolean;
}

export interface SelectedQuestion extends Question {
  sequence: number;
  customMarks?: number;
}

interface FilterOptions {
  topics: string[];
  years: string[];
  types: string[];
  difficulties: string[];
  subtopics: string[];
}

interface EnhancedQuestionSelectorProps {
  availableQuestions: Question[];
  selectedQuestions: SelectedQuestion[];
  onQuestionsChange: (questions: SelectedQuestion[]) => void;
  onPreviewQuestion?: (question: Question) => void;
  isLoading?: boolean;
  maxQuestions?: number;
  showCustomQuestionBuilder?: boolean;
  onCreateCustomQuestion?: () => void;
  className?: string;
}

export function EnhancedQuestionSelector({
  availableQuestions,
  selectedQuestions,
  onQuestionsChange,
  onPreviewQuestion,
  isLoading = false,
  maxQuestions,
  showCustomQuestionBuilder = false,
  onCreateCustomQuestion,
  className = '',
}: EnhancedQuestionSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    topics: [],
    years: [],
    types: [],
    difficulties: [],
    subtopics: [],
  });
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(true);

  // Get unique filter values from available questions
  const filterData = useMemo(() => {
    const topics = new Set<string>();
    const years = new Set<string>();
    const types = new Set<string>();
    const difficulties = new Set<string>();
    const subtopics = new Set<string>();

    availableQuestions.forEach((q) => {
      if (q.topic) topics.add(q.topic);
      if (q.year) years.add(q.year);
      if (q.type) types.add(q.type);
      if (q.difficulty) difficulties.add(q.difficulty);
      if (q.subtopic) subtopics.add(q.subtopic);
    });

    return {
      topics: Array.from(topics).map((t) => ({ value: t, label: t })),
      years: Array.from(years).sort().reverse().map((y) => ({ value: y, label: y })),
      types: Array.from(types).map((t) => ({ value: t, label: t.replace('_', ' ').toUpperCase() })),
      difficulties: Array.from(difficulties).map((d) => ({
        value: d,
        label: d.charAt(0).toUpperCase() + d.slice(1)
      })),
      subtopics: Array.from(subtopics).map((s) => ({ value: s, label: s })),
    };
  }, [availableQuestions]);

  // Filter available questions
  const filteredAvailableQuestions = useMemo(() => {
    let filtered = availableQuestions;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          extractPlainText(q.question_description).toLowerCase().includes(query) ||
          q.question_number?.toLowerCase().includes(query) ||
          q.topic?.toLowerCase().includes(query)
      );
    }

    if (filterOptions.topics.length > 0) {
      filtered = filtered.filter((q) => q.topic && filterOptions.topics.includes(q.topic));
    }

    if (filterOptions.years.length > 0) {
      filtered = filtered.filter((q) => q.year && filterOptions.years.includes(q.year));
    }

    if (filterOptions.types.length > 0) {
      filtered = filtered.filter((q) => q.type && filterOptions.types.includes(q.type));
    }

    if (filterOptions.difficulties.length > 0) {
      filtered = filtered.filter((q) => q.difficulty && filterOptions.difficulties.includes(q.difficulty));
    }

    if (filterOptions.subtopics.length > 0) {
      filtered = filtered.filter((q) => q.subtopic && filterOptions.subtopics.includes(q.subtopic));
    }

    const selectedIds = new Set(selectedQuestions.map((q) => q.id));
    filtered = filtered.filter((q) => !selectedIds.has(q.id));

    return filtered;
  }, [availableQuestions, searchQuery, filterOptions, selectedQuestions]);

  // Calculate totals
  const totalMarks = useMemo(() => {
    return selectedQuestions.reduce((sum, q) => sum + (q.customMarks || q.marks), 0);
  }, [selectedQuestions]);

  const totalOptionalMarks = useMemo(() => {
    return selectedQuestions
      .filter((q) => q.isOptional)
      .reduce((sum, q) => sum + (q.customMarks || q.marks), 0);
  }, [selectedQuestions]);

  // Toggle question expansion
  const toggleQuestionExpansion = useCallback((questionId: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }, []);

  // Add question handler
  const handleAddQuestion = useCallback((question: Question) => {
    if (maxQuestions && selectedQuestions.length >= maxQuestions) {
      alert(`Maximum ${maxQuestions} questions allowed`);
      return;
    }

    const newQuestion: SelectedQuestion = {
      ...question,
      sequence: selectedQuestions.length + 1,
    };

    onQuestionsChange([...selectedQuestions, newQuestion]);

    if (question.parts && question.parts.length > 0) {
      setExpandedQuestions((prev) => new Set(prev).add(question.id));
    }
  }, [maxQuestions, selectedQuestions, onQuestionsChange]);

  // Remove question handler
  const handleRemoveQuestion = useCallback((questionId: string) => {
    const filtered = selectedQuestions.filter((q) => q.id !== questionId);
    const resequenced = filtered.map((q, i) => ({ ...q, sequence: i + 1 }));
    onQuestionsChange(resequenced);
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  }, [selectedQuestions, onQuestionsChange]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  }, [draggedIndex]);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newQuestions = [...selectedQuestions];
    const [draggedQuestion] = newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(dropIndex, 0, draggedQuestion);

    const resequenced = newQuestions.map((q, i) => ({ ...q, sequence: i + 1 }));
    onQuestionsChange(resequenced);
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, selectedQuestions, onQuestionsChange]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  // Move question up/down
  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const newQuestions = [...selectedQuestions];
    [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
    const resequenced = newQuestions.map((q, i) => ({ ...q, sequence: i + 1 }));
    onQuestionsChange(resequenced);
  }, [selectedQuestions, onQuestionsChange]);

  const handleMoveDown = useCallback((index: number) => {
    if (index === selectedQuestions.length - 1) return;
    const newQuestions = [...selectedQuestions];
    [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
    const resequenced = newQuestions.map((q, i) => ({ ...q, sequence: i + 1 }));
    onQuestionsChange(resequenced);
  }, [selectedQuestions, onQuestionsChange]);

  // Toggle optional
  const handleToggleOptional = useCallback((questionId: string) => {
    const updated = selectedQuestions.map((q) =>
      q.id === questionId ? { ...q, isOptional: !q.isOptional } : q
    );
    onQuestionsChange(updated);
  }, [selectedQuestions, onQuestionsChange]);

  // Update marks
  const handleUpdateMarks = useCallback((questionId: string, marks: number) => {
    const updated = selectedQuestions.map((q) =>
      q.id === questionId ? { ...q, customMarks: marks } : q
    );
    onQuestionsChange(updated);
  }, [selectedQuestions, onQuestionsChange]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilterOptions({
      topics: [],
      years: [],
      types: [],
      difficulties: [],
      subtopics: [],
    });
    setSearchQuery('');
  }, []);

  // Bulk operations
  const handleBulkAdd = useCallback(() => {
    const questionsToAdd = filteredAvailableQuestions
      .filter((q) => selectedForBulk.has(q.id))
      .map((q, i) => ({
        ...q,
        sequence: selectedQuestions.length + i + 1,
      }));

    onQuestionsChange([...selectedQuestions, ...questionsToAdd]);
    setSelectedForBulk(new Set());
  }, [filteredAvailableQuestions, selectedForBulk, selectedQuestions, onQuestionsChange]);

  // Get difficulty color
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'medium':
        return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30';
      case 'hard':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
    }
  };

  const hasActiveFilters = searchQuery || Object.values(filterOptions).some(arr => arr.length > 0);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with Summary */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Question Selection
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedQuestions.length} selected
                {maxQuestions && ` of ${maxQuestions} max`} • {totalMarks} marks
                {totalOptionalMarks > 0 && ` (${totalOptionalMarks} optional)`}
              </p>
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-[#8CC63F] hover:text-[#7AB635] transition-colors flex items-center gap-1"
              >
                <XCircle className="w-4 h-4" />
                Clear filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showCustomQuestionBuilder && onCreateCustomQuestion && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={onCreateCustomQuestion}
              >
                Custom Question
              </Button>
            )}

            <IconButton
              variant="outline"
              size="icon-sm"
              onClick={() => setShowFilters(!showFilters)}
              aria-label="Toggle filters"
            >
              <Filter className={`w-4 h-4 ${showFilters ? 'text-[#8CC63F]' : ''}`} />
            </IconButton>
          </div>
        </div>
      </div>

      {/* Main Content - Two Panel Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-hidden">
        {/* Left Panel - Question Bank */}
        <div className="flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
              Question Bank ({filteredAvailableQuestions.length})
            </h4>
            {selectedForBulk.size > 0 && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<ArrowRight className="w-4 h-4" />}
                onClick={handleBulkAdd}
              >
                Add {selectedForBulk.size} selected
              </Button>
            )}
          </div>

          {/* Search and Filters */}
          {showFilters && (
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-gray-400" />}
              />

              <div className="grid grid-cols-2 gap-2">
                <SearchableMultiSelect
                  label=""
                  options={filterData.topics}
                  selectedValues={filterOptions.topics}
                  onChange={(values) => setFilterOptions({ ...filterOptions, topics: values })}
                  placeholder="Topic"
                  usePortal={false}
                  className="green-theme"
                />

                <SearchableMultiSelect
                  label=""
                  options={filterData.years}
                  selectedValues={filterOptions.years}
                  onChange={(values) => setFilterOptions({ ...filterOptions, years: values })}
                  placeholder="Year"
                  usePortal={false}
                  className="green-theme"
                />

                <SearchableMultiSelect
                  label=""
                  options={filterData.types}
                  selectedValues={filterOptions.types}
                  onChange={(values) => setFilterOptions({ ...filterOptions, types: values })}
                  placeholder="Question Type"
                  usePortal={false}
                  className="green-theme"
                />

                <SearchableMultiSelect
                  label=""
                  options={filterData.difficulties}
                  selectedValues={filterOptions.difficulties}
                  onChange={(values) => setFilterOptions({ ...filterOptions, difficulties: values })}
                  placeholder="Difficulty"
                  usePortal={false}
                  className="green-theme"
                />
              </div>

              {filterOptions.topics.length > 0 && filterData.subtopics.length > 0 && (
                <SearchableMultiSelect
                  label=""
                  options={filterData.subtopics}
                  selectedValues={filterOptions.subtopics}
                  onChange={(values) => setFilterOptions({ ...filterOptions, subtopics: values })}
                  placeholder="Subtopic"
                  usePortal={false}
                  className="green-theme"
                />
              )}
            </div>
          )}

          {/* Available Questions List */}
          <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-[#8CC63F] animate-spin mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Loading questions...</p>
                </div>
              ) : filteredAvailableQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <FileText className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    {hasActiveFilters ? 'No questions match your filters' : 'No questions available'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAvailableQuestions.map((question) => {
                    const isExpanded = expandedQuestions.has(question.id);
                    const hasSubQuestions = question.parts && question.parts.length > 0;

                    return (
                      <div
                        key={question.id}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {hasSubQuestions && (
                            <button
                              onClick={() => toggleQuestionExpansion(question.id)}
                              className="mt-1 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              )}
                            </button>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {question.question_number && (
                                <span className="text-sm font-medium text-[#8CC63F]">
                                  Q{question.question_number}
                                </span>
                              )}
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                {question.marks} mark{question.marks !== 1 ? 's' : ''}
                              </span>
                              {question.difficulty && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getDifficultyColor(question.difficulty)}`}>
                                  {question.difficulty}
                                </span>
                              )}
                              {hasSubQuestions && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                  {question.parts?.length} part{question.parts?.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-gray-900 dark:text-white mb-2 line-clamp-2">
                              {extractPlainText(question.question_description)}
                            </p>

                            {(question.topic || question.year) && (
                              <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
                                {question.topic && <span>• {question.topic}</span>}
                                {question.year && <span>• {question.year}</span>}
                              </div>
                            )}

                            {/* Sub-questions (expanded) */}
                            {isExpanded && hasSubQuestions && (
                              <div className="mt-3 ml-4 space-y-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                                {question.parts?.map((part) => (
                                  <div key={part.id} className="text-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-[#8CC63F]">
                                        {part.part_label}
                                      </span>
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                        {part.marks}m
                                      </span>
                                      {part.difficulty && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${getDifficultyColor(part.difficulty)}`}>
                                          {part.difficulty}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 line-clamp-2">
                                      {extractPlainText(part.question_description)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {onPreviewQuestion && (
                              <IconButton
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => onPreviewQuestion(question)}
                                aria-label="Preview question"
                              >
                                <Eye className="w-4 h-4" />
                              </IconButton>
                            )}
                            <IconButton
                              variant="outline"
                              size="icon-sm"
                              onClick={() => handleAddQuestion(question)}
                              aria-label="Add question"
                              className="text-[#8CC63F] hover:text-[#7AB635] hover:bg-[#8CC63F]/10"
                            >
                              <Plus className="w-4 h-4" />
                            </IconButton>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Selected Questions */}
        <div className="flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
              Selected Questions ({selectedQuestions.length})
            </h4>
          </div>

          {/* Selected Questions List */}
          <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {selectedQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 px-4">
                  <Hash className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    No questions selected yet
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-1">
                    Add questions from the bank to build your exam
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {selectedQuestions.map((question, index) => {
                    const isExpanded = expandedQuestions.has(question.id);
                    const hasSubQuestions = question.parts && question.parts.length > 0;

                    return (
                      <div
                        key={question.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`
                          p-4 transition-all duration-200
                          ${draggedIndex === index ? 'opacity-40 scale-95 bg-gray-100 dark:bg-gray-800' : ''}
                          ${dragOverIndex === index && draggedIndex !== index ? 'bg-[#8CC63F]/20 border-2 border-[#8CC63F] border-dashed' : 'border-2 border-transparent hover:bg-gray-50 dark:hover:bg-gray-900/40'}
                        `}
                      >
                        <div className="flex items-start gap-3">
                          {/* Reorder Controls */}
                          <div className="flex flex-col gap-1 pt-1">
                            <button
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              className={`h-6 w-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                                index === 0 ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                              }`}
                            >
                              <ChevronUp className={`w-4 h-4 ${index === 0 ? 'text-gray-300 dark:text-gray-700' : 'text-gray-600 dark:text-gray-400'}`} />
                            </button>
                            <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-600 cursor-grab active:cursor-grabbing my-1" />
                            <button
                              onClick={() => handleMoveDown(index)}
                              disabled={index === selectedQuestions.length - 1}
                              className={`h-6 w-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                                index === selectedQuestions.length - 1 ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                              }`}
                            >
                              <ChevronDown className={`w-4 h-4 ${index === selectedQuestions.length - 1 ? 'text-gray-300 dark:text-gray-700' : 'text-gray-600 dark:text-gray-400'}`} />
                            </button>
                          </div>

                          {/* Question Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-base font-semibold text-[#8CC63F]">
                                {index + 1}.
                              </span>
                              {question.question_number && (
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  (Q{question.question_number})
                                </span>
                              )}
                              {question.isOptional && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                  Optional
                                </span>
                              )}
                              {hasSubQuestions && (
                                <button
                                  onClick={() => toggleQuestionExpansion(question.id)}
                                  className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                >
                                  {isExpanded ? 'Hide' : 'Show'} {question.parts?.length} part{question.parts?.length !== 1 ? 's' : ''}
                                </button>
                              )}
                            </div>

                            <RichTextRenderer
                              value={question.question_description}
                              className="text-sm text-gray-900 dark:text-white mb-3"
                            />

                            {/* Sub-questions (expanded) */}
                            {isExpanded && hasSubQuestions && (
                              <div className="mb-3 ml-4 space-y-2 border-l-2 border-[#8CC63F]/30 pl-4">
                                {question.parts?.map((part) => (
                                  <div key={part.id} className="text-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-[#8CC63F]">
                                        {part.part_label}
                                      </span>
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                        {part.marks}m
                                      </span>
                                    </div>
                                    <RichTextRenderer
                                      value={part.question_description}
                                      className="text-gray-700 dark:text-gray-300"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Controls */}
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={question.customMarks || question.marks}
                                  onChange={(e) => handleUpdateMarks(question.id, parseInt(e.target.value) || question.marks)}
                                  className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                                <span className="text-xs text-gray-600 dark:text-gray-400">marks</span>
                              </div>

                              <button
                                onClick={() => handleToggleOptional(question.id)}
                                className={`
                                  text-xs px-2 py-1 rounded transition-colors
                                  ${question.isOptional
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                  }
                                `}
                              >
                                {question.isOptional && <Check className="w-3 h-3 inline mr-1" />}
                                Optional
                              </button>
                            </div>
                          </div>

                          {/* Remove Button */}
                          <IconButton
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleRemoveQuestion(question.id)}
                            aria-label="Remove question"
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </IconButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {selectedQuestions.length > 0 && (
            <div className="p-4 rounded-lg bg-[#8CC63F]/5 border border-[#8CC63F]/20">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900 dark:text-white">Paper Summary</span>
                <div className="text-right">
                  <div className="font-semibold text-[#8CC63F]">{totalMarks} marks total</div>
                  {totalOptionalMarks > 0 && (
                    <div className="text-xs text-amber-600 dark:text-amber-400">
                      {totalOptionalMarks} marks optional
                    </div>
                  )}
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
