import React, { useMemo } from 'react';
import { CheckCircle, XCircle, Database } from 'lucide-react';
import { SearchableMultiSelect } from '../../../../../../../components/shared/SearchableMultiSelect';
import { Select } from '../../../../../../../components/shared/Select';
import { cn } from '../../../../../../../lib/utils';

interface QuestionMappingControlsProps {
  mapping: {
    chapter_id?: string;
    topic_ids?: string[];
    subtopic_ids?: string[];
  };
  units: Array<{ id: string; name: string; subject_id?: string }>;
  topics: Array<{ id: string; name: string; unit_id?: string; edu_unit_id?: string }>;
  subtopics: Array<{ id: string; name: string; topic_id?: string; edu_topic_id?: string }>;
  onMappingUpdate: (field: string, value: string | string[]) => void;
  disabled?: boolean;
}

export const QuestionMappingControls: React.FC<QuestionMappingControlsProps> = ({
  mapping,
  units,
  topics,
  subtopics,
  onMappingUpdate,
  disabled = false
}) => {
  const selectedUnit = mapping?.chapter_id || '';
  const selectedTopics = mapping?.topic_ids || [];
  const selectedSubtopics = mapping?.subtopic_ids || [];

  // Filter topics by selected unit
  const filteredTopics = useMemo(() => {
    if (!selectedUnit) return topics;
    return topics.filter(topic =>
      topic.unit_id === selectedUnit || topic.edu_unit_id === selectedUnit
    );
  }, [topics, selectedUnit]);

  // Filter subtopics by selected topics
  const filteredSubtopics = useMemo(() => {
    if (selectedTopics.length === 0) return subtopics;
    return subtopics.filter(subtopic =>
      selectedTopics.includes(subtopic.topic_id || subtopic.edu_topic_id || '')
    );
  }, [subtopics, selectedTopics]);

  // Check if question is mapped
  const isMapped = selectedUnit && selectedTopics.length > 0;

  // Prepare options for dropdowns
  const unitOptions = units.map(unit => ({
    value: unit.id,
    label: unit.name
  }));

  const topicOptions = filteredTopics.map(topic => ({
    value: topic.id,
    label: topic.name
  }));

  const subtopicOptions = filteredSubtopics.map(subtopic => ({
    value: subtopic.id,
    label: subtopic.name
  }));

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Academic Mapping
          </h4>
        </div>

        {isMapped ? (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded-full">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-green-700 dark:text-green-300">Mapped</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded-full">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-xs font-medium text-red-700 dark:text-red-300">Not Mapped</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* Unit/Chapter Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Unit/Chapter <span className="text-red-500">*</span>
          </label>
          <Select
            value={selectedUnit}
            onChange={(value) => onMappingUpdate('chapter_id', value)}
            options={unitOptions}
            placeholder="Select unit/chapter..."
            disabled={disabled}
            className="w-full"
          />
        </div>

        {/* Topics Multi-Select */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Topics <span className="text-red-500">*</span>
          </label>
          <SearchableMultiSelect
            label=""
            options={topicOptions}
            selectedValues={selectedTopics}
            onChange={(values) => onMappingUpdate('topic_ids', values)}
            placeholder={selectedUnit ? "Select topics..." : "Select unit first"}
            disabled={disabled || !selectedUnit}
            usePortal={false}
          />
          {!selectedUnit && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Select a unit/chapter first to see available topics
            </p>
          )}
        </div>

        {/* Subtopics Multi-Select */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subtopics <span className="text-gray-400">(Optional)</span>
          </label>
          <SearchableMultiSelect
            label=""
            options={subtopicOptions}
            selectedValues={selectedSubtopics}
            onChange={(values) => onMappingUpdate('subtopic_ids', values)}
            placeholder={selectedTopics.length > 0 ? "Select subtopics..." : "Select topics first"}
            disabled={disabled || selectedTopics.length === 0}
            usePortal={false}
          />
          {selectedTopics.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Select topics first to see available subtopics
            </p>
          )}
        </div>

        {/* Mapping Summary */}
        {isMapped && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mapping Summary
            </h5>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div>
                <span className="font-medium">Unit:</span>{' '}
                {units.find(u => u.id === selectedUnit)?.name || 'Not selected'}
              </div>
              <div>
                <span className="font-medium">Topics ({selectedTopics.length}):</span>{' '}
                {selectedTopics.length > 0 ? (
                  <span>
                    {selectedTopics.map(topicId => {
                      const topic = topics.find(t => t.id === topicId);
                      return topic?.name;
                    }).filter(Boolean).join(', ')}
                  </span>
                ) : (
                  'None'
                )}
              </div>
              {selectedSubtopics.length > 0 && (
                <div>
                  <span className="font-medium">Subtopics ({selectedSubtopics.length}):</span>{' '}
                  {selectedSubtopics.map(subtopicId => {
                    const subtopic = subtopics.find(s => s.id === subtopicId);
                    return subtopic?.name;
                  }).filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Validation Message */}
        {!isMapped && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Required:</strong> Please map this question to at least one unit and one topic before importing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
