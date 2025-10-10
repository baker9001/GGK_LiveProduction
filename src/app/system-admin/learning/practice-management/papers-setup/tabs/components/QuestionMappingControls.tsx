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
  const normalizedChapterId = mapping?.chapter_id ? String(mapping.chapter_id) : '';
  const normalizedTopicIds = Array.isArray(mapping?.topic_ids)
    ? mapping.topic_ids.map((id: any) => String(id))
    : [];
  const normalizedSubtopicIds = Array.isArray(mapping?.subtopic_ids)
    ? mapping.subtopic_ids.map((id: any) => String(id))
    : [];

  // Debug logging
  React.useEffect(() => {
    console.log('QuestionMappingControls Debug:', {
      mappingChapterId: normalizedChapterId,
      normalizedTopicIds: normalizedTopicIds,
      normalizedSubtopicIds: normalizedSubtopicIds,
      unitsCount: units?.length,
      unitsIds: units?.map(u => u.id).slice(0, 5),
      topicsCount: topics?.length,
      topicsSample: topics?.slice(0, 3).map(t => ({
        id: t.id,
        name: t.name,
        unit_id: t.unit_id,
        edu_unit_id: t.edu_unit_id,
        chapter_id: t.chapter_id
      })),
      subtopicsCount: subtopics?.length,
      mapping: mapping,
      selectedTopicsForDisplay: topics?.filter(t => normalizedTopicIds.includes(String(t.id))).map(t => t.name)
    });
  }, [mapping, units, topics, normalizedTopicIds, normalizedSubtopicIds]);

  const selectedUnit = units?.find(u => String(u.id) === normalizedChapterId);

  // Filter topics based on selected unit - check multiple possible field names
  const availableTopics = normalizedChapterId
    ? topics?.filter(t => {
        // Check all possible foreign key field names
        const topicUnitId = t.unit_id || t.edu_unit_id || t.chapter_id;
        return String(topicUnitId) === normalizedChapterId;
      }) || []
    : topics || [];

  // Debug log for topics filtering
  React.useEffect(() => {
    if (normalizedChapterId) {
      console.log('Topics Filtering Debug:', {
        selectedUnitId: normalizedChapterId,
        selectedUnitName: selectedUnit?.name,
        totalTopicsCount: topics?.length,
        availableTopicsCount: availableTopics.length,
        availableTopicsNames: availableTopics.map(t => t.name),
        allTopicsMatchCheck: topics?.slice(0, 5).map(t => ({
          name: t.name,
          unit_id: t.unit_id,
          matches: String(t.unit_id) === normalizedChapterId
        }))
      });

      if (availableTopics.length === 0 && topics && topics.length > 0) {
        console.error('❌ NO TOPICS FOUND! Debugging:', {
          mappingChapterId: normalizedChapterId,
          mappingChapterIdType: typeof normalizedChapterId,
          sampleTopic: topics[0],
          sampleTopicUnitId: topics[0]?.unit_id,
          sampleTopicUnitIdType: typeof topics[0]?.unit_id,
          comparison: `"${topics[0]?.unit_id}" === "${normalizedChapterId}"`,
          strictEqual: String(topics[0]?.unit_id) === normalizedChapterId
        });
      }
    }
  }, [normalizedChapterId, availableTopics, topics, selectedUnit]);

  // Filter subtopics based on selected topics - check multiple possible field names
  const availableSubtopics = normalizedTopicIds.length > 0
    ? subtopics?.filter(s => {
        const subtopicTopicId = s.topic_id || s.edu_topic_id;
        return normalizedTopicIds.includes(String(subtopicTopicId));
      }) || []
    : subtopics || [];

  const isMapped = !!normalizedChapterId && normalizedTopicIds.length > 0;

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
            value={normalizedChapterId}
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
              value: String(t.id),
              label: `${t.sort !== undefined ? `${t.sort}. ` : ''}${t.name}`
            }))}
            selectedValues={normalizedTopicIds}
            onChange={(value) => onUpdate('topic_ids', value)}
            placeholder={!normalizedChapterId ? "Select unit first..." : `Select topics... (${availableTopics.length} available)`}
            disabled={isDisabled || !normalizedChapterId}
            usePortal={false}
          />
          {normalizedTopicIds.length === 0 && !isDisabled && (
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
              value: String(s.id),
              label: s.name
            }))}
            selectedValues={normalizedSubtopicIds}
            onChange={(value) => onUpdate('subtopic_ids', value)}
            placeholder="Select subtopics..."
            disabled={isDisabled || normalizedTopicIds.length === 0}
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
                {normalizedTopicIds.length > 0 && (
                  <li>
                    • Topics: {topics
                      .filter(t => normalizedTopicIds.includes(String(t.id)))
                      .map(t => t.name)
                      .join(', ')}
                  </li>
                )}
                {normalizedSubtopicIds.length > 0 && (
                  <li>
                    • Subtopics: {subtopics
                      .filter(s => normalizedSubtopicIds.includes(String(s.id)))
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
