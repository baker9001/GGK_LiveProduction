import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, FileText, Music, Video, Image as ImageIcon, File, BookOpen, Loader2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ProtectedVideoPlayer } from './ProtectedVideoPlayer';
import { WordDocumentViewer } from '../viewers/WordDocumentViewer';
import { EnhancedDocxViewer } from '../viewers/EnhancedDocxViewer';
import { ExcelViewer } from '../viewers/ExcelViewer';
import { EnhancedAudioPlayer } from '../viewers/EnhancedAudioPlayer';
import { PowerPointViewer } from '../viewers/PowerPointViewer';
import { EpubViewer } from '../viewers/EpubViewer';
import { detectFileType, getMimeTypeFromExtension } from '../../lib/utils/fileTypeDetector';
import { MaterialFileService } from '../../services/materialFileService';

// Configure PDF.js worker for version 5.x
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface MaterialPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileUrl: string;
  fileType: string;
  mimeType: string;
  materialId?: string;
}

export const MaterialPreview: React.FC<MaterialPreviewProps> = ({
  isOpen,
  onClose,
  title,
  fileUrl,
  fileType,
  mimeType,
  materialId
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [imageScale, setImageScale] = useState(1);
  const [pdfError, setPdfError] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const resolvedMimeType = useMemo(() => {
    if (mimeType && mimeType !== 'application/octet-stream') {
      return mimeType;
    }
    if (fileUrl) {
      const detectedMime = getMimeTypeFromExtension(fileUrl);
      if (detectedMime !== 'application/octet-stream') {
        return detectedMime;
      }
    }
    if (fileType === 'ebook') return 'application/pdf';
    if (fileType === 'video') return 'video/mp4';
    if (fileType === 'audio') return 'audio/mpeg';
    if (fileType === 'document') return 'application/pdf';
    return mimeType || 'application/octet-stream';
  }, [mimeType, fileUrl, fileType]);

  if (!isOpen) return null;

  useEffect(() => {
    if (isOpen) {
      setPageNumber(1);
      setScale(1.0);
      setRotation(0);
      setImageScale(1);
      setPdfError(false);
      setSignedUrl(null);
      setUrlError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const generateSignedUrl = async () => {
      if (!isOpen || !fileUrl) {
        return;
      }

      if (fileUrl.startsWith('http')) {
        setSignedUrl(fileUrl);
        return;
      }

      const detectedFileType = MaterialFileService.getFileTypeFromMimeType(resolvedMimeType);
      const needsSigned = MaterialFileService.needsSignedUrl(detectedFileType);

      const isPdfOrEbook = resolvedMimeType === 'application/pdf' ||
                          fileType === 'ebook' ||
                          fileType === 'document' ||
                          fileUrl.toLowerCase().endsWith('.pdf');

      if (!needsSigned && !isPdfOrEbook) {
        setSignedUrl(fileUrl);
        return;
      }

      try {
        setUrlLoading(true);
        setUrlError(null);
        const result = await MaterialFileService.getSignedUrl(fileUrl);
        if (!result.error && result.url) {
          setSignedUrl(result.url);
        } else {
          console.error('Error generating signed URL:', result.error);
          setUrlError(result.error || 'Failed to generate URL');
          setSignedUrl(null);
        }
      } catch (error) {
        console.error('Exception generating signed URL:', error);
        setUrlError(error instanceof Error ? error.message : 'Unknown error');
        setSignedUrl(null);
      } finally {
        setUrlLoading(false);
      }
    };

    generateSignedUrl();
  }, [isOpen, fileUrl, resolvedMimeType, fileType]);

  const getFileIcon = (size: 'sm' | 'lg' = 'lg') => {
    const sizeClass = size === 'sm' ? 'h-5 w-5' : 'h-16 w-16';
    if (fileType === 'video' || resolvedMimeType?.startsWith('video/')) return <Video className={sizeClass} />;
    if (fileType === 'audio' || resolvedMimeType?.startsWith('audio/')) return <Music className={sizeClass} />;
    if (fileType === 'ebook') return <BookOpen className={sizeClass} />;
    if (resolvedMimeType === 'application/pdf' || fileType === 'document') return <FileText className={sizeClass} />;
    if (resolvedMimeType?.startsWith('image/')) return <ImageIcon className={sizeClass} />;
    return <File className={sizeClass} />;
  };

  const getFileTypeLabel = () => {
    if (fileType === 'video' || resolvedMimeType?.startsWith('video/')) return 'Video';
    if (fileType === 'audio' || resolvedMimeType?.startsWith('audio/')) return 'Audio';
    if (fileType === 'ebook') return 'E-book';
    if (resolvedMimeType === 'application/pdf') return 'PDF Document';
    if (fileType === 'document') return 'Document';
    if (resolvedMimeType?.startsWith('image/')) return 'Image';
    return 'File';
  };

  const renderPreview = () => {
    if (urlLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading preview...</p>
        </div>
      );
    }

    if (urlError && !signedUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
          <div className="text-center p-8 max-w-md">
            <div className="mb-6 text-red-400">
              {getFileIcon()}
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              Preview Error
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Unable to load the file preview: {urlError}
            </p>
            {fileType !== 'video' && (
              <button
                onClick={() => MaterialFileService.downloadFile(fileUrl, title)}
                className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Instead
              </button>
            )}
          </div>
        </div>
      );
    }

    if (fileType === 'video' || resolvedMimeType?.startsWith('video/')) {
      if (!materialId) {
        return (
          <div className="flex items-center justify-center h-full bg-gray-900 text-white p-8">
            <p className="text-red-400">Error: Material ID is required for secure video playback</p>
          </div>
        );
      }

      return (
        <ProtectedVideoPlayer
          materialId={materialId}
          title={title}
          mimeType={resolvedMimeType}
          className="h-full"
        />
      );
    }

    if (fileType === 'audio' || resolvedMimeType?.startsWith('audio/')) {
      return (
        <EnhancedAudioPlayer
          fileUrl={signedUrl || fileUrl}
          title={title}
          mimeType={resolvedMimeType}
          autoPlay={false}
        />
      );
    }

    if (resolvedMimeType?.startsWith('image/')) {
      return (
        <div className="flex flex-col h-full">
          {/* Image Controls */}
          <div className="flex items-center justify-center p-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setImageScale(prev => Math.max(prev - 0.25, 0.5))}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium px-3">{Math.round(imageScale * 100)}%</span>
              <button
                onClick={() => setImageScale(prev => Math.min(prev + 0.25, 3))}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
              <button
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Rotate"
              >
                <RotateCw className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  setImageScale(1);
                  setRotation(0);
                }}
                className="px-3 py-1 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Reset"
              >
                Reset
              </button>
            </div>
          </div>
          {/* Image Display */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
            <img
              src={signedUrl || fileUrl}
              alt={title}
              className="max-w-full max-h-full object-contain transition-transform duration-300"
              style={{
                transform: `scale(${imageScale}) rotate(${rotation}deg)`,
              }}
              draggable={false}
            />
          </div>
        </div>
      );
    }

    if (resolvedMimeType === 'application/pdf' || fileType === 'ebook' || fileType === 'document' || fileUrl.toLowerCase().endsWith('.pdf')) {
      if (!signedUrl) {
        return (
          <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Preparing document...</p>
          </div>
        );
      }

      if (pdfError) {
        return (
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`}
            className="w-full h-full"
            frameBorder="0"
            title="PDF Viewer"
          />
        );
      }

      return (
        <div className="flex flex-col h-full">
          {/* PDF Controls */}
          <div className="flex items-center justify-between p-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                disabled={pageNumber <= 1}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <input
                type="number"
                min={1}
                max={numPages || 1}
                value={pageNumber}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value) && value >= 1 && value <= (numPages || 1)) {
                    setPageNumber(value);
                  }
                }}
                className="w-16 px-2 py-1 text-center border rounded dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm">of {numPages || '...'}</span>
              <button
                onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages || prev))}
                disabled={pageNumber >= (numPages || 1)}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setScale(prev => Math.max(prev - 0.25, 0.5))}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium px-2">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale(prev => Math.min(prev + 0.25, 2.5))}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Rotate"
              >
                <RotateCw className="h-5 w-5" />
              </button>
            </div>
          </div>
          {/* PDF Display */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
            <Document
              file={signedUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              onLoadError={(error) => {
                console.error('PDF load error:', error);
                setPdfError(true);
              }}
              loading={
                <div className="flex flex-col items-center justify-center p-8">
                  <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Loading PDF...</p>
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center p-8">
                  <p className="text-red-500">Failed to load PDF. Trying alternative viewer...</p>
                </div>
              }
              className="flex justify-center"
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-lg"
              />
            </Document>
          </div>
        </div>
      );
    }

    if (
      resolvedMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      resolvedMimeType === 'application/msword' ||
      resolvedMimeType === 'application/vnd.oasis.opendocument.text'
    ) {
      return (
        <EnhancedDocxViewer
          fileUrl={signedUrl || fileUrl}
          title={title}
          onError={(error) => console.error('DOCX viewer error:', error)}
        />
      );
    }

    if (
      resolvedMimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      resolvedMimeType === 'application/vnd.ms-excel' ||
      resolvedMimeType === 'application/vnd.oasis.opendocument.spreadsheet'
    ) {
      return (
        <ExcelViewer
          fileUrl={signedUrl || fileUrl}
          title={title}
          onError={(error) => console.error('Excel viewer error:', error)}
        />
      );
    }

    if (
      resolvedMimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      resolvedMimeType === 'application/vnd.ms-powerpoint' ||
      resolvedMimeType === 'application/vnd.oasis.opendocument.presentation'
    ) {
      return (
        <PowerPointViewer
          fileUrl={signedUrl || fileUrl}
          title={title}
          onError={(error) => console.error('PowerPoint viewer error:', error)}
        />
      );
    }

    if (
      resolvedMimeType === 'application/epub+zip' ||
      resolvedMimeType === 'application/x-mobipocket-ebook' ||
      resolvedMimeType === 'application/vnd.amazon.ebook' ||
      fileUrl.endsWith('.epub') ||
      fileUrl.endsWith('.mobi') ||
      fileUrl.endsWith('.azw') ||
      fileUrl.endsWith('.azw3')
    ) {
      return (
        <EpubViewer
          fileUrl={signedUrl || fileUrl}
          title={title}
          onError={(error) => console.error('EPUB viewer error:', error)}
        />
      );
    }

    if (resolvedMimeType?.startsWith('text/') ||
        resolvedMimeType === 'application/json' ||
        fileUrl.endsWith('.txt') ||
        fileUrl.endsWith('.json') ||
        fileUrl.endsWith('.csv') ||
        fileUrl.endsWith('.md')) {
      return (
        <div className="h-full bg-white dark:bg-gray-900">
          <iframe
            src={signedUrl || fileUrl}
            className="w-full h-full"
            frameBorder="0"
            title="Text Viewer"
            sandbox="allow-same-origin"
          />
        </div>
      );
    }

    if (fileType === 'assignment') {
      const extension = fileUrl.split('.').pop()?.toLowerCase();

      if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension || '')) {
        const urlToUse = signedUrl || fileUrl;
        return (
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(urlToUse)}&embedded=true`}
            className="w-full h-full"
            frameBorder="0"
            title="Document Viewer"
          />
        );
      }
    }

    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 max-w-md">
          <div className="mb-6 text-gray-400">
            {getFileIcon()}
          </div>
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            Preview not available
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This file type ({resolvedMimeType || fileType}) cannot be previewed directly in the browser.
          </p>
          {fileType !== 'video' && !resolvedMimeType?.startsWith('video/') ? (
            <div className="space-y-3">
              <button
                onClick={() => MaterialFileService.downloadFile(fileUrl, title)}
                className="inline-flex items-center justify-center w-full px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Download File
              </button>
            </div>
          ) : (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-700 dark:text-red-300 text-sm">
                Video content cannot be downloaded for security and copyright protection. Please use the streaming player to view this content.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="absolute inset-4 md:inset-8 lg:inset-12 bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-lg">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="text-gray-500 dark:text-gray-400 flex-shrink-0">
              {getFileIcon('sm')}
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="text-lg font-semibold truncate text-gray-900 dark:text-white">
                {title}
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {getFileTypeLabel()}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            {fileType !== 'video' && !resolvedMimeType?.startsWith('video/') && (
              <button
                onClick={() => MaterialFileService.downloadFile(fileUrl, title)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Download"
              >
                <Download className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Close"
            >
              <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900 rounded-b-lg">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

export default MaterialPreview;