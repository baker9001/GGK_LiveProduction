import React, { useState, useEffect } from 'react';
import { X, File, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { detectFileType, formatFileSize, getFileIcon } from '../../lib/utils/fileTypeDetector';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onConfirm: () => void;
  maxFileSize?: number;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  file,
  onConfirm,
  maxFileSize,
}) => {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<ReturnType<typeof detectFileType> | null>(null);
  const [validation, setValidation] = useState<{
    sizeValid: boolean;
    typeValid: boolean;
    previewable: boolean;
  }>({ sizeValid: true, typeValid: true, previewable: false });

  // Register this modal as a portal so the parent SlideInForm doesn't close when clicking inside it
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Register with the global portal system (used by SlideInForm)
      const registerPortal = (window as any).__registerSlideInFormPortal;
      if (registerPortal && typeof registerPortal === 'function') {
        return registerPortal(modalRef.current);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setFileInfo(null);
      return;
    }

    const info = detectFileType(file.name, file.type);
    setFileInfo(info);

    const sizeValid = !maxFileSize || file.size <= maxFileSize;
    setValidation({
      sizeValid,
      typeValid: true,
      previewable: info.canPreview,
    });

    if (info.category === 'image') {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (info.category === 'video') {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (info.category === 'audio') {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (info.mimeType === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (info.category === 'text') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsText(file);
    }

    return () => {
      setPreviewUrl(null);
    };
  }, [file, maxFileSize, isOpen]);

  if (!isOpen || !file) return null;

  const renderPreview = () => {
    if (!fileInfo) return null;

    if (!validation.previewable) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-6xl mb-4">{getFileIcon(fileInfo.mimeType)}</div>
          <p className="text-gray-600 dark:text-gray-400">
            Preview not available for this file type
          </p>
        </div>
      );
    }

    if (fileInfo.category === 'image' && previewUrl) {
      return (
        <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-96 object-contain rounded"
          />
        </div>
      );
    }

    if (fileInfo.category === 'video' && previewUrl) {
      return (
        <div className="bg-black rounded-lg">
          <video
            src={previewUrl}
            controls
            className="w-full max-h-96 rounded-lg"
            preload="metadata"
          >
            Your browser does not support video preview.
          </video>
        </div>
      );
    }

    if (fileInfo.category === 'audio' && previewUrl) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-32 h-32 mb-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
            <span className="text-6xl">🎵</span>
          </div>
          <audio
            src={previewUrl}
            controls
            className="w-full max-w-md"
            controlsList="nodownload"
            preload="metadata"
          >
            Your browser does not support audio preview.
          </audio>
        </div>
      );
    }

    if (fileInfo.mimeType === 'application/pdf' && previewUrl) {
      return (
        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
          <iframe
            src={previewUrl}
            className="w-full h-96 rounded border-0"
            title="PDF Preview"
          />
        </div>
      );
    }

    if (fileInfo.category === 'text' && previewUrl && typeof previewUrl === 'string') {
      return (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-auto">
          <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono">
            {previewUrl.slice(0, 5000)}
            {previewUrl.length > 5000 && '...\n\n(Preview truncated)'}
          </pre>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-6xl mb-4">{getFileIcon(fileInfo.mimeType)}</div>
        <p className="text-gray-600 dark:text-gray-400">
          File ready for upload
        </p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div
        ref={modalRef}
        className="absolute inset-4 md:inset-8 lg:inset-12 xl:inset-24 bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            <File className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              File Preview
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Close"
          >
            <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              File Information
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                <p className="font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Size</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                <p className="font-medium text-gray-900 dark:text-white">{fileInfo?.mimeType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Category</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {fileInfo?.category}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              Validation
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {validation.sizeValid ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={validation.sizeValid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                  File size {validation.sizeValid ? 'is within limits' : 'exceeds maximum allowed'}
                  {maxFileSize && ` (max: ${formatFileSize(maxFileSize)})`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {validation.typeValid ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={validation.typeValid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                  File type is {validation.typeValid ? 'supported' : 'not supported'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              Preview
            </h3>
            {renderPreview()}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              console.log('[FilePreviewModal] Confirm clicked - adding file to form');
              onConfirm();
              onClose();
            }}
            disabled={!validation.sizeValid || !validation.typeValid}
            className="px-4 py-2 bg-[#8CC63F] text-white rounded-lg hover:bg-[#7AB52F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Confirm File Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
