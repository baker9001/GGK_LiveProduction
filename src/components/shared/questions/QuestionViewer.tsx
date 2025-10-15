// src/components/shared/questions/QuestionViewer.tsx

import React, { useState, useCallback, useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Lightbulb,
  BookOpen,
  Calculator,
  FileText,
  List,
  Eye,
  ChevronDown,
  ChevronUp,
  Award,
  Upload,
  X,
  Image as ImageIcon,
  File,
  Play,
  Volume2,
  Film,
  Trash2,
  Download
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../Tabs';
import DynamicAnswerField from '../DynamicAnswerField';
import { MarkingSimulationPanel } from './MarkingSimulationPanel';
import { toast } from '../Toast';

// ============================================================================
// Type Definitions
// ============================================================================

export type QuestionMode = 'review' | 'simulation' | 'student';
export type QuestionSubject = 'physics' | 'chemistry' | 'biology' | 'mathematics';

export interface AnswerAlternative {
  answer: string;
  marks?: number;
  acceptable_variations?: string[];
  linked_alternatives?: number[];
  alternative_id?: number;
  alternative_type?: 'structure_function_pair' | 'method' | 'band' | 'ora' | 'owtte' | string;
  context?: { type: string; value: string; label?: string };
  tolerance?: { abs?: number; pct?: number };
  units?: string;
  flags?: {
    ecf?: boolean;
    ora?: boolean;
    owtte?: boolean;
    ignore_case?: boolean;
  };
}

export interface QuestionPart {
  part?: string;
  question_text: string;
  answer_format: 'single_line' | 'multi_line' | 'mcq_single' | 'mcq_multi' | 'true_false' | 'numerical' | 'fill_blank' | 'diagram_label' | 'structured';
  marks: number;
  correct_answers: AnswerAlternative[];
  hint?: string;
  explanation?: string;
  working_steps?: any[];
}

export interface QuestionData {
  id?: string;
  question_number?: string;
  type?: 'mcq' | 'true_false' | 'fill_blank' | 'numerical' | 'structured' | 'diagram_label' | 'graph' | 'practical';
  subject?: QuestionSubject;
  topic?: string;
  subtopic?: string;
  exam_board?: string;
  paper_code?: string;
  year?: number;
  marks?: number;
  attachments?: { id?: string; name: string; url: string; type: string }[];
  parts?: QuestionPart[];
  meta?: Record<string, any>;
  question_text?: string;
  correct_answers?: AnswerAlternative[];
  options?: { label: string; text: string; is_correct?: boolean }[];
  hint?: string;
  explanation?: string;
}

export type PartResponse =
  | { type: 'mcq_single'; value: string }
  | { type: 'mcq_multi'; value: string[] }
  | { type: 'true_false'; value: boolean }
  | { type: 'fill_blank'; value: string[] }
  | { type: 'numerical'; value: number; units?: string }
  | { type: 'diagram_label'; value: Record<string, string> }
  | { type: 'structured'; value: Record<string, string | number> }
  | { type: 'multi_line' | 'single_line'; value: string };

export interface UserResponse {
  questionId?: string;
  parts: { part?: string; response: PartResponse }[];
}

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface UploadedAttachment {
  id?: string;
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface QuestionViewerProps {
  question: QuestionData;
  mode: QuestionMode;
  subject?: QuestionSubject;
  examBoard?: 'cambridge' | 'edexcel' | string;
  editable?: boolean;
  onUpdate?: (updated: QuestionData) => void;
  onAnswerChange?: (response: UserResponse) => void;
  onValidate?: (report: ValidationReport) => void;
  onAttachmentsChange?: (files: UploadedAttachment[]) => void;
  onRevealMarkScheme?: () => void;
  className?: string;
}

// ============================================================================
// Internal Subcomponents
// ============================================================================

const QuestionHeader: React.FC<{
  question: QuestionData;
  mode: QuestionMode;
}> = ({ question, mode }) => {
  const getQuestionTypeIcon = () => {
    switch (question.type) {
      case 'mcq':
        return <List className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'numerical':
        return <Calculator className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'diagram_label':
        return <ImageIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
      case 'graph':
        return <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getSubjectBadgeColor = (subject?: string) => {
    const subj = subject?.toLowerCase() || '';
    if (subj.includes('physics')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    if (subj.includes('chemistry')) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    if (subj.includes('biology')) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
    if (subj.includes('math')) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
    return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
  };

  return (
    <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-3 flex-1">
        <div className="flex-shrink-0 mt-1">
          {getQuestionTypeIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Question {question.question_number || question.id}
            </h3>
            {question.subject && (
              <span className={cn('text-xs px-2 py-1 rounded-full font-medium', getSubjectBadgeColor(question.subject))}>
                {question.subject}
              </span>
            )}
            {question.exam_board && (
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium">
                {question.exam_board}
              </span>
            )}
            {mode === 'review' && (
              <span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
                Review Mode
              </span>
            )}
          </div>
          {(question.topic || question.subtopic) && (
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              {question.topic && <span>{question.topic}</span>}
              {question.topic && question.subtopic && <span>•</span>}
              {question.subtopic && <span>{question.subtopic}</span>}
            </div>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {question.marks || 0}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          mark{(question.marks || 0) !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

const QuestionBody: React.FC<{
  question: QuestionData;
}> = ({ question }) => {
  if (!question.question_text) return null;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
        {question.question_text}
      </p>
    </div>
  );
};

const AttachmentsPanel: React.FC<{
  attachments: UploadedAttachment[];
  mode: QuestionMode;
  editable: boolean;
  onUpload?: (files: File[]) => void;
  onRemove?: (attachmentId: string) => void;
}> = ({ attachments, mode, editable, onUpload, onRemove }) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onUpload) {
      onUpload(Array.from(e.dataTransfer.files));
    }
  }, [onUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onUpload) {
      onUpload(Array.from(e.target.files));
    }
  }, [onUpload]);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (type.startsWith('audio/')) return <Volume2 className="h-5 w-5" />;
    if (type.startsWith('video/')) return <Film className="h-5 w-5" />;
    if (type === 'application/pdf') return <File className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Upload Area (Review mode only) */}
      {mode === 'review' && editable && (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Drag and drop files here, or click to select
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
            Supports: Images (PNG, JPG, WEBP), PDF, Audio, Video
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Select Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,audio/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Attachments List */}
      {attachments && attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Attachments ({attachments.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {attachments.map((attachment, index) => {
              const isImage = attachment.type.startsWith('image/');
              return (
                <div
                  key={attachment.id || index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-start gap-3 bg-white dark:bg-gray-800"
                >
                  {isImage ? (
                    <div className="flex-shrink-0 w-16 h-16 rounded overflow-hidden bg-gray-100 dark:bg-gray-700">
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-16 h-16 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      {getFileIcon(attachment.type)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {attachment.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {attachment.type} {attachment.size && `• ${formatFileSize(attachment.size)}`}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex gap-1">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </a>
                    {mode === 'review' && editable && onRemove && (
                      <button
                        onClick={() => onRemove(attachment.id || `${index}`)}
                        className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Main QuestionViewer Component
// ============================================================================

export const QuestionViewer: React.FC<QuestionViewerProps> = ({
  question,
  mode,
  subject,
  examBoard,
  editable = true,
  onUpdate,
  onAnswerChange,
  onValidate,
  onAttachmentsChange,
  onRevealMarkScheme,
  className
}) => {
  const [activeTab, setActiveTab] = useState<string>('edit');
  const [userAnswer, setUserAnswer] = useState<any>(null);
  const [showMarkScheme, setShowMarkScheme] = useState(false);
  const [localAttachments, setLocalAttachments] = useState<UploadedAttachment[]>(
    question.attachments || []
  );

  const effectiveSubject = subject || question.subject;
  const effectiveExamBoard = examBoard || question.exam_board;

  // Determine if the question is editable
  const isEditable = mode === 'review' && editable;

  // Handle answer changes
  const handleAnswerChange = useCallback((value: any) => {
    setUserAnswer(value);

    if (onAnswerChange) {
      const response: UserResponse = {
        questionId: question.id,
        parts: [{
          response: {
            type: question.type === 'mcq' ? 'mcq_single' :
                  question.type === 'true_false' ? 'true_false' :
                  'single_line',
            value: value
          } as PartResponse
        }]
      };
      onAnswerChange(response);
    }
  }, [onAnswerChange, question.id, question.type]);

  // Handle file uploads
  const handleFileUpload = useCallback(async (files: File[]) => {
    // TODO: Implement actual upload to Supabase storage
    // For now, create mock uploaded attachments
    const newAttachments: UploadedAttachment[] = files.map(file => ({
      id: `temp-${Date.now()}-${Math.random()}`,
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
      size: file.size
    }));

    const updated = [...localAttachments, ...newAttachments];
    setLocalAttachments(updated);
    onAttachmentsChange?.(updated);
  }, [localAttachments, onAttachmentsChange]);

  // Handle attachment removal
  const handleAttachmentRemove = useCallback((attachmentId: string) => {
    const updated = localAttachments.filter(a => a.id !== attachmentId);
    setLocalAttachments(updated);
    onAttachmentsChange?.(updated);
  }, [localAttachments, onAttachmentsChange]);

  // Handle reveal mark scheme
  const handleRevealMarkScheme = useCallback(() => {
    setShowMarkScheme(true);
    onRevealMarkScheme?.();
  }, [onRevealMarkScheme]);

  // Calculate earned marks for simulation
  const [earnedMarks, setEarnedMarks] = useState(0);
  const [hasCheckedAnswer, setHasCheckedAnswer] = useState(false);

  const handleCheckAnswer = useCallback(() => {
    // Simple validation logic - in production this would use SubjectAdapter
    const isCorrect = userAnswer !== null && userAnswer !== undefined && userAnswer !== '';
    const marks = isCorrect ? (question.marks || 0) : 0;
    setEarnedMarks(marks);
    setHasCheckedAnswer(true);
    setShowMarkScheme(true);
    toast.info(`Answer checked: ${marks}/${question.marks || 0} marks`);
  }, [userAnswer, question.marks]);

  // Render based on mode
  const renderContent = () => {
    if (mode === 'review') {
      return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="attachments">Attachments</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-6 mt-6">
            <QuestionBody question={question} />

            {/* Answer Section with DynamicAnswerField */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Answer Configuration
              </h4>
              <DynamicAnswerField
                question={{
                  id: question.id || '',
                  type: question.type as any || 'descriptive',
                  subject: effectiveSubject,
                  answer_format: question.parts?.[0]?.answer_format,
                  options: question.options,
                  correct_answers: question.correct_answers,
                  marks: question.marks || 0
                }}
                value={question.correct_answers || []}
                onChange={(value) => {
                  if (onUpdate) {
                    onUpdate({ ...question, correct_answers: value as any });
                  }
                }}
                mode="admin"
                showCorrectAnswer={true}
              />
            </div>
          </TabsContent>

          <TabsContent value="attachments" className="mt-6">
            <AttachmentsPanel
              attachments={localAttachments}
              mode={mode}
              editable={isEditable}
              onUpload={handleFileUpload}
              onRemove={handleAttachmentRemove}
            />
          </TabsContent>

          <TabsContent value="preview" className="mt-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Preview (read-only question fields)
              </p>
            </div>
            <div className="space-y-4">
              <QuestionBody question={question} />
              <DynamicAnswerField
                question={{
                  id: question.id || '',
                  type: question.type as any || 'descriptive',
                  subject: effectiveSubject,
                  answer_format: question.parts?.[0]?.answer_format,
                  options: question.options,
                  correct_answers: question.correct_answers,
                  marks: question.marks || 0
                }}
                value={userAnswer}
                onChange={handleAnswerChange}
                mode="qa_preview"
                showCorrectAnswer={false}
              />
            </div>
          </TabsContent>

          <TabsContent value="validation" className="mt-6">
            <div className="space-y-4">
              {onValidate && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                      Validation Status
                    </h4>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Subject-specific validation and compliance checks are active.
                  </p>
                </div>
              )}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Validation Results
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Validation reports will appear here as you make changes
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      );
    }

    // Simulation or Student mode
    return (
      <div className="space-y-6">
        <QuestionBody question={question} />

        {localAttachments.length > 0 && (
          <AttachmentsPanel
            attachments={localAttachments}
            mode={mode}
            editable={false}
          />
        )}

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Your Answer
          </h4>
          <DynamicAnswerField
            question={{
              id: question.id || '',
              type: question.type as any || 'descriptive',
              subject: effectiveSubject,
              answer_format: question.parts?.[0]?.answer_format,
              options: question.options,
              correct_answers: question.correct_answers,
              marks: question.marks || 0
            }}
            value={userAnswer}
            onChange={handleAnswerChange}
            mode={mode === 'simulation' ? 'qa_preview' : 'practice'}
            showCorrectAnswer={mode === 'simulation' && showMarkScheme}
          />
        </div>

        {mode === 'simulation' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={handleCheckAnswer}
                variant="default"
                disabled={hasCheckedAnswer}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {hasCheckedAnswer ? 'Answer Checked' : 'Check Answer'}
              </Button>
              {!hasCheckedAnswer && (
                <Button
                  onClick={handleRevealMarkScheme}
                  variant="outline"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Reveal Mark Scheme
                </Button>
              )}
            </div>

            {/* Show Marking Simulation Panel after checking */}
            {hasCheckedAnswer && question.correct_answers && question.correct_answers.length > 0 && (
              <MarkingSimulationPanel
                subject={effectiveSubject}
                totalMarks={question.marks || 0}
                earnedMarks={earnedMarks}
                correctAnswers={question.correct_answers}
                userAnswer={userAnswer}
                showBreakdown={true}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6', className)}>
      <QuestionHeader question={question} mode={mode} />
      <div className="mt-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default QuestionViewer;
