import React, { useState, useCallback, useRef } from 'react';
import { Upload, File, X, AlertCircle, Check, FileVideo, FileAudio, FileText, Image, FileSpreadsheet, Presentation, Loader2 } from 'lucide-react';
import { formatFileSize } from '../../lib/utils/fileTypeDetector';

interface DragDropFileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[];
  maxSize?: number;
  selectedFile?: File | null;
  onClear?: () => void;
  error?: string;
  disabled?: boolean;
  materialType?: string;
  existingFileName?: string;
}

const getFileIcon = (file: File | null, materialType?: string) => {
  if (!file && !materialType) return <Upload className="h-12 w-12" />;

  const type = file?.type || '';
  const name = file?.name?.toLowerCase() || '';

  if (type.startsWith('video/') || materialType === 'video') {
    return <FileVideo className="h-12 w-12" />;
  }
  if (type.startsWith('audio/') || materialType === 'audio') {
    return <FileAudio className="h-12 w-12" />;
  }
  if (type.startsWith('image/')) {
    return <Image className="h-12 w-12" />;
  }
  if (type.includes('spreadsheet') || name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
    return <FileSpreadsheet className="h-12 w-12" />;
  }
  if (type.includes('presentation') || name.endsWith('.pptx') || name.endsWith('.ppt')) {
    return <Presentation className="h-12 w-12" />;
  }
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return <FileText className="h-12 w-12" />;
  }
  if (file) {
    return <File className="h-12 w-12" />;
  }
  return <Upload className="h-12 w-12" />;
};

const getAcceptString = (types?: string[]): string => {
  if (!types || types.length === 0) return '*';
  return types.join(',');
};

export const DragDropFileUpload: React.FC<DragDropFileUploadProps> = ({
  onFileSelect,
  acceptedTypes = [],
  maxSize,
  selectedFile,
  onClear,
  error,
  disabled = false,
  materialType,
  existingFileName
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    if (maxSize && file.size > maxSize) {
      return {
        valid: false,
        error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed (${formatFileSize(maxSize)})`
      };
    }

    if (acceptedTypes.length > 0) {
      const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return extension === type.toLowerCase();
        }
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', '/'));
        }
        return file.type === type;
      });

      if (!isAccepted) {
        return {
          valid: false,
          error: `File type "${extension}" is not supported for this material type`
        };
      }
    }

    return { valid: true };
  }, [maxSize, acceptedTypes]);

  const handleFile = useCallback(async (file: File) => {
    setIsValidating(true);
    setDragError(null);

    const validation = validateFile(file);

    if (!validation.valid) {
      setDragError(validation.error || 'Invalid file');
      setIsValidating(false);
      return;
    }

    onFileSelect(file);
    setIsValidating(false);
  }, [validateFile, onFileSelect]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
      setDragError(null);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as Node;
    if (!e.currentTarget.contains(relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFile]);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDragError(null);
    if (onClear) {
      onClear();
    }
  }, [onClear]);

  const displayError = dragError || error;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {existingFileName ? 'Replace File (Optional)' : 'File'} {!existingFileName && <span className="text-red-500">*</span>}
      </label>

      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900' : ''}
          ${isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
            : selectedFile
              ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10'
              : displayError
                ? 'border-red-400 bg-red-50 dark:bg-red-900/10'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptString(acceptedTypes)}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        {isValidating ? (
          <div className="flex flex-col items-center justify-center py-4">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Validating file...</p>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="text-emerald-600 dark:text-emerald-400 mb-3">
                {getFileIcon(selectedFile, materialType)}
              </div>
              <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5">
                <Check className="h-3 w-3 text-white" />
              </div>
            </div>
            <p className="font-medium text-gray-900 dark:text-white text-sm truncate max-w-full">
              {selectedFile.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formatFileSize(selectedFile.size)} - {selectedFile.type || 'Unknown type'}
            </p>
            {onClear && (
              <button
                type="button"
                onClick={handleClear}
                className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <X className="h-3 w-3" />
                Remove
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className={`mb-3 ${isDragging ? 'text-blue-500 scale-110' : 'text-gray-400 dark:text-gray-500'} transition-all`}>
              {getFileIcon(null, materialType)}
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isDragging ? 'Drop file here' : 'Drag & drop a file here'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              or <span className="text-blue-600 dark:text-blue-400 hover:underline">browse</span> to upload
            </p>
            {maxSize && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Max file size: {formatFileSize(maxSize)}
              </p>
            )}
            {existingFileName && (
              <div className="mt-3 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Current: <span className="font-medium">{existingFileName}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {isDragging && (
          <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl pointer-events-none flex items-center justify-center">
            <div className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
              Drop to upload
            </div>
          </div>
        )}
      </div>

      {displayError && (
        <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{displayError}</span>
        </div>
      )}

      {acceptedTypes.length > 0 && !selectedFile && !displayError && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Accepted formats: {acceptedTypes.map(t => t.replace('.', '').toUpperCase()).join(', ')}
        </p>
      )}
    </div>
  );
};

export default DragDropFileUpload;
