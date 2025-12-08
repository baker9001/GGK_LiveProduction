import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Paperclip } from 'lucide-react';
import { cn } from '../../lib/utils';

interface QuestionItem {
  id: string;
  question_number: string;
  hasError?: boolean;
  isComplete?: boolean;
  needsAttachment?: boolean;
  hasAttachment?: boolean;
}

interface SimpleQuestionNavigatorProps {
  questions: QuestionItem[];
  currentQuestionId?: string;
  onNavigate: (questionId: string) => void;
  className?: string;
}

export function SimpleQuestionNavigator({
  questions,
  currentQuestionId,
  onNavigate,
  className
}: SimpleQuestionNavigatorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const getStatusColor = (question: QuestionItem) => {
    if (question.hasError) return 'bg-red-500';
    if (question.isComplete) return 'bg-green-500';
    if (question.needsAttachment && !question.hasAttachment) return 'bg-yellow-500';
    return 'bg-gray-400 dark:bg-gray-600';
  };

  const getStatusIcon = (question: QuestionItem) => {
    if (question.hasError) return <AlertCircle className="h-3 w-3" />;
    if (question.isComplete) return <CheckCircle className="h-3 w-3" />;
    return null;
  };

  return (
    <div
      className={cn(
        'fixed left-0 top-20 bottom-0 z-30 transition-all duration-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg',
        isExpanded ? 'w-20' : 'w-10',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'absolute -right-3 top-4 z-10 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-md',
          (isHovered || !isExpanded) && 'opacity-100',
          isExpanded && !isHovered && 'opacity-0'
        )}
        aria-label={isExpanded ? 'Collapse navigator' : 'Expand navigator'}
      >
        {isExpanded ? (
          <ChevronLeft className="h-3 w-3 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronRight className="h-3 w-3 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      {/* Navigator Content */}
      <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 py-4">
        {isExpanded ? (
          // Expanded View
          <div className="flex flex-col items-center space-y-2 px-2">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Q's
            </div>
            {questions.map((question) => {
              const isActive = question.id === currentQuestionId;
              const statusColor = getStatusColor(question);
              const statusIcon = getStatusIcon(question);

              return (
                <button
                  key={question.id}
                  onClick={() => onNavigate(question.id)}
                  className={cn(
                    'relative group w-14 h-14 rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center',
                    isActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  )}
                  title={`Question ${question.question_number}`}
                >
                  {/* Question Number */}
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {question.question_number}
                  </span>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-1 mt-1">
                    <div className={cn('w-2 h-2 rounded-full', statusColor)} />
                    {statusIcon && (
                      <div className={cn('text-white', statusColor.replace('bg-', 'text-'))}>
                        {statusIcon}
                      </div>
                    )}
                  </div>

                  {/* Attachment Indicator */}
                  {(question.needsAttachment || question.hasAttachment) && (
                    <div
                      className={cn(
                        'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center',
                        question.hasAttachment
                          ? 'bg-green-500 text-white'
                          : 'bg-yellow-500 text-white'
                      )}
                    >
                      <Paperclip className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          // Collapsed View
          <div className="flex flex-col items-center space-y-1 px-1">
            {questions.map((question) => {
              const isActive = question.id === currentQuestionId;
              const statusColor = getStatusColor(question);

              return (
                <button
                  key={question.id}
                  onClick={() => onNavigate(question.id)}
                  className={cn(
                    'relative w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200',
                    isActive
                      ? 'bg-blue-500 text-white shadow-md scale-110'
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                  )}
                  title={`Question ${question.question_number}`}
                >
                  {/* Status Dot */}
                  <div className={cn('absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-gray-800', statusColor)} />

                  {/* Question Number */}
                  <span className={cn('text-xs font-semibold', isActive ? 'text-white' : 'text-gray-700 dark:text-gray-300')}>
                    {question.question_number.length > 2 ? question.question_number.slice(-2) : question.question_number}
                  </span>

                  {/* Attachment Indicator */}
                  {(question.needsAttachment || question.hasAttachment) && (
                    <div
                      className={cn(
                        'absolute -bottom-0.5 -left-0.5 w-2 h-2 rounded-full',
                        question.hasAttachment ? 'bg-green-500' : 'bg-yellow-500'
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Summary at bottom */}
        {isExpanded && questions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 px-2">
            <div className="text-center space-y-1">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {questions.filter(q => q.isComplete).length}/{questions.length}
              </div>
              <div className="flex justify-center gap-1">
                {questions.filter(q => q.hasError).length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    {questions.filter(q => q.hasError).length}
                  </div>
                )}
                {questions.filter(q => q.needsAttachment && !q.hasAttachment).length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                    <Paperclip className="h-2 w-2" />
                    {questions.filter(q => q.needsAttachment && !q.hasAttachment).length}
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
