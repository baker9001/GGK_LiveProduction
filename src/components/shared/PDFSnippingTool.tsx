///home/project/src/components/shared/PDFSnippingTool.tsx

import React, { useState, useRef, useEffect } from 'react';
import { X, Scissors, Check, FileUp, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, AlertCircle, RotateCcw } from 'lucide-react';
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
  initialPage?: number;
  initialScale?: number;
  onViewStateChange?: (state: { page: number; scale: number }) => void;
  questionLabel?: string;
}

export function PDFSnippingTool({
  pdfUrl,
  onSnip,
  onClose,
  onLoadingChange,
  onErrorChange,
  className,
  initialPage,
  initialScale,
  onViewStateChange,
  questionLabel
}: PDFSnippingToolProps) {
  const DEFAULT_PAGE = 1;
  const DEFAULT_SCALE = 1.5;

  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(() => initialPage ?? DEFAULT_PAGE);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(() => initialScale ?? DEFAULT_SCALE);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfLoadingError, setPdfLoadingError] = useState(false);
  const [renderedPage, setRenderedPage] = useState<PDFPageProxy | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pageInputValue, setPageInputValue] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renderTaskRef = useRef<any>(null);
  const lastPdfUrlRef = useRef<string | null>(null);
  const initialViewStateRef = useRef<{ page: number; scale: number }>({
    page: initialPage ?? DEFAULT_PAGE,
    scale: initialScale ?? DEFAULT_SCALE
  });
  const hasAppliedInitialViewStateRef = useRef(false);
  const lastEmittedViewStateRef = useRef<{ page: number; scale: number } | null>(null);
  const isInternalUpdateRef = useRef(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);

  const clampPage = (value: number, total: number) => {
    if (!Number.isFinite(value)) {
      return DEFAULT_PAGE;
    }
    const rounded = Math.round(value);
    const upperBound = Math.max(total, DEFAULT_PAGE);
    return Math.min(Math.max(rounded, DEFAULT_PAGE), upperBound);
  };

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
        const desiredPage = clampPage(initialViewStateRef.current.page, pdf.numPages);
        setCurrentPage(desiredPage);
        setScale(initialViewStateRef.current.scale);
        hasAppliedInitialViewStateRef.current = true;

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
  
  // Load PDF from URL if provided - OPTIMIZED to prevent unnecessary re-fetches
  useEffect(() => {
    if (!pdfUrl) return;

    // Only reload if the URL actually changed
    if (lastPdfUrlRef.current === pdfUrl) {
      return;
    }

    lastPdfUrlRef.current = pdfUrl;
    initialViewStateRef.current = {
      page: initialPage ?? DEFAULT_PAGE,
      scale: initialScale ?? DEFAULT_SCALE
    };
    hasAppliedInitialViewStateRef.current = false;

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
  }, [pdfUrl]);

  // CONSOLIDATED view state management - prevents circular updates
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }

    if (!pdfDocument || !hasAppliedInitialViewStateRef.current || isInternalUpdateRef.current) {
      return;
    }

    // Clear any pending timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Only update if the initial props are significantly different from current state
    // This prevents circular updates when the component emits its own state changes
    const pageChanged = typeof initialPage === 'number' && initialPage !== currentPage;
    const scaleChanged = typeof initialScale === 'number' && Math.abs(initialScale - scale) > 0.001;

    // Don't update if values haven't changed
    if (!pageChanged && !scaleChanged) {
      return;
    }

    // Debounce external prop changes to prevent rapid updates
    updateTimeoutRef.current = setTimeout(() => {
      let needsUpdate = false;
      let newPage = currentPage;
      let newScale = scale;

      if (pageChanged) {
        const clamped = clampPage(initialPage!, totalPages || initialPage!);
        if (clamped !== currentPage) {
          newPage = clamped;
          needsUpdate = true;
        }
      }

      if (scaleChanged) {
        newScale = initialScale!;
        needsUpdate = true;
      }

      if (needsUpdate) {
        if (newPage !== currentPage) setCurrentPage(newPage);
        if (newScale !== scale) setScale(newScale);
      }

      updateTimeoutRef.current = null;
    }, 100);
  }, [initialPage, initialScale, pdfDocument, totalPages, currentPage, scale]);
  
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
    initialViewStateRef.current = { page: DEFAULT_PAGE, scale: DEFAULT_SCALE };
    hasAppliedInitialViewStateRef.current = false;
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
    // Get the canvas coordinates (accounting for canvas scaling)
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setStartPoint({ x, y });
    setIsSelecting(true);
    setSelectionRect(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !startPoint || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    // Get the canvas coordinates (accounting for canvas scaling)
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

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
    // Show success message if selection was made
    if (selectionRect && selectionRect.width > 0 && selectionRect.height > 0) {
      toast.success('Selection captured! Click "Capture Selection" to save.');
    }
  };
  
  // Handle page navigation
  const goToPreviousPage = () => {
    setCurrentPage(prev => {
      if (prev <= 1) {
        return prev;
      }
      setSelectionRect(null);
      return prev - 1;
    });
  };

  const goToNextPage = () => {
    setCurrentPage(prev => {
      if (prev >= totalPages) {
        return prev;
      }
      setSelectionRect(null);
      return prev + 1;
    });
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or numbers only
    if (value === '' || /^\d+$/.test(value)) {
      setPageInputValue(value);
    }
  };

  const handleGoToPage = () => {
    if (!pageInputValue || !totalPages) return;

    const pageNum = parseInt(pageInputValue, 10);

    if (isNaN(pageNum)) {
      toast.error('Please enter a valid page number');
      return;
    }

    if (pageNum < 1 || pageNum > totalPages) {
      toast.error(`Please enter a page number between 1 and ${totalPages}`);
      return;
    }

    setCurrentPage(pageNum);
    setSelectionRect(null);
    setPageInputValue('');
    toast.success(`Navigated to page ${pageNum}`);
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGoToPage();
    }
  };

  // Handle zoom
  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const resetView = () => {
    setSelectionRect(null);
    setScale(DEFAULT_SCALE);
    setCurrentPage(DEFAULT_PAGE);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      containerRef.current.scrollLeft = 0;
    }
  };

  // OPTIMIZED view state change emission - prevents circular updates
  useEffect(() => {
    if (!pdfDocument || !hasAppliedInitialViewStateRef.current) {
      return;
    }

    const nextState = { page: currentPage, scale };

    // Only emit if values actually changed
    if (
      !lastEmittedViewStateRef.current ||
      lastEmittedViewStateRef.current.page !== nextState.page ||
      Math.abs(lastEmittedViewStateRef.current.scale - nextState.scale) > 0.001
    ) {
      // Mark this as an internal update
      isInternalUpdateRef.current = true;

      lastEmittedViewStateRef.current = nextState;
      initialViewStateRef.current = nextState;

      // Emit the change
      if (onViewStateChange) {
        onViewStateChange(nextState);
      }

      // Reset the internal update flag after a brief delay
      const timer = setTimeout(() => {
        isInternalUpdateRef.current = false;
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [currentPage, scale, pdfDocument]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const isDefaultView = currentPage === DEFAULT_PAGE && Math.abs(scale - DEFAULT_SCALE) < 0.001;
  
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Scissors className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          <span>PDF Snipping Tool</span>
          {questionLabel && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
              {questionLabel}
            </span>
          )}
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

            {/* Go to Page Number */}
            <div className="flex items-center space-x-2 border-l border-gray-300 dark:border-gray-600 pl-4">
              <input
                type="text"
                value={pageInputValue}
                onChange={handlePageInputChange}
                onKeyDown={handlePageInputKeyDown}
                placeholder="Go to page..."
                disabled={isLoading || !pdfDocument}
                className="w-28 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                onFocus={(e) => e.target.select()}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleGoToPage}
                disabled={!pageInputValue || isLoading || !pdfDocument}
              >
                Go
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
              <Button
                size="sm"
                variant="ghost"
                onClick={resetView}
                disabled={isLoading || isDefaultView}
                leftIcon={<RotateCcw className="h-4 w-4" />}
              >
                Reset view
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