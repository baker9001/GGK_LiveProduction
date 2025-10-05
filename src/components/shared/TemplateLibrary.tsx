'use client';

import React, { useState, useMemo } from 'react';
import { LayoutTemplate as BookTemplate, Clock, Copy, CreditCard as Edit2, Loader2, MoreVertical, Plus, Search, Star, Trash2, TrendingUp, X } from 'lucide-react';
import { Button, IconButton } from './Button';
import { FormField, Input, Textarea } from './FormField';
import { SearchableMultiSelect } from './SearchableMultiSelect';
import type { MockExamTemplate } from '../../services/mockExamTemplateService';

interface TemplateLibraryProps {
  templates: MockExamTemplate[];
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: MockExamTemplate) => void;
  onCreateTemplate?: (data: { name: string; description: string }) => void;
  onDeleteTemplate?: (templateId: string) => void;
  isLoading?: boolean;
  className?: string;
}

type ViewMode = 'all' | 'popular' | 'recent';
type SortBy = 'name' | 'usage' | 'date';

export function TemplateLibrary({
  templates,
  isOpen,
  onClose,
  onSelectTemplate,
  onCreateTemplate,
  onDeleteTemplate,
  isLoading = false,
  className = '',
}: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [sortBy, setSortBy] = useState<SortBy>('usage');
  const [selectedTemplate, setSelectedTemplate] = useState<MockExamTemplate | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  const filteredAndSortedTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.template_data.subject?.toLowerCase().includes(query)
      );
    }

    // Filter by view mode
    if (viewMode === 'popular') {
      filtered = filtered.filter((t) => t.usage_count > 0);
    } else if (viewMode === 'recent') {
      // Already handled by sorting
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'usage':
          return b.usage_count - a.usage_count;
        case 'date':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [templates, searchQuery, viewMode, sortBy]);

  const handleSelectTemplate = (template: MockExamTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) return;
    onCreateTemplate?.({
      name: newTemplateName,
      description: newTemplateDesc,
    });
    setNewTemplateName('');
    setNewTemplateDesc('');
    setShowCreateForm(false);
  };

  const toggleExpanded = (templateId: string) => {
    setExpandedTemplateId(expandedTemplateId === templateId ? null : templateId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className={`w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col ${className}`}>
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8CC63F]/20 to-[#7AB635]/20 flex items-center justify-center">
                <BookTemplate className="w-5 h-5 text-[#8CC63F]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Template Library</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredAndSortedTemplates.length} template{filteredAndSortedTemplates.length !== 1 ? 's' : ''} available
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onCreateTemplate && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setShowCreateForm(!showCreateForm)}
                >
                  Save Current
                </Button>
              )}
              <IconButton
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label="Close template library"
              >
                <X className="w-5 h-5" />
              </IconButton>
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search templates by name, subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-gray-400" />}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'all'
                    ? 'bg-[#8CC63F] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setViewMode('popular')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                  viewMode === 'popular'
                    ? 'bg-[#8CC63F] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Popular
              </button>
              <button
                onClick={() => setViewMode('recent')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                  viewMode === 'recent'
                    ? 'bg-[#8CC63F] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Clock className="w-4 h-4" />
                Recent
              </button>
            </div>
          </div>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900/40">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Save Current Exam as Template
            </h3>
            <div className="space-y-3">
              <FormField id="template-name" label="Template name" required>
                <Input
                  id="template-name"
                  placeholder="e.g., Year 11 Mathematics Extended Mock"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                />
              </FormField>
              <FormField id="template-desc" label="Description">
                <Textarea
                  id="template-desc"
                  rows={2}
                  placeholder="What is this template used for?"
                  value={newTemplateDesc}
                  onChange={(e) => setNewTemplateDesc(e.target.value)}
                />
              </FormField>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTemplateName('');
                    setNewTemplateDesc('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateTemplate}
                  disabled={!newTemplateName.trim()}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Save Template
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#8CC63F] animate-spin mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading templates...</p>
            </div>
          ) : filteredAndSortedTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <BookTemplate className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchQuery ? 'No templates found' : 'No templates yet'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md mb-4">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Create your first template by saving a configured exam'}
              </p>
              {!searchQuery && onCreateTemplate && (
                <Button
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setShowCreateForm(true)}
                >
                  Create First Template
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedTemplates.map((template) => {
                const isExpanded = expandedTemplateId === template.id;
                const data = template.template_data;

                return (
                  <div
                    key={template.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg hover:border-[#8CC63F]/50 transition-colors"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                              {template.name}
                            </h3>
                            {template.usage_count > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#8CC63F]/10 text-[#7AB635] text-xs font-medium">
                                <Star className="w-3 h-3" />
                                {template.usage_count} use{template.usage_count !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {template.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 text-xs">
                            {data.subject && (
                              <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                {data.subject}
                              </span>
                            )}
                            {data.paper && (
                              <span className="px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                                {data.paper}
                              </span>
                            )}
                            {data.examWindow && (
                              <span className="px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                {data.examWindow}
                              </span>
                            )}
                            {data.durationMinutes && (
                              <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                {data.durationMinutes} min
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleSelectTemplate(template)}
                            leftIcon={<Copy className="w-4 h-4" />}
                          >
                            Use Template
                          </Button>
                          {onDeleteTemplate && (
                            <IconButton
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => onDeleteTemplate(template.id)}
                              aria-label="Delete template"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </IconButton>
                          )}
                        </div>
                      </div>

                      {/* Expandable details */}
                      <button
                        onClick={() => toggleExpanded(template.id)}
                        className="mt-3 text-sm text-[#8CC63F] hover:text-[#7AB635] transition-colors"
                      >
                        {isExpanded ? 'Hide details' : 'Show details'}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-3 text-sm">
                          {data.program && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Programme:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">{data.program}</span>
                            </div>
                          )}
                          {data.board && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Board:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">{data.board}</span>
                            </div>
                          )}
                          {data.schoolIds && data.schoolIds.length > 0 && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Schools:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">{data.schoolIds.length}</span>
                            </div>
                          )}
                          {data.gradeLevelIds && data.gradeLevelIds.length > 0 && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Year Groups:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">{data.gradeLevelIds.length}</span>
                            </div>
                          )}
                          {data.deliveryMode && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Mode:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">{data.deliveryMode}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Created:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">
                              {new Date(template.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900/40">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600 dark:text-gray-400">
              Templates are shared across your organization
            </div>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
