// src/app/entity-module/organisation/page.tsx

import React, { useState, useEffect } from 'react';
import { 
  Building2, School, MapPin, Edit, ChevronDown, ChevronRight,
  Plus, X, Save, Trash2, Briefcase, GraduationCap,
  Calendar, Users, Search, Filter, Settings,
  Activity, AlertCircle, Loader2, Phone, Mail,
  Globe, Home, Hash, Clock, User
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';

// ===== TYPE DEFINITIONS =====
interface Company {
  id: string;
  name: string;
  code: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  // Additional fields
  additional?: CompanyAdditional;
  schools?: SchoolData[];
}

interface CompanyAdditional {
  id?: string;
  company_id: string;
  organization_type?: 'education_group' | 'single_institution' | 'franchise' | 'partnership';
  fiscal_year_start?: number;
  main_phone?: string;
  main_email?: string;
  website?: string;
  head_office_address?: string;
  head_office_city?: string;
  head_office_country?: string;
  registration_number?: string;
  tax_id?: string;
  logo_url?: string;
}

interface SchoolData {
  id: string;
  name: string;
  code: string;
  company_id: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  additional?: SchoolAdditional;
  branches?: BranchData[];
}

interface SchoolAdditional {
  id?: string;
  school_id: string;
  school_type?: 'primary' | 'secondary' | 'other';
  curriculum_type?: string[];
  total_capacity?: number;
  teachers_count?: number;
  principal_name?: string;
  principal_email?: string;
  principal_phone?: string;
  campus_address?: string;
  campus_city?: string;
  campus_state?: string;
  campus_postal_code?: string;
  latitude?: number;
  longitude?: number;
  established_date?: string;
  academic_year_start?: number;
  academic_year_end?: number;
  has_library?: boolean;
  has_laboratory?: boolean;
  has_sports_facilities?: boolean;
  has_cafeteria?: boolean;
}

interface BranchData {
  id: string;
  name: string;
  code: string;
  school_id: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  additional?: BranchAdditional;
}

interface BranchAdditional {
  id?: string;
  branch_id: string;
  student_capacity?: number;
  current_students?: number;
  teachers_count?: number;
  branch_head_name?: string;
  branch_head_email?: string;
  branch_head_phone?: string;
  building_name?: string;
  floor_details?: string;
  opening_time?: string;
  closing_time?: string;
  working_days?: string[];
}

interface Department {
  id: string;
  company_id: string;
  school_id?: string;
  branch_id?: string;
  name: string;
  code: string;
  department_type?: 'academic' | 'administrative' | 'support' | 'operations';
  parent_department_id?: string;
  head_of_department?: string;
  head_email?: string;
  employee_count: number;
  status: 'active' | 'inactive';
}

interface AcademicYear {
  id: string;
  school_id: string;
  year_name: string;
  start_date: string;
  end_date: string;
  total_terms: number;
  current_term?: number;
  is_current: boolean;
  status: 'planned' | 'active' | 'completed';
}

// ===== MAIN COMPONENT =====
export default function OrganisationManagement() {
  const queryClient = useQueryClient();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<'company' | 'school' | 'branch' | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'school' | 'branch' | 'department' | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<Company | null>(null);

  // Tab states for detail panel
  const [activeTab, setActiveTab] = useState<'details' | 'departments' | 'academic'>('details');

  // Form states
  const [formData, setFormData] = useState<any>({});

  // ===== FETCH USER'S COMPANY =====
  useEffect(() => {
    const fetchUserCompany = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: entityUser } = await supabase
            .from('entity_users')
            .select('company_id, is_company_admin')
            .eq('user_id', user.id)
            .single();
          
          if (entityUser && entityUser.company_id) {
            setUserCompanyId(entityUser.company_id);
          }
        }
      } catch (error) {
        console.error('Error fetching user company:', error);
        toast.error('Failed to identify your company');
      }
    };
    
    fetchUserCompany();
  }, []);

  // ===== FETCH ORGANIZATION DATA =====
  const { data: organizationData, isLoading, error, refetch } = useQuery(
    ['organization', userCompanyId],
    async () => {
      if (!userCompanyId) {
        throw new Error('No company associated with user');
      }

      // Fetch company data
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userCompanyId)
        .single();

      if (companyError) throw companyError;

      // Fetch company additional data
      const { data: companyAdditional } = await supabase
        .from('companies_additional')
        .select('*')
        .eq('company_id', userCompanyId)
        .single();

      // Fetch schools
      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .eq('company_id', userCompanyId)
        .order('name');

      if (schoolsError) throw schoolsError;

      // Fetch schools additional data and branches for each school
      const schoolsWithDetails = await Promise.all(
        (schools || []).map(async (school) => {
          const { data: schoolAdditional } = await supabase
            .from('schools_additional')
            .select('*')
            .eq('school_id', school.id)
            .single();

          const { data: branches } = await supabase
            .from('branches')
            .select('*')
            .eq('school_id', school.id)
            .order('name');

          // Fetch branch additional data
          const branchesWithDetails = await Promise.all(
            (branches || []).map(async (branch) => {
              const { data: branchAdditional } = await supabase
                .from('branches_additional')
                .select('*')
                .eq('branch_id', branch.id)
                .single();

              return {
                ...branch,
                additional: branchAdditional
              };
            })
          );

          return {
            ...school,
            additional: schoolAdditional,
            branches: branchesWithDetails
          };
        })
      );

      const fullCompanyData: Company = {
        ...company,
        additional: companyAdditional,
        schools: schoolsWithDetails
      };

      setCompanyData(fullCompanyData);
      
      // Auto-expand company node
      setExpandedNodes(new Set([company.id]));
      
      return fullCompanyData;
    },
    {
      enabled: !!userCompanyId,
      retry: 2,
      refetchOnWindowFocus: false
    }
  );

  // ===== FETCH DEPARTMENTS =====
  const { data: departments } = useQuery(
    ['departments', selectedItem?.id, selectedType],
    async () => {
      if (!selectedItem) return [];
      
      let query = supabase.from('entity_departments').select('*');
      
      if (selectedType === 'company') {
        query = query.eq('company_id', selectedItem.id).is('school_id', null).is('branch_id', null);
      } else if (selectedType === 'school') {
        query = query.eq('school_id', selectedItem.id);
      } else if (selectedType === 'branch') {
        query = query.eq('branch_id', selectedItem.id);
      }
      
      const { data, error } = await query.order('name');
      
      if (error) throw error;
      return data || [];
    },
    {
      enabled: !!selectedItem && activeTab === 'departments'
    }
  );

  // ===== FETCH ACADEMIC YEARS =====
  const { data: academicYears } = useQuery(
    ['academicYears', selectedItem?.id],
    async () => {
      if (!selectedItem || selectedType !== 'school') return [];
      
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', selectedItem.id)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    {
      enabled: selectedType === 'school' && activeTab === 'academic'
    }
  );

  // ===== MUTATIONS =====
  
  // Update Company Additional Info
  const updateCompanyMutation = useMutation(
    async (data: CompanyAdditional) => {
      const { data: existing } = await supabase
        .from('companies_additional')
        .select('id')
        .eq('company_id', data.company_id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('companies_additional')
          .update(data)
          .eq('company_id', data.company_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('companies_additional')
          .insert([data]);
        if (error) throw error;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['organization']);
        toast.success('Company information updated successfully');
        setEditMode(false);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update company information');
      }
    }
  );

  // Create School
  const createSchoolMutation = useMutation(
    async (data: Partial<SchoolData>) => {
      const { data: school, error } = await supabase
        .from('schools')
        .insert([{
          name: data.name,
          code: data.code,
          company_id: userCompanyId,
          description: data.description,
          status: data.status || 'active'
        }])
        .select()
        .single();

      if (error) throw error;

      // Insert additional data if provided
      if (data.additional) {
        await supabase
          .from('schools_additional')
          .insert([{
            ...data.additional,
            school_id: school.id
          }]);
      }

      return school;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['organization']);
        toast.success('School created successfully');
        setShowModal(false);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create school');
      }
    }
  );

  // Create Branch
  const createBranchMutation = useMutation(
    async (data: Partial<BranchData>) => {
      const { data: branch, error } = await supabase
        .from('branches')
        .insert([{
          name: data.name,
          code: data.code,
          school_id: data.school_id,
          description: data.description,
          status: data.status || 'active'
        }])
        .select()
        .single();

      if (error) throw error;

      // Insert additional data if provided
      if (data.additional) {
        await supabase
          .from('branches_additional')
          .insert([{
            ...data.additional,
            branch_id: branch.id
          }]);
      }

      return branch;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['organization']);
        toast.success('Branch created successfully');
        setShowModal(false);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create branch');
      }
    }
  );

  // Create Department
  const createDepartmentMutation = useMutation(
    async (data: Partial<Department>) => {
      const { error } = await supabase
        .from('entity_departments')
        .insert([data]);

      if (error) throw error;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['departments']);
        toast.success('Department created successfully');
        setShowModal(false);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create department');
      }
    }
  );

  // ===== UI HELPER FUNCTIONS =====
  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const handleItemClick = (item: any, type: 'company' | 'school' | 'branch') => {
    setSelectedItem(item);
    setSelectedType(type);
    setShowDetailsPanel(true);
    setEditMode(false);
    setActiveTab('details');
    setFormData(item.additional || {});
  };

  const handleSaveDetails = () => {
    if (selectedType === 'company') {
      updateCompanyMutation.mutate({
        ...formData,
        company_id: selectedItem.id
      });
    }
    // Add similar handlers for school and branch updates
  };

  // ===== RENDER ORGANIZATION TREE =====
  const renderOrganizationTree = () => {
    if (!companyData) return null;

    return (
      <div className="space-y-2">
        {/* Company Level */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => handleItemClick(companyData, 'company')}
          >
            <div className="flex items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(companyData.id);
                }}
                className="mr-2"
              >
                {expandedNodes.has(companyData.id) ? 
                  <ChevronDown className="w-5 h-5" /> : 
                  <ChevronRight className="w-5 h-5" />
                }
              </button>
              <Building2 className="w-5 h-5 text-blue-500 mr-3" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {companyData.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {companyData.code} • {companyData.schools?.length || 0} schools
                </p>
              </div>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${
              companyData.status === 'active' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {companyData.status}
            </span>
          </div>

          {/* Schools */}
          {expandedNodes.has(companyData.id) && companyData.schools && (
            <div className="ml-8 mt-4 space-y-2">
              {companyData.schools.map((school) => (
                <div key={school.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => handleItemClick(school, 'school')}
                  >
                    <div className="flex items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNode(school.id);
                        }}
                        className="mr-2"
                      >
                        {expandedNodes.has(school.id) ? 
                          <ChevronDown className="w-4 h-4" /> : 
                          <ChevronRight className="w-4 h-4" />
                        }
                      </button>
                      <School className="w-4 h-4 text-green-500 mr-2" />
                      <div>
                        <h4 className="font-medium text-gray-800 dark:text-gray-200">
                          {school.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {school.code} • {school.branches?.length || 0} branches
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      school.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {school.status}
                    </span>
                  </div>

                  {/* Branches */}
                  {expandedNodes.has(school.id) && school.branches && (
                    <div className="ml-8 mt-3 space-y-2">
                      {school.branches.map((branch) => (
                        <div 
                          key={branch.id} 
                          className="border border-gray-50 dark:border-gray-600 rounded-lg p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                          onClick={() => handleItemClick(branch, 'branch')}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 text-purple-500 mr-2" />
                              <div>
                                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {branch.name}
                                </h5>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {branch.code}
                                </p>
                              </div>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              branch.status === 'active' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {branch.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Add School Button */}
              <button
                onClick={() => {
                  setModalType('school');
                  setShowModal(true);
                }}
                className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-green-500 hover:text-green-500 transition flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add School
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===== RENDER DETAILS PANEL =====
  const renderDetailsPanel = () => {
    if (!selectedItem || !showDetailsPanel) return null;

    return (
      <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {selectedType === 'company' ? 'Company' : selectedType === 'school' ? 'School' : 'Branch'} Details
            </h2>
            <button
              onClick={() => setShowDetailsPanel(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex mt-4 space-x-4 border-b dark:border-gray-700">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-2 px-1 ${activeTab === 'details' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400'}`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('departments')}
              className={`pb-2 px-1 ${activeTab === 'departments' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400'}`}
            >
              Departments
            </button>
            {selectedType === 'school' && (
              <button
                onClick={() => setActiveTab('academic')}
                className={`pb-2 px-1 ${activeTab === 'academic' 
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400'}`}
              >
                Academic
              </button>
            )}
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Basic Information</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Name</label>
                    <p className="text-gray-900 dark:text-white">{selectedItem.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Code</label>
                    <p className="text-gray-900 dark:text-white">{selectedItem.code}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Status</label>
                    <p className="text-gray-900 dark:text-white capitalize">{selectedItem.status}</p>
                  </div>
                </div>
              </div>

              {/* Additional Info Form */}
              {selectedType === 'company' && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Contact Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Main Phone</label>
                      {editMode ? (
                        <input
                          type="text"
                          value={formData.main_phone || ''}
                          onChange={(e) => setFormData({...formData, main_phone: e.target.value})}
                          className="w-full px-3 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white">
                          {selectedItem.additional?.main_phone || 'Not set'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Main Email</label>
                      {editMode ? (
                        <input
                          type="email"
                          value={formData.main_email || ''}
                          onChange={(e) => setFormData({...formData, main_email: e.target.value})}
                          className="w-full px-3 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white">
                          {selectedItem.additional?.main_email || 'Not set'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Website</label>
                      {editMode ? (
                        <input
                          type="text"
                          value={formData.website || ''}
                          onChange={(e) => setFormData({...formData, website: e.target.value})}
                          className="w-full px-3 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white">
                          {selectedItem.additional?.website || 'Not set'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                {editMode ? (
                  <>
                    <button
                      onClick={handleSaveDetails}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Save className="w-4 h-4 inline mr-2" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setFormData(selectedItem.additional || {});
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <Edit className="w-4 h-4 inline mr-2" />
                    Edit Details
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'departments' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Departments</h3>
                <button
                  onClick={() => {
                    setModalType('department');
                    setShowModal(true);
                  }}
                  className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {departments && departments.length > 0 ? (
                  departments.map((dept) => (
                    <div key={dept.id} className="p-3 border rounded dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{dept.name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {dept.code} • {dept.employee_count} employees
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${
                          dept.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {dept.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No departments found
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'academic' && selectedType === 'school' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Academic Years</h3>
                <button className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {academicYears && academicYears.length > 0 ? (
                  academicYears.map((year) => (
                    <div key={year.id} className="p-3 border rounded dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{year.year_name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                          </p>
                        </div>
                        {year.is_current && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            Current
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No academic years found
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===== RENDER CREATE MODAL =====
  const renderCreateModal = () => {
    if (!showModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Create New {modalType === 'school' ? 'School' : modalType === 'branch' ? 'Branch' : 'Department'}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                placeholder="Enter name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Code *
              </label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                placeholder="Enter code"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                rows={3}
                placeholder="Enter description"
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => {
                  if (modalType === 'school') {
                    createSchoolMutation.mutate(formData);
                  } else if (modalType === 'branch') {
                    createBranchMutation.mutate({
                      ...formData,
                      school_id: selectedItem?.id
                    });
                  } else if (modalType === 'department') {
                    createDepartmentMutation.mutate({
                      ...formData,
                      company_id: userCompanyId!,
                      school_id: selectedType === 'school' ? selectedItem?.id : undefined,
                      branch_id: selectedType === 'branch' ? selectedItem?.id : undefined
                    });
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setFormData({});
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===== LOADING STATE =====
  if (!userCompanyId || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {!userCompanyId ? 'Identifying your company...' : 'Loading organization structure...'}
          </p>
        </div>
      </div>
    );
  }

  // ===== ERROR STATE =====
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Unable to Load Organization Data
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {(error as Error).message || 'An error occurred while loading your organization structure.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ===== MAIN RENDER =====
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Organization Management
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage your organizational structure, schools, and branches
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <Filter className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Schools</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {companyData?.schools?.length || 0}
                </p>
              </div>
              <School className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Branches</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {companyData?.schools?.reduce((acc, school) => acc + (school.branches?.length || 0), 0) || 0}
                </p>
              </div>
              <MapPin className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Units</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {companyData?.schools?.filter(s => s.status === 'active').length || 0}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Staff</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {companyData?.schools?.reduce((acc, school) => 
                    acc + (school.additional?.teachers_count || 0), 0) || 0}
                </p>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Organization Tree */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Organization Structure
          </h2>
          {renderOrganizationTree()}
        </div>
      </div>

      {/* Details Panel */}
      {renderDetailsPanel()}
      
      {/* Create Modal */}
      {renderCreateModal()}
    </div>
  );
}