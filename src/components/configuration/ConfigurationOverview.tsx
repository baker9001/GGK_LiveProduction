// /src/components/configuration/ConfigurationOverview.tsx

import React from 'react';
import { 
  GraduationCap, Calendar, Building2, Users,
  TrendingUp, AlertCircle, CheckCircle 
} from 'lucide-react';

interface ConfigurationOverviewProps {
  schoolId?: string;
  branchId?: string;
}

export function ConfigurationOverview({ schoolId, branchId }: ConfigurationOverviewProps) {
  const [configurations, setConfigurations] = useState({
    gradeLevels: [],
    academicYears: [],
    departments: [],
    classSections: []
  });
  
  useEffect(() => {
    loadConfigurations();
  }, [schoolId, branchId]);
  
  const loadConfigurations = async () => {
    const targetId = branchId || schoolId;
    const targetType = branchId ? 'branch' : 'school';
    
    if (!targetId) return;
    
    const { data } = await ConfigurationIntegrationService.getAssignedConfigurations(
      targetId,
      targetType
    );
    
    if (data) {
      setConfigurations({
        gradeLevels: data.filter(d => d.configuration_type === 'grade_level'),
        academicYears: data.filter(d => d.configuration_type === 'academic_year'),
        departments: data.filter(d => d.configuration_type === 'department'),
        classSections: data.filter(d => d.configuration_type === 'class_section')
      });
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <GraduationCap className="w-5 h-5 text-blue-500" />
          <span className="text-2xl font-bold">{configurations.gradeLevels.length}</span>
        </div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Grade Levels</h3>
        <p className="text-xs text-gray-500 mt-1">Assigned configurations</p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <Calendar className="w-5 h-5 text-green-500" />
          <span className="text-2xl font-bold">{configurations.academicYears.length}</span>
        </div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Academic Years</h3>
        <p className="text-xs text-gray-500 mt-1">Active periods</p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <Building2 className="w-5 h-5 text-purple-500" />
          <span className="text-2xl font-bold">{configurations.departments.length}</span>
        </div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Departments</h3>
        <p className="text-xs text-gray-500 mt-1">Organizational units</p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <Users className="w-5 h-5 text-orange-500" />
          <span className="text-2xl font-bold">{configurations.classSections.length}</span>
        </div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Class Sections</h3>
        <p className="text-xs text-gray-500 mt-1">Learning groups</p>
      </div>
    </div>
  );
}