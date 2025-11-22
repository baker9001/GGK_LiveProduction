/**
 * Table Creator Component for Building Spreadsheets
 *
 * Uses Handsontable for creating tables from scratch with
 * customizable rows, columns, and data entry.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import 'handsontable/dist/handsontable.full.min.css';
import {
  Plus,
  Minus,
  Download,
  Save,
  Check,
  AlertCircle,
  Table as TableIcon
} from 'lucide-react';
import Button from '@/components/shared/Button';
import { cn } from '@/lib/utils';
import { validateTableData } from '../utils/dataValidation';

// Register Handsontable modules
registerAllModules();

export interface TableCreatorData {
  data: (string | number | null)[][];
  headers: string[];
  rowCount: number;
  colCount: number;
  title?: string;
  timestamp: string;
}

interface TableCreatorProps {
  questionId: string;
  value: TableCreatorData | null;
  onChange: (data: TableCreatorData | null) => void;
  disabled?: boolean;
  minRows?: number;
  maxRows?: number;
  minCols?: number;
  maxCols?: number;
  defaultRows?: number;
  defaultCols?: number;
  showCorrectAnswer?: boolean;
  correctAnswerData?: TableCreatorData;
}

const TableCreator: React.FC<TableCreatorProps> = ({
  questionId,
  value,
  onChange,
  disabled = false,
  minRows = 2,
  maxRows = 50,
  minCols = 2,
  maxCols = 20,
  defaultRows = 5,
  defaultCols = 5,
  showCorrectAnswer = false,
  correctAnswerData
}) => {
  const hotTableRef = useRef<any>(null);

  const [tableData, setTableData] = useState<(string | number | null)[][]>(
    value?.data || Array(defaultRows).fill(null).map(() => Array(defaultCols).fill(null))
  );
  const [headers, setHeaders] = useState<string[]>(
    value?.headers || Array(defaultCols).fill(null).map((_, i) => `Column ${String.fromCharCode(65 + i)}`)
  );
  const [rowCount, setRowCount] = useState(value?.rowCount || defaultRows);
  const [colCount, setColCount] = useState(value?.colCount || defaultCols);
  const [title, setTitle] = useState(value?.title || '');
  const [saved, setSaved] = useState(false);
  const [validation, setValidation] = useState<{ isValid: boolean; errors: string[]; warnings: string[] }>({
    isValid: true,
    errors: [],
    warnings: []
  });

  // Update table when data changes
  const handleAfterChange = useCallback((changes: any, source: string) => {
    if (source === 'loadData' || !changes) return;

    const hot = hotTableRef.current?.hotInstance;
    if (!hot) return;

    const currentData = hot.getData();
    setTableData(currentData);
    setSaved(false);
  }, []);

  // Add row
  const handleAddRow = useCallback(() => {
    if (rowCount >= maxRows) return;

    const hot = hotTableRef.current?.hotInstance;
    if (!hot) return;

    const newRowCount = rowCount + 1;
    const newData = [...tableData, Array(colCount).fill(null)];

    setTableData(newData);
    setRowCount(newRowCount);
    hot.loadData(newData);
  }, [rowCount, maxRows, tableData, colCount]);

  // Remove row
  const handleRemoveRow = useCallback(() => {
    if (rowCount <= minRows) return;

    const hot = hotTableRef.current?.hotInstance;
    if (!hot) return;

    const newData = tableData.slice(0, -1);
    const newRowCount = rowCount - 1;

    setTableData(newData);
    setRowCount(newRowCount);
    hot.loadData(newData);
  }, [rowCount, minRows, tableData]);

  // Add column
  const handleAddColumn = useCallback(() => {
    if (colCount >= maxCols) return;

    const hot = hotTableRef.current?.hotInstance;
    if (!hot) return;

    const newColCount = colCount + 1;
    const newHeaders = [...headers, `Column ${String.fromCharCode(65 + colCount)}`];
    const newData = tableData.map(row => [...row, null]);

    setHeaders(newHeaders);
    setColCount(newColCount);
    setTableData(newData);
    hot.loadData(newData);
  }, [colCount, maxCols, headers, tableData]);

  // Remove column
  const handleRemoveColumn = useCallback(() => {
    if (colCount <= minCols) return;

    const hot = hotTableRef.current?.hotInstance;
    if (!hot) return;

    const newHeaders = headers.slice(0, -1);
    const newColCount = colCount - 1;
    const newData = tableData.map(row => row.slice(0, -1));

    setHeaders(newHeaders);
    setColCount(newColCount);
    setTableData(newData);
    hot.loadData(newData);
  }, [colCount, minCols, headers, tableData]);

  // Update header
  const handleHeaderChange = useCallback((index: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[index] = value;
    setHeaders(newHeaders);
  }, [headers]);

  // Save table
  const handleSave = useCallback(() => {
    const hot = hotTableRef.current?.hotInstance;
    if (!hot) return;

    const currentData = hot.getData();

    const tableCreatorData: TableCreatorData = {
      data: currentData,
      headers,
      rowCount,
      colCount,
      title,
      timestamp: new Date().toISOString()
    };

    const result = validateTableData(tableCreatorData);
    setValidation(result);

    if (result.isValid) {
      onChange(tableCreatorData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [headers, rowCount, colCount, title, onChange]);

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    const hot = hotTableRef.current?.hotInstance;
    if (!hot) return;

    const plugin = hot.getPlugin('exportFile');
    plugin.downloadFile('csv', {
      filename: `table_${questionId}_${Date.now()}`,
      columnHeaders: true
    });
  }, [questionId]);

  // Calculate cell statistics
  const getCellStatistics = useCallback(() => {
    const hot = hotTableRef.current?.hotInstance;
    if (!hot) return { filled: 0, empty: 0, total: 0 };

    const data = hot.getData();
    let filled = 0;
    let empty = 0;

    data.forEach(row => {
      row.forEach(cell => {
        if (cell !== null && cell !== undefined && cell !== '') {
          filled++;
        } else {
          empty++;
        }
      });
    });

    return {
      filled,
      empty,
      total: filled + empty
    };
  }, []);

  const stats = getCellStatistics();

  return (
    <div className="space-y-4">
      {/* Configuration */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-300 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Table Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={disabled}
              placeholder="Enter table title"
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Dimensions */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Rows: {rowCount}
            </label>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveRow}
                disabled={disabled || rowCount <= minRows}
                title="Remove row"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddRow}
                disabled={disabled || rowCount >= maxRows}
                title="Add row"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Columns: {colCount}
            </label>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveColumn}
                disabled={disabled || colCount <= minCols}
                title="Remove column"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddColumn}
                disabled={disabled || colCount >= maxCols}
                title="Add column"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <TableIcon className="w-4 h-4" />
              <span>Cells: {stats.total}</span>
            </div>
            <div>Filled: {stats.filled}</div>
            <div>Empty: {stats.empty}</div>
            <div>
              Progress: {stats.total > 0 ? Math.round((stats.filled / stats.total) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Column Headers */}
      {!disabled && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-300 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Column Headers
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {headers.map((header, index) => (
              <input
                key={index}
                type="text"
                value={header}
                onChange={(e) => handleHeaderChange(index, e.target.value)}
                disabled={disabled}
                placeholder={`Column ${index + 1}`}
                className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:text-white"
              />
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className={cn(
        "border rounded-lg overflow-hidden",
        disabled ? "opacity-60" : "",
        "border-gray-300 dark:border-gray-700"
      )}>
        {title && (
          <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">
              {title}
            </h3>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900">
          <HotTable
            ref={hotTableRef}
            data={tableData}
            colHeaders={headers}
            rowHeaders={true}
            width="100%"
            height="400"
            licenseKey="non-commercial-and-evaluation"
            readOnly={disabled}
            afterChange={handleAfterChange}
            contextMenu={!disabled}
            manualColumnResize={true}
            manualRowResize={true}
            stretchH="all"
            className={cn(
              disabled && "pointer-events-none"
            )}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={disabled || stats.filled === 0}
        >
          <Download className="w-4 h-4 mr-1" />
          Export CSV
        </Button>

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
              Save Table
            </>
          )}
        </Button>
      </div>

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
            Reference Table:
          </h4>
          <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
            <p>Rows: {correctAnswerData.rowCount}</p>
            <p>Columns: {correctAnswerData.colCount}</p>
            {correctAnswerData.title && <p>Title: {correctAnswerData.title}</p>}
          </div>
        </div>
      )}

      {/* Help Text */}
      {!disabled && (
        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
          Click on cells to enter data. Use the buttons above to add or remove rows and columns.
          Right-click for more options. Don't forget to save your table when complete.
        </div>
      )}
    </div>
  );
};

export default TableCreator;
