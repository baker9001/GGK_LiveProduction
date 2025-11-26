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
  X
} from 'lucide-react';
import Button from '@/components/shared/Button';
import { cn } from '@/lib/utils';
import { validateTableData } from '../utils/dataValidation';
import { TableTemplateService, type TableTemplateDTO, type TableCellDTO } from '@/services/TableTemplateService';
import toast from 'react-hot-toast';

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
  isAdminMode?: boolean;
  onTemplateSave?: (template: TableTemplateDTO) => void;

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
  isAdminMode = false,
  onTemplateSave,
  minRows = 2,
  maxRows = 50,
  minCols = 2,
  maxCols = 20,
  defaultRows = 5,
  defaultCols = 5
}) => {
  const hotRef = useRef<HotTable>(null);
  const [tableData, setTableData] = useState<any[][]>([]);
  const [validation, setValidation] = useState<any>(null);

  // Template editing state
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
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

  // Load template from database when in admin mode
  useEffect(() => {
    if (isAdminMode) {
      loadExistingTemplate();
    }
  }, [questionId, subQuestionId, isAdminMode]);

  const loadExistingTemplate = async () => {
    setLoading(true);
    try {
      const result = await TableTemplateService.loadTemplate(questionId, subQuestionId);

      if (result.success && result.template) {
        const tmpl = result.template;
        setRows(tmpl.rows);
        setColumns(tmpl.columns);
        setHeaders(tmpl.headers || Array.from({ length: tmpl.columns }, (_, i) => `Column ${i + 1}`));

        // Build cell types and values from template cells
        const types: Record<string, 'locked' | 'editable'> = {};
        const values: Record<string, string> = {};
        const answers: Record<string, string> = {};

        tmpl.cells.forEach(cell => {
          const key = `${cell.rowIndex}-${cell.colIndex}`;
          types[key] = cell.cellType;
          if (cell.cellType === 'locked' && cell.lockedValue) {
            values[key] = cell.lockedValue;
          } else if (cell.cellType === 'editable' && cell.expectedAnswer) {
            answers[key] = cell.expectedAnswer;
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
      } else {
        // Initialize with default dimensions
        initializeDefaultTable();
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Failed to load template');
      initializeDefaultTable();
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
    if (!isAdminMode) {
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
  }, [template, value, isAdminMode]);

  // Cell selection and configuration handlers
  const handleCellClick = useCallback((row: number, col: number) => {
    if (!isEditingTemplate) return;

    const cellKey = `${row}-${col}`;
    const newSelection = new Set(selectedCells);

    if (newSelection.has(cellKey)) {
      newSelection.delete(cellKey);
    } else {
      newSelection.add(cellKey);
    }

    setSelectedCells(newSelection);
  }, [isEditingTemplate, selectedCells]);

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

    // Selection styling (blue border in edit mode)
    if (isSelected) {
      td.style.border = '2px solid #3B82F6';
      td.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)';
    }

    // Cell type styling with visual badges
    if (cellType === 'locked') {
      td.style.backgroundColor = isEditingTemplate ? '#f9fafb' : '#f3f4f6';
      td.style.color = '#6b7280';
      td.style.fontWeight = '500';
      td.style.position = 'relative';
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
          background: rgba(107, 114, 128, 0.1);
          padding: 2px 4px;
          border-radius: 3px;
        `;
        td.appendChild(badge);
      }

      // Add subtle border in edit mode for clarity
      if (isEditingTemplate) {
        td.style.border = '1px solid #e5e7eb';
      }
    } else if (cellType === 'editable') {
      td.style.backgroundColor = showCorrectAnswers ?
        (checkAnswer(row, col, value) ? '#dcfce7' : '#fee2e2') :
        (isEditingTemplate ? '#fefce8' : '#ffffff');
      td.style.position = 'relative';
      td.classList.add('editable-cell');

      // Add visual badge for editable cells in admin mode
      if (isEditingTemplate && !td.querySelector('.cell-badge')) {
        const badge = document.createElement('span');
        badge.className = 'cell-badge';
        badge.innerHTML = '✏️';
        badge.title = 'Editable cell - students must fill this';
        badge.style.cssText = `
          position: absolute;
          top: 2px;
          right: 2px;
          font-size: 11px;
          opacity: 0.8;
          pointer-events: none;
          z-index: 10;
          background: rgba(250, 204, 21, 0.2);
          padding: 2px 4px;
          border-radius: 3px;
        `;
        td.appendChild(badge);
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

    // Add click handler for cell selection in edit mode
    if (isEditingTemplate) {
      td.style.cursor = 'pointer';
      td.onclick = () => handleCellClick(row, col);
    }

    return td;
  }, [template, showCorrectAnswers, isEditingTemplate, selectedCells, cellTypes, handleCellClick]);

  const checkAnswer = (row: number, col: number, studentValue: any): boolean => {
    if (!template.correctAnswers || !autoGrade) return true;

    const correctCell = template.correctAnswers.find(c => c.row === row && c.col === col);
    if (!correctCell) return true;

    return String(studentValue).trim().toLowerCase() ===
           String(correctCell.value).trim().toLowerCase();
  };

  const handleAfterChange = useCallback((changes: any, source: string) => {
    if (!changes || source === 'loadData') return;

    // Admin mode: Track direct cell edits during template creation
    if (isAdminMode && isEditingTemplate) {
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

    onChange({
      studentAnswers,
      completedCells,
      requiredCells: template.editableCells.length
    });
  }, [template, value, onChange, isAdminMode, isEditingTemplate, cellValues, expectedAnswers, cellTypes]);

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
    const newHeaders = [...headers];
    newHeaders[index] = value;
    setHeaders(newHeaders);

    const hot = hotRef.current?.hotInstance;
    if (hot) {
      hot.updateSettings({ colHeaders: newHeaders });
    }
  }, [headers]);

  const handleApplyCellType = useCallback(() => {
    if (selectedCells.size === 0 || !tempCellValue.trim()) return;

    const updatedTypes = { ...cellTypes };
    const updatedValues = { ...cellValues };
    const updatedAnswers = { ...expectedAnswers };
    const newTableData = [...tableData];

    selectedCells.forEach(cellKey => {
      const [row, col] = cellKey.split('-').map(Number);
      updatedTypes[cellKey] = currentCellType;

      if (currentCellType === 'locked') {
        updatedValues[cellKey] = tempCellValue;
        if (newTableData[row] && newTableData[row][col] !== undefined) {
          newTableData[row][col] = tempCellValue;
        }
      } else {
        updatedAnswers[cellKey] = tempCellValue;
      }
    });

    setCellTypes(updatedTypes);
    setCellValues(updatedValues);
    setExpectedAnswers(updatedAnswers);
    setTableData(newTableData);
    setSelectedCells(new Set());
    setTempCellValue('');

    // Update Handsontable
    const hot = hotRef.current?.hotInstance;
    if (hot) {
      hot.loadData(newTableData);
    }

    toast.success(`Applied ${currentCellType} type to ${selectedCells.size} cell(s)`);
  }, [selectedCells, currentCellType, tempCellValue, cellTypes, cellValues, expectedAnswers, tableData]);

  const handleClearSelection = useCallback(() => {
    setSelectedCells(new Set());
    setTempCellValue('');
  }, []);

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
  const handleSaveTemplate = async () => {
    setLoading(true);
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
            marks: 1,
            caseSensitive: false
          });
        }
      }

      const template: TableTemplateDTO = {
        questionId,
        subQuestionId,
        rows,
        columns,
        headers,
        cells
      };

      const result = await TableTemplateService.saveTemplate(template);

      if (result.success) {
        toast.success('Template saved successfully!');
        onTemplateSave?.(template);
        setIsEditingTemplate(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

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
      {/* Admin Mode Controls */}
      {isAdminMode && (
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Template Builder Mode
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
                  onClick={handleSaveTemplate}
                  disabled={loading}
                  className="bg-[#8CC63F] hover:bg-[#7AB62F] text-white"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save Template
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Dimension Controls */}
      {isEditingTemplate && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-300 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Table Dimensions
          </h4>
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
      {isEditingTemplate && (
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
      {isEditingTemplate && (
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
                className="text-xs"
              >
                🔒 Mark as Locked
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
                className="text-xs"
              >
                ✏️ Mark as Editable
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
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

                  toast.success(`Cleared ${selectedCells.size} cell(s)`);
                }}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                ✕ Clear Selected
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
      {isEditingTemplate && (
        <div className="space-y-2">
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

          {/* Validation Warnings */}
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
        </div>
      )}

      {/* Table Header */}
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

      {/* Table */}
      <div className={cn(
        "border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden",
        disabled && !isEditingTemplate && "opacity-60 pointer-events-none"
      )}>
        <HotTable
          ref={hotRef}
          data={tableData}
          colHeaders={isAdminMode ? headers : template.headers}
          rowHeaders={true}
          width="100%"
          height="auto"
          licenseKey="non-commercial-and-evaluation"
          readOnly={disabled && !isEditingTemplate}
          cells={(row, col) => {
            if (isAdminMode) {
              const cellKey = `${row}-${col}`;
              const cellType = cellTypes[cellKey];
              return {
                // During template editing, allow direct editing of ALL cells
                // Cell type only matters for student view
                readOnly: isEditingTemplate ? false : (cellType !== 'editable' || disabled),
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
          stretchH="all"
        />
      </div>

      {/* Legend - Non-interactive documentation */}
      <div className="flex items-center gap-4 text-sm opacity-75">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Legend:</span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-100 border-2 border-gray-300 rounded flex items-center justify-center shadow-sm">
            🔒
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">= Locked cell (default - not fillable)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white border-2 border-gray-300 rounded flex items-center justify-center shadow-sm">
            ✏️
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">= Editable cell (student fills in)</span>
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

      {/* Completion Status */}
      {completionPercentage === 100 && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-800 dark:text-green-300">
            Table completed!
          </span>
        </div>
      )}
    </div>
  );
};

export default TableCompletion;
