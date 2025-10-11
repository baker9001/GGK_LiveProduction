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
    q => !q.question_text || q.marks === 0
  ).length;

  if (incompleteCount === 0) {
    return null;
  }

  const handleFix = async () => {
    const updatedQuestions = incompleteQuestions.map(q => ({
      ...q,
      question_text: q.question_text || 'Question text missing',
      marks: q.marks || 1
    }));
    await onFix(updatedQuestions);
  };

  return (
    <Button
      variant="outline"
      onClick={handleFix}
      leftIcon={<Wrench className="h-4 w-4" />}
      className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
    >
      Fix {incompleteCount} Incomplete
    </Button>
  );
};
