///home/project/src/app/system-admin/license-management/page.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MoreVertical, ExternalLink, Calendar, RefreshCw, Trash2, History, Edit2, X, ChevronDown, ChevronRight, Building, ArrowUp, ArrowDown } from 'lucide-react';
import dayjs from 'dayjs';
import { supabase } from '../../../lib/supabase';
import { DataTable } from '../../../components/shared/DataTable';
import { FilterCard } from '../../../components/shared/FilterCard';
import { SlideInForm } from '../../../components/shared/SlideInForm';
import { FormField, Input, Select } from '../../../components/shared/FormField';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { Button } from '../../../components/shared/Button';
import { SearchableMultiSelect } from '../../../components/shared/SearchableMultiSelect';
import { LicenseActionForm, type LicenseActionFormRef } from './LicenseActionForm';
import { LicenseForm } from './LicenseForm';
import { ConfirmationDialog } from '../../../components/shared/ConfirmationDialog';
import { ScrollNavigator } from '../../../components/shared/ScrollNavigator';
import { toast } from '../../../components/shared/Toast';
import { useSingleExpansion } from '../../../hooks/useSingleExpansion';
import { PaginationControls } from '../../../components/shared/PaginationControls';
import { LoadingSpinner } from '../../../components/shared/LoadingSpinner';
import { usePagination } from '../../../hooks/usePagination';

interface License {
  id: string;
  company_id: string;
  company_name: string;
  region_id: string;
  region_name: string;
  program_id: string;
  program_name: string;
  provider_id: string;
  provider_name: string;
  subject_id: string;
  subject_name: string;
  quantity: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'inactive';
  created_at: string;
}

interface CompanyLicenses {
  id: string;
  company: string;
  company_id: string;
  licenseCount: number;
  totalQuantity: number;
  licenses: License[];
  isExpanded?: boolean;
}

interface FilterState {
  company_ids: string[];
  region_ids: string[];
  program_ids: string[];
  provider_ids: string[];
  subject_ids: string[];
  status: string[];
}

export default function LicenseManagementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isExpanded, toggleExpansion } = useSingleExpansion();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isActionFormOpen, setIsActionFormOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<'EXPAND' | 'EXTEND' | 'RENEW' | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [companyPaginationState, setCompanyPaginationState] = useState<Record<string, { page: number; rowsPerPage: number }>>({});
  const [filters, setFilters] = useState<FilterState>({
    company_ids: [],
    region_ids: [],
    program_ids: [],
    provider_ids: [],
    subject_ids: [],
    status: []
  });
  
  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [licensesToDelete, setLicensesToDelete] = useState<License[]>([]);
  
  const actionButtonRef = useRef<HTMLButtonElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const actionFormRef = useRef<LicenseActionFormRef>(null);
  
  // Toggle expanded state for a company

  // Handle click outside action menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionMenuRef.current && 
        actionButtonRef.current &&
        !actionMenuRef.current.contains(event.target as Node) &&
        !actionButtonRef.current.contains(event.target as Node)
      ) {
        setOpenActionMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch filter options with React Query
  const { data: filterOptions } = useQuery(
    ['licenseFilterOptions'],
    async () => {
      const [
        { data: companiesData },
        { data: regionsData },
        { data: programsData },
        { data: providersData },
        { data: subjectsData }
      ] = await Promise.all([
        supabase.from('companies').select('id, name').eq('status', 'active'),
        supabase.from('regions').select('id, name').eq('status', 'active'),
        supabase.from('programs').select('id, name').eq('status', 'active'),
        supabase.from('providers').select('id, name').eq('status', 'active'),
        supabase.from('edu_subjects').select('id, name').eq('status', 'active')
      ]);

      return {
        companies: companiesData || [],
        regions: regionsData || [],
        programs: programsData || [],
        providers: providersData || [],
        subjects: subjectsData || []
      };
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Fetch licenses with React Query
  const { 
    data: rawLicenses = [], 
    isLoading, 
    isFetching 
  } = useQuery<License[]>(
    ['licenses', filters],
    async () => {
      let query = supabase
        .from('licenses')
        .select(`
          id,
          total_quantity,
          start_date,
          end_date,
          status,
          created_at,
          company_id,
          companies(id, name),
          data_structures(
            id,
            region_id, 
            program_id,
            provider_id,
            subject_id,
            regions:region_id(id, name),
            programs:program_id(id, name),
            providers:provider_id(id, name),
            edu_subjects:subject_id(id, name)
          )
        `);

      if (filters.company_ids.length > 0) {
        query = query.in('company_id', filters.company_ids);
      }
      
      if (filters.region_ids.length > 0) {
        query = query.in('data_structures.region_id', filters.region_ids);
      }
      
      if (filters.program_ids.length > 0) {
        query = query.in('data_structures.program_id', filters.program_ids);
      }
      
      if (filters.provider_ids.length > 0) {
        query = query.in('data_structures.provider_id', filters.provider_ids);
      }
      
      if (filters.subject_ids.length > 0) {
        query = query.in('data_structures.subject_id', filters.subject_ids);
      }
      
      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Format the licenses
      const formattedLicenses: License[] = (data || []).map(license => ({
        id: license.id,
        company_id: license.company_id,
        company_name: license.companies?.name || 'Unknown',
        region_id: license.data_structures?.region_id || '',
        region_name: license.data_structures?.regions?.name || 'Unknown',
        program_id: license.data_structures?.program_id || '',
        program_name: license.data_structures?.programs?.name || 'Unknown',
        provider_id: license.data_structures?.provider_id || '',
        provider_name: license.data_structures?.providers?.name || 'Unknown',
        subject_id: license.data_structures?.subject_id || '',
        subject_name: license.data_structures?.edu_subjects?.name || 'Unknown',
        quantity: license.total_quantity,
        start_date: license.start_date,
        end_date: license.end_date,
        status: license.status,
        created_at: license.created_at
      }));

      return formattedLicenses;
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
  
  // Group licenses by company
  const groupedLicenses: CompanyLicenses[] = React.useMemo(() => {
    const companyMap = new Map<string, CompanyLicenses>();

    rawLicenses.forEach(license => {
      if (!companyMap.has(license.company_id)) {
        companyMap.set(license.company_id, {
          id: license.company_id,
          company: license.company_name,
          company_id: license.company_id,
          licenseCount: 0,
          totalQuantity: 0,
          licenses: [],
          isExpanded: isExpanded(license.company_id)
        });
      }
      
      const companyData = companyMap.get(license.company_id)!;
      companyData.licenseCount += 1;
      companyData.totalQuantity += license.quantity;
      companyData.licenses.push(license);
    });

    return Array.from(companyMap.values());
  }, [rawLicenses, isExpanded]);

  const {
    page: companiesPage,
    rowsPerPage: companiesRowsPerPage,
    totalPages: companiesTotalPages,
    totalCount: companiesTotalCount,
    paginatedItems: paginatedCompanies,
    start: companiesStart,
    end: companiesEnd,
    goToPage: goToCompaniesPage,
    nextPage: nextCompaniesPage,
    previousPage: previousCompaniesPage,
    changeRowsPerPage: changeCompaniesRowsPerPage,
  } = usePagination(groupedLicenses);

  // License action mutation
  const actionMutation = useMutation(
    async (payload: any) => {
      try {
        // Fetch the license details
        const { data: license, error: fetchError } = await supabase
          .from('licenses')
          .select('*')
          .eq('id', payload.license_id)
          .single();

        if (fetchError) {
          console.error('Error fetching license:', fetchError);
          throw new Error(`Failed to fetch license: ${fetchError.message}`);
        }

        if (!license) {
          throw new Error('License not found');
        }

        // Get current user for action tracking
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          console.error('Error getting current user:', userError);
          throw new Error('Failed to identify current user. Please try logging in again.');
        }

        if (!user?.id) {
          throw new Error('User authentication required. Please log in and try again.');
        }

        // Create license action record
        const actionRecord = {
          license_id: payload.license_id,
          action_type: payload.action_type,
          change_quantity: payload.action_type === 'EXPAND' ? payload.additional_quantity :
                          payload.action_type === 'RENEW' ? payload.new_total_quantity - license.total_quantity :
                          null,
          new_end_date: payload.new_end_date,
          notes: payload.notes,
          performed_by: user.id
        };

        console.log('Inserting license action:', {
          ...actionRecord,
          performed_by: user.id,
          user_email: user.email
        });

        const { error: actionError } = await supabase
          .from('license_actions')
          .insert([actionRecord]);

        if (actionError) {
          console.error('License action INSERT error:', {
            code: actionError.code,
            message: actionError.message,
            details: actionError.details,
            hint: actionError.hint
          });
          throw new Error(`Failed to record license action: ${actionError.message}`);
        }

        // Update the license based on action type
        let updateData = {};
        switch (payload.action_type) {
          case 'EXPAND':
            updateData = {
              total_quantity: license.total_quantity + payload.additional_quantity
            };
            break;
          case 'EXTEND':
            updateData = {
              end_date: payload.new_end_date
            };
            break;
          case 'RENEW':
            updateData = {
              total_quantity: payload.new_total_quantity,
              start_date: payload.new_start_date,
              end_date: payload.new_end_date
            };
            break;
        }

        console.log('Updating license with:', updateData);

        const { error: updateError } = await supabase
          .from('licenses')
          .update(updateData)
          .eq('id', payload.license_id);

        if (updateError) {
          console.error('License UPDATE error:', {
            code: updateError.code,
            message: updateError.message,
            details: updateError.details
          });
          throw new Error(`Failed to update license: ${updateError.message}`);
        }

        return { ...license, ...updateData };
      } catch (error) {
        console.error('License action mutation error:', error);
        throw error;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['licenses']);
        queryClient.invalidateQueries(['licenseActions']);
        setIsActionFormOpen(false);
        setSelectedAction(null);
        setEditingLicense(null);
        toast.success(`License ${selectedAction?.toLowerCase()}ed successfully`);
      },
      onError: (error: any) => {
        console.error('Error processing license action:', error);

        let errorMessage = 'Failed to process license action. Please try again.';

        if (error?.message) {
          if (error.message.includes('relation') && error.message.includes('does not exist')) {
            errorMessage = 'Database table missing. Please contact system administrator.';
          } else if (error.message.includes('permission denied') || error.message.includes('policy')) {
            errorMessage = 'You do not have permission to perform this action.';
          } else if (error.message.includes('Failed to record license action')) {
            errorMessage = 'Failed to record the action history. The license may have been updated.';
          } else {
            errorMessage = error.message;
          }
        }

        toast.error(errorMessage);
      }
    }
  );

  // Delete license mutation
  const deleteMutation = useMutation(
    async (licenses: License[]) => {
      const { error } = await supabase
        .from('licenses')
        .delete()
        .in('id', licenses.map(l => l.id));

      if (error) throw error;
      return licenses;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['licenses']);
        setIsConfirmDialogOpen(false);
        setLicensesToDelete([]);
        toast.success('License(s) deleted successfully');
      },
      onError: (error) => {
        console.error('Error deleting licenses:', error);
        toast.error('Failed to delete license(s). Please try again.');
        setIsConfirmDialogOpen(false);
        setLicensesToDelete([]);
      }
    }
  );

  // Main table columns (company level)
  const companyColumns = [
    {
      id: 'company', 
      header: 'Company',
      accessorKey: 'company',
      enableSorting: true,
      cell: (row: CompanyLicenses) => (
        <div className="flex items-center">
          <button 
            onClick={() => toggleCompanyExpanded(row.id)}
            className="mr-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={expandedCompanies[row.id] ? "Collapse" : "Expand"}
          >
            {expandedCompanies[row.id] ? 
              <ChevronDown className="h-5 w-5 text-gray-500" /> : 
              <ChevronRight className="h-5 w-5 text-gray-500" />
            }
          </button>
          <div className="flex items-center">
            <Building className="h-5 w-5 text-blue-500 mr-2" />
            <span className="font-medium">{row.company}</span>
          </div>
        </div>
      )
    },
    {
      id: 'licenseCount',
      header: '# Licenses',
      accessorKey: 'licenseCount',
      enableSorting: true,
      cell: (row: CompanyLicenses) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          {row.licenseCount}
        </span>
      )
    },
    {
      id: 'totalQuantity',
      header: 'Total Quantity',
      accessorKey: 'totalQuantity',
      enableSorting: true,
    },
  ];
  
  // Nested table columns (license level)
  const licenseColumns = [
    {
      id: 'region',
      header: 'Region',
      accessorKey: 'region_name',
    },
    {
      id: 'program',
      header: 'Program',
      accessorKey: 'program_name',
    },
    {
      id: 'provider',
      header: 'Provider',
      accessorKey: 'provider_name',
    },
    {
      id: 'subject',
      header: 'Subject',
      accessorKey: 'subject_name',
    },
    {
      id: 'quantity',
      header: 'Quantity',
      accessorKey: 'quantity',
    },
    {
      id: 'dates',
      header: 'Validity Period',
      cell: (row: License) => (
        <span>
          {dayjs(row.start_date).format('MMM D, YYYY')} → {dayjs(row.end_date).format('MMM D, YYYY')}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: License) => {
        const isExpired = dayjs(row.end_date).isBefore(dayjs());
        const isExpiringSoon = !isExpired && dayjs(row.end_date).diff(dayjs(), 'day') <= 30;
        
        return (
          <div>
            <StatusBadge status={row.status} />
            {isExpired && (
              <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                Expired
              </span>
            )}
            {isExpiringSoon && (
              <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                Expires soon
              </span>
            )}
          </div>
        );
      },
    },
  ];

  const handleActionSubmit = async (payload: any) => {
    actionMutation.mutate(payload);
  };

  const handleDelete = (licenses: License[]) => {
    setLicensesToDelete(licenses);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(licensesToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setLicensesToDelete([]);
  };

  const renderActions = (row: License) => {
    const isOpen = openActionMenu === row.id;

    return (
      <div className="flex items-center justify-end space-x-2">
        <button
          onClick={() => {
            setEditingLicense(row);
            setIsFormOpen(true);
          }}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
          title="Edit"
        >
          <Edit2 className="h-4 w-4" />
        </button>

        <div className="relative">
          <button
            ref={actionButtonRef}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors duration-200"
            onClick={() => setOpenActionMenu(isOpen ? null : row.id)}
            title="Actions"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          
          {isOpen && (
            <div
              ref={actionMenuRef}
              className="fixed z-50 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/30 py-1 border border-gray-100 dark:border-gray-700"
              style={{
                top: actionButtonRef.current?.getBoundingClientRect().bottom,
                left: actionButtonRef.current?.getBoundingClientRect().left,
                transform: 'translateX(-90%) translateY(8px)'
              }}
            >
              <div className="px-1 py-1">
                <button
                  onClick={() => {
                    setEditingLicense(row);
                    setSelectedAction('EXPAND');
                    setIsActionFormOpen(true);
                    setOpenActionMenu(null);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-md flex items-center group/item transition-colors duration-200"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mr-3 group-hover/item:bg-blue-100 dark:group-hover/item:bg-blue-900/50">
                    <ExternalLink className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">Expand License</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 group-hover/item:text-blue-500 dark:group-hover/item:text-blue-400">Add more licenses to this allocation</div>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    setEditingLicense(row);
                    setSelectedAction('EXTEND');
                    setIsActionFormOpen(true);
                    setOpenActionMenu(null);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 rounded-md flex items-center group/item transition-colors duration-200"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mr-3 group-hover/item:bg-purple-100 dark:group-hover/item:bg-purple-900/50">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">Extend Validity</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 group-hover/item:text-purple-500 dark:group-hover/item:text-purple-400">Extend the license expiration date</div>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    setEditingLicense(row);
                    setSelectedAction('RENEW');
                    setIsActionFormOpen(true);
                    setOpenActionMenu(null);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 rounded-md flex items-center group/item transition-colors duration-200"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 mr-3 group-hover/item:bg-green-100 dark:group-hover/item:bg-green-900/50">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">Renew License</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 group-hover/item:text-green-500 dark:group-hover/item:text-green-400">Create a new license period</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    navigate(`/app/system-admin/license-management/history/${row.id}`);
                    setOpenActionMenu(null);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 rounded-md flex items-center group/item transition-colors duration-200"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mr-3 group-hover/item:bg-amber-100 dark:group-hover/item:bg-amber-900/50">
                    <History className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">View History</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 group-hover/item:text-amber-500 dark:group-hover/item:text-amber-400">See all actions performed on this license</div>
                  </div>
                </button>
              </div>
              
              <div className="border-t border-gray-100 dark:border-gray-700 mt-1 px-1 py-1">
                <button
                  onClick={() => {
                    handleDelete([row]);
                    setOpenActionMenu(null);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md flex items-center group/item transition-colors duration-200"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 mr-3 group-hover/item:bg-red-100 dark:group-hover/item:bg-red-900/50">
                    <Trash2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">Delete License</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 group-hover/item:text-red-500 dark:group-hover/item:text-red-400">Permanently remove this license</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const getCompanyPagination = (companyId: string) =>
    companyPaginationState[companyId] ?? { page: 1, rowsPerPage: 10 };

  const updateCompanyPagination = (companyId: string, newState: Partial<{ page: number; rowsPerPage: number }>) => {
    setCompanyPaginationState(prev => {
      const current = prev[companyId] ?? { page: 1, rowsPerPage: 10 };
      return {
        ...prev,
        [companyId]: {
          page: newState.page ?? current.page,
          rowsPerPage: newState.rowsPerPage ?? current.rowsPerPage,
        },
      };
    });
  };

  const renderRow = (company: CompanyLicenses) => {
    const expanded = isExpanded(company.id);
    const pagination = getCompanyPagination(company.id);
    const totalCount = company.licenses.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / Math.max(pagination.rowsPerPage, 1)));
    const page = Math.min(Math.max(pagination.page, 1), totalPages);
    const startIndex = totalCount === 0 ? 0 : (page - 1) * pagination.rowsPerPage;
    const paginatedLicenses = company.licenses.slice(startIndex, startIndex + pagination.rowsPerPage);
    const endIndex = totalCount === 0 ? 0 : Math.min(startIndex + pagination.rowsPerPage, totalCount);

    return (
      <React.Fragment key={company.id}>
        {/* Main company row */}
        <tr 
          className={`bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${expanded ? 'border-b-0' : ''}`}
          onClick={() => toggleExpansion(company.id)}
          style={{ cursor: 'pointer' }}
        >
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpansion(company.id);
                }}
                className="mr-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={expanded ? "Collapse" : "Expand"}
              >
                {expanded ? 
                  <ChevronDown className="h-5 w-5 text-gray-500" /> : 
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                }
              </button>
              <div className="flex items-center">
                <Building className="h-5 w-5 text-blue-500 mr-2" />
                <span className="font-medium text-gray-900 dark:text-white">{company.company}</span>
              </div>
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {company.licenseCount}
            </span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <span className="text-gray-900 dark:text-white">{company.totalQuantity}</span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-right">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCompanyId(company.id);
                setEditingLicense(null);
                setIsFormOpen(true);
              }}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add License
            </Button>
          </td>
        </tr>
        
        {/* Expanded content */}
        {expanded && (
          <tr className="bg-gray-50 dark:bg-gray-700/50">
            <td colSpan={4} className="px-6 py-4">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {licenseColumns.map(column => (
                        <th
                          key={column.id}
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          {column.header}
                        </th>
                      ))}
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedLicenses.length === 0 ? (
                      <tr>
                        <td colSpan={licenseColumns.length + 1} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          No licenses found for this company
                        </td>
                      </tr>
                    ) : (
                      paginatedLicenses.map(license => (
                        <tr key={license.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          {licenseColumns.map(column => (
                            <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {column.cell ? column.cell(license) : (license as any)[column.accessorKey || '']}
                            </td>
                          ))}
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {renderActions(license)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <PaginationControls
                  page={page}
                  rowsPerPage={pagination.rowsPerPage}
                  totalCount={totalCount}
                  totalPages={totalPages}
                  onPageChange={(newPage) => updateCompanyPagination(company.id, { page: newPage })}
                  onNextPage={() => updateCompanyPagination(company.id, { page: Math.min(page + 1, totalPages) })}
                  onPreviousPage={() => updateCompanyPagination(company.id, { page: Math.max(page - 1, 1) })}
                  onRowsPerPageChange={(newRows) => updateCompanyPagination(company.id, { page: 1, rowsPerPage: newRows })}
                  showingRange={{ start: totalCount === 0 ? 0 : startIndex + 1, end: endIndex }}
                />
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="p-6 space-y-6" ref={contentRef}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">License Management</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Manage and track all system licenses</p>
      </div>

      <div className="flex justify-between items-center">
        <div />
        <Button
          onClick={() => {
            setEditingLicense(null);
            setSelectedCompanyId(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add License
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={() => {}} // No need for explicit apply with React Query
        onClear={() => {
          setFilters({
            company_ids: [],
            region_ids: [],
            program_ids: [],
            provider_ids: [],
            subject_ids: [],
            status: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SearchableMultiSelect
            label="Company"
            options={(filterOptions?.companies || []).map(c => ({ label: c.name, value: c.id }))}
            selectedValues={filters.company_ids}
            onChange={values => setFilters({ ...filters, company_ids: values })}
            placeholder="Select companies..."
          />

          <SearchableMultiSelect
            label="Region"
            options={(filterOptions?.regions || []).map(r => ({ label: r.name, value: r.id }))}
            selectedValues={filters.region_ids}
            onChange={values => setFilters({ ...filters, region_ids: values })}
            placeholder="Select regions..."
          />

          <SearchableMultiSelect
            label="Program"
            options={(filterOptions?.programs || []).map(p => ({ label: p.name, value: p.id }))}
            selectedValues={filters.program_ids}
            onChange={values =>setFilters({ ...filters, program_ids: values })}
            placeholder="Select programs..."
          />

          <SearchableMultiSelect
            label="Provider"
            options={(filterOptions?.providers || []).map(p => ({ label: p.name, value: p.id }))}
            selectedValues={filters.provider_ids}
            onChange={values => setFilters({ ...filters, provider_ids: values })}
            placeholder="Select providers..."
          />

          <SearchableMultiSelect
            label="Subject"
            options={(filterOptions?.subjects || []).map(s => ({ label: s.name, value: s.id }))}
            selectedValues={filters.subject_ids}
            onChange={values => setFilters({ ...filters, subject_ids: values })}
            placeholder="Select subjects..."
          />

          <SearchableMultiSelect
            label="Status"
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Expired', value: 'expired' }
            ]}
            selectedValues={filters.status}
            onChange={values => setFilters({ ...filters, status: values })}
            placeholder="Select status..."
          />
        </div>
      </FilterCard>

      {/* Custom table with expandable rows */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm dark:shadow-gray-900/20 transition-colors duration-200">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner
              size="md"
              showLogo={false}
              animation="hybrid"
              message="Loading licenses..."
            />
          </div>
        ) : companiesTotalCount === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No licenses found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  {companyColumns.map(column => (
                    <th
                      key={column.id}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {column.header}
                    </th>
                  ))}
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedCompanies.map(company => renderRow(company))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PaginationControls
        page={companiesPage}
        rowsPerPage={companiesRowsPerPage}
        totalCount={companiesTotalCount}
        totalPages={companiesTotalPages}
        onPageChange={goToCompaniesPage}
        onNextPage={nextCompaniesPage}
        onPreviousPage={previousCompaniesPage}
        onRowsPerPageChange={changeCompaniesRowsPerPage}
        showingRange={{ start: companiesStart, end: companiesEnd }}
      />

      <SlideInForm
        key={selectedAction ? `${editingLicense?.id || 'new'}-${selectedAction}` : undefined}
        title={selectedAction ? `${selectedAction} License` : ''}
        isOpen={isActionFormOpen}
        onClose={() => {
          setIsActionFormOpen(false);
          setSelectedAction(null);
          setEditingLicense(null);
        }}
        onSave={() => {
          actionFormRef.current?.validateAndSubmit();
        }}
        loading={actionMutation.isLoading}
      >
        {selectedAction && editingLicense && (
          <LicenseActionForm
            ref={actionFormRef}
            actionType={selectedAction}
            license={editingLicense}
            onSubmit={handleActionSubmit}
            onCancel={() => {
              setIsActionFormOpen(false);
              setSelectedAction(null);
              setEditingLicense(null);
            }}
          />
        )}
      </SlideInForm>

      <LicenseForm
        key={editingLicense?.id || `new-${Date.now()}`}
        isOpen={isFormOpen}
        initialCompanyId={selectedCompanyId}
        onClose={() => {
          setIsFormOpen(false);
          setEditingLicense(null);
          setSelectedCompanyId(null);
        }}
        onSuccess={() => queryClient.invalidateQueries(['licenses'])}
        editingLicense={editingLicense}
      />
      
      {/* Scroll Navigator */}
      <ScrollNavigator scrollContainerRef={contentRef} />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete License"
        message={`Are you sure you want to delete ${licensesToDelete.length} license(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}