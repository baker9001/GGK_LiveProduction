// src/app/system-admin/learning/practice-management/papers-setup/tabs/components/QuestionsReviewSection.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  AlertCircle, CheckCircle, XCircle, AlertTriangle, Edit2, Save, X, 
  ChevronDown, ChevronRight, FileText, Image, Upload, Scissors, 
  Trash2, Eye, Link, BarChart3, Paperclip, Clock, Hash, Database,
  Loader2, Info, RefreshCw, ImageOff, Plus, Maximize2, ZoomIn, ZoomOut, ChevronLeft
} from 'lucide-react';

import { Button } from '../../../../../../../components/shared/Button';
import { StatusBadge } from '../../../../../../../components/shared/StatusBadge';
import { Select } from '../../../../../../../components/shared/Select';
import { SearchableMultiSelect } from '../../../../../../../components/shared/SearchableMultiSelect';
import { DynamicAnswerDisplay } from '../../../../../../../components/question-import/DynamicAnswerDisplay';
import { toast } from '../../../../../../../components/shared/Toast';
import { cn } from '../../../../../../../lib/utils';

import type { QuestionMapping, DataStructureInfo } from '../../../../../../../lib/data-operations/questionsDataOperations';
import { requiresFigure, detectAnswerFormat, getQuestionDescription, ensureArray, ensureString } from '../../../../../../../lib/data-operations/questionsDataOperations';

// Import PDF.js for inline snipping
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

// ============== PDF SNIPPING MODAL COMPONENT ==============
const PDFSnippingModal: React.FC<{
  isOpen: boolean;
  pdfDataUrl: string | null;
  questionId: string;
  partPath: string[];
  onSnip: (dataUrl: string, fileName: string) => void;
  onClose: () => void;
  questionLabel: string;
}> = ({ isOpen, pdfDataUrl, questionId, partPath, onSnip, onClose, questionLabel }) => {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF when modal opens
  useEffect(() => {
    if (!isOpen || !pdfDataUrl) return;
    
    const loadPdf = async () => {
      try {
        setIsLoading(true);
        const loadingTask = pdfjsLib.getDocument(pdfDataUrl);
        const pdf = await loadingTask.promise;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading PDF:', error);
        setIsLoading(false);
      }
    };
    loadPdf();
  }, [isOpen, pdfDataUrl]);

  // Render current page
  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || isLoading || !isOpen) return;
    
    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }
        
        const page = await pdfDocument.getPage(currentPage);
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        renderTaskRef.current = page.render({
          canvasContext: ctx,
          viewport: viewport
        });
        await renderTaskRef.current.promise;
        renderTaskRef.current = null;
      } catch (error) {
        if (error && error.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', error);
        }
      }
    };
    
    renderPage();
  }, [pdfDocument, currentPage, scale, isLoading, isOpen]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPoint({ x, y });
    setIsSelecting(true);
    setSelectionRect(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !startPoint || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = x - startPoint.x;
    const height = y - startPoint.y;
    setSelectionRect({
      x: width > 0 ? startPoint.x : x,
      y: height > 0 ? startPoint.y : y,
      width: Math.abs(width),
      height: Math.abs(height)
    });
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  const captureSelection = () => {
    if (!selectionRect || !canvasRef.current) return;
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = selectionRect.width;
      canvas.height = selectionRect.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(
        canvasRef.current,
        selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height,
        0, 0, selectionRect.width, selectionRect.height
      );
      
      const dataUrl = canvas.toDataURL('image/png');
      const fileName = `snip-q${questionId}${partPath.length > 0 ? `-${partPath.join('-')}` : ''}-p${currentPage}.png`;
      
      onSnip(dataUrl, fileName);
      setSelectionRect(null);
      onClose();
    } catch (error) {
      console.error('Error capturing selection:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-[90vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <Scissors className="h-5 w-5 text-white" />
            <div>
              <h2 className="text-lg font-semibold text-white">PDF Snipping Tool</h2>
              <p className="text-sm text-blue-100">{questionLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
            
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setScale(Math.max(0.5, scale - 0.25))}
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[50px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setScale(Math.min(3, scale + 0.25))}
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="primary"
            onClick={captureSelection}
            disabled={!selectionRect}
            className="min-w-[150px]"
          >
            <CheckCircle className="h-3 w-3 mr-2" />
            Capture Selection
          </Button>
        </div>
        
        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="relative inline-block">
                <canvas
                  ref={canvasRef}
                  className="border-2 border-gray-300 dark:border-gray-700 shadow-lg cursor-crosshair bg-white"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
                
                {selectionRect && (
                  <div
                    className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20 pointer-events-none"
                    style={{
                      left: `${selectionRect.x}px`,
                      top: `${selectionRect.y}px`,
                      width: `${selectionRect.width}px`,
                      height: `${selectionRect.height}px`
                    }}
                  >
                    <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      {Math.round(selectionRect.width)} × {Math.round(selectionRect.height)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Click and drag to select an area to capture. Use zoom controls to adjust the view.
          </p>
        </div>
      </div>
    </div>
  );
};

// ============== MAIN COMPONENT PROPS ==============
interface QuestionsReviewSectionProps {
  questions: any[];
  mappings: Record<string, QuestionMapping>;
  dataStructureInfo: DataStructureInfo | null;
  units: any[];
  topics: any[];
  subtopics: any[];
  attachments: any;
  validationErrors: Record<string, string[]>;
  existingQuestionNumbers: Set<number>;
  isImporting: boolean;
  importProgress: { current: number; total: number };
  paperMetadata: any;
  editingMetadata: boolean;
  pdfDataUrl: string | null;
  hasIncompleteQuestions: boolean;
  existingPaperId: string | null;
  expandedQuestions: Set<string>;
  editingQuestion: any;
  onQuestionEdit: (question: any) => void;
  onQuestionSave: (question: any) => void;
  onQuestionCancel: () => void;
  onMappingUpdate: (questionId: string, field: string, value: string | string[]) => void;
  onAttachmentUpload: (questionId: string, partPath: string[]) => void;
  onAttachmentDelete: (key: string, attachmentId: string) => void;
  onAutoMap: () => void;
  onImportConfirm: () => void;
  onPrevious: () => void;
  onToggleExpanded: (questionId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onPdfUpload: (file: File) => void;
  onRemovePdf: () => void;
  onEditMetadata: () => void;
  onSaveMetadata: () => void;
  onUpdateMetadata: (field: string, value: any) => void;
  onFixIncomplete: () => void;
  confirmationStatus: string;
  activeSnippingFor?: { questionId: string; partPath: string[] } | null;
  onSnippingComplete?: (dataUrl: string, fileName: string, questionId: string, partPath: string[]) => void;
  onCloseSnipping?: () => void;
  onUpdateAttachments?: (attachments: Record<string, any[]>) => void;
}

export function QuestionsReviewSection({
  questions,
  mappings,
  dataStructureInfo,
  units,
  topics,
  subtopics,
  attachments: initialAttachments,
  validationErrors,
  existingQuestionNumbers,
  isImporting,
  importProgress,
  paperMetadata,
  editingMetadata,
  pdfDataUrl,
  hasIncompleteQuestions,
  existingPaperId,
  expandedQuestions,
  editingQuestion,
  onQuestionEdit,
  onQuestionSave,
  onQuestionCancel,
  onMappingUpdate,
  onAttachmentUpload,
  onAttachmentDelete,
  onAutoMap,
  onImportConfirm,
  onPrevious,
  onToggleExpanded,
  onExpandAll,
  onCollapseAll,
  onPdfUpload,
  onRemovePdf,
  onEditMetadata,
  onSaveMetadata,
  onUpdateMetadata,
  onFixIncomplete,
  confirmationStatus,
  activeSnippingFor,
  onSnippingComplete,
  onCloseSnipping,
  onUpdateAttachments
}: QuestionsReviewSectionProps) {
  
  // ============== STATE MANAGEMENT ==============
  const [showSnippingModal, setShowSnippingModal] = useState(false);
  const [currentSnipping, setCurrentSnipping] = useState<{
    questionId: string;
    partPath: string[];
    label: string;
  } | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Local attachments state that syncs with parent
  const [attachments, setAttachments] = useState<Record<string, any[]>>(initialAttachments || {});

  // Sync attachments with parent when they change
  useEffect(() => {
    if (onUpdateAttachments) {
      onUpdateAttachments(attachments);
    }
  }, [attachments]);

  // ============== HANDLERS ==============
  const handleSnipClick = useCallback((questionId: string, partPath: string[] = [], label: string) => {
    if (!pdfDataUrl) {
      // Trigger file upload
      fileInputRef.current?.click();
      // Store pending snip request
      setCurrentSnipping({ questionId, partPath, label });
    } else {
      // Open snipping modal directly
      setCurrentSnipping({ questionId, partPath, label });
      setShowSnippingModal(true);
    }
  }, [pdfDataUrl]);

  const handlePdfUpload = useCallback((file: File) => {
    setPdfFileName(file.name);
    onPdfUpload(file);
    
    // If there was a pending snip request, open modal after PDF loads
    if (currentSnipping) {
      setTimeout(() => {
        setShowSnippingModal(true);
      }, 500);
    }
  }, [currentSnipping, onPdfUpload]);

  const handleSnippingComplete = useCallback((dataUrl: string, fileName: string) => {
    if (!currentSnipping) return;
    
    const { questionId, partPath } = currentSnipping;
    
    // Generate attachment key based on question and part path
    let attachmentKey = questionId;
    if (partPath && partPath.length > 0) {
      attachmentKey = `${questionId}_${partPath.join('_')}`;
    }
    
    // Create new attachment object
    const newAttachment = {
      id: `att_${Date.now()}`,
      dataUrl: dataUrl,
      file_url: dataUrl,
      file_name: fileName,
      fileName: fileName,
      file_type: 'image/png',
      created_at: new Date().toISOString()
    };
    
    // Update local attachments state
    setAttachments(prev => {
      const updated = {
        ...prev,
        [attachmentKey]: [...(prev[attachmentKey] || []), newAttachment]
      };
      
      // Also notify parent if callback is provided
      if (onSnippingComplete) {
        onSnippingComplete(dataUrl, fileName, questionId, partPath);
      }
      
      return updated;
    });
    
    // Close modal and reset
    setShowSnippingModal(false);
    setCurrentSnipping(null);
  }, [currentSnipping, onSnippingComplete]);

  const handleCloseSnipping = useCallback(() => {
    setShowSnippingModal(false);
    setCurrentSnipping(null);
    if (onCloseSnipping) {
      onCloseSnipping();
    }
  }, [onCloseSnipping]);

  const handleRemovePdf = () => {
    setPdfFileName('');
    onRemovePdf();
  };

  const handleAttachmentDelete = (key: string, attachmentId: string) => {
    setAttachments(prev => {
      const updated = {
        ...prev,
        [key]: (prev[key] || []).filter(att => att.id !== attachmentId)
      };
      
      // Also call parent handler
      onAttachmentDelete(key, attachmentId);
      
      return updated;
    });
  };

  // ============== CALCULATIONS ==============
  const totalMarks = paperMetadata.total_marks || 0;
  const warningCount = questions.filter(q => q.validation_warnings?.length > 0).length;
  const mappedQuestionsCount = Object.keys(mappings).filter(qId => {
    const mapping = mappings[qId];
    return mapping?.chapter_id || (mapping?.topic_ids && mapping.topic_ids.length > 0);
  }).length;
  const alreadyImportedCount = questions.filter(q => 
    existingQuestionNumbers.has(parseInt(q.question_number))
  ).length;

  const countAttachments = (item: any): number => {
    let count = 0;
    const itemKey = item.id;
    
    // Count main item attachments
    if (attachments[itemKey]?.length > 0) {
      count += attachments[itemKey].length;
    }
    
    // Count part attachments
    const countPartAttachments = (parts: any[], parentPath = [item.id]) => {
      if (!parts) return;
      parts.forEach((part: any) => {
        const path = [...parentPath, part.id];
        const key = path.join('_');
        if (attachments[key]?.length > 0) {
          count += attachments[key].length;
        }
        if (part.parts) {
          countPartAttachments(part.parts, path);
        }
        if (part.subparts) {
          countPartAttachments(part.subparts, path);
        }
      });
    };
    
    if (item.parts) {
      countPartAttachments(item.parts);
    }
    
    return count;
  };

  const totalAttachmentCount = questions.reduce((sum: number, q: any) => sum + countAttachments(q), 0);
  
  const questionsWithAttachments = questions.filter(q => {
    const checkRequiresFigure = (item: any): boolean => {
      if (requiresFigure(item)) return true;
      if (item.parts) {
        return item.parts.some((part: any) => checkRequiresFigure(part));
      }
      if (item.subparts) {
        return item.subparts.some((subpart: any) => checkRequiresFigure(subpart));
      }
      return false;
    };
    return checkRequiresFigure(q) || countAttachments(q) > 0;
  });

  const questionsWithMissingFigures = questions.filter(q => {
    const checkMissingFigures = (item: any, path: any[] = []): boolean => {
      const key = path.length > 0 ? path.join('_') : item.id;
      const hasAttachments = attachments[key]?.length > 0;
      if (requiresFigure(item) && !hasAttachments) return true;
      if (item.parts) {
        return item.parts.some((part: any) => {
          const newPath = [...path, item.id];
          if (path.length === 0) newPath.pop();
          newPath.push(part.id);
          return checkMissingFigures(part, newPath);
        });
      }
      if (item.subparts) {
        return item.subparts.some((subpart: any) => {
          const newPath = [...path, item.id];
          if (path.length === 0) newPath.pop();
          newPath.push(subpart.id);
          return checkMissingFigures(subpart, newPath);
        });
      }
      return false;
    };
    return checkMissingFigures(q);
  });

  const questionsWithWarnings = questions.filter(q => q.validation_warnings?.length > 0);
  const questionsWithErrors = Object.keys(validationErrors);

  // ============== HELPER FUNCTIONS ==============
  const getQuestionTypeIcon = (type: string) => {
    const typeMap: any = {
      mcq: { label: 'MCQ', status: 'warning' },
      tf: { label: 'T/F', status: 'info' },
      descriptive: { label: 'DESC', status: 'default' },
      complex: { label: 'MULTI', status: 'primary' },
      direct: { label: 'DIRECT', status: 'secondary' },
      calculation: { label: 'CALC', status: 'info' },
      equation: { label: 'EQN', status: 'warning' },
      practical: { label: 'PRAC', status: 'secondary' }
    };
    
    const typeInfo = typeMap[type] || { label: type?.toUpperCase() || 'UNKNOWN', status: 'default' };
    return <StatusBadge status={typeInfo.status} text={typeInfo.label} />;
  };

  const renderAttachments = (key: string, questionId: string, partPath: any[] = []) => {
    const questionAttachments = attachments[key] || [];
    
    if (questionAttachments.length === 0) return null;
    
    return (
      <div className="mt-4">
        <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Attachments:</div>
        <div className="space-y-3">
          {questionAttachments.map((att: any) => (
            <div key={att.id} className="relative group">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden p-4">
                <div className="flex justify-center items-center min-h-[200px]">
                  <img 
                    src={att.dataUrl || att.file_url} 
                    alt={att.fileName || att.file_name}
                    className="max-w-full max-h-[400px] object-scale-down"
                    style={{ 
                      width: 'auto',
                      height: 'auto',
                      maxWidth: '100%',
                      maxHeight: '400px'
                    }}
                  />
                </div>
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => window.open(att.dataUrl || att.file_url, '_blank')}
                    className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="View Full Size"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => handleAttachmentDelete(key, att.id)}
                    className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:bg-red-100 dark:hover:bg-red-900"
                    title="Delete"
                  >
                    <Trash2 size={18} className="text-red-600" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{att.fileName || att.file_name}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============== RENDER FUNCTIONS ==============
  const renderQuestionPart = (part: any, question: any, isEditing = false, level = 1, partPath: any[] = [], partType: 'part' | 'subpart' = 'part') => {
    const currentPath = [...partPath, part.id];
    const indentClass = level === 1 ? 'ml-8' : level === 2 ? 'ml-16' : 'ml-24';
    const borderColorClass = level === 1 ? 'border-gray-200 dark:border-gray-700' : level === 2 ? 'border-blue-200 dark:border-blue-700' : 'border-purple-200 dark:border-purple-700';
    
    let displayPartLabel = '';
    if (partType === 'part') {
      displayPartLabel = part.part || part.part_label || String.fromCharCode(97 + (part.order_index || 0));
    } else if (partType === 'subpart') {
      displayPartLabel = part.subpart || part.part_label || `${String.fromCharCode(105 + (part.order_index || 0))}`;
    }
    
    const attachmentKey = `${question.id}_${currentPath.join('_')}`;
    const partHasAttachments = attachments[attachmentKey]?.length > 0;

    const handlePartUpdate = (field: string, value: any) => {
      if (!isEditing) return;
      
      const updatedPart = { ...part, [field]: value };
      
      const updateParts = (parts: any[], partType: string): any[] => {
        return parts.map(p => {
          if (p.id === part.id) {
            return updatedPart;
          }
          if (p.parts) {
            return { ...p, parts: updateParts(p.parts, 'part') };
          }
          if (p.subparts) {
            return { ...p, subparts: updateParts(p.subparts, 'subpart') };
          }
          return p;
        });
      };
      
      const updatedQuestion = {
        ...editingQuestion,
        parts: updateParts(editingQuestion.parts, 'part')
      };
      
      onQuestionEdit(updatedQuestion);
    };

    return (
      <div key={part.id} className={`${indentClass} mb-4 border-l-2 ${borderColorClass} pl-4`}>
        <div className="flex items-start gap-3 mb-2">
          <div className={`flex-shrink-0 w-8 h-8 ${level === 1 ? 'bg-gray-100 dark:bg-gray-700' : level === 2 ? 'bg-blue-100 dark:bg-blue-800' : 'bg-purple-100 dark:bg-purple-800'} rounded-full flex items-center justify-center text-sm font-medium ${level === 1 ? 'text-gray-700 dark:text-gray-300' : level === 2 ? 'text-blue-700 dark:text-blue-300' : 'text-purple-700 dark:text-purple-300'}`}>
            {displayPartLabel}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getQuestionTypeIcon(part.type)}
              <span className="text-sm text-gray-500 dark:text-gray-400">{part.marks} marks</span>
              {part.answer_format && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                  {part.answer_format}
                </span>
              )}
              {part.figure && !partHasAttachments && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 rounded-full animate-pulse">
                  <ImageOff size={14} className="text-orange-600 dark:text-orange-400" />
                  <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Figure missing!</span>
                </div>
              )}
              {partHasAttachments && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Image size={14} className="text-green-600 dark:text-green-400" />
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">Figure attached</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSnipClick(
                  question.id, 
                  currentPath, 
                  `Question ${question.question_number} - Part ${displayPartLabel}`
                )}
                className={!pdfDataUrl ? 'border-dashed' : ''}
              >
                <Scissors className="w-3 h-3 mr-1" />
                Snip
                {!pdfDataUrl && <Upload className="w-3 h-3 ml-1 opacity-60" />}
              </Button>
            </div>
            
            {part.description && (
              <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded text-sm text-gray-700 dark:text-gray-300">
                {part.description}
              </div>
            )}
            
            <div className="text-gray-800 dark:text-gray-200">
              {isEditing ? (
                <textarea
                  value={part.question_text || part.question_description || ''}
                  onChange={(e) => handlePartUpdate('question_text', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows={2}
                  placeholder="Enter question text..."
                />
              ) : (
                part.question_description || part.question_text
              )}
            </div>
            
            <div className="mt-3">
              <DynamicAnswerDisplay
                question={part}
                isEditing={isEditing}
                onUpdate={handlePartUpdate}
              />
            </div>
            
            {renderAttachments(attachmentKey, question.id, currentPath)}
            
            {(part.hint || isEditing) && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <div className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Hint:</div>
                {isEditing ? (
                  <textarea
                    value={part.hint || ''}
                    onChange={(e) => handlePartUpdate('hint', e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-blue-800/50 dark:text-white"
                    rows={2}
                    placeholder="Provide a hint for students..."
                  />
                ) : (
                  <div className="text-sm text-blue-700 dark:text-blue-400">{part.hint}</div>
                )}
              </div>
            )}
            
            {(part.explanation || isEditing) && (
              <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md">
                <div className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">Explanation:</div>
                {isEditing ? (
                  <textarea
                    value={part.explanation || ''}
                    onChange={(e) => handlePartUpdate('explanation', e.target.value)}
                    className="w-full px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-purple-800/50 dark:text-white"
                    rows={3}
                    placeholder="Provide a detailed explanation..."
                  />
                ) : (
                  <div className="text-sm text-purple-700 dark:text-purple-400">{part.explanation}</div>
                )}
              </div>
            )}
            
            <div className="mt-3 flex flex-wrap gap-2">
              {part.unit && (
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                  {part.unit}
                </span>
              )}
              {Array.isArray(part.topics) ? part.topics.map((topic: any, idx: number) => (
                <span key={idx} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                  {topic}
                </span>
              )) : part.topic && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                  {part.topic}
                </span>
              )}
              {Array.isArray(part.subtopics) ? part.subtopics.map((subtopic: any, idx: number) => (
                <span key={idx} className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded">
                  {subtopic}
                </span>
              )) : part.subtopic && (
                <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded">
                  {part.subtopic}
                </span>
              )}
            </div>
            
            {part.subparts && part.subparts.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 ml-4">Subparts:</div>
                {part.subparts
                  .filter((subPart: any) => subPart !== null && subPart !== undefined)
                  .map((subPart: any) => renderQuestionPart(subPart, question, isEditing, level + 1, currentPath, 'subpart'))}
              </div>
            )}
            
            {part.parts && part.parts.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 ml-4">Sub-parts:</div>
                {part.parts
                  .filter((subPart: any) => subPart !== null && subPart !== undefined)
                  .map((subPart: any) => renderQuestionPart(subPart, question, isEditing, level + 1, currentPath, 'part'))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderQuestion = (question: any) => {
    if (!question || typeof question !== 'object') {
      return null;
    }
    
    const isExpanded = expandedQuestions.has(question.id);
    const isEditing = editingQuestion?.id === question.id;
    const currentQuestion = isEditing ? editingQuestion : question;
    const mapping = mappings[question.id] || { chapter_id: '', topic_ids: [], subtopic_ids: [] };
    const errors = validationErrors[question.id] || [];
    const isAlreadyImported = existingQuestionNumbers.has(parseInt(currentQuestion.question_number));
    
    const questionNumber = currentQuestion.question_number || 'Unknown';
    const questionType = currentQuestion.type || 'descriptive';
    const questionMarks = currentQuestion.marks || currentQuestion.total_marks || 0;
    
    const questionHasAttachments = attachments[question.id]?.length > 0;
    const needsFigure = (item: any): boolean => {
      if (requiresFigure(item) && !questionHasAttachments) return true;
      if (item.parts) {
        return item.parts.some((part: any) => {
          const partKey = `${question.id}_${part.id}`;
          const partHasAttachments = attachments[partKey]?.length > 0;
          return requiresFigure(part) && !partHasAttachments;
        });
      }
      return false;
    };
    const figureRequired = needsFigure(currentQuestion);

    const handleQuestionUpdate = (field: string, value: any) => {
      if (!isEditing) return;
      onQuestionEdit({ ...editingQuestion, [field]: value });
    };
    
    return (
      <div 
        key={question.id}
        id={`question-${question.id}`}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border mb-4 transition-all ${
          isAlreadyImported ? 'opacity-60 border-green-500 dark:border-green-600' :
          errors.length > 0 ? 'border-red-500 dark:border-red-600' : 
          figureRequired ? 'border-l-4 border-l-orange-500 dark:border-l-orange-400 border-orange-300 dark:border-orange-600' : 
          currentQuestion.figure ? 'border-l-4 border-l-orange-500 dark:border-l-orange-400 border-gray-200 dark:border-gray-700' : 
          'border-gray-200 dark:border-gray-700'
        }`}
      >
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <button
                onClick={() => onToggleExpanded(question.id)}
                className="mt-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    Question {questionNumber}
                  </span>
                  {getQuestionTypeIcon(questionType)}
                  <span className="text-sm text-gray-600 dark:text-gray-400">{questionMarks} marks</span>
                  
                  {currentQuestion.answer_format && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                      {currentQuestion.answer_format}
                    </span>
                  )}
                  
                  {isAlreadyImported && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <CheckCircle size={14} className="text-green-600 dark:text-green-400" />
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Already imported</span>
                    </div>
                  )}
                  
                  {currentQuestion.validation_warnings?.length > 0 && (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <AlertTriangle size={16} />
                      <span className="text-sm font-medium">Warning</span>
                    </div>
                  )}
                  
                  {errors.length > 0 && (
                    <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <AlertCircle size={16} />
                      <span className="text-sm font-medium">Validation Error</span>
                    </div>
                  )}
                  
                  {figureRequired && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-full animate-pulse">
                      <ImageOff size={14} className="text-orange-600 dark:text-orange-400" />
                      <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Figure missing!</span>
                    </div>
                  )}
                  
                  {questionHasAttachments && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <Image size={14} className="text-green-600 dark:text-green-400" />
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Figure attached</span>
                    </div>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSnipClick(question.id, [], `Question ${questionNumber}`)}
                    disabled={isAlreadyImported}
                    className={!pdfDataUrl ? 'border-dashed' : ''}
                  >
                    <Scissors className="w-3 h-3 mr-1" />
                    Snip
                    {!pdfDataUrl && <Upload className="w-3 h-3 ml-1 opacity-60" />}
                  </Button>
                </div>
                
                {!isExpanded && (
                  <>
                    <div className="text-gray-700 dark:text-gray-300 line-clamp-2">
                      {currentQuestion.question_header || currentQuestion.question_description || currentQuestion.question_text || 
                       (currentQuestion.parts && currentQuestion.parts.length > 0 && currentQuestion.parts[0].question_text) || 
                       (currentQuestion.figure && currentQuestion.type === 'mcq' ? '[Figure-based MCQ]' : 'No question text')}
                    </div>
                    
                    {currentQuestion.correct_answer && (
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Answer: {typeof currentQuestion.correct_answer === 'string' 
                          ? currentQuestion.correct_answer.substring(0, 50) + (currentQuestion.correct_answer.length > 50 ? '...' : '')
                          : 'Multiple answers'}
                      </div>
                    )}
                    
                    {currentQuestion.parts && currentQuestion.parts.length > 0 && (
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {currentQuestion.parts.length === 1 ? '1 part' : `${currentQuestion.parts.length} parts`}
                      </div>
                    )}
                    
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      {mapping.chapter_id && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-600 dark:text-gray-400">Unit:</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {units.find((u: any) => u.id === mapping.chapter_id)?.name || 'Unknown'}
                          </span>
                        </div>
                      )}
                      {mapping?.topic_ids && mapping.topic_ids.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-600 dark:text-gray-400">Topics:</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {mapping.topic_ids.length} selected
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onQuestionEdit(question)}
                  disabled={isAlreadyImported}
                >
                  <Edit2 size={14} className="mr-1" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onQuestionSave(editingQuestion)}
                  >
                    <Save size={14} className="mr-1" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onQuestionCancel}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {isExpanded && (
            <div className="mt-4">
              {isAlreadyImported && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                  <div className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-600 dark:text-green-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-green-800 dark:text-green-300">
                        This question has already been imported
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-400 mt-1">
                        It will be skipped during the import process to prevent duplicates.
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {errors.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                        Validation Errors:
                      </div>
                      <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400">
                        {errors.map((error: string, idx: number) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {!isAlreadyImported && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center">
                      <Database className="h-4 w-4 mr-2" />
                      Academic Structure Mapping
                    </h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Chapter/Unit <span className="text-red-500">*</span>
                      </label>
                      <Select
                        options={units.map((u: any) => ({ value: u.id, label: u.name }))}
                        value={mapping.chapter_id || ''}
                        onChange={(value) => {
                          onMappingUpdate(question.id, 'chapter_id', value);
                          onMappingUpdate(question.id, 'topic_ids', []);
                          onMappingUpdate(question.id, 'subtopic_ids', []);
                        }}
                        placeholder="Select unit..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Topics <span className="text-xs text-gray-500">(Multiple selection allowed)</span>
                      </label>
                      <SearchableMultiSelect
                        options={topics.filter((t: any) => {
                          // If no chapter selected, show all topics
                          if (!mapping.chapter_id) return false;
                          // Check multiple possible field names for unit relationship
                          return t.unit_id === mapping.chapter_id || 
                                 t.chapter_id === mapping.chapter_id ||
                                 t.edu_unit_id === mapping.chapter_id;
                        }).map((t: any) => ({ value: t.id, label: t.name }))}
                        selectedValues={mapping.topic_ids || []}
                        onChange={(value) => {
                          onMappingUpdate(question.id, 'topic_ids', value);
                          // Only clear subtopics if topics are being cleared
                          if (value.length === 0) {
                            onMappingUpdate(question.id, 'subtopic_ids', []);
                          }
                        }}
                        placeholder="Select topics..."
                        disabled={!mapping.chapter_id}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Subtopics <span className="text-xs text-gray-500">(Multiple selection allowed)</span>
                      </label>
                      <SearchableMultiSelect
                        options={subtopics.filter((s: any) => {
                          // If no topics selected, show no subtopics
                          if (!mapping.topic_ids || mapping.topic_ids.length === 0) return false;
                          // Check multiple possible field names for topic relationship
                          return mapping.topic_ids.includes(s.topic_id) || 
                                 mapping.topic_ids.includes(s.edu_topic_id);
                        }).map((s: any) => ({ value: s.id, label: s.name }))}
                        selectedValues={mapping.subtopic_ids || []}
                        onChange={(value) => onMappingUpdate(question.id, 'subtopic_ids', value)}
                        placeholder="Select subtopics..."
                        disabled={!mapping.topic_ids || mapping.topic_ids.length === 0}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Question Text
                  </label>
                  {isEditing ? (
                    <textarea
                      value={currentQuestion.question_text || currentQuestion.question_description || ''}
                      onChange={(e) => handleQuestionUpdate('question_text', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      rows={3}
                      placeholder="Enter question text..."
                    />
                  ) : (
                    <div className="text-gray-800 dark:text-gray-200">
                      {currentQuestion.question_description || currentQuestion.question_text || 'No question text'}
                    </div>
                  )}
                </div>
                
                <DynamicAnswerDisplay
                  question={currentQuestion}
                  isEditing={isEditing}
                  onUpdate={handleQuestionUpdate}
                />
                
                {renderAttachments(question.id, question.id, [])}
                
                {(currentQuestion.hint || isEditing) && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <div className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Hint:</div>
                    {isEditing ? (
                      <textarea
                        value={currentQuestion.hint || ''}
                        onChange={(e) => handleQuestionUpdate('hint', e.target.value)}
                        className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-blue-800/50 dark:text-white"
                        rows={2}
                        placeholder="Provide a hint for students..."
                      />
                    ) : (
                      <div className="text-sm text-blue-700 dark:text-blue-400">{currentQuestion.hint}</div>
                    )}
                  </div>
                )}
                
                {(currentQuestion.explanation || isEditing) && (
                  <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md">
                    <div className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">Explanation:</div>
                    {isEditing ? (
                      <textarea
                        value={currentQuestion.explanation || ''}
                        onChange={(e) => handleQuestionUpdate('explanation', e.target.value)}
                        className="w-full px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-purple-800/50 dark:text-white"
                        rows={3}
                        placeholder="Provide a detailed explanation..."
                      />
                    ) : (
                      <div className="text-sm text-purple-700 dark:text-purple-400">{currentQuestion.explanation}</div>
                    )}
                  </div>
                )}
              </div>
              
              {currentQuestion.parts && currentQuestion.parts.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Parts:</div>
                  {currentQuestion.parts
                    .filter((part: any) => part !== null && part !== undefined)
                    .map((part: any) => renderQuestionPart(part, currentQuestion, isEditing, 1, [], 'part'))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============== MAIN RENDER ==============
  return (
    <>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handlePdfUpload(file);
          }
        }}
      />

      {/* PDF Snipping Modal */}
      <PDFSnippingModal
        isOpen={showSnippingModal}
        pdfDataUrl={pdfDataUrl}
        questionId={currentSnipping?.questionId || ''}
        partPath={currentSnipping?.partPath || []}
        onSnip={handleSnippingComplete}
        onClose={handleCloseSnipping}
        questionLabel={currentSnipping?.label || ''}
      />
      
      {/* Header with PDF Status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Questions Review
          </h2>
          
          {pdfDataUrl && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                PDF Ready
              </span>
              {pdfFileName && (
                <span className="text-sm text-green-600 dark:text-green-400">
                  ({pdfFileName})
                </span>
              )}
              <button
                onClick={handleRemovePdf}
                className="ml-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {!pdfDataUrl && (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<Upload className="h-4 w-4" />}
            >
              Upload PDF
            </Button>
          )}
        </div>
      </div>

      {/* Rest of the component remains the same - Data Structure Info, Paper Summary, Statistics, etc. */}
      {dataStructureInfo && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center mb-2">
                <Database className="mr-2 text-indigo-600 dark:text-indigo-400" size={18} />
                Academic Structure
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Region:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{dataStructureInfo.regions?.name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Program:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{dataStructureInfo.programs?.name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Provider:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{dataStructureInfo.providers?.name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Subject:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{dataStructureInfo.edu_subjects?.name}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasIncompleteQuestions && existingPaperId && (
                <Button
                  variant="outline"
                  onClick={onFixIncomplete}
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                  Fix Incomplete Questions
                </Button>
              )}
              {mappedQuestionsCount < questions.length && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAutoMap}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Auto-map All
                  </Button>
                  <span className="text-sm text-indigo-600 dark:text-indigo-400">
                    {questions.length - mappedQuestionsCount} unmapped
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Paper Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <FileText className="mr-2 text-blue-600 dark:text-blue-400" size={20} />
            Paper Summary
          </h3>
          {!editingMetadata ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onEditMetadata}
            >
              <Edit2 size={14} className="mr-1" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={onSaveMetadata}
              >
                <Save size={14} className="mr-1" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditMetadata()}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center text-gray-600 dark:text-gray-400 text-xs mb-1">
              <Hash size={12} className="mr-1" />
              Paper Code
            </div>
            {editingMetadata ? (
              <input
                type="text"
                value={paperMetadata.paper_code}
                onChange={(e) => onUpdateMetadata('paper_code', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium dark:bg-gray-700 dark:text-white"
              />
            ) : (
              <div className="font-medium text-gray-900 dark:text-white">{paperMetadata.paper_code || '-'}</div>
            )}
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center text-gray-600 dark:text-gray-400 text-xs mb-1">
              <Clock size={12} className="mr-1" />
              Session <span className="text-red-500 ml-1">*</span>
            </div>
            {editingMetadata ? (
              <div className="flex gap-1">
                <input
                  type="text"
                  value={paperMetadata.exam_session}
                  onChange={(e) => onUpdateMetadata('exam_session', e.target.value)}
                  className="w-1/2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium dark:bg-gray-700 dark:text-white"
                  placeholder="Session"
                />
                <input
                  type="number"
                  value={paperMetadata.exam_year}
                  onChange={(e) => onUpdateMetadata('exam_year', e.target.value)}
                  className="w-1/2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium dark:bg-gray-700 dark:text-white"
                  placeholder="Year"
                  min="1900"
                  max="2100"
                />
              </div>
            ) : (
              <div className="font-medium text-gray-900 dark:text-white">
                {paperMetadata.exam_session || '-'} {paperMetadata.exam_year || '-'}
              </div>
            )}
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Subject</div>
            {editingMetadata ? (
              <input
                type="text"
                value={paperMetadata.subject}
                onChange={(e) => onUpdateMetadata('subject', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium dark:bg-gray-700 dark:text-white"
              />
            ) : (
              <div className="font-medium text-gray-900 dark:text-white">{paperMetadata.subject || '-'}</div>
            )}
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Duration</div>
            {editingMetadata ? (
              <input
                type="text"
                value={paperMetadata.duration}
                onChange={(e) => onUpdateMetadata('duration', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium dark:bg-gray-700 dark:text-white"
              />
            ) : (
              <div className="font-medium text-gray-900 dark:text-white">{paperMetadata.duration || '-'}</div>
            )}
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Total Questions</div>
            <div className="font-medium text-gray-900 dark:text-white">{questions.length}</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Total Marks</div>
            <div className="font-medium text-gray-900 dark:text-white">{totalMarks}</div>
          </div>
        </div>
      </div>

      {/* Import Progress */}
      {isImporting && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center mb-2">
            <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin mr-2" />
            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Importing questions... ({importProgress.current} / {importProgress.total})
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
            <div 
              className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Mapped</div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center">
            {mappedQuestionsCount} / {questions.length}
            <Database className="ml-2 text-gray-400" size={20} />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {questions.length - mappedQuestionsCount} need mapping
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Imported</div>
          <div className="text-2xl font-semibold text-green-600 dark:text-green-400 flex items-center">
            {alreadyImportedCount}
            <CheckCircle className="ml-2 text-green-400" size={20} />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Will be skipped
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Missing Figures</div>
          <div className="text-2xl font-semibold text-orange-600 dark:text-orange-400 flex items-center">
            {questionsWithMissingFigures.length}
            <ImageOff className="ml-2 text-orange-400" size={20} />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Need attachments
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">With Figures</div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center">
            {questionsWithAttachments.length}
            <Paperclip className="ml-2 text-gray-400" size={20} />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {totalAttachmentCount} total files
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Warnings</div>
          <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400 flex items-center">
            {warningCount}
            <AlertTriangle className="ml-2 text-amber-400" size={20} />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Errors</div>
          <div className="text-2xl font-semibold text-red-600 dark:text-red-400 flex items-center">
            {questionsWithErrors.length}
            <AlertCircle className="ml-2 text-red-400" size={20} />
          </div>
        </div>
      </div>

      {/* Smart Notification for Missing Figures */}
      {questionsWithMissingFigures.length > 0 && (
        <div className={`mb-6 p-4 rounded-lg border flex items-center justify-between ${
          !pdfDataUrl 
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
            : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
        }`}>
          <div className="flex items-center">
            {!pdfDataUrl ? (
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
            ) : (
              <ImageOff className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-3" />
            )}
            <div>
              <h4 className={`text-sm font-medium mb-1 ${
                !pdfDataUrl 
                  ? 'text-blue-800 dark:text-blue-300' 
                  : 'text-orange-800 dark:text-orange-300'
              }`}>
                {questionsWithMissingFigures.length} question{questionsWithMissingFigures.length > 1 ? 's' : ''} need figure attachments
              </h4>
              <p className={`text-sm ${
                !pdfDataUrl 
                  ? 'text-blue-700 dark:text-blue-400' 
                  : 'text-orange-700 dark:text-orange-400'
              }`}>
                {!pdfDataUrl 
                  ? 'Upload a PDF to start adding figure attachments using the snipping tool.'
                  : 'Click the "Snip" button on any question to add figure attachments.'}
              </p>
            </div>
          </div>
          {!pdfDataUrl && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload PDF
            </Button>
          )}
        </div>
      )}

      {/* Import Instructions */}
      <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Info className="text-gray-500 dark:text-gray-400 mt-0.5 mr-3" size={20} />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p className="font-medium mb-2">Import Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Review each question and verify the content is correct</li>
              <li>Map questions to the appropriate unit, topics, and subtopics</li>
              <li>Use the "Auto-map" button to automatically match based on text</li>
              <li>Click "Snip" to add visual attachments (automatically uploads PDF if needed)</li>
              <li>Questions requiring figures are marked with <ImageOff className="inline h-4 w-4 text-orange-600" /> icon</li>
              <li>Fix any validation errors (marked in red)</li>
              <li>Click "Confirm & Import" when ready to save to database</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onExpandAll}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
          >
            Expand All
          </button>
          <button
            onClick={onCollapseAll}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
          >
            Collapse All
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {confirmationStatus === 'ready' ? 
              `Ready to import ${questions.length - alreadyImportedCount} questions` : 
              confirmationStatus === 'incomplete' ? 
              'Please complete mapping for all questions' : 
              confirmationStatus}
          </span>
          <Button
            variant="outline"
            onClick={onPrevious}
          >
            Previous
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              // Check for validation issues
              const unmappedCount = questions.length - alreadyImportedCount - mappedQuestionsCount;
              const missingFiguresCount = questionsWithMissingFigures.length;
              const errorsCount = questionsWithErrors.length;
              
              if (unmappedCount > 0 || missingFiguresCount > 0 || errorsCount > 0) {
                // Build error message
                let errorMessages = [];
                
                if (unmappedCount > 0) {
                  errorMessages.push(`${unmappedCount} question${unmappedCount > 1 ? 's' : ''} need mapping to units/topics`);
                  // Highlight unmapped questions
                  questions.forEach(q => {
                    if (!mappings[q.id]?.chapter_id && !existingQuestionNumbers.has(parseInt(q.question_number))) {
                      // Scroll to first unmapped question
                      const element = document.getElementById(`question-${q.id}`);
                      if (element && errorMessages.length === 1) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        element.classList.add('ring-2', 'ring-red-500', 'ring-offset-2');
                        setTimeout(() => {
                          element.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2');
                        }, 3000);
                      }
                    }
                  });
                }
                
                if (missingFiguresCount > 0) {
                  errorMessages.push(`${missingFiguresCount} question${missingFiguresCount > 1 ? 's' : ''} need figure attachments`);
                }
                
                if (errorsCount > 0) {
                  errorMessages.push(`${errorsCount} question${errorsCount > 1 ? 's have' : ' has'} validation errors`);
                }
                
                // Show toast with all issues
                toast.error(errorMessages.join(', '));
                return;
              }
              
              // If all validations pass, proceed with import
              onImportConfirm();
            }}
            disabled={isImporting}
          >
            {isImporting ? 'Importing...' : 'Confirm & Import'}
          </Button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map(renderQuestion)}
      </div>
    </>
  );
}