import React from 'react';
import { Video, FileText, Book, Music, ClipboardList, Gamepad2, Check } from 'lucide-react';

export type MaterialType = 'video' | 'document' | 'ebook' | 'audio' | 'assignment' | 'interactive';

interface MaterialTypeOption {
  type: MaterialType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
  acceptedFormats: string;
  maxSize: string;
}

const MATERIAL_TYPE_OPTIONS: MaterialTypeOption[] = [
  {
    type: 'video',
    label: 'Video',
    description: 'Video lessons, tutorials, and recorded lectures',
    icon: <Video className="h-8 w-8" />,
    color: 'text-red-600 dark:text-red-400',
    bgGradient: 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20',
    acceptedFormats: 'MP4, WebM, MOV, AVI',
    maxSize: '500MB'
  },
  {
    type: 'document',
    label: 'Document',
    description: 'PDF files, Word docs, spreadsheets, and presentations',
    icon: <FileText className="h-8 w-8" />,
    color: 'text-blue-600 dark:text-blue-400',
    bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
    acceptedFormats: 'PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX',
    maxSize: '100MB'
  },
  {
    type: 'ebook',
    label: 'E-Book',
    description: 'Digital books, reading materials, and publications',
    icon: <Book className="h-8 w-8" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgGradient: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
    acceptedFormats: 'PDF, EPUB, MOBI',
    maxSize: '100MB'
  },
  {
    type: 'audio',
    label: 'Audio',
    description: 'Podcasts, audio lessons, and recordings',
    icon: <Music className="h-8 w-8" />,
    color: 'text-amber-600 dark:text-amber-400',
    bgGradient: 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20',
    acceptedFormats: 'MP3, WAV, OGG, M4A, AAC',
    maxSize: '100MB'
  },
  {
    type: 'assignment',
    label: 'Assignment',
    description: 'Worksheets, homework, and practice materials',
    icon: <ClipboardList className="h-8 w-8" />,
    color: 'text-violet-600 dark:text-violet-400',
    bgGradient: 'from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
    acceptedFormats: 'PDF, DOC, DOCX, TXT, XLS, XLSX',
    maxSize: '50MB'
  },
  {
    type: 'interactive',
    label: 'Interactive',
    description: 'HTML5 content, simulations, and interactive modules',
    icon: <Gamepad2 className="h-8 w-8" />,
    color: 'text-pink-600 dark:text-pink-400',
    bgGradient: 'from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20',
    acceptedFormats: 'HTML, ZIP, JSON',
    maxSize: '100MB'
  }
];

interface MaterialTypeSelectorProps {
  selectedType: MaterialType;
  onTypeChange: (type: MaterialType) => void;
  error?: string;
  disabled?: boolean;
}

export const MaterialTypeSelector: React.FC<MaterialTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
  error,
  disabled = false
}) => {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Material Type <span className="text-red-500">*</span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MATERIAL_TYPE_OPTIONS.map((option) => {
          const isSelected = selectedType === option.type;

          return (
            <button
              key={option.type}
              type="button"
              onClick={() => !disabled && onTypeChange(option.type)}
              disabled={disabled}
              className={`
                relative group p-4 rounded-xl border-2 text-left transition-all duration-200
                ${isSelected
                  ? `border-current bg-gradient-to-br ${option.bgGradient} ring-2 ring-offset-2 ring-current shadow-md`
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm bg-white dark:bg-gray-800'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              `}
              aria-pressed={isSelected}
              aria-label={`Select ${option.label} material type`}
            >
              {isSelected && (
                <div className={`absolute top-2 right-2 ${option.color}`}>
                  <Check className="h-5 w-5" />
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 ${option.color} ${isSelected ? '' : 'opacity-60 group-hover:opacity-100'} transition-opacity`}>
                  {option.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-base ${isSelected ? option.color : 'text-gray-900 dark:text-white'}`}>
                    {option.label}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {option.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {option.acceptedFormats.split(',').slice(0, 3).join(', ')}
                      {option.acceptedFormats.split(',').length > 3 && '...'}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      Max {option.maxSize}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default MaterialTypeSelector;
