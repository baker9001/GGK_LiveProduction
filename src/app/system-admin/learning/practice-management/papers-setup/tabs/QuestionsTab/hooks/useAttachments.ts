// src/app/system-admin/learning/practice-management/papers-setup/tabs/QuestionsTab/hooks/useAttachments.ts

/**
 * Custom hook for managing question attachments
 * Extracted from QuestionsTab.tsx to improve modularity and reduce file size
 */

import { useState, useCallback } from 'react';

export interface SimulationAttachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  source?: 'primary' | 'secondary';
  attachmentKey?: string;
  canDelete?: boolean;
  originalId?: string;
}

export interface AttachmentState {
  stagedAttachments: Record<string, any[]>;
  simulationAttachments: Record<string, SimulationAttachment[]>;
}

export interface UseAttachmentsReturn {
  stagedAttachments: Record<string, any[]>;
  simulationAttachments: Record<string, SimulationAttachment[]>;
  addAttachment: (key: string, attachment: any) => void;
  removeAttachment: (key: string, attachmentId: string) => void;
  updateAttachment: (key: string, attachmentId: string, updates: Partial<any>) => void;
  getAttachmentsForKey: (key: string) => any[];
  hasAttachments: (key: string) => boolean;
  clearAttachments: (key: string) => void;
  setSimulationAttachments: (key: string, attachments: SimulationAttachment[]) => void;
  getSimulationAttachmentsForKey: (key: string) => SimulationAttachment[];
}

/**
 * Generate standardized attachment key
 */
export const generateAttachmentKey = (
  questionId: string,
  partIndex?: number,
  subpartIndex?: number
): string => {
  let key = questionId;
  if (partIndex !== undefined) {
    key += `_p${partIndex}`;
  }
  if (subpartIndex !== undefined) {
    key += `_s${subpartIndex}`;
  }
  return key;
};

/**
 * Guess MIME type from file source
 */
export const guessMimeTypeFromSource = (source: string): string | undefined => {
  if (!source) {
    return undefined;
  }

  if (source.startsWith('data:')) {
    const mime = source.slice(5, source.indexOf(';'));
    return mime || undefined;
  }

  const extensionMatch = source.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  if (!extensionMatch) {
    return undefined;
  }

  const extension = extensionMatch[1].toLowerCase();
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };

  return mimeMap[extension];
};

/**
 * Derive file name from URL
 */
export const deriveFileNameFromUrl = (source: string): string | undefined => {
  if (!source || source.startsWith('data:')) {
    return undefined;
  }

  const cleaned = source.split('?')[0].split('#')[0];
  const segments = cleaned.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  return lastSegment ? decodeURIComponent(lastSegment) : undefined;
};

/**
 * Normalize attachment for simulation
 */
export const normalizeAttachmentForSimulation = (
  attachment: any,
  fallbackPrefix: string,
  index: number,
  options: {
    source?: 'primary' | 'secondary';
    attachmentKey?: string;
  } = {}
): SimulationAttachment | null => {
  if (!attachment) {
    return null;
  }

  const source = attachment.file_url || attachment.url || attachment.source || attachment.data_url;
  if (!source) {
    return null;
  }

  const mimeType = attachment.file_type ||
                   attachment.mime_type ||
                   guessMimeTypeFromSource(source);

  const fileName = attachment.file_name ||
                   attachment.name ||
                   deriveFileNameFromUrl(source) ||
                   `${fallbackPrefix}-${index + 1}`;

  return {
    id: attachment.id || `${fallbackPrefix}-${index}`,
    file_url: source,
    file_name: fileName,
    file_type: mimeType || 'application/octet-stream',
    source: options.source || 'primary',
    attachmentKey: options.attachmentKey,
    canDelete: true,
    originalId: attachment.id
  };
};

/**
 * Hook for managing attachments
 */
export function useAttachments(initialAttachments: Record<string, any[]> = {}): UseAttachmentsReturn {
  const [stagedAttachments, setStagedAttachments] = useState<Record<string, any[]>>(initialAttachments);
  const [simulationAttachments, setSimulationAttachmentsState] = useState<Record<string, SimulationAttachment[]>>({});

  const addAttachment = useCallback((key: string, attachment: any) => {
    setStagedAttachments(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), attachment]
    }));
  }, []);

  const removeAttachment = useCallback((key: string, attachmentId: string) => {
    setStagedAttachments(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter(att => att.id !== attachmentId)
    }));
  }, []);

  const updateAttachment = useCallback((key: string, attachmentId: string, updates: Partial<any>) => {
    setStagedAttachments(prev => ({
      ...prev,
      [key]: (prev[key] || []).map(att =>
        att.id === attachmentId ? { ...att, ...updates } : att
      )
    }));
  }, []);

  const getAttachmentsForKey = useCallback((key: string) => {
    return stagedAttachments[key] || [];
  }, [stagedAttachments]);

  const hasAttachments = useCallback((key: string) => {
    return (stagedAttachments[key] || []).length > 0;
  }, [stagedAttachments]);

  const clearAttachments = useCallback((key: string) => {
    setStagedAttachments(prev => {
      const newAttachments = { ...prev };
      delete newAttachments[key];
      return newAttachments;
    });
  }, []);

  const setSimulationAttachments = useCallback((key: string, attachments: SimulationAttachment[]) => {
    setSimulationAttachmentsState(prev => ({
      ...prev,
      [key]: attachments
    }));
  }, []);

  const getSimulationAttachmentsForKey = useCallback((key: string) => {
    return simulationAttachments[key] || [];
  }, [simulationAttachments]);

  return {
    stagedAttachments,
    simulationAttachments,
    addAttachment,
    removeAttachment,
    updateAttachment,
    getAttachmentsForKey,
    hasAttachments,
    clearAttachments,
    setSimulationAttachments,
    getSimulationAttachmentsForKey
  };
}
