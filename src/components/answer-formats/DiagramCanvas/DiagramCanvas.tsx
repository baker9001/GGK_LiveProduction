/**
 * Diagram Canvas Component for Drawing/Annotation
 *
 * Uses Fabric.js for interactive canvas drawing with shapes,
 * free drawing, text, and image import capabilities.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import {
  Pencil,
  Square,
  Circle,
  ArrowRight,
  Type,
  Image as ImageIcon,
  Eraser,
  RotateCcw,
  Download,
  Save,
  Trash2,
  ZoomIn,
  ZoomOut,
  Move,
  Check,
  AlertCircle
} from 'lucide-react';
import Button from '@/components/shared/Button';
import { cn } from '@/lib/utils';
import { exportCanvasToImage, exportCanvasToJSON } from '../utils/canvasExport';
import { validateCanvasDrawing } from '../utils/dataValidation';

export interface DiagramData {
  json: string;
  thumbnail?: string;
  timestamp: string;
}

interface DiagramCanvasProps {
  questionId: string;
  value: DiagramData | null;
  onChange: (data: DiagramData | null) => void;
  disabled?: boolean;
  width?: number;
  height?: number;
  backgroundColor?: string;
  backgroundImage?: string;
  showCorrectAnswer?: boolean;
  correctAnswerImage?: string;
  allowedTools?: ('pencil' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'image' | 'eraser')[];
}

const DiagramCanvas: React.FC<DiagramCanvasProps> = ({
  questionId,
  value,
  onChange,
  disabled = false,
  width = 800,
  height = 600,
  backgroundColor = '#ffffff',
  backgroundImage,
  showCorrectAnswer = false,
  correctAnswerImage,
  allowedTools = ['pencil', 'rectangle', 'circle', 'line', 'arrow', 'text', 'image', 'eraser']
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<string>('pencil');
  const [strokeColor, setStrokeColor] = useState<string>('#000000');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [fillColor, setFillColor] = useState<string>('transparent');
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [validation, setValidation] = useState<{ isValid: boolean; errors: string[] }>({ isValid: true, errors: [] });
  const [saved, setSaved] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Initialize Fabric Canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor,
      isDrawingMode: false,
      selection: !disabled
    });

    fabricCanvasRef.current = canvas;

    // Set background image if provided
    if (backgroundImage) {
      fabric.Image.fromURL(backgroundImage, (img) => {
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
          scaleX: width / (img.width || 1),
          scaleY: height / (img.height || 1)
        });
      });
    }

    // Load existing value
    if (value?.json) {
      try {
        canvas.loadFromJSON(value.json, () => {
          canvas.renderAll();
          saveToHistory();
        });
      } catch (error) {
        console.error('Failed to load canvas data:', error);
      }
    }

    // Event listeners
    canvas.on('object:added', handleCanvasChange);
    canvas.on('object:modified', handleCanvasChange);
    canvas.on('object:removed', handleCanvasChange);

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  // Handle canvas changes
  const handleCanvasChange = useCallback(() => {
    if (!fabricCanvasRef.current || disabled) return;
    setSaved(false);
    saveToHistory();
  }, [disabled]);

  // Save to history for undo/redo
  const saveToHistory = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const json = JSON.stringify(fabricCanvasRef.current.toJSON());
    setHistory(prev => {
      const newHistory = prev.slice(0, historyStep + 1);
      return [...newHistory, json];
    });
    setHistoryStep(prev => prev + 1);
  }, [historyStep]);

  // Handle tool change
  const handleToolChange = useCallback((tool: string) => {
    if (!fabricCanvasRef.current || disabled) return;

    const canvas = fabricCanvasRef.current;
    setActiveTool(tool);

    // Reset drawing mode
    canvas.isDrawingMode = false;
    canvas.selection = true;

    switch (tool) {
      case 'pencil':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = strokeColor;
        canvas.freeDrawingBrush.width = strokeWidth;
        break;

      case 'eraser':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = backgroundColor;
        canvas.freeDrawingBrush.width = strokeWidth * 3;
        break;

      case 'select':
        canvas.selection = true;
        break;

      default:
        // For shape tools, we'll handle on mouse down
        break;
    }
  }, [disabled, strokeColor, strokeWidth, backgroundColor]);

  // Add shape to canvas
  const addShape = useCallback((shapeType: string) => {
    if (!fabricCanvasRef.current || disabled) return;

    const canvas = fabricCanvasRef.current;
    let shape: fabric.Object | null = null;

    const commonProps = {
      left: width / 2 - 50,
      top: height / 2 - 50,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      fill: fillColor
    };

    switch (shapeType) {
      case 'rectangle':
        shape = new fabric.Rect({ ...commonProps, width: 100, height: 100 });
        break;

      case 'circle':
        shape = new fabric.Circle({ ...commonProps, radius: 50 });
        break;

      case 'line':
        shape = new fabric.Line([50, 50, 150, 150], { ...commonProps, fill: '' });
        break;

      case 'arrow':
        const arrow = new fabric.Path('M 0 0 L 100 0 L 90 -10 M 100 0 L 90 10', {
          ...commonProps,
          fill: ''
        });
        shape = arrow;
        break;

      case 'text':
        shape = new fabric.IText('Text', {
          left: width / 2 - 50,
          top: height / 2 - 20,
          fontSize: 20,
          fill: strokeColor
        });
        break;
    }

    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
    }
  }, [disabled, width, height, strokeColor, strokeWidth, fillColor]);

  // Clear canvas
  const handleClear = useCallback(() => {
    if (!fabricCanvasRef.current || disabled) return;

    if (window.confirm('Are you sure you want to clear the canvas?')) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.backgroundColor = backgroundColor;
      fabricCanvasRef.current.renderAll();
      saveToHistory();
    }
  }, [disabled, backgroundColor, saveToHistory]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyStep > 0 && fabricCanvasRef.current) {
      const newStep = historyStep - 1;
      setHistoryStep(newStep);
      fabricCanvasRef.current.loadFromJSON(history[newStep], () => {
        fabricCanvasRef.current!.renderAll();
      });
    }
  }, [historyStep, history]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyStep < history.length - 1 && fabricCanvasRef.current) {
      const newStep = historyStep + 1;
      setHistoryStep(newStep);
      fabricCanvasRef.current.loadFromJSON(history[newStep], () => {
        fabricCanvasRef.current!.renderAll();
      });
    }
  }, [historyStep, history]);

  // Delete selected object
  const handleDelete = useCallback(() => {
    if (!fabricCanvasRef.current || disabled) return;

    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (activeObject) {
      fabricCanvasRef.current.remove(activeObject);
      fabricCanvasRef.current.renderAll();
    }
  }, [disabled]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const newZoom = Math.min(zoom + 0.1, 3);
    setZoom(newZoom);
    fabricCanvasRef.current.setZoom(newZoom);
    fabricCanvasRef.current.renderAll();
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const newZoom = Math.max(zoom - 0.1, 0.5);
    setZoom(newZoom);
    fabricCanvasRef.current.setZoom(newZoom);
    fabricCanvasRef.current.renderAll();
  }, [zoom]);

  // Image import
  const handleImageImport = useCallback(() => {
    if (!fabricCanvasRef.current || disabled) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const imgUrl = event.target?.result as string;
        fabric.Image.fromURL(imgUrl, (img) => {
          img.scaleToWidth(200);
          fabricCanvasRef.current!.add(img);
          fabricCanvasRef.current!.renderAll();
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [disabled]);

  // Save diagram
  const handleSave = useCallback(async () => {
    if (!fabricCanvasRef.current) return;

    try {
      const json = exportCanvasToJSON(fabricCanvasRef.current);
      const thumbnail = await exportCanvasToImage(fabricCanvasRef.current, 'png');

      const diagramData: DiagramData = {
        json,
        thumbnail,
        timestamp: new Date().toISOString()
      };

      // Validate
      const result = validateCanvasDrawing(json);
      setValidation(result);

      if (result.isValid) {
        onChange(diagramData);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save diagram:', error);
      setValidation({
        isValid: false,
        errors: ['Failed to save diagram. Please try again.']
      });
    }
  }, [onChange]);

  // Download as image
  const handleDownload = useCallback(async () => {
    if (!fabricCanvasRef.current) return;

    try {
      const dataUrl = await exportCanvasToImage(fabricCanvasRef.current, 'png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `diagram_${questionId}_${Date.now()}.png`;
      link.click();
    } catch (error) {
      console.error('Failed to download diagram:', error);
    }
  }, [questionId]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
        {/* Tool buttons */}
        <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2">
          {allowedTools.includes('pencil') && (
            <Button
              variant={activeTool === 'pencil' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleToolChange('pencil')}
              disabled={disabled}
              title="Pencil"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {allowedTools.includes('eraser') && (
            <Button
              variant={activeTool === 'eraser' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleToolChange('eraser')}
              disabled={disabled}
              title="Eraser"
            >
              <Eraser className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant={activeTool === 'select' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => handleToolChange('select')}
            disabled={disabled}
            title="Select"
          >
            <Move className="w-4 h-4" />
          </Button>
        </div>

        {/* Shape buttons */}
        <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2">
          {allowedTools.includes('rectangle') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addShape('rectangle')}
              disabled={disabled}
              title="Rectangle"
            >
              <Square className="w-4 h-4" />
            </Button>
          )}
          {allowedTools.includes('circle') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addShape('circle')}
              disabled={disabled}
              title="Circle"
            >
              <Circle className="w-4 h-4" />
            </Button>
          )}
          {allowedTools.includes('arrow') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addShape('arrow')}
              disabled={disabled}
              title="Arrow"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
          {allowedTools.includes('text') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addShape('text')}
              disabled={disabled}
              title="Text"
            >
              <Type className="w-4 h-4" />
            </Button>
          )}
          {allowedTools.includes('image') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleImageImport}
              disabled={disabled}
              title="Import Image"
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Color and stroke controls */}
        <div className="flex items-center gap-2 border-r border-gray-300 dark:border-gray-600 pr-2">
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            disabled={disabled}
            className="w-8 h-8 rounded cursor-pointer"
            title="Stroke color"
          />
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
            disabled={disabled}
            className="w-20"
            title="Stroke width"
          />
          <span className="text-xs text-gray-600 dark:text-gray-400">{strokeWidth}px</span>
        </div>

        {/* History controls */}
        <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={disabled || historyStep <= 0}
            title="Undo"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={disabled || historyStep >= history.length - 1}
            title="Redo"
          >
            <RotateCcw className="w-4 h-4 transform scale-x-[-1]" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={disabled}
            title="Delete selected"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={disabled}
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[40px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={disabled}
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
            title="Clear canvas"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            disabled={disabled}
            title="Download as image"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={disabled}
            title="Save diagram"
          >
            {saved ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Save className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className={cn(
        "border rounded-lg overflow-hidden",
        disabled ? "opacity-60" : "",
        "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
      )}>
        <canvas ref={canvasRef} />
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

      {/* Correct answer display */}
      {showCorrectAnswer && correctAnswerImage && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
            Reference Diagram:
          </h4>
          <img
            src={correctAnswerImage}
            alt="Correct answer diagram"
            className="max-w-full h-auto rounded border border-green-300 dark:border-green-700"
          />
        </div>
      )}

      {/* Help text */}
      {!disabled && (
        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
          Use the tools above to create your diagram. Click "Save" to submit your work.
        </div>
      )}
    </div>
  );
};

export default DiagramCanvas;
