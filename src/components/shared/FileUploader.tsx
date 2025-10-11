import React, { useState, useRef } from 'react';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface FileUploaderProps {
  accept?: string;
  onFileSelected: (file: File, content?: string | ArrayBuffer | null) => void;
  className?: string;
  maxSize?: number; // in MB
  readAsText?: boolean;
  buttonText?: string;
  disabled?: boolean;
}

export function FileUploader({
  accept,
  onFileSelected,
  className,
  maxSize = 10, // Default 10MB
  readAsText = false,
  buttonText = 'Select File',
  disabled = false
}: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size exceeds the ${maxSize}MB limit`);
      return false;
    }

    // Check file type if accept is specified
    if (accept) {
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const fileType = file.type;
      const fileExtension = `.${file.name.split('.').pop()}`;
      
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          // Check extension
          return fileExtension.toLowerCase() === type.toLowerCase();
        } else if (type.includes('*')) {
          // Handle wildcards like image/*
          const typePrefix = type.split('*')[0];
          return fileType.startsWith(typePrefix);
        } else {
          // Exact match
          return fileType === type;
        }
      });

      if (!isAccepted) {
        setError(`File type not accepted. Please upload ${accept}`);
        return false;
      }
    }

    setError(null);
    return true;
  };

  const processFile = (file: File) => {
    if (!validateFile(file)) return;

    setSelectedFile(file);

    if (readAsText) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onFileSelected(file, e.target?.result);
      };
      reader.onerror = () => {
        setError('Failed to read file');
      };
      reader.readAsText(file);
    } else {
      onFileSelected(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors",
          dragActive 
            ? "border-[#99C93B] bg-[#E8F5DC] dark:bg-[#5D7E23]/20" 
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={disabled ? undefined : handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />
        
        {selectedFile ? (
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg w-full">
            <File className="h-6 w-6 text-[#99C93B] dark:text-[#AAD775]" />
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              disabled={disabled}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 text-center">
              Drag and drop a file here, or click to select
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
              {accept ? `Accepted formats: ${accept}` : 'All file types accepted'}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleButtonClick}
              disabled={disabled}
            >
              {buttonText}
            </Button>
          </>
        )}
      </div>
      
      {error && (
        <div className="flex items-center text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-md">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}