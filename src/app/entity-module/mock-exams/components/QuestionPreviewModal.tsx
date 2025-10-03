'use client';

import React from 'react';
import { X, FileText, Tag, Calendar, BookOpen, Eye, AlertCircle } from 'lucide-react';
import { Button, IconButton } from '../../../../components/shared/Button';
import type { QuestionBankItem } from '../../../../services/mockExamService';

interface QuestionPreviewModalProps {
  question: QuestionBankItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuestionPreviewModal({ question, isOpen, onClose }: QuestionPreviewModalProps) {
  if (!isOpen || !question) return null;

  const renderOptions = () => {
    if (!question.options || question.options.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Answer Options</h4>
        <div className="space-y-2">
          {question.options.map((option, index) => (
            <div
              key={index}
              className={`rounded-lg border p-3 ${
                option.is_correct
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  {String.fromCharCode(65 + index)}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-gray-100">{option.option_text}</p>
                  {option.is_correct && (
                    <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">Correct Answer</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAttachments = () => {
    if (!question.attachments || question.attachments.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Attachments</h4>
        <div className="space-y-2">
          {question.attachments.map((attachment, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
            >
              <FileText className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{attachment.filename}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {attachment.type} {attachment.size ? `• ${attachment.size}` : ''}
                </p>
              </div>
              {attachment.url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(attachment.url, '_blank')}
                  leftIcon={<Eye className="h-4 w-4" />}
                >
                  View
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4 py-6 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900 my-6">
        <div className="flex items-start justify-between border-b border-gray-200 p-6 dark:border-gray-800">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Question Preview</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Review full question details before adding to exam
            </p>
          </div>
          <IconButton
            variant="ghost"
            size="icon"
            aria-label="Close preview"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </IconButton>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-900/50">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
              {question.question_number && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  <Tag className="h-3 w-3" />
                  Q{question.question_number}
                </span>
              )}
              {question.exam_year && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  <Calendar className="h-3 w-3" />
                  {question.exam_year}
                </span>
              )}
              {question.marks !== null && question.marks !== undefined && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  {question.marks} mark{question.marks === 1 ? '' : 's'}
                </span>
              )}
              {question.difficulty_level && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  {question.difficulty_level}
                </span>
              )}
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              {question.board_name && <span>{question.board_name}</span>}
              {question.programme_name && (
                <>
                  <span>•</span>
                  <span>{question.programme_name}</span>
                </>
              )}
              {question.subject_name && (
                <>
                  <span>•</span>
                  <span>{question.subject_name}</span>
                </>
              )}
            </div>

            {(question.topic_name || question.subtopic_name || question.concept_name) && (
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                {question.topic_name && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                    <BookOpen className="h-3 w-3" />
                    {question.topic_name}
                  </span>
                )}
                {question.subtopic_name && (
                  <>
                    <span className="text-gray-400">›</span>
                    <span className="rounded-md bg-white px-2 py-1 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                      {question.subtopic_name}
                    </span>
                  </>
                )}
                {question.concept_name && (
                  <>
                    <span className="text-gray-400">›</span>
                    <span className="rounded-md bg-white px-2 py-1 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                      {question.concept_name}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Question Description</h4>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {question.question_description || 'No description available'}
              </p>
            </div>
          </div>

          {renderOptions()}

          {question.hint_text && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Hint</h4>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{question.hint_text}</p>
              </div>
            </div>
          )}

          {question.explanation_text && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Explanation</h4>
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {question.explanation_text}
                </p>
              </div>
            </div>
          )}

          {renderAttachments()}

          {question.tags && question.tags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {question.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(!question.question_description && !question.options?.length && !question.explanation_text) && (
            <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                This question has limited information. Consider adding more details before using it in an exam.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-6 dark:border-gray-800">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
