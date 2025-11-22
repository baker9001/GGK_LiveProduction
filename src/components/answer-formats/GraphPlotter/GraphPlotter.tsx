/**
 * Graph Plotter Component for Math/Science Graphing
 *
 * Uses Recharts for visualization with interactive point plotting,
 * supports linear, quadratic, and custom function graphs.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  Plus,
  Trash2,
  Download,
  Save,
  Check,
  AlertCircle,
  Grid3x3,
  TrendingUp
} from 'lucide-react';
import Button from '@/components/shared/Button';
import { cn } from '@/lib/utils';
import { validateGraphData } from '../utils/dataValidation';

export interface DataPoint {
  x: number;
  y: number;
  label?: string;
}

export interface GraphData {
  dataPoints: DataPoint[];
  xAxis: {
    label: string;
    min: number;
    max: number;
    step: number;
  };
  yAxis: {
    label: string;
    min: number;
    max: number;
    step: number;
  };
  title?: string;
  graphType: 'scatter' | 'line' | 'curve';
  timestamp: string;
}

interface GraphPlotterProps {
  questionId: string;
  value: GraphData | null;
  onChange: (data: GraphData | null) => void;
  disabled?: boolean;
  width?: number;
  height?: number;
  defaultXRange?: [number, number];
  defaultYRange?: [number, number];
  showGrid?: boolean;
  allowDataEntry?: boolean;
  showCorrectAnswer?: boolean;
  correctAnswerData?: GraphData;
}

const GraphPlotter: React.FC<GraphPlotterProps> = ({
  questionId,
  value,
  onChange,
  disabled = false,
  width,
  height = 400,
  defaultXRange = [-10, 10],
  defaultYRange = [-10, 10],
  showGrid = true,
  allowDataEntry = true,
  showCorrectAnswer = false,
  correctAnswerData
}) => {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>(value?.dataPoints || []);
  const [graphType, setGraphType] = useState<'scatter' | 'line' | 'curve'>(value?.graphType || 'scatter');
  const [xAxisConfig, setXAxisConfig] = useState(value?.xAxis || {
    label: 'x',
    min: defaultXRange[0],
    max: defaultXRange[1],
    step: 1
  });
  const [yAxisConfig, setYAxisConfig] = useState(value?.yAxis || {
    label: 'y',
    min: defaultYRange[0],
    max: defaultYRange[1],
    step: 1
  });
  const [title, setTitle] = useState(value?.title || '');
  const [validation, setValidation] = useState<{ isValid: boolean; errors: string[]; warnings: string[] }>({
    isValid: true,
    errors: [],
    warnings: []
  });
  const [saved, setSaved] = useState(false);
  const [newPointX, setNewPointX] = useState<string>('');
  const [newPointY, setNewPointY] = useState<string>('');

  // Generate grid lines
  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let i = xAxisConfig.min; i <= xAxisConfig.max; i += xAxisConfig.step) {
      ticks.push(i);
    }
    return ticks;
  }, [xAxisConfig]);

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let i = yAxisConfig.min; i <= yAxisConfig.max; i += yAxisConfig.step) {
      ticks.push(i);
    }
    return ticks;
  }, [yAxisConfig]);

  // Add data point
  const handleAddPoint = useCallback(() => {
    const x = parseFloat(newPointX);
    const y = parseFloat(newPointY);

    if (isNaN(x) || isNaN(y)) {
      setValidation({
        isValid: false,
        errors: ['Please enter valid numbers for x and y coordinates'],
        warnings: []
      });
      return;
    }

    if (x < xAxisConfig.min || x > xAxisConfig.max || y < yAxisConfig.min || y > yAxisConfig.max) {
      setValidation({
        isValid: false,
        errors: [`Point (${x}, ${y}) is outside the graph range`],
        warnings: []
      });
      return;
    }

    const newPoint: DataPoint = { x, y };
    const updatedPoints = [...dataPoints, newPoint];
    setDataPoints(updatedPoints);
    setNewPointX('');
    setNewPointY('');
    setValidation({ isValid: true, errors: [], warnings: [] });
  }, [newPointX, newPointY, dataPoints, xAxisConfig, yAxisConfig]);

  // Remove data point
  const handleRemovePoint = useCallback((index: number) => {
    const updatedPoints = dataPoints.filter((_, i) => i !== index);
    setDataPoints(updatedPoints);
  }, [dataPoints]);

  // Clear all points
  const handleClearAll = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all data points?')) {
      setDataPoints([]);
    }
  }, []);

  // Save graph
  const handleSave = useCallback(() => {
    const graphData: GraphData = {
      dataPoints,
      xAxis: xAxisConfig,
      yAxis: yAxisConfig,
      title,
      graphType,
      timestamp: new Date().toISOString()
    };

    const result = validateGraphData(graphData);
    setValidation(result);

    if (result.isValid) {
      onChange(graphData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [dataPoints, xAxisConfig, yAxisConfig, title, graphType, onChange]);

  // Export as CSV
  const handleExportCSV = useCallback(() => {
    const csv = [
      `${xAxisConfig.label},${yAxisConfig.label}`,
      ...dataPoints.map(p => `${p.x},${p.y}`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `graph_${questionId}_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [dataPoints, xAxisConfig.label, yAxisConfig.label, questionId]);

  // Sort data points by x for line graphs
  const sortedDataPoints = useMemo(() => {
    return [...dataPoints].sort((a, b) => a.x - b.x);
  }, [dataPoints]);

  return (
    <div className="space-y-4">
      {/* Graph Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-300 dark:border-gray-700">
        {/* Title */}
        <div className="col-span-full">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Graph Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={disabled}
            placeholder="Enter graph title"
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Graph Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Graph Type
          </label>
          <select
            value={graphType}
            onChange={(e) => setGraphType(e.target.value as 'scatter' | 'line' | 'curve')}
            disabled={disabled}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:text-white"
          >
            <option value="scatter">Scatter Plot</option>
            <option value="line">Line Graph</option>
            <option value="curve">Smooth Curve</option>
          </select>
        </div>

        {/* X-Axis Config */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            X-Axis Label
          </label>
          <input
            type="text"
            value={xAxisConfig.label}
            onChange={(e) => setXAxisConfig({ ...xAxisConfig, label: e.target.value })}
            disabled={disabled}
            placeholder="x"
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Y-Axis Config */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Y-Axis Label
          </label>
          <input
            type="text"
            value={yAxisConfig.label}
            onChange={(e) => setYAxisConfig({ ...yAxisConfig, label: e.target.value })}
            disabled={disabled}
            placeholder="y"
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Axis Ranges */}
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">X Min</label>
            <input
              type="number"
              value={xAxisConfig.min}
              onChange={(e) => setXAxisConfig({ ...xAxisConfig, min: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">X Max</label>
            <input
              type="number"
              value={xAxisConfig.max}
              onChange={(e) => setXAxisConfig({ ...xAxisConfig, max: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Y Min</label>
            <input
              type="number"
              value={yAxisConfig.min}
              onChange={(e) => setYAxisConfig({ ...yAxisConfig, min: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Y Max</label>
            <input
              type="number"
              value={yAxisConfig.max}
              onChange={(e) => setYAxisConfig({ ...yAxisConfig, max: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-800"
            />
          </div>
        </div>
      </div>

      {/* Graph Visualization */}
      <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700">
        {title && (
          <h3 className="text-center font-semibold text-gray-800 dark:text-gray-200 mb-4">
            {title}
          </h3>
        )}

        <ResponsiveContainer width="100%" height={height}>
          {graphType === 'scatter' ? (
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={showGrid ? '#e0e0e0' : 'transparent'} />
              <XAxis
                type="number"
                dataKey="x"
                domain={[xAxisConfig.min, xAxisConfig.max]}
                ticks={xTicks}
                label={{ value: xAxisConfig.label, position: 'bottom' }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[yAxisConfig.min, yAxisConfig.max]}
                ticks={yTicks}
                label={{ value: yAxisConfig.label, angle: -90, position: 'left' }}
              />
              <ReferenceLine x={0} stroke="#666" strokeWidth={1} />
              <ReferenceLine y={0} stroke="#666" strokeWidth={1} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={sortedDataPoints} fill="#8CC63F" />
            </ScatterChart>
          ) : (
            <LineChart data={sortedDataPoints} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={showGrid ? '#e0e0e0' : 'transparent'} />
              <XAxis
                dataKey="x"
                domain={[xAxisConfig.min, xAxisConfig.max]}
                ticks={xTicks}
                label={{ value: xAxisConfig.label, position: 'bottom' }}
              />
              <YAxis
                dataKey="y"
                domain={[yAxisConfig.min, yAxisConfig.max]}
                ticks={yTicks}
                label={{ value: yAxisConfig.label, angle: -90, position: 'left' }}
              />
              <ReferenceLine x={0} stroke="#666" strokeWidth={1} />
              <ReferenceLine y={0} stroke="#666" strokeWidth={1} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Line
                type={graphType === 'curve' ? 'monotone' : 'linear'}
                dataKey="y"
                stroke="#8CC63F"
                strokeWidth={2}
                dot={{ fill: '#8CC63F', r: 4 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>

        {dataPoints.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm mt-4">
            No data points yet. Add points below to start plotting.
          </div>
        )}
      </div>

      {/* Data Entry */}
      {allowDataEntry && !disabled && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-300 dark:border-gray-700">
          <div className="flex items-end gap-2 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                X ({xAxisConfig.label})
              </label>
              <input
                type="number"
                value={newPointX}
                onChange={(e) => setNewPointX(e.target.value)}
                step="0.1"
                placeholder="0"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Y ({yAxisConfig.label})
              </label>
              <input
                type="number"
                value={newPointY}
                onChange={(e) => setNewPointY(e.target.value)}
                step="0.1"
                placeholder="0"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:text-white"
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddPoint}
              className="px-4 h-10"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Point
            </Button>
          </div>

          {/* Data Points Table */}
          {dataPoints.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Data Points ({dataPoints.length})
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>

              <div className="max-h-48 overflow-y-auto border rounded-lg dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">X</th>
                      <th className="px-3 py-2 text-left">Y</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900">
                    {dataPoints.map((point, index) => (
                      <tr key={index} className="border-t dark:border-gray-700">
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className="px-3 py-2">{point.x.toFixed(2)}</td>
                        <td className="px-3 py-2">{point.y.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => handleRemovePoint(index)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={disabled || dataPoints.length === 0}
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
              Save Graph
            </>
          )}
        </Button>
      </div>

      {/* Validation messages */}
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

      {/* Correct answer display */}
      {showCorrectAnswer && correctAnswerData && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
            Reference Graph Data:
          </h4>
          <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
            <p>Points: {correctAnswerData.dataPoints.length}</p>
            <p>Type: {correctAnswerData.graphType}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphPlotter;
