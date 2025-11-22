/**
 * Table Completion Component for Fill-in-the-Table Questions
 *
 * Uses Handsontable for spreadsheet-like table functionality.
 * Teacher provides template with locked cells, students fill editable cells.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.css';
import { Check, AlertCircle, RotateCcw, Table as TableIcon } from 'lucide-react';
import Button from '@/components/shared/Button';
import { cn } from '@/lib/utils';
import { validateTableData } from '../utils/dataValidation';

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
  template?: TableTemplate;
  value: TableCompletionData | null;
  onChange: (data: TableCompletionData) => void;
  disabled?: boolean;
  showCorrectAnswers?: boolean;
  autoGrade?: boolean;
}

// Default template for simple table completion (5x5 grid, all cells editable)
const DEFAULT_TEMPLATE: TableTemplate = {
  rows: 5,
  columns: 5,
  headers: ['Column 1', 'Column 2', 'Column 3', 'Column 4', 'Column 5'],
  lockedCells: [],
  editableCells: Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => ({ row, col }))
  ).flat(),
  correctAnswers: []
};

const TableCompletion: React.FC<TableCompletionProps> = ({
  questionId,
  template = DEFAULT_TEMPLATE,
  value,
  onChange,
  disabled = false,
  showCorrectAnswers = false,
  autoGrade = false
}) => {
  const hotRef = useRef<HotTable>(null);
  const [tableData, setTableData] = useState<any[][]>([]);
  const [validation, setValidation] = useState<any>(null);

  // Initialize table data from template
  useEffect(() => {
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
  }, [template, value]);

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

    const isLocked = template.lockedCells.some(c => c.row === row && c.col === col);
    const isEditable = template.editableCells.some(c => c.row === row && c.col === col);

    if (isLocked) {
      td.style.backgroundColor = '#f3f4f6';
      td.style.color = '#6b7280';
      td.style.fontWeight = '500';
      td.classList.add('locked-cell');
    } else if (isEditable) {
      td.style.backgroundColor = showCorrectAnswers ?
        (checkAnswer(row, col, value) ? '#dcfce7' : '#fee2e2') :
        '#ffffff';
      td.classList.add('editable-cell');
    }

    return td;
  }, [template, showCorrectAnswers]);

  const checkAnswer = (row: number, col: number, studentValue: any): boolean => {
    if (!template.correctAnswers || !autoGrade) return true;

    const correctCell = template.correctAnswers.find(c => c.row === row && c.col === col);
    if (!correctCell) return true;

    return String(studentValue).trim().toLowerCase() ===
           String(correctCell.value).trim().toLowerCase();
  };

  const handleAfterChange = useCallback((changes: any, source: string) => {
    if (!changes || source === 'loadData') return;

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
  }, [template, value, onChange]);

  const handleReset = () => {
    onChange({
      studentAnswers: {},
      completedCells: 0,
      requiredCells: template.editableCells.length
    });
  };

  const completionPercentage = value && value.requiredCells > 0
    ? Math.round((value.completedCells / value.requiredCells) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Table Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TableIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Complete the Table
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {value.completedCells} / {value.requiredCells} cells
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
      </div>

      {/* Table */}
      <div className={cn(
        "border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden",
        disabled && "opacity-60 pointer-events-none"
      )}>
        <HotTable
          ref={hotRef}
          data={tableData}
          colHeaders={template.headers}
          rowHeaders={true}
          width="100%"
          height="auto"
          licenseKey="non-commercial-and-evaluation"
          readOnly={disabled}
          cells={(row, col) => {
            const isLocked = template.lockedCells.some(c => c.row === row && c.col === col);
            return {
              readOnly: isLocked || disabled,
              renderer: cellRenderer
            };
          }}
          afterChange={handleAfterChange}
          stretchH="all"
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded" />
          <span className="text-gray-600 dark:text-gray-400">Locked (pre-filled)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white border border-gray-300 rounded" />
          <span className="text-gray-600 dark:text-gray-400">Editable (fill in)</span>
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
