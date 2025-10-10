import React from 'react';
import { BookOpen, FolderTree, Target, AlertCircle } from 'lucide-react';
import { Select } from '../../../../../../../components/shared/Select';
import { SearchableMultiSelect } from '../../../../../../../components/shared/SearchableMultiSelect';

interface QuestionMappingControlsProps {
  mapping: any;
  dataStructureInfo: any;
  units: any[];
  topics: any[];
  subtopics: any[];
  onUpdate: (field: string, value: any) => void;
  isDisabled?: boolean;
}

export const QuestionMappingControls: React.FC<QuestionMappingControlsProps> = ({
  mapping,
  dataStructureInfo,
  units,
  topics,
  subtopics,
  onUpdate,
  isDisabled = false,
}) => {
  // Debug logging
  React.useEffect(() => {
    console.log('QuestionMappingControls Debug:', {
      mappingChapterId: mapping?.chapter_id,
      unitsCount: units?.length,
      unitsIds: units?.map(u => u.id).slice(0, 5),
      topicsCount: topics?.length,
      subtopicsCount: subtopics?.length,
      mapping: mapping
    });
  }, [mapping, units]);

  const selectedUnit = units?.find(u => u.id === mapping?.chapter_id);
  const availableTopics = mapping?.chapter_id
    ? topics?.filter(t => t.unit_id === mapping.chapter_id || t.edu_unit_id === mapping.chapter_id) || []
    : topics || [];

  const availableSubtopics = mapping?.topic_ids && mapping.topic_ids.length > 0
    ? subtopics?.filter(s => mapping.topic_ids.includes(s.topic_id || s.edu_topic_id)) || []
    : subtopics || [];

  const isMapped = mapping?.chapter_id && mapping?.topic_ids && mapping.topic_ids.length > 0;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <FolderTree className="h-4 w-4" />
          Academic Mapping
        </h4>
        {isMapped ? (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs rounded-full">
            <Target className="h-3 w-3" />
            Mapped
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs rounded-full">
            <AlertCircle className="h-3 w-3" />
            Not Mapped
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Unit/Chapter Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Unit / Chapter *
          </label>
          <Select
            value={mapping?.chapter_id || ''}
            onChange={(value) => onUpdate('chapter_id', value)}
            disabled={isDisabled}
            className="w-full"
            placeholder="Select Unit..."
            searchable={true}
            usePortal={false}
            options={[
              { value: '', label: 'Select Unit...', disabled: true },
              ...units.map((unit) => ({
                value: unit.id,
                label: `${unit.number ? `${unit.number}. ` : ''}${unit.name}`
              }))
            ]}
          />
          {!mapping?.chapter_id && !isDisabled && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">Required</p>
          )}
        </div>

        {/* Topics Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Topics *
          </label>
          <SearchableMultiSelect
            label=""
            options={availableTopics.map(t => ({
              value: t.id,
              label: `${t.number ? `${t.number}. ` : ''}${t.name}`
            }))}
            selectedValues={mapping?.topic_ids || []}
            onChange={(value) => onUpdate('topic_ids', value)}
            placeholder="Select topics..."
            disabled={isDisabled || !mapping?.chapter_id}
            usePortal={false}
          />
          {(!mapping?.topic_ids || mapping.topic_ids.length === 0) && !isDisabled && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">At least one required</p>
          )}
        </div>

        {/* Subtopics Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Subtopics (Optional)
          </label>
          <SearchableMultiSelect
            label=""
            options={availableSubtopics.map(s => ({
              value: s.id,
              label: s.name
            }))}
            selectedValues={mapping?.subtopic_ids || []}
            onChange={(value) => onUpdate('subtopic_ids', value)}
            placeholder="Select subtopics..."
            disabled={isDisabled || !mapping?.topic_ids || mapping.topic_ids.length === 0}
            usePortal={false}
          />
        </div>
      </div>

      {/* Mapping Summary */}
      {isMapped && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-start gap-2 text-xs text-blue-800 dark:text-blue-200">
            <BookOpen className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium mb-1">Mapped to:</p>
              <ul className="space-y-0.5">
                {selectedUnit && (
                  <li>• Unit: {selectedUnit.name}</li>
                )}
                {mapping.topic_ids && mapping.topic_ids.length > 0 && (
                  <li>
                    • Topics: {topics
                      .filter(t => mapping.topic_ids.includes(t.id))
                      .map(t => t.name)
                      .join(', ')}
                  </li>
                )}
                {mapping.subtopic_ids && mapping.subtopic_ids.length > 0 && (
                  <li>
                    • Subtopics: {subtopics
                      .filter(s => mapping.subtopic_ids.includes(s.id))
                      .map(s => s.name)
                      .join(', ')}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
