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
  Table as TableIcon,
  Database,
  Loader2,
  Clock
} from 'lucide-react';
import Button from '@/components/shared/Button';
import { cn } from '@/lib/utils';
import { validateTableData } from '../utils/dataValidation';
import { TableTemplateService, type TableTemplateDTO, type TableCellDTO } from '@/services/TableTemplateService';
import { toast } from '@/components/shared/Toast';
import { supabase } from '@/lib/supabase';

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
  subQuestionId?: string;
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
  enableAutoSave?: boolean;
  onTemplateSave?: (template: TableTemplateDTO) => void;
}

const TableCreator: React.FC<TableCreatorProps> = ({
  questionId,
  subQuestionId,
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
  correctAnswerData,
  enableAutoSave = true,
  onTemplateSave
}) => {
  const hotTableRef = useRef<any>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'preview' | 'error'>('saved');
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [questionExistsInDB, setQuestionExistsInDB] = useState<boolean | null>(null);

  // Check if questionId is a valid UUID
  const isValidUUID = (id: string | undefined): boolean => {
    if (!id) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  // Check if we're in preview mode
  const isPreviewQuestion = !isValidUUID(questionId) || (subQuestionId && !isValidUUID(subQuestionId));
  const isQuestionSaved = questionId && isValidUUID(questionId.trim());

  // Check if question exists in database
  useEffect(() => {
    const checkQuestionExistence = async () => {
      if (!isValidUUID(questionId)) {
        setQuestionExistsInDB(false);
        setAutoSaveStatus('preview');
        return;
      }

      try {
        let exists = false;

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

        setQuestionExistsInDB(exists);
        if (!exists && !isPreviewQuestion) {
          setAutoSaveStatus('preview');
        }
      } catch (error) {
        console.error('[TableCreator] Error checking question existence:', error);
        setQuestionExistsInDB(true);
      }
    };

    checkQuestionExistence();
  }, [questionId, subQuestionId]);

  // Load existing template from database
  useEffect(() => {
    const loadTemplate = async () => {
      if (isPreviewQuestion || !questionExistsInDB) return;

      setLoading(true);
      try {
        const result = await TableTemplateService.loadTemplate(questionId, subQuestionId);

        if (result.success && result.template) {
          const template = result.template;
          setRowCount(template.rows);
          setColCount(template.columns);
          setHeaders(template.headers || Array.from({ length: template.columns }, (_, i) => `Column ${String.fromCharCode(65 + i)}`));
          setTitle(template.title || '');

          // Build table data from cells
          const data: any[][] = Array(template.rows).fill(null).map(() =>
            Array(template.columns).fill('')
          );

          template.cells.forEach(cell => {
            if (data[cell.rowIndex] && data[cell.rowIndex][cell.colIndex] !== undefined) {
              data[cell.rowIndex][cell.colIndex] = cell.lockedValue || '';
            }
          });

          setTableData(data);
          setAutoSaveStatus('saved');
          setLastSaveTime(new Date());
        }
      } catch (error) {
        console.error('[TableCreator] Error loading template:', error);
        toast.error('Failed to load table template');
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [questionId, subQuestionId, questionExistsInDB, isPreviewQuestion]);

  // Auto-save function
  const saveToDatabase = useCallback(async (silent = false) => {
    if (isPreviewQuestion || !questionExistsInDB || !enableAutoSave) {
      if (!silent) {
        toast.warning('Cannot save', {
          description: 'Please save the question first before saving table templates'
        });
      }
      return;
    }

    setAutoSaveStatus('saving');

    try {
      const hot = hotTableRef.current?.hotInstance;
      if (!hot) throw new Error('Table not initialized');

      const currentData = hot.getData();

      // Build cells array
      const cells: TableCellDTO[] = [];
      for (let row = 0; row < rowCount; row++) {
        for (let col = 0; col < colCount; col++) {
          const value = currentData[row]?.[col];
          if (value !== null && value !== undefined && value !== '') {
            cells.push({
              rowIndex: row,
              colIndex: col,
              cellType: 'locked',
              lockedValue: String(value),
              marks: 1
            });
          }
        }
      }

      const template: TableTemplateDTO = {
        questionId,
        subQuestionId: (subQuestionId && isValidUUID(subQuestionId)) ? subQuestionId : undefined,
        rows: rowCount,
        columns: colCount,
        headers,
        title: title || undefined,
        cells
      };

      const result = await TableTemplateService.saveTemplate(template);

      if (result.success) {
        if (!silent) {
          toast.success('Table saved!', {
            description: 'Table configuration saved successfully',
            duration: 2000
          });
        }
        onTemplateSave?.(template);
        setAutoSaveStatus('saved');
        setLastSaveTime(new Date());
      } else {
        throw new Error(result.error || 'Failed to save template');
      }
    } catch (error) {
      console.error('[TableCreator] Save error:', error);
      setAutoSaveStatus('error');
      if (!silent) {
        toast.error('Save failed', {
          description: error instanceof Error ? error.message : 'Failed to save table template'
        });
      }
    }
  }, [questionId, subQuestionId, rowCount, colCount, headers, title, isPreviewQuestion, questionExistsInDB, enableAutoSave, onTemplateSave]);

  // Trigger auto-save when data changes
  useEffect(() => {
    if (!enableAutoSave || isPreviewQuestion || !questionExistsInDB) return;

    if (autoSaveStatus === 'unsaved') {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new timer for auto-save (3 seconds debounce)
      autoSaveTimerRef.current = setTimeout(() => {
        saveToDatabase(true);
      }, 3000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [autoSaveStatus, enableAutoSave, isPreviewQuestion, questionExistsInDB, saveToDatabase]);

  // Update table when data changes
  const handleAfterChange = useCallback((changes: any, source: string) => {
    if (source === 'loadData' || !changes) return;

    const hot = hotTableRef.current?.hotInstance;
    if (!hot) return;

    const currentData = hot.getData();
    setTableData(currentData);
    setSaved(false);
    if (enableAutoSave && !isPreviewQuestion && questionExistsInDB) {
      setAutoSaveStatus('unsaved');
    }
  }, [enableAutoSave, isPreviewQuestion, questionExistsInDB]);

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
    if (enableAutoSave && !isPreviewQuestion && questionExistsInDB) {
      setAutoSaveStatus('unsaved');
    }
  }, [rowCount, maxRows, tableData, colCount, enableAutoSave, isPreviewQuestion, questionExistsInDB]);

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
    if (enableAutoSave && !isPreviewQuestion && questionExistsInDB) {
      setAutoSaveStatus('unsaved');
    }
  }, [rowCount, minRows, tableData, enableAutoSave, isPreviewQuestion, questionExistsInDB]);

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
    if (enableAutoSave && !isPreviewQuestion && questionExistsInDB) {
      setAutoSaveStatus('unsaved');
    }
  }, [colCount, maxCols, headers, tableData, enableAutoSave, isPreviewQuestion, questionExistsInDB]);

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
    if (enableAutoSave && !isPreviewQuestion && questionExistsInDB) {
      setAutoSaveStatus('unsaved');
    }
  }, [colCount, minCols, headers, tableData, enableAutoSave, isPreviewQuestion, questionExistsInDB]);

  // Update header
  const handleHeaderChange = useCallback((index: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[index] = value;
    setHeaders(newHeaders);
    if (enableAutoSave && !isPreviewQuestion && questionExistsInDB) {
      setAutoSaveStatus('unsaved');
    }
  }, [headers, enableAutoSave, isPreviewQuestion, questionExistsInDB]);

  // Save table (manual save or for onChange callback)
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

      // Also save to database if enabled
      if (enableAutoSave && !isPreviewQuestion && questionExistsInDB) {
        saveToDatabase(false);
      }
    }
  }, [headers, rowCount, colCount, title, onChange, enableAutoSave, isPreviewQuestion, questionExistsInDB, saveToDatabase]);

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
      {/* Loading Indicator */}
      {loading && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
            <span className="text-sm text-blue-700 dark:text-blue-300">Loading table template...</span>
          </div>
        </div>
      )}

      {/* Auto-Save Status Indicator */}
      {enableAutoSave && !disabled && (
        <div className="flex items-center justify-end gap-2 text-sm">
          {isPreviewQuestion && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-yellow-700 dark:text-yellow-300">Preview mode - Save question first</span>
            </div>
          )}
          {!isPreviewQuestion && isQuestionSaved && autoSaveStatus === 'saving' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg">
              <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
              <span className="text-blue-700 dark:text-blue-300">Saving...</span>
            </div>
          )}
          {!isPreviewQuestion && isQuestionSaved && autoSaveStatus === 'saved' && lastSaveTime && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300">
                Saved {lastSaveTime.toLocaleTimeString()}
              </span>
            </div>
          )}
          {!isPreviewQuestion && isQuestionSaved && autoSaveStatus === 'unsaved' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-amber-700 dark:text-amber-300">Unsaved changes</span>
            </div>
          )}
          {!isPreviewQuestion && autoSaveStatus === 'error' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-red-700 dark:text-red-300">Save failed</span>
            </div>
          )}
        </div>
      )}

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
              onChange={(e) => {
                setTitle(e.target.value);
                if (enableAutoSave && !isPreviewQuestion && questionExistsInDB) {
                  setAutoSaveStatus('unsaved');
                }
              }}
              disabled={disabled}
              placeholder="Enter table title"
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-600"
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
          Right-click for more options.
          {enableAutoSave && !isPreviewQuestion && questionExistsInDB && (
            <span className="text-green-600 dark:text-green-400 font-medium"> Auto-save is enabled - your changes are automatically saved.</span>
          )}
          {!enableAutoSave && <span> Don't forget to save your table when complete.</span>}
          {isPreviewQuestion && <span className="text-yellow-600 dark:text-yellow-400 font-medium"> Preview mode: Save the question to enable auto-save.</span>}
        </div>
      )}
    </div>
  );
};

export default TableCreator;
