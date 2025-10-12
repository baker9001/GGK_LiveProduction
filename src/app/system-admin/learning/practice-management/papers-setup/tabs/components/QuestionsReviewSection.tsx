import React from 'react';
import { QuestionReviewCheckbox } from './QuestionReviewCheckbox';

interface Question {
  id: string;
  question_number: string;
  question_text: string;
  marks: number;
  type: string;
  [key: string]: any;
}

interface QuestionReviewStatus {
  isReviewed: boolean;
  reviewedAt?: string;
  hasIssues: boolean;
}

interface QuestionsReviewSectionProps {
  questions: Question[];
  questionReviewStatus: Record<string, QuestionReviewStatus>;
  onToggleReview: (questionId: string) => void;
  onQuestionClick?: (question: Question) => void;
}

export const QuestionsReviewSection: React.FC<QuestionsReviewSectionProps> = ({
  questions,
  questionReviewStatus,
  onToggleReview,
  onQuestionClick,
}) => {
  return (
    <div className="space-y-3">
      {questions.map((question) => {
        const reviewStatus = questionReviewStatus[question.id] || {
          isReviewed: false,
          hasIssues: false,
        };

        return (
          <div
            key={question.id}
            className={`border rounded-lg p-4 transition-all ${
              reviewStatus.isReviewed
                ? reviewStatus.hasIssues
                  ? 'border-yellow-300 bg-yellow-50'
                  : 'border-green-300 bg-green-50'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-semibold text-gray-700">
                    Q{question.question_number}
                  </span>
                  <span className="text-xs text-gray-500">
                    {question.type} | {question.marks} mark{question.marks !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-sm text-gray-800 line-clamp-2">{question.question_text}</p>
                {reviewStatus.reviewedAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Reviewed: {new Date(reviewStatus.reviewedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <QuestionReviewCheckbox
                  questionId={question.id}
                  isReviewed={reviewStatus.isReviewed}
                  hasIssues={reviewStatus.hasIssues}
                  onToggleReview={onToggleReview}
                />
                {onQuestionClick && (
                  <button
                    type="button"
                    onClick={() => onQuestionClick(question)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Details
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
