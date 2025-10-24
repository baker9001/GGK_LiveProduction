// src/app/system-admin/learning/practice-management/papers-setup/tabs/components/FixIncompleteQuestionsButton.tsx

import React, { useState } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { toast } from '../../../../../../../components/shared/Toast';

interface FixIncompleteQuestionsButtonProps {
  incompleteQuestions: any[];
  onFix: (updatedQuestions: any[]) => void | Promise<void>;
}

export function FixIncompleteQuestionsButton({
  incompleteQuestions,
  onFix
}: FixIncompleteQuestionsButtonProps) {
  const [isFixing, setIsFixing] = useState(false);

  const handleFixIncompleteQuestions = async () => {
    if (incompleteQuestions.length === 0) {
      toast.info('No incomplete questions to fix');
      return;
    }

    setIsFixing(true);
    
    try {
      // Auto-fix incomplete questions by filling in missing fields
      const fixedQuestions = incompleteQuestions.map((question, index) => {
        const fixed = { ...question };
        
        // Fix missing question text
        if (!fixed.question_text && !fixed.question_description) {
          fixed.question_text = `Question ${fixed.question_number || index + 1}`;
          fixed.question_description = fixed.question_text;
        }
        
        // Fix missing marks
        if (!fixed.marks && !fixed.total_marks) {
          fixed.marks = 1;
          fixed.total_marks = 1;
        }
        
        // Fix missing type
        if (!fixed.type) {
          fixed.type = 'descriptive';
        }
        
        // Fix missing difficulty
        if (!fixed.difficulty) {
          fixed.difficulty = 'medium';
        }
        
        // Fix parts if they exist
        if (fixed.parts && Array.isArray(fixed.parts)) {
          fixed.parts = fixed.parts.map((part: any, partIndex: number) => {
            const fixedPart = { ...part };
            
            if (!fixedPart.question_text && !fixedPart.question_description) {
              fixedPart.question_text = `Part ${String.fromCharCode(97 + partIndex)}`;
              fixedPart.question_description = fixedPart.question_text;
            }
            
            if (!fixedPart.marks) {
              fixedPart.marks = 1;
            }
            
            if (!fixedPart.type) {
              fixedPart.type = 'descriptive';
            }
            
            return fixedPart;
          });
        }
        
        return fixed;
      });
      
      // Call the onFix callback with the fixed questions
      await onFix(fixedQuestions);
      
      toast.success(`Successfully fixed ${incompleteQuestions.length} incomplete question${incompleteQuestions.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error fixing incomplete questions:', error);
      toast.error('Failed to fix incomplete questions. Please try again.');
    } finally {
      setIsFixing(false);
    }
  };

  if (incompleteQuestions.length === 0) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleFixIncompleteQuestions}
      disabled={isFixing}
      leftIcon={isFixing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
    >
      {isFixing ? 'Fixing...' : `Fix ${incompleteQuestions.length} Incomplete Question${incompleteQuestions.length > 1 ? 's' : ''}`}
    </Button>
  );
}