import React from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { PaperCard } from '../../../questions-setup/components/PaperCard';
import { GroupedPaper, Question, SubQuestion } from '../../../questions-setup/page';

interface PaperListProps {
  papers: GroupedPaper[];
  isLoading: boolean;
  emptyMessage: string;
  topics: { id: string; name: string }[];
  subtopics: { id: string; name: string; topic_id: string }[];
  units?: { id: string; name: string }[];
  onDeleteQuestion: (question: Question) => void;
  onDeleteSubQuestion: (subQuestion: SubQuestion) => void;
  onStartTestMode?: (paper: GroupedPaper) => void;
  onStartSimulation?: (paper: GroupedPaper) => void;
  showQAActions?: boolean;
  readOnly?: boolean;
  pdfDataUrl?: string | null;
  onPdfUpload?: (file: File) => void;
}

export function PaperList({
  papers,
  isLoading,
  emptyMessage,
  topics,
  subtopics,
  units = [],
  onDeleteQuestion,
  onDeleteSubQuestion,
  onStartTestMode,
  onStartSimulation,
  showQAActions = false,
  readOnly = false,
  pdfDataUrl,
  onPdfUpload
}: PaperListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (papers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <FileText className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {emptyMessage}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md">
          No papers available in this category
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {papers.map((paper) => (
        <PaperCard
          key={paper.id}
          paper={paper}
          topics={topics}
          subtopics={subtopics}
          units={units}
          onDeleteQuestion={onDeleteQuestion}
          onDeleteSubQuestion={onDeleteSubQuestion}
          onStartTestMode={() => onStartTestMode?.(paper)}
          onStartSimulation={() => onStartSimulation?.(paper)}
          showQAActions={showQAActions}
          readOnly={readOnly}
          pdfDataUrl={pdfDataUrl}
          onPdfUpload={onPdfUpload}
        />
      ))}
    </div>
  );
}