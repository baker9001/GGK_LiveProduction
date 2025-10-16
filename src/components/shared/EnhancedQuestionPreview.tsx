'use client';

import React, { useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Eye,
  FileText,
  Image as ImageIcon,
  Download,
  ZoomIn,
  Check,
} from 'lucide-react';
import { Button, IconButton } from './Button';
import type { Question, SubQuestion, QuestionAttachment } from './EnhancedQuestionSelector';

interface EnhancedQuestionPreviewProps {
  question: Question;
  isOpen: boolean;
  onClose: () => void;
  onAddQuestion?: (question: Question) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
  isAdded?: boolean;
}

export function EnhancedQuestionPreview({
  question,
  isOpen,
  onClose,
  onAddQuestion,
  onNavigate,
  canNavigatePrev = false,
  canNavigateNext = false,
  isAdded = false,
}: EnhancedQuestionPreviewProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasSubQuestions = question.parts && question.parts.length > 0;
  const totalMarks = hasSubQuestions
    ? (question.parts?.reduce((sum, part) => sum + part.marks, 0) || 0)
    : question.marks;

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

  const renderAttachment = (attachment: QuestionAttachment, index: number) => {
    const isImage = attachment.file_type?.startsWith('image/');

    return (
      <div
        key={attachment.id}
        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
      >
        {isImage ? (
          <div className="relative group">
            <img
              src={attachment.file_url}
              alt={attachment.file_name}
              className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setExpandedImage(attachment.file_url)}
            />
            <button
              onClick={() => setExpandedImage(attachment.file_url)}
              className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {attachment.file_name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {attachment.file_type}
                </p>
              </div>
              <a
                href={attachment.file_url}
                download={attachment.file_name}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </a>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSubQuestion = (part: SubQuestion) => {
    return (
      <div
        key={part.id}
        className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold text-[#8CC63F]">
              {part.part_label}
            </span>
            <span className="text-sm px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              {part.marks} mark{part.marks !== 1 ? 's' : ''}
            </span>
            {part.difficulty && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${getDifficultyColor(part.difficulty)}`}>
                {part.difficulty}
              </span>
            )}
            {part.type && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                {part.type.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
            {part.question_description}
          </p>
        </div>

        {part.attachments && part.attachments.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Attachments
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {part.attachments.map((attachment, idx) => renderAttachment(attachment, idx))}
            </div>
          </div>
        )}

        {part.hint && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">Hint</p>
            <p className="text-sm text-blue-800 dark:text-blue-200">{part.hint}</p>
          </div>
        )}

        {part.explanation && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-xs font-medium text-green-900 dark:text-green-100 mb-1">Explanation</p>
            <p className="text-sm text-green-800 dark:text-green-200">{part.explanation}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 flex-1">
              {/* Navigation */}
              {onNavigate && (
                <div className="flex items-center gap-1">
                  <IconButton
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onNavigate('prev')}
                    disabled={!canNavigatePrev}
                    aria-label="Previous question"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </IconButton>
                  <IconButton
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onNavigate('next')}
                    disabled={!canNavigateNext}
                    aria-label="Next question"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </IconButton>
                </div>
              )}

              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Question Preview
                </h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {question.question_number && (
                    <span className="text-sm font-medium text-[#8CC63F]">
                      Q{question.question_number}
                    </span>
                  )}
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {totalMarks} mark{totalMarks !== 1 ? 's' : ''}
                  </span>
                  {question.topic && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {question.topic}
                    </span>
                  )}
                  {question.year && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {question.year}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onAddQuestion && !isAdded && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    onAddQuestion(question);
                    onClose();
                  }}
                >
                  Add to Selection
                </Button>
              )}
              {isAdded && (
                <div className="flex items-center gap-2 text-sm text-[#8CC63F]">
                  <Check className="w-4 h-4" />
                  <span>Added</span>
                </div>
              )}
              <IconButton
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </IconButton>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            <div className="space-y-6">
              {/* Main Question */}
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {question.difficulty && (
                    <span className={`text-sm px-2 py-1 rounded-full ${getDifficultyColor(question.difficulty)}`}>
                      {question.difficulty}
                    </span>
                  )}
                  {question.type && (
                    <span className="text-sm px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                      {question.type.replace('_', ' ').toUpperCase()}
                    </span>
                  )}
                  {hasSubQuestions && (
                    <span className="text-sm px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                      Multi-part ({question.parts?.length} parts)
                    </span>
                  )}
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-base text-gray-900 dark:text-white whitespace-pre-wrap">
                    {question.question_description}
                  </p>
                </div>

                {question.attachments && question.attachments.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Main Question Attachments
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {question.attachments.map((attachment, idx) => renderAttachment(attachment, idx))}
                    </div>
                  </div>
                )}

                {question.hint && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">Hint</p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">{question.hint}</p>
                  </div>
                )}

                {question.explanation && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-xs font-medium text-green-900 dark:text-green-100 mb-1">Explanation</p>
                    <p className="text-sm text-green-800 dark:text-green-200">{question.explanation}</p>
                  </div>
                )}
              </div>

              {/* Sub-questions */}
              {hasSubQuestions && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Question Parts
                    </h3>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      ({question.parts?.length} part{question.parts?.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="space-y-3">
                    {question.parts?.map((part) => renderSubQuestion(part))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Question Metadata
                </h3>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  {question.topic && (
                    <div>
                      <dt className="text-gray-600 dark:text-gray-400 mb-1">Topic</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{question.topic}</dd>
                    </div>
                  )}
                  {question.subtopic && (
                    <div>
                      <dt className="text-gray-600 dark:text-gray-400 mb-1">Subtopic</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{question.subtopic}</dd>
                    </div>
                  )}
                  {question.year && (
                    <div>
                      <dt className="text-gray-600 dark:text-gray-400 mb-1">Year</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{question.year}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-gray-600 dark:text-gray-400 mb-1">Total Marks</dt>
                    <dd className="font-medium text-[#8CC63F]">{totalMarks}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {onAddQuestion && !isAdded && (
              <Button
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  onAddQuestion(question);
                  onClose();
                }}
              >
                Add to Selection
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <button
            onClick={() => setExpandedImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={expandedImage}
            alt="Expanded view"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
