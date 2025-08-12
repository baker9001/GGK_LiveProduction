import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

interface UseTableDataOptions<T> {
  tableName: string;
  columns: string[];
  keyField: string;
  initialSort?: { column: string; ascending: boolean };
  initialFilters?: Record<string, any>;
  initialPage?: number;
  initialRowsPerPage?: number;
  queryKey: string;
  transformRow?: (row: any) => T;
  additionalQueries?: (query: any) => any;
}

export function useTableData<T>({
  tableName,
  columns,
  keyField,
  initialSort = { column: 'created_at', ascending: false },
  initialFilters = {},
  initialPage = 1,
  initialRowsPerPage = 10,
  queryKey,
  transformRow,
  additionalQueries,
}: UseTableDataOptions<T>) {
  const [page, setPage] = useState(initialPage);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState(initialSort);
  
  // Calculate offset for pagination
  const offset = (page - 1) * rowsPerPage;
  
  // Build query key based on all parameters that affect the query
  const fullQueryKey = [queryKey, page, rowsPerPage, sort, filters];
  
  // Fetch data with React Query
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery(
    fullQueryKey,
    async () => {
      // Start building the query
      let query = supabase
        .from(tableName)
        .select(columns.join(','))
        .order(sort.column, { ascending: sort.ascending })
        .range(offset, offset + rowsPerPage - 1);
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value) && value.length > 0) {
            query = query.in(key, value);
          } else if (typeof value === 'string' && value.includes('%')) {
            query = query.ilike(key, value);
          } else {
            query = query.eq(key, value);
          }
        }
      });
      
      // Apply any additional query modifications
      if (additionalQueries) {
        query = additionalQueries(query);
      }
      
      // Execute the query
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Transform rows if needed
      const transformedData = transformRow ? data.map(transformRow) : data;
      
      return {
        data: transformedData,
        count,
      };
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );
  
  // Calculate total pages
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / rowsPerPage);
  
  // Handle pagination
  const goToPage = (newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  };
  
  const nextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };
  
  const previousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };
  
  // Handle sorting
  const handleSort = (column: string) => {
    setSort(prev => ({
      column,
      ascending: prev.column === column ? !prev.ascending : true,
    }));
    // Reset to first page when sorting changes
    setPage(1);
  };
  
  // Handle filtering
  const applyFilters = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
    // Reset to first page when filters change
    setPage(1);
  };
  
  const clearFilters = () => {
    setFilters(initialFilters);
    // Reset to first page when filters are cleared
    setPage(1);
  };
  
  // Handle rows per page change
  const changeRowsPerPage = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    // Reset to first page when rows per page changes
    setPage(1);
  };
  
  return {
    data: data?.data || [],
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    pagination: {
      page,
      rowsPerPage,
      totalCount,
      totalPages,
      goToPage,
      nextPage,
      previousPage,
      changeRowsPerPage,
    },
    sorting: {
      sort,
      handleSort,
    },
    filtering: {
      filters,
      applyFilters,
      clearFilters,
    },
  };
}