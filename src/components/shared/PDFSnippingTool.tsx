///home/project/src/components/shared/PDFSnippingTool.tsx

import React, { useState, useRef, useEffect } from 'react';
import { X, Scissors, Download, Check, FileUp, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { toast } from './Toast';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

// Set the worker source to use the local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

interface PDFSnippingToolProps {
  pdfUrl?: string;
  onSnip: (dataUrl: string, fileName: string) => void;
  onClose: () => void;
  className?: string;
  onLoadingChange?: (loading: boolean) => void;
  onErrorChange?: (isError: boolean, message: string | null) => void;
}

export function PDFSnippingTool({
  pdfUrl,
  onSnip,
  onClose,
  onLoadingChange,
  onErrorChange,
  className
}: PDFSnippingToolProps) {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfLoadingError, setPdfLoadingError] = useState(false);
  const [renderedPage, setRenderedPage] = useState<PDFPageProxy | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renderTaskRef = useRef<any>(null);
  
  // Main PDF loading and rendering function
  const loadAndRenderPdf = async (source: string | ArrayBuffer) => {
    try {
      onLoadingChange?.(true);
      setIsLoading(true);
      setSelectionRect(null);
      setPdfLoadingError(false);
      setErrorMessage(null);
      
      // Load the PDF document
      try {
        const loadingTask = pdfjsLib.getDocument(source);
        const pdf = await loadingTask.promise;
        
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        
        onErrorChange?.(false, null);
        setIsLoading(false);
        onLoadingChange?.(false);
      } catch (pdfError) {
        console.error('Error loading PDF document:', pdfError);
        setErrorMessage('Failed to load PDF document');
        onErrorChange?.(true, 'Failed to load PDF document');
        throw pdfError;
      }
    } catch (error: any) {
      console.error('Error loading PDF:', error);
      setPdfLoadingError(true);
      
      // Check if it's an invalid PDF structure error
      if (error instanceof Error) {
        if (error.message.includes('Invalid PDF structure') ||
            error.message.includes('PDF header not found') ||
            error.message.includes('Invalid PDF') ||
            error.message.includes('corrupted') ||
            error.name === 'InvalidPDFException') {
          setErrorMessage('The uploaded file is not a valid PDF. Please upload a valid PDF to use the snipping tool.');
          onErrorChange?.(true, 'The uploaded file is not a valid PDF. Please upload a valid PDF to use the snipping tool.');
          toast.error('The uploaded file is not a valid PDF. Please upload a valid PDF to use the snipping tool.');
        } else if (error.message.includes('Failed to fetch') || 
                   error.message.includes('NetworkError')) {
          setErrorMessage('Unable to access PDF file. Please check your connection and try again.');
          onErrorChange?.(true, 'Unable to access PDF file. Please check your connection and try again.');
          toast.error('Unable to access PDF file. Please check your connection and try again.');
        } else if (error.message.includes('404') || 
                   error.message.includes('not found')) {
          setErrorMessage('PDF file not found in storage. Please upload again.');
          onErrorChange?.(true, 'PDF file not found in storage. Please upload again.');
          toast.error('PDF file not found in storage. Please upload again.');
        } else {
          setErrorMessage('Failed to load PDF document');
          onErrorChange?.(true, 'Failed to load PDF document');
          toast.error('Failed to load PDF document');
        }
      } else if (error && (
        error.message.includes('corrupted') ||
        error.name === 'InvalidPDFException'
      )) {
        setErrorMessage('The uploaded file is not a valid PDF. Please upload a valid PDF to use the snipping tool.');
        onErrorChange?.(true, 'The uploaded file is not a valid PDF. Please upload a valid PDF to use the snipping tool.');
        toast.error('The uploaded file is not a valid PDF. Please upload a valid PDF to use the snipping tool.');
      } else {
        setErrorMessage('Failed to load PDF document');
        onErrorChange?.(true, 'Failed to load PDF document');
        toast.error('Failed to load PDF document');
      }
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };
  
  // Load PDF from URL if provided
  useEffect(() => {
    if (pdfUrl) {
      const fetchAndLoadPdf = async () => {
        try {
          // Check if pdfUrl is a data URL or a regular URL
          if (pdfUrl.startsWith('data:')) {
            // For data URLs, convert to array buffer
            const base64 = pdfUrl.split(',')[1];
            if (!base64) {
              const errorMsg = 'Invalid PDF data format';
              setPdfLoadingError(true);
              setErrorMessage(errorMsg);
              onErrorChange?.(true, errorMsg);
              throw new Error(errorMsg);
            }
            
            try {
              const binaryString = window.atob(base64);
              
              // Check if the binary string has content
              if (binaryString.length === 0) {
                const errorMsg = 'PDF file is empty. Please upload a valid PDF.';
                setPdfLoadingError(true);
                setErrorMessage(errorMsg);
                onErrorChange?.(true, errorMsg);
                throw new Error(errorMsg);
              }
              
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              await loadAndRenderPdf(bytes.buffer);
            } catch (decodeError) {
              console.error('Error decoding data URL:', decodeError);
              const errorMsg = 'Failed to decode PDF data. The file may be corrupted.';
              setPdfLoadingError(true);
              setErrorMessage(errorMsg);
              onErrorChange?.(true, errorMsg);
              throw new Error(errorMsg);
            }
          } else {
            // For regular URLs, fetch the PDF
            try {
              const response = await fetch(pdfUrl, {
                method: 'GET',
                headers: {
                  'Accept': 'application/pdf'
                }
              });
              
              if (!response.ok) {
                if (response.status === 404) {
                  console.error(`PDF not found: ${response.status} ${response.statusText}`);
                  const errorMsg = 'PDF file not found in storage. Please upload again.';
                  setPdfLoadingError(true);
                  setErrorMessage(errorMsg);
                  onErrorChange?.(true, errorMsg);
                  throw new Error(errorMsg);
                } else {
                  console.error(`PDF fetch failed: ${response.status} ${response.statusText}`);
                  const errorMsg = `PDF file is not accessible (HTTP ${response.status}). Please upload again.`;
                  setPdfLoadingError(true);
                  setErrorMessage(errorMsg);
                  onErrorChange?.(true, errorMsg);
                  throw new Error(errorMsg);
                }
              }
              
              // Check if the response has content
              const contentLength = response.headers.get('content-length');
              if (contentLength === '0') {
                const errorMsg = 'PDF file is empty. Please upload a valid PDF.';
                setPdfLoadingError(true);
                setErrorMessage(errorMsg);
                onErrorChange?.(true, errorMsg);
                throw new Error(errorMsg);
              }
              
              const arrayBuffer = await response.arrayBuffer();
              
              // Verify the array buffer has content
              if (arrayBuffer.byteLength === 0) {
                const errorMsg = 'PDF file is empty. Please upload a valid PDF.';
                setPdfLoadingError(true);
                setErrorMessage(errorMsg);
                onErrorChange?.(true, errorMsg);
                throw new Error(errorMsg);
              }
              
              await loadAndRenderPdf(arrayBuffer);
            } catch (fetchError) {
              console.error('Network error fetching PDF:', fetchError);
              const errorMsg = 'Failed to fetch PDF file. Please check your connection and try again.';
              setPdfLoadingError(true);
              setErrorMessage(errorMsg);
              onErrorChange?.(true, errorMsg);
              throw new Error(errorMsg);
            }
          }
        } catch (error) {
          console.error('Error fetching PDF:', error);
          setPdfLoadingError(true);
          
          if (error instanceof Error) {
            // Check if it's a network error
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
              setErrorMessage('Unable to access PDF file. Please check your connection and try again.');
              onErrorChange?.(true, 'Unable to access PDF file. Please check your connection and try again.');
            } else if (error.message.includes('Invalid PDF structure') ||
                       error.message.includes('PDF header not found') ||
                       error.message.includes('Invalid PDF') ||
                       error.message.includes('corrupted')) {
              setErrorMessage('The uploaded file is not a valid PDF. Please upload a valid PDF to use the snipping tool.');
              onErrorChange?.(true, 'The uploaded file is not a valid PDF. Please upload a valid PDF to use the snipping tool.');
            } else if (error.message.includes('PDF file is empty')) {
              setErrorMessage('PDF file is empty. Please upload a valid PDF.');
              onErrorChange?.(true, 'PDF file is empty. Please upload a valid PDF.');
            } else if (error.message.includes('PDF file not found')) {
              setErrorMessage('PDF file not found in storage. Please upload again.');
              onErrorChange?.(true, 'PDF file not found in storage. Please upload again.');
            } else {
              setErrorMessage('Failed to load PDF file');
              onErrorChange?.(true, 'Failed to load PDF file');
            }
          } else {
            setErrorMessage('Failed to load PDF file');
            onErrorChange?.(true, 'Failed to load PDF file');
          }
          
          // Display the error message as a toast as well
          if (error instanceof Error) {
            toast.error(error.message);
          } else {
            toast.error('Failed to load PDF file');
          }
        }
      };
      
      fetchAndLoadPdf();
    }
  }, [pdfUrl]);
  
  // Render the current page
  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || isLoading) return;
    
    const renderPage = async () => {
      try {
        // Cancel any ongoing render task
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }
        
        // Get the page
        const page = await pdfDocument.getPage(currentPage);
        setRenderedPage(page);
        
        // Get the canvas context
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Get the viewport
        const viewport = page.getViewport({ scale });
        
        // Set canvas dimensions
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Render the page
        const renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };
        
        // Store the render task and await its completion
        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;
        renderTaskRef.current = null;
      } catch (error) {
        // Only handle errors that are not cancellation errors
        if (error && error.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', error);
          toast.error('Failed to render PDF page');
          setPdfLoadingError(true);
          setErrorMessage('Failed to render PDF page');
          onErrorChange?.(true, 'Failed to render PDF page');
        }
        renderTaskRef.current = null;
      }
    };
    
    renderPage();
    
    // Cleanup function to prevent memory leaks
    return () => {
      // Cancel any ongoing render task
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      
      if (renderedPage) {
        renderedPage.cleanup();
        setRenderedPage(null);
      }
    };
  }, [pdfDocument, currentPage, scale, isLoading]);
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onLoadingChange?.(true);
    // Reset error states
    setPdfLoadingError(false);
    setErrorMessage(null);
    onErrorChange?.(false, null);
    
    // Check if it's a PDF
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      setPdfLoadingError(true);
      setErrorMessage('Invalid file type. Please upload a PDF file.');
      onErrorChange?.(true, 'Invalid file type. Please upload a PDF file.');
      onLoadingChange?.(false);
      return;
    }
    
    // Check file size (not empty)
    if (file.size === 0) {
      toast.error('PDF file is empty. Please upload a valid PDF.');
      setPdfLoadingError(true);
      setErrorMessage('PDF file is empty. Please upload a valid PDF.');
      onErrorChange?.(true, 'PDF file is empty. Please upload a valid PDF.');
      onLoadingChange?.(false);
      return;
    }
    
    // Check for reasonable file size (optional - prevent extremely large files)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('PDF file is too large. Please upload a file smaller than 50MB.');
      setPdfLoadingError(true);
      setErrorMessage('PDF file is too large. Please upload a file smaller than 50MB.');
      onErrorChange?.(true, 'PDF file is too large. Please upload a file smaller than 50MB.');
      onLoadingChange?.(false);
      return;
    }
    
    // Read the file
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result;
      try {
        if (!arrayBuffer) {
          throw new Error('Failed to read file');
        }
        
        if ((arrayBuffer as ArrayBuffer).byteLength === 0) {
          throw new Error('PDF file is empty');
        }

        loadAndRenderPdf(arrayBuffer as ArrayBuffer);
      } catch (error) {
        console.error('Error processing file:', error);
        setErrorMessage('Failed to read PDF file. Please try again.');
        setPdfLoadingError(true);
        onErrorChange?.(true, 'Failed to read PDF file. Please try again.');
        onLoadingChange?.(false);
        toast.error(error instanceof Error ? error.message : 'Failed to read PDF file. Please try again.');
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read the PDF file');
      setPdfLoadingError(true);
      onErrorChange?.(true, 'Failed to read the PDF file');
      onLoadingChange?.(false);
      toast.error('Failed to read the PDF file');
    };
    reader.readAsArrayBuffer(file);
  };
  
  // Handle mouse events for selection
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
  
  // Handle page navigation
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setSelectionRect(null);
    }
  };
  
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      setSelectionRect(null);
    }
  };
  
  // Handle zoom
  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };
  
  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };
  
  // Capture the selection as an image
  const captureSelection = () => {
    if (!selectionRect || !canvasRef.current) {
      toast.error('Please select an area to capture');
      return;
    }
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = selectionRect.width;
      canvas.height = selectionRect.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        toast.error('Failed to create canvas context');
        return;
      }
      
      // Draw the selected portion of the original canvas onto the new canvas
      ctx.drawImage(
        canvasRef.current,
        selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height,
        0, 0, selectionRect.width, selectionRect.height
      );
      
      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png');
      
      // Generate a filename
      const fileName = `snip-page${currentPage}-${Date.now()}.png`;
      
      // Call the onSnip callback
      onSnip(dataUrl, fileName);
    } catch (error) {
      console.error('Error capturing selection:', error);
      toast.error('Failed to capture selection');
    }
  };
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
          <Scissors className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
          PDF Snipping Tool
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {/* Toolbar - Only show if PDF is loaded */}
      {pdfDocument && !pdfLoadingError && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={goToPreviousPage}
                disabled={currentPage <= 1 || isLoading}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={goToNextPage}
                disabled={currentPage >= totalPages || isLoading}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={zoomOut}
                disabled={scale <= 0.5 || isLoading}
                leftIcon={<ZoomOut className="h-4 w-4" />}
              >
                -
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {Math.round(scale * 100)}%
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={zoomIn}
                disabled={scale >= 3 || isLoading}
                leftIcon={<ZoomIn className="h-4 w-4" />}
              >
                +
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* PDF Upload Button */}
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              size="sm"
              variant="outline"
              leftIcon={<FileUp className="h-4 w-4" />}
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              Upload PDF
            </Button>
            
            <Button
              size="sm"
              leftIcon={<Check className="h-4 w-4" />}
              onClick={captureSelection}
              disabled={!selectionRect || isLoading}
            >
              Capture Selection
            </Button>
          </div>
        </div>
      )}
      
      {/* PDF Viewer */}
      <div 
        ref={containerRef}
        className="relative overflow-auto bg-gray-100 dark:bg-gray-900"
        style={{ height: '70vh' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-12 w-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
            <p className="ml-4 text-gray-600 dark:text-gray-400">Loading PDF...</p>
          </div>
        ) : !pdfDocument || pdfLoadingError ? (
          <div className="flex flex-col items-center justify-center h-full">
            {pdfLoadingError ? (
              <AlertCircle className="h-16 w-16 text-red-400 dark:text-red-500 mb-4" />
            ) : (
              <FileUp className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
            )}
            <div className="text-center mb-4">
              <p className={`${pdfLoadingError ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'} mb-2`}>
                {pdfLoadingError 
                  ? (errorMessage || 'PDF file could not be loaded. Please upload a valid PDF file.')
                  : 'No PDF loaded. Please upload a PDF file.'}
              </p>
              {pdfLoadingError && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Try uploading the file again or check that it's a valid PDF document.
                </p>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<FileUp className="h-4 w-4" />}
              variant={pdfLoadingError ? "default" : "outline"}
            >
              {pdfLoadingError ? 'Try Again' : 'Upload PDF'}
            </Button>
          </div>
        ) : (
          <div className="flex justify-center p-4">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="border border-gray-300 dark:border-gray-700 shadow-md"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              
              {selectionRect && (
                <div
                  ref={selectionRef}
                  className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-10 pointer-events-none"
                  style={{
                    left: `${selectionRect.x}px`,
                    top: `${selectionRect.y}px`,
                    width: `${selectionRect.width}px`,
                    height: `${selectionRect.height}px`
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Instructions - Only show if PDF is loaded */}
      {pdfDocument && !pdfLoadingError && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Click and drag to select an area of the PDF to capture. Use the zoom controls to adjust the view.
          </p>
        </div>
      )}
    </div>
  );
}