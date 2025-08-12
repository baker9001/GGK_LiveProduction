import React, { useState } from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import { StatusBadge } from '../../../../../../components/shared/StatusBadge';
import { EditableDisplay, EditableTextarea, EditableInput, EditableSelect } from '../../../../../../components/shared/EditableField';
import { questionValidationSchemas, normalizeQuestionDifficulty } from '../../../../../../lib/validation/questionValidation';
import { Button } from '../../../../../../components/shared/Button';

interface QuestionPart {
  part: string;
  question_text?: string;
  figure?: boolean;
  marks?: number;
  skill?: string;
  hint?: string;
  [key: string]: any;
}

interface Question {
  id?: string;
  question_number: string;
  total_marks?: number;
  topic?: string;
  unit?: string;
  question_text?: string;
  question_description?: string;
  figure?: boolean;
  parts?: QuestionPart[];
  [key: string]: any;
}

interface SubQuestion {
  id?: string;
  part: string;
  question_text?: string;
  figure?: boolean;
  marks?: number;
  skill?: string;
  hint?: string;
  [key: string]: any;
}

interface Topic {
  id: string;
  name: string;
}

interface QuestionEditorProps {
  question: Question;
  onUpdate: (questionId: string | undefined, field: string, value: any, isSubQuestion?: boolean, subQuestionId?: string) => void;
  onDelete?: (questionId: string | undefined) => void;
  onSubQuestionDelete?: (questionId: string | undefined, subQuestionId: string | undefined) => void;
  topics?: Topic[];
  readOnly?: boolean;
}

export function QuestionEditor({
  question,
  onUpdate,
  onDelete,
  onSubQuestionDelete,
  topics = [],
  readOnly = false
}: QuestionEditorProps) {
  const [editingField, setEditingField] = useState<{
    field: string;
    isSubQuestion: boolean;
    subQuestionId?: string;
  } | null>(null);

  const handleStartEdit = (field: string, isSubQuestion: boolean = false, subQuestionId?: string) => {
    if (readOnly) return;
    setEditingField({ field, isSubQuestion, subQuestionId });
  };

  const handleCancelEdit = () => {
    setEditingField(null);
  };

  const handleSave = (value: any) => {
    if (!editingField) return;
    
    onUpdate(
      question.id, 
      editingField.field, 
      value, 
      editingField.isSubQuestion, 
      editingField.subQuestionId
    );
    
    setEditingField(null);
  };

  const difficultyOptions = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'medium-high', label: 'Medium-High' },
    { value: 'hard', label: 'Hard' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  const topicOptions = topics.map(topic => ({
    value: topic.id,
    label: topic.name
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Question header */}
      <div className="bg-gray-900 dark:bg-gray-900 p-4 flex items-center justify-between">
        <div className="flex items-center">
          <h3 className="text-lg font-semibold text-white">
            Question {question.question_number} 
            <span className="text-sm font-normal ml-2">
              ({question.parts?.length || 0} {(question.parts?.length || 0) === 1 ? 'part' : 'parts'})
            </span>
          </h3>
          <StatusBadge 
            status={question.status || 'active'} 
            className="ml-3"
          />
        </div>
        {!readOnly && onDelete && (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-gray-800"
              onClick={() => onDelete(question.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      {/* Question metadata */}
      <div className="bg-gray-800 dark:bg-gray-800 p-4 border-b border-gray-700 dark:border-gray-700 text-sm text-gray-300 dark:text-gray-300">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="font-medium">Type:</span>{' '}
            <span>Complex</span>
          </div>
          <div>
            <span className="font-medium">Category:</span>{' '}
            <span>Complex</span>
          </div>
          <div>
            <span className="font-medium">Marks:</span>{' '}
            {editingField?.field === 'marks' && !editingField.isSubQuestion ? (
              <EditableInput
                value={question.total_marks || question.marks || 0}
                onSave={handleSave}
                onCancel={handleCancelEdit}
                validationSchema={questionValidationSchemas.marks}
                type="number"
              />
            ) : (
              <EditableDisplay
                value={question.total_marks || question.marks || 0}
                onEdit={() => handleStartEdit('marks')}
                className={readOnly ? "pointer-events-none" : ""}
              />
            )}
          </div>
          <div>
            <span className="font-medium">Difficulty:</span>{' '}
            {editingField?.field === 'difficulty' && !editingField.isSubQuestion ? (
              <EditableSelect
                value={normalizeQuestionDifficulty(question.difficulty || 'medium')}
                onSave={handleSave}
                onCancel={handleCancelEdit}
                options={difficultyOptions}
              />
            ) : (
              <EditableDisplay
                value={question.difficulty || 'medium'}
                onEdit={() => handleStartEdit('difficulty')}
                displayValue={<span className="capitalize">{question.difficulty || 'medium'}</span>}
                className={readOnly ? "pointer-events-none" : ""}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Question content */}
      <div className="p-4">
        {/* Main question description */}
        <div className="mb-6">
          <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">Question Description:</h3>
          {editingField?.field === 'question_description' && !editingField.isSubQuestion ? (
            <EditableTextarea
              value={question.question_description || question.question_text || ''}
              onSave={handleSave}
              onCancel={handleCancelEdit}
              validationSchema={questionValidationSchemas.question_description}
            />
          ) : (
            <EditableDisplay
              value={question.question_description || question.question_text || ''}
              onEdit={() => handleStartEdit('question_description')}
              className={`p-2 rounded-md bg-gray-50 dark:bg-gray-700/50 ${readOnly ? "pointer-events-none" : ""}`}
            />
          )}
        </div>
        
        {/* Question parts */}
        {question.parts && question.parts.length > 0 && (
          <div className="space-y-6">
            <div className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {question.parts.length} Question {question.parts.length === 1 ? 'Part' : 'Parts'}:
            </div>
            
            {/* Question parts list */}
            <div className="space-y-4 pl-4 border-l-2 border-blue-500 dark:border-blue-400">
              {question.parts.map((part, index) => (
                <div 
                  key={part.id || `part-${index}`} 
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  {/* Part header */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {part.part_label || part.part || `Part ${String.fromCharCode(97 + index)}`}
                      </h4>
                      <StatusBadge 
                        status={part.status || 'active'} 
                        className="ml-3"
                      />
                    </div>
                    {!readOnly && onSubQuestionDelete && (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600"
                          onClick={() => onSubQuestionDelete(question.id, part.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Part content */}
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Type:</span>{' '}
                        <span className="text-sm text-gray-900 dark:text-white">Descriptive</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Marks:</span>{' '}
                        {editingField?.field === 'marks' && editingField.isSubQuestion && editingField.subQuestionId === part.id ? (
                          <EditableInput
                            value={part.marks || 0}
                            onSave={handleSave}
                            onCancel={handleCancelEdit}
                            validationSchema={questionValidationSchemas.marks}
                            type="number"
                          />
                        ) : (
                          <EditableDisplay
                            value={part.marks || 0}
                            onEdit={() => handleStartEdit('marks', true, part.id)}
                            className={readOnly ? "pointer-events-none" : ""}
                          />
                        )}
                      </div>
                    </div>
                    
                    {/* Part description */}
                    <div className="mb-4">
                      {editingField?.field === 'question_description' && editingField.isSubQuestion && editingField.subQuestionId === part.id ? (
                        <EditableTextarea
                          value={part.question_description || part.question_text || ''}
                          onSave={handleSave}
                          onCancel={handleCancelEdit}
                          validationSchema={questionValidationSchemas.question_description}
                        />
                      ) : (
                        <EditableDisplay
                          value={part.question_description || part.question_text || ''}
                          onEdit={() => handleStartEdit('question_description', true, part.id)}
                          className={readOnly ? "pointer-events-none" : ""}
                        />
                      )}
                    </div>
                    
                    {/* Part metadata */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Difficulty:</span>{' '}
                        {editingField?.field === 'difficulty' && editingField.isSubQuestion && editingField.subQuestionId === part.id ? (
                          <EditableSelect
                            value={normalizeQuestionDifficulty(part.difficulty || 'medium')}
                            onSave={handleSave}
                            onCancel={handleCancelEdit}
                            options={difficultyOptions}
                          />
                        ) : (
                          <EditableDisplay
                            value={part.difficulty || 'medium'}
                            onEdit={() => handleStartEdit('difficulty', true, part.id)}
                            displayValue={<span className="capitalize">{part.difficulty || 'medium'}</span>}
                            className={readOnly ? "pointer-events-none" : ""}
                          />
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Status:</span>{' '}
                        {editingField?.field === 'status' && editingField.isSubQuestion && editingField.subQuestionId === part.id ? (
                          <EditableSelect
                            value={part.status || 'active'}
                            onSave={handleSave}
                            onCancel={handleCancelEdit}
                            options={statusOptions}
                          />
                        ) : (
                          <EditableDisplay
                            value={part.status || 'active'}
                            onEdit={() => handleStartEdit('status', true, part.id)}
                            displayValue={<span className="capitalize">{part.status || 'active'}</span>}
                            className={readOnly ? "pointer-events-none" : ""}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}