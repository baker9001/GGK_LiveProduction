import React, { useState, useEffect, useMemo } from 'react';
import { FormField, Input } from '../../../../../../components/shared/FormField';
import { SearchableMultiSelect } from '../../../../../../components/shared/SearchableMultiSelect';
import { FilterCard } from '../../../../../../components/shared/FilterCard';

interface FilterState {
  provider_ids: string[];
  subject_ids: string[];
  unit_ids: string[];
  difficulty: string[];
  validation_status: string[];
}

interface FilterSectionProps {
  providers: Array<{ id: string; name: string }>;
  subjects: Array<{ id: string; name: string; provider_id?: string }>;
  units: Array<{ id: string; name: string; subject_id?: string }>;
  searchTerm: string;
  filters: FilterState;
  resultCount?: number;
  onSearchChange: (searchTerm: string) => void;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}

export function FilterSection({
  providers,
  subjects,
  units,
  searchTerm,
  filters,
  resultCount,
  onSearchChange,
  onFilterChange,
  onClearFilters
}: FilterSectionProps) {
  const handleFilterUpdate = (key: keyof FilterState, value: string[]) => {
    const newFilters = { ...filters, [key]: value };

    // Cascade filter clearing when parent filter changes
    if (key === 'provider_ids') {
      // Clear subjects and units when provider changes
      newFilters.subject_ids = [];
      newFilters.unit_ids = [];
    } else if (key === 'subject_ids') {
      // Clear units when subject changes
      newFilters.unit_ids = [];
    }

    onFilterChange(newFilters);
  };

  // Note: In the current schema, subjects and providers are related through data_structures
  // For now, we show all subjects but disable until provider is selected
  // A full implementation would require fetching data_structures to filter properly
  const filteredSubjects = subjects;

  // Filter units based on selected subjects
  const filteredUnits = useMemo(() => {
    if (filters.subject_ids.length === 0) return units;
    return units.filter(unit =>
      unit.subject_id && filters.subject_ids.includes(unit.subject_id)
    );
  }, [units, filters.subject_ids]);

  return (
    <FilterCard
      title="Search & Filters"
      onApply={() => {}}
      onClear={onClearFilters}
    >
      <div className="space-y-4">
        <FormField id="search" label="Search">
          <Input
            id="search"
            placeholder="Search by paper code, subject, question text..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full"
          />
        </FormField>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <SearchableMultiSelect
            label="Provider"
            options={providers.map(p => ({ value: p.id, label: p.name }))}
            selectedValues={filters.provider_ids}
            onChange={(values) => handleFilterUpdate('provider_ids', values)}
            placeholder="Select providers..."
          />

          <SearchableMultiSelect
            label="Subject"
            options={filteredSubjects.map(s => ({ value: s.id, label: s.name }))}
            selectedValues={filters.subject_ids}
            onChange={(values) => handleFilterUpdate('subject_ids', values)}
            placeholder="Select subjects..."
          />

          <SearchableMultiSelect
            label="Unit"
            options={filteredUnits.map(u => ({ value: u.id, label: u.name }))}
            selectedValues={filters.unit_ids}
            onChange={(values) => handleFilterUpdate('unit_ids', values)}
            placeholder={filters.subject_ids.length === 0 ? "Select subject first..." : "Select units..."}
            disabled={filters.subject_ids.length === 0}
          />

          <SearchableMultiSelect
            label="Difficulty"
            options={[
              { value: 'easy', label: 'Easy' },
              { value: 'medium', label: 'Medium' },
              { value: 'hard', label: 'Hard' }
            ]}
            selectedValues={filters.difficulty}
            onChange={(values) => handleFilterUpdate('difficulty', values)}
            placeholder="Select difficulty..."
          />

          <SearchableMultiSelect
            label="Validation Status"
            options={[
              { value: 'complete', label: 'Complete' },
              { value: 'incomplete', label: 'Incomplete' },
              { value: 'needs-attachment', label: 'Needs Attachment' }
            ]}
            selectedValues={filters.validation_status}
            onChange={(values) => handleFilterUpdate('validation_status', values)}
            placeholder="Select validation status..."
          />
        </div>
        
        {/* Results Count */}
        {resultCount !== undefined && (
          <div className="text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
            Found {resultCount} paper{resultCount !== 1 ? 's' : ''}
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
        )}
      </div>
    </FilterCard>
  );
}