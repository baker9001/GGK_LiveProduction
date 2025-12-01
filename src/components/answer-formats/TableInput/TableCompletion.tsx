/**
 * Table Completion Component for Fill-in-the-Table Questions
 *
 * Enhanced with dynamic table building capabilities:
 * - Add/remove rows and columns
 * - Edit column headers
 * - Select cells and mark as locked/editable
 * - Set expected answers for grading
 * - Load/save templates from database
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.css';
import {
  Check,
  AlertCircle,
  RotateCcw,
  Table as TableIcon,
  Plus,
  Minus,
  Save,
  Edit3,
  X,
  HelpCircle,
  CheckCircle,
  MinusCircle,
  Award,
  Database,
  AlertTriangle
} from 'lucide-react';
import Button from '@/components/shared/Button';
import { cn } from '@/lib/utils';
import { validateTableData } from '../utils/dataValidation';
import { TableTemplateService, type TableTemplateDTO, type TableCellDTO } from '@/services/TableTemplateService';
import { TableTemplateImportReviewService, type TableTemplateReviewDTO } from '@/services/TableTemplateImportReviewService';
import { toast } from '@/components/shared/Toast';
import { supabase } from '@/lib/supabase';

export interface TableTemplate {
  rows: number;
  columns: number;
  headers?: string[];
  lockedCells: Array<{ row: number; col: number; value: string | number }>;
  editableCells: Array<{ row: number; col: number }>;
  correctAnswers?: Array<{ row: number; col: number; value: string | number }>;
}

export interface TableCompletionData {
  studentAnswers: Record<string, string | number>; // "row-col": value
  completedCells: number;
  requiredCells: number;
}

interface TableCompletionProps {
  questionId: string;
  subQuestionId?: string;
  template?: TableTemplate;
  value: TableCompletionData | null;
  onChange: (data: TableCompletionData) => void;
  disabled?: boolean;
  showCorrectAnswers?: boolean;
  autoGrade?: boolean;

  // Admin/Template Editing Props
  isAdminMode?: boolean; // DEPRECATED: Use isTemplateEditor instead
  isTemplateEditor?: boolean; // True only when actually editing template
  isAdminTestMode?: boolean; // True when admin is testing/previewing (shows clean student view)
  onTemplateSave?: (template: TableTemplateDTO) => void;

  // Student Test Mode (Exam Simulation)
  isStudentTestMode?: boolean;
  showValidationWarnings?: boolean;

  // Review Mode Props (for import review workflow)
  reviewSessionId?: string; // If provided, saves to review tables instead of production
  questionIdentifier?: string; // Question identifier for review mode

  // Dimension Constraints
  minRows?: number;
  maxRows?: number;
  minCols?: number;
  maxCols?: number;
  defaultRows?: number;
  defaultCols?: number;
}

// Default template for simple table completion (5x5 grid, all cells locked by default)
const DEFAULT_TEMPLATE: TableTemplate = {
  rows: 5,
  columns: 5,
  headers: ['Column 1', 'Column 2', 'Column 3', 'Column 4', 'Column 5'],
  lockedCells: Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => ({ row, col, value: '' }))
  ).flat(),
  editableCells: [],
  correctAnswers: []
};

const TableCompletion: React.FC<TableCompletionProps> = ({
  questionId,
  subQuestionId,
  template = DEFAULT_TEMPLATE,
  value,
  onChange,
  disabled = false,
  showCorrectAnswers = false,
  autoGrade = false,
  isAdminMode = false, // DEPRECATED but kept for backward compatibility
  isTemplateEditor: isTemplateEditorProp,
  isAdminTestMode = false,
  onTemplateSave,
  isStudentTestMode = false,
  showValidationWarnings = false,
  reviewSessionId,
  questionIdentifier,
  minRows = 2,
  maxRows = 50,
  minCols = 2,
  maxCols = 20,
  defaultRows = 5,
  defaultCols = 5
}) => {
  // Determine actual mode: only use explicit isTemplateEditor prop, no fallback
  const isTemplateEditor = isTemplateEditorProp ?? false;
  // isEditingTemplate is separate state that can be toggled in template editor mode
  const [isEditingTemplate, setIsEditingTemplate] = useState(isTemplateEditor);
  const hotRef = useRef<HotTable>(null);
  const [tableData, setTableData] = useState<any[][]>([]);
  const [validation, setValidation] = useState<any>(null);
  const [rows, setRows] = useState(defaultRows);
  const [columns, setColumns] = useState(defaultCols);
  const [headers, setHeaders] = useState<string[]>(
    Array.from({ length: defaultCols }, (_, i) => `Column ${i + 1}`)
  );

  // Cell configuration state
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [cellTypes, setCellTypes] = useState<Record<string, 'locked' | 'editable'>>({});
  const [cellValues, setCellValues] = useState<Record<string, string>>({});
  const [expectedAnswers, setExpectedAnswers] = useState<Record<string, string>>({});
  const [currentCellType, setCurrentCellType] = useState<'locked' | 'editable'>('locked');
  const [tempCellValue, setTempCellValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTemplateValidationWarnings, setShowTemplateValidationWarnings] = useState(false);

  // ✅ NEW: Per-cell marking configuration state
  const [cellMarks, setCellMarks] = useState<Record<string, number>>({});
  const [cellCaseSensitive, setCellCaseSensitive] = useState<Record<string, boolean>>({});
  const [cellEquivalentPhrasing, setCellEquivalentPhrasing] = useState<Record<string, boolean>>({});
  const [cellAlternatives, setCellAlternatives] = useState<Record<string, string[]>>({});

  // ✅ NEW: Table metadata state
  const [tableTitle, setTableTitle] = useState<string>('');
  const [tableDescription, setTableDescription] = useState<string>('');

  // ✅ NEW: Database existence tracking
  const [questionExistsInDB, setQuestionExistsInDB] = useState<boolean | null>(null);
  const [checkingDBExistence, setCheckingDBExistence] = useState(false);

  // Inline editing popover state
  const [inlineEditCell, setInlineEditCell] = useState<{row: number; col: number; x: number; y: number} | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const [inlineEditType, setInlineEditType] = useState<'locked' | 'editable'>('editable');

  // Paint mode state
  const [paintModeEnabled, setPaintModeEnabled] = useState(false);
  const [paintModeType, setPaintModeType] = useState<'locked' | 'editable'>('editable');

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'preview' | 'error'>('saved');
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

  // Debounced onChange timer for fast auto-save
  const onChangeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if questionId is a valid UUID (not a preview ID like "q_1")
  const isValidUUID = (id: string | undefined): boolean => {
    if (!id) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  // ✅ NEW: Check if ID is a temporary ID from JSON import (e.g., "q_1", "q_1-part-0", "q_1-part-0-sub-2")
  const isTemporaryId = (id: string | undefined): boolean => {
    if (!id) return false;
    // Match patterns like: q_1, q_1-part-0, q_1-part-0-sub-2
    return /^q_\d+(-part-\d+)?(-sub-\d+)?$/.test(id);
  };

  // ✅ NEW: Determine question save state
  const isQuestionSaved = questionId && isValidUUID(questionId.trim());
  const isInPreviewMode = questionId && isTemporaryId(questionId);

  // ✅ FIXED: Check if we're in preview mode (question not saved to database yet)
  // In template editor mode with valid UUID, ALWAYS allow database save (admin is actively editing)
  // Only treat as preview if: invalid UUID AND not in template editor mode
  const isPreviewQuestion = !isTemplateEditor &&
                           (!isValidUUID(questionId) ||
                            (subQuestionId && !isValidUUID(subQuestionId)));

  // Preview mode state
  const [previewMode, setPreviewMode] = useState(false);

  // Undo/redo state
  const [history, setHistory] = useState<Array<{cellTypes: typeof cellTypes; cellValues: typeof cellValues; expectedAnswers: typeof expectedAnswers}>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Help panel state
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // ✅ NEW: Check if question exists in database
  useEffect(() => {
    const checkQuestionExistence = async () => {
      // Skip check if questionId is not a valid UUID
      if (!isValidUUID(questionId)) {
        setQuestionExistsInDB(false);
        return;
      }

      setCheckingDBExistence(true);
      try {
        let exists = false;

        // Check in questions_master_admin
        if (questionId) {
          const { data, error } = await supabase
            .from('questions_master_admin')
            .select('id')
            .eq('id', questionId)
            .maybeSingle();

          if (!error && data) {
            exists = true;
          }
        }

        // Check in sub_questions if subQuestionId provided
        if (!exists && subQuestionId && isValidUUID(subQuestionId)) {
          const { data, error } = await supabase
            .from('sub_questions')
            .select('id')
            .eq('id', subQuestionId)
            .maybeSingle();

          if (!error && data) {
            exists = true;
          }
        }

        console.log('[TableCompletion] Database existence check:', {
          questionId,
          subQuestionId,
          exists
        });

        setQuestionExistsInDB(exists);
      } catch (error) {
        console.error('[TableCompletion] Error checking question existence:', error);
        // Assume exists to avoid blocking saves for existing questions
        setQuestionExistsInDB(true);
      } finally {
        setCheckingDBExistence(false);
      }
    };

    checkQuestionExistence();
  }, [questionId, subQuestionId]);

  // Load template from database when in template editor or test modes
  const hasLoadedRef = useRef(false);
  const loadingRef = useRef(false); // Prevent concurrent loads
  const lastLoadedId = useRef<string>(''); // Track last loaded question

  useEffect(() => {
    // PRIORITY 1: If template prop is provided, use it (regardless of preview mode)
    // This ensures templates passed from parent components are used
    if (template && (template.rows > 0 || template.columns > 0)) {
      console.log('[TableCompletion] Using provided template prop with headers:', template.headers);
      loadTemplateFromProp(template);
      return;
    }

    // PRIORITY 2: If in preview mode (question not saved yet), initialize with defaults
    if (isPreviewQuestion) {
      console.log('[TableCompletion] Preview mode - initializing with defaults');
      initializeDefaultTable();
      setIsEditingTemplate(true); // Enable editing for preview
      return;
    }

    // PRIORITY 3: Load template from database for saved questions
    const shouldLoadTemplate = isTemplateEditor || isAdminTestMode || isStudentTestMode;
    const currentId = `${questionId}-${subQuestionId || 'main'}`;

    // Only load if: should load, not currently loading, and haven't loaded this specific question yet
    if (shouldLoadTemplate && !loadingRef.current && lastLoadedId.current !== currentId) {
      console.log('[TableCompletion] Loading template from database for:', currentId);
      lastLoadedId.current = currentId;
      loadingRef.current = true;
      hasLoadedRef.current = true;
      loadExistingTemplate().finally(() => {
        loadingRef.current = false;
      });
    }
  }, [questionId, subQuestionId, isTemplateEditor, isAdminTestMode, isStudentTestMode, template, isPreviewQuestion]);

  const loadTemplateFromProp = (tmpl: TableTemplate) => {
    setRows(tmpl.rows);
    setColumns(tmpl.columns);
    setHeaders(tmpl.headers || Array.from({ length: tmpl.columns }, (_, i) => `Column ${i + 1}`));

    // Build cell types and values
    const types: Record<string, 'locked' | 'editable'> = {};
    const values: Record<string, string> = {};
    const answers: Record<string, string> = {};

    // Process locked cells
    tmpl.lockedCells.forEach(cell => {
      const key = `${cell.row}-${cell.col}`;
      types[key] = 'locked';
      values[key] = String(cell.value || '');
    });

    // Process editable cells
    tmpl.editableCells.forEach(cell => {
      const key = `${cell.row}-${cell.col}`;
      types[key] = 'editable';
      // Find correct answer if exists
      const correctAnswer = tmpl.correctAnswers?.find(ca => ca.row === cell.row && ca.col === cell.col);
      if (correctAnswer) {
        answers[key] = String(correctAnswer.value || '');
      }
    });

    setCellTypes(types);
    setCellValues(values);
    setExpectedAnswers(answers);

    // Initialize table data
    const data: any[][] = Array(tmpl.rows).fill(null).map(() =>
      Array(tmpl.columns).fill('')
    );

    // Fill locked cell values
    Object.entries(values).forEach(([key, val]) => {
      const [row, col] = key.split('-').map(Number);
      if (data[row] && data[row][col] !== undefined) {
        data[row][col] = val;
      }
    });

    setTableData(data);
  };

  const loadExistingTemplate = async () => {
    setLoading(true);
    try {
      // ✅ Use universal loader that checks review tables first, then production tables
      const result = await TableTemplateService.loadTemplateUniversal(
        questionId,
        subQuestionId,
        reviewSessionId,
        questionIdentifier
      );

      if (result.source === 'review') {
        console.log('[TableCompletion] ✅ Loaded template from REVIEW tables');
      } else if (result.source === 'production') {
        console.log('[TableCompletion] ✅ Loaded template from PRODUCTION tables');
      }

      if (result.success && result.template) {
        const tmpl = result.template;
        setRows(tmpl.rows);
        setColumns(tmpl.columns);
        setHeaders(tmpl.headers || Array.from({ length: tmpl.columns }, (_, i) => `Column ${i + 1}`));

        // Build cell types and values from template cells
        const types: Record<string, 'locked' | 'editable'> = {};
        const values: Record<string, string> = {};
        const answers: Record<string, string> = {};

        // ✅ NEW: Build marking configuration from template cells
        const marks: Record<string, number> = {};
        const caseSensitive: Record<string, boolean> = {};
        const equivalentPhrasing: Record<string, boolean> = {};
        const alternatives: Record<string, string[]> = {};

        tmpl.cells.forEach(cell => {
          const key = `${cell.rowIndex}-${cell.colIndex}`;
          types[key] = cell.cellType;
          if (cell.cellType === 'locked' && cell.lockedValue) {
            values[key] = cell.lockedValue;
          } else if (cell.cellType === 'editable' && cell.expectedAnswer) {
            answers[key] = cell.expectedAnswer;
          }

          // ✅ Load marking configuration (defaults to standard values if not set)
          if (cell.cellType === 'editable') {
            marks[key] = cell.marks ?? 1;
            caseSensitive[key] = cell.caseSensitive ?? false;
            equivalentPhrasing[key] = cell.acceptsEquivalentPhrasing ?? false;
            alternatives[key] = cell.alternativeAnswers ?? [];
          }
        });

        // ✅ Load table metadata
        setTableTitle(tmpl.title || '');
        setTableDescription(tmpl.description || '');

        // Batch state updates to reduce re-renders
        setCellTypes(types);
        setCellValues(values);
        setExpectedAnswers(answers);

        // ✅ Set marking configuration state
        setCellMarks(marks);
        setCellCaseSensitive(caseSensitive);
        setCellEquivalentPhrasing(equivalentPhrasing);
        setCellAlternatives(alternatives);

        // Initialize table data
        const data: any[][] = Array(tmpl.rows).fill(null).map(() =>
          Array(tmpl.columns).fill('')
        );

        // Fill locked cell values
        Object.entries(values).forEach(([key, val]) => {
          const [row, col] = key.split('-').map(Number);
          if (data[row] && data[row][col] !== undefined) {
            data[row][col] = val;
          }
        });

        // Fill expected answers for editable cells (display in admin template editing mode)
        Object.entries(answers).forEach(([key, val]) => {
          const [row, col] = key.split('-').map(Number);
          if (data[row] && data[row][col] !== undefined) {
            data[row][col] = val;
          }
        });

        setTableData(data);
      } else {
        // Initialize with default dimensions
        initializeDefaultTable();
        // Auto-enable edit mode when no template exists (first-time setup)
        setIsEditingTemplate(true);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      // Handle both Error instances and Supabase PostgresError objects
      const errorMessage = error instanceof Error
        ? error.message
        : (error as any)?.message || JSON.stringify(error) || 'Unknown error occurred';
      toast.error('Failed to load template', {
        description: errorMessage
      });
      initializeDefaultTable();
      // Auto-enable edit mode on error (likely means no template exists)
      setIsEditingTemplate(true);
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultTable = () => {
    setRows(defaultRows);
    setColumns(defaultCols);
    setHeaders(Array.from({ length: defaultCols }, (_, i) => `Column ${i + 1}`));
    const data: any[][] = Array(defaultRows).fill(null).map(() =>
      Array(defaultCols).fill('')
    );
    setTableData(data);
  };

  // Initialize table data from template
  useEffect(() => {
    if (!isTemplateEditor) {
      const data: any[][] = Array(template.rows).fill(null).map(() =>
        Array(template.columns).fill('')
      );

      // Fill locked cells
      template.lockedCells.forEach(cell => {
        if (data[cell.row] && data[cell.row][cell.col] !== undefined) {
          data[cell.row][cell.col] = cell.value;
        }
      });

      // Fill student answers (only if value exists)
      if (value && value.studentAnswers) {
        Object.entries(value.studentAnswers).forEach(([key, val]) => {
          const [row, col] = key.split('-').map(Number);
          if (data[row] && data[row][col] !== undefined) {
            data[row][col] = val;
          }
        });
      }

      setTableData(data);
    }
  }, [template, value, isTemplateEditor]);

  // Cell selection and configuration handlers
  const handleCellClick = useCallback((row: number, col: number, event?: MouseEvent) => {
    if (!isEditingTemplate) return;

    const cellKey = `${row}-${col}`;

    // Paint mode: quickly change cell type by clicking
    if (paintModeEnabled) {
      const updatedTypes = { ...cellTypes };
      updatedTypes[cellKey] = paintModeType;
      setCellTypes(updatedTypes);
      return;
    }

    // Single click: toggle selection (existing behavior)
    const newSelection = new Set(selectedCells);

    if (newSelection.has(cellKey)) {
      newSelection.delete(cellKey);
    } else {
      newSelection.add(cellKey);
    }

    setSelectedCells(newSelection);
  }, [isEditingTemplate, selectedCells, paintModeEnabled, paintModeType, cellTypes]);

  // Right-click handler for context menu
  const handleCellRightClick = useCallback((row: number, col: number, event: MouseEvent) => {
    if (!isEditingTemplate) return;

    event.preventDefault();
    const cellKey = `${row}-${col}`;
    const cellType = cellTypes[cellKey] || 'locked';
    const cellValue = cellType === 'locked' ? cellValues[cellKey] : expectedAnswers[cellKey];

    // Show inline edit popover at click position
    setInlineEditCell({
      row,
      col,
      x: event.clientX,
      y: event.clientY
    });
    setInlineEditType(cellType);
    setInlineEditValue(cellValue || '');
  }, [isEditingTemplate, cellTypes, cellValues, expectedAnswers]);

  // Select entire row
  const handleSelectRow = useCallback((rowIndex: number) => {
    if (!isEditingTemplate || previewMode) return;

    const newSelection = new Set(selectedCells);
    for (let col = 0; col < columns; col++) {
      const cellKey = `${rowIndex}-${col}`;
      newSelection.add(cellKey);
    }
    setSelectedCells(newSelection);
    toast.success(`Selected row ${rowIndex + 1} (${columns} cells)`);
  }, [isEditingTemplate, previewMode, selectedCells, columns]);

  // Select entire column
  const handleSelectColumn = useCallback((colIndex: number) => {
    if (!isEditingTemplate || previewMode) return;

    const newSelection = new Set(selectedCells);
    for (let row = 0; row < rows; row++) {
      const cellKey = `${row}-${colIndex}`;
      newSelection.add(cellKey);
    }
    setSelectedCells(newSelection);
    toast.success(`Selected column ${colIndex + 1} (${rows} cells)`);
  }, [isEditingTemplate, previewMode, selectedCells, rows]);

  // Configure cell meta (locked/editable styling)
  const cellRenderer = useCallback((
    instance: any,
    td: HTMLTableCellElement,
    row: number,
    col: number,
    prop: string | number,
    value: any,
    cellProperties: any
  ) => {
    Handsontable.renderers.TextRenderer.apply(this, [instance, td, row, col, prop, value, cellProperties] as any);

    const cellKey = `${row}-${col}`;
    const isSelected = isEditingTemplate && selectedCells.has(cellKey);
    const cellType = cellTypes[cellKey];

    // Student Test Mode - Clean, simple rendering
    if (isStudentTestMode) {
      const isEditable = template.editableCells?.some(c => c.row === row && c.col === col);
      const hasAnswer = value && String(value).trim().length > 0;
      const isEmpty = !hasAnswer && isEditable;

      if (isEditable) {
        // Editable cells: white background for student input
        td.style.backgroundColor = showCorrectAnswers
          ? (checkAnswer(row, col, value) ? '#d1fae5' : '#fee2e2')
          : '#ffffff';
        td.style.color = '#1f2937';
        td.style.fontWeight = 'normal';
        td.style.border = '1px solid #e5e7eb';

        // Show validation warning for empty cells when showValidationWarnings is true
        if (isEmpty && showValidationWarnings) {
          td.style.border = '2px solid #ef4444';
          td.style.backgroundColor = '#fee2e2';
        }

        // Show correct/incorrect indicators after submission
        if (showCorrectAnswers && hasAnswer) {
          const isCorrect = checkAnswer(row, col, value);
          const indicator = document.createElement('span');
          indicator.style.cssText = `
            position: absolute;
            top: 4px;
            right: 4px;
            font-size: 14px;
            font-weight: bold;
          `;
          indicator.innerHTML = isCorrect ? '✓' : '✗';
          td.style.position = 'relative';
          if (!td.querySelector('span')) {
            td.appendChild(indicator);
          }
        }
      } else {
        // Locked cells: gray background with pre-filled data
        td.style.backgroundColor = '#f3f4f6';
        td.style.color = '#4b5563';
        td.style.fontWeight = '500';
        td.style.border = '1px solid #d1d5db';
        td.style.position = 'relative';

        // Add small lock icon
        if (!td.querySelector('.lock-icon')) {
          const lockIcon = document.createElement('span');
          lockIcon.className = 'lock-icon';
          lockIcon.innerHTML = '🔒';
          lockIcon.style.cssText = `
            position: absolute;
            top: 2px;
            right: 2px;
            font-size: 10px;
            opacity: 0.4;
          `;
          td.appendChild(lockIcon);
        }
      }

      return td;
    }

    // Selection styling (blue border in edit mode)
    if (isSelected) {
      td.style.border = '2px solid #3B82F6';
      td.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)';
    }

    // Cell type styling with visual badges
    if (cellType === 'locked') {
      // Improved locked cell colors - more distinct
      td.style.backgroundColor = isEditingTemplate ? '#f3f4f6' : '#e5e7eb';
      td.style.color = '#4b5563';
      td.style.fontWeight = '500';
      td.style.position = 'relative';
      td.style.borderLeft = '3px solid #9ca3af';
      td.classList.add('locked-cell');

      // Add visual badge for locked cells in admin mode
      if (isEditingTemplate && !td.querySelector('.cell-badge')) {
        const badge = document.createElement('span');
        badge.className = 'cell-badge';
        badge.innerHTML = '🔒';
        badge.title = 'Locked cell - students cannot edit';
        badge.style.cssText = `
          position: absolute;
          top: 2px;
          right: 2px;
          font-size: 11px;
          opacity: 0.7;
          pointer-events: none;
          z-index: 10;
          background: rgba(107, 114, 128, 0.15);
          padding: 2px 4px;
          border-radius: 3px;
        `;
        td.appendChild(badge);
      }
    } else if (cellType === 'editable') {
      const hasExpectedAnswer = expectedAnswers[cellKey] && expectedAnswers[cellKey].trim() !== '';

      // Improved editable cell colors - more vibrant and distinct
      if (showCorrectAnswers) {
        td.style.backgroundColor = checkAnswer(row, col, value) ? '#d1fae5' : '#fee2e2';
      } else {
        // Different colors based on whether expected answer is set
        td.style.backgroundColor = hasExpectedAnswer ? '#d1fae5' : '#fef3c7';
        td.style.borderLeft = hasExpectedAnswer ? '3px solid #10b981' : '3px solid #f59e0b';
      }
      td.style.position = 'relative';
      td.classList.add('editable-cell');

      // Add visual badges for editable cells in admin mode
      if (isEditingTemplate && !td.querySelector('.cell-badges-container')) {
        const badgesContainer = document.createElement('div');
        badgesContainer.className = 'cell-badges-container';
        badgesContainer.style.cssText = `
          position: absolute;
          top: 2px;
          right: 2px;
          display: flex;
          gap: 2px;
          align-items: center;
          pointer-events: none;
          z-index: 10;
        `;

        // Main status badge (checkmark or pencil)
        const mainBadge = document.createElement('span');
        mainBadge.className = 'cell-badge';
        mainBadge.innerHTML = hasExpectedAnswer ? '✓' : '✏️';
        mainBadge.title = hasExpectedAnswer ? 'Expected answer set' : 'Set expected answer';
        mainBadge.style.cssText = `
          font-size: ${hasExpectedAnswer ? '14px' : '11px'};
          font-weight: ${hasExpectedAnswer ? 'bold' : 'normal'};
          opacity: 0.8;
          background: ${hasExpectedAnswer ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'};
          color: ${hasExpectedAnswer ? '#059669' : '#d97706'};
          padding: 2px 4px;
          border-radius: 3px;
        `;
        badgesContainer.appendChild(mainBadge);

        // Marking configuration badges
        const marks = cellMarks[cellKey] ?? 1;
        const isCaseSensitive = cellCaseSensitive[cellKey] ?? false;
        const hasEquivPhrasing = cellEquivalentPhrasing[cellKey] ?? false;
        const altCount = (cellAlternatives[cellKey] || []).filter(a => a.trim()).length;

        // Show marks badge if not default (1)
        if (marks > 1) {
          const marksBadge = document.createElement('span');
          marksBadge.className = 'marks-badge';
          marksBadge.innerHTML = `${marks}pt${marks > 1 ? 's' : ''}`;
          marksBadge.title = `Worth ${marks} mark${marks > 1 ? 's' : ''}`;
          marksBadge.style.cssText = `
            font-size: 9px;
            font-weight: bold;
            background: #fbbf24;
            color: #78350f;
            padding: 2px 4px;
            border-radius: 3px;
          `;
          badgesContainer.appendChild(marksBadge);
        }

        // Show case sensitivity badge
        if (isCaseSensitive) {
          const caseBadge = document.createElement('span');
          caseBadge.className = 'case-badge';
          caseBadge.innerHTML = 'Aa';
          caseBadge.title = 'Case sensitive';
          caseBadge.style.cssText = `
            font-size: 9px;
            font-weight: bold;
            background: #dc2626;
            color: white;
            padding: 2px 4px;
            border-radius: 3px;
          `;
          badgesContainer.appendChild(caseBadge);
        }

        // Show equivalent phrasing badge
        if (hasEquivPhrasing) {
          const equivBadge = document.createElement('span');
          equivBadge.className = 'equiv-badge';
          equivBadge.innerHTML = '≈';
          equivBadge.title = 'Accepts equivalent phrasing';
          equivBadge.style.cssText = `
            font-size: 11px;
            font-weight: bold;
            background: #3b82f6;
            color: white;
            padding: 2px 4px;
            border-radius: 3px;
          `;
          badgesContainer.appendChild(equivBadge);
        }

        // Show alternatives count badge
        if (altCount > 0) {
          const altBadge = document.createElement('span');
          altBadge.className = 'alt-badge';
          altBadge.innerHTML = `+${altCount}`;
          altBadge.title = `${altCount} alternative answer${altCount > 1 ? 's' : ''}`;
          altBadge.style.cssText = `
            font-size: 9px;
            font-weight: bold;
            background: #8b5cf6;
            color: white;
            padding: 2px 4px;
            border-radius: 3px;
          `;
          badgesContainer.appendChild(altBadge);
        }

        td.appendChild(badgesContainer);
      }

      // Add distinctive border in edit mode
      if (isEditingTemplate) {
        td.style.border = '2px solid #fde047';
      }
    } else {
      // Undefined cells or legacy template support
      const isEditable = template.editableCells?.some(c => c.row === row && c.col === col);
      const isLocked = template.lockedCells?.some(c => c.row === row && c.col === col);

      if (isEditable) {
        td.style.backgroundColor = showCorrectAnswers ?
          (checkAnswer(row, col, value) ? '#dcfce7' : '#fee2e2') :
          '#ffffff';
        td.classList.add('editable-cell');
      } else {
        // Default to locked styling (includes both explicitly locked and undefined cells)
        td.style.backgroundColor = '#f3f4f6';
        td.style.color = '#6b7280';
        td.style.fontWeight = '500';
        td.classList.add('locked-cell');

        // Add visual badge for undefined cells in admin mode
        if (isEditingTemplate && !isLocked && !td.querySelector('.cell-badge')) {
          const badge = document.createElement('span');
          badge.className = 'cell-badge';
          badge.innerHTML = '🔒';
          badge.style.cssText = `
            position: absolute;
            top: 2px;
            right: 2px;
            font-size: 10px;
            opacity: 0.4;
            pointer-events: none;
            z-index: 10;
          `;
          td.appendChild(badge);
        } else if (isEditingTemplate && isLocked && !td.querySelector('.cell-badge')) {
          const badge = document.createElement('span');
          badge.className = 'cell-badge';
          badge.innerHTML = '🔒';
          badge.style.cssText = `
            position: absolute;
            top: 2px;
            right: 2px;
            font-size: 10px;
            opacity: 0.6;
            pointer-events: none;
            z-index: 10;
          `;
          td.appendChild(badge);
        }
      }
    }

    // Add click handlers for cell selection in edit mode (but not in preview mode)
    if (isEditingTemplate && !previewMode) {
      td.style.cursor = paintModeEnabled ? 'crosshair' : 'pointer';
      td.onclick = () => handleCellClick(row, col);
      td.oncontextmenu = (e: any) => handleCellRightClick(row, col, e);
    }

    return td;
  }, [
    template,
    showCorrectAnswers,
    isEditingTemplate,
    selectedCells,
    cellTypes,
    expectedAnswers,
    cellMarks,
    cellCaseSensitive,
    cellEquivalentPhrasing,
    cellAlternatives,
    handleCellClick,
    handleCellRightClick,
    paintModeEnabled,
    previewMode,
    isStudentTestMode,
    showValidationWarnings
  ]);

  const checkAnswer = (row: number, col: number, studentValue: any): boolean => {
    if (!template.correctAnswers || !autoGrade) return true;

    const correctCell = template.correctAnswers.find(c => c.row === row && c.col === col);
    if (!correctCell) return true;

    return String(studentValue).trim().toLowerCase() ===
           String(correctCell.value).trim().toLowerCase();
  };

  // Debounced onChange to prevent excessive save calls
  const debouncedOnChange = useCallback((data: TableCompletionData) => {
    // Clear any pending timer
    if (onChangeTimerRef.current) {
      clearTimeout(onChangeTimerRef.current);
    }

    // Set new timer for 1.5 seconds (fast auto-save like other fields)
    onChangeTimerRef.current = setTimeout(() => {
      console.log('[TableCompletion] Debounced onChange triggered:', data);
      onChange(data);
      onChangeTimerRef.current = null;
    }, 1500);
  }, [onChange]);

  const handleAfterChange = useCallback((changes: any, source: string) => {
    if (!changes || source === 'loadData') return;

    console.log('[TableCompletion] handleAfterChange:', {
      changes,
      source,
      isTemplateEditor,
      isEditingTemplate
    });

    // Template editor mode: Track direct cell edits during template creation
    if (isTemplateEditor && isEditingTemplate) {
      const updatedValues = { ...cellValues };
      const updatedAnswers = { ...expectedAnswers };
      const updatedTypes = { ...cellTypes };

      changes.forEach(([row, col, oldValue, newValue]: any) => {
        const cellKey = `${row}-${col}`;
        const cellType = cellTypes[cellKey];

        // Update the appropriate storage based on cell type
        if (cellType === 'locked') {
          // Store as locked value
          updatedValues[cellKey] = newValue || '';
        } else if (cellType === 'editable') {
          // Store as expected answer
          updatedAnswers[cellKey] = newValue || '';
        } else {
          // Undefined cell - default to locked with value
          if (newValue && String(newValue).trim().length > 0) {
            updatedTypes[cellKey] = 'locked';
            updatedValues[cellKey] = newValue;
          }
        }
      });

      setCellValues(updatedValues);
      setExpectedAnswers(updatedAnswers);
      setCellTypes(updatedTypes);

      // CRITICAL FIX: Also trigger onChange for auto-save
      // Build student answers from current cell values (for preview/testing)
      const studentAnswers: Record<string, string | number> = {};
      Object.entries(updatedValues).forEach(([key, val]) => {
        if (val && String(val).trim().length > 0) {
          studentAnswers[key] = val;
        }
      });
      Object.entries(updatedAnswers).forEach(([key, val]) => {
        if (val && String(val).trim().length > 0) {
          studentAnswers[key] = val;
        }
      });

      const completedCells = Object.keys(studentAnswers).length;
      const requiredCells = Object.values(updatedTypes).filter(t => t === 'editable').length || 1;

      console.log('[TableCompletion] Triggering debounced onChange from template editor:', {
        studentAnswers,
        completedCells,
        requiredCells
      });

      debouncedOnChange({
        studentAnswers,
        completedCells,
        requiredCells
      });

      return;
    }

    // Student mode: Track answers to editable cells
    const studentAnswers = { ...(value?.studentAnswers || {}) };
    let completedCells = 0;

    changes.forEach(([row, col, oldValue, newValue]: any) => {
      const isEditable = template.editableCells.some(c => c.row === row && c.col === col);

      if (isEditable) {
        const key = `${row}-${col}`;
        studentAnswers[key] = newValue;

        if (newValue && String(newValue).trim().length > 0) {
          completedCells++;
        }
      }
    });

    // Count all completed cells
    completedCells = Object.values(studentAnswers)
      .filter(v => v && String(v).trim().length > 0).length;

    console.log('[TableCompletion] Triggering debounced onChange from student mode:', {
      studentAnswers,
      completedCells,
      requiredCells: template.editableCells.length
    });

    debouncedOnChange({
      studentAnswers,
      completedCells,
      requiredCells: template.editableCells.length
    });
  }, [template, value, debouncedOnChange, isTemplateEditor, isEditingTemplate, cellValues, expectedAnswers, cellTypes]);

  const handleReset = () => {
    onChange({
      studentAnswers: {},
      completedCells: 0,
      requiredCells: template.editableCells.length
    });
  };

  // Dimension control handlers
  const handleAddRow = useCallback(() => {
    if (rows >= maxRows) {
      toast.warning(`Maximum ${maxRows} rows allowed`);
      return;
    }

    const newRows = rows + 1;
    const newData = [...tableData, Array(columns).fill('')];

    setRows(newRows);
    setTableData(newData);

    const hot = hotRef.current?.hotInstance;
    if (hot) {
      hot.loadData(newData);
    }
  }, [rows, maxRows, tableData, columns]);

  const handleRemoveRow = useCallback(() => {
    if (rows <= minRows) {
      toast.warning(`Minimum ${minRows} rows required`);
      return;
    }

    const newRows = rows - 1;
    const newData = tableData.slice(0, -1);

    // Remove cell types and values for deleted row
    const lastRowIndex = rows - 1;
    const updatedCellTypes = { ...cellTypes };
    const updatedCellValues = { ...cellValues };
    const updatedExpectedAnswers = { ...expectedAnswers };

    for (let col = 0; col < columns; col++) {
      const cellKey = `${lastRowIndex}-${col}`;
      delete updatedCellTypes[cellKey];
      delete updatedCellValues[cellKey];
      delete updatedExpectedAnswers[cellKey];
    }

    setRows(newRows);
    setTableData(newData);
    setCellTypes(updatedCellTypes);
    setCellValues(updatedCellValues);
    setExpectedAnswers(updatedExpectedAnswers);

    const hot = hotRef.current?.hotInstance;
    if (hot) {
      hot.loadData(newData);
    }
  }, [rows, minRows, tableData, columns, cellTypes, cellValues, expectedAnswers]);

  const handleAddColumn = useCallback(() => {
    if (columns >= maxCols) {
      toast.warning(`Maximum ${maxCols} columns allowed`);
      return;
    }

    const newColumns = columns + 1;
    const newHeaders = [...headers, `Column ${newColumns}`];
    const newData = tableData.map(row => [...row, '']);

    setColumns(newColumns);
    setHeaders(newHeaders);
    setTableData(newData);

    const hot = hotRef.current?.hotInstance;
    if (hot) {
      hot.updateSettings({ colHeaders: newHeaders });
      hot.loadData(newData);
    }
  }, [columns, maxCols, headers, tableData]);

  const handleRemoveColumn = useCallback(() => {
    if (columns <= minCols) {
      toast.warning(`Minimum ${minCols} columns required`);
      return;
    }

    const newColumns = columns - 1;
    const newHeaders = headers.slice(0, -1);
    const newData = tableData.map(row => row.slice(0, -1));

    // Remove cell types and values for deleted column
    const lastColIndex = columns - 1;
    const updatedCellTypes = { ...cellTypes };
    const updatedCellValues = { ...cellValues };
    const updatedExpectedAnswers = { ...expectedAnswers };

    for (let row = 0; row < rows; row++) {
      const cellKey = `${row}-${lastColIndex}`;
      delete updatedCellTypes[cellKey];
      delete updatedCellValues[cellKey];
      delete updatedExpectedAnswers[cellKey];
    }

    setColumns(newColumns);
    setHeaders(newHeaders);
    setTableData(newData);
    setCellTypes(updatedCellTypes);
    setCellValues(updatedCellValues);
    setExpectedAnswers(updatedExpectedAnswers);

    const hot = hotRef.current?.hotInstance;
    if (hot) {
      hot.updateSettings({ colHeaders: newHeaders });
      hot.loadData(newData);
    }
  }, [columns, minCols, headers, tableData, rows, cellTypes, cellValues, expectedAnswers]);

  const handleHeaderChange = useCallback((index: number, value: string) => {
    console.log(`[TableCompletion] Header change: Column ${index} = "${value}"`);

    const newHeaders = [...headers];
    newHeaders[index] = value;
    setHeaders(newHeaders);

    // Force Handsontable to update column headers immediately
    const hot = hotRef.current?.hotInstance;
    if (hot) {
      hot.updateSettings({ colHeaders: newHeaders }, false);
      hot.render();
    }

    // Mark as unsaved to trigger auto-save (debounced)
    if (isEditingTemplate) {
      console.log('[TableCompletion] Marking template as unsaved due to header change');
      setAutoSaveStatus('unsaved');

      // CRITICAL FIX: Immediately trigger onChange to persist header changes
      // This ensures headers are saved with the same fast auto-save flow as cell content
      console.log('[TableCompletion] Triggering debounced onChange for header change');

      // Build current state and call onChange
      const studentAnswers: Record<string, string | number> = {};

      // Include locked cell values
      Object.entries(cellValues).forEach(([key, val]) => {
        if (val && String(val).trim().length > 0) {
          studentAnswers[key] = val;
        }
      });

      // Include expected answers for editable cells
      Object.entries(expectedAnswers).forEach(([key, val]) => {
        if (val && String(val).trim().length > 0) {
          studentAnswers[key] = val;
        }
      });

      const completedCells = Object.keys(studentAnswers).length;
      const requiredCells = Object.values(cellTypes).filter(t => t === 'editable').length || 1;

      console.log('[TableCompletion] Header change triggering onChange with current state:', {
        headerIndex: index,
        newHeaderValue: value,
        studentAnswersCount: completedCells,
        requiredCells
      });

      // Trigger debounced onChange to save current state (includes header metadata indirectly)
      debouncedOnChange({
        studentAnswers,
        completedCells,
        requiredCells
      });
    }
  }, [headers, isEditingTemplate, cellValues, expectedAnswers, cellTypes, debouncedOnChange]);

  const handleApplyCellType = useCallback(() => {
    if (selectedCells.size === 0 || !tempCellValue.trim()) return;

    const updatedTypes = { ...cellTypes };
    const updatedValues = { ...cellValues };
    const updatedAnswers = { ...expectedAnswers };
    const newTableData = tableData.map(row => [...row]); // Deep copy for proper state update

    selectedCells.forEach(cellKey => {
      const [row, col] = cellKey.split('-').map(Number);
      updatedTypes[cellKey] = currentCellType;

      if (currentCellType === 'locked') {
        updatedValues[cellKey] = tempCellValue;
        // Update table data for locked cells
        if (newTableData[row] && newTableData[row][col] !== undefined) {
          newTableData[row][col] = tempCellValue;
        }
      } else {
        // Store expected answer and also display it in the table (for admin template editing)
        updatedAnswers[cellKey] = tempCellValue;
        // Update table data for editable cells to show expected answer
        if (newTableData[row] && newTableData[row][col] !== undefined) {
          newTableData[row][col] = tempCellValue;
        }
      }
    });

    setCellTypes(updatedTypes);
    setCellValues(updatedValues);
    setExpectedAnswers(updatedAnswers);
    setTableData(newTableData);
    setSelectedCells(new Set());
    setTempCellValue('');

    // Update Handsontable with force render
    const hot = hotRef.current?.hotInstance;
    if (hot) {
      hot.loadData(newTableData);
      // Force a complete re-render to show the updates
      setTimeout(() => {
        hot.render();
      }, 0);
    }

    toast.success(`Applied ${currentCellType} type to ${selectedCells.size} cell(s) with value "${tempCellValue}"`);
  }, [selectedCells, currentCellType, tempCellValue, cellTypes, cellValues, expectedAnswers, tableData]);

  const handleClearSelection = useCallback(() => {
    setSelectedCells(new Set());
    setTempCellValue('');
  }, []);

  // Handle inline edit apply
  const handleApplyInlineEdit = useCallback(() => {
    if (!inlineEditCell) return;

    const cellKey = `${inlineEditCell.row}-${inlineEditCell.col}`;
    const updatedTypes = { ...cellTypes };
    const updatedValues = { ...cellValues };
    const updatedAnswers = { ...expectedAnswers };
    const newTableData = tableData.map(row => [...row]); // Deep copy for proper state update

    updatedTypes[cellKey] = inlineEditType;

    if (inlineEditType === 'locked') {
      updatedValues[cellKey] = inlineEditValue;
      if (newTableData[inlineEditCell.row] && newTableData[inlineEditCell.row][inlineEditCell.col] !== undefined) {
        newTableData[inlineEditCell.row][inlineEditCell.col] = inlineEditValue;
      }
      delete updatedAnswers[cellKey]; // Remove from answers if switching to locked
    } else {
      // Store expected answer and also display it in the table (for admin template editing)
      updatedAnswers[cellKey] = inlineEditValue;
      // Update table data for editable cells to show expected answer
      if (newTableData[inlineEditCell.row] && newTableData[inlineEditCell.row][inlineEditCell.col] !== undefined) {
        newTableData[inlineEditCell.row][inlineEditCell.col] = inlineEditValue;
      }
      delete updatedValues[cellKey]; // Remove from values if switching to editable
    }

    setCellTypes(updatedTypes);
    setCellValues(updatedValues);
    setExpectedAnswers(updatedAnswers);
    setTableData(newTableData);

    // Update Handsontable with force render
    const hot = hotRef.current?.hotInstance;
    if (hot) {
      hot.loadData(newTableData);
      // Force a complete re-render to show the updates
      setTimeout(() => {
        hot.render();
      }, 0);
    }

    setInlineEditCell(null);
    toast.success(`Cell configured as ${inlineEditType} with value "${inlineEditValue}"`);
  }, [inlineEditCell, inlineEditType, inlineEditValue, cellTypes, cellValues, expectedAnswers, tableData]);

  // Keyboard shortcuts for better UX
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditingTemplate) return;

      // Escape key - clear selection
      if (e.key === 'Escape' && selectedCells.size > 0) {
        handleClearSelection();
        e.preventDefault();
      }

      // Enter key in edit mode - apply if value entered
      if (e.key === 'Enter' && selectedCells.size > 0 && tempCellValue.trim() && document.activeElement?.tagName !== 'INPUT') {
        handleApplyCellType();
        e.preventDefault();
      }

      // Keyboard shortcuts for cell type assignment
      if (selectedCells.size > 0 && document.activeElement?.tagName !== 'INPUT') {
        // Ctrl/Cmd + L = Mark as Locked
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
          const updatedTypes = { ...cellTypes };
          selectedCells.forEach(cellKey => {
            updatedTypes[cellKey] = 'locked';
          });
          setCellTypes(updatedTypes);
          toast.success(`Marked ${selectedCells.size} cell(s) as locked (Ctrl+L)`);
          e.preventDefault();
        }

        // Ctrl/Cmd + E = Mark as Editable
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
          const updatedTypes = { ...cellTypes };
          selectedCells.forEach(cellKey => {
            updatedTypes[cellKey] = 'editable';
          });
          setCellTypes(updatedTypes);
          toast.success(`Marked ${selectedCells.size} cell(s) as editable (Ctrl+E)`);
          e.preventDefault();
        }

        // Delete key = Clear selected cells
        if (e.key === 'Delete' || e.key === 'Backspace') {
          const updatedTypes = { ...cellTypes };
          const updatedValues = { ...cellValues };
          const updatedAnswers = { ...expectedAnswers };
          const newTableData = [...tableData];

          selectedCells.forEach(cellKey => {
            const [row, col] = cellKey.split('-').map(Number);
            delete updatedTypes[cellKey];
            delete updatedValues[cellKey];
            delete updatedAnswers[cellKey];
            if (newTableData[row] && newTableData[row][col] !== undefined) {
              newTableData[row][col] = '';
            }
          });

          setCellTypes(updatedTypes);
          setCellValues(updatedValues);
          setExpectedAnswers(updatedAnswers);
          setTableData(newTableData);

          const hot = hotRef.current?.hotInstance;
          if (hot) {
            hot.loadData(newTableData);
          }

          toast.success(`Cleared ${selectedCells.size} cell(s) (Delete)`);
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditingTemplate, selectedCells, tempCellValue, handleClearSelection, handleApplyCellType, cellTypes, cellValues, expectedAnswers, tableData, hotRef]);

  // Template save handler
  const handleSaveTemplate = async (silent = false) => {
    if (!silent) {
      // Show validation warnings on save attempt
      setShowTemplateValidationWarnings(true);
    }

    // CRITICAL FIX: Flush any pending debounced onChange immediately
    if (onChangeTimerRef.current) {
      clearTimeout(onChangeTimerRef.current);
      onChangeTimerRef.current = null;

      // Build and trigger immediate onChange for pending data
      const studentAnswers: Record<string, string | number> = {};
      Object.entries(cellValues).forEach(([key, val]) => {
        if (val && String(val).trim().length > 0) {
          studentAnswers[key] = val;
        }
      });
      Object.entries(expectedAnswers).forEach(([key, val]) => {
        if (val && String(val).trim().length > 0) {
          studentAnswers[key] = val;
        }
      });

      const completedCells = Object.keys(studentAnswers).length;
      const requiredCells = Object.values(cellTypes).filter(t => t === 'editable').length || 1;

      console.log('[TableCompletion] Flushing pending onChange before template save:', {
        studentAnswers,
        completedCells,
        requiredCells
      });

      onChange({
        studentAnswers,
        completedCells,
        requiredCells
      });
    }

    // Check for validation issues
    const editableCellsCount = Object.values(cellTypes).filter(type => type === 'editable').length;
    const answersSetCount = Object.values(expectedAnswers).filter(v => v && String(v).trim().length > 0).length;

    // Block save if no editable cells
    if (editableCellsCount === 0) {
      if (!silent) {
        toast.error('Cannot save: No editable cells defined. Mark at least one cell as editable.');
      }
      return;
    }

    // Warn if missing expected answers but allow save
    if (!silent && answersSetCount < editableCellsCount) {
      toast.error(`Warning: ${editableCellsCount - answersSetCount} editable cell(s) missing expected answers. Auto-grading may not work properly.`, {
        duration: 5000
      });
    }

    setAutoSaveStatus('saving');
    setLoading(true);

    // ✅ ENHANCED: Check if question has temporary ID from import or not saved yet
    // If question not saved (temporary ID or no valid UUID), save template to preview_data
    if (isInPreviewMode || !isQuestionSaved) {
      console.log('[TableCompletion] Preview mode detected - saving to preview_data:', {
        questionId,
        isInPreviewMode,
        isQuestionSaved,
        isTemporaryId: isTemporaryId(questionId)
      });
      try {
        // Build template object
        const cells: TableCellDTO[] = [];
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < columns; col++) {
            const key = `${row}-${col}`;
            const type = cellTypes[key] || 'locked';
            cells.push({
              rowIndex: row,
              colIndex: col,
              cellType: type,
              lockedValue: type === 'locked' ? (cellValues[key] || '') : undefined,
              expectedAnswer: type === 'editable' ? (expectedAnswers[key] || '') : undefined,
              // ✅ Use configured marking values instead of hardcoded
              marks: cellMarks[key] ?? 1,
              caseSensitive: cellCaseSensitive[key] ?? false,
              acceptsEquivalentPhrasing: cellEquivalentPhrasing[key] ?? false,
              alternativeAnswers: cellAlternatives[key] ?? []
            });
          }
        }

        // ✅ FIX: Always include questionId, only include subQuestionId if valid UUID
        const templateData: TableTemplateDTO = {
          questionId, // Always include - required by service
          subQuestionId: (subQuestionId && isValidUUID(subQuestionId)) ? subQuestionId : undefined,
          rows,
          columns,
          headers,
          title: tableTitle || undefined,
          description: tableDescription || undefined,
          cells
        };

        // Notify parent via callback (for in-memory storage)
        onTemplateSave?.(templateData);

        if (!silent) {
          toast.info('✓ Template configured (Preview Mode)', {
            description: 'Template will be saved to database when question is saved',
            duration: 5000
          });
        }
        setAutoSaveStatus('preview');
        setLastSaveTime(new Date());
      } catch (error) {
        console.error('Error saving template in preview mode:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (!silent) {
          toast.error('Failed to configure template', {
            description: errorMessage
          });
        }
        setAutoSaveStatus('error');
      } finally {
        setLoading(false);
      }
      return;
    }

    // ✅ NEW: Determine if we're in review mode or production mode
    const isReviewMode = !!(reviewSessionId && questionIdentifier);

    console.log('[TableCompletion] Save mode detection:', {
      isReviewMode,
      reviewSessionId,
      questionIdentifier,
      questionId,
      isValidUUID: isValidUUID(questionId)
    });

    // ✅ REVIEW MODE: Save to review tables (allows temporary IDs)
    if (isReviewMode) {
      console.log('[TableCompletion] ✅ Using REVIEW MODE save');

      try {
        // Build cells array
        const cells: TableCellDTO[] = [];

      // Iterate through all cells in the table
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const key = `${row}-${col}`;
          const type = cellTypes[key];

          // Default undefined cells to locked with empty value
          const cellType = type || 'locked';

          cells.push({
            rowIndex: row,
            colIndex: col,
            cellType: cellType,
            lockedValue: cellType === 'locked' ? (cellValues[key] || '') : undefined,
            expectedAnswer: cellType === 'editable' ? (expectedAnswers[key] || '') : undefined,
            // ✅ Use configured marking values instead of hardcoded
            marks: cellMarks[key] ?? 1,
            caseSensitive: cellCaseSensitive[key] ?? false,
            acceptsEquivalentPhrasing: cellEquivalentPhrasing[key] ?? false,
            alternativeAnswers: cellAlternatives[key] ?? []
          });
        }
      }

        // Build review template
        const reviewTemplate: TableTemplateReviewDTO = {
          reviewSessionId: reviewSessionId!,
          questionIdentifier: questionIdentifier!,
          isSubquestion: !!subQuestionId,
          rows,
          columns,
          headers,
          title: tableTitle || undefined,
          description: tableDescription || undefined,
          cells
        };

        const result = await TableTemplateImportReviewService.saveTemplateForReview(reviewTemplate);

        if (result.success) {
          if (!silent) {
            toast.success('✅ Template saved to review database!', {
              description: 'Template will migrate to production on import approval',
              duration: 4000
            });
          }
          // Convert to production DTO format for callback
          const productionTemplate: TableTemplateDTO = {
            questionId: questionIdentifier!,
            subQuestionId: reviewTemplate.isSubquestion ? questionIdentifier : undefined,
            rows: reviewTemplate.rows,
            columns: reviewTemplate.columns,
            headers: reviewTemplate.headers,
            title: reviewTemplate.title,
            description: reviewTemplate.description,
            cells: reviewTemplate.cells
          };
          onTemplateSave?.(productionTemplate);
          setAutoSaveStatus('saved');
          setLastSaveTime(new Date());
          if (!silent) {
            setIsEditingTemplate(false);
          }
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error saving template to review database:', error);
        setAutoSaveStatus('error');
        if (!silent) {
          const errorMessage = error instanceof Error
            ? error.message
            : (error as any)?.message || JSON.stringify(error) || 'Unknown error occurred';
          toast.error('Failed to save template to review database', {
            description: errorMessage
          });
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // ✅ PRODUCTION MODE: Save to production tables (requires valid UUIDs)
    console.log('[TableCompletion] ✅ Using PRODUCTION MODE save');

    // Validation before database save
    if (!questionId || !isValidUUID(questionId.trim())) {
      const errorMsg = 'Cannot save template: Question must be saved first';
      console.error('[TableCompletion]', errorMsg, { questionId });
      if (!silent) {
        toast.error(errorMsg, {
          description: 'Please save the question before configuring table template',
          duration: 5000
        });
      }
      setAutoSaveStatus('error');
      setLoading(false);
      return;
    }

    try {
      // Build cells array - include ALL cells, defaulting undefined to locked
      const cells: TableCellDTO[] = [];

      // Iterate through all cells in the table
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const key = `${row}-${col}`;
          const type = cellTypes[key];

          // Default undefined cells to locked with empty value
          const cellType = type || 'locked';

          cells.push({
            rowIndex: row,
            colIndex: col,
            cellType: cellType,
            lockedValue: cellType === 'locked' ? (cellValues[key] || '') : undefined,
            expectedAnswer: cellType === 'editable' ? (expectedAnswers[key] || '') : undefined,
            marks: cellMarks[key] ?? 1,
            caseSensitive: cellCaseSensitive[key] ?? false,
            acceptsEquivalentPhrasing: cellEquivalentPhrasing[key] ?? false,
            alternativeAnswers: cellAlternatives[key] ?? []
          });
        }
      }

      // Build production template
      const template: TableTemplateDTO = {
        questionId,
        subQuestionId: (subQuestionId && isValidUUID(subQuestionId)) ? subQuestionId : undefined,
        rows,
        columns,
        headers,
        title: tableTitle || undefined,
        description: tableDescription || undefined,
        cells
      };

      const result = await TableTemplateService.saveTemplate(template);

      if (result.success) {
        if (!silent) {
          toast.success('✅ Template saved to production database!', {
            description: 'Table configuration persisted successfully',
            duration: 4000
          });
        }
        onTemplateSave?.(template);
        setAutoSaveStatus('saved');
        setLastSaveTime(new Date());
        if (!silent) {
          setIsEditingTemplate(false);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving template to production database:', error);
      setAutoSaveStatus('error');
      if (!silent) {
        const errorMessage = error instanceof Error
          ? error.message
          : (error as any)?.message || JSON.stringify(error) || 'Unknown error occurred';
        toast.error('Failed to save template to production database', {
          description: errorMessage
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-save: Monitor changes and mark as unsaved (excluding headers to prevent continuous refresh)
  useEffect(() => {
    if (isEditingTemplate) {
      setAutoSaveStatus('unsaved');
    }
  }, [cellTypes, cellValues, expectedAnswers, rows, columns, isEditingTemplate]);

  // Auto-save: Debounced save every 2 seconds when unsaved (fast auto-save)
  useEffect(() => {
    if (autoSaveStatus === 'unsaved' && isEditingTemplate) {
      const timer = setTimeout(() => {
        console.log('[TableCompletion] Auto-save template structure triggered');
        handleSaveTemplate(true); // Silent save
      }, 2000); // 2 seconds (fast like other fields)

      return () => clearTimeout(timer);
    }
  }, [autoSaveStatus, isEditingTemplate, cellTypes, cellValues, expectedAnswers, headers, rows, columns]);

  // Cleanup: Clear debounced onChange timer on unmount
  useEffect(() => {
    return () => {
      if (onChangeTimerRef.current) {
        clearTimeout(onChangeTimerRef.current);
        onChangeTimerRef.current = null;
      }
    };
  }, []);

  const completionPercentage = value && value.requiredCells > 0
    ? Math.round((value.completedCells / value.requiredCells) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#8CC63F] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading template...</p>
        </div>
      </div>
    );
  }

  // Calculate statistics for admin mode
  const lockedCount = Object.values(cellTypes).filter(t => t === 'locked').length;
  const editableCount = Object.values(cellTypes).filter(t => t === 'editable').length;
  const totalCells = rows * columns;
  const undefinedCount = totalCells - lockedCount - editableCount;

  return (
    <div className="space-y-4">
      {/* Student Test Mode - Progress Indicator (IGCSE Best Practice) */}
      {isStudentTestMode && !showCorrectAnswers && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TableIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Table Completion Progress
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Answered: {value?.completedCells ?? 0} of {value?.requiredCells ?? 0} cells
              </span>
              {(value?.completedCells ?? 0) === (value?.requiredCells ?? 0) && (value?.requiredCells ?? 0) > 0 && (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
              style={{
                width: `${completionPercentage}%`
              }}
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            {completionPercentage}% complete
            {showValidationWarnings && (value?.completedCells ?? 0) < (value?.requiredCells ?? 0) && (
              <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                • {(value?.requiredCells ?? 0) - (value?.completedCells ?? 0)} cell(s) unanswered
              </span>
            )}
          </p>
        </div>
      )}

      {/* Validation Warning Banner */}
      {isStudentTestMode && showValidationWarnings && (value?.completedCells ?? 0) < (value?.requiredCells ?? 0) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-600 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                Incomplete Answers Detected
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                You have {(value?.requiredCells ?? 0) - (value?.completedCells ?? 0)} unanswered cell(s).
                You can still submit, but consider reviewing your answers.
                Empty cells are highlighted with a red border.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary After Submission */}
      {isStudentTestMode && showCorrectAnswers && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Answer Results
            </h3>
          </div>
          {(() => {
            let correctCount = 0;
            let incorrectCount = 0;
            let unansweredCount = 0;

            template.editableCells?.forEach(cell => {
              const key = `${cell.row}-${cell.col}`;
              const studentAnswer = value?.studentAnswers?.[key];
              const hasAnswer = studentAnswer && String(studentAnswer).trim().length > 0;

              if (!hasAnswer) {
                unansweredCount++;
              } else if (checkAnswer(cell.row, cell.col, studentAnswer)) {
                correctCount++;
              } else {
                incorrectCount++;
              }
            });

            const totalCells = template.editableCells?.length ?? 0;
            const percentage = totalCells > 0 ? Math.round((correctCount / totalCells) * 100) : 0;

            return (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-100 dark:bg-green-900/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-300">Correct</span>
                    </div>
                    <p className="text-2xl font-bold text-green-800 dark:text-green-200">{correctCount}</p>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <X className="w-4 h-4 text-red-600" />
                      <span className="text-xs font-medium text-red-700 dark:text-red-300">Incorrect</span>
                    </div>
                    <p className="text-2xl font-bold text-red-800 dark:text-red-200">{incorrectCount}</p>
                  </div>
                  <div className="bg-amber-100 dark:bg-amber-900/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <MinusCircle className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Unanswered</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-800 dark:text-amber-200">{unansweredCount}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Score:</span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {correctCount}/{totalCells} ({percentage}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Template Editor Mode Banner */}
      {isEditingTemplate && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 rounded-lg">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Template Editor Mode
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Configure table structure, locked cells, and expected answers
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Test Simulation Mode Banner */}
      {isAdminTestMode && !isEditingTemplate && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-400 rounded-lg">
          <div className="flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                Test Simulation Mode
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Answer as a student would - Template editor is hidden
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Mode Controls */}
      {isTemplateEditor && !isStudentTestMode && (
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Template Builder Controls
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isEditingTemplate ? (
              <Button
                size="sm"
                onClick={() => setIsEditingTemplate(true)}
                className="bg-[#8CC63F] hover:bg-[#7AB62F] text-white"
              >
                <Edit3 className="w-4 h-4 mr-1" />
                Edit Template
              </Button>
            ) : (
              <>
                {/* Auto-save indicator with database status */}
                <div className="flex items-center gap-2 text-xs">
                  {checkingDBExistence && (
                    <>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                      <span className="text-gray-600 dark:text-gray-400">Checking...</span>
                    </>
                  )}
                  {/* ✅ NEW: Preview mode indicator for temporary/unsaved questions */}
                  {(isInPreviewMode || (!checkingDBExistence && !isQuestionSaved)) && (
                    <>
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span className="text-amber-700 dark:text-amber-400 font-medium">
                        {isInPreviewMode ? 'Preview Mode (Imported)' : 'Preview Only'}
                      </span>
                    </>
                  )}
                  {/* ✅ NEW: Preview status - configured but not saved to DB */}
                  {!checkingDBExistence && isQuestionSaved && autoSaveStatus === 'preview' && (
                    <>
                      <Check className="w-3 h-3 text-blue-600" />
                      <span className="text-blue-600 dark:text-blue-400 font-medium">Configured (pending save)</span>
                    </>
                  )}
                  {!checkingDBExistence && isQuestionSaved && autoSaveStatus === 'saving' && (
                    <>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <Database className="w-3 h-3 text-blue-600 animate-pulse" />
                      <span className="text-gray-600 dark:text-gray-400">Saving to DB...</span>
                    </>
                  )}
                  {!checkingDBExistence && isQuestionSaved && autoSaveStatus === 'saved' && lastSaveTime && (
                    <>
                      <Check className="w-3 h-3 text-green-600" />
                      <Database className="w-3 h-3 text-green-600" />
                      <span className="text-gray-600 dark:text-gray-400">DB Saved {new Date().getTime() - lastSaveTime.getTime() < 60000 ? 'just now' : `${Math.floor((new Date().getTime() - lastSaveTime.getTime()) / 60000)}m ago`}</span>
                    </>
                  )}
                  {!checkingDBExistence && isQuestionSaved && autoSaveStatus === 'unsaved' && (
                    <>
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      <span className="text-gray-600 dark:text-gray-400">Unsaved changes</span>
                    </>
                  )}
                  {/* ✅ NEW: Error status */}
                  {!checkingDBExistence && autoSaveStatus === 'error' && (
                    <>
                      <X className="w-3 h-3 text-red-600" />
                      <span className="text-red-600 dark:text-red-400 font-medium">Save failed</span>
                    </>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowKeyboardHelp(true)}
                  title="Show keyboard shortcuts"
                  className="text-gray-600 dark:text-gray-400"
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={previewMode ? 'default' : 'outline'}
                  onClick={() => setPreviewMode(!previewMode)}
                  className={cn(
                    previewMode && "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                  title="Toggle preview mode to see student view"
                >
                  {previewMode ? <Edit3 className="w-4 h-4 mr-1" /> : <TableIcon className="w-4 h-4 mr-1" />}
                  {previewMode ? 'Edit Mode' : 'Preview'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingTemplate(false)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSaveTemplate(false)}
                  disabled={loading}
                  className="bg-[#8CC63F] hover:bg-[#7AB62F] text-white"
                  title={
                    isInPreviewMode
                      ? 'Configure template (will be saved when question is saved)'
                      : !isQuestionSaved
                      ? 'Question must be saved first'
                      : 'Save template to database'
                  }
                >
                  <Save className="w-4 h-4 mr-1" />
                  {isInPreviewMode ? 'Configure Template' : 'Save Template'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Preview Question Warning Banner */}
      {isEditingTemplate && isPreviewQuestion && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-2 border-amber-500 dark:border-amber-400">
          <div className="flex items-center justify-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                ⚠️ Question Not in Database - Preview Mode Only
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                Template data will be saved locally. Click "Save Question" in the main form to persist to database.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Mode Banner */}
      {isEditingTemplate && previewMode && !isPreviewQuestion && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-500 dark:border-blue-400">
          <div className="flex items-center justify-center gap-2">
            <TableIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Student Preview Mode - This is how students will see the table
            </span>
          </div>
        </div>
      )}

      {/* Dimension Controls */}
      {isEditingTemplate && !previewMode && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-300 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Table Dimensions
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Quick sizes:</span>
              {[
                { label: '3×3', rows: 3, cols: 3 },
                { label: '5×5', rows: 5, cols: 5 },
                { label: '10×5', rows: 10, cols: 5 },
                { label: '5×10', rows: 5, cols: 10 }
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setRows(preset.rows);
                    setColumns(preset.cols);
                    const newData = Array(preset.rows).fill(null).map(() => Array(preset.cols).fill(''));
                    setTableData(newData);
                    setHeaders(Array.from({ length: preset.cols }, (_, i) => `Column ${i + 1}`));
                    const hot = hotRef.current?.hotInstance;
                    if (hot) {
                      hot.loadData(newData);
                      hot.updateSettings({
                        colHeaders: Array.from({ length: preset.cols }, (_, i) => `Column ${i + 1}`)
                      });
                    }
                    toast.success(`Table size set to ${preset.label}`);
                  }}
                  className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[60px]">
                Rows: {rows}
              </label>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveRow}
                  disabled={rows <= minRows}
                  title="Remove row"
                  className="h-8 w-8 p-0"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddRow}
                  disabled={rows >= maxRows}
                  title="Add row"
                  className="h-8 w-8 p-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <span className="text-xs text-gray-500">
                ({minRows}-{maxRows})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[80px]">
                Columns: {columns}
              </label>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveColumn}
                  disabled={columns <= minCols}
                  title="Remove column"
                  className="h-8 w-8 p-0"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddColumn}
                  disabled={columns >= maxCols}
                  title="Add column"
                  className="h-8 w-8 p-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <span className="text-xs text-gray-500">
                ({minCols}-{maxCols})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Header Editor */}
      {isEditingTemplate && !previewMode && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-300 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Column Headers
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {headers.map((header, index) => (
              <div key={index} className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">
                  Column {index + 1}
                </label>
                <input
                  type="text"
                  value={header}
                  onChange={(e) => handleHeaderChange(index, e.target.value)}
                  placeholder={`Column ${index + 1}`}
                  className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Use descriptive headers to help students understand each column
          </p>
        </div>
      )}

      {/* Cell Configuration Panel */}
      {isEditingTemplate && !previewMode && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-300 dark:border-blue-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Cell Type Configuration
            </h4>
            <span className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded-full">
              {selectedCells.size} cell(s) selected
            </span>
          </div>
          <div className="space-y-2 mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Tip:</strong> You can now type directly into any cell! Cells are locked by default (students cannot edit).
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Keyboard Shortcuts:</strong> Ctrl+L (Lock) | Ctrl+E (Editable) | Delete (Clear) | Esc (Deselect)
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Right-click</strong> any cell for quick configuration | <strong>Paint Mode</strong> to click-and-fill
            </p>
          </div>

          {/* Paint Mode Toggle */}
          <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paintModeEnabled}
                    onChange={(e) => setPaintModeEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
                <div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    🎨 Paint Mode {paintModeEnabled && '(Active)'}
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Click cells to quickly apply type
                  </p>
                </div>
              </div>
              {paintModeEnabled && (
                <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded border border-orange-300 dark:border-orange-700">
                  <button
                    onClick={() => setPaintModeType('locked')}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded transition-colors",
                      paintModeType === 'locked'
                        ? "bg-gray-500 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                    )}
                  >
                    🔒 Locked
                  </button>
                  <button
                    onClick={() => setPaintModeType('editable')}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded transition-colors",
                      paintModeType === 'editable'
                        ? "bg-green-500 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                    )}
                  >
                    ✏️ Editable
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 mb-4">
            <label className="flex items-center gap-3 cursor-pointer group" role="switch" aria-checked={currentCellType === 'editable'}>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cell Type:</span>
              <div className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  checked={currentCellType === 'editable'}
                  onChange={(e) => setCurrentCellType(e.target.checked ? 'editable' : 'locked')}
                  className="sr-only peer"
                  aria-label="Toggle between locked and editable cell type"
                />
                <div className="w-14 h-7 bg-gray-300 peer-focus:ring-4 peer-focus:ring-[#8CC63F]/30 dark:peer-focus:ring-[#8CC63F]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#8CC63F] shadow-inner">
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                  currentCellType === 'locked'
                    ? "bg-gray-100 border-gray-400 dark:bg-gray-700 dark:border-gray-500"
                    : "bg-white border-[#8CC63F] dark:bg-gray-800"
                )}>
                  {currentCellType === 'locked' ? '🔒' : '✏️'}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {currentCellType === 'locked' ? 'Locked (default - not fillable)' : 'Editable (student must fill)'}
                </span>
              </div>
            </label>
          </div>

          {/* Bulk Action Buttons */}
          {selectedCells.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-white dark:bg-gray-800 rounded border">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mr-2">
                Quick Actions:
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const updatedTypes = { ...cellTypes };
                  selectedCells.forEach(cellKey => {
                    updatedTypes[cellKey] = 'locked';
                  });
                  setCellTypes(updatedTypes);
                  toast.success(`Marked ${selectedCells.size} cell(s) as locked`);
                }}
                className="text-xs flex items-center gap-2"
                title="Mark selected cells as locked (Ctrl+L)"
              >
                🔒 Mark as Locked
                <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 bg-gray-100 border border-gray-300 rounded dark:text-gray-400 dark:bg-gray-700 dark:border-gray-600">
                  Ctrl+L
                </kbd>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const updatedTypes = { ...cellTypes };
                  selectedCells.forEach(cellKey => {
                    updatedTypes[cellKey] = 'editable';
                  });
                  setCellTypes(updatedTypes);
                  toast.success(`Marked ${selectedCells.size} cell(s) as editable`);
                }}
                className="text-xs flex items-center gap-2"
                title="Mark selected cells as editable (Ctrl+E)"
              >
                ✏️ Mark as Editable
                <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 bg-gray-100 border border-gray-300 rounded dark:text-gray-400 dark:bg-gray-700 dark:border-gray-600">
                  Ctrl+E
                </kbd>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const updatedTypes = { ...cellTypes };
                  const updatedValues = { ...cellValues };
                  const updatedAnswers = { ...expectedAnswers };
                  const newTableData = tableData.map(row => [...row]); // Deep copy for proper state update

                  selectedCells.forEach(cellKey => {
                    const [row, col] = cellKey.split('-').map(Number);
                    delete updatedTypes[cellKey];
                    delete updatedValues[cellKey];
                    delete updatedAnswers[cellKey];
                    if (newTableData[row] && newTableData[row][col] !== undefined) {
                      newTableData[row][col] = '';
                    }
                  });

                  setCellTypes(updatedTypes);
                  setCellValues(updatedValues);
                  setExpectedAnswers(updatedAnswers);
                  setTableData(newTableData);

                  const hot = hotRef.current?.hotInstance;
                  if (hot) {
                    hot.loadData(newTableData);
                    // Force a complete re-render to show the updates
                    setTimeout(() => {
                      hot.render();
                    }, 0);
                  }

                  toast.success(`Cleared ${selectedCells.size} cell(s)`);
                }}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-2"
                title="Clear selected cells (Delete)"
              >
                ✕ Clear Selected
                <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-300 rounded dark:text-red-400 dark:bg-red-900/20 dark:border-red-700">
                  Del
                </kbd>
              </Button>
            </div>
          )}

          {selectedCells.size > 0 && (
            <div className="p-3 bg-white dark:bg-gray-800 rounded border mb-3">
              <p className="text-sm font-medium mb-2">
                Selected: {selectedCells.size} cell(s)
              </p>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {currentCellType === 'locked' ? 'Pre-filled Value:' : 'Expected Answer:'}
                </label>
                <input
                  type="text"
                  placeholder={currentCellType === 'locked' ? 'Enter value for locked cells' : 'Enter correct answer'}
                  className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-[#8CC63F]"
                  value={tempCellValue}
                  onChange={(e) => setTempCellValue(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {currentCellType === 'locked'
                    ? 'This value will be shown to students and cannot be changed'
                    : 'Students will need to enter this value (case-insensitive)'}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleApplyCellType}
              disabled={selectedCells.size === 0 || !tempCellValue.trim()}
              className="bg-[#8CC63F] hover:bg-[#7AB62F] text-white"
            >
              <Check className="w-4 h-4 mr-1" />
              Apply to Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearSelection}
              disabled={selectedCells.size === 0}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Table Metadata Panel */}
      {isEditingTemplate && !previewMode && (
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-300 dark:border-purple-700">
          <div className="flex items-center gap-2 mb-3">
            <TableIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h4 className="text-sm font-medium text-purple-900 dark:text-purple-100">
              Table Information (Optional)
            </h4>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Table Title
              </label>
              <input
                type="text"
                value={tableTitle}
                onChange={(e) => setTableTitle(e.target.value)}
                placeholder="e.g., Population Growth Data"
                className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional title displayed above the table
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Instructions/Description
              </label>
              <textarea
                value={tableDescription}
                onChange={(e) => setTableDescription(e.target.value)}
                placeholder="e.g., Complete the missing values using the data provided above..."
                rows={3}
                className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Instructions shown to students
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Per-Cell Marking Configuration Panel */}
      {isEditingTemplate && !previewMode && selectedCells.size > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-300 dark:border-amber-700">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Marking Configuration for Selected Cells
            </h4>
            <span className="text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded-full">
              {selectedCells.size} editable cell(s)
            </span>
          </div>

          {/* Only show marking config for editable cells */}
          {Array.from(selectedCells).some(key => cellTypes[key] === 'editable') ? (
            <div className="space-y-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Configure how these cells will be marked when students complete the table.
              </p>

              {/* Marks Input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Marks per Cell
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={(() => {
                      // Get marks from first selected editable cell
                      const firstEditableCell = Array.from(selectedCells).find(key => cellTypes[key] === 'editable');
                      return firstEditableCell ? (cellMarks[firstEditableCell] ?? 1) : 1;
                    })()}
                    onChange={(e) => {
                      const value = Math.min(10, Math.max(1, parseInt(e.target.value) || 1));
                      const newMarks = {...cellMarks};
                      selectedCells.forEach(key => {
                        if (cellTypes[key] === 'editable') {
                          newMarks[key] = value;
                        }
                      });
                      setCellMarks(newMarks);
                    }}
                    className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Range: 1-10 marks (default: 1)
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Case Sensitivity */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(() => {
                        const firstEditableCell = Array.from(selectedCells).find(key => cellTypes[key] === 'editable');
                        return firstEditableCell ? (cellCaseSensitive[firstEditableCell] ?? false) : false;
                      })()}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const newCS = {...cellCaseSensitive};
                        selectedCells.forEach(key => {
                          if (cellTypes[key] === 'editable') {
                            newCS[key] = checked;
                          }
                        });
                        setCellCaseSensitive(newCS);
                      }}
                      className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Case Sensitive
                      </span>
                      <p className="text-xs text-gray-500">
                        Answer must match exact case (e.g., "DNA" ≠ "dna")
                      </p>
                    </div>
                  </label>

                  {/* Equivalent Phrasing */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(() => {
                        const firstEditableCell = Array.from(selectedCells).find(key => cellTypes[key] === 'editable');
                        return firstEditableCell ? (cellEquivalentPhrasing[firstEditableCell] ?? false) : false;
                      })()}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const newEP = {...cellEquivalentPhrasing};
                        selectedCells.forEach(key => {
                          if (cellTypes[key] === 'editable') {
                            newEP[key] = checked;
                          }
                        });
                        setCellEquivalentPhrasing(newEP);
                      }}
                      className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Accept Equivalent Phrasing
                      </span>
                      <p className="text-xs text-gray-500">
                        Accept synonyms and similar answers
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Alternative Answers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Alternative Correct Answers
                </label>
                <div className="space-y-2">
                  {(() => {
                    const firstEditableCell = Array.from(selectedCells).find(key => cellTypes[key] === 'editable');
                    const alternatives = firstEditableCell ? (cellAlternatives[firstEditableCell] || []) : [];

                    return (
                      <>
                        {alternatives.map((alt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={alt}
                              onChange={(e) => {
                                const newAlts = {...cellAlternatives};
                                selectedCells.forEach(key => {
                                  if (cellTypes[key] === 'editable') {
                                    const currentAlts = [...(newAlts[key] || [])];
                                    currentAlts[idx] = e.target.value;
                                    newAlts[key] = currentAlts;
                                  }
                                });
                                setCellAlternatives(newAlts);
                              }}
                              placeholder={`Alternative ${idx + 1}`}
                              className="flex-1 px-3 py-2 text-sm border rounded dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const newAlts = {...cellAlternatives};
                                selectedCells.forEach(key => {
                                  if (cellTypes[key] === 'editable') {
                                    newAlts[key] = (newAlts[key] || []).filter((_, i) => i !== idx);
                                  }
                                });
                                setCellAlternatives(newAlts);
                              }}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newAlts = {...cellAlternatives};
                            selectedCells.forEach(key => {
                              if (cellTypes[key] === 'editable') {
                                newAlts[key] = [...(newAlts[key] || []), ''];
                              }
                            });
                            setCellAlternatives(newAlts);
                          }}
                          className="w-full border-dashed"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Alternative Answer
                        </Button>
                      </>
                    );
                  })()}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  e.g., "USA", "United States", "America" all count as correct
                </p>
              </div>

              {/* Summary */}
              <div className="p-3 bg-white dark:bg-gray-800 rounded border border-amber-300 dark:border-amber-700">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Marking Summary
                </p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  {(() => {
                    const editableCells = Array.from(selectedCells).filter(key => cellTypes[key] === 'editable');
                    const firstCell = editableCells[0];
                    if (!firstCell) return null;

                    const marks = cellMarks[firstCell] ?? 1;
                    const caseSensitive = cellCaseSensitive[firstCell] ?? false;
                    const equivPhrasing = cellEquivalentPhrasing[firstCell] ?? false;
                    const alternatives = (cellAlternatives[firstCell] || []).filter(a => a.trim());
                    const totalMarks = marks * editableCells.length;

                    return (
                      <>
                        <li>✓ {editableCells.length} editable cell(s) × {marks} mark(s) = <strong>{totalMarks} total marks</strong></li>
                        <li>✓ Case matching: {caseSensitive ? 'Exact case required' : 'Case-insensitive'}</li>
                        <li>✓ Equivalent phrasing: {equivPhrasing ? 'Enabled (synonyms accepted)' : 'Disabled (exact match)'}</li>
                        <li>✓ Alternative answers: {alternatives.length > 0 ? `${alternatives.length} alternative(s) configured` : 'None'}</li>
                      </>
                    );
                  })()}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select editable cells to configure marking options
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Marking configuration only applies to editable cells
              </p>
            </div>
          )}
        </div>
      )}

      {/* Persistent Quick Actions Toolbar */}
      {isEditingTemplate && selectedCells.size > 0 && (
        <div className="sticky top-0 z-10 p-3 bg-[#8CC63F] text-white rounded-lg shadow-lg border-2 border-[#7AB62F]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold">
                {selectedCells.size} cell{selectedCells.size !== 1 ? 's' : ''} selected
              </span>
              <div className="h-4 w-px bg-white/30"></div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Type:</span>
                <button
                  onClick={() => setCurrentCellType('locked')}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded transition-all",
                    currentCellType === 'locked'
                      ? "bg-white text-[#8CC63F] shadow-md"
                      : "bg-[#7AB62F] text-white hover:bg-[#6AA51F]"
                  )}
                  title="Set as locked (pre-filled)"
                >
                  🔒 Locked
                </button>
                <button
                  onClick={() => setCurrentCellType('editable')}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded transition-all",
                    currentCellType === 'editable'
                      ? "bg-white text-[#8CC63F] shadow-md"
                      : "bg-[#7AB62F] text-white hover:bg-[#6AA51F]"
                  )}
                  title="Set as editable (student fills)"
                >
                  ✏️ Editable
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={currentCellType === 'locked' ? 'Enter value...' : 'Enter answer...'}
                className="px-3 py-1.5 text-sm text-gray-900 bg-white border-0 rounded focus:ring-2 focus:ring-white/50 min-w-[200px]"
                value={tempCellValue}
                onChange={(e) => setTempCellValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && tempCellValue.trim()) {
                    handleApplyCellType();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleApplyCellType}
                disabled={!tempCellValue.trim()}
                className="bg-white text-[#8CC63F] hover:bg-gray-100 font-medium shadow-md"
              >
                <Check className="w-4 h-4 mr-1" />
                Apply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearSelection}
                className="text-white hover:bg-white/20"
                title="Clear selection (Esc)"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Template Statistics and Validation */}
      {isEditingTemplate && !previewMode && (
        <div className="space-y-2">
          {/* Progress Indicator */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Template Configuration Progress
              </span>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {(() => {
                  const configuredCells = lockedCount + editableCount;
                  const progress = totalCells > 0 ? Math.round((configuredCells / totalCells) * 100) : 0;
                  const answersSet = Object.values(expectedAnswers).filter(v => v && String(v).trim().length > 0).length;
                  const answersProgress = editableCount > 0 ? Math.round((answersSet / editableCount) * 100) : 0;
                  return `${configuredCells}/${totalCells} cells configured • ${answersSet}/${editableCount} answers set`;
                })()}
              </span>
            </div>
            <div className="space-y-2">
              {/* Cell Configuration Progress */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Cell Types</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {(() => {
                      const configuredCells = lockedCount + editableCount;
                      return totalCells > 0 ? Math.round((configuredCells / totalCells) * 100) : 0;
                    })()}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                    style={{
                      width: `${(() => {
                        const configuredCells = lockedCount + editableCount;
                        return totalCells > 0 ? (configuredCells / totalCells) * 100 : 0;
                      })()}%`
                    }}
                  />
                </div>
              </div>
              {/* Expected Answers Progress */}
              {editableCount > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Expected Answers</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {(() => {
                        const answersSet = Object.values(expectedAnswers).filter(v => v && String(v).trim().length > 0).length;
                        return editableCount > 0 ? Math.round((answersSet / editableCount) * 100) : 0;
                      })()}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                      style={{
                        width: `${(() => {
                          const answersSet = Object.values(expectedAnswers).filter(v => v && String(v).trim().length > 0).length;
                          return editableCount > 0 ? (answersSet / editableCount) * 100 : 0;
                        })()}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-300 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Statistics:
                </span>
                <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                  <span>Total: {totalCells}</span>
                  <span className="flex items-center gap-1">
                    🔒 Locked: <strong>{lockedCount}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    ✏️ Editable: <strong>{editableCount}</strong>
                  </span>
                  {undefinedCount > 0 && (
                    <span className="text-gray-600 dark:text-gray-400">
                      🔒 Default Locked: <strong>{undefinedCount}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Validation Warnings - Only show when user tries to save */}
          {showTemplateValidationWarnings && (
            <>
              {editableCount === 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        No Editable Cells Defined
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        Students won't be able to answer this question. Mark some cells as editable and set expected answers.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {editableCount > 0 && Object.values(expectedAnswers).filter(v => v && String(v).trim().length > 0).length < editableCount && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Some Editable Cells Missing Expected Answers
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        {editableCount - Object.values(expectedAnswers).filter(v => v && String(v).trim().length > 0).length} editable cell(s) don't have expected answers defined. This may affect auto-grading.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Table Header */}
      {!isStudentTestMode && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {isEditingTemplate ? 'Table Preview' : 'Complete the Table'}
            </h3>
          </div>

          {!isEditingTemplate && (
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {value?.completedCells ?? 0} / {value?.requiredCells ?? 0} cells
                <span className="ml-2 font-medium text-[#8CC63F]">
                  ({completionPercentage}%)
                </span>
              </div>

              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  title="Reset table"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className={cn(
        "border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden",
        disabled && !isEditingTemplate && "opacity-60 pointer-events-none"
      )}>
        <HotTable
          ref={hotRef}
          data={tableData}
          colHeaders={isTemplateEditor ? headers : template.headers}
          rowHeaders={true}
          width="100%"
          height="auto"
          licenseKey="non-commercial-and-evaluation"
          readOnly={disabled && !isEditingTemplate}
          cells={(row, col) => {
            if (isTemplateEditor) {
              const cellKey = `${row}-${col}`;
              const cellType = cellTypes[cellKey];
              return {
                // During template editing, allow direct editing of ALL cells (unless in preview mode)
                // In preview mode, only editable cells can be edited (student view)
                readOnly: isEditingTemplate ? (previewMode ? cellType !== 'editable' : false) : (cellType !== 'editable' || disabled),
                renderer: cellRenderer
              };
            } else {
              const isEditable = template.editableCells?.some(c => c.row === row && c.col === col);
              return {
                readOnly: !isEditable || disabled,
                renderer: cellRenderer
              };
            }
          }}
          afterChange={handleAfterChange}
          afterOnCellMouseDown={(event: any, coords: any) => {
            // Handle column header click (row is -1)
            if (coords.row === -1 && coords.col >= 0 && isEditingTemplate && !previewMode) {
              event.stopPropagation();
              handleSelectColumn(coords.col);
            }
          }}
          afterGetRowHeader={(row: number, TH: HTMLTableCellElement) => {
            if (isEditingTemplate && !previewMode) {
              TH.style.cursor = 'pointer';
              TH.title = 'Click to select entire row';
              TH.onclick = () => handleSelectRow(row);
            }
          }}
          afterGetColHeader={(col: number, TH: HTMLTableCellElement) => {
            if (isEditingTemplate && !previewMode) {
              TH.style.cursor = 'pointer';
              TH.title = 'Click to select entire column';
            }
          }}
          stretchH="all"
        />
      </div>

      {/* Legend - Student Test Mode Simple */}
      {isStudentTestMode ? (
        <div className="flex flex-wrap items-center gap-4 text-sm bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Guide:</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center shadow-sm">
              🔒
            </div>
            <span className="text-xs text-gray-700 dark:text-gray-300">Gray cells are pre-filled (locked)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white border-2 border-gray-300 rounded flex items-center justify-center shadow-sm">
              <span className="text-xs text-gray-400">?</span>
            </div>
            <span className="text-xs text-gray-700 dark:text-gray-300">White cells require your answer</span>
          </div>
          {showCorrectAnswers && (
            <>
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-green-100 border border-green-400 rounded flex items-center justify-center">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <span className="text-xs text-gray-700 dark:text-gray-300">Correct</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-red-100 border border-red-400 rounded flex items-center justify-center">
                  <X className="w-3 h-3 text-red-600" />
                </div>
                <span className="text-xs text-gray-700 dark:text-gray-300">Incorrect</span>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Legend - Admin/Practice Mode */
        <div className="flex flex-wrap items-center gap-4 text-sm opacity-75">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Legend:</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-200 border-l-[3px] border-l-gray-400 rounded flex items-center justify-center shadow-sm">
              🔒
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Locked (not fillable)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-100 border-l-[3px] border-l-orange-400 rounded flex items-center justify-center shadow-sm">
              ✏️
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Editable (no answer set)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-100 border-l-[3px] border-l-green-500 rounded flex items-center justify-center shadow-sm text-green-600 font-bold">
              ✓
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Editable (answer set)</span>
          </div>
          {showCorrectAnswers && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
                <span className="text-gray-600 dark:text-gray-400">Correct</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
                <span className="text-gray-600 dark:text-gray-400">Incorrect</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Completion Status */}
      {!isStudentTestMode && completionPercentage === 100 && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-800 dark:text-green-300">
            Table completed!
          </span>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelp && !isStudentTestMode && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowKeyboardHelp(false)}
          />
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-300 dark:border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    ⌨️ Keyboard Shortcuts
                  </h3>
                  <button
                    onClick={() => setShowKeyboardHelp(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Cell Configuration */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Cell Configuration
                    </h4>
                    <div className="space-y-2">
                      {[
                        { keys: ['Ctrl', 'L'], desc: 'Mark selected cells as Locked' },
                        { keys: ['Ctrl', 'E'], desc: 'Mark selected cells as Editable' },
                        { keys: ['Delete'], desc: 'Clear selected cells' },
                        { keys: ['Esc'], desc: 'Clear selection' },
                        { keys: ['Right-click'], desc: 'Quick configure cell' }
                      ].map((shortcut, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{shortcut.desc}</span>
                          <div className="flex gap-1">
                            {shortcut.keys.map((key, j) => (
                              <kbd key={j} className="px-2 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                                {key}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Selection */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Selection
                    </h4>
                    <div className="space-y-2">
                      {[
                        { keys: ['Click'], desc: 'Select/deselect cell' },
                        { keys: ['Column header'], desc: 'Select entire column' },
                        { keys: ['Row header'], desc: 'Select entire row' }
                      ].map((shortcut, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{shortcut.desc}</span>
                          <div className="flex gap-1">
                            {shortcut.keys.map((key, j) => (
                              <kbd key={j} className="px-2 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                                {key}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Modes */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Special Modes
                    </h4>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">🎨 Paint Mode:</span>
                        <span>Enable to quickly apply cell types by clicking</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">👁️ Preview Mode:</span>
                        <span>See how students will interact with the table</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">💾 Auto-save:</span>
                        <span>Changes automatically saved every 10 seconds</span>
                      </div>
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      💡 Pro Tips
                    </h4>
                    <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
                      <li>• Type directly into cells - they default to locked</li>
                      <li>• Click row/column headers to select entire rows/columns</li>
                      <li>• Use paint mode for quick pattern application</li>
                      <li>• Green checkmark (✓) indicates expected answer is set</li>
                      <li>• Preview mode shows exact student experience</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => setShowKeyboardHelp(false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Got it!
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Inline Edit Popover */}
      {inlineEditCell && !isStudentTestMode && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setInlineEditCell(null)}
          />
          {/* Popover */}
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-blue-500 dark:border-blue-400 p-4 min-w-[320px]"
            style={{
              left: `${Math.min(inlineEditCell.x, window.innerWidth - 350)}px`,
              top: `${Math.min(inlineEditCell.y, window.innerHeight - 300)}px`,
            }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Configure Cell ({inlineEditCell.row + 1}, {inlineEditCell.col + 1})
                </h4>
                <button
                  onClick={() => setInlineEditCell(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cell Type Toggle */}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                  Cell Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setInlineEditType('locked')}
                    className={cn(
                      "flex-1 px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all",
                      inlineEditType === 'locked'
                        ? "bg-gray-100 dark:bg-gray-700 border-gray-400 dark:border-gray-500 text-gray-900 dark:text-gray-100"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                    )}
                  >
                    🔒 Locked
                  </button>
                  <button
                    onClick={() => setInlineEditType('editable')}
                    className={cn(
                      "flex-1 px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all",
                      inlineEditType === 'editable'
                        ? "bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600 text-green-900 dark:text-green-100"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                    )}
                  >
                    ✏️ Editable
                  </button>
                </div>
              </div>

              {/* Value Input */}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                  {inlineEditType === 'locked' ? 'Cell Value' : 'Expected Answer'}
                </label>
                <input
                  type="text"
                  value={inlineEditValue}
                  onChange={(e) => setInlineEditValue(e.target.value)}
                  placeholder={inlineEditType === 'locked' ? 'Enter value...' : 'Enter expected answer...'}
                  className="w-full px-3 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleApplyInlineEdit();
                    } else if (e.key === 'Escape') {
                      setInlineEditCell(null);
                    }
                  }}
                  autoFocus
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {inlineEditType === 'locked'
                    ? 'This value will be pre-filled and students cannot edit it'
                    : 'Students must enter this answer (case-insensitive)'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={handleApplyInlineEdit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Apply
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInlineEditCell(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TableCompletion;
