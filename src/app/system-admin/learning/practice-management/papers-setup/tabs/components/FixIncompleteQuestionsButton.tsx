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

  // Check for incomplete questions
  const hasIncompleteQuestions = incompleteQuestions.some(
    q => !q.question_text || q.marks === 0 || !q.question_number
  );

  if (!hasIncompleteQuestions) {
    return null;
  }

  const handleFix = async () => {
    setIsFixing(true);
    try {
      // Simple fix: ensure all questions have required fields
      const fixedQuestions = incompleteQuestions.map((q, index) => ({
        ...q,
        question_number: q.question_number || String(index + 1),
        question_text: q.question_text || `Question ${index + 1}`,
        marks: q.marks || 1
      }));

      await onFix(fixedQuestions);
    } catch (error) {
      console.error('Error fixing questions:', error);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleFix}
      disabled={isFixing}
      leftIcon={<Wrench className="h-4 w-4" />}
    >
      {isFixing ? 'Fixing...' : 'Fix Incomplete Questions'}
    </Button>
  );
};
