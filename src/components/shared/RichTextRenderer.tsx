import React, { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { extractPlainText, sanitizeRichText } from '../../utils/richText';
import '../../styles/rich-text-editor.css';

interface RichTextRendererProps {
  value?: string | null;
  className?: string;
  emptyFallback?: React.ReactNode;
}

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({ value, className, emptyFallback = null }) => {
  const sanitized = useMemo(() => sanitizeRichText(value || ''), [value]);
  const plain = useMemo(() => extractPlainText(sanitized), [sanitized]);

  if (!plain) {
    return <>{emptyFallback}</>;
  }

  return (
    <div
      className={cn('rich-text-renderer', className)}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};

export default RichTextRenderer;
