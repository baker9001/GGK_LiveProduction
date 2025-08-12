import React, { useState, useEffect } from 'react';
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
  subjects: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string }>;
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
    onFilterChange(newFilters);
  };

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
            options={subjects.map(s => ({ value: s.id, label: s.name }))}
            selectedValues={filters.subject_ids}
            onChange={(values) => handleFilterUpdate('subject_ids', values)}
            placeholder="Select subjects..."
          />

          <SearchableMultiSelect
            label="Unit"
            options={units.map(u => ({ value: u.id, label: u.name }))}
            selectedValues={filters.unit_ids}
            onChange={(values) => handleFilterUpdate('unit_ids', values)}
            placeholder="Select units..."
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