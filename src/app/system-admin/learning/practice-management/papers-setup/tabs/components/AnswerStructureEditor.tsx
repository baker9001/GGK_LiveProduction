// src/app/system-admin/learning/practice-management/papers-setup/tabs/components/AnswerStructureEditor.tsx

import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, Link, Unlink, Save, X, Eye, EyeOff,
  GitBranch, Tag, Hash, Info, AlertCircle, Check,
  ArrowRight, ArrowLeft, Copy, Move, Layers, Shield,
  Edit3, Code, List, Grid, Zap, Target
} from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { cn } from '../../../../../../../lib/utils';
import { Select } from '../../../../../../../components/shared/Select';

interface CorrectAnswer {
  answer: string;
  marks: number;
  alternative_id: number;
  linked_alternatives: number[];
  alternative_type: 'one_required' | 'all_required' | 'standalone';
  context: {
    type: string;
    value: string;
    label?: string;
  };
  abbreviations?: {
    ora?: boolean;
    owtte?: boolean;
    ecf?: boolean;
    cao?: boolean;
    ignore?: boolean;
    accept?: boolean;
    reject?: boolean;
  };
}

interface AnswerStructureEditorProps {
  question: any;
  answerStructure: CorrectAnswer[];
  onUpdate: (structure: CorrectAnswer[]) => void;
  extractionRules?: any;
  subjectContext?: string;
}

const CONTEXT_TYPES = [
  { value: 'option', label: 'Multiple Choice Option', description: 'For MCQ answers (A, B, C, etc.)' },
  { value: 'position', label: 'Position/Location', description: 'For diagram positions or locations' },
  { value: 'field', label: 'Form Field', description: 'For table or form fields' },
  { value: 'property', label: 'Property/Characteristic', description: 'For describing properties' },
  { value: 'step', label: 'Sequential Step', description: 'For step-by-step processes' },
  { value: 'component', label: 'Component Part', description: 'For parts of a whole' },
  { value: 'measurement', label: 'Measurement', description: 'For measured values' },
  { value: 'calculation', label: 'Calculation', description: 'For computed results' },
  { value: 'descriptive', label: 'Descriptive', description: 'For general descriptive answers' }
];

const ABBREVIATION_FLAGS = [
  { key: 'ora', label: 'ORA', tooltip: 'Or Reverse Argument - Accept reverse reasoning' },
  { key: 'owtte', label: 'OWTTE', tooltip: 'Or Words To That Effect - Accept equivalent phrasing' },
  { key: 'ecf', label: 'ECF', tooltip: 'Error Carried Forward - Accept consequential errors' },
  { key: 'cao', label: 'CAO', tooltip: 'Correct Answer Only - No partial credit' },
  { key: 'ignore', label: 'IGNORE', tooltip: 'Ignore this content in student answers' },
  { key: 'accept', label: 'ACCEPT', tooltip: 'Acceptable alternative answer' },
  { key: 'reject', label: 'REJECT', tooltip: 'Reject this answer explicitly' }
];

export function AnswerStructureEditor({
  question,
  answerStructure,
  onUpdate,
  extractionRules,
  subjectContext
}: AnswerStructureEditorProps) {
  const [localStructure, setLocalStructure] = useState<CorrectAnswer[]>(answerStructure);
  const [editMode, setEditMode] = useState<'visual' | 'json'>('visual');
  const [selectedAnswers, setSelectedAnswers] = useState<Set<number>>(new Set());
  const [linkingMode, setLinkingMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [jsonInput, setJsonInput] = useState('');

  useEffect(() => {
    setLocalStructure(answerStructure);
    setJsonInput(JSON.stringify(answerStructure, null, 2));
  }, [answerStructure]);

  // Validate structure
  const validateStructure = (): string[] => {
    const errors: string[] = [];
    
    // Check total marks
    const totalMarks = localStructure.reduce((sum, ans) => sum + ans.marks, 0);
    if (totalMarks !== question.marks) {
      errors.push(`Total marks (${totalMarks}) don't match question marks (${question.marks})`);
    }
    
    // Check alternative IDs are unique
    const ids = new Set<number>();
    localStructure.forEach(ans => {
      if (ids.has(ans.alternative_id)) {
        errors.push(`Duplicate alternative ID: ${ans.alternative_id}`);
      }
      ids.add(ans.alternative_id);
    });
    
    // Check linked alternatives exist
    localStructure.forEach(ans => {
      ans.linked_alternatives.forEach(linkedId => {
        if (!ids.has(linkedId)) {
          errors.push(`Alternative ${ans.alternative_id} links to non-existent ID: ${linkedId}`);
        }
      });
    });
    
    // Check context is present
    if (extractionRules?.contextRequired) {
      localStructure.forEach(ans => {
        if (!ans.context || !ans.context.type || !ans.context.value) {
          errors.push(`Alternative ${ans.alternative_id} missing context information`);
        }
      });
    }
    
    return errors;
  };

  // Add new answer
  const addAnswer = () => {
    const newId = Math.max(0, ...localStructure.map(a => a.alternative_id)) + 1;
    const newAnswer: CorrectAnswer = {
      answer: '',
      marks: 1,
      alternative_id: newId,
      linked_alternatives: [],
      alternative_type: 'standalone',
      context: {
        type: 'descriptive',
        value: 'general',
        label: ''
      },
      abbreviations: {}
    };
    
    setLocalStructure([...localStructure, newAnswer]);
  };

  // Remove answer
  const removeAnswer = (id: number) => {
    // Remove the answer and clean up any links to it
    const newStructure = localStructure
      .filter(ans => ans.alternative_id !== id)
      .map(ans => ({
        ...ans,
        linked_alternatives: ans.linked_alternatives.filter(linkId => linkId !== id)
      }));
    
    setLocalStructure(newStructure);
  };

  // Update answer field
  const updateAnswerField = (id: number, field: keyof CorrectAnswer, value: any) => {
    setLocalStructure(prev => prev.map(ans => 
      ans.alternative_id === id ? { ...ans, [field]: value } : ans
    ));
  };

  // Toggle abbreviation
  const toggleAbbreviation = (id: number, abbr: string) => {
    setLocalStructure(prev => prev.map(ans => {
      if (ans.alternative_id === id) {
        return {
          ...ans,
          abbreviations: {
            ...ans.abbreviations,
            [abbr]: !ans.abbreviations?.[abbr as keyof typeof ans.abbreviations]
          }
        };
      }
      return ans;
    }));
  };

  // Link/unlink alternatives
  const toggleLink = (fromId: number, toId: number) => {
    setLocalStructure(prev => prev.map(ans => {
      if (ans.alternative_id === fromId) {
        const linked = ans.linked_alternatives.includes(toId);
        return {
          ...ans,
          linked_alternatives: linked
            ? ans.linked_alternatives.filter(id => id !== toId)
            : [...ans.linked_alternatives, toId]
        };
      }
      return ans;
    }));
  };

  // Create link group
  const createLinkGroup = (type: 'one_required' | 'all_required') => {
    const selected = Array.from(selectedAnswers);
    if (selected.length < 2) return;
    
    setLocalStructure(prev => prev.map(ans => {
      if (selected.includes(ans.alternative_id)) {
        return {
          ...ans,
          linked_alternatives: selected.filter(id => id !== ans.alternative_id),
          alternative_type: type
        };
      }
      return ans;
    }));
    
    setSelectedAnswers(new Set());
    setLinkingMode(false);
  };

  // Auto-detect context
  const autoDetectContext = (answer: string): { type: string; value: string } => {
    // MCQ pattern
    if (/^[A-Z]$/.test(answer)) {
      return { type: 'option', value: answer };
    }
    
    // Position pattern
    if (/^(position|point|location)\s+[A-Z]$/i.test(answer)) {
      const match = answer.match(/[A-Z]$/);
      return { type: 'position', value: match?.[0] || 'A' };
    }
    
    // Step pattern
    if (/^step\s+\d+/i.test(answer)) {
      const match = answer.match(/\d+/);
      return { type: 'step', value: match?.[0] || '1' };
    }
    
    // Measurement pattern
    if (/\d+\s*(m|kg|s|°C|mol|L)/i.test(answer)) {
      return { type: 'measurement', value: answer };
    }
    
    // Default
    return { type: 'descriptive', value: 'general' };
  };

  // Save changes
  const saveChanges = () => {
    const validationErrors = validateStructure();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    onUpdate(localStructure);
    setErrors([]);
  };

  // Handle JSON mode
  const applyJsonChanges = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        throw new Error('Structure must be an array');
      }
      setLocalStructure(parsed);
      setEditMode('visual');
      setErrors([]);
    } catch (error) {
      setErrors([`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  };

  // Generate preview
  const generatePreview = () => {
    const groups: Map<string, CorrectAnswer[]> = new Map();
    
    // Group linked alternatives
    localStructure.forEach(ans => {
      if (ans.linked_alternatives.length > 0) {
        const groupKey = [ans.alternative_id, ...ans.linked_alternatives].sort().join('-');
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.set(groupKey, [...(groups.get(groupKey) || []), ans]);
      }
    });
    
    // Add standalone answers
    localStructure.forEach(ans => {
      if (ans.linked_alternatives.length === 0) {
        groups.set(`standalone-${ans.alternative_id}`, [ans]);
      }
    });
    
    return groups;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border">
        <div>
          <h3 className="text-lg font-semibold">Answer Structure Editor</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Question {question.question_number} - {question.marks} marks
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={editMode === 'visual' ? 'primary' : 'secondary'}
            onClick={() => setEditMode('visual')}
          >
            <Grid className="w-4 h-4 mr-1" />
            Visual
          </Button>
          <Button
            size="sm"
            variant={editMode === 'json' ? 'primary' : 'secondary'}
            onClick={() => {
              setEditMode('json');
              setJsonInput(JSON.stringify(localStructure, null, 2));
            }}
          >
            <Code className="w-4 h-4 mr-1" />
            JSON
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900 dark:text-red-100">Validation Errors</h4>
              <ul className="mt-2 text-sm text-red-700 dark:text-red-300 space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Visual Editor */}
      {editMode === 'visual' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={addAnswer}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Answer
              </Button>
              
              {selectedAnswers.size >= 2 && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => createLinkGroup('one_required')}
                  >
                    <GitBranch className="w-4 h-4 mr-1" />
                    Link as OR
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => createLinkGroup('all_required')}
                  >
                    <Link className="w-4 h-4 mr-1" />
                    Link as AND
                  </Button>
                </>
              )}
              
              <Button
                size="sm"
                variant={linkingMode ? 'primary' : 'secondary'}
                onClick={() => setLinkingMode(!linkingMode)}
              >
                <GitBranch className="w-4 h-4 mr-1" />
                {linkingMode ? 'Exit Linking' : 'Link Mode'}
              </Button>
            </div>
            
            <div className="text-sm text-gray-600">
              Total Marks: {localStructure.reduce((sum, ans) => sum + ans.marks, 0)} / {question.marks}
            </div>
          </div>

          {/* Answer Cards */}
          <div className="space-y-3">
            {localStructure.map((answer, index) => (
              <div
                key={answer.alternative_id}
                className={cn(
                  "bg-white dark:bg-gray-800 border rounded-lg p-4 transition-all",
                  selectedAnswers.has(answer.alternative_id) && "ring-2 ring-blue-500",
                  linkingMode && "cursor-pointer hover:shadow-md"
                )}
                onClick={() => {
                  if (linkingMode) {
                    setSelectedAnswers(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(answer.alternative_id)) {
                        newSet.delete(answer.alternative_id);
                      } else {
                        newSet.add(answer.alternative_id);
                      }
                      return newSet;
                    });
                  }
                }}
              >
                {/* Answer Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Alternative #{answer.alternative_id}
                    </span>
                    {answer.alternative_type !== 'standalone' && (
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        answer.alternative_type === 'one_required' 
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      )}>
                        {answer.alternative_type === 'one_required' ? 'OR' : 'AND'}
                      </span>
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAnswer(answer.alternative_id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>

                {/* Answer Content */}
                <div className="grid grid-cols-12 gap-4">
                  {/* Answer Text */}
                  <div className="col-span-6">
                    <label className="block text-sm font-medium mb-1">Answer Text</label>
                    <textarea
                      value={answer.answer}
                      onChange={(e) => updateAnswerField(answer.alternative_id, 'answer', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg resize-none"
                      rows={2}
                      placeholder="Enter answer text..."
                    />
                  </div>
                  
                  {/* Marks */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Marks</label>
                    <input
                      type="number"
                      value={answer.marks}
                      onChange={(e) => updateAnswerField(answer.alternative_id, 'marks', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg"
                      min={0}
                      max={question.marks}
                    />
                  </div>
                  
                  {/* Context Type */}
                  <div className="col-span-4">
                    <label className="block text-sm font-medium mb-1">Context Type</label>
                    <Select
                      value={answer.context.type}
                      onValueChange={(value) => updateAnswerField(answer.alternative_id, 'context', {
                        ...answer.context,
                        type: value
                      })}
                    >
                      <option value="">Select context type...</option>
                      {CONTEXT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Context Details */}
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Context Value</label>
                    <input
                      type="text"
                      value={answer.context.value}
                      onChange={(e) => updateAnswerField(answer.alternative_id, 'context', {
                        ...answer.context,
                        value: e.target.value
                      })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., A, Step 1, Position X..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Context Label (Optional)</label>
                    <input
                      type="text"
                      value={answer.context.label || ''}
                      onChange={(e) => updateAnswerField(answer.alternative_id, 'context', {
                        ...answer.context,
                        label: e.target.value
                      })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Human-readable description..."
                    />
                  </div>
                </div>

                {/* Abbreviation Flags */}
                <div className="mt-3">
                  <label className="block text-sm font-medium mb-2">Marking Flags</label>
                  <div className="flex flex-wrap gap-2">
                    {ABBREVIATION_FLAGS.map(flag => (
                      <button
                        key={flag.key}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAbbreviation(answer.alternative_id, flag.key);
                        }}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                          answer.abbreviations?.[flag.key as keyof typeof answer.abbreviations]
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400 hover:bg-gray-200"
                        )}
                        title={flag.tooltip}
                      >
                        {flag.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Linked Alternatives */}
                {answer.linked_alternatives.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <GitBranch className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Linked with: {answer.linked_alternatives.map(id => `#${id}`).join(', ')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JSON Editor */}
      {editMode === 'json' && (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Edit the JSON structure directly. Make sure to maintain valid JSON format.
            </p>
          </div>
          
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="w-full h-96 px-4 py-3 font-mono text-sm border rounded-lg"
            placeholder="Enter JSON structure..."
          />
          
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setEditMode('visual');
                setJsonInput(JSON.stringify(localStructure, null, 2));
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={applyJsonChanges}
            >
              Apply JSON
            </Button>
          </div>
        </div>
      )}

      {/* Preview */}
      {showPreview && (
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <h4 className="font-medium mb-3">Answer Structure Preview</h4>
          
          <div className="space-y-3">
            {Array.from(generatePreview().entries()).map(([key, group]) => (
              <div key={key} className="bg-white dark:bg-gray-800 p-3 rounded border">
                {group.length > 1 ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <GitBranch className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">
                        {group[0].alternative_type === 'one_required' ? 'Any ONE of:' : 'ALL required:'}
                      </span>
                    </div>
                    <ul className="ml-6 space-y-1">
                      {group.map(ans => (
                        <li key={ans.alternative_id} className="text-sm">
                          • {ans.answer} ({ans.marks} mark{ans.marks !== 1 ? 's' : ''})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-sm">
                    • {group[0].answer} ({group[0].marks} mark{group[0].marks !== 1 ? 's' : ''})
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          variant="secondary"
          onClick={() => setLocalStructure(answerStructure)}
        >
          Reset
        </Button>
        <Button
          variant="primary"
          onClick={saveChanges}
        >
          <Save className="w-4 h-4 mr-1" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}