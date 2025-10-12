import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Select } from '../../../../../../../components/shared/Select';
import { SearchableMultiSelect } from '../../../../../../../components/shared/SearchableMultiSelect';

interface QuestionMappingControlsProps {
  mapping: any;
  units: any[];
  topics: any[];
  subtopics: any[];
  onMappingUpdate: (field: string, value: string | string[]) => void;
  disabled?: boolean;
}

export function QuestionMappingControls({
  mapping,
  units,
  topics,
  subtopics,
  onMappingUpdate,
  disabled = false
}: QuestionMappingControlsProps) {
  const selectedUnit = units.find((u) => String(u.id) === String(mapping?.chapter_id));
  const filteredTopics = mapping?.chapter_id
    ? topics.filter((t) => String(t.chapter_id || t.edu_unit_id) === String(mapping.chapter_id))
    : topics;

  const selectedTopicIds = (mapping?.topic_ids || []).map((id: any) => String(id));
  const filteredSubtopics = selectedTopicIds.length > 0
    ? subtopics.filter((s) =>
        selectedTopicIds.includes(String(s.topic_id || s.edu_topic_id))
      )
    : subtopics;

  const isMapped = mapping?.chapter_id && mapping?.topic_ids?.length > 0;

  const getMappingSummary = () => {
    if (!isMapped) return null;

    const unitName = selectedUnit?.title || selectedUnit?.name || 'Unknown Unit';
    const selectedTopics = topics.filter((t) =>
      selectedTopicIds.includes(String(t.id))
    );
    const selectedSubtopics = subtopics.filter((s) =>
      (mapping?.subtopic_ids || []).map((id: any) => String(id)).includes(String(s.id))
    );

    return (
      <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1">
        <div>
          <span className="font-medium">Unit:</span> {unitName}
        </div>
        {selectedTopics.length > 0 && (
          <div>
            <span className="font-medium">Topics:</span>{' '}
            {selectedTopics.map((t) => t.title || t.name).join(', ')}
          </div>
        )}
        {selectedSubtopics.length > 0 && (
          <div>
            <span className="font-medium">Subtopics:</span>{' '}
            {selectedSubtopics.map((s) => s.title || s.name).join(', ')}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          Academic Mapping
          {isMapped ? (
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          )}
        </h4>
        {isMapped ? (
          <span className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
            Mapped
          </span>
        ) : (
          <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded">
            Not Mapped
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Unit/Chapter <span className="text-red-500">*</span>
          </label>
          <Select
            value={mapping?.chapter_id || ''}
            onChange={(value) => onMappingUpdate('chapter_id', value)}
            options={units.map((unit) => ({
              value: String(unit.id),
              label: unit.title || unit.name || `Unit ${unit.id}`
            }))}
            placeholder="Select a unit"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Topics <span className="text-red-500">*</span>
          </label>
          <SearchableMultiSelect
            label=""
            selectedValues={mapping?.topic_ids || []}
            options={filteredTopics.map((topic) => ({
              value: String(topic.id),
              label: topic.title || topic.name || `Topic ${topic.id}`
            }))}
            onChange={(values) => onMappingUpdate('topic_ids', values)}
            placeholder="Select topics"
            disabled={disabled || !mapping?.chapter_id}
            usePortal={false}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subtopics (Optional)
          </label>
          <SearchableMultiSelect
            label=""
            selectedValues={mapping?.subtopic_ids || []}
            options={filteredSubtopics.map((subtopic) => ({
              value: String(subtopic.id),
              label: subtopic.title || subtopic.name || `Subtopic ${subtopic.id}`
            }))}
            onChange={(values) => onMappingUpdate('subtopic_ids', values)}
            placeholder="Select subtopics"
            disabled={disabled || selectedTopicIds.length === 0}
            usePortal={false}
          />
        </div>
      </div>

      {getMappingSummary()}

      {!isMapped && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2 mt-2">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            Please map this question to at least one unit and topic before importing.
          </p>
        </div>
      )}
    </div>
  );
}
