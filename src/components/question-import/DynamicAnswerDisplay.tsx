// src/components/question-import/DynamicAnswerDisplay.tsx

import React from 'react';
import { Check, X, AlertCircle, FileText, Beaker, Calculator, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CorrectAnswer {
  answer: string;
  marks?: number;
  alternative_id?: number;
  context?: {
    type: string;
    value: string;
    label?: string;
  };
}

interface QuestionData {
  type?: string;
  correct_answer?: string;
  correct_answers?: CorrectAnswer[];
  answer_requirement?: string;
  total_alternatives?: number;
  answer_format?: string;
  options?: Array<{
    label: string;
    text: string;
    is_correct?: boolean;
  }>;
  marks?: number;
  subject?: string;
}

interface DynamicAnswerDisplayProps {
  question: QuestionData;
  isEditing?: boolean;
  onUpdate?: (field: string, value: any) => void;
  showLabels?: boolean;
  showContext?: boolean;
}

export function DynamicAnswerDisplay({
  question,
  isEditing = false,
  onUpdate = () => {},
  showLabels = true,
  showContext = true
}: DynamicAnswerDisplayProps) {
  
  // Helper to get answer requirement label
  const getAnswerRequirementLabel = (requirement?: string) => {
    switch (requirement) {
      case 'any_one_from': return 'Any one of the following';
      case 'any_two_from': return 'Any two of the following';
      case 'any_three_from': return 'Any three of the following';
      case 'both_required': return 'Both answers required';
      case 'all_required': return 'All answers required';
      case 'alternative_methods': return 'Alternative methods accepted';
      case 'acceptable_variations': return 'Acceptable variations';
      default: return null;
    }
  };

  // Helper to get icon based on answer format or subject
  const getAnswerIcon = () => {
    const format = question.answer_format;
    const subject = question.subject?.toLowerCase() || '';
    
    if (format === 'equation' || format === 'calculation') return <Calculator className="w-4 h-4" />;
    if (format === 'structural_diagram' || subject.includes('chemistry')) return <Beaker className="w-4 h-4" />;
    if (format === 'diagram') return <FileText className="w-4 h-4" />;
    return <Check className="w-4 h-4" />;
  };

  // Helper to format answer based on type
  const formatAnswer = (answer: string, format?: string) => {
    if (!answer) return 'No answer provided';
    
    // For chemical formulas, ensure subscripts are displayed
    if (format === 'structural_diagram' || question.subject?.toLowerCase().includes('chemistry')) {
      return answer.replace(/(\d+)/g, (match) => {
        const subscripts = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
        return match.split('').map(d => subscripts[parseInt(d)] || d).join('');
      });
    }
    
    return answer;
  };

  // For MCQ questions
  if (question.type === 'mcq' && question.options) {
    return (
      <div className="mt-3">
        {showLabels && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Answer Options
          </label>
        )}
        <div className="space-y-2">
          {question.options.map((option) => {
            const isCorrect = option.is_correct || 
                             question.correct_answer === option.label ||
                             question.correct_answers?.some(ca => 
                               ca.answer === option.label || ca.answer === option.text
                             );
            
            return (
              <div
                key={option.label}
                className={cn(
                  "flex items-center p-3 rounded-lg border",
                  isCorrect 
                    ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700" 
                    : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700"
                )}
              >
                <span className={cn(
                  "font-semibold px-2 py-1 rounded mr-3",
                  isCorrect 
                    ? "bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300" 
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                )}>
                  {option.label}
                </span>
                <span className="flex-1">{option.text}</span>
                {isCorrect && <Check className="w-5 h-5 text-green-600 dark:text-green-400 ml-2" />}
              </div>
            );
          })}
        </div>
        {question.correct_answers && question.correct_answers.length > 1 && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            <AlertCircle className="inline w-4 h-4 mr-1" />
            {getAnswerRequirementLabel(question.answer_requirement)}
          </div>
        )}
      </div>
    );
  }

  // For True/False questions
  if (question.type === 'tf') {
    const correctAnswer = question.correct_answer?.toLowerCase() === 'true';
    
    return (
      <div className="mt-3">
        {showLabels && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Correct Answer
          </label>
        )}
        <div className="flex gap-4">
          <div className={cn(
            "flex-1 p-4 rounded-lg border text-center font-medium",
            correctAnswer 
              ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300" 
              : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-500"
          )}>
            True {correctAnswer && <Check className="inline ml-2 w-4 h-4" />}
          </div>
          <div className={cn(
            "flex-1 p-4 rounded-lg border text-center font-medium",
            !correctAnswer 
              ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300" 
              : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-500"
          )}>
            False {!correctAnswer && <Check className="inline ml-2 w-4 h-4" />}
          </div>
        </div>
      </div>
    );
  }

  // For descriptive questions with multiple correct answers
  if (question.correct_answers && question.correct_answers.length > 0) {
    const requirementLabel = getAnswerRequirementLabel(question.answer_requirement);
    
    return (
      <div className="mt-3">
        {showLabels && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            {getAnswerIcon()}
            Correct Answer{question.correct_answers.length > 1 ? 's' : ''}
            {question.answer_format && (
              <span className="text-xs px-2 py-0.5 bg-[#E8F5DC] dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                {question.answer_format.replace(/_/g, ' ')}
              </span>
            )}
          </label>
        )}
        
        {requirementLabel && (
          <div className="mb-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {requirementLabel}
            {question.total_alternatives && (
              <span className="text-xs">
                ({question.correct_answers.length} of {question.total_alternatives} alternatives shown)
              </span>
            )}
          </div>
        )}
        
        <div className="space-y-2">
          {question.correct_answers.map((ca, index) => (
            <div
              key={ca.alternative_id || index}
              className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={ca.answer}
                      onChange={(e) => {
                        const updatedAnswers = [...(question.correct_answers || [])];
                        updatedAnswers[index] = { ...ca, answer: e.target.value };
                        onUpdate('correct_answers', updatedAnswers);
                      }}
                      className="w-full px-3 py-1 border border-green-300 dark:border-green-600 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-green-800/50 dark:text-white"
                    />
                  ) : (
                    <div className="text-green-700 dark:text-green-300 font-medium">
                      {formatAnswer(ca.answer, question.answer_format)}
                    </div>
                  )}
                  
                  {showContext && ca.context && (
                    <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                      <span className="font-medium">{ca.context.type}:</span> {ca.context.label || ca.context.value}
                    </div>
                  )}
                </div>
                
                {ca.marks !== undefined && (
                  <span className="ml-3 text-sm font-medium text-green-600 dark:text-green-400">
                    {ca.marks} mark{ca.marks !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              
              {ca.alternative_id && (
                <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                  Alternative #{ca.alternative_id}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // For single correct answer
  if (question.correct_answer) {
    return (
      <div className="mt-3">
        {showLabels && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            {getAnswerIcon()}
            Correct Answer
            {question.answer_format && (
              <span className="text-xs px-2 py-0.5 bg-[#E8F5DC] dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                {question.answer_format.replace(/_/g, ' ')}
              </span>
            )}
          </label>
        )}
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          {isEditing ? (
            <input
              type="text"
              value={question.correct_answer}
              onChange={(e) => onUpdate('correct_answer', e.target.value)}
              className="w-full px-3 py-1 border border-green-300 dark:border-green-600 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-green-800/50 dark:text-white"
            />
          ) : (
            <div className="text-green-700 dark:text-green-300 font-medium">
              {formatAnswer(question.correct_answer, question.answer_format)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // No answer provided
  return (
    <div className="mt-3">
      {showLabels && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Correct Answer
        </label>
      )}
      <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="text-gray-500 dark:text-gray-400 italic">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value=""
                onChange={(e) => onUpdate('correct_answer', e.target.value)}
                placeholder="Enter correct answer..."
                className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-[#99C93B] focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <div className="text-xs text-gray-500">
                Tip: For multiple acceptable answers, use the "Add Alternative" button
              </div>
            </div>
          ) : (
            'No correct answer provided'
          )}
        </div>
      </div>
    </div>
  );
}