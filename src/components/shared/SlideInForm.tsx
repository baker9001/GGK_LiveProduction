///home/project/src/components/shared/SlideInForm.tsx


import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface SlideInFormProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  saveButtonText?: string;
  footerContent?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
}

export function SlideInForm({
  title,
  isOpen,
  onClose,
  onSave,
  children,
  className,
  loading = false,
  saveButtonText = 'Save',
  footerContent,
  width = 'md',
}: SlideInFormProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const activePortalsRef = useRef<Set<HTMLElement>>(new Set());

  const registerPortal = (element: HTMLElement) => {
    activePortalsRef.current.add(element);
    return () => activePortalsRef.current.delete(element);
  };

  useEffect(() => {
    if (isOpen && panelRef.current) {
      (panelRef.current as any).__registerPortal = registerPortal;
    }
    return () => {
      if (panelRef.current) delete (panelRef.current as any).__registerPortal;
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter' && onSave) {
        if (e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        onSave();
      }
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onSave]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      for (const portal of activePortalsRef.current) {
        if (portal.contains(event.target as Node)) return;
      }
      if (isOpen) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      window.__registerSlideInFormPortal = (el: HTMLElement) => registerPortal(el);
    }
    return () => { delete (window as any).__registerSlideInFormPortal; };
  }, [isOpen]);

  const widthClasses = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-xl',
    xl: 'sm:max-w-2xl',
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 overflow-hidden transition-opacity duration-300',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      <div
        className={cn(
          'fixed inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <div
          className={cn(
            'w-screen transform transition-transform duration-500 ease-in-out',
            isOpen ? 'translate-x-0' : 'translate-x-full',
            widthClasses[width]
          )}
        >
          <div
            ref={panelRef}
            className={cn(
              'flex h-full flex-col overflow-hidden rounded-l-2xl bg-white dark:bg-gray-800 shadow-lg transition-colors duration-200',
              className
            )}
          >
            <div className="relative px-6 py-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  title="Close (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-600">
              {children}
            </div>
            <div className="shrink-0 border-t border-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-6 py-4">
              <div className="flex justify-end gap-3">
                {footerContent}
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="min-w-[100px]"
                  title="Cancel (Esc)"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onSave}
                  disabled={loading}
                  className="min-w-[100px]"
                  title="Save (Enter)"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </div>
                  ) : (
                    saveButtonText
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    __registerSlideInFormPortal?: (el: HTMLElement) => () => void;
  }
}
