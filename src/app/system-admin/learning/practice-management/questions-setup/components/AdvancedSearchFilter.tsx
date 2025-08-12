// src/app/system-admin/learning/practice-management/questions-setup/components/AdvancedSearchFilter.tsx
import React, { useState } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../../../../../components/shared/Button';
import { Input } from '../../../../../../components/shared/FormField';
import { cn } from '../../../../../../lib/utils';

interface FilterOptions {
  status: string;
  provider: string;
  subject: string;
  difficulty: string;
  questionType: string;
  marksRange: [number, number];
  hasAttachments: boolean | null;
  validationStatus: string;
  dateRange: [Date | null, Date | null];
}

interface AdvancedSearchFilterProps {
  onSearch: (searchTerm: string) => void;
  onFilterChange: (filters: FilterOptions) => void;
  providers: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  resultCount?: number;
}

export function AdvancedSearchFilter({
  onSearch,
  onFilterChange,
  providers,
  subjects,
  resultCount
}: AdvancedSearchFilterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    provider: 'all',
    subject: 'all',
    difficulty: 'all',
    questionType: 'all',
    marksRange: [0, 100],
    hasAttachments: null,
    validationStatus: 'all',
    dateRange: [null, null]
  });
  
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };
  
  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
    
    // Count active filters
    let count = 0;
    if (newFilters.status !== 'all') count++;
    if (newFilters.provider !== 'all') count++;
    if (newFilters.subject !== 'all') count++;
    if (newFilters.difficulty !== 'all') count++;
    if (newFilters.questionType !== 'all') count++;
    if (newFilters.hasAttachments !== null) count++;
    if (newFilters.validationStatus !== 'all') count++;
    if (newFilters.dateRange[0] || newFilters.dateRange[1]) count++;
    if (newFilters.marksRange[0] > 0 || newFilters.marksRange[1] < 100) count++;
    
    setActiveFilterCount(count);
  };
  
  const resetFilters = () => {
    const defaultFilters: FilterOptions = {
      status: 'all',
      provider: 'all',
      subject: 'all',
      difficulty: 'all',
      questionType: 'all',
      marksRange: [0, 100],
      hasAttachments: null,
      validationStatus: 'all',
      dateRange: [null, null]
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
    setActiveFilterCount(0);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      {/* Main Search Bar */}
      <div className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by paper code, subject, question text..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              leftIcon={<Filter className="h-4 w-4" />}
              rightIcon={showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              className={cn(
                activeFilterCount > 0 && "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              )}
            >
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </div>
        
        {/* Results Count */}
        {resultCount !== undefined && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Found {resultCount} paper{resultCount !== 1 ? 's' : ''}
            {searchTerm && ` matching "${searchTerm}"`}
            {activeFilterCount > 0 && ` with ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} applied`}
          </div>
        )}
      </div>
      
      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Paper Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="qa_review">QA Review</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            
            {/* Provider Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Provider
              </label>
              <select
                value={filters.provider}
                onChange={(e) => handleFilterChange('provider', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Providers</option>
                {providers.map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Subject Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject
              </label>
              <select
                value={filters.subject}
                onChange={(e) => handleFilterChange('subject', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Difficulty Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Difficulty
              </label>
              <select
                value={filters.difficulty}
                onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            
            {/* Question Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Question Type
              </label>
              <select
                value={filters.questionType}
                onChange={(e) => handleFilterChange('questionType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="mcq">Multiple Choice</option>
                <option value="tf">True/False</option>
                <option value="descriptive">Descriptive</option>
              </select>
            </div>
            
            {/* Validation Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Validation Status
              </label>
              <select
                value={filters.validationStatus}
                onChange={(e) => handleFilterChange('validationStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All</option>
                <option value="complete">Complete</option>
                <option value="incomplete">Incomplete</option>
                <option value="needs-attachment">Needs Attachment</option>
              </select>
            </div>
            
            {/* Attachment Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Attachments
              </label>
              <select
                value={filters.hasAttachments === null ? 'all' : filters.hasAttachments ? 'yes' : 'no'}
                onChange={(e) => handleFilterChange('hasAttachments', 
                  e.target.value === 'all' ? null : e.target.value === 'yes'
                )}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All</option>
                <option value="yes">Has Attachments</option>
                <option value="no">No Attachments</option>
              </select>
            </div>
            
            {/* Marks Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Marks Range
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={filters.marksRange[0]}
                  onChange={(e) => handleFilterChange('marksRange', [parseInt(e.target.value) || 0, filters.marksRange[1]])}
                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Min"
                  min="0"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  value={filters.marksRange[1]}
                  onChange={(e) => handleFilterChange('marksRange', [filters.marksRange[0], parseInt(e.target.value) || 100])}
                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Max"
                  min="0"
                />
              </div>
            </div>
          </div>
          
          {/* Reset Filters */}
          {activeFilterCount > 0 && (
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                leftIcon={<X className="h-3 w-3" />}
              >
                Reset All Filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}