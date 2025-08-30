// /src/components/configuration/ConfigurationAssignmentWidget.tsx

import React, { useState, useEffect } from 'react';
import { Link2, School, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { SearchableMultiSelect } from '@/components/shared/SearchableMultiSelect';
import { ConfigurationIntegrationService } from '@/services/configurationIntegrationService';
import { toast } from '@/components/shared/Toast';

interface ConfigurationAssignmentWidgetProps {
  configurationType: 'grade_level' | 'academic_year' | 'department' | 'class_section';
  configurationId: string;
  configurationName: string;
  companyId: string;
}

export function ConfigurationAssignmentWidget({
  configurationType,
  configurationId,
  configurationName,
  companyId
}: ConfigurationAssignmentWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [schools, setSchools] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [usageCount, setUsageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    loadUsageStats();
  }, [configurationId]);
  
  const loadUsageStats = async () => {
    const { count } = await ConfigurationIntegrationService.getConfigurationUsage(
      configurationId,
      configurationType
    );
    setUsageCount(count);
  };
  
  const handleAssign = async () => {
    setIsLoading(true);
    
    try {
      const assignments = [];
      
      if (selectedSchools.length > 0) {
        assignments.push({
          configurationType,
          configurationIds: [configurationId],
          targetType: 'school' as const,
          targetIds: selectedSchools
        });
      }
      
      if (selectedBranches.length > 0) {
        assignments.push({
          configurationType,
          configurationIds: [configurationId],
          targetType: 'branch' as const,
          targetIds: selectedBranches
        });
      }
      
      const results = await ConfigurationIntegrationService.bulkAssign(assignments);
      
      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        toast.error(`Failed to assign to ${errors.length} targets`);
      } else {
        toast.success('Configuration assigned successfully');
        setIsOpen(false);
        loadUsageStats();
      }
    } catch (error) {
      toast.error('Failed to assign configuration');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-blue-500" />
          <h4 className="font-medium text-gray-900 dark:text-white">Assignments</h4>
        </div>
        <div className="flex items-center gap-2">
          {usageCount > 0 && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              Used in {usageCount} location{usageCount !== 1 ? 's' : ''}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
          >
            Manage
          </Button>
        </div>
      </div>
      
      {isOpen && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assign to Schools
            </label>
            <SearchableMultiSelect
              options={schools}
              value={selectedSchools}
              onChange={setSelectedSchools}
              placeholder="Select schools..."
              displayKey="name"
              valueKey="id"
              icon={<School className="w-4 h-4" />}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assign to Branches
            </label>
            <SearchableMultiSelect
              options={branches}
              value={selectedBranches}
              onChange={setSelectedBranches}
              placeholder="Select branches..."
              displayKey="name"
              valueKey="id"
              icon={<MapPin className="w-4 h-4" />}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAssign}
              loading={isLoading}
              disabled={selectedSchools.length === 0 && selectedBranches.length === 0}
            >
              Apply Assignments
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}