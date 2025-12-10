import React, { useState, useCallback, useRef } from 'react';
import { X, Upload, File, Trash2, Check, AlertCircle, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './Button';
import { CurriculumTreeSelector } from './CurriculumTreeSelector';
import { detectFileType, formatFileSize, getMaxFileSizeForType } from '../../lib/utils/fileTypeDetector';
import { MaterialType } from './MaterialTypeSelector';

interface FileQueueItem {
  id: string;
  file: File;
  title: string;
  detectedType: MaterialType;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  errorMessage?: string;
}

interface CurriculumSelection {
  dataStructureId: string | null;
  dataStructureName?: string;
  unitId: string | null;
  unitName?: string;
  topicId: string | null;
  topicName?: string;
  subtopicId: string | null;
  subtopicName?: string;
}

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (results: { success: number; failed: number }) => void;
  uploadHandler: (file: File, metadata: {
    title: string;
    type: MaterialType;
    dataStructureId: string;
    unitId?: string;
    topicId?: string;
    subtopicId?: string;
  }) => Promise<void>;
}

const detectMaterialType = (file: File): MaterialType => {
  const fileInfo = detectFileType(file.name, file.type);

  if (fileInfo.category === 'video') return 'video';
  if (fileInfo.category === 'audio') return 'audio';
  if (fileInfo.mimeType === 'application/pdf') return 'document';
  if (fileInfo.mimeType.includes('word') || fileInfo.mimeType.includes('document')) return 'document';
  if (fileInfo.mimeType.includes('spreadsheet') || fileInfo.mimeType.includes('excel')) return 'document';
  if (fileInfo.mimeType.includes('presentation') || fileInfo.mimeType.includes('powerpoint')) return 'document';
  if (fileInfo.mimeType === 'application/epub+zip' || fileInfo.extension === 'epub' || fileInfo.extension === 'mobi') return 'ebook';
  if (fileInfo.mimeType === 'application/zip' || fileInfo.mimeType.includes('html')) return 'interactive';
  if (fileInfo.category === 'text') return 'assignment';

  return 'document';
};

const generateTitleFromFileName = (fileName: string): string => {
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  return nameWithoutExt
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
  uploadHandler
}) => {
  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
  const [curriculumSelection, setCurriculumSelection] = useState<CurriculumSelection>({
    dataStructureId: null,
    unitId: null,
    topicId: null,
    subtopicId: null
  });
  const [isUploading, setIsUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [defaultStatus] = useState<'active' | 'inactive'>('active');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = useCallback((files: FileList | null) => {
    if (!files) return;

    const newItems: FileQueueItem[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      title: generateTitleFromFileName(file.name),
      detectedType: detectMaterialType(file),
      status: 'pending' as const,
      progress: 0
    }));

    setFileQueue(prev => [...prev, ...newItems]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFilesSelected(e.dataTransfer.files);
  }, [handleFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removeFile = useCallback((id: string) => {
    setFileQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateFileTitle = useCallback((id: string, title: string) => {
    setFileQueue(prev => prev.map(item =>
      item.id === id ? { ...item, title } : item
    ));
  }, []);

  const updateFileType = useCallback((id: string, type: MaterialType) => {
    setFileQueue(prev => prev.map(item =>
      item.id === id ? { ...item, detectedType: type } : item
    ));
  }, []);

  const retryFile = useCallback((id: string) => {
    setFileQueue(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'pending', progress: 0, errorMessage: undefined } : item
    ));
  }, []);

  const startUpload = useCallback(async () => {
    if (!curriculumSelection.dataStructureId) {
      return;
    }

    const pendingFiles = fileQueue.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    let successCount = 0;
    let failedCount = 0;

    for (const item of pendingFiles) {
      setFileQueue(prev => prev.map(f =>
        f.id === item.id ? { ...f, status: 'uploading', progress: 10 } : f
      ));

      try {
        await uploadHandler(item.file, {
          title: item.title,
          type: item.detectedType,
          dataStructureId: curriculumSelection.dataStructureId,
          unitId: curriculumSelection.unitId || undefined,
          topicId: curriculumSelection.topicId || undefined,
          subtopicId: curriculumSelection.subtopicId || undefined
        });

        setFileQueue(prev => prev.map(f =>
          f.id === item.id ? { ...f, status: 'success', progress: 100 } : f
        ));
        successCount++;
      } catch (error) {
        setFileQueue(prev => prev.map(f =>
          f.id === item.id
            ? { ...f, status: 'error', progress: 0, errorMessage: error instanceof Error ? error.message : 'Upload failed' }
            : f
        ));
        failedCount++;
      }
    }

    setIsUploading(false);
    onUploadComplete({ success: successCount, failed: failedCount });
  }, [curriculumSelection, fileQueue, uploadHandler, onUploadComplete]);

  const handleClose = useCallback(() => {
    if (!isUploading) {
      setFileQueue([]);
      setCurriculumSelection({
        dataStructureId: null,
        unitId: null,
        topicId: null,
        subtopicId: null
      });
      onClose();
    }
  }, [isUploading, onClose]);

  const pendingCount = fileQueue.filter(f => f.status === 'pending').length;
  const successCount = fileQueue.filter(f => f.status === 'success').length;
  const errorCount = fileQueue.filter(f => f.status === 'error').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="absolute inset-4 md:inset-8 lg:inset-12 xl:inset-20 bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Bulk Upload Materials</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Upload multiple files at once with shared curriculum location
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Curriculum Selection */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                1. Select Curriculum Location (Required)
              </h3>
              <CurriculumTreeSelector
                value={curriculumSelection}
                onChange={setCurriculumSelection}
                disabled={isUploading}
                error={fileQueue.length > 0 && !curriculumSelection.dataStructureId ? 'Please select a curriculum location' : undefined}
              />

              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              >
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Advanced Options
              </button>

              {showAdvanced && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    All uploaded materials will share the selected curriculum location.
                    You can edit individual material details after upload.
                  </p>
                </div>
              )}
            </div>

            {/* Right: File Queue */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                2. Add Files to Upload
              </h3>

              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                  ${isUploading
                    ? 'border-gray-300 bg-gray-50 cursor-not-allowed opacity-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/10'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="hidden"
                  disabled={isUploading}
                />
                <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Drop files here or click to browse
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Support for videos, documents, audio, and more
                </p>
              </div>

              {/* File List */}
              {fileQueue.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {fileQueue.length} file{fileQueue.length !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      {pendingCount > 0 && (
                        <span className="text-gray-500">{pendingCount} pending</span>
                      )}
                      {successCount > 0 && (
                        <span className="text-emerald-600">{successCount} uploaded</span>
                      )}
                      {errorCount > 0 && (
                        <span className="text-red-600">{errorCount} failed</span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-64 overflow-auto divide-y divide-gray-200 dark:divide-gray-700">
                    {fileQueue.map(item => (
                      <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                        <div className={`
                          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                          ${item.status === 'success'
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : item.status === 'error'
                              ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                              : item.status === 'uploading'
                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                          }
                        `}>
                          {item.status === 'success' ? (
                            <Check className="h-4 w-4" />
                          ) : item.status === 'error' ? (
                            <AlertCircle className="h-4 w-4" />
                          ) : item.status === 'uploading' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <File className="h-4 w-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {item.status === 'pending' ? (
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => updateFileTitle(item.id, e.target.value)}
                              className="w-full text-sm font-medium bg-transparent border-0 border-b border-dashed border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-0 px-0 py-0.5 text-gray-900 dark:text-white"
                              disabled={isUploading}
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {item.title}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatFileSize(item.file.size)}
                            </span>
                            {item.status === 'pending' ? (
                              <select
                                value={item.detectedType}
                                onChange={(e) => updateFileType(item.id, e.target.value as MaterialType)}
                                className="text-xs bg-gray-100 dark:bg-gray-700 border-0 rounded px-1.5 py-0.5 text-gray-700 dark:text-gray-300"
                                disabled={isUploading}
                              >
                                <option value="video">Video</option>
                                <option value="document">Document</option>
                                <option value="ebook">E-book</option>
                                <option value="audio">Audio</option>
                                <option value="assignment">Assignment</option>
                                <option value="interactive">Interactive</option>
                              </select>
                            ) : (
                              <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400 capitalize">
                                {item.detectedType}
                              </span>
                            )}
                          </div>
                          {item.errorMessage && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {item.errorMessage}
                            </p>
                          )}
                        </div>

                        <div className="flex-shrink-0">
                          {item.status === 'pending' && (
                            <button
                              onClick={() => removeFile(item.id)}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500"
                              disabled={isUploading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          {item.status === 'error' && (
                            <button
                              onClick={() => retryFile(item.id)}
                              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded text-blue-500"
                              disabled={isUploading}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {isUploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading files...
              </span>
            ) : pendingCount > 0 ? (
              `${pendingCount} file${pendingCount !== 1 ? 's' : ''} ready to upload`
            ) : (
              'Add files to begin'
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={isUploading}
            >
              {successCount > 0 || errorCount > 0 ? 'Close' : 'Cancel'}
            </Button>

            <Button
              onClick={startUpload}
              disabled={isUploading || pendingCount === 0 || !curriculumSelection.dataStructureId}
              leftIcon={isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            >
              {isUploading ? 'Uploading...' : `Upload ${pendingCount} File${pendingCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadModal;
