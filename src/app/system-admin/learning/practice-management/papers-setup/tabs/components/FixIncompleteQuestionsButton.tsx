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
  const [isFixing, setIsFixing] = React.useState(false);

  const handleFix = async () => {
    if (incompleteQuestions.length === 0) return;

    setIsFixing(true);
    try {
      // Simple fix: ensure all required fields have values
      const fixed = incompleteQuestions.map(q => ({
        ...q,
        question_text: q.question_text || 'Missing question text',
        marks: q.marks || 1,
      }));
      await onFix(fixed);
    } catch (error) {
      console.error('Error fixing questions:', error);
    } finally {
      setIsFixing(false);
    }
  };

  const hasIncomplete = incompleteQuestions.some(
    q => !q.question_text || q.marks === 0
  );

  if (!hasIncomplete) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleFix}
      disabled={isFixing}
    >
      <Wrench className="h-4 w-4 mr-2" />
      {isFixing ? 'Fixing...' : 'Fix Incomplete Questions'}
    </Button>
  );
};
