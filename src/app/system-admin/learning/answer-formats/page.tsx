// src/app/system-admin/learning/answer-formats/page.tsx
import React, { useState, useEffect } from 'react';
import { DataTable } from '../../../../components/shared/DataTable';
import { Button } from '../../../../components/shared/Button';
import { StatusBadge } from '../../../../components/shared/StatusBadge';
import { SlideInForm } from '../../../../components/shared/SlideInForm';
import { FormField } from '../../../../components/shared/FormField';
import { useToast } from '../../../../hooks/useToast';
import { supabase } from '../../../../lib/supabase';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Settings,
  Code,
  Table,
  Mic,
  Image,
  Calculator
} from 'lucide-react';

interface AnswerFormatTemplate {
  id: string;
  name: string;
  format_type: string;
  description: string;
  validation_rules: any;
  scoring_rules: any;
  ui_config: any;
  is_active: boolean;
  created_at: string;
}

const formatIcons = {
  single_word: FileText,
  single_line: FileText,
  multi_line: FileText,
  calculation: Calculator,
  equation: Calculator,
  code: Code,
  table: Table,
  diagram: Image,
  chemical_structure: Image,
  audio: Mic,
  graph: Image,
  file_upload: FileText
};

export default function AnswerFormatsPage() {
  const [formats, setFormats] = useState<AnswerFormatTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFormat, setEditingFormat] = useState<AnswerFormatTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewFormat, setPreviewFormat] = useState<AnswerFormatTemplate | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadFormats();
  }, []);

  const loadFormats = async () => {
    try {
      const { data, error } = await supabase
        .from('answer_format_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      setFormats(data || []);
    } catch (error) {
      console.error('Error loading formats:', error);
      showToast('Failed to load answer formats', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: any) => {
    try {
      const formatData = {
        name: formData.name,
        format_type: formData.format_type,
        description: formData.description,
        validation_rules: JSON.parse(formData.validation_rules || '{}'),
        scoring_rules: JSON.parse(formData.scoring_rules || '{}'),
        ui_config: JSON.parse(formData.ui_config || '{}'),
        is_active: formData.is_active
      };

      if (editingFormat) {
        const { error } = await supabase
          .from('answer_format_templates')
          .update(formatData)
          .eq('id', editingFormat.id);

        if (error) throw error;
        showToast('Answer format updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('answer_format_templates')
          .insert([formatData]);

        if (error) throw error;
        showToast('Answer format created successfully', 'success');
      }

      loadFormats();
      setShowForm(false);
      setEditingFormat(null);
    } catch (error) {
      console.error('Error saving format:', error);
      showToast('Failed to save answer format', 'error');
    }
  };

  const handleDelete = async (format: AnswerFormatTemplate) => {
    if (!confirm('Are you sure you want to delete this answer format?')) return;

    try {
      const { error } = await supabase
        .from('answer_format_templates')
        .delete()
        .eq('id', format.id);

      if (error) throw error;
      showToast('Answer format deleted successfully', 'success');
      loadFormats();
    } catch (error) {
      console.error('Error deleting format:', error);
      showToast('Failed to delete answer format', 'error');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (format: AnswerFormatTemplate) => {
        const Icon = formatIcons[format.format_type] || FileText;
        return (
          <div className="flex items-center space-x-3">
            <Icon className="h-5 w-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {format.name}
              </p>
              <p className="text-sm text-gray-500">
                Type: {format.format_type}
              </p>
            </div>
          </div>
        );
      }
    },
    {
      key: 'description',
      label: 'Description',
      render: (format: AnswerFormatTemplate) => (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {format.description}
        </p>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (format: AnswerFormatTemplate) => (
        <StatusBadge 
          status={format.is_active ? 'active' : 'inactive'}
          size="sm"
        />
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (format: AnswerFormatTemplate) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPreviewFormat(format);
              setShowPreview(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingFormat(format);
              setShowForm(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDelete(format)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Answer Format Templates
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage answer format templates for different question types
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingFormat(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Format
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={formats}
        loading={loading}
      />

      <SlideInForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingFormat(null);
        }}
        title={editingFormat ? 'Edit Answer Format' : 'Add Answer Format'}
        onSubmit={handleSave}
      >
        <FormField
          label="Name"
          name="name"
          type="text"
          required
          defaultValue={editingFormat?.name}
        />

        <FormField
          label="Format Type"
          name="format_type"
          type="select"
          required
          defaultValue={editingFormat?.format_type || 'single_line'}
          options={[
            { value: 'single_word', label: 'Single Word' },
            { value: 'single_line', label: 'Single Line' },
            { value: 'two_items', label: 'Two Items' },
            { value: 'two_items_connected', label: 'Two Connected Items' },
            { value: 'multi_line', label: 'Multi Line' },
            { value: 'multi_line_labeled', label: 'Multi Line Labeled' },
            { value: 'calculation', label: 'Calculation' },
            { value: 'equation', label: 'Equation' },
            { value: 'diagram', label: 'Diagram' },
            { value: 'chemical_structure', label: 'Chemical Structure' },
            { value: 'table', label: 'Table' },
            { value: 'code', label: 'Code' },
            { value: 'audio', label: 'Audio' },
            { value: 'graph', label: 'Graph' },
            { value: 'file_upload', label: 'File Upload' }
          ]}
        />

        <FormField
          label="Description"
          name="description"
          type="textarea"
          defaultValue={editingFormat?.description}
        />

        <FormField
          label="Validation Rules (JSON)"
          name="validation_rules"
          type="textarea"
          defaultValue={editingFormat ? JSON.stringify(editingFormat.validation_rules, null, 2) : '{}'}
          placeholder='{"maxWords": 1, "pattern": "^\\S+$"}'
        />

        <FormField
          label="Scoring Rules (JSON)"
          name="scoring_rules"
          type="textarea"
          defaultValue={editingFormat ? JSON.stringify(editingFormat.scoring_rules, null, 2) : '{}'}
          placeholder='{"partialCredit": true, "keywords": ["example"]}'
        />

        <FormField
          label="UI Configuration (JSON)"
          name="ui_config"
          type="textarea"
          defaultValue={editingFormat ? JSON.stringify(editingFormat.ui_config, null, 2) : '{}'}
          placeholder='{"placeholder": "Enter answer", "rows": 4}'
        />

        <FormField
          label="Active"
          name="is_active"
          type="checkbox"
          defaultValue={editingFormat?.is_active ?? true}
        />
      </SlideInForm>

      {/* Format Preview Modal */}
      {showPreview && previewFormat && (
        <FormatPreviewModal
          format={previewFormat}
          onClose={() => {
            setShowPreview(false);
            setPreviewFormat(null);
          }}
        />
      )}
    </div>
  );
}

// Format Preview Modal Component
function FormatPreviewModal({ format, onClose }: { format: AnswerFormatTemplate; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30" onClick={onClose} />
        
        <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Format Preview: {format.name}
          </h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Format Type
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {format.format_type}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {format.description}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Validation Rules
              </h4>
              <pre className="text-sm bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-x-auto">
                {JSON.stringify(format.validation_rules, null, 2)}
              </pre>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                UI Configuration
              </h4>
              <pre className="text-sm bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-x-auto">
                {JSON.stringify(format.ui_config, null, 2)}
              </pre>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// src/components/admin/AnswerReview.tsx
import React, { useState } from 'react';
import { DynamicAnswerForm } from '../exam/DynamicAnswerForm';
import { Check, X, MessageSquare } from 'lucide-react';

interface AnswerReviewProps {
  question: any;
  studentAnswer: any;
  onGrade: (score: number, feedback: string) => void;
}

export function AnswerReview({ question, studentAnswer, onGrade }: AnswerReviewProps) {
  const [score, setScore] = useState(studentAnswer.manual_score || 0);
  const [feedback, setFeedback] = useState(studentAnswer.grader_feedback || '');
  const [showGrading, setShowGrading] = useState(false);

  const handleGrade = () => {
    onGrade(score, feedback);
    setShowGrading(false);
  };

  // Determine answer value based on format
  const getAnswerValue = () => {
    if (studentAnswer.answer_data) {
      return JSON.stringify(studentAnswer.answer_data);
    }
    if (studentAnswer.answer_file_url) {
      return studentAnswer.answer_file_url;
    }
    return studentAnswer.answer_text || '';
  };

  return (
    <div className="space-y-4">
      {/* Question Display */}
      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          Question {question.question_number}
        </h4>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
          {question.question_description}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Marks: {question.marks} | Format: {studentAnswer.answer_format}
        </p>
      </div>

      {/* Student Answer Display */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Student Answer:
        </h5>
        
        <DynamicAnswerForm
          question={{
            ...question,
            answer_format: studentAnswer.answer_format
          }}
          answer={getAnswerValue()}
          onAnswerChange={() => {}} // Read-only
          disabled={true}
        />
        
        {/* Time spent */}
        <p className="text-sm text-gray-500 mt-3">
          Time spent: {Math.floor((studentAnswer.time_spent || 0) / 60)}m {(studentAnswer.time_spent || 0) % 60}s
        </p>
      </div>

      {/* Correct Answer Display */}
      {question.correct_answer && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h5 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
            Correct Answer:
          </h5>
          <p className="text-green-600 dark:text-green-400">
            {question.correct_answer}
          </p>
        </div>
      )}

      {/* Automated Score */}
      {studentAnswer.auto_score !== null && (
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Automated Score:
          </span>
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {(studentAnswer.auto_score * question.marks).toFixed(1)} / {question.marks}
          </span>
        </div>
      )}

      {/* Grading Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        {!showGrading ? (
          <div className="flex items-center justify-between">
            {studentAnswer.manual_score !== null ? (
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Manual Score: 
                </span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white ml-2">
                  {studentAnswer.manual_score} / {question.marks}
                </span>
              </div>
            ) : (
              <span className="text-sm text-gray-500">Not graded yet</span>
            )}
            
            <button
              onClick={() => setShowGrading(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <MessageSquare className="h-4 w-4" />
              <span>{studentAnswer.manual_score !== null ? 'Update' : 'Grade'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Score (out of {question.marks})
              </label>
              <input
                type="number"
                min="0"
                max={question.marks}
                step="0.5"
                value={score}
                onChange={(e) => setScore(parseFloat(e.target.value))}
                className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Feedback
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide feedback to the student..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleGrade}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <Check className="h-4 w-4" />
                <span>Save Grade</span>
              </button>
              <button
                onClick={() => setShowGrading(false)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing Feedback Display */}
      {studentAnswer.grader_feedback && !showGrading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h5 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
            Grader Feedback:
          </h5>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            {studentAnswer.grader_feedback}
          </p>
        </div>
      )}
    </div>
  );
}

// src/lib/scoring.ts
// Automated scoring utilities

import { answerFormats } from './answerFormats';

export interface ScoringResult {
  score: number; // 0 to 1
  details?: {
    matched: string[];
    missed: string[];
    partial?: boolean;
  };
}

export function calculateScore(
  answer: string,
  correctAnswer: string | string[],
  answerFormat: string,
  answerRequirement?: string
): ScoringResult {
  const format = answerFormats[answerFormat];
  
  // Normalize answers
  const normalizedAnswer = format?.normalizer ? format.normalizer(answer) : answer.trim();
  
  // Handle multiple correct answers
  if (Array.isArray(correctAnswer)) {
    return scoreMultipleAnswers(normalizedAnswer, correctAnswer, answerRequirement);
  }
  
  const normalizedCorrect = format?.normalizer ? format.normalizer(correctAnswer) : correctAnswer.trim();
  
  // Use format-specific scoring if available
  if (format?.scoring) {
    const score = format.scoring(answer, correctAnswer);
    return { score };
  }
  
  // Default exact match scoring
  return {
    score: normalizedAnswer === normalizedCorrect ? 1 : 0
  };
}

function scoreMultipleAnswers(
  answer: string,
  correctAnswers: string[],
  requirement?: string
): ScoringResult {
  const answerParts = answer.split(/[,;]|\s+(?:and|or)\s+/i).map(a => a.trim().toLowerCase());
  const correctParts = correctAnswers.map(a => a.trim().toLowerCase());
  
  const matched = answerParts.filter(part => 
    correctParts.some(correct => part.includes(correct) || correct.includes(part))
  );
  
  const missed = correctParts.filter(correct =>
    !answerParts.some(part => part.includes(correct) || correct.includes(part))
  );
  
  let score = 0;
  
  switch (requirement) {
    case 'any_one_from':
      score = matched.length >= 1 ? 1 : 0;
      break;
      
    case 'any_two_from':
      score = matched.length >= 2 ? 1 : matched.length === 1 ? 0.5 : 0;
      break;
      
    case 'all_required':
    case 'both_required':
      score = matched.length === correctParts.length ? 1 : matched.length / correctParts.length;
      break;
      
    default:
      // Partial credit based on matched items
      score = matched.length / Math.max(correctParts.length, answerParts.length);
  }
  
  return {
    score,
    details: {
      matched,
      missed,
      partial: score > 0 && score < 1
    }
  };
}

// Keyword-based scoring for descriptive answers
export function scoreByKeywords(
  answer: string,
  keywords: string[],
  threshold: number = 0.7
): ScoringResult {
  const normalizedAnswer = answer.toLowerCase();
  const matched = keywords.filter(keyword => 
    normalizedAnswer.includes(keyword.toLowerCase())
  );
  
  const score = matched.length / keywords.length;
  
  return {
    score: score >= threshold ? score : score * 0.5, // Partial credit if below threshold
    details: {
      matched,
      missed: keywords.filter(k => !matched.includes(k))
    }
  };
}

// Similarity scoring for longer text answers
export function calculateSimilarity(answer: string, reference: string): number {
  // Simple word overlap similarity
  const answerWords = new Set(answer.toLowerCase().split(/\s+/));
  const referenceWords = new Set(reference.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...answerWords].filter(x => referenceWords.has(x)));
  const union = new Set([...answerWords, ...referenceWords]);
  
  return intersection.size / union.size; // Jaccard similarity
}