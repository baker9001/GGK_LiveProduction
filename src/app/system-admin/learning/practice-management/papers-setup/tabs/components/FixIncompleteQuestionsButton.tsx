import React from 'react';
import { Button } from '../../../../../../../components/shared/Button';
import { Wrench } from 'lucide-react';

interface FixIncompleteQuestionsButtonProps {
  incompleteQuestions: any[];
  onFix: (updatedQuestions: any[]) => Promise<void>;
}

export function FixIncompleteQuestionsButton({
  incompleteQuestions,
  onFix
}: FixIncompleteQuestionsButtonProps) {
  const incompleteCount = incompleteQuestions.filter(
    q => !q.question_text || q.marks === 0
  ).length;

  if (incompleteCount === 0) {
    return null;
  }

  return (
    <Button
      variant="outline"
      onClick={() => onFix(incompleteQuestions)}
      leftIcon={<Wrench className="h-4 w-4" />}
    >
      Fix {incompleteCount} Incomplete Question{incompleteCount !== 1 ? 's' : ''}
    </Button>
  );
}
