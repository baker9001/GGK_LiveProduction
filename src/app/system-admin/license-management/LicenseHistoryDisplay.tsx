import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { DataTable } from '../../../components/shared/DataTable';
import dayjs from 'dayjs';
import { cn } from '../../../lib/utils';

interface LicenseAction {
  id: string;
  action_type: 'EXPAND' | 'EXTEND' | 'RENEW';
  change_quantity?: number;
  new_end_date?: string;
  notes?: string;
  created_at: string;
}

interface LicenseHistoryDisplayProps {
  licenseId: string;
}

export function LicenseHistoryDisplay({ licenseId }: LicenseHistoryDisplayProps) {
  // Fetch license actions with React Query
  const { 
    data: actions = [], 
    isLoading, 
    isFetching 
  } = useQuery<LicenseAction[]>(
    ['licenseActions', licenseId],
    async () => {
      const { data, error } = await supabase
        .from('license_actions')
        .select('*')
        .eq('license_id', licenseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const getRowClassName = (action: LicenseAction) => {
    switch (action.action_type) {
      case 'EXPAND':
        return 'bg-[#E8F5DC]/80 hover:bg-[#E8F5DC] dark:bg-[#5D7E23]/20 dark:hover:bg-blue-900/30';
      case 'EXTEND':
        return 'bg-[#E8F5DC]/80 hover:bg-[#E8F5DC] dark:bg-purple-900/20 dark:hover:bg-purple-900/30';
      case 'RENEW':
        return 'bg-green-50/80 hover:bg-green-50 dark:bg-green-900/20 dark:hover:bg-green-900/30';
      default:
        return '';
    }
  };

  const columns = [
    {
      id: 'action_type',
      header: 'Action',
      accessorKey: 'action_type',
      cell: (row: LicenseAction) => (
        <div className="flex items-center">
          <History className={cn(
            "h-4 w-4 mr-2",
            row.action_type === 'EXPAND' && "text-[#99C93B] dark:text-[#AAD775]",
            row.action_type === 'EXTEND' && "text-[#5D7E23] dark:text-purple-400",
            row.action_type === 'RENEW' && "text-green-500 dark:text-green-400"
          )} />
          <span className={cn(
            "font-medium",
            row.action_type === 'EXPAND' && "text-[#5D7E23] dark:text-[#AAD775]",
            row.action_type === 'EXTEND' && "text-purple-700 dark:text-purple-300",
            row.action_type === 'RENEW' && "text-green-700 dark:text-green-300"
          )}>
            {row.action_type}
          </span>
        </div>
      ),
    },
    {
      id: 'details',
      header: 'Details',
      cell: (row: LicenseAction) => {
        let content = '';
        if (row.action_type === 'EXPAND') {
          content = `Added ${row.change_quantity} licenses`;
        } else if (row.action_type === 'EXTEND') {
          content = `Extended until ${dayjs(row.new_end_date).format('MMM D, YYYY')}`;
        } else {
          content = 'License renewed';
        }
        
        return (
          <span className="text-sm text-gray-900 dark:text-gray-100">
            {content}
          </span>
        );
      },
    },
    {
      id: 'notes',
      header: 'Notes',
      accessorKey: 'notes',
      cell: (row: LicenseAction) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.notes || '-'}
        </span>
      ),
    },
    {
      id: 'created_at',
      header: 'Date',
      accessorKey: 'created_at',
      cell: (row: LicenseAction) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {dayjs(row.created_at).format('MMM D, YYYY HH:mm')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">License History</h3>
      <DataTable
        data={actions}
        columns={columns}
        keyField="id"
        loading={isLoading}
        isFetching={isFetching}
        emptyMessage="No actions found for this license"
        getRowClassName={getRowClassName}
      />
    </div>
  );
}