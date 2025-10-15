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
  const handleFix = async () => {
    await onFix(incompleteQuestions);
  };

  if (incompleteQuestions.length === 0) {
    return null;
  }

  return (
    <Button
      variant="outline"
      onClick={handleFix}
      className="text-orange-600 border-orange-600 hover:bg-orange-50"
    >
      <Wrench className="h-4 w-4 mr-2" />
      Fix Incomplete Questions ({incompleteQuestions.length})
    </Button>
  );
}
