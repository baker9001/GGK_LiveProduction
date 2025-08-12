// /src/app/entity-module/organisation/page.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, Users, MapPin, Edit, ChevronDown, ChevronRight,
  Plus, X, Save, Trash2, School, Briefcase, GraduationCap,
  Calendar, BookOpen, Grid3x3, Search, Filter, Settings,
  ChevronUp, Activity, TrendingUp, UserCheck, AlertCircle, Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { toast } from '../../../components/shared/Toast';
import { Button } from '../../../components/shared/Button';

// Types
interface Organisation {
  id: string;
  parent_id: string | null;
  company_id: string;
  name: string;
  code: string;
  type: 'headquarters' | 'region' | 'school' | 'branch' | 'department' | 'division';
  status: 'active' | 'inactive';
  employee_count: number;
  student_count?: number;
  teacher_count?: number;
  address?: string;
  city?: string;
  country?: string;
  manager_name?: string;
  manager_title?: string;
  color_theme?: string;
  icon_type?: string;
  description?: string;
  created_at: string;
  children?: Organisation[];
}

interface Department {
  id: string;
  organisation_id: string;
  name: string;
  code: string;
  head_of_department?: string;
  employee_count: number;
  status: 'active' | 'inactive';
}

interface Position {
  id: string;
  organisation_id: string;
  department_id?: string;
  title: string;
  level: number;
  reports_to?: string;
  employee_count: number;
}

interface Grade {
  id: string;
  school_id: string;
  name: string;
  level: number;
  student_count: number;
  sections: Section[];
}

interface Section {
  id: string;
  grade_id: string;
  name: string;
  capacity: number;
  current_students: number;
  class_teacher?: string;
  room_number?: string;
  building?: string;
}

// Color themes for different org types
const orgThemes = {
  headquarters: { bg: 'bg-blue-500', light: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-600' },
  region: { bg: 'bg-indigo-500', light: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-600' },
  school: { bg: 'bg-green-500', light: 'bg-green-50', border: 'border-green-500', text: 'text-green-600' },
  branch: { bg: 'bg-purple-500', light: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-600' },
  department: { bg: 'bg-orange-500', light: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-600' },
  division: { bg: 'bg-pink-500', light: 'bg-pink-50', border: 'border-pink-500', text: 'text-pink-600' }
};

// Icon mapping for org types
const getOrgIcon = (type: string) => {
  switch (type) {
    case 'headquarters': return Building2;
    case 'region': return MapPin;
    case 'school': return School;
    case 'branch': return Building2;
    case 'department': return Briefcase;
    case 'division': return Grid3x3;
    default: return Building2;
  }
};

export default function OrganisationManagement() {
  const queryClient = useQueryClient();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organisation | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDepartments, setShowDepartments] = useState(false);
  const [showPositions, setShowPositions] = useState(false);
  const [showGrades, setShowGrades] = useState(false);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  // Fetch user's company ID
  useEffect(() => {
    const fetchUserCompany = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: entityUser } = await supabase
            .from('entity_users')
            .select('company_id')
            .eq('user_id', user.id)
            .single();
          
          if (entityUser) {
            setUserCompanyId(entityUser.company_id);
          }
        }
      } catch (error) {
        console.error('Error fetching user company:', error);
      }
    };
    
    fetchUserCompany();
  }, []);

  // Fetch organisation hierarchy
  const { data: organisations, isLoading, error: orgError, refetch } = useQuery<Organisation[]>(
    ['organisations', userCompanyId],
    async () => {
      if (!userCompanyId) {
        throw new Error('No company associated with user');
      }

      // Fetch organisation hierarchy from database
      const { data, error } = await supabase
        .from('organisation_units')
        .select('*')
        .eq('company_id', userCompanyId)
        .order('parent_id', { ascending: true })
        .order('name');

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Build hierarchy
      const buildHierarchy = (items: any[], parentId: string | null = null): Organisation[] => {
        return items
          .filter(item => item.parent_id === parentId)
          .map(item => ({
            ...item,
            children: buildHierarchy(items, item.id)
          }));
      };

      const hierarchy = buildHierarchy(data);
      
      // Auto-expand root nodes
      if (hierarchy.length > 0) {
        setExpandedNodes(new Set(hierarchy.map(org => org.id)));
      }
      
      return hierarchy;
    },
    {
      enabled: !!userCompanyId,
      retry: 2,
      refetchOnWindowFocus: false
    }
  );

  // Fetch departments for selected org
  const { data: departments, isLoading: loadingDepts } = useQuery<Department[]>(
    ['departments', selectedOrg?.id],
    async () => {
      if (!selectedOrg) return [];
      
      const { data, error } = await supabase
        .from('organisation_departments')
        .select('*')
        .eq('organisation_id', selectedOrg.id)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    { 
      enabled: !!selectedOrg && showDepartments,
      retry: 1
    }
  );

  // Fetch positions for selected org
  const { data: positions, isLoading: loadingPositions } = useQuery<Position[]>(
    ['positions', selectedOrg?.id],
    async () => {
      if (!selectedOrg) return [];
      
      const { data, error } = await supabase
        .from('organisation_positions')
        .select('*')
        .eq('organisation_id', selectedOrg.id)
        .order('level', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    { 
      enabled: !!selectedOrg && showPositions,
      retry: 1
    }
  );

  // Fetch grades for school
  const { data: grades, isLoading: loadingGrades } = useQuery<Grade[]>(
    ['grades', selectedOrg?.id],
    async () => {
      if (!selectedOrg || selectedOrg.type !== 'school') return [];
      
      const { data: gradesData, error: gradesError } = await supabase
        .from('school_grades')
        .select('*')
        .eq('school_id', selectedOrg.id)
        .order('level');

      if (gradesError) throw gradesError;
      if (!gradesData || gradesData.length === 0) return [];

      // Fetch sections for each grade
      const gradesWithSections = await Promise.all(
        gradesData.map(async (grade) => {
          const { data: sections } = await supabase
            .from('grade_sections')
            .select('*')
            .eq('grade_id', grade.id)
            .order('name');

          return {
            ...grade,
            sections: sections || []
          };
        })
      );

      return gradesWithSections;
    },
    { 
      enabled: !!selectedOrg && selectedOrg.type === 'school' && showGrades,
      retry: 1
    }
  );

  // Create new organisation mutation
  const createOrgMutation = useMutation(
    async (orgData: Partial<Organisation>) => {
      const { data, error } = await supabase
        .from('organisation_units')
        .insert([{
          ...orgData,
          company_id: userCompanyId
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['organisations']);
        toast.success('Organisation created successfully');
        setShowModal(false);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create organisation');
      }
    }
  );

  // Update organisation mutation
  const updateOrgMutation = useMutation(
    async ({ id, ...updates }: Partial<Organisation>) => {
      const { data, error } = await supabase
        .from('organisation_units')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['organisations']);
        toast.success('Organisation updated successfully');
        setEditMode(false);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update organisation');
      }
    }
  );

  // Delete organisation mutation
  const deleteOrgMutation = useMutation(
    async (id: string) => {
      const { error } = await supabase
        .from('organisation_units')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['organisations']);
        toast.success('Organisation deleted successfully');
        setShowDetailsPanel(false);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to delete organisation');
      }
    }
  );

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const handleOrgClick = (org: Organisation) => {
    setSelectedOrg(org);
    setShowDetailsPanel(true);
    setEditMode(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this organisation and all its sub-units? This action cannot be undone.')) {
      deleteOrgMutation.mutate(id);
    }
  };

  // Organisation Card Component
  const OrgCard: React.FC<{ org: Organisation; level: number }> = ({ org, level }) => {
    const isExpanded = expandedNodes.has(org.id);
    const hasChildren = org.children && org.children.length > 0;
    const theme = orgThemes[org.type] || orgThemes.department;
    const Icon = getOrgIcon(org.type);

    return (
      <div className="org-node">
        <div className={`
          org-card group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 
          ${selectedOrg?.id === org.id ? theme.border : 'border-gray-200 dark:border-gray-700'}
          hover:shadow-lg transition-all duration-200 cursor-pointer
          ${level === 0 ? 'min-w-[300px]' : 'min-w-[250px]'}
        `}
        onClick={() => handleOrgClick(org)}>
          {/* Color bar at top */}
          <div className={`h-1 ${theme.bg} rounded-t-lg`} />
          
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${theme.light} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${theme.text}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {org.name}
                  </h3>
                  {org.manager_name && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {org.manager_name}
                    </p>
                  )}
                  {org.manager_title && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {org.manager_title}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOrgClick(org);
                  setEditMode(true);
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-all"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>

            {/* Stats */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">
                {org.employee_count || 0}
              </span> Employees
              {org.student_count && (
                <span className="ml-3">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {org.student_count}
                  </span> Students
                </span>
              )}
            </div>

            {/* Expand indicator */}
            {hasChildren && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNode(org.id);
                  }}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>{org.children?.length} sub-units</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="org-children mt-8 ml-12 relative">
            {/* Connection line */}
            <div 
              className="absolute bg-gray-300 dark:bg-gray-600" 
              style={{ 
                top: '-2rem',
                left: '50%',
                width: '2px',
                height: '2rem',
                transform: 'translateX(-50%)'
              }}
            />
            
            <div className="flex gap-6 relative">
              {/* Horizontal connection line */}
              {org.children!.length > 1 && (
                <div 
                  className="absolute bg-gray-300 dark:bg-gray-600" 
                  style={{ 
                    top: '-1px',
                    left: '0',
                    right: '0',
                    height: '2px'
                  }}
                />
              )}
              
              {org.children!.map((child) => (
                <div key={child.id} className="relative">
                  {/* Vertical connection from horizontal line to card */}
                  <div 
                    className="absolute bg-gray-300 dark:bg-gray-600" 
                    style={{ 
                      left: '50%',
                      top: '-8px',
                      width: '2px',
                      height: '8px',
                      transform: 'translateX(-50%)'
                    }}
                  />
                  <OrgCard org={child} level={level + 1} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Details Panel Component
  const DetailsPanel = () => {
    if (!selectedOrg) return null;

    const theme = orgThemes[selectedOrg.type] || orgThemes.department;
    const Icon = getOrgIcon(selectedOrg.type);

    return (
      <div className={`
        fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-xl 
        transform transition-transform duration-300 z-50
        ${showDetailsPanel ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className={`p-6 border-b dark:border-gray-700 ${theme.light}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${theme.bg} rounded-lg flex items-center justify-center`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedOrg.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedOrg.code}</p>
              </div>
            </div>
            <button
              onClick={() => setShowDetailsPanel(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Basic Info */}
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Organisation Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Type</span>
                  <span className="text-sm font-medium capitalize">{selectedOrg.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    selectedOrg.status === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                  }`}>
                    {selectedOrg.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Employees</span>
                  <span className="text-sm font-medium">{selectedOrg.employee_count || 0}</span>
                </div>
                {selectedOrg.student_count !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Students</span>
                    <span className="text-sm font-medium">{selectedOrg.student_count}</span>
                  </div>
                )}
                {selectedOrg.teacher_count !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Teachers</span>
                    <span className="text-sm font-medium">{selectedOrg.teacher_count}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            {(selectedOrg.address || selectedOrg.city || selectedOrg.country) && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Location
                </h3>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedOrg.address && <p>{selectedOrg.address}</p>}
                  {(selectedOrg.city || selectedOrg.country) && (
                    <p>{[selectedOrg.city, selectedOrg.country].filter(Boolean).join(', ')}</p>
                  )}
                </div>
              </div>
            )}

            {/* Management */}
            {(selectedOrg.manager_name || selectedOrg.manager_title) && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Management
                </h3>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedOrg.manager_name && <p className="font-medium">{selectedOrg.manager_name}</p>}
                  {selectedOrg.manager_title && <p className="text-gray-500">{selectedOrg.manager_title}</p>}
                </div>
              </div>
            )}

            {/* Tabs for Departments, Positions, Grades */}
            <div className="border-t dark:border-gray-700 pt-4">
              <div className="flex gap-2 mb-4">
                {selectedOrg.type !== 'school' ? (
                  <>
                    <button
                      onClick={() => {
                        setShowDepartments(!showDepartments);
                        setShowPositions(false);
                        setShowGrades(false);
                      }}
                      className={`flex-1 px-3 py-2 text-xs rounded-lg transition ${
                        showDepartments 
                          ? `${theme.bg} text-white` 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Departments
                    </button>
                    <button
                      onClick={() => {
                        setShowPositions(!showPositions);
                        setShowDepartments(false);
                        setShowGrades(false);
                      }}
                      className={`flex-1 px-3 py-2 text-xs rounded-lg transition ${
                        showPositions 
                          ? `${theme.bg} text-white` 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Positions
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setShowGrades(!showGrades);
                      setShowDepartments(false);
                      setShowPositions(false);
                    }}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg transition ${
                      showGrades 
                        ? `${theme.bg} text-white` 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Grades & Classes
                  </button>
                )}
              </div>

              {/* Departments List */}
              {showDepartments && (
                <div className="space-y-2">
                  {loadingDepts ? (
                    <div className="text-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                    </div>
                  ) : departments && departments.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">Departments ({departments.length})</h4>
                        <button className="text-xs text-blue-600 hover:text-blue-700">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {departments.map(dept => (
                        <div key={dept.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{dept.name}</p>
                              <p className="text-xs text-gray-500">{dept.code}</p>
                              {dept.head_of_department && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Head: {dept.head_of_department}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {dept.employee_count} employees
                            </span>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No departments found</p>
                  )}
                </div>
              )}

              {/* Positions List */}
              {showPositions && (
                <div className="space-y-2">
                  {loadingPositions ? (
                    <div className="text-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                    </div>
                  ) : positions && positions.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">Positions ({positions.length})</h4>
                        <button className="text-xs text-blue-600 hover:text-blue-700">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {positions.map(position => (
                        <div key={position.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{position.title}</p>
                              <p className="text-xs text-gray-500">Level {position.level}</p>
                            </div>
                            <span className="text-xs text-gray-500">
                              {position.employee_count} employees
                            </span>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No positions found</p>
                  )}
                </div>
              )}

              {/* Grades List */}
              {showGrades && (
                <div className="space-y-2">
                  {loadingGrades ? (
                    <div className="text-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                    </div>
                  ) : grades && grades.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">Grades & Classes ({grades.length})</h4>
                        <button className="text-xs text-blue-600 hover:text-blue-700">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {grades.map(grade => (
                        <div key={grade.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          <div className="mb-2">
                            <p className="font-medium text-sm">{grade.name}</p>
                            <p className="text-xs text-gray-500">
                              {grade.student_count} students • {grade.sections.length} sections
                            </p>
                          </div>
                          {grade.sections.length > 0 && (
                            <div className="space-y-1 ml-3 border-l-2 border-gray-200 dark:border-gray-600 pl-3">
                              {grade.sections.map(section => (
                                <div key={section.id} className="flex justify-between text-xs">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Section {section.name}
                                    {section.class_teacher && (
                                      <span className="text-gray-500 ml-2">
                                        ({section.class_teacher})
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-gray-500">
                                    {section.current_students}/{section.capacity} students
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No grades found</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t dark:border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (editMode) {
                  updateOrgMutation.mutate(selectedOrg);
                } else {
                  setEditMode(true);
                }
              }}
              className={`flex-1 px-4 py-2 ${theme.bg} text-white rounded-lg hover:opacity-90 transition`}
            >
              {editMode ? 'Save Changes' : 'Edit Organisation'}
            </button>
            <button
              onClick={() => handleDelete(selectedOrg.id)}
              className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (!userCompanyId || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {!userCompanyId ? 'Identifying your company...' : 'Loading organisation structure...'}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (orgError && !organisations) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Unable to Load Organisation Data
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {orgError.message || 'An error occurred while loading your organisation structure.'}
          </p>
          <Button onClick={() => refetch()} variant="primary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Organisation Management
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage organizational structure, hierarchies, and relationships
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  setEditingOrg(null);
                  setShowModal(true);
                }}
                leftIcon={<Plus className="w-4 h-4" />}
                variant="primary"
              >
                Add Organisation
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Organisation Chart */}
      <div className="p-6 overflow-x-auto">
        <div className="inline-block min-w-full">
          {organisations && organisations.length > 0 ? (
            <div className="flex flex-col items-center">
              {organisations.map(org => (
                <OrgCard key={org.id} org={org} level={0} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Organisations Found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Start building your organisation structure by adding your first unit
              </p>
              <Button
                onClick={() => {
                  setEditingOrg(null);
                  setShowModal(true);
                }}
                leftIcon={<Plus className="w-4 h-4" />}
                variant="primary"
              >
                Create First Organisation
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Details Panel */}
      <DetailsPanel />

      {/* Add/Edit Modal - Placeholder for now */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingOrg ? 'Edit Organisation' : 'Add Organisation'}
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 dark:text-gray-400">
                Organisation form will be implemented here
              </p>
            </div>
            <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3">
              <Button
                onClick={() => {
                  setShowModal(false);
                  setEditingOrg(null);
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Implement save logic
                  setShowModal(false);
                }}
                variant="primary"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}