// src/components/shared/ScientificEditor.tsx

import React, { useState, useRef, useEffect } from 'react';
import { 
  Calculator, 
  Superscript, 
  Subscript, 
  Pi, 
  Sigma, 
  Square, 
  SquareRoot,
  Beaker,
  Atom,
  FlaskConical,
  TestTube,
  Plus,
  Minus,
  X,
  Divide,
  Equal,
  Zap,
  FileText,
  Grid3x3,
  ChevronDown,
  ChevronUp,
  Undo,
  Redo,
  Copy,
  Clipboard,
  HelpCircle
} from 'lucide-react';
import Button from './Button';
import { cn } from '@/lib/utils';

// Symbol Palettes
const SYMBOL_PALETTES = {
  mathematics: {
    basic: ['±', '×', '÷', '≈', '≤', '≥', '≠', '∞'],
    greek: ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'π', 'ρ', 'σ', 'τ', 'φ', 'χ', 'ψ', 'ω'],
    calculus: ['∫', '∂', '∇', '∑', '∏', 'lim', 'd/dx', '∮', '∬', '∭'],
    algebra: ['√', '∛', '∜', 'x²', 'x³', 'xⁿ', 'logₓ', 'ln', 'exp', '|x|'],
    geometry: ['∠', '⊥', '∥', '≅', '∼', '△', '□', '○', '⊙', '∡'],
    setTheory: ['∈', '∉', '⊂', '⊃', '⊆', '⊇', '∪', '∩', '∅', 'ℕ', 'ℤ', 'ℚ', 'ℝ', 'ℂ'],
    logic: ['∧', '∨', '¬', '⇒', '⇔', '∀', '∃', '∄', '∴', '∵']
  },
  physics: {
    units: ['m', 's', 'kg', 'N', 'J', 'W', 'Pa', 'Hz', 'Ω', 'V', 'A', 'T', 'Wb', 'H', 'F', 'C'],
    unitCombos: ['m/s', 'ms⁻¹', 'm/s²', 'ms⁻²', 'kg·m·s⁻²', 'kg/m³', 'N/m²', 'J/s', 'V/m', 'A/m'],
    vectors: ['→', '←', '↑', '↓', '⃗', '·', '×', '|', '∥', '⊗', '⊙'],
    symbols: ['Δ', 'λ', 'ν', 'ω', 'θ', 'φ', 'ρ', 'τ', 'μ', 'ε₀', 'μ₀', 'ħ', 'c'],
    constants: ['g = 9.8 m/s²', 'c = 3×10⁸ m/s', 'h = 6.63×10⁻³⁴ J·s', 'e = 1.6×10⁻¹⁹ C']
  },
  chemistry: {
    arrows: ['→', '⇌', '⇋', '↑', '↓', '⟶', '⟵', '⇄'],
    states: ['(s)', '(l)', '(g)', '(aq)', '(cr)', '(am)'],
    bonds: ['−', '=', '≡', '···', '—', '〜', '⋮', '∶'],
    charges: ['⁺', '⁻', '²⁺', '²⁻', '³⁺', '³⁻', '⁴⁺', '⁴⁻'],
    common: ['H⁺', 'OH⁻', 'e⁻', 'H₂O', 'O₂', 'CO₂', 'NH₃', 'HCl'],
    functional: ['−OH', '−COOH', '−NH₂', '−CHO', '−CO−', '−O−', '−SH', '−NO₂']
  }
};

// Component Props
interface ScientificEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  subject?: string;
  format?: string;
  placeholder?: string;
  maxLength?: number;
  showHistory?: boolean;
  onHistoryChange?: (history: string[]) => void;
}

// Symbol Palette Component
const SymbolPalette: React.FC<{ 
  category: keyof typeof SYMBOL_PALETTES; 
  onInsert: (symbol: string) => void;
  disabled?: boolean;
}> = ({ category, onInsert, disabled }) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['basic']);
  const palette = SYMBOL_PALETTES[category];

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-3 space-y-3">
      {Object.entries(palette).map(([section, symbols]) => (
        <div key={section} className="space-y-2">
          <button
            onClick={() => toggleSection(section)}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <span className="capitalize">{section.replace(/([A-Z])/g, ' $1').trim()}</span>
            {expandedSections.includes(section) ? 
              <ChevronUp className="w-4 h-4" /> : 
              <ChevronDown className="w-4 h-4" />
            }
          </button>
          {expandedSections.includes(section) && (
            <div className="grid grid-cols-8 gap-1">
              {symbols.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => onInsert(symbol)}
                  disabled={disabled}
                  className={cn(
                    "p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-[#99C93B]",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                  title={`Insert ${symbol}`}
                >
                  {symbol}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Equation Builder Component
const EquationBuilder: React.FC<{ 
  onBuild: (equation: string) => void;
  type?: 'algebraic' | 'differential' | 'matrix';
  disabled?: boolean;
}> = ({ onBuild, type = 'algebraic', disabled }) => {
  const [equation, setEquation] = useState('');
  const [showFractions, setShowFractions] = useState(false);
  const [numerator, setNumerator] = useState('');
  const [denominator, setDenominator] = useState('');

  const templates = {
    algebraic: [
      { name: 'Quadratic', template: 'ax² + bx + c = 0' },
      { name: 'Linear', template: 'y = mx + b' },
      { name: 'Exponential', template: 'y = a·bˣ' },
      { name: 'Logarithmic', template: 'y = log_b(x)' }
    ],
    differential: [
      { name: 'First Order', template: 'dy/dx = f(x,y)' },
      { name: 'Second Order', template: 'd²y/dx² + p(x)dy/dx + q(x)y = 0' },
      { name: 'Partial', template: '∂u/∂t = k∂²u/∂x²' }
    ],
    matrix: [
      { name: '2×2', template: '[a b; c d]' },
      { name: '3×3', template: '[a b c; d e f; g h i]' },
      { name: 'Determinant', template: '|A| = ' }
    ]
  };

  const insertTemplate = (template: string) => {
    setEquation(equation + template);
  };

  const buildFraction = () => {
    const fraction = `(${numerator})/(${denominator})`;
    setEquation(equation + fraction);
    setNumerator('');
    setDenominator('');
    setShowFractions(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Equation Builder</h4>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowFractions(!showFractions)}
            disabled={disabled}
          >
            Fraction
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => insertTemplate('√()')}
            disabled={disabled}
          >
            √
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => insertTemplate('^')}
            disabled={disabled}
          >
            Power
          </Button>
        </div>
      </div>

      {showFractions && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={numerator}
            onChange={(e) => setNumerator(e.target.value)}
            placeholder="Numerator"
            className="flex-1 px-2 py-1 border rounded text-sm"
          />
          <span className="text-lg">/</span>
          <input
            type="text"
            value={denominator}
            onChange={(e) => setDenominator(e.target.value)}
            placeholder="Denominator"
            className="flex-1 px-2 py-1 border rounded text-sm"
          />
          <Button size="sm" onClick={buildFraction}>Add</Button>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs text-gray-600 dark:text-gray-400">Templates:</div>
        <div className="grid grid-cols-2 gap-2">
          {templates[type].map((t) => (
            <button
              key={t.name}
              onClick={() => insertTemplate(t.template)}
              disabled={disabled}
              className={cn(
                "p-2 text-xs bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600",
                "text-left transition-colors",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="font-medium">{t.name}</div>
              <div className="text-gray-600 dark:text-gray-400">{t.template}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <textarea
          value={equation}
          onChange={(e) => setEquation(e.target.value)}
          placeholder="Build your equation..."
          rows={3}
          className="w-full px-3 py-2 border rounded text-sm font-mono"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setEquation('')}
            className="flex-1"
          >
            Clear
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              onBuild(equation);
              setEquation('');
            }}
            disabled={!equation.trim()}
            className="flex-1"
          >
            Insert
          </Button>
        </div>
      </div>
    </div>
  );
};

// Chemical Structure Drawer Component
const ChemicalStructureDrawer: React.FC<{ 
  onDraw: (structure: string) => void;
  disabled?: boolean;
}> = ({ onDraw, disabled }) => {
  const [structure, setStructure] = useState('');
  const [bondType, setBondType] = useState('single');

  const commonStructures = [
    { name: 'Benzene', structure: 'C₆H₆' },
    { name: 'Methane', structure: 'CH₄' },
    { name: 'Ethanol', structure: 'CH₃CH₂OH' },
    { name: 'Glucose', structure: 'C₆H₁₂O₆' },
    { name: 'Amino Acid', structure: 'H₂N-CHR-COOH' }
  ];

  const functionalGroups = [
    { name: 'Hydroxyl', group: '-OH' },
    { name: 'Carbonyl', group: '>C=O' },
    { name: 'Carboxyl', group: '-COOH' },
    { name: 'Amino', group: '-NH₂' },
    { name: 'Sulfhydryl', group: '-SH' },
    { name: 'Phosphate', group: '-PO₄²⁻' }
  ];

  const addBond = (type: string) => {
    const bonds = {
      'single': '−',
      'double': '=',
      'triple': '≡',
      'dative': '→',
      'hydrogen': '···'
    };
    setStructure(structure + (bonds[type as keyof typeof bonds] || '−'));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-3 space-y-3">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Chemical Structure</h4>
      
      <div className="space-y-2">
        <div className="text-xs text-gray-600 dark:text-gray-400">Bond Types:</div>
        <div className="flex gap-2">
          {['single', 'double', 'triple', 'dative', 'hydrogen'].map((type) => (
            <Button
              key={type}
              size="sm"
              variant={bondType === type ? 'primary' : 'secondary'}
              onClick={() => {
                setBondType(type);
                addBond(type);
              }}
              disabled={disabled}
            >
              {type === 'single' && '−'}
              {type === 'double' && '='}
              {type === 'triple' && '≡'}
              {type === 'dative' && '→'}
              {type === 'hydrogen' && '···'}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-gray-600 dark:text-gray-400">Common Structures:</div>
        <div className="grid grid-cols-3 gap-2">
          {commonStructures.map((s) => (
            <button
              key={s.name}
              onClick={() => setStructure(structure + s.structure)}
              disabled={disabled}
              className={cn(
                "p-2 text-xs bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600",
                "transition-colors",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="font-medium">{s.name}</div>
              <div className="text-gray-600 dark:text-gray-400">{s.structure}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-gray-600 dark:text-gray-400">Functional Groups:</div>
        <div className="flex flex-wrap gap-2">
          {functionalGroups.map((fg) => (
            <button
              key={fg.name}
              onClick={() => setStructure(structure + fg.group)}
              disabled={disabled}
              className={cn(
                "px-3 py-1 text-xs bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600",
                "transition-colors",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {fg.group}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <textarea
          value={structure}
          onChange={(e) => setStructure(e.target.value)}
          placeholder="Build your chemical structure..."
          rows={3}
          className="w-full px-3 py-2 border rounded text-sm font-mono"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setStructure('')}
            className="flex-1"
          >
            Clear
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              onDraw(structure);
              setStructure('');
            }}
            disabled={!structure.trim()}
            className="flex-1"
          >
            Insert
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main Scientific Editor Component
const ScientificEditor: React.FC<ScientificEditorProps> = ({
  value,
  onChange,
  disabled = false,
  subject = '',
  format = '',
  placeholder = 'Enter scientific content',
  maxLength,
  showHistory = false,
  onHistoryChange
}) => {
  const [showCalculator, setShowCalculator] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  const [showEquationBuilder, setShowEquationBuilder] = useState(false);
  const [showChemicalDrawer, setShowChemicalDrawer] = useState(false);
  const [calculatorResult, setCalculatorResult] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [symbolCategory, setSymbolCategory] = useState<keyof typeof SYMBOL_PALETTES>('mathematics');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Math symbols
  const mathSymbols = [
    { symbol: 'π', name: 'Pi' },
    { symbol: '∞', name: 'Infinity' },
    { symbol: '∑', name: 'Sigma' },
    { symbol: '∏', name: 'Product' },
    { symbol: '∫', name: 'Integral' },
    { symbol: '∂', name: 'Partial' },
    { symbol: '√', name: 'Square root' },
    { symbol: '∛', name: 'Cube root' },
    { symbol: '±', name: 'Plus minus' },
    { symbol: '≈', name: 'Approximately' },
    { symbol: '≠', name: 'Not equal' },
    { symbol: '≤', name: 'Less than or equal' },
    { symbol: '≥', name: 'Greater than or equal' },
    { symbol: '∈', name: 'Element of' },
    { symbol: '∉', name: 'Not element of' },
    { symbol: '∪', name: 'Union' },
    { symbol: '∩', name: 'Intersection' },
    { symbol: '⊂', name: 'Subset' },
    { symbol: '⊃', name: 'Superset' },
    { symbol: '∀', name: 'For all' },
    { symbol: '∃', name: 'There exists' },
    { symbol: '∠', name: 'Angle' },
    { symbol: '⊥', name: 'Perpendicular' },
    { symbol: '∥', name: 'Parallel' },
    { symbol: '°', name: 'Degree' }
  ];

  // Chemistry symbols and formulas
  const chemSymbols = [
    { symbol: '→', name: 'Reaction arrow' },
    { symbol: '⇌', name: 'Equilibrium' },
    { symbol: '↑', name: 'Gas evolved' },
    { symbol: '↓', name: 'Precipitate' },
    { symbol: '·', name: 'Dot (hydrate)' },
    { symbol: '°C', name: 'Celsius' },
    { symbol: 'Δ', name: 'Delta (heat)' },
    { symbol: 'λ', name: 'Lambda' },
    { symbol: 'ν', name: 'Nu (frequency)' }
  ];

  // Subscript numbers
  const subscripts = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  
  // Superscript numbers and signs
  const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '⁺', '⁻'];

  // Common chemical formulas templates
  const chemTemplates = [
    { template: 'H₂O', name: 'Water' },
    { template: 'CO₂', name: 'Carbon dioxide' },
    { template: 'O₂', name: 'Oxygen' },
    { template: 'H₂SO₄', name: 'Sulfuric acid' },
    { template: 'NaCl', name: 'Sodium chloride' },
    { template: 'CₙH₂ₙ₊₂', name: 'Alkane formula' },
    { template: 'CₙH₂ₙ', name: 'Alkene formula' }
  ];

  // Track cursor position
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.selectionStart = cursorPosition;
      textareaRef.current.selectionEnd = cursorPosition;
    }
  }, [value, cursorPosition]);

  // Update history
  useEffect(() => {
    if (showHistory && value !== history[historyIndex]) {
      const newHistory = [...history.slice(0, historyIndex + 1), value];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      onHistoryChange?.(newHistory);
    }
  }, [value]);

  // Insert symbol at cursor
  const insertSymbol = (symbol: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newValue = value.substring(0, start) + symbol + value.substring(end);
      onChange(newValue);
      setCursorPosition(start + symbol.length);
      textareaRef.current.focus();
    }
  };

  // Convert selected text to subscript
  const convertToSubscript = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selectedText = value.substring(start, end);
      
      const convertedText = selectedText.split('').map(char => {
        const index = '0123456789'.indexOf(char);
        return index !== -1 ? subscripts[index] : char;
      }).join('');
      
      const newValue = value.substring(0, start) + convertedText + value.substring(end);
      onChange(newValue);
      setCursorPosition(start + convertedText.length);
    }
  };

  // Convert selected text to superscript
  const convertToSuperscript = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selectedText = value.substring(start, end);
      
      const convertedText = selectedText.split('').map(char => {
        const index = '0123456789+-'.indexOf(char);
        if (index !== -1 && index < 10) return superscripts[index];
        if (char === '+') return '⁺';
        if (char === '-') return '⁻';
        return char;
      }).join('');
      
      const newValue = value.substring(0, start) + convertedText + value.substring(end);
      onChange(newValue);
      setCursorPosition(start + convertedText.length);
    }
  };

  // Undo/Redo functionality
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      onChange(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      onChange(history[historyIndex + 1]);
    }
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const textToCopy = start !== end ? value.substring(start, end) : value;
      navigator.clipboard.writeText(textToCopy);
    }
  };

  // Basic calculator
  const handleCalculation = (operation: string) => {
    try {
      // This is a simple example - in production, use a proper math parser
      const result = eval(calculatorResult + operation);
      setCalculatorResult(result.toString());
    } catch (e) {
      setCalculatorResult('Error');
    }
  };

  // Determine which tools to show based on subject
  const showMathTools = ['math', 'physics'].some(s => subject.toLowerCase().includes(s)) || 
                       ['calculation', 'equation'].includes(format);
  const showChemTools = subject.toLowerCase().includes('chemistry') || 
                       format === 'structural_diagram';
  const showPhysicsTools = subject.toLowerCase().includes('physics');

  // Determine symbol category based on subject
  useEffect(() => {
    if (showChemTools) {
      setSymbolCategory('chemistry');
    } else if (showPhysicsTools) {
      setSymbolCategory('physics');
    } else {
      setSymbolCategory('mathematics');
    }
  }, [subject]);

  return (
    <div className="space-y-3">
      {/* Enhanced Toolbar */}
      <div className="flex flex-wrap gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border">
        {/* Text formatting */}
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="secondary"
            onClick={convertToSubscript}
            disabled={disabled}
            title="Convert to subscript"
          >
            <Subscript className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={convertToSuperscript}
            disabled={disabled}
            title="Convert to superscript"
          >
            <Superscript className="w-4 h-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* History controls */}
        {showHistory && (
          <>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleUndo}
                disabled={disabled || historyIndex === 0}
                title="Undo"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRedo}
                disabled={disabled || historyIndex === history.length - 1}
                title="Redo"
              >
                <Redo className="w-4 h-4" />
              </Button>
            </div>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
          </>
        )}

        {/* Clipboard */}
        <Button
          size="sm"
          variant="secondary"
          onClick={copyToClipboard}
          disabled={disabled}
          title="Copy"
        >
          <Copy className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Subject-specific tools */}
        {showMathTools && (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowSymbols(!showSymbols);
                setShowEquationBuilder(false);
                setShowChemicalDrawer(false);
              }}
              disabled={disabled}
            >
              <Pi className="w-4 h-4 mr-1" />
              Symbols
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowEquationBuilder(!showEquationBuilder);
                setShowSymbols(false);
                setShowChemicalDrawer(false);
              }}
              disabled={disabled}
            >
              <FileText className="w-4 h-4 mr-1" />
              Equation
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowCalculator(!showCalculator)}
              disabled={disabled}
            >
              <Calculator className="w-4 h-4 mr-1" />
              Calculator
            </Button>
          </>
        )}

        {showChemTools && (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowSymbols(!showSymbols);
                setShowEquationBuilder(false);
                setShowChemicalDrawer(false);
              }}
              disabled={disabled}
            >
              <Beaker className="w-4 h-4 mr-1" />
              Chemistry
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowChemicalDrawer(!showChemicalDrawer);
                setShowSymbols(false);
                setShowEquationBuilder(false);
              }}
              disabled={disabled}
            >
              <FlaskConical className="w-4 h-4 mr-1" />
              Structure
            </Button>
          </>
        )}

        {showPhysicsTools && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setShowSymbols(!showSymbols);
              setShowEquationBuilder(false);
              setShowChemicalDrawer(false);
            }}
            disabled={disabled}
          >
            <Zap className="w-4 h-4 mr-1" />
            Physics
          </Button>
        )}
      </div>

      {/* Enhanced Symbol Palette */}
      {showSymbols && (
        <SymbolPalette 
          category={symbolCategory} 
          onInsert={insertSymbol} 
          disabled={disabled}
        />
      )}

      {/* Equation Builder */}
      {showEquationBuilder && (
        <EquationBuilder 
          onBuild={insertSymbol}
          type={format === 'differential' ? 'differential' : 'algebraic'}
          disabled={disabled}
        />
      )}

      {/* Chemical Structure Drawer */}
      {showChemicalDrawer && (
        <ChemicalStructureDrawer 
          onDraw={insertSymbol}
          disabled={disabled}
        />
      )}

      {/* Original Symbol palette (legacy support) */}
      {showSymbols && false && ( // Hidden but preserved for reference
        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border">
          <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {showMathTools ? 'Mathematical Symbols' : 'Chemistry Symbols'}
          </div>
          <div className="grid grid-cols-8 gap-1">
            {(showMathTools ? mathSymbols : chemSymbols).map((item) => (
              <button
                key={item.symbol}
                onClick={() => insertSymbol(item.symbol)}
                disabled={disabled}
                className="p-2 text-lg hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                title={item.name}
              >
                {item.symbol}
              </button>
            ))}
          </div>
          
          {showChemTools && (
            <>
              <div className="mt-3 mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Common Formulas</div>
              <div className="flex flex-wrap gap-2">
                {chemTemplates.map((item) => (
                  <button
                    key={item.template}
                    onClick={() => insertSymbol(item.template)}
                    disabled={disabled}
                    className="px-3 py-1 bg-white dark:bg-gray-800 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                    title={item.name}
                  >
                    {item.template}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="mt-3 grid grid-cols-10 gap-1">
            <div className="col-span-10 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subscripts</div>
            {subscripts.map((sub, idx) => (
              <button
                key={sub}
                onClick={() => insertSymbol(sub)}
                disabled={disabled}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                title={`Subscript ${idx}`}
              >
                {sub}
              </button>
            ))}
            <div className="col-span-10 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 mt-2">Superscripts</div>
            {superscripts.map((sup, idx) => (
              <button
                key={sup}
                onClick={() => insertSymbol(sup)}
                disabled={disabled}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                title={`Superscript ${idx < 10 ? idx : idx === 10 ? '+' : '-'}`}
              >
                {sup}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Calculator */}
      {showCalculator && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border">
          <div className="mb-2">
            <input
              type="text"
              value={calculatorResult}
              readOnly
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border rounded text-right font-mono"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {['7', '8', '9', '/'].map(btn => (
              <button
                key={btn}
                onClick={() => btn === '/' ? handleCalculation('/') : setCalculatorResult(calculatorResult + btn)}
                className="p-3 bg-white dark:bg-gray-800 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {btn === '/' ? <Divide className="w-4 h-4 mx-auto" /> : btn}
              </button>
            ))}
            {['4', '5', '6', '*'].map(btn => (
              <button
                key={btn}
                onClick={() => btn === '*' ? handleCalculation('*') : setCalculatorResult(calculatorResult + btn)}
                className="p-3 bg-white dark:bg-gray-800 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {btn === '*' ? <X className="w-4 h-4 mx-auto" /> : btn}
              </button>
            ))}
            {['1', '2', '3', '-'].map(btn => (
              <button
                key={btn}
                onClick={() => btn === '-' ? handleCalculation('-') : setCalculatorResult(calculatorResult + btn)}
                className="p-3 bg-white dark:bg-gray-800 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {btn === '-' ? <Minus className="w-4 h-4 mx-auto" /> : btn}
              </button>
            ))}
            {['0', '.', '=', '+'].map(btn => (
              <button
                key={btn}
                onClick={() => {
                  if (btn === '=') handleCalculation('');
                  else if (btn === '+') handleCalculation('+');
                  else setCalculatorResult(calculatorResult + btn);
                }}
                className="p-3 bg-white dark:bg-gray-800 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {btn === '=' ? <Equal className="w-4 h-4 mx-auto" /> : 
                 btn === '+' ? <Plus className="w-4 h-4 mx-auto" /> : btn}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCalculatorResult('')}
              className="flex-1"
            >
              Clear
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                insertSymbol(calculatorResult);
                setCalculatorResult('');
              }}
              className="flex-1"
            >
              Insert Result
            </Button>
          </div>
        </div>
      )}

      {/* Main textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          if (maxLength && e.target.value.length > maxLength) return;
          onChange(e.target.value);
          setCursorPosition(e.target.selectionStart);
        }}
        onClick={(e) => setCursorPosition(e.currentTarget.selectionStart)}
        onKeyUp={(e) => setCursorPosition(e.currentTarget.selectionStart)}
        disabled={disabled}
        placeholder={placeholder}
        rows={6}
        className={cn(
          "w-full px-3 py-2 border rounded-lg font-mono text-sm",
          disabled ? 'bg-gray-100 dark:bg-gray-900' : 'bg-white dark:bg-gray-800',
          "focus:outline-none focus:ring-2 focus:ring-[#99C93B]",
          "dark:text-white dark:border-gray-600"
        )}
      />

      {/* Helper text and character count */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          {showMathTools && (
            <p>• Select text and click subscript/superscript buttons to format</p>
          )}
          {showChemTools && (
            <p>• Use subscripts for chemical formulas (e.g., H₂O) and superscripts for charges (e.g., Mg²⁺)</p>
          )}
          {showPhysicsTools && (
            <p>• Include units and uncertainties in measurements (e.g., 12.5 ± 0.5 cm)</p>
          )}
        </div>
        {maxLength && (
          <div className={cn(
            "text-xs",
            value.length > maxLength * 0.9 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
          )}>
            {value.length}/{maxLength}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScientificEditor;