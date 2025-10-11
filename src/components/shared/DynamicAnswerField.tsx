// src/components/shared/DynamicAnswerField.tsx

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Calculator,
  Beaker,
  Book,
  Globe,
  Music,
  Palette,
  Check,
  CheckCircle2,
  X,
  ChevronRight,
  Ruler,
  FlaskConical,
  Microscope,
  Sigma,
  Plus,
  Trash2,
  Copy,
  Link as LinkIcon
} from 'lucide-react';
import ScientificEditor from './ScientificEditor';
import Button from './Button';
import { cn } from '@/lib/utils';

// Type definitions
interface CorrectAnswer {
  answer: string;
  marks?: number;
  alternative_id?: number;
  linked_alternatives?: number[];
  alternative_type?: string;
  context?: {
    type: string;
    value: string;
    label?: string;
  };
  unit?: string;
  measurement_details?: any;
  accepts_equivalent_phrasing?: boolean;
  error_carried_forward?: boolean;
}

interface AnswerComponent {
  id: string;
  type: 'text' | 'numeric' | 'formula' | 'diagram' | 'measurement' | 'chemical';
  label?: string;
  required: boolean;
  marks?: number;
  validationRules?: {
    pattern?: string;
    min?: number;
    max?: number;
    precision?: number;
    units?: string[];
    acceptableRange?: {
      min: number;
      max: number;
    };
  };
}

interface ContextRequirement {
  type: string;
  required: boolean;
  label?: string;
  placeholder?: string;
  options?: string[];
}

interface SubjectSpecificConfig {
  physics?: {
    instruments?: string[];
    measurementPrecision?: number;
    uncertaintyRequired?: boolean;
  };
  chemistry?: {
    allowStructuralFormulas?: boolean;
    stateSymbolsRequired?: boolean;
    oxidationStatesRequired?: boolean;
  };
  biology?: {
    acceptLatinNames?: boolean;
    diagramLabelsRequired?: boolean;
    acceptCommonNames?: boolean;
  };
  mathematics?: {
    workingRequired?: boolean;
    methodMarks?: number;
    significantFigures?: number;
  };
}

interface AnswerFieldProps {
  question: {
    id: string;
    type: 'mcq' | 'tf' | 'descriptive';
    subject?: string;
    answer_format?: string;
    options?: { label: string; text: string; is_correct?: boolean }[];
    correct_answers?: CorrectAnswer[];
    correct_answer?: string;
    answer_requirement?: string;
    total_alternatives?: number;
    marks: number;
    figure?: boolean;
    attachments?: string[];
  };
  value?: any;
  onChange: (value: any) => void;
  onValidate?: (value: any) => { isValid: boolean; errors: string[] };
  disabled?: boolean;
  showHints?: boolean;
  showCorrectAnswer?: boolean;
  mode?: 'practice' | 'exam' | 'review' | 'admin';
  // New optional props
  answerComponents?: AnswerComponent[];
  contextRequirements?: ContextRequirement[];
  validationMode?: 'strict' | 'flexible' | 'owtte' | 'ora';
  subjectSpecificConfig?: SubjectSpecificConfig;
}

const DynamicAnswerField: React.FC<AnswerFieldProps> = ({
  question,
  value,
  onChange,
  onValidate,
  disabled = false,
  showHints = false,
  showCorrectAnswer = false,
  mode = 'practice',
  answerComponents,
  contextRequirements,
  validationMode = 'flexible',
  subjectSpecificConfig
}) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [textAnswers, setTextAnswers] = useState<{ [key: string]: string }>({});
  const [contextAnswers, setContextAnswers] = useState<{ [key: string]: string }>({});
  const [componentAnswers, setComponentAnswers] = useState<{ [key: string]: any }>({});
  const [validation, setValidation] = useState<{ isValid: boolean; errors: string[] }>({ isValid: true, errors: [] });
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showAllCorrectAnswers, setShowAllCorrectAnswers] = useState(false);
  const [measurementUnits, setMeasurementUnits] = useState<{ [key: string]: string }>({});
  
  // Admin mode states
  const [adminCorrectAnswers, setAdminCorrectAnswers] = useState<CorrectAnswer[]>([]);
  const [editingAnswerIndex, setEditingAnswerIndex] = useState<number | null>(null);

  // Get subject icon
  const getSubjectIcon = () => {
    const subject = question.subject?.toLowerCase() || '';
    if (subject.includes('math')) return <Calculator className="w-4 h-4" />;
    if (subject.includes('chemistry')) return <Beaker className="w-4 h-4" />;
    if (subject.includes('physics')) return <Calculator className="w-4 h-4" />;
    if (subject.includes('biology')) return <Beaker className="w-4 h-4" />;
    if (subject.includes('geography')) return <Globe className="w-4 h-4" />;
    if (subject.includes('music')) return <Music className="w-4 h-4" />;
    if (subject.includes('art')) return <Palette className="w-4 h-4" />;
    return <Book className="w-4 h-4" />;
  };

  // Get subject-specific icon for components
  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'measurement': return <Ruler className="w-4 h-4" />;
      case 'chemical': return <FlaskConical className="w-4 h-4" />;
      case 'formula': return <Sigma className="w-4 h-4" />;
      case 'diagram': return <Microscope className="w-4 h-4" />;
      default: return <Calculator className="w-4 h-4" />;
    }
  };

  // Helper to get answer requirement label
  const getAnswerRequirementLabel = (requirement?: string) => {
    switch (requirement) {
      case 'any_one_from': return 'Any one answer from the list';
      case 'any_two_from': return 'Any two answers from the list';
      case 'any_three_from': return 'Any three answers from the list';
      case 'both_required': return 'Both answers required';
      case 'all_required': return 'All answers required';
      case 'alternative_methods': return 'Alternative methods accepted';
      case 'acceptable_variations': return 'Acceptable variations allowed';
      default: return null;
    }
  };

  // Helper to parse answer requirement count
  const getRequiredAnswerCount = (requirement?: string): number => {
    switch (requirement) {
      case 'any_one_from': return 1;
      case 'any_two_from': return 2;
      case 'any_three_from': return 3;
      case 'both_required': return 2;
      case 'all_required': return question.correct_answers?.length || 1;
      default: return 1;
    }
  };

  // Helper to format chemical formulas
  const formatChemicalFormula = (formula: string) => {
    // Convert numbers to subscripts for chemical formulas
    const subscripts = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
    return formula.replace(/(\d+)/g, (match) => {
      return match.split('').map(d => subscripts[parseInt(d)] || d).join('');
    });
  };

  // Initialize value from props
  useEffect(() => {
    if (mode === 'admin' && question.correct_answers) {
      setAdminCorrectAnswers(question.correct_answers);
    } else if (value) {
      if (question.type === 'mcq') {
        setSelectedOptions(Array.isArray(value) ? value : [value]);
        setHasAnswered(true);
      } else if (question.type === 'descriptive') {
        if (typeof value === 'object') {
          const { main, components, context, units, ...rest } = value;
          setTextAnswers({ main, ...rest });
          if (components) setComponentAnswers(components);
          if (context) setContextAnswers(context);
          if (units) setMeasurementUnits(units);
        } else {
          setTextAnswers({ main: value });
        }
      }
    }
  }, [value, question.type, mode, question.correct_answers]);

  // Admin mode handlers
  const handleAddCorrectAnswer = () => {
    const newAnswer: CorrectAnswer = {
      answer: '',
      marks: 1,
      alternative_id: adminCorrectAnswers.length + 1,
      linked_alternatives: [],
      alternative_type: 'standalone'
    };
    
    // Determine default marks based on answer requirement
    const totalMarks = question.marks;
    const currentAnswerCount = adminCorrectAnswers.length;
    const expectedCount = getRequiredAnswerCount(question.answer_requirement);
    
    if (expectedCount > 1 && currentAnswerCount < expectedCount) {
      newAnswer.marks = Math.floor(totalMarks / expectedCount);
    }
    
    // Auto-link if answer requirement suggests it
    if (question.answer_requirement === 'both_required' || 
        question.answer_requirement === 'all_required') {
      newAnswer.alternative_type = 'all_required';
      newAnswer.linked_alternatives = adminCorrectAnswers.map(a => a.alternative_id || 0);
      
      // Update existing answers to link to this new one
      const updatedAnswers = adminCorrectAnswers.map(a => ({
        ...a,
        linked_alternatives: [...(a.linked_alternatives || []), newAnswer.alternative_id || 0],
        alternative_type: 'all_required' as const
      }));
      
      setAdminCorrectAnswers([...updatedAnswers, newAnswer]);
    } else if (question.answer_requirement?.includes('any_')) {
      newAnswer.alternative_type = 'one_required';
      setAdminCorrectAnswers([...adminCorrectAnswers, newAnswer]);
    } else {
      setAdminCorrectAnswers([...adminCorrectAnswers, newAnswer]);
    }
    
    setEditingAnswerIndex(adminCorrectAnswers.length);
    onChange([...adminCorrectAnswers, newAnswer]);
  };

  const handleUpdateCorrectAnswer = (index: number, field: keyof CorrectAnswer, value: any) => {
    const updatedAnswers = [...adminCorrectAnswers];
    updatedAnswers[index] = { ...updatedAnswers[index], [field]: value };
    setAdminCorrectAnswers(updatedAnswers);
    onChange(updatedAnswers);
  };

  const handleDeleteCorrectAnswer = (index: number) => {
    if (adminCorrectAnswers.length <= 1) {
      // Don't allow deleting the last answer
      return;
    }

    const answerToDelete = adminCorrectAnswers[index];

    // Show confirmation for non-empty answers
    if (answerToDelete.answer.trim() &&
        !window.confirm(`Are you sure you want to delete this answer: "${answerToDelete.answer}"?`)) {
      return;
    }

    const updatedAnswers = adminCorrectAnswers.filter((_, i) => i !== index);
    // Re-index alternative IDs
    const reindexedAnswers = updatedAnswers.map((ans, i) => ({
      ...ans,
      alternative_id: i + 1
    }));
    setAdminCorrectAnswers(reindexedAnswers);
    onChange(reindexedAnswers);
  };

  const handleDuplicateAnswer = (index: number) => {
    const answerToDuplicate = adminCorrectAnswers[index];
    const newAnswer: CorrectAnswer = {
      ...answerToDuplicate,
      alternative_id: adminCorrectAnswers.length + 1,
      answer: answerToDuplicate.answer + ' (copy)'
    };
    setAdminCorrectAnswers([...adminCorrectAnswers, newAnswer]);
    onChange([...adminCorrectAnswers, newAnswer]);
  };

  // Render Admin Mode Editor
  const renderAdminModeEditor = () => {
    const requirementLabel = getAnswerRequirementLabel(question.answer_requirement);
    const expectedCount = getRequiredAnswerCount(question.answer_requirement);
    const currentCount = adminCorrectAnswers.length;
    
    return (
      <div className="space-y-4">
        {/* Header with requirement info */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Correct Answers
            </h4>
            {requirementLabel && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {requirementLabel}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {expectedCount > 1 && (
              <span className={cn(
                "text-xs px-2 py-1 rounded-full",
                currentCount >= expectedCount
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
              )}>
                {currentCount}/{expectedCount} answers
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddCorrectAnswer}
              disabled={question.answer_requirement === 'both_required' && currentCount >= 2}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Answer
            </Button>
          </div>
        </div>

        {/* Answer list */}
        <div className="space-y-3">
          {adminCorrectAnswers.map((answer, index) => (
            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">
                  #{index + 1}
                </span>
                
                <div className="flex-1 space-y-3">
                  {/* Answer input based on format */}
                  {renderAnswerInput(
                    answer.answer,
                    (value) => handleUpdateCorrectAnswer(index, 'answer', value),
                    question.answer_format,
                    editingAnswerIndex === index
                  )}
                  
                  {/* Marks allocation */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600 dark:text-gray-400">
                        Marks:
                      </label>
                      <input
                        type="number"
                        value={answer.marks || 1}
                        onChange={(e) => handleUpdateCorrectAnswer(index, 'marks', parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 text-sm border rounded dark:bg-gray-800"
                        min="0"
                        max={question.marks}
                      />
                    </div>
                    
                    {/* Alternative type for multiple answers */}
                    {adminCorrectAnswers.length > 1 && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600 dark:text-gray-400">
                          Type:
                        </label>
                        <select
                          value={answer.alternative_type || 'standalone'}
                          onChange={(e) => handleUpdateCorrectAnswer(index, 'alternative_type', e.target.value)}
                          className="px-2 py-1 text-sm border rounded dark:bg-gray-800"
                        >
                          <option value="standalone">Standalone</option>
                          <option value="one_required">One Required</option>
                          <option value="all_required">All Required</option>
                        </select>
                      </div>
                    )}
                    
                    {/* Context for special cases */}
                    {(question.subject?.toLowerCase().includes('physics') || 
                      question.subject?.toLowerCase().includes('chemistry')) && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600 dark:text-gray-400">
                          Unit:
                        </label>
                        <input
                          type="text"
                          value={answer.unit || ''}
                          onChange={(e) => handleUpdateCorrectAnswer(index, 'unit', e.target.value)}
                          className="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-800"
                          placeholder="e.g., m/s"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Additional options */}
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={answer.accepts_equivalent_phrasing || false}
                        onChange={(e) => handleUpdateCorrectAnswer(index, 'accepts_equivalent_phrasing', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-gray-600 dark:text-gray-400">Accept equivalent phrasing (owtte)</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={answer.error_carried_forward || false}
                        onChange={(e) => handleUpdateCorrectAnswer(index, 'error_carried_forward', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-gray-600 dark:text-gray-400">Error carried forward (ecf)</span>
                    </label>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicateAnswer(index)}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    title="Duplicate answer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCorrectAnswer(index)}
                    disabled={adminCorrectAnswers.length <= 1}
                    className={cn(
                      "p-1",
                      adminCorrectAnswers.length <= 1
                        ? "text-gray-300 cursor-not-allowed dark:text-gray-600"
                        : "text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    )}
                    title={adminCorrectAnswers.length <= 1 ? "Cannot delete the last answer" : "Delete answer"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic fields based on answer requirement */}
        {renderDynamicAnswerFields()}
      </div>
    );
  };

  // Render answer input based on format
  const renderAnswerInput = (
    value: string,
    onChange: (value: string) => void,
    format?: string,
    isEditing: boolean = false
  ) => {
    const needsScientificEditor = ['equation', 'calculation', 'structural_diagram', 'chemical_structure'].includes(format || '') ||
      ['math', 'physics', 'chemistry'].some(s => question.subject?.toLowerCase().includes(s));

    if (needsScientificEditor) {
      return (
        <ScientificEditor
          value={value}
          onChange={onChange}
          disabled={disabled && !isEditing}
          subject={question.subject}
          format={format}
          placeholder="Enter answer"
        />
      );
    }

    if (format === 'multi_line' || format === 'multi_line_labeled') {
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled && !isEditing}
          rows={3}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          placeholder="Enter answer"
        />
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled && !isEditing}
        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
        placeholder="Enter answer"
      />
    );
  };

  // Render dynamic answer fields based on requirement
  const renderDynamicAnswerFields = () => {
    const requirement = question.answer_requirement;
    const format = question.answer_format;
    
    if (!requirement) return null;
    
    // Two items connected (e.g., "X AND Y")
    if (requirement === 'both_required' || format === 'two_items_connected') {
      if (adminCorrectAnswers.length < 2) {
        return (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              This question requires two connected answers. Please add another answer.
            </p>
          </div>
        );
      }
      
      return (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
            Connection pattern:
          </p>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded border">
              {adminCorrectAnswers[0]?.answer || 'First answer'}
            </span>
            <LinkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-700 dark:text-blue-300">AND</span>
            <LinkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded border">
              {adminCorrectAnswers[1]?.answer || 'Second answer'}
            </span>
          </div>
        </div>
      );
    }
    
    // Multiple alternatives with specific count
    if (requirement.includes('any_')) {
      const requiredCount = getRequiredAnswerCount(requirement);
      return (
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <p className="text-sm text-purple-700 dark:text-purple-300">
            Students must provide {requiredCount} answer{requiredCount > 1 ? 's' : ''} from the list of {adminCorrectAnswers.length} alternatives.
          </p>
          {adminCorrectAnswers.length < requiredCount && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              ⚠️ You need at least {requiredCount} correct answers for this requirement.
            </p>
          )}
        </div>
      );
    }
    
    return null;
  };

  // Enhanced validation with validation modes
  const performValidation = (answers: any) => {
    const errors: string[] = [];
    
    if (mode === 'admin') {
      // Validate admin mode answers
      if (adminCorrectAnswers.length === 0) {
        errors.push('At least one correct answer is required');
      }
      
      // Check for empty answers
      adminCorrectAnswers.forEach((ans, idx) => {
        if (!ans.answer.trim()) {
          errors.push(`Answer #${idx + 1} cannot be empty`);
        }
      });
      
      // Validate against answer requirement
      const requiredCount = getRequiredAnswerCount(question.answer_requirement);
      if (question.answer_requirement && adminCorrectAnswers.length < requiredCount) {
        errors.push(`This question requires at least ${requiredCount} correct answer(s)`);
      }
      
      // Validate marks allocation
      const totalMarks = adminCorrectAnswers.reduce((sum, ans) => sum + (ans.marks || 0), 0);
      if (totalMarks > question.marks) {
        errors.push(`Total marks (${totalMarks}) exceed question marks (${question.marks})`);
      }
    } else {
      // Existing validation logic for student answers
      // Check answer components if defined
      if (answerComponents) {
        answerComponents.forEach(component => {
          if (component.required && !componentAnswers[component.id]) {
            errors.push(`${component.label || component.type} is required`);
          }
          
          // Apply validation rules
          if (component.validationRules && componentAnswers[component.id]) {
            const value = componentAnswers[component.id];
            const rules = component.validationRules;
            
            if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
              errors.push(`${component.label || component.type} format is invalid`);
            }
            
            if (component.type === 'numeric' || component.type === 'measurement') {
              const numValue = parseFloat(value);
              if (rules.min !== undefined && numValue < rules.min) {
                errors.push(`${component.label || 'Value'} must be at least ${rules.min}`);
              }
              if (rules.max !== undefined && numValue > rules.max) {
                errors.push(`${component.label || 'Value'} must be at most ${rules.max}`);
              }
              if (rules.acceptableRange) {
                if (numValue < rules.acceptableRange.min || numValue > rules.acceptableRange.max) {
                  errors.push(`${component.label || 'Value'} must be between ${rules.acceptableRange.min} and ${rules.acceptableRange.max}`);
                }
              }
            }
          }
        });
      }
      
      // Check context requirements
      if (contextRequirements) {
        contextRequirements.forEach(req => {
          if (req.required && !contextAnswers[req.type]) {
            errors.push(`${req.label || req.type} is required`);
          }
        });
      }
      
      // Subject-specific validation
      if (subjectSpecificConfig) {
        const subject = question.subject?.toLowerCase() || '';
        
        if (subject.includes('physics') && subjectSpecificConfig.physics?.uncertaintyRequired) {
          const hasUncertainty = Object.values(componentAnswers).some(v => 
            typeof v === 'string' && v.includes('±')
          );
          if (!hasUncertainty) {
            errors.push('Measurement uncertainty is required');
          }
        }
        
        if (subject.includes('chemistry') && subjectSpecificConfig.chemistry?.stateSymbolsRequired) {
          const hasStateSymbols = Object.values(textAnswers).some(v => 
            typeof v === 'string' && /\([slagq]\)/.test(v)
          );
          if (!hasStateSymbols) {
            errors.push('State symbols are required');
          }
        }
      }
    }
    
    setValidation({ isValid: errors.length === 0, errors });
    if (onValidate) {
      onValidate(answers);
    }
  };

  // MCQ Handler
  const handleMCQSelection = (option: string) => {
    if (hasAnswered && mode === 'practice' && showCorrectAnswer) {
      return;
    }

    let newSelection: string[];
    
    // Check answer requirement for multiple selection
    const requiresMultiple = question.answer_requirement?.includes('any_two') || 
                           question.answer_requirement?.includes('any_three') ||
                           question.answer_requirement?.includes('both_required') ||
                           question.answer_requirement?.includes('all_required');
    
    if (requiresMultiple) {
      // Handle multiple selection
      const match = question.answer_requirement?.match(/any_(\w+)_from/);
      const maxSelections = match ? 
        (match[1] === 'two' ? 2 : match[1] === 'three' ? 3 : parseInt(match[1]) || 1) 
        : getAllCorrectAnswers().length;
      
      if (selectedOptions.includes(option)) {
        newSelection = selectedOptions.filter(o => o !== option);
      } else if (selectedOptions.length < maxSelections) {
        newSelection = [...selectedOptions, option];
      } else {
        // Replace oldest selection
        newSelection = [...selectedOptions.slice(1), option];
      }
    } else {
      // Default MCQ behavior - single selection only
      newSelection = [option];
    }
    
    setSelectedOptions(newSelection);
    setHasAnswered(true);
    
    // Return appropriate value format
    const valueToReturn = requiresMultiple ? newSelection : newSelection[0];
    onChange(valueToReturn);
  };

  // True/False Handler
  const handleTrueFalse = (value: boolean) => {
    if (hasAnswered && mode === 'practice' && showCorrectAnswer) {
      return;
    }
    setHasAnswered(true);
    onChange(value);
  };

  // Get all correct answers for the question
  const getAllCorrectAnswers = (): string[] => {
    const answers: string[] = [];
    
    if (question.correct_answer) {
      answers.push(question.correct_answer);
    }
    
    if (question.correct_answers) {
      question.correct_answers.forEach(ca => {
        if (ca.answer && !answers.includes(ca.answer)) {
          answers.push(ca.answer);
        }
      });
    }
    
    if (question.options) {
      question.options.forEach(opt => {
        if (opt.is_correct && !answers.includes(opt.label)) {
          answers.push(opt.label);
        }
      });
    }
    
    return answers;
  };

  // Check if an option is correct
  const isOptionCorrect = (optionLabel: string) => {
    return question.correct_answer === optionLabel ||
           question.correct_answers?.some(ca => ca.answer === optionLabel) ||
           question.options?.find(o => o.label === optionLabel)?.is_correct;
  };

  // Render Contextual Input
  const renderContextualInput = () => {
    if (!contextRequirements || contextRequirements.length === 0) {
      return null;
    }

    return (
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-3">
          Additional Context
        </h4>
        <div className="space-y-2">
          {contextRequirements.map((req, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <label className="text-sm text-blue-600 dark:text-blue-400 min-w-[100px]">
                {req.label || req.type}:
                {req.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {req.options ? (
                <select
                  value={contextAnswers[req.type] || ''}
                  onChange={(e) => {
                    const newContext = { ...contextAnswers, [req.type]: e.target.value };
                    setContextAnswers(newContext);
                    onChange({ ...value, context: newContext });
                  }}
                  disabled={disabled}
                  className="flex-1 px-3 py-1 border rounded-md bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="">Select {req.label}</option>
                  {req.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={contextAnswers[req.type] || ''}
                  onChange={(e) => {
                    const newContext = { ...contextAnswers, [req.type]: e.target.value };
                    setContextAnswers(newContext);
                    onChange({ ...value, context: newContext });
                  }}
                  placeholder={req.placeholder || `Enter ${req.label}`}
                  disabled={disabled}
                  className="flex-1 px-3 py-1 border rounded-md bg-white dark:bg-gray-800 text-sm"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render Alternative Groups
  const renderAlternativeGroups = () => {
    if (!question.correct_answers || question.correct_answers.length <= 1) {
      return null;
    }

    const groupedAlternatives = question.correct_answers.reduce((acc, ca) => {
      const group = ca.context?.value || 'default';
      if (!acc[group]) acc[group] = [];
      acc[group].push(ca);
      return acc;
    }, {} as Record<string, CorrectAnswer[]>);

    if (Object.keys(groupedAlternatives).length <= 1) {
      return null;
    }

    return (
      <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
        <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-3">
          Alternative Answer Groups
        </h4>
        <div className="space-y-3">
          {Object.entries(groupedAlternatives).map(([group, alternatives]) => (
            <div key={group} className="border-l-2 border-purple-300 dark:border-purple-600 pl-3">
              <h5 className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                {group.replace(/_/g, ' ').toUpperCase()}
              </h5>
              <div className="space-y-1">
                {alternatives.map((alt, idx) => (
                  <div key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                    • {alt.answer}
                    {alt.marks !== undefined && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({alt.marks} mark{alt.marks !== 1 ? 's' : ''})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render Measurement Input
  const renderMeasurementInput = () => {
    const physicsConfig = subjectSpecificConfig?.physics;
    const instruments = physicsConfig?.instruments || ['ruler', 'stopwatch', 'thermometer', 'balance'];
    
    return (
      <div className="space-y-3">
        {answerComponents?.filter(c => c.type === 'measurement').map((component) => (
          <div key={component.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {component.label || 'Measurement'}
                {component.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="number"
                step={physicsConfig?.measurementPrecision || 0.01}
                value={componentAnswers[component.id] || ''}
                onChange={(e) => {
                  const newAnswers = { ...componentAnswers, [component.id]: e.target.value };
                  setComponentAnswers(newAnswers);
                  onChange({ ...value, components: newAnswers });
                  performValidation({ ...value, components: newAnswers });
                }}
                disabled={disabled}
                className="flex-1 px-3 py-2 border rounded-md bg-white dark:bg-gray-800"
                placeholder="Value"
              />
              
              {physicsConfig?.uncertaintyRequired && (
                <>
                  <span className="text-gray-600 dark:text-gray-400">±</span>
                  <input
                    type="number"
                    step={0.01}
                    value={componentAnswers[`${component.id}_uncertainty`] || ''}
                    onChange={(e) => {
                      const newAnswers = { 
                        ...componentAnswers, 
                        [`${component.id}_uncertainty`]: e.target.value 
                      };
                      setComponentAnswers(newAnswers);
                      onChange({ ...value, components: newAnswers });
                    }}
                    disabled={disabled}
                    className="w-20 px-2 py-2 border rounded-md bg-white dark:bg-gray-800"
                    placeholder="0.0"
                  />
                </>
              )}
              
              <select
                value={measurementUnits[component.id] || ''}
                onChange={(e) => {
                  const newUnits = { ...measurementUnits, [component.id]: e.target.value };
                  setMeasurementUnits(newUnits);
                  onChange({ ...value, units: newUnits });
                }}
                disabled={disabled}
                className="w-24 px-2 py-2 border rounded-md bg-white dark:bg-gray-800"
              >
                <option value="">Unit</option>
                {component.validationRules?.units?.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
            
            {instruments.length > 0 && (
              <div className="mt-2">
                <select
                  value={contextAnswers[`${component.id}_instrument`] || ''}
                  onChange={(e) => {
                    const newContext = { 
                      ...contextAnswers, 
                      [`${component.id}_instrument`]: e.target.value 
                    };
                    setContextAnswers(newContext);
                    onChange({ ...value, context: newContext });
                  }}
                  disabled={disabled}
                  className="w-full px-3 py-1 text-sm border rounded-md bg-white dark:bg-gray-800"
                >
                  <option value="">Select instrument used</option>
                  {instruments.map(inst => (
                    <option key={inst} value={inst}>
                      {inst.charAt(0).toUpperCase() + inst.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render Chemical Input
  const renderChemicalInput = () => {
    const chemConfig = subjectSpecificConfig?.chemistry;
    
    return (
      <div className="space-y-3">
        {answerComponents?.filter(c => c.type === 'chemical').map((component) => (
          <div key={component.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {component.label || 'Chemical Formula'}
                {component.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            </div>
            
            <div className="space-y-2">
              <input
                type="text"
                value={componentAnswers[component.id] || ''}
                onChange={(e) => {
                  const newAnswers = { ...componentAnswers, [component.id]: e.target.value };
                  setComponentAnswers(newAnswers);
                  onChange({ ...value, components: newAnswers });
                  performValidation({ ...value, components: newAnswers });
                }}
                disabled={disabled}
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800"
                placeholder={chemConfig?.allowStructuralFormulas ? "Enter formula or structure" : "Enter chemical formula"}
              />
              
              {chemConfig?.stateSymbolsRequired && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">State symbols:</span>
                  <div className="flex gap-1">
                    {['(s)', '(l)', '(g)', '(aq)'].map(state => (
                      <button
                        key={state}
                        type="button"
                        onClick={() => {
                          const current = componentAnswers[component.id] || '';
                          const newValue = current + ' ' + state;
                          const newAnswers = { ...componentAnswers, [component.id]: newValue };
                          setComponentAnswers(newAnswers);
                          onChange({ ...value, components: newAnswers });
                        }}
                        disabled={disabled}
                        className="px-2 py-1 text-xs border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {state}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {chemConfig?.oxidationStatesRequired && (
                <input
                  type="text"
                  value={componentAnswers[`${component.id}_oxidation`] || ''}
                  onChange={(e) => {
                    const newAnswers = { 
                      ...componentAnswers, 
                      [`${component.id}_oxidation`]: e.target.value 
                    };
                    setComponentAnswers(newAnswers);
                    onChange({ ...value, components: newAnswers });
                  }}
                  disabled={disabled}
                  className="w-full px-3 py-1 text-sm border rounded-md bg-white dark:bg-gray-800"
                  placeholder="Oxidation states (e.g., Fe: +3, O: -2)"
                />
              )}
            </div>
            
            {componentAnswers[component.id] && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Preview: {formatChemicalFormula(componentAnswers[component.id])}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Other render methods remain the same...
  // (renderMCQ, renderTrueFalse, renderDescriptive, etc.)
  // Just adding admin mode check at the beginning of each

  // Render MCQ Options
  const renderMCQ = () => {
    if (mode === 'admin') {
      return renderAdminModeEditor();
    }
    
    // Existing MCQ rendering logic...
    const shouldShowFeedback = (
      mode === 'review' ||
      mode === 'admin' ||
      (mode === 'practice' && showCorrectAnswer && hasAnswered)
    );
    const allCorrectAnswers = getAllCorrectAnswers();
    
    return (
      <div className="space-y-2">
        {question.answer_requirement && (
          <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <AlertCircle className="inline w-4 h-4 mr-1" />
              {getAnswerRequirementLabel(question.answer_requirement)}
            </p>
          </div>
        )}
        
        {question.options?.map((option) => {
          const isSelected = selectedOptions.includes(option.label);
          const isCorrect = isOptionCorrect(option.label);
          const isIncorrect = isSelected && !isCorrect;
          
          // Determine button state
          let buttonClass = 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400';
          let labelClass = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
          
          if (isSelected) {
            if (shouldShowFeedback) {
              if (isCorrect) {
                buttonClass = 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600';
                labelClass = 'bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300';
              } else {
                buttonClass = 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-600';
                labelClass = 'bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300';
              }
            } else {
              buttonClass = 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-600';
              labelClass = 'bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300';
            }
          } else if (shouldShowFeedback && isCorrect) {
            // Show correct answer even if not selected
            buttonClass = 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-600 opacity-75';
            labelClass = 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-400';
          }
          
          const isDisabled = disabled || (hasAnswered && mode === 'practice' && showCorrectAnswer);
          
          return (
            <button
              key={option.label}
              onClick={() => handleMCQSelection(option.label)}
              disabled={isDisabled}
              className={cn(
                "w-full p-3 rounded-lg border text-left transition-all",
                buttonClass,
                isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <span className={cn("font-semibold px-2 py-1 rounded", labelClass)}>
                    {option.label}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-gray-700 dark:text-gray-300">{option.text}</span>
                    {shouldShowFeedback && isCorrect && (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Correct answer
                      </span>
                    )}
                  </div>
                </div>
                {shouldShowFeedback && (
                  isSelected ? (
                    isCorrect ? <Check className="w-5 h-5 text-green-600 dark:text-green-400" /> : <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                  ) : (
                    isCorrect ? <Check className="w-5 h-5 text-green-600 dark:text-green-400 opacity-50" /> : null
                  )
                )}
              </div>
            </button>
          );
        })}
        
        {shouldShowFeedback && allCorrectAnswers.length > 1 && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            <p className="font-medium">Note: {allCorrectAnswers.length} correct answers available</p>
          </div>
        )}
      </div>
    );
  };

  // Render True/False
  const renderTrueFalse = () => {
    if (mode === 'admin') {
      return renderAdminModeEditor();
    }
    
    // Existing true/false rendering logic...
    const shouldShowFeedback = (
      mode === 'review' ||
      mode === 'admin' ||
      (mode === 'practice' && showCorrectAnswer && hasAnswered)
    );
    const correctAnswer = question.correct_answer?.toLowerCase() === 'true' || question.correct_answer === true;
    const isDisabled = disabled || (hasAnswered && mode === 'practice' && showCorrectAnswer);
    
    return (
      <div className="flex gap-4">
        <button
          onClick={() => handleTrueFalse(true)}
          disabled={isDisabled}
          className={cn(
            "flex-1 p-4 rounded-lg border font-medium transition-all",
            value === true 
              ? shouldShowFeedback
                ? correctAnswer
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-600 text-blue-700 dark:text-blue-300'
              : shouldShowFeedback && correctAnswer
                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-600 text-green-600 dark:text-green-400'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400',
            isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
          )}
        >
          <div className="flex flex-col items-center gap-1">
            <span>True</span>
            {shouldShowFeedback && correctAnswer && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> Correct answer
              </span>
            )}
            {shouldShowFeedback && value === true && !correctAnswer && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                <X className="h-3.5 w-3.5" /> Incorrect selection
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => handleTrueFalse(false)}
          disabled={isDisabled}
          className={cn(
            "flex-1 p-4 rounded-lg border font-medium transition-all",
            value === false 
              ? shouldShowFeedback
                ? !correctAnswer
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-600 text-blue-700 dark:text-blue-300'
              : shouldShowFeedback && !correctAnswer
                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-600 text-green-600 dark:text-green-400'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400',
            isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
          )}
        >
          <div className="flex flex-col items-center gap-1">
            <span>False</span>
            {shouldShowFeedback && !correctAnswer && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> Correct answer
              </span>
            )}
            {shouldShowFeedback && value === false && correctAnswer && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                <X className="h-3.5 w-3.5" /> Incorrect selection
              </span>
            )}
          </div>
        </button>
      </div>
    );
  };

  // Render Descriptive based on answer_format
  const renderDescriptive = () => {
    if (mode === 'admin') {
      return renderAdminModeEditor();
    }
    
    // Existing descriptive rendering logic remains the same...
    const format = question.answer_format;
    const needsScientificEditor = ['equation', 'calculation', 'structural_diagram'].includes(format || '') ||
      ['math', 'physics', 'chemistry'].some(s => question.subject?.toLowerCase().includes(s));

    // Use answer components if provided
    if (answerComponents && answerComponents.length > 0) {
      return (
        <div className="space-y-4">
          {/* Render specific component types */}
          {answerComponents.some(c => c.type === 'measurement') && renderMeasurementInput()}
          {answerComponents.some(c => c.type === 'chemical') && renderChemicalInput()}
          
          {/* Render other component types */}
          {answerComponents.filter(c => !['measurement', 'chemical'].includes(c.type)).map((component) => (
            <div key={component.id} className="space-y-2">
              <div className="flex items-center gap-2">
                {getComponentIcon(component.type)}
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {component.label || component.type}
                  {component.required && <span className="text-red-500 ml-1">*</span>}
                </label>
              </div>
              
              {component.type === 'formula' || needsScientificEditor ? (
                <ScientificEditor
                  value={componentAnswers[component.id] || ''}
                  onChange={(content) => {
                    const newAnswers = { ...componentAnswers, [component.id]: content };
                    setComponentAnswers(newAnswers);
                    onChange({ ...value, components: newAnswers });
                    performValidation({ ...value, components: newAnswers });
                  }}
                  disabled={disabled}
                  subject={question.subject}
                  format={format}
                  placeholder={`Enter ${component.label || component.type}`}
                />
              ) : (
                <input
                  type={component.type === 'numeric' ? 'number' : 'text'}
                  value={componentAnswers[component.id] || ''}
                  onChange={(e) => {
                    const newAnswers = { ...componentAnswers, [component.id]: e.target.value };
                    setComponentAnswers(newAnswers);
                    onChange({ ...value, components: newAnswers });
                    performValidation({ ...value, components: newAnswers });
                  }}
                  disabled={disabled}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  placeholder={`Enter ${component.label || component.type}`}
                />
              )}
            </div>
          ))}
          
          {renderContextualInput()}
          {renderAlternativeGroups()}
          {renderCorrectAnswers()}
        </div>
      );
    }

    // Single word or line
    if (format === 'single_word' || format === 'single_line') {
      return (
        <div>
          <input
            type="text"
            value={textAnswers.main || ''}
            onChange={(e) => {
              const newAnswers = { ...textAnswers, main: e.target.value };
              setTextAnswers(newAnswers);
              onChange(e.target.value);
              setHasAnswered(true);
              performValidation(e.target.value);
            }}
            disabled={disabled}
            placeholder={format === 'single_word' ? 'Enter one word' : 'Enter your answer'}
            className={cn(
              "w-full px-3 py-2 border rounded-lg",
              disabled ? 'bg-gray-100 dark:bg-gray-900' : 'bg-white dark:bg-gray-800',
              "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            )}
          />
          {renderCorrectAnswers()}
        </div>
      );
    }

    // Two items connected
    if (format === 'two_items_connected' || format === 'two_items') {
      return (
        <div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={textAnswers.item1 || ''}
              onChange={(e) => {
                const newAnswers = { ...textAnswers, item1: e.target.value };
                setTextAnswers(newAnswers);
                onChange(newAnswers);
                setHasAnswered(true);
                performValidation(newAnswers);
              }}
              disabled={disabled}
              placeholder="First item"
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
            <span className="font-medium text-gray-600 dark:text-gray-400">
              {format === 'two_items_connected' ? 'AND' : '&'}
            </span>
            <input
              type="text"
              value={textAnswers.item2 || ''}
              onChange={(e) => {
                const newAnswers = { ...textAnswers, item2: e.target.value };
                setTextAnswers(newAnswers);
                onChange(newAnswers);
                setHasAnswered(true);
                performValidation(newAnswers);
              }}
              disabled={disabled}
              placeholder="Second item"
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
          {renderCorrectAnswers()}
        </div>
      );
    }

    // Multi-line labeled
    if (format === 'multi_line_labeled') {
      const labels = question.correct_answers?.map((ca, idx) => 
        ca.context?.value?.split('_').pop()?.toUpperCase() || String.fromCharCode(65 + idx)
      ) || ['A', 'B', 'C', 'D'];
      
      return (
        <div className="space-y-2">
          {labels.slice(0, 4).map((label) => (
            <div key={label} className="flex items-start gap-2">
              <span className="font-semibold text-gray-600 dark:text-gray-400 mt-2">{label}:</span>
              <input
                type="text"
                value={textAnswers[label] || ''}
                onChange={(e) => {
                  const newAnswers = { ...textAnswers, [label]: e.target.value };
                  setTextAnswers(newAnswers);
                  onChange(newAnswers);
                  setHasAnswered(true);
                  performValidation(newAnswers);
                }}
                disabled={disabled}
                placeholder={`Enter answer for ${label}`}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
          ))}
          {renderCorrectAnswers()}
        </div>
      );
    }

    // Scientific/Mathematical content
    if (needsScientificEditor) {
      return (
        <div>
          <ScientificEditor
            value={textAnswers.main || ''}
            onChange={(content) => {
              const newAnswers = { ...textAnswers, main: content };
              setTextAnswers(newAnswers);
              onChange(content);
              setHasAnswered(true);
              performValidation(content);
            }}
            disabled={disabled}
            subject={question.subject}
            format={format}
            placeholder="Enter your answer using the scientific editor"
          />
          {renderCorrectAnswers()}
        </div>
      );
    }

    // Default multi-line
    return (
      <div>
        <textarea
          value={textAnswers.main || ''}
          onChange={(e) => {
            const newAnswers = { ...textAnswers, main: e.target.value };
            setTextAnswers(newAnswers);
            onChange(e.target.value);
            setHasAnswered(true);
            performValidation(e.target.value);
          }}
          disabled={disabled}
          rows={4}
          placeholder="Enter your answer"
          className={cn(
            "w-full px-3 py-2 border rounded-lg",
            disabled ? 'bg-gray-100 dark:bg-gray-900' : 'bg-white dark:bg-gray-800',
            "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          )}
        />
        {renderCorrectAnswers()}
      </div>
    );
  };

  // Render correct answers section
  const renderCorrectAnswers = () => {
    if (
      !showCorrectAnswer ||
      !(
        mode === 'review' ||
        mode === 'admin' ||
        (mode === 'practice' && hasAnswered)
      )
    ) {
      return null;
    }

    const requirementLabel = getAnswerRequirementLabel(question.answer_requirement);
    const hasMultipleAnswers = question.correct_answers && question.correct_answers.length > 0;
    const hasSingleAnswer = question.correct_answer && !hasMultipleAnswers;

    if (!hasSingleAnswer && !hasMultipleAnswers) {
      return null;
    }

    return (
      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-green-800 dark:text-green-300">
            Correct Answer{hasMultipleAnswers && question.correct_answers!.length > 1 ? 's' : ''}:
          </h4>
          {hasMultipleAnswers && question.correct_answers!.length > 2 && (
            <button
              onClick={() => setShowAllCorrectAnswers(!showAllCorrectAnswers)}
              className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
            >
              {showAllCorrectAnswers ? 'Show less' : `Show all ${question.correct_answers!.length} answers`}
              <ChevronRight className={cn("w-3 h-3 transition-transform", showAllCorrectAnswers && "rotate-90")} />
            </button>
          )}
        </div>

        {requirementLabel && (
          <p className="text-xs text-green-700 dark:text-green-400 mb-2 italic">
            {requirementLabel}
            {question.total_alternatives && (
              <span className="ml-1">
                (showing {hasMultipleAnswers ? question.correct_answers!.length : 1} of {question.total_alternatives} alternatives)
              </span>
            )}
          </p>
        )}

        {validationMode && (
          <div className="text-xs text-green-600 dark:text-green-500 mb-2">
            Validation mode: <span className="font-medium">{validationMode.toUpperCase()}</span>
          </div>
        )}

        {hasSingleAnswer && (
          <div className="text-sm text-green-700 dark:text-green-300">
            {question.subject?.toLowerCase().includes('chemistry') 
              ? formatChemicalFormula(question.correct_answer!)
              : question.correct_answer}
          </div>
        )}

        {hasMultipleAnswers && (
          <div className="space-y-1">
            {question.correct_answers!
              .slice(0, showAllCorrectAnswers ? undefined : 2)
              .map((ca, idx) => (
                <div key={ca.alternative_id || idx} className="text-sm">
                  <span className="text-green-700 dark:text-green-300">
                    • {question.subject?.toLowerCase().includes('chemistry') 
                        ? formatChemicalFormula(ca.answer)
                        : ca.answer}
                  </span>
                  {ca.context && (
                    <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                      ({ca.context.label || ca.context.value})
                    </span>
                  )}
                  {ca.marks !== undefined && (
                    <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                      [{ca.marks} mark{ca.marks !== 1 ? 's' : ''}]
                    </span>
                  )}
                </div>
              ))}
            {!showAllCorrectAnswers && hasMultipleAnswers && question.correct_answers!.length > 2 && (
              <div className="text-xs text-green-600 dark:text-green-400 italic">
                ...and {question.correct_answers!.length - 2} more
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Validation display
  const renderValidation = () => {
    if (!validation.errors.length) return null;
    
    return (
      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
        {validation.errors.map((error, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Subject indicator with enhanced info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          {getSubjectIcon()}
          <span>{question.subject || 'General'}</span>
          {question.answer_format && (
            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
              {question.answer_format.replace(/_/g, ' ')}
            </span>
          )}
          {validationMode && validationMode !== 'flexible' && (
            <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-xs">
              {validationMode.toUpperCase()}
            </span>
          )}
          {mode === 'admin' && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
              ADMIN MODE
            </span>
          )}
        </div>
        {question.marks && (
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {question.marks} mark{question.marks > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Answer input based on type */}
      {question.type === 'mcq' && renderMCQ()}
      {question.type === 'tf' && renderTrueFalse()}
      {question.type === 'descriptive' && renderDescriptive()}

      {/* Validation messages */}
      {renderValidation()}

      {/* Figure/attachment indicator */}
      {question.figure && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <AlertCircle className="inline w-4 h-4 mr-1" />
            This question includes visual elements
            {question.attachments && question.attachments.length > 0 && 
              `: ${question.attachments.join(', ')}`
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default DynamicAnswerField;