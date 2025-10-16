import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bold, Italic, Underline, Strikethrough, ListOrdered, List, Quote, Link, Code, Minus, Type } from 'lucide-react';
import { cn } from '../../lib/utils';
import { mergeRichTextChange, sanitizeRichText } from '../../utils/richText';
import '../../styles/rich-text-editor.css';

interface ToolbarButtonConfig {
  icon: React.ReactNode;
  label: string;
  command: () => void;
  isActive?: () => boolean;
}

export interface RichTextEditorProps {
  id?: string;
  value?: string | null;
  onChange?: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  readOnly?: boolean;
  className?: string;
}

const blockCommands: Array<{ label: string; value: string }> = [
  { label: 'Paragraph', value: 'p' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
  { label: 'Heading 4', value: 'h4' },
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  id,
  value = '',
  onChange,
  placeholder,
  minHeight = 160,
  readOnly = false,
  className,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [currentValue, setCurrentValue] = useState(() => sanitizeRichText(value));
  const [currentBlock, setCurrentBlock] = useState('p');

  useEffect(() => {
    const sanitized = sanitizeRichText(value);
    if (!isFocused && sanitized !== currentValue) {
      setCurrentValue(sanitized);
      if (editorRef.current && editorRef.current.innerHTML !== sanitized) {
        editorRef.current.innerHTML = sanitized;
      }
    }
  }, [value, isFocused, currentValue]);

  const applyFormat = useCallback((command: string, commandValue?: string) => {
    if (readOnly) return;
    document.execCommand(command, false, commandValue);
    editorRef.current?.focus({ preventScroll: true });
  }, [readOnly]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const updatedValue = mergeRichTextChange(editorRef.current.innerHTML);
    setCurrentValue(updatedValue);
    onChange?.(updatedValue);
  }, [onChange]);

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const clipboardData = event.clipboardData || window.clipboardData;
    const text = clipboardData?.getData('text/html') || clipboardData?.getData('text/plain') || '';
    const sanitized = sanitizeRichText(text);
    document.execCommand('insertHTML', false, sanitized);
  }, []);

  const toolbarButtons: ToolbarButtonConfig[] = useMemo(() => [
    {
      icon: <Bold className="h-4 w-4" />, label: 'Bold', command: () => applyFormat('bold'),
    },
    {
      icon: <Italic className="h-4 w-4" />, label: 'Italic', command: () => applyFormat('italic'),
    },
    {
      icon: <Underline className="h-4 w-4" />, label: 'Underline', command: () => applyFormat('underline'),
    },
    {
      icon: <Strikethrough className="h-4 w-4" />, label: 'Strikethrough', command: () => applyFormat('strikeThrough'),
    },
    {
      icon: <List className="h-4 w-4" />, label: 'Bulleted list', command: () => applyFormat('insertUnorderedList'),
    },
    {
      icon: <ListOrdered className="h-4 w-4" />, label: 'Numbered list', command: () => applyFormat('insertOrderedList'),
    },
    {
      icon: <Quote className="h-4 w-4" />, label: 'Quote', command: () => applyFormat('formatBlock', 'blockquote'),
    },
    {
      icon: <Code className="h-4 w-4" />, label: 'Code block', command: () => applyFormat('formatBlock', 'pre'),
    },
    {
      icon: <Link className="h-4 w-4" />,
      label: 'Insert link',
      command: () => {
        if (readOnly) return;
        const url = window.prompt('Enter URL');
        if (url) {
          applyFormat('createLink', url.trim());
        }
      },
    },
    {
      icon: <Minus className="h-4 w-4" />,
      label: 'Horizontal rule',
      command: () => applyFormat('insertHorizontalRule'),
    },
  ], [applyFormat, readOnly]);

  const handleBlockChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setCurrentBlock(value);
    applyFormat('formatBlock', value);
  }, [applyFormat]);

  const handleSelectionChange = useCallback(() => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const anchorNode = selection.anchorNode;
    if (!anchorNode) return;
    let element = anchorNode.nodeType === Node.ELEMENT_NODE
      ? (anchorNode as Element)
      : anchorNode.parentElement;
    while (element && element !== editorRef.current) {
      const tag = element.tagName.toLowerCase();
      if (blockCommands.some(command => command.value === tag)) {
        setCurrentBlock(tag);
        return;
      }
      element = element.parentElement;
    }
    setCurrentBlock('p');
  }, []);

  useEffect(() => {
    if (readOnly) return;
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange, readOnly]);

  return (
    <div className={cn('rich-text-editor', readOnly && 'pointer-events-none opacity-90', className)}>
      <div className="rich-text-editor__toolbar">
        <div className="rich-text-editor__block-select">
          <Type className="h-3.5 w-3.5 text-gray-500" />
          <select value={currentBlock} onChange={handleBlockChange} aria-label="Select text style" disabled={readOnly}>
            {blockCommands.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="rich-text-editor__toolbar-buttons">
          {toolbarButtons.map(button => (
            <button
              key={button.label}
              type="button"
              className="rich-text-editor__toolbar-button"
              onClick={button.command}
              title={button.label}
              aria-label={button.label}
              disabled={readOnly}
            >
              {button.icon}
            </button>
          ))}
        </div>
      </div>
      <div
        id={id}
        ref={editorRef}
        className="rich-text-editor__content"
        contentEditable={!readOnly}
        data-placeholder={placeholder}
        style={{ minHeight }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onInput={handleInput}
        onPaste={handlePaste}
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: currentValue }}
      />
    </div>
  );
};

export default RichTextEditor;
