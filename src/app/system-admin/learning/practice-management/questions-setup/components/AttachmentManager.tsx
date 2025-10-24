// src/app/system-admin/learning/practice-management/questions-setup/components/AttachmentManager.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Image, 
  File, 
  Trash2, 
  Upload, 
  Eye, 
  Download,
  Loader2,
  X,
  Scissors,
  ChevronUp,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  RefreshCw,
  ZoomIn,
  Info
} from 'lucide-react';
import { Button } from '../../../../../../components/shared/Button';
import { PDFSnippingTool } from '../../../../../../components/shared/PDFSnippingTool';
import { cn } from '../../../../../../lib/utils';
import { useQuestionMutations } from '../hooks/useQuestionMutations';
import { Attachment } from '../page';
import { toast } from '../../../../../../components/shared/Toast';

interface AttachmentManagerProps {
  attachments: Attachment[];
  questionId?: string;
  subQuestionId?: string;
  onUpdate: () => void;
  readOnly?: boolean;
  questionDescription?: string; // To detect if figures are mentioned
}

// Global PDF storage to share across all attachment managers
const DEFAULT_SNIPPING_VIEW_STATE = { page: 1, scale: 1.5 } as const;

const globalPdfStorage = {
  dataUrl: null as string | null,
  fileName: null as string | null,
  loadedAt: null as Date | null,
  viewState: { ...DEFAULT_SNIPPING_VIEW_STATE }
};

export function AttachmentManager({
  attachments = [],
  questionId,
  subQuestionId,
  onUpdate,
  readOnly = false,
  questionDescription = ''
}: AttachmentManagerProps) {
  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showSnippingTool, setShowSnippingTool] = useState(false);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(globalPdfStorage.dataUrl);
  const [pdfFileName, setPdfFileName] = useState<string | null>(globalPdfStorage.fileName);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [recentSnips, setRecentSnips] = useState<string[]>([]);
  const [snippingViewState, setSnippingViewState] = useState<{ page: number; scale: number }>(
    () => ({ ...DEFAULT_SNIPPING_VIEW_STATE })
  );
  const [pendingSnippingOpen, setPendingSnippingOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  const { uploadAttachment, deleteAttachment } = useQuestionMutations();
  
  // Check if question mentions figures
  const needsFigure = useCallback(() => {
    const keywords = ['figure', 'diagram', 'graph', 'image', 'chart', 'picture', 'illustration'];
    return keywords.some(keyword => 
      questionDescription?.toLowerCase().includes(keyword)
    );
  }, [questionDescription]);
  
  // Sync with global PDF storage
  useEffect(() => {
    if (globalPdfStorage.dataUrl && !pdfDataUrl) {
      setPdfDataUrl(globalPdfStorage.dataUrl);
      setPdfFileName(globalPdfStorage.fileName);
      if (globalPdfStorage.viewState) {
        setSnippingViewState({ ...globalPdfStorage.viewState });
      }
    }
  }, []);
  
  // Auto-suggest snipping if figure is mentioned but no attachments
  useEffect(() => {
    if (needsFigure() && attachments.length === 0 && !readOnly) {
      // Just show a subtle hint, don't force action
      const timer = setTimeout(() => {
        if (attachments.length === 0) {
          // Subtle animation on the snip button
          const button = document.querySelector('[data-snip-button]');
          if (button) {
            button.classList.add('animate-pulse');
            setTimeout(() => button.classList.remove('animate-pulse'), 3000);
          }
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [needsFigure, attachments.length, readOnly]);
  
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />;
    return <File className="h-4 w-4" />;
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  // Drag and Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    
    const file = files[0];

    // Check if it's a PDF for snipping
    if (file.type === 'application/pdf') {
      setPendingSnippingOpen(true);
      handlePdfFile(file);
    } else {
      // Regular file upload
      await uploadFile(file);
    }
  };
  
  const uploadFile = async (file: File) => {
    setUploadingFile(true);
    
    try {
      await uploadAttachment.mutateAsync({
        file,
        questionId,
        subQuestionId
      });
      
      onUpdate();
      toast.success(`${file.name} uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    await uploadFile(file);
    
    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handlePdfFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Please select a valid PDF file');
      return;
    }

    setLoadingPdf(true);
    setSnippingViewState({ ...DEFAULT_SNIPPING_VIEW_STATE });

    // Convert PDF file to data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;

      // Store globally for reuse
      globalPdfStorage.dataUrl = dataUrl;
      globalPdfStorage.fileName = file.name;
      globalPdfStorage.loadedAt = new Date();
      globalPdfStorage.viewState = { ...DEFAULT_SNIPPING_VIEW_STATE };

      setPdfDataUrl(dataUrl);
      setPdfFileName(file.name);
      setLoadingPdf(false);

      // Auto-open snipping tool
      setShowSnippingTool(true);
      if (pendingSnippingOpen) {
        setPendingSnippingOpen(false);
      }
      
      toast.success(
        <div className="flex items-center">
          <FileCheck className="h-4 w-4 mr-2" />
          <span>PDF loaded! Draw rectangles to capture areas.</span>
        </div>
      );
    };
    reader.onerror = () => {
      toast.error('Failed to load PDF file');
      setLoadingPdf(false);
      setPendingSnippingOpen(false);
    };
    reader.readAsDataURL(file);
  };
  
  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPendingSnippingOpen(false);
      return;
    }

    handlePdfFile(file);

    // Clear the input for future selections
    if (pdfInputRef.current) {
      pdfInputRef.current.value = '';
    }
  };
  
  const handleSnippingComplete = useCallback(async (dataUrl: string, fileName: string) => {
    setUploadingFile(true);

    // Add to recent snips for quick preview
    setRecentSnips(prev => [dataUrl, ...prev.slice(0, 2)]);

    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Create a File object
      const file = new File([blob], fileName, {
        type: 'image/png',
        lastModified: Date.now()
      });

      // Upload the snipped image
      await uploadAttachment.mutateAsync({
        file: file,
        questionId,
        subQuestionId
      });

      onUpdate();

      // Success feedback with preview
      toast.success(
        <div className="flex items-center">
          <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
          <span>Snip added successfully!</span>
        </div>
      );

      // Keep tool open for multiple snips
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload snipped image');
    } finally {
      setUploadingFile(false);
    }
  }, [uploadAttachment, questionId, subQuestionId, onUpdate]);
  
  const handleDelete = async (attachment: Attachment) => {
    if (window.confirm('Are you sure you want to delete this attachment?')) {
      try {
        await deleteAttachment.mutateAsync({
          attachmentId: attachment.id,
          fileUrl: attachment.file_url
        });
        onUpdate();
        toast.success('Attachment deleted');
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete attachment');
      }
    }
  };
  
  const handlePreview = (attachment: Attachment) => {
    if (attachment.file_type.startsWith('image/')) {
      setPreviewUrl(attachment.file_url);
    } else {
      window.open(attachment.file_url, '_blank');
    }
  };
  
  const handleDownload = async (attachment: Attachment) => {
    try {
      const response = await fetch(attachment.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };
  
  const handleOpenSnippingTool = () => {
    if (!pdfDataUrl) {
      // No PDF loaded, open file selector
      toast.info('Select a PDF to start snipping');
      setPendingSnippingOpen(true);
      pdfInputRef.current?.click();
    } else {
      // PDF already loaded, toggle snipping tool
      setShowSnippingTool(!showSnippingTool);
    }
  };

  const handleChangePdf = () => {
    setPendingSnippingOpen(true);
    pdfInputRef.current?.click();
  };
  
  const handleClearPdf = () => {
    globalPdfStorage.dataUrl = null;
    globalPdfStorage.fileName = null;
    globalPdfStorage.loadedAt = null;
    globalPdfStorage.viewState = { ...DEFAULT_SNIPPING_VIEW_STATE };
    setPdfDataUrl(null);
    setPdfFileName(null);
    setShowSnippingTool(false);
    setSnippingViewState({ ...DEFAULT_SNIPPING_VIEW_STATE });
    toast.info('PDF cleared');
  };

  const handleSnippingViewStateChange = useCallback((state: { page: number; scale: number }) => {
    setSnippingViewState(state);
    globalPdfStorage.viewState = { ...state };
  }, []);

  const handleCloseSnippingTool = useCallback(() => {
    setShowSnippingTool(false);
  }, []);
  
  return (
    <div className="space-y-3">
      {/* Header with attachment count and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Attachments ({attachments.length})
          </h4>
          {needsFigure() && attachments.length === 0 && (
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              Figure needed
            </span>
          )}
        </div>
        
        {!readOnly && (
          <div className="flex items-center space-x-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              disabled={uploadingFile}
            />
            <input
              ref={pdfInputRef}
              type="file"
              onChange={handlePdfSelect}
              accept="application/pdf"
              className="hidden"
            />
            
            {/* PDF Status Indicator */}
            {pdfDataUrl && !showSnippingTool && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <FileCheck className="h-3 w-3 text-green-600 dark:text-green-400" />
                <span className="text-xs text-green-700 dark:text-green-300 max-w-[100px] truncate">
                  {pdfFileName || 'PDF loaded'}
                </span>
                <button
                  onClick={handleClearPdf}
                  className="ml-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                  title="Clear PDF"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {/* Main Snip Button */}
            <Button
              size="sm"
              variant={showSnippingTool ? "default" : needsFigure() && attachments.length === 0 ? "warning" : "outline"}
              onClick={handleOpenSnippingTool}
              disabled={uploadingFile || loadingPdf}
              data-snip-button
              leftIcon={
                loadingPdf ? 
                <Loader2 className="h-3 w-3 animate-spin" /> : 
                showSnippingTool ? 
                <ChevronUp className="h-3 w-3" /> :
                <Scissors className="h-3 w-3" />
              }
              className={cn(
                "transition-all",
                showSnippingTool 
                  ? "bg-blue-600 hover:bg-blue-700 text-white" 
                  : needsFigure() && attachments.length === 0
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              )}
              title={
                !pdfDataUrl 
                  ? "Click to select PDF and start snipping" 
                  : showSnippingTool 
                    ? "Hide snipping tool" 
                    : "Show snipping tool"
              }
            >
              {loadingPdf 
                ? 'Loading PDF...' 
                : showSnippingTool 
                  ? 'Hide Snipping' 
                  : pdfDataUrl
                    ? 'Snip from PDF'
                    : 'Snip from PDF'}
            </Button>
            
            {/* Upload File Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              leftIcon={uploadingFile ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {uploadingFile ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        )}
      </div>
      
      {/* Drag and Drop Zone (when no attachments) */}
      {!readOnly && attachments.length === 0 && !showSnippingTool && (
        <div
          ref={dropZoneRef}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-all",
            isDragging 
              ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20" 
              : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
          )}
        >
          <Upload className={cn(
            "h-8 w-8 mx-auto mb-2",
            isDragging ? "text-blue-500" : "text-gray-400"
          )} />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isDragging 
              ? "Drop files here..." 
              : "Drag & drop files here, or click buttons above"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            PDF files will open the snipping tool
          </p>
        </div>
      )}
      
      {/* Inline PDF Snipping Tool */}
      {showSnippingTool && pdfDataUrl && (
        <div className="border-2 border-blue-300 dark:border-blue-700 rounded-lg overflow-hidden animate-in slide-in-from-top-2 duration-300">
          {/* Tool Header */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-3 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Scissors className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    PDF Snipping Tool
                  </span>
                  {pdfFileName && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded">
                      {pdfFileName}
                    </span>
                  )}
                </div>
                
                {/* Recent snips indicator */}
                {recentSnips.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600 dark:text-green-400">
                      {recentSnips.length} snip{recentSnips.length > 1 ? 's' : ''} in session
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Quick Actions */}
                <button
                  onClick={handleChangePdf}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center space-x-1 px-2 py-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded"
                  title="Load different PDF"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Change PDF</span>
                </button>
                
                <button
                  onClick={handleCloseSnippingTool}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded"
                  title="Close snipping tool"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {/* Instructions */}
            <div className="mt-2 flex items-start space-x-2 text-xs text-blue-700 dark:text-blue-300">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>Click and drag to select areas. Use zoom controls for precision. Multiple snips allowed.</span>
            </div>

            {recentSnips.length > 0 && (
              <div className="mt-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md p-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-blue-800 dark:text-blue-200">Recent snips (session)</p>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400">Tap to preview</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {recentSnips.map((snip, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => window.open(snip, '_blank', 'noopener,noreferrer')}
                      className="relative flex-shrink-0 w-16 h-16 rounded-md border border-blue-200 dark:border-blue-700 overflow-hidden shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/70"
                      title={`Open snip ${index + 1} in new tab`}
                    >
                      <img
                        src={snip}
                        alt={`Recent snip ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PDF Snipping Tool Component */}
          <div className="bg-white dark:bg-gray-900" style={{ maxHeight: '600px' }}>
            <PDFSnippingTool
              pdfUrl={pdfDataUrl}
              onSnip={handleSnippingComplete}
              onClose={handleCloseSnippingTool}
              className="!shadow-none !rounded-none"
              initialPage={snippingViewState.page}
              initialScale={snippingViewState.scale}
              onViewStateChange={handleSnippingViewStateChange}
            />
          </div>
        </div>
      )}
      
      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group border border-gray-200 dark:border-gray-600 hover:shadow-sm transition-all"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {getFileIcon(attachment.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(attachment.file_size)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handlePreview(attachment)}
                  title="Preview"
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(attachment)}
                  title="Download"
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <Download className="h-4 w-4" />
                </Button>
                {!readOnly && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(attachment)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Inline Image Previews */}
      {attachments.filter(a => a.file_type.startsWith('image/')).length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Image Previews
            </h5>
            <button
              onClick={() => {
                const images = attachments.filter(a => a.file_type.startsWith('image/'));
                images.forEach(img => window.open(img.file_url, '_blank'));
              }}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center space-x-1"
            >
              <ZoomIn className="h-3 w-3" />
              <span>Open all</span>
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {attachments
              .filter(a => a.file_type.startsWith('image/'))
              .map((attachment) => (
                <div key={attachment.id} className="relative group">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden p-2">
                    <img 
                      src={attachment.file_url} 
                      alt={attachment.file_name}
                      className="w-full h-32 object-contain cursor-pointer"
                      onClick={() => handlePreview(attachment)}
                      loading="lazy"
                    />
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handlePreview(attachment)}
                        className="p-1 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="View Full Size"
                      >
                        <Eye size={14} />
                      </button>
                      {!readOnly && (
                        <button
                          onClick={() => handleDelete(attachment)}
                          className="p-1 bg-white dark:bg-gray-800 rounded shadow hover:bg-red-100 dark:hover:bg-red-900/20"
                          title="Delete"
                        >
                          <Trash2 size={14} className="text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                    {attachment.file_name}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
      
      {/* Image Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute top-4 right-4 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      
      {/* Help text */}
      {!readOnly && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center space-x-4">
          <span>Supported: Images, PDF, DOC • Max 10MB</span>
          {pdfDataUrl && (
            <span className="text-green-600 dark:text-green-400 flex items-center">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              PDF ready for snipping
            </span>
          )}
        </div>
      )}
    </div>
  );
}