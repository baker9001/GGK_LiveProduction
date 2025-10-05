import React, { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, FileText, Music, Video, Image as ImageIcon, File } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { ProtectedVideoPlayer } from './ProtectedVideoPlayer';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

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

  if (!isOpen) return null;

  // Reset states when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setPageNumber(1);
      setScale(1.0);
      setRotation(0);
      setImageScale(1);
      setPdfError(false);
    }
  }, [isOpen]);

  const getFileIcon = () => {
    if (fileType === 'video' || mimeType?.startsWith('video/')) return <Video className="h-16 w-16" />;
    if (fileType === 'audio' || mimeType?.startsWith('audio/')) return <Music className="h-16 w-16" />;
    if (fileType === 'ebook' || mimeType === 'application/pdf') return <FileText className="h-16 w-16" />;
    if (mimeType?.startsWith('image/')) return <ImageIcon className="h-16 w-16" />;
    return <File className="h-16 w-16" />;
  };

  const renderPreview = () => {
    // Video files - Use Protected Video Player
    if (fileType === 'video' || mimeType?.startsWith('video/')) {
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
          mimeType={mimeType}
          className="h-full"
        />
      );
    }

    // Audio files
    if (fileType === 'audio' || mimeType?.startsWith('audio/')) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-xl max-w-md w-full">
            <div className="mb-6">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                <Music className="h-16 w-16 text-white" />
              </div>
            </div>
            <h3 className="text-center text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {title}
            </h3>
            <audio 
              controls 
              className="w-full"
              controlsList="nodownload"
              autoPlay={false}
            >
              <source src={fileUrl} type={mimeType || 'audio/mpeg'} />
              Your browser does not support audio playback.
            </audio>
            <div className="mt-4 flex justify-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">Audio Player</span>
            </div>
          </div>
        </div>
      );
    }

    // Image files
    if (mimeType?.startsWith('image/')) {
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
              src={fileUrl} 
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

    // PDF files
    if (mimeType === 'application/pdf' || fileType === 'ebook') {
      if (pdfError) {
        // Fallback to Google Docs Viewer if react-pdf fails
        return (
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
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
              file={fileUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              onLoadError={(error) => {
                console.error('PDF load error:', error);
                setPdfError(true);
              }}
              loading={
                <div className="flex flex-col items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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

    // Microsoft Office documents (Word, Excel, PowerPoint)
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mimeType === 'application/vnd.ms-powerpoint'
    ) {
      // Use Microsoft Office Online Viewer
      const encodedUrl = encodeURIComponent(fileUrl);
      return (
        <div className="h-full flex flex-col">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b dark:border-gray-700">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Microsoft Office document preview powered by Office Online
            </p>
          </div>
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`}
            className="flex-1 w-full bg-white"
            frameBorder="0"
            title="Office Document Viewer"
          >
            This browser does not support Office document preview.
          </iframe>
        </div>
      );
    }

    // Text files (txt, json, csv, md, etc.)
    if (mimeType?.startsWith('text/') || 
        mimeType === 'application/json' || 
        fileUrl.endsWith('.txt') || 
        fileUrl.endsWith('.json') || 
        fileUrl.endsWith('.csv') || 
        fileUrl.endsWith('.md')) {
      return (
        <div className="h-full bg-white dark:bg-gray-900">
          <iframe
            src={fileUrl}
            className="w-full h-full"
            frameBorder="0"
            title="Text Viewer"
            sandbox="allow-same-origin"
          />
        </div>
      );
    }

    // Assignment type with no specific mime type
    if (fileType === 'assignment') {
      // Try to determine based on file extension
      const extension = fileUrl.split('.').pop()?.toLowerCase();
      
      // If it's a known document type, use Google Docs Viewer
      if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension || '')) {
        return (
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
            className="w-full h-full"
            frameBorder="0"
            title="Document Viewer"
          />
        );
      }
    }

    // Fallback for unsupported types
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
            This file type ({mimeType || fileType}) cannot be previewed directly in the browser.
          </p>
          <div className="space-y-3">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Open in New Tab
            </a>
            <a
              href={fileUrl}
              download
              className="inline-flex items-center justify-center w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Download File
            </a>
          </div>
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
            <div className="text-gray-500 dark:text-gray-400">
              {getFileIcon()}
            </div>
            <h2 className="text-lg font-semibold truncate text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            {/* Only show download button for non-video materials */}
            {fileType !== 'video' && !mimeType?.startsWith('video/') && (
              <a
                href={fileUrl}
                download
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Download"
              >
                <Download className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </a>
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