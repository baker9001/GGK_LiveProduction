export interface FileTypeInfo {
  mimeType: string;
  category: 'video' | 'audio' | 'document' | 'image' | 'text' | 'archive' | 'other';
  extension: string;
  canPreview: boolean;
  viewerType: 'video' | 'audio' | 'pdf' | 'word' | 'excel' | 'powerpoint' | 'image' | 'text' | 'code' | 'generic';
}

const MIME_TYPE_MAP: Record<string, Omit<FileTypeInfo, 'extension'>> = {
  'video/mp4': { mimeType: 'video/mp4', category: 'video', canPreview: true, viewerType: 'video' },
  'video/webm': { mimeType: 'video/webm', category: 'video', canPreview: true, viewerType: 'video' },
  'video/ogg': { mimeType: 'video/ogg', category: 'video', canPreview: true, viewerType: 'video' },
  'video/quicktime': { mimeType: 'video/quicktime', category: 'video', canPreview: true, viewerType: 'video' },
  'video/x-msvideo': { mimeType: 'video/x-msvideo', category: 'video', canPreview: true, viewerType: 'video' },
  'video/x-ms-wmv': { mimeType: 'video/x-ms-wmv', category: 'video', canPreview: true, viewerType: 'video' },
  'video/x-flv': { mimeType: 'video/x-flv', category: 'video', canPreview: true, viewerType: 'video' },
  'video/x-matroska': { mimeType: 'video/x-matroska', category: 'video', canPreview: true, viewerType: 'video' },

  'audio/mpeg': { mimeType: 'audio/mpeg', category: 'audio', canPreview: true, viewerType: 'audio' },
  'audio/wav': { mimeType: 'audio/wav', category: 'audio', canPreview: true, viewerType: 'audio' },
  'audio/ogg': { mimeType: 'audio/ogg', category: 'audio', canPreview: true, viewerType: 'audio' },
  'audio/mp4': { mimeType: 'audio/mp4', category: 'audio', canPreview: true, viewerType: 'audio' },
  'audio/aac': { mimeType: 'audio/aac', category: 'audio', canPreview: true, viewerType: 'audio' },
  'audio/x-ms-wma': { mimeType: 'audio/x-ms-wma', category: 'audio', canPreview: true, viewerType: 'audio' },
  'audio/flac': { mimeType: 'audio/flac', category: 'audio', canPreview: true, viewerType: 'audio' },
  'audio/webm': { mimeType: 'audio/webm', category: 'audio', canPreview: true, viewerType: 'audio' },

  'application/pdf': { mimeType: 'application/pdf', category: 'document', canPreview: true, viewerType: 'pdf' },

  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'document', canPreview: true, viewerType: 'word' },
  'application/msword': { mimeType: 'application/msword', category: 'document', canPreview: true, viewerType: 'word' },

  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: 'document', canPreview: true, viewerType: 'excel' },
  'application/vnd.ms-excel': { mimeType: 'application/vnd.ms-excel', category: 'document', canPreview: true, viewerType: 'excel' },
  'text/csv': { mimeType: 'text/csv', category: 'text', canPreview: true, viewerType: 'text' },

  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', category: 'document', canPreview: true, viewerType: 'powerpoint' },
  'application/vnd.ms-powerpoint': { mimeType: 'application/vnd.ms-powerpoint', category: 'document', canPreview: true, viewerType: 'powerpoint' },

  'application/vnd.oasis.opendocument.text': { mimeType: 'application/vnd.oasis.opendocument.text', category: 'document', canPreview: true, viewerType: 'word' },
  'application/vnd.oasis.opendocument.spreadsheet': { mimeType: 'application/vnd.oasis.opendocument.spreadsheet', category: 'document', canPreview: true, viewerType: 'excel' },
  'application/vnd.oasis.opendocument.presentation': { mimeType: 'application/vnd.oasis.opendocument.presentation', category: 'document', canPreview: true, viewerType: 'powerpoint' },

  'image/jpeg': { mimeType: 'image/jpeg', category: 'image', canPreview: true, viewerType: 'image' },
  'image/png': { mimeType: 'image/png', category: 'image', canPreview: true, viewerType: 'image' },
  'image/gif': { mimeType: 'image/gif', category: 'image', canPreview: true, viewerType: 'image' },
  'image/webp': { mimeType: 'image/webp', category: 'image', canPreview: true, viewerType: 'image' },
  'image/svg+xml': { mimeType: 'image/svg+xml', category: 'image', canPreview: true, viewerType: 'image' },
  'image/bmp': { mimeType: 'image/bmp', category: 'image', canPreview: true, viewerType: 'image' },

  'text/plain': { mimeType: 'text/plain', category: 'text', canPreview: true, viewerType: 'text' },
  'text/html': { mimeType: 'text/html', category: 'text', canPreview: true, viewerType: 'code' },
  'text/css': { mimeType: 'text/css', category: 'text', canPreview: true, viewerType: 'code' },
  'text/javascript': { mimeType: 'text/javascript', category: 'text', canPreview: true, viewerType: 'code' },
  'application/javascript': { mimeType: 'application/javascript', category: 'text', canPreview: true, viewerType: 'code' },
  'application/json': { mimeType: 'application/json', category: 'text', canPreview: true, viewerType: 'code' },
  'text/markdown': { mimeType: 'text/markdown', category: 'text', canPreview: true, viewerType: 'text' },
  'text/xml': { mimeType: 'text/xml', category: 'text', canPreview: true, viewerType: 'code' },
  'application/xml': { mimeType: 'application/xml', category: 'text', canPreview: true, viewerType: 'code' },

  'application/epub+zip': { mimeType: 'application/epub+zip', category: 'document', canPreview: false, viewerType: 'generic' },
  'application/x-mobipocket-ebook': { mimeType: 'application/x-mobipocket-ebook', category: 'document', canPreview: false, viewerType: 'generic' },
  'application/vnd.amazon.ebook': { mimeType: 'application/vnd.amazon.ebook', category: 'document', canPreview: false, viewerType: 'generic' },

  'application/zip': { mimeType: 'application/zip', category: 'archive', canPreview: false, viewerType: 'generic' },
  'application/x-rar-compressed': { mimeType: 'application/x-rar-compressed', category: 'archive', canPreview: false, viewerType: 'generic' },
  'application/x-7z-compressed': { mimeType: 'application/x-7z-compressed', category: 'archive', canPreview: false, viewerType: 'generic' },
};

const EXTENSION_TO_MIME: Record<string, string> = {
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'ogg': 'video/ogg',
  'ogv': 'video/ogg',
  'mov': 'video/quicktime',
  'avi': 'video/x-msvideo',
  'wmv': 'video/x-ms-wmv',
  'flv': 'video/x-flv',
  'mkv': 'video/x-matroska',

  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'oga': 'audio/ogg',
  'm4a': 'audio/mp4',
  'aac': 'audio/aac',
  'wma': 'audio/x-ms-wma',
  'flac': 'audio/flac',

  'pdf': 'application/pdf',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'doc': 'application/msword',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'xls': 'application/vnd.ms-excel',
  'csv': 'text/csv',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'ppt': 'application/vnd.ms-powerpoint',
  'odt': 'application/vnd.oasis.opendocument.text',
  'ods': 'application/vnd.oasis.opendocument.spreadsheet',
  'odp': 'application/vnd.oasis.opendocument.presentation',

  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
  'bmp': 'image/bmp',
  'ico': 'image/x-icon',

  'txt': 'text/plain',
  'html': 'text/html',
  'htm': 'text/html',
  'css': 'text/css',
  'js': 'text/javascript',
  'json': 'application/json',
  'md': 'text/markdown',
  'xml': 'text/xml',

  'epub': 'application/epub+zip',
  'mobi': 'application/x-mobipocket-ebook',
  'azw': 'application/vnd.amazon.ebook',
  'azw3': 'application/vnd.amazon.ebook',

  'zip': 'application/zip',
  'rar': 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',
};

export function detectFileType(fileName: string, fileMimeType?: string): FileTypeInfo {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  let mimeType = fileMimeType || '';

  if (!mimeType && extension) {
    mimeType = EXTENSION_TO_MIME[extension] || 'application/octet-stream';
  }

  const typeInfo = MIME_TYPE_MAP[mimeType];

  if (typeInfo) {
    return {
      ...typeInfo,
      extension,
    };
  }

  if (mimeType.startsWith('video/')) {
    return {
      mimeType,
      category: 'video',
      extension,
      canPreview: true,
      viewerType: 'video',
    };
  }

  if (mimeType.startsWith('audio/')) {
    return {
      mimeType,
      category: 'audio',
      extension,
      canPreview: true,
      viewerType: 'audio',
    };
  }

  if (mimeType.startsWith('image/')) {
    return {
      mimeType,
      category: 'image',
      extension,
      canPreview: true,
      viewerType: 'image',
    };
  }

  if (mimeType.startsWith('text/')) {
    return {
      mimeType,
      category: 'text',
      extension,
      canPreview: true,
      viewerType: 'text',
    };
  }

  return {
    mimeType: mimeType || 'application/octet-stream',
    category: 'other',
    extension,
    canPreview: false,
    viewerType: 'generic',
  };
}

export function getMimeTypeFromExtension(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_TO_MIME[extension] || 'application/octet-stream';
}

export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

export function isAudioFile(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isDocumentFile(mimeType: string): boolean {
  return mimeType === 'application/pdf' ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('opendocument');
}

export function getFileIcon(mimeType: string): string {
  const typeInfo = MIME_TYPE_MAP[mimeType];

  if (!typeInfo) {
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.startsWith('image/')) return '🖼️';
    return '📄';
  }

  switch (typeInfo.viewerType) {
    case 'video': return '🎥';
    case 'audio': return '🎵';
    case 'image': return '🖼️';
    case 'pdf': return '📕';
    case 'word': return '📘';
    case 'excel': return '📊';
    case 'powerpoint': return '📽️';
    case 'code': return '💻';
    case 'text': return '📝';
    default: return '📄';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function validateFileType(file: File, acceptedTypes: string[]): { valid: boolean; error?: string } {
  const fileType = detectFileType(file.name, file.type);

  if (acceptedTypes.length === 0) {
    return { valid: true };
  }

  const isAccepted = acceptedTypes.some(type => {
    if (type === '*') return true;
    if (type.startsWith('.')) {
      return file.name.toLowerCase().endsWith(type.toLowerCase());
    }
    if (type.endsWith('/*')) {
      const category = type.split('/')[0];
      return fileType.mimeType.startsWith(category + '/');
    }
    return fileType.mimeType === type;
  });

  if (!isAccepted) {
    return {
      valid: false,
      error: `File type "${fileType.mimeType}" is not accepted. Please upload one of: ${acceptedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

export function getMaxFileSizeForType(materialType: string): number {
  switch (materialType) {
    case 'video':
      return 500 * 1024 * 1024;
    case 'audio':
      return 100 * 1024 * 1024;
    case 'ebook':
    case 'document':
      return 100 * 1024 * 1024;
    case 'assignment':
      return 50 * 1024 * 1024;
    default:
      return 100 * 1024 * 1024;
  }
}
