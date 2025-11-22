/**
 * Structural Diagram Component for Labeled Diagrams
 *
 * Extends DiagramCanvas with a structured labeling system for
 * biology, chemistry, and physics diagrams requiring specific labels.
 */

import React, { useState, useCallback } from 'react';
import {
  Tag,
  Check,
  X,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';
import DiagramCanvas, { DiagramData } from '../DiagramCanvas/DiagramCanvas';
import Button from '@/components/shared/Button';
import { cn } from '@/lib/utils';

export interface Label {
  id: string;
  text: string;
  x: number;
  y: number;
  required: boolean;
  points: number;
}

export interface StructuralDiagramData {
  diagramData: DiagramData;
  labels: Label[];
  timestamp: string;
}

interface RequiredLabel {
  text: string;
  points: number;
  acceptableAlternatives?: string[];
}

interface StructuralDiagramProps {
  questionId: string;
  value: StructuralDiagramData | null;
  onChange: (data: StructuralDiagramData | null) => void;
  disabled?: boolean;
  width?: number;
  height?: number;
  backgroundImage?: string;
  requiredLabels?: RequiredLabel[];
  maxLabels?: number;
  showCorrectAnswer?: boolean;
  correctAnswerData?: StructuralDiagramData;
}

const StructuralDiagram: React.FC<StructuralDiagramProps> = ({
  questionId,
  value,
  onChange,
  disabled = false,
  width = 800,
  height = 600,
  backgroundImage,
  requiredLabels = [],
  maxLabels = 20,
  showCorrectAnswer = false,
  correctAnswerData
}) => {
  const [diagramData, setDiagramData] = useState<DiagramData | null>(value?.diagramData || null);
  const [labels, setLabels] = useState<Label[]>(value?.labels || []);
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');
  const [newLabelX, setNewLabelX] = useState('50');
  const [newLabelY, setNewLabelY] = useState('50');
  const [validation, setValidation] = useState<{ isValid: boolean; errors: string[]; warnings: string[] }>({
    isValid: true,
    errors: [],
    warnings: []
  });

  // Validate labels against requirements
  const validateLabels = useCallback((): { isValid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if all required labels are present
    requiredLabels.forEach(reqLabel => {
      const hasLabel = labels.some(label => {
        const labelText = label.text.toLowerCase().trim();
        const mainMatch = labelText === reqLabel.text.toLowerCase().trim();

        if (mainMatch) return true;

        // Check alternatives
        if (reqLabel.acceptableAlternatives) {
          return reqLabel.acceptableAlternatives.some(alt =>
            labelText === alt.toLowerCase().trim()
          );
        }

        return false;
      });

      if (!hasLabel) {
        errors.push(`Missing required label: "${reqLabel.text}"`);
      }
    });

    // Check for duplicate labels
    const labelTexts = labels.map(l => l.text.toLowerCase().trim());
    const duplicates = labelTexts.filter((text, index) => labelTexts.indexOf(text) !== index);
    if (duplicates.length > 0) {
      warnings.push(`Duplicate labels found: ${[...new Set(duplicates)].join(', ')}`);
    }

    // Check if maximum labels exceeded
    if (labels.length > maxLabels) {
      errors.push(`Too many labels (${labels.length}/${maxLabels})`);
    }

    // Check if diagram has been drawn
    if (!diagramData || !diagramData.json || diagramData.json === '{"objects":[]}') {
      warnings.push('No diagram elements drawn yet');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [labels, requiredLabels, maxLabels, diagramData]);

  // Add label
  const handleAddLabel = useCallback(() => {
    if (!newLabelText.trim()) {
      setValidation({
        isValid: false,
        errors: ['Label text cannot be empty'],
        warnings: []
      });
      return;
    }

    const x = parseFloat(newLabelX);
    const y = parseFloat(newLabelY);

    if (isNaN(x) || isNaN(y) || x < 0 || x > 100 || y < 0 || y > 100) {
      setValidation({
        isValid: false,
        errors: ['Label position must be between 0 and 100'],
        warnings: []
      });
      return;
    }

    if (labels.length >= maxLabels) {
      setValidation({
        isValid: false,
        errors: [`Maximum ${maxLabels} labels allowed`],
        warnings: []
      });
      return;
    }

    const newLabel: Label = {
      id: `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: newLabelText.trim(),
      x,
      y,
      required: requiredLabels.some(rl =>
        rl.text.toLowerCase() === newLabelText.toLowerCase().trim()
      ),
      points: requiredLabels.find(rl =>
        rl.text.toLowerCase() === newLabelText.toLowerCase().trim()
      )?.points || 1
    };

    const updatedLabels = [...labels, newLabel];
    setLabels(updatedLabels);
    setNewLabelText('');
    setNewLabelX('50');
    setNewLabelY('50');
    setIsAddingLabel(false);

    // Update parent
    const structuralData: StructuralDiagramData = {
      diagramData: diagramData || { json: '{}', timestamp: new Date().toISOString() },
      labels: updatedLabels,
      timestamp: new Date().toISOString()
    };
    onChange(structuralData);

    // Validate
    setTimeout(() => {
      setValidation(validateLabels());
    }, 100);
  }, [newLabelText, newLabelX, newLabelY, labels, maxLabels, requiredLabels, diagramData, onChange, validateLabels]);

  // Remove label
  const handleRemoveLabel = useCallback((labelId: string) => {
    const updatedLabels = labels.filter(l => l.id !== labelId);
    setLabels(updatedLabels);

    // Update parent
    const structuralData: StructuralDiagramData = {
      diagramData: diagramData || { json: '{}', timestamp: new Date().toISOString() },
      labels: updatedLabels,
      timestamp: new Date().toISOString()
    };
    onChange(structuralData);

    // Validate
    setTimeout(() => {
      setValidation(validateLabels());
    }, 100);
  }, [labels, diagramData, onChange, validateLabels]);

  // Handle diagram change
  const handleDiagramChange = useCallback((data: DiagramData | null) => {
    setDiagramData(data);

    // Update parent
    const structuralData: StructuralDiagramData = {
      diagramData: data || { json: '{}', timestamp: new Date().toISOString() },
      labels,
      timestamp: new Date().toISOString()
    };
    onChange(structuralData);
  }, [labels, onChange]);

  // Calculate label position on canvas
  const getLabelStyle = (label: Label) => {
    return {
      left: `${label.x}%`,
      top: `${label.y}%`,
      transform: 'translate(-50%, -50%)'
    };
  };

  // Check if label is in required list
  const isLabelCorrect = (label: Label): boolean => {
    return requiredLabels.some(rl => {
      const labelText = label.text.toLowerCase().trim();
      const mainMatch = labelText === rl.text.toLowerCase().trim();

      if (mainMatch) return true;

      if (rl.acceptableAlternatives) {
        return rl.acceptableAlternatives.some(alt =>
          labelText === alt.toLowerCase().trim()
        );
      }

      return false;
    });
  };

  return (
    <div className="space-y-4">
      {/* Diagram Canvas */}
      <div className="relative">
        <DiagramCanvas
          questionId={questionId}
          value={diagramData}
          onChange={handleDiagramChange}
          disabled={disabled}
          width={width}
          height={height}
          backgroundImage={backgroundImage}
          showCorrectAnswer={false}
          allowedTools={['pencil', 'line', 'arrow', 'eraser', 'text']}
        />

        {/* Label Overlays */}
        {!disabled && labels.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {labels.map(label => (
              <div
                key={label.id}
                style={getLabelStyle(label)}
                className="absolute pointer-events-auto"
              >
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium shadow-lg border-2",
                  showCorrectAnswer && isLabelCorrect(label)
                    ? "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-300"
                    : showCorrectAnswer
                    ? "bg-red-100 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-300"
                    : "bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-800 dark:text-blue-300"
                )}>
                  <Tag className="w-3 h-3" />
                  <span>{label.text}</span>
                  {!disabled && (
                    <button
                      onClick={() => handleRemoveLabel(label.id)}
                      className="ml-1 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Label Management */}
      {!disabled && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-300 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Labels ({labels.length}/{maxLabels})
            </h4>
            {!isAddingLabel && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddingLabel(true)}
                disabled={disabled || labels.length >= maxLabels}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Label
              </Button>
            )}
          </div>

          {/* Add Label Form */}
          {isAddingLabel && (
            <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Label Text
                  </label>
                  <input
                    type="text"
                    value={newLabelText}
                    onChange={(e) => setNewLabelText(e.target.value)}
                    placeholder="Enter label text"
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      X Position (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newLabelX}
                      onChange={(e) => setNewLabelX(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Y Position (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newLabelY}
                      onChange={(e) => setNewLabelY(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddLabel}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingLabel(false);
                      setNewLabelText('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Required Labels */}
          {requiredLabels.length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Required Labels:
              </h5>
              <div className="flex flex-wrap gap-2">
                {requiredLabels.map((reqLabel, idx) => {
                  const hasLabel = labels.some(l =>
                    l.text.toLowerCase().trim() === reqLabel.text.toLowerCase().trim() ||
                    reqLabel.acceptableAlternatives?.some(alt =>
                      l.text.toLowerCase().trim() === alt.toLowerCase().trim()
                    )
                  );

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        hasLabel
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      )}
                    >
                      {hasLabel ? <Check className="inline w-3 h-3 mr-1" /> : <X className="inline w-3 h-3 mr-1" />}
                      {reqLabel.text} ({reqLabel.points}pt)
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Current Labels List */}
          {labels.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Current Labels:
              </h5>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {labels.map(label => (
                  <div
                    key={label.id}
                    className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="w-3 h-3 text-gray-500" />
                      <span className="text-sm">{label.text}</span>
                      <span className="text-xs text-gray-500">
                        ({label.x.toFixed(0)}%, {label.y.toFixed(0)}%)
                      </span>
                      {label.required && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveLabel(label.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Messages */}
      {!validation.isValid && validation.errors.length > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-red-800 dark:text-red-300 mb-1">
                Validation Errors:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-red-700 dark:text-red-400">
                {validation.errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                Warnings:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-yellow-700 dark:text-yellow-400">
                {validation.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Correct Answer Display */}
      {showCorrectAnswer && correctAnswerData && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
            Required Labels:
          </h4>
          <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
            {requiredLabels.map((reqLabel, idx) => (
              <div key={idx}>
                • {reqLabel.text} ({reqLabel.points} point{reqLabel.points !== 1 ? 's' : ''})
                {reqLabel.acceptableAlternatives && (
                  <span className="text-xs ml-2 text-green-600 dark:text-green-400">
                    (or: {reqLabel.acceptableAlternatives.join(', ')})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      {!disabled && (
        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
          Draw your diagram using the tools above, then add labels at the appropriate positions.
          Position values are percentages from top-left (0%, 0%) to bottom-right (100%, 100%).
        </div>
      )}
    </div>
  );
};

export default StructuralDiagram;
