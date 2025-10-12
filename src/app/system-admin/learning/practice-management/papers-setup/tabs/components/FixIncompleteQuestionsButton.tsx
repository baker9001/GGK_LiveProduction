import React, { useState } from 'react';
import { AlertTriangle, Wrench } from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { supabase } from '../../../../../../../lib/supabase';

interface FixIncompleteQuestionsButtonProps {
  paperId: string;
  incompleteQuestions: any[];
  onComplete: () => void;
}

export const FixIncompleteQuestionsButton: React.FC<FixIncompleteQuestionsButtonProps> = ({
  paperId,
  incompleteQuestions,
  onComplete,
}) => {
  const [isFixing, setIsFixing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleFix = async () => {
    setIsFixing(true);
    try {
      for (const question of incompleteQuestions) {
        const updates: any = {};

        if (!question.question_text || question.question_text.trim() === '') {
          updates.question_text = `Question ${question.question_number}`;
        }

        if (!question.marks || question.marks === 0) {
          updates.marks = 1;
        }

        if (!question.type) {
          updates.type = 'MCQ';
        }

        if (Object.keys(updates).length > 0) {
          await supabase
            .from('questions')
            .update(updates)
            .eq('id', question.id);
        }
      }

      onComplete();
    } catch (error) {
      console.error('Error fixing incomplete questions:', error);
    } finally {
      setIsFixing(false);
    }
  };

  if (incompleteQuestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-yellow-800 mb-1">
              Incomplete Questions Detected
            </h4>
            <p className="text-xs text-yellow-700 mb-2">
              {incompleteQuestions.length} question{incompleteQuestions.length !== 1 ? 's' : ''} have missing or invalid data
            </p>
            {showDetails && (
              <div className="mt-2 space-y-1">
                {incompleteQuestions.map((q) => (
                  <div key={q.id} className="text-xs text-yellow-700">
                    Q{q.question_number}:
                    {!q.question_text && ' Missing text'}
                    {!q.marks && ' Missing marks'}
                    {!q.type && ' Missing type'}
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-yellow-700 hover:text-yellow-800 underline mt-1"
            >
              {showDetails ? 'Hide' : 'Show'} details
            </button>
          </div>
        </div>
        <Button
          onClick={handleFix}
          disabled={isFixing}
          variant="outline"
          size="sm"
          className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
        >
          <Wrench className="w-4 h-4 mr-2" />
          {isFixing ? 'Fixing...' : 'Auto-fix'}
        </Button>
      </div>
    </div>
  );
};
