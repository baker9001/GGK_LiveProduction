//home/project/src/app/entity-module/organisation/page.tsx

import React from 'react';
import { Building2, Users, Settings, BarChart3, Plus, Search, Filter } from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { DataTable } from '../../../components/shared/DataTable';
import { StatusBadge } from '../../../components/shared/StatusBadge';

interface Organisation {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  parentId?: string;
  employeeCount: number;
  createdAt: string;
}

// Mock data for demonstration
const mockOrganisations: Organisation[] = [
  {
    id: '1',
    name: 'GGK Education Group',
    code: 'GGK-HQ',
    type: 'Headquarters',
    status: 'active',
    employeeCount: 250,
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'Academic Division',
    code: 'GGK-ACAD',
    type: 'Division',
    status: 'active',
    parentId: '1',
    employeeCount: 120,
    createdAt: '2024-02-01'
  },
  {
    id: '3',
    name: 'Technology Department',
    code: 'GGK-TECH',
    type: 'Department',
    status: 'active',
    parentId: '2',
    employeeCount: 45,
    createdAt: '2024-02-15'
  },
  {
    id: '4',
    name: 'Research Unit',
    code: 'GGK-RES',
    type: 'Unit',
    status: 'inactive',
    parentId: '3',
    employeeCount: 12,
    createdAt: '2024-03-01'
  }
];

const columns = [
  {
    id: 'name',
    header: 'Organisation Name',
    accessorKey: 'name' as keyof Organisation,
    cell: (row: Organisation) => (
      <div className="flex items-center">
        <Building2 className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{row.name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.code}</div>
        </div>
      </div>
    )
  },
  {
    id: 'type',
    header: 'Type',
    accessorKey: 'type' as keyof Organisation,
    cell: (row: Organisation) => (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
        {row.type}
      </span>
    )
  },
  {
    id: 'employeeCount',
    header: 'Employees',
    accessorKey: 'employeeCount' as keyof Organisation,
    cell: (row: Organisation) => (
      <div className="flex items-center">
        <Users className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
        <span className="text-sm text-gray-900 dark:text-white">{row.employeeCount}</span>
      </div>
    )
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status' as keyof Organisation,
    cell: (row: Organisation) => <StatusBadge status={row.status} />
  },
  {
    id: 'createdAt',
    header: 'Created',
    accessorKey: 'createdAt' as keyof Organisation,
    cell: (row: Organisation) => (
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {new Date(row.createdAt).toLocaleDateString()}
      </span>
    )
  }
];

export default function OrganisationPage() {
  const [organisations] = React.useState<Organisation[]>(mockOrganisations);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState('all');

  const filteredOrganisations = organisations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || org.type.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesType;
  });

  const handleEdit = (organisation: Organisation) => {
    console.log('Edit organisation:', organisation);
    // TODO: Implement edit functionality
  };

  const handleDelete = (organisations: Organisation[]) => {
    console.log('Delete organisations:', organisations);
    // TODO: Implement delete functionality
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Organisation Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage organizational structure, hierarchies, and relationships
            </p>
          </div>
          <Button leftIcon={<Plus className="h-4 w-4" />}>
            Add Organisation
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Organisations</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{organisations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Employees</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {organisations.reduce((sum, org) => sum + org.employeeCount, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Units</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {organisations.filter(org => org.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Settings className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Departments</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {organisations.filter(org => org.type === 'Department').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search organisations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="headquarters">Headquarters</option>
              <option value="division">Division</option>
              <option value="department">Department</option>
              <option value="unit">Unit</option>
            </select>
            <Button variant="outline" leftIcon={<Filter className="h-4 w-4" />}>
              More Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Organisation Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Organisation Structure
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your organizational hierarchy and structure
          </p>
        </div>
        
        <DataTable
          data={filteredOrganisations}
          columns={columns}
          keyField="id"
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="No organisations found"
          className="border-0 shadow-none"
        />
      </div>

      {/* Organizational Chart Preview */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Organizational Hierarchy
        </h3>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 text-center">
          <Building2 className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Interactive organizational chart will be displayed here
          </p>
          <Button variant="outline">
            View Full Hierarchy
          </Button>
        </div>
      </div>
    </div>
  );
}