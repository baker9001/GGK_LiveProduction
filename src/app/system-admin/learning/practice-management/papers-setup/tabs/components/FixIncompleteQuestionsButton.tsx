import React from 'react';
import { Button } from '../../../../../../../components/shared/Button';
import { Wrench } from 'lucide-react';

interface FixIncompleteQuestionsButtonProps {
  incompleteQuestions: any[];
  onFix: (updatedQuestions: any[]) => Promise<void>;
}

export const FixIncompleteQuestionsButton: React.FC<FixIncompleteQuestionsButtonProps> = ({
  incompleteQuestions,
  onFix
}) => {
  const incompleteCount = incompleteQuestions.filter(
    q => !q.question_text || q.marks === 0 || !q.correct_answers || q.correct_answers.length === 0
  ).length;

  if (incompleteCount === 0) {
    return null;
  }

  const handleFix = async () => {
    // Auto-fix incomplete questions by setting default values
    const fixedQuestions = incompleteQuestions.map(q => {
      if (!q.question_text || q.marks === 0) {
        return {
          ...q,
          question_text: q.question_text || `Question ${q.question_number}`,
          marks: q.marks || 1
        };
      }
      return q;
    });

    await onFix(fixedQuestions);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleFix}
      className="text-orange-600 border-orange-300 hover:bg-orange-50"
    >
      <Wrench className="h-4 w-4 mr-2" />
      Fix {incompleteCount} Incomplete Question{incompleteCount !== 1 ? 's' : ''}
    </Button>
  );
};
