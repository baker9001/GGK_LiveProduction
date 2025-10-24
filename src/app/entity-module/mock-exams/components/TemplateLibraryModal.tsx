'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Copy,
  Search,
  Star,
  Clock,
  TrendingUp,
  Filter,
  X,
  Calendar,
  Users,
  FileText,
  Loader2,
} from 'lucide-react';
import { Button, IconButton } from '../../../../components/shared/Button';
import { Tabs } from '../../../../components/shared/Tabs';
import { FormField, Input } from '../../../../components/shared/FormField';
import { MockExamTemplate } from '../../../../services/mockExamTemplateService';
import dayjs from 'dayjs';

interface TemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: MockExamTemplate[];
  popularTemplates: MockExamTemplate[];
  recentTemplates: MockExamTemplate[];
  onUseTemplate: (template: MockExamTemplate) => void;
  isLoading?: boolean;
}

export function TemplateLibraryModal({
  isOpen,
  onClose,
  templates,
  popularTemplates,
  recentTemplates,
  onUseTemplate,
  isLoading = false,
}: TemplateLibraryModalProps) {
  const [activeTab, setActiveTab] = useState('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MockExamTemplate | null>(null);

  const tabs = [
    { id: 'popular', label: 'Popular Templates', icon: TrendingUp },
    { id: 'recent', label: 'Recent', icon: Clock },
    { id: 'all', label: 'All Templates', icon: FileText },
  ];

  const displayedTemplates = useMemo(() => {
    let baseTemplates: MockExamTemplate[] = [];

    switch (activeTab) {
      case 'popular':
        baseTemplates = popularTemplates;
        break;
      case 'recent':
        baseTemplates = recentTemplates;
        break;
      case 'all':
      default:
        baseTemplates = templates;
        break;
    }

    if (!searchQuery.trim()) return baseTemplates;

    const query = searchQuery.toLowerCase();
    return baseTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.template_data?.subject?.toLowerCase().includes(query) ||
        t.template_data?.program?.toLowerCase().includes(query)
    );
  }, [activeTab, templates, popularTemplates, recentTemplates, searchQuery]);

  const handleUseTemplate = (template: MockExamTemplate) => {
    onUseTemplate(template);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        <div className="relative w-full max-w-5xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8CC63F]/20 to-[#7AB635]/20 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-[#8CC63F]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Template Library</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose a template to quickly create a new mock exam
                </p>
              </div>
            </div>
            <IconButton
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </IconButton>
          </div>

          {/* Search and Tabs */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
            <Input
              placeholder="Search templates by name, subject, or programme..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-gray-400" />}
            />

            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              variant="pills"
            />
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 text-[#8CC63F] animate-spin mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Loading templates...</p>
              </div>
            ) : displayedTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {searchQuery ? 'No templates match your search' : 'No templates yet'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md">
                  {searchQuery
                    ? 'Try adjusting your search terms or browse all templates'
                    : 'Create your first mock exam and save it as a template for future use'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                {displayedTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={handleUseTemplate}
                    isSelected={selectedTemplate?.id === template.id}
                    onSelect={setSelectedTemplate}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {displayedTemplates.length} template{displayedTemplates.length !== 1 ? 's' : ''} available
            </p>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TemplateCardProps {
  template: MockExamTemplate;
  onUse: (template: MockExamTemplate) => void;
  isSelected: boolean;
  onSelect: (template: MockExamTemplate) => void;
}

function TemplateCard({ template, onUse, isSelected, onSelect }: TemplateCardProps) {
  const data = template.template_data;

  return (
    <div
      className={`
        relative p-4 rounded-lg border-2 transition-all cursor-pointer
        ${isSelected
          ? 'border-[#8CC63F] bg-[#8CC63F]/5'
          : 'border-gray-200 dark:border-gray-700 hover:border-[#8CC63F]/50 hover:bg-gray-50 dark:hover:bg-gray-900/40'
        }
      `}
      onClick={() => onSelect(template)}
    >
      {/* Usage badge */}
      {template.usage_count > 0 && (
        <div className="absolute top-4 right-4 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#8CC63F]/10 text-[#7AB635] text-xs font-medium">
          <Star className="w-3 h-3" />
          {template.usage_count} use{template.usage_count !== 1 ? 's' : ''}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 pr-16">
            {template.name}
          </h3>
          {template.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {template.description}
            </p>
          )}
        </div>

        {/* Template details */}
        <div className="space-y-2">
          {data.program && data.board && (
            <div className="flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4 text-[#8CC63F]" />
              <span className="text-gray-900 dark:text-white font-medium">{data.program}</span>
              <span className="text-gray-500 dark:text-gray-400">•</span>
              <span className="text-gray-600 dark:text-gray-400">{data.board}</span>
            </div>
          )}

          {data.subject && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <FileText className="w-4 h-4" />
              <span>{data.subject}</span>
              {data.paper && (
                <>
                  <span>•</span>
                  <span>{data.paper}</span>
                </>
              )}
            </div>
          )}

          {data.examWindow && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>{data.examWindow}</span>
              {data.durationMinutes && (
                <>
                  <span>•</span>
                  <span>{data.durationMinutes} minutes</span>
                </>
              )}
            </div>
          )}

          {(data.gradeLevelIds && data.gradeLevelIds.length > 0) && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span>{data.gradeLevelIds.length} year group{data.gradeLevelIds.length !== 1 ? 's' : ''}</span>
              {data.schoolIds && data.schoolIds.length > 0 && (
                <>
                  <span>•</span>
                  <span>{data.schoolIds.length} school{data.schoolIds.length !== 1 ? 's' : ''}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Created {dayjs(template.created_at).format('DD MMM YYYY')}
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Copy className="w-3.5 h-3.5" />}
            onClick={(e) => {
              e.stopPropagation();
              onUse(template);
            }}
          >
            Use Template
          </Button>
        </div>
      </div>
    </div>
  );
}
