'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  X,
  GripVertical,
  Eye,
  Search,
  Filter,
  FileText,
  Hash,
  AlertCircle,
  Check,
  Star,
  Loader2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Button, IconButton } from './Button';
import { FormField, Input, Select } from './FormField';
import { SearchableMultiSelect } from './SearchableMultiSelect';

export interface Question {
  id: string;
  questionNumber?: number;
  questionText: string;
  description?: string;
  marks: number;
  type?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string;
  subtopic?: string;
  year?: string;
  isOptional?: boolean;
}

export interface SelectedQuestion extends Question {
  sequence: number;
  customMarks?: number;
}

interface QuestionSelectorProps {
  availableQuestions: Question[];
  selectedQuestions: SelectedQuestion[];
  onQuestionsChange: (questions: SelectedQuestion[]) => void;
  onPreviewQuestion?: (questionId: string) => void;
  isLoading?: boolean;
  maxQuestions?: number;
  showCustomQuestionBuilder?: boolean;
  onCreateCustomQuestion?: () => void;
  className?: string;
}

export function QuestionSelector({
  availableQuestions,
  selectedQuestions,
  onQuestionsChange,
  onPreviewQuestion,
  isLoading = false,
  maxQuestions,
  showCustomQuestionBuilder = false,
  onCreateCustomQuestion,
  className = '',
}: QuestionSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTopic, setFilterTopic] = useState<string[]>([]);
  const [filterYear, setFilterYear] = useState<string[]>([]);
  const [filterDifficulty, setFilterDifficulty] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Calculate totals
  const totalMarks = useMemo(() => {
    return selectedQuestions.reduce((sum, q) => sum + (q.customMarks || q.marks), 0);
  }, [selectedQuestions]);

  const totalOptionalMarks = useMemo(() => {
    return selectedQuestions
      .filter((q) => q.isOptional)
      .reduce((sum, q) => sum + (q.customMarks || q.marks), 0);
  }, [selectedQuestions]);

  // Get unique topics and years for filters
  const uniqueTopics = useMemo(() => {
    const topics = new Set(availableQuestions.map((q) => q.topic).filter(Boolean));
    return Array.from(topics).map((t) => ({ value: t as string, label: t as string }));
  }, [availableQuestions]);

  const uniqueYears = useMemo(() => {
    const years = new Set(availableQuestions.map((q) => q.year).filter(Boolean));
    return Array.from(years)
      .sort()
      .reverse()
      .map((y) => ({ value: y as string, label: y as string }));
  }, [availableQuestions]);

  // Filter available questions
  const filteredAvailableQuestions = useMemo(() => {
    let filtered = availableQuestions;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.questionText.toLowerCase().includes(query) ||
          q.description?.toLowerCase().includes(query) ||
          q.questionNumber?.toString().includes(query)
      );
    }

    if (filterTopic.length > 0) {
      filtered = filtered.filter((q) => q.topic && filterTopic.includes(q.topic));
    }

    if (filterYear.length > 0) {
      filtered = filtered.filter((q) => q.year && filterYear.includes(q.year));
    }

    if (filterDifficulty.length > 0) {
      filtered = filtered.filter((q) => q.difficulty && filterDifficulty.includes(q.difficulty));
    }

    // Exclude already selected questions
    const selectedIds = new Set(selectedQuestions.map((q) => q.id));
    filtered = filtered.filter((q) => !selectedIds.has(q.id));

    return filtered;
  }, [availableQuestions, searchQuery, filterTopic, filterYear, filterDifficulty, selectedQuestions]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if we're leaving the container, not just moving between children
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
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

    // Update sequences
    const resequenced = newQuestions.map((q, i) => ({
      ...q,
      sequence: i + 1,
    }));

    onQuestionsChange(resequenced);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleAddQuestion = (question: Question) => {
    if (maxQuestions && selectedQuestions.length >= maxQuestions) {
      alert(`Maximum ${maxQuestions} questions allowed`);
      return;
    }

    const newQuestion: SelectedQuestion = {
      ...question,
      sequence: selectedQuestions.length + 1,
    };

    onQuestionsChange([...selectedQuestions, newQuestion]);
  };

  const handleRemoveQuestion = (questionId: string) => {
    const filtered = selectedQuestions.filter((q) => q.id !== questionId);
    // Resequence
    const resequenced = filtered.map((q, i) => ({
      ...q,
      sequence: i + 1,
    }));
    onQuestionsChange(resequenced);
  };

  const handleToggleOptional = (questionId: string) => {
    const updated = selectedQuestions.map((q) =>
      q.id === questionId ? { ...q, isOptional: !q.isOptional } : q
    );
    onQuestionsChange(updated);
  };

  const handleUpdateMarks = (questionId: string, marks: number) => {
    const updated = selectedQuestions.map((q) =>
      q.id === questionId ? { ...q, customMarks: marks } : q
    );
    onQuestionsChange(updated);
  };

  const handleMoveUp = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (index === 0) return;

    const newQuestions = [...selectedQuestions];
    [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];

    const resequenced = newQuestions.map((q, i) => ({
      ...q,
      sequence: i + 1,
    }));

    onQuestionsChange(resequenced);
  };

  const handleMoveDown = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (index === selectedQuestions.length - 1) return;

    const newQuestions = [...selectedQuestions];
    [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];

    const resequenced = newQuestions.map((q, i) => ({
      ...q,
      sequence: i + 1,
    }));

    onQuestionsChange(resequenced);
  };

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

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      {/* Available Questions Panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Question Bank</h3>
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
        </div>

        {/* Search and filters */}
        <div className="space-y-3">
          <Input
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-gray-400" />}
          />

          <div className="grid grid-cols-2 gap-2">
            <SearchableMultiSelect
              label=""
              options={uniqueTopics}
              selectedValues={filterTopic}
              onChange={setFilterTopic}
              placeholder="Filter by topic"
              usePortal={false}
              className="green-theme"
            />

            <SearchableMultiSelect
              label=""
              options={uniqueYears}
              selectedValues={filterYear}
              onChange={setFilterYear}
              placeholder="Filter by year"
              usePortal={false}
              className="green-theme"
            />
          </div>

          {(filterTopic.length > 0 || filterYear.length > 0 || filterDifficulty.length > 0) && (
            <button
              onClick={() => {
                setFilterTopic([]);
                setFilterYear([]);
                setFilterDifficulty([]);
              }}
              className="text-sm text-[#8CC63F] hover:text-[#7AB635] transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Available questions list */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#8CC63F] animate-spin mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Loading questions...</p>
              </div>
            ) : filteredAvailableQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <FileText className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  {searchQuery || filterTopic.length > 0 || filterYear.length > 0
                    ? 'No questions match your filters'
                    : 'No questions available'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAvailableQuestions.map((question) => (
                  <div
                    key={question.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {question.questionNumber && (
                            <span className="text-sm font-medium text-[#8CC63F]">
                              Q{question.questionNumber}
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
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {question.questionText}
                        </p>
                        {(question.topic || question.year) && (
                          <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
                            {question.topic && <span>• {question.topic}</span>}
                            {question.year && <span>• {question.year}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {onPreviewQuestion && (
                          <IconButton
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onPreviewQuestion(question.id)}
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
                        >
                          <Plus className="w-4 h-4" />
                        </IconButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Questions Panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Selected Questions ({selectedQuestions.length}
              {maxQuestions && `/${maxQuestions}`})
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total: {totalMarks} marks
              {totalOptionalMarks > 0 && ` (${totalOptionalMarks} optional)`}
            </p>
          </div>
        </div>

        {/* Selected questions list with drag-and-drop */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {selectedQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Hash className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  No questions selected yet
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-1">
                  Add questions from the bank or create custom questions
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {selectedQuestions.map((question, index) => (
                  <div
                    key={question.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`
                      p-4 transition-all duration-200 cursor-move
                      ${draggedIndex === index ? 'opacity-40 scale-95 bg-gray-100 dark:bg-gray-800' : ''}
                      ${dragOverIndex === index && draggedIndex !== index ? 'bg-[#8CC63F]/20 border-2 border-[#8CC63F] border-dashed' : 'border-2 border-transparent hover:bg-gray-50 dark:hover:bg-gray-900/40'}
                    `}
                    style={{
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      MozUserSelect: 'none',
                      msUserSelect: 'none'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1 pt-1">
                        <button
                          onClick={(e) => handleMoveUp(e, index)}
                          disabled={index === 0}
                          aria-label="Move up"
                          className={`h-6 w-6 p-0 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                            index === 0 ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                          }`}
                          type="button"
                        >
                          <ChevronUp className={`w-4 h-4 ${index === 0 ? 'text-gray-300 dark:text-gray-700' : 'text-gray-600 dark:text-gray-400 hover:text-[#8CC63F]'}`} />
                        </button>
                        <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-600 cursor-grab active:cursor-grabbing my-1" />
                        <button
                          onClick={(e) => handleMoveDown(e, index)}
                          disabled={index === selectedQuestions.length - 1}
                          aria-label="Move down"
                          className={`h-6 w-6 p-0 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                            index === selectedQuestions.length - 1 ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                          }`}
                          type="button"
                        >
                          <ChevronDown className={`w-4 h-4 ${index === selectedQuestions.length - 1 ? 'text-gray-300 dark:text-gray-700' : 'text-gray-600 dark:text-gray-400 hover:text-[#8CC63F]'}`} />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-[#8CC63F]">
                            {index + 1}.
                          </span>
                          {question.isOptional && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                              Optional
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-900 dark:text-white mb-2">
                          {question.questionText}
                        </p>

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

                          <button
                            onClick={() => handleToggleOptional(question.id)}
                            className={`
                              ml-2 text-xs px-2 py-1 rounded transition-colors
                              ${question.isOptional
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                              }
                            `}
                          >
                            {question.isOptional ? <Check className="w-3 h-3 inline" /> : null}{' '}
                            Optional
                          </button>
                        </div>
                      </div>

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
                ))}
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
