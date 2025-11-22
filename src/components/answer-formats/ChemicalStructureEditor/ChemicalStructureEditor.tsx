/**
 * Chemical Structure Editor Component
 *
 * Simplified chemistry structure editor using text-based input
 * with common molecular templates and validation.
 */

import React, { useState, useCallback } from 'react';
import {
  Beaker,
  Plus,
  Save,
  Check,
  AlertCircle,
  Copy
} from 'lucide-react';
import Button from '@/components/shared/Button';
import { cn } from '@/lib/utils';

export interface ChemicalStructureData {
  formula: string;
  structuralFormula?: string;
  name?: string;
  bondingInfo?: string[];
  functionalGroups?: string[];
  timestamp: string;
}

interface Template {
  name: string;
  formula: string;
  structure: string;
  category: string;
}

const COMMON_TEMPLATES: Template[] = [
  // Alkanes
  { name: 'Methane', formula: 'CH₄', structure: 'CH₄', category: 'alkane' },
  { name: 'Ethane', formula: 'C₂H₆', structure: 'CH₃-CH₃', category: 'alkane' },
  { name: 'Propane', formula: 'C₃H₈', structure: 'CH₃-CH₂-CH₃', category: 'alkane' },
  { name: 'Butane', formula: 'C₄H₁₀', structure: 'CH₃-CH₂-CH₂-CH₃', category: 'alkane' },

  // Alkenes
  { name: 'Ethene', formula: 'C₂H₄', structure: 'CH₂=CH₂', category: 'alkene' },
  { name: 'Propene', formula: 'C₃H₆', structure: 'CH₃-CH=CH₂', category: 'alkene' },

  // Alcohols
  { name: 'Methanol', formula: 'CH₃OH', structure: 'CH₃-OH', category: 'alcohol' },
  { name: 'Ethanol', formula: 'C₂H₅OH', structure: 'CH₃-CH₂-OH', category: 'alcohol' },

  // Carboxylic Acids
  { name: 'Methanoic acid', formula: 'HCOOH', structure: 'H-COOH', category: 'acid' },
  { name: 'Ethanoic acid', formula: 'CH₃COOH', structure: 'CH₃-COOH', category: 'acid' },

  // Others
  { name: 'Water', formula: 'H₂O', structure: 'H-O-H', category: 'inorganic' },
  { name: 'Carbon dioxide', formula: 'CO₂', structure: 'O=C=O', category: 'inorganic' },
  { name: 'Ammonia', formula: 'NH₃', structure: 'NH₃', category: 'inorganic' },
  { name: 'Benzene', formula: 'C₆H₆', structure: '⬡', category: 'aromatic' }
];

const FUNCTIONAL_GROUPS = [
  { name: 'Hydroxyl', symbol: '-OH', type: 'alcohol' },
  { name: 'Carboxyl', symbol: '-COOH', type: 'acid' },
  { name: 'Carbonyl', symbol: '>C=O', type: 'ketone/aldehyde' },
  { name: 'Amino', symbol: '-NH₂', type: 'amine' },
  { name: 'Methyl', symbol: '-CH₃', type: 'alkyl' },
  { name: 'Ethyl', symbol: '-C₂H₅', type: 'alkyl' }
];

interface ChemicalStructureEditorProps {
  questionId: string;
  value: ChemicalStructureData | null;
  onChange: (data: ChemicalStructureData | null) => void;
  disabled?: boolean;
  allowTemplates?: boolean;
  showCorrectAnswer?: boolean;
  correctAnswerData?: ChemicalStructureData;
}

const ChemicalStructureEditor: React.FC<ChemicalStructureEditorProps> = ({
  questionId,
  value,
  onChange,
  disabled = false,
  allowTemplates = true,
  showCorrectAnswer = false,
  correctAnswerData
}) => {
  const [formula, setFormula] = useState(value?.formula || '');
  const [structuralFormula, setStructuralFormula] = useState(value?.structuralFormula || '');
  const [name, setName] = useState(value?.name || '');
  const [bondingInfo, setBondingInfo] = useState<string[]>(value?.bondingInfo || []);
  const [functionalGroups, setFunctionalGroups] = useState<string[]>(value?.functionalGroups || []);
  const [saved, setSaved] = useState(false);
  const [validation, setValidation] = useState<{ isValid: boolean; errors: string[] }>({
    isValid: true,
    errors: []
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Convert numbers to subscripts
  const formatChemicalFormula = useCallback((input: string): string => {
    const subscripts = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
    return input.replace(/(\d+)/g, (match) => {
      return match.split('').map(d => subscripts[parseInt(d)] || d).join('');
    });
  }, []);

  // Apply template
  const handleApplyTemplate = useCallback((template: Template) => {
    setFormula(template.formula);
    setStructuralFormula(template.structure);
    setName(template.name);
  }, []);

  // Add functional group
  const handleAddFunctionalGroup = useCallback((group: string) => {
    if (!functionalGroups.includes(group)) {
      const updated = [...functionalGroups, group];
      setFunctionalGroups(updated);
    }
  }, [functionalGroups]);

  // Remove functional group
  const handleRemoveFunctionalGroup = useCallback((group: string) => {
    setFunctionalGroups(functionalGroups.filter(g => g !== group));
  }, [functionalGroups]);

  // Add bonding info
  const handleAddBondingInfo = useCallback(() => {
    const info = prompt('Enter bonding information (e.g., "C-C single bond"):');
    if (info && info.trim()) {
      setBondingInfo([...bondingInfo, info.trim()]);
    }
  }, [bondingInfo]);

  // Validate structure
  const validateStructure = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!formula.trim()) {
      errors.push('Chemical formula is required');
    }

    // Basic formula validation
    if (formula && !/^[A-Z][a-z]?\d*(\([A-Z][a-z]?\d*\)\d*)*$/.test(formula.replace(/[₀-₉]/g, d =>
      String.fromCharCode(d.charCodeAt(0) - 8272 + 48)
    ))) {
      errors.push('Invalid chemical formula format');
    }

    if (!structuralFormula.trim()) {
      errors.push('Structural formula is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [formula, structuralFormula]);

  // Save structure
  const handleSave = useCallback(() => {
    const result = validateStructure();
    setValidation(result);

    if (result.isValid) {
      const data: ChemicalStructureData = {
        formula: formatChemicalFormula(formula),
        structuralFormula,
        name,
        bondingInfo,
        functionalGroups,
        timestamp: new Date().toISOString()
      };

      onChange(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [formula, structuralFormula, name, bondingInfo, functionalGroups, formatChemicalFormula, validateStructure, onChange]);

  // Copy template structure
  const handleCopyStructure = useCallback((structure: string) => {
    navigator.clipboard.writeText(structure);
  }, []);

  const filteredTemplates = selectedCategory === 'all'
    ? COMMON_TEMPLATES
    : COMMON_TEMPLATES.filter(t => t.category === selectedCategory);

  const categories = ['all', ...Array.from(new Set(COMMON_TEMPLATES.map(t => t.category)))];

  return (
    <div className="space-y-4">
      {/* Input Fields */}
      <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-300 dark:border-gray-700">
        {/* Compound Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <Beaker className="inline w-4 h-4 mr-1" />
            Compound Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled}
            placeholder="e.g., Ethanol"
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Molecular Formula */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Molecular Formula <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            disabled={disabled}
            placeholder="e.g., C2H5OH or C₂H₅OH"
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:text-white font-mono"
          />
          {formula && (
            <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-700 dark:text-blue-300 font-mono">
              Preview: {formatChemicalFormula(formula)}
            </div>
          )}
        </div>

        {/* Structural Formula */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Structural Formula <span className="text-red-500">*</span>
          </label>
          <textarea
            value={structuralFormula}
            onChange={(e) => setStructuralFormula(e.target.value)}
            disabled={disabled}
            rows={3}
            placeholder="e.g., CH₃-CH₂-OH or use = for double bonds, ≡ for triple bonds"
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:text-white font-mono"
          />
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Use - for single bonds, = for double bonds, ≡ for triple bonds
          </div>
        </div>
      </div>

      {/* Functional Groups */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-300 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Functional Groups
        </h4>

        {/* Available Groups */}
        <div className="flex flex-wrap gap-2 mb-3">
          {FUNCTIONAL_GROUPS.map(group => (
            <button
              key={group.name}
              onClick={() => handleAddFunctionalGroup(group.name)}
              disabled={disabled || functionalGroups.includes(group.name)}
              className={cn(
                "px-2 py-1 text-sm rounded border transition-colors",
                functionalGroups.includes(group.name)
                  ? "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300"
                  : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400"
              )}
            >
              {group.symbol} <span className="text-xs text-gray-500">({group.name})</span>
            </button>
          ))}
        </div>

        {/* Selected Groups */}
        {functionalGroups.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-gray-600 dark:text-gray-400">Selected:</p>
            <div className="flex flex-wrap gap-2">
              {functionalGroups.map(group => {
                const groupInfo = FUNCTIONAL_GROUPS.find(g => g.name === group);
                return (
                  <div
                    key={group}
                    className="px-2 py-1 bg-green-100 dark:bg-green-900/30 border border-green-500 text-green-700 dark:text-green-300 rounded text-sm flex items-center gap-1"
                  >
                    <span>{groupInfo?.symbol || group}</span>
                    {!disabled && (
                      <button
                        onClick={() => handleRemoveFunctionalGroup(group)}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bonding Information */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-300 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Bonding Information
          </h4>
          {!disabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddBondingInfo}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          )}
        </div>

        {bondingInfo.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {bondingInfo.map((info, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="text-gray-700 dark:text-gray-300">• {info}</span>
                {!disabled && (
                  <button
                    onClick={() => setBondingInfo(bondingInfo.filter((_, i) => i !== idx))}
                    className="text-red-600 hover:text-red-700 text-xs"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            No bonding information added
          </p>
        )}
      </div>

      {/* Templates */}
      {allowTemplates && !disabled && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-300 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Common Molecular Templates
          </h4>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-3">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1 text-xs rounded-full transition-colors",
                  selectedCategory === cat
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:border-blue-500"
                )}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {filteredTemplates.map(template => (
              <div
                key={template.name}
                className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:border-blue-500 transition-colors"
              >
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                  {template.name}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-mono mb-2">
                  {template.formula}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleApplyTemplate(template)}
                    className="flex-1 text-xs"
                  >
                    Use
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyStructure(template.structure)}
                    className="text-xs"
                    title="Copy structure"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={disabled}
        >
          {saved ? (
            <>
              <Check className="w-4 h-4 mr-1 text-green-600" />
              Saved
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-1" />
              Save Structure
            </>
          )}
        </Button>
      </div>

      {/* Validation Messages */}
      {!validation.isValid && (
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

      {/* Correct Answer Display */}
      {showCorrectAnswer && correctAnswerData && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
            Correct Answer:
          </h4>
          <div className="text-sm text-green-700 dark:text-green-300 space-y-1 font-mono">
            {correctAnswerData.name && <p>Name: {correctAnswerData.name}</p>}
            <p>Formula: {correctAnswerData.formula}</p>
            <p>Structure: {correctAnswerData.structuralFormula}</p>
            {correctAnswerData.functionalGroups && correctAnswerData.functionalGroups.length > 0 && (
              <p>Functional Groups: {correctAnswerData.functionalGroups.join(', ')}</p>
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      {!disabled && (
        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
          Enter the molecular and structural formulas. Use templates for common molecules or build your own.
          For subscripts in formula, use regular numbers (they'll be converted automatically).
        </div>
      )}
    </div>
  );
};

export default ChemicalStructureEditor;
