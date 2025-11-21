import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  convertEquationInputToHtml,
  ensureParagraphStructure,
  getPlainTextFromRichText,
  insertHtmlAtCaret,
  restoreSelection,
  sanitizeRichText,
  saveSelection,
  getCursorPosition,
  setCursorPosition
} from '../../utils/richText';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

const SYMBOL_GROUPS = [
  {
    label: 'Common',
    symbols: ['±', '×', '÷', '≈', '≠', '≤', '≥', '°', '∞', '∑', '∫']
  },
  {
    label: 'Greek',
    symbols: ['α', 'β', 'γ', 'Δ', 'θ', 'λ', 'π', 'σ', 'φ', 'ω', 'Ω']
  },
  {
    label: 'Operators',
    symbols: ['√', '∂', '∇', '∧', '∨', '⊕', '⊗', '∈', '∉', '∩', '∪']
  },
  {
    label: 'Arrows',
    symbols: ['→', '←', '↑', '↓', '↔', '⇒', '⇔', '⇑', '⇓']
  }
];

const TOOLBAR_BUTTON_CLASS =
  'h-9 w-9 flex items-center justify-center rounded-md border border-transparent text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700/70 dark:hover:text-white';

const BLOCK_FORMATS: Record<string, string> = {
  paragraph: 'p',
  heading1: 'h1',
  heading2: 'h2',
  heading3: 'h3'
};

export function RichTextEditor({ value, onChange, placeholder, className, ariaLabel }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  const [showEquationModal, setShowEquationModal] = useState(false);
  const [equationInput, setEquationInput] = useState('');
  const [isBlockEquation, setIsBlockEquation] = useState(false);
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const symbolPopoverRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // Don't update innerHTML while user is actively typing
    if (isTypingRef.current) return;

    const sanitized = sanitizeRichText(value || '');
    const currentContent = editorRef.current.innerHTML;

    // Only update if content is actually different
    if (currentContent !== sanitized) {
      // Preserve cursor position if editor is focused
      const cursorPosition = isFocused ? getCursorPosition(editorRef.current) : 0;

      editorRef.current.innerHTML = sanitized || '<p><br /></p>';

      // Restore cursor position after update
      if (isFocused && cursorPosition > 0) {
        requestAnimationFrame(() => {
          if (editorRef.current) {
            setCursorPosition(editorRef.current, cursorPosition);
          }
        });
      }
    }
  }, [value, isFocused]);

  const updateSelection = useCallback(() => {
    if (!editorRef.current) return;
    const range = saveSelection(editorRef.current);
    if (range) {
      setSavedRange(range);
    }
  }, []);

  const applyCommand = useCallback((command: string, valueArg?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection(savedRange);
    document.execCommand(command, false, valueArg);
    updateSelection();
    handleInput();
  }, [savedRange, updateSelection]);

  const handleBlockFormat = useCallback((block: keyof typeof BLOCK_FORMATS) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection(savedRange);
    document.execCommand('formatBlock', false, BLOCK_FORMATS[block]);
    updateSelection();
    handleInput();
  }, [savedRange, updateSelection]);

  const insertEquation = useCallback(() => {
    if (!editorRef.current) return;
    const html = convertEquationInputToHtml(equationInput, isBlockEquation);
    if (!html) {
      setShowEquationModal(false);
      setEquationInput('');
      return;
    }
    editorRef.current.focus();
    restoreSelection(savedRange);
    insertHtmlAtCaret(html, editorRef.current);
    setShowEquationModal(false);
    setEquationInput('');
    handleInput();
  }, [equationInput, isBlockEquation, savedRange]);

  const insertSymbol = useCallback((symbol: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection(savedRange);
    document.execCommand('insertText', false, symbol);
    setShowSymbols(false);
    updateSelection();
    handleInput();
  }, [savedRange, updateSelection]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;

    // Mark that user is actively typing
    isTypingRef.current = true;

    // Clear existing typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const rawHtml = editorRef.current.innerHTML;
    const sanitized = sanitizeRichText(rawHtml);

    // Only fix structure and sanitize if there are actual issues
    // Don't update innerHTML during active typing to preserve cursor
    if (sanitized !== rawHtml) {
      const cursorPosition = getCursorPosition(editorRef.current);
      editorRef.current.innerHTML = sanitized;
      // Restore cursor immediately
      setCursorPosition(editorRef.current, cursorPosition);
    }

    // Call onChange immediately to keep parent in sync
    onChange(sanitized);

    // Mark typing as finished after a delay
    typingTimeoutRef.current = window.setTimeout(() => {
      isTypingRef.current = false;
    }, 300);
  }, [onChange]);

  const handlePaste = useCallback((event: ClipboardEvent) => {
    event.preventDefault();
    if (!editorRef.current) return;
    const html = event.clipboardData?.getData('text/html') || '';
    const text = event.clipboardData?.getData('text/plain') || '';
    const content = html || text.replace(/\n/g, '<br />');
    const sanitized = sanitizeRichText(content);
    editorRef.current.focus();
    restoreSelection(savedRange);
    insertHtmlAtCaret(sanitized, editorRef.current);
    handleInput();
  }, [handleInput, savedRange]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleSelectionChange = () => {
      if (!editor) return;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        setSavedRange(range.cloneRange());
      }
    };

    editor.addEventListener('keyup', updateSelection);
    editor.addEventListener('mouseup', updateSelection);
    editor.addEventListener('paste', handlePaste);
    document.addEventListener('selectionchange', handleSelectionChange);

    const handleOutsideClick = (event: MouseEvent) => {
      if (symbolPopoverRef.current && !symbolPopoverRef.current.contains(event.target as Node)) {
        setShowSymbols(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      editor.removeEventListener('keyup', updateSelection);
      editor.removeEventListener('mouseup', updateSelection);
      editor.removeEventListener('paste', handlePaste);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleOutsideClick);

      // Cleanup typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [handlePaste, updateSelection]);

  const isEmpty = useMemo(() => {
    return getPlainTextFromRichText(value || '').trim().length === 0;
  }, [value]);

  const containerClasses = cn(
    'relative w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm',
    className
  );

  const editorClasses = cn(
    'min-h-[180px] max-h-[420px] overflow-y-auto px-4 py-3 focus:outline-none text-base leading-relaxed text-gray-900 dark:text-gray-100 rich-text-display',
    className
  );

  return (
    <div className={containerClasses}>
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-800">
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onMouseDown={e => e.preventDefault()} onClick={() => applyCommand('bold')} title="Bold">
          <span className="font-semibold">B</span>
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onMouseDown={e => e.preventDefault()} onClick={() => applyCommand('italic')} title="Italic">
          <span className="italic">I</span>
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onMouseDown={e => e.preventDefault()} onClick={() => applyCommand('underline')} title="Underline">
          <span className="underline">U</span>
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onMouseDown={e => e.preventDefault()} onClick={() => applyCommand('strikeThrough')} title="Strikethrough">
          <span className="line-through">S</span>
        </button>
        <div className="mx-1 h-6 w-px bg-gray-300" />
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onMouseDown={e => e.preventDefault()} onClick={() => applyCommand('superscript')} title="Superscript">
          <span className="text-xs align-super">x²</span>
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onMouseDown={e => e.preventDefault()} onClick={() => applyCommand('subscript')} title="Subscript">
          <span className="text-xs align-sub">x₂</span>
        </button>
        <div className="mx-1 h-6 w-px bg-gray-300" />
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onMouseDown={e => e.preventDefault()} onClick={() => applyCommand('insertOrderedList')} title="Numbered list">
          1.
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onMouseDown={e => e.preventDefault()} onClick={() => applyCommand('insertUnorderedList')} title="Bullet list">
          •
        </button>
        <div className="mx-1 h-6 w-px bg-gray-300" />
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onMouseDown={e => e.preventDefault()} onClick={() => applyCommand('outdent')} title="Decrease indent">
          ←
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onMouseDown={e => e.preventDefault()} onClick={() => applyCommand('indent')} title="Increase indent">
          →
        </button>
        <div className="mx-1 h-6 w-px bg-gray-300" />
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onMouseDown={e => e.preventDefault()} onClick={() => handleBlockFormat('paragraph')} title="Paragraph">
          ¶
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onMouseDown={e => e.preventDefault()} onClick={() => handleBlockFormat('heading2')} title="Heading">
          H2
        </button>
        <div className="mx-1 h-6 w-px bg-gray-300" />
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onMouseDown={e => e.preventDefault()} onClick={() => setShowEquationModal(true)} title="Insert equation">
          ∑
        </button>
        <div className="relative" ref={symbolPopoverRef}>
          <button
            type="button"
            className={TOOLBAR_BUTTON_CLASS}
            onMouseDown={e => e.preventDefault()}
            onClick={() => setShowSymbols(prev => !prev)}
            title="Insert symbol"
          >
            Ω
          </button>
          {showSymbols && (
            <div className="absolute z-20 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Symbols</span>
                <button className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400" onClick={() => setShowSymbols(false)}>Close</button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {SYMBOL_GROUPS.map(group => (
                  <div key={group.label}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 dark:text-gray-400">{group.label}</p>
                    <div className="flex flex-wrap gap-1">
                      {group.symbols.map(symbol => (
                        <button
                          key={symbol}
                          type="button"
                          className="h-8 w-8 flex items-center justify-center rounded border border-gray-200 bg-gray-50 text-base hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => insertSymbol(symbol)}
                        >
                          {symbol}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mx-1 h-6 w-px bg-gray-300" />
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onMouseDown={e => e.preventDefault()} onClick={() => applyCommand('undo')} title="Undo">
          ↺
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onMouseDown={e => e.preventDefault()} onClick={() => applyCommand('redo')} title="Redo">
          ↻
        </button>
        <div className="mx-1 h-6 w-px bg-gray-300" />
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onMouseDown={e => e.preventDefault()} onClick={() => applyCommand('removeFormat')} title="Clear formatting">
          ⌫
        </button>
      </div>

      <div className="relative">
        <div
          ref={editorRef}
          className={editorClasses}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            if (editorRef.current) {
              ensureParagraphStructure(editorRef.current);
            }
          }}
          onInput={handleInput}
        />
        {isEmpty && !isFocused && (
          <div className={cn('pointer-events-none absolute inset-0 px-4 py-3 text-gray-400', className)}>
            {placeholder}
          </div>
        )}
      </div>


      {showEquationModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Insert Equation</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {'Use LaTeX-style notation. Supports fractions (\\frac{a}{b}), square roots (\\sqrt{a}), superscripts (^), and subscripts (_).'}
            </p>
            <textarea
              value={equationInput}
              onChange={event => setEquationInput(event.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              rows={4}
              placeholder="e.g., E = mc^2 or \\frac{a}{b}"
            />
            <div className="mt-3 flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={isBlockEquation}
                  onChange={event => setIsBlockEquation(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Display as block equation</span>
              </label>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowEquationModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={insertEquation}>
                  Insert
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
