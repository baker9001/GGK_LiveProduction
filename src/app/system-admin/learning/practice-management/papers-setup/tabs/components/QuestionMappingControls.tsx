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

  // Debug logging - verify topic data structure
  React.useEffect(() => {
    if (topics?.length > 0) {
      console.log('QuestionMappingControls - Academic Structure Loaded:', {
        mappingChapterId: normalizedChapterId,
        normalizedTopicIds: normalizedTopicIds,
        unitsCount: units?.length,
        topicsCount: topics?.length,
        topicsSample: topics?.slice(0, 2).map(t => ({
          id: t.id,
          name: t.name,
          unit_id: t.unit_id // This is the correct foreign key field
        })),
        subtopicsCount: subtopics?.length
      });
    }
  }, [mapping, units, topics, normalizedTopicIds, normalizedSubtopicIds]);

  const selectedUnit = units?.find(u => String(u.id) === normalizedChapterId);

  // Filter topics based on selected unit - edu_topics table uses unit_id as foreign key
  // ENHANCED: Also include topics that are already selected (to fix orphaned topics issue)
  const availableTopics = React.useMemo(() => {
    if (!normalizedChapterId) return topics || [];

    const filtered = topics?.filter(t => {
      const topicUnitId = String(t.unit_id);
      const selectedUnitId = String(normalizedChapterId);
      const isMatchingUnit = topicUnitId === selectedUnitId;
      const isAlreadySelected = normalizedTopicIds.includes(String(t.id));

      // Include if: matches current unit OR is already selected (to prevent losing selection)
      return isMatchingUnit || isAlreadySelected;
    }) || [];

    return filtered;
  }, [normalizedChapterId, topics, normalizedTopicIds]);

  // ENHANCED Debug log for topics filtering with detailed diagnostics
  React.useEffect(() => {
    if (normalizedChapterId) {
      // Find selected topics details
      const selectedTopicsDetails = normalizedTopicIds.map(topicId => {
        const topic = topics?.find(t => String(t.id) === topicId);
        return topic ? {
          id: topic.id,
          name: topic.name,
          unit_id: topic.unit_id,
          unit_id_type: typeof topic.unit_id,
          matches_selected_unit: String(topic.unit_id) === String(normalizedChapterId),
          is_in_available_list: availableTopics.some(at => String(at.id) === topicId)
        } : null;
      }).filter(Boolean);

      console.log('🔍 COMPREHENSIVE Topics Filtering Debug:', {
        // Current state
        selectedUnitId: normalizedChapterId,
        selectedUnitName: selectedUnit?.name,
        selectedTopicIds: normalizedTopicIds,

        // Counts
        totalTopicsInDB: topics?.length || 0,
        availableTopicsCount: availableTopics.length,
        selectedTopicsCount: normalizedTopicIds.length,

        // Selected topics analysis
        selectedTopicsDetails: selectedTopicsDetails,

        // Available topics
        availableTopicsNames: availableTopics.map(t => ({
          id: t.id,
          name: t.name,
          unit_id: t.unit_id
        })),

        // Type analysis
        unitIdType: typeof normalizedChapterId,
        sampleTopicUnitIdType: topics?.[0] ? typeof topics[0].unit_id : 'N/A',

        // Mismatch detection
        hasMismatch: selectedTopicsDetails.some(t => !t?.matches_selected_unit),
        mismatchedTopics: selectedTopicsDetails.filter(t => !t?.matches_selected_unit)
      });

      // Alert if we have a mismatch
      if (selectedTopicsDetails.length > 0 && selectedTopicsDetails.some(t => !t?.matches_selected_unit)) {
        console.warn('⚠️ TOPIC-UNIT MISMATCH DETECTED!');
        console.warn('Selected topics do not belong to the selected unit.');
        console.warn('This may indicate:');
        console.warn('1. Data integrity issue in database');
        console.warn('2. Topics were moved between units');
        console.warn('3. Auto-mapping error');
        console.warn('Mismatched topics:', selectedTopicsDetails.filter(t => !t?.matches_selected_unit));
      }
    }
  }, [normalizedChapterId, availableTopics, topics, selectedUnit, normalizedTopicIds]);

  // Filter subtopics based on selected topics - edu_subtopics table uses topic_id as foreign key
  const availableSubtopics = normalizedTopicIds.length > 0
    ? subtopics?.filter(s => {
        return normalizedTopicIds.includes(String(s.topic_id));
      }) || []
    : subtopics || [];

  const isMapped = !!normalizedChapterId && normalizedTopicIds.length > 0;

  // Check if any selected topics don't belong to the selected unit (orphaned topics)
  const orphanedTopics = React.useMemo(() => {
    if (!normalizedChapterId || normalizedTopicIds.length === 0) return [];

    return normalizedTopicIds
      .map(topicId => {
        const topic = topics?.find(t => String(t.id) === topicId);
        if (!topic) return null;

        const belongsToSelectedUnit = String(topic.unit_id) === String(normalizedChapterId);
        if (belongsToSelectedUnit) return null;

        // Find the actual unit this topic belongs to
        const actualUnit = units?.find(u => String(u.id) === String(topic.unit_id));

        return {
          topicId: topic.id,
          topicName: topic.name,
          actualUnitId: topic.unit_id,
          actualUnitName: actualUnit?.name || 'Unknown Unit'
        };
      })
      .filter(Boolean);
  }, [normalizedChapterId, normalizedTopicIds, topics, units]);

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
            options={availableTopics.map(t => {
              const isOrphaned = orphanedTopics.some(ot => ot?.topicId === String(t.id));
              return {
                value: String(t.id),
                label: `${t.sort !== undefined ? `${t.sort}. ` : ''}${t.name}${isOrphaned ? ' ⚠️' : ''}`
              };
            })}
            selectedValues={normalizedTopicIds}
            onChange={(value) => onUpdate('topic_ids', value)}
            placeholder={!normalizedChapterId ? "Select unit first..." : `Select topics... (${availableTopics.length} available)`}
            disabled={isDisabled || !normalizedChapterId}
            usePortal={false}
          />
          {normalizedTopicIds.length === 0 && !isDisabled && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">At least one required</p>
          )}
          {orphanedTopics.length > 0 && (
            <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs">
              <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">⚠️ Topic Mismatch Detected</p>
              <p className="text-amber-700 dark:text-amber-300">
                The following topic(s) belong to a different unit:
              </p>
              <ul className="mt-1 space-y-0.5 text-amber-700 dark:text-amber-300">
                {orphanedTopics.map(ot => (
                  <li key={ot?.topicId} className="ml-2">
                    • <span className="font-medium">{ot?.topicName}</span> (belongs to: {ot?.actualUnitName})
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-amber-700 dark:text-amber-300 italic">
                Consider updating the unit selection or removing these topics.
              </p>
            </div>
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
