import React, { useState } from 'react';
import { Wrench, Loader2 } from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import toast from 'react-hot-toast';

interface FixIncompleteQuestionsButtonProps {
  incompleteQuestions: any[];
  onFix: (updatedQuestions: any[]) => Promise<void>;
}

export const FixIncompleteQuestionsButton: React.FC<FixIncompleteQuestionsButtonProps> = ({
  incompleteQuestions,
  onFix,
}) => {
  const [isFixing, setIsFixing] = useState(false);

  const handleFix = async () => {
    setIsFixing(true);
    try {
      const updatedQuestions = incompleteQuestions.map(question => {
        const updated = { ...question };

        if (!updated.question_text || updated.question_text.trim() === '') {
          updated.question_text = `Question ${question.question_number}`;
        }

        if (!updated.question_type) {
          updated.question_type = 'descriptive';
        }

        if (!updated.marks || updated.marks <= 0) {
          updated.marks = 1;
        }

        if (updated.parts && Array.isArray(updated.parts)) {
          updated.parts = updated.parts.map(part => {
            const updatedPart = { ...part };

            if (!updatedPart.question_text || updatedPart.question_text.trim() === '') {
              updatedPart.question_text = `Part (${part.part})`;
            }

            if (!updatedPart.marks || updatedPart.marks <= 0) {
              updatedPart.marks = 1;
            }

            return updatedPart;
          });
        }

        return updated;
      });

      await onFix(updatedQuestions);
      toast.success('Fixed incomplete question data');
    } catch (error) {
      console.error('Error fixing questions:', error);
      toast.error('Failed to fix questions');
    } finally {
      setIsFixing(false);
    }
  };

  const incompleteCount = incompleteQuestions.filter(q =>
    !q.question_text ||
    !q.question_type ||
    !q.marks ||
    (q.parts && q.parts.some((p: any) => !p.question_text || !p.marks))
  ).length;

  if (incompleteCount === 0) {
    return null;
  }

  return (
    <Button
      variant="outline"
      onClick={handleFix}
      disabled={isFixing}
      leftIcon={isFixing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
      className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
      title="Auto-fix incomplete questions by adding default values"
    >
      {isFixing ? 'Fixing...' : `Fix ${incompleteCount} Incomplete`}
    </Button>
  );
};
