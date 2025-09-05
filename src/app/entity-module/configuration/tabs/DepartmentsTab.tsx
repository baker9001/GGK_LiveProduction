/**
 * File: /src/app/entity-module/configuration/tabs/DepartmentsTab.tsx
 * 
 * FIXED VERSION - Complete Hierarchical View with Expand/Collapse
 * 
 * ✅ Fixed: Nested hierarchy with proper parent > sub-department structure
 * ✅ Fixed: DepartmentCard reference replaced with DepartmentNode
 * ✅ Fixed: Added handleAddChild function
 * ✅ Fixed: Proper expand/collapse state management
 * ✅ Enhanced: Visual hierarchy indicators
 * ✅ Enhanced: Smooth animations for expand/collapse
 * 
 * Database Tables:
 * - departments (main table with all columns)
 * - department_schools (junction for multi-school)
 * - department_branches (junction for multi-branch)
 * - class_section_departments (sections linkage)
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Building2, Users, Phone, Mail, School, MapPin, Building, 
  Filter, ChevronRight, Hash, Download, Upload, Copy, MoreVertical,
  AlertTriangle, CheckCircle2, XCircle, Info, Loader2, Search,
  Calendar, Clock, Activity, TrendingUp, BarChart3, Eye, Edit2,
  Trash2, Archive, RefreshCw, Settings, ChevronDown, ChevronUp,
  FileText, Shield, Star, GitBranch, Layers, BookOpen, FolderOpen, FolderClosed
} from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useAccessControl } from '@/hooks/useAccessControl';
import { DataTable } from '@/components/shared/DataTable';
import { FilterCard } from '@/components/shared/FilterCard';
import { SlideInForm } from '@/components/shared/SlideInForm';
import { FormField, Input, Select, Textarea } from '@/components/shared/FormField';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/shared/Button';
import { SearchableMultiSelect } from '@/components/shared/SearchableMultiSelect';
import { ToggleSwitch } from '@/components/shared/ToggleSwitch';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/Tabs';
import { toast } from '@/components/shared/Toast';
import { cn } from '@/lib/utils';

// Import PhoneInput directly (update path if needed)
import { PhoneInput } from '@/components/shared/PhoneInput';

// Enhanced Department interface with all fields
interface Department {
  id: string;
  company_id: string | null;
  name: string;
  code: string | null;
  department_type: 'academic' | 'administrative' | 'support' | 'operations' | 'other';
  description: string | null;
  parent_department_id: string | null;
  head_id: string | null;
  head_name: string | null;
  head_email: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  // Joined data
  parent_department?: { id: string; name: string };
  assigned_schools?: string[];
  assigned_branches?: string[];
  school_names?: string[];
  branch_names?: string[];
  children_count?: number;
  staff_count?: number;
  student_count?: number;
  // Computed fields
  department_level?: 'company' | 'school' | 'branch';
  hierarchy_path?: string;
  // For hierarchical view
  children?: Department[];
  isExpanded?: boolean;
}

// Enhanced validation schema with better rules
const departmentSchema = z.object({
  company_id: z.string().uuid(),
  school_ids: z.array(z.string().uuid()).min(1, 'Please select at least one school'),
  branch_ids: z.array(z.string().uuid()).optional().default([]),
  name: z.string()
    .min(2, 'Department name must be at least 2 characters')
    .max(100, 'Department name must not exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s\-&,.']+$/, 'Department name contains invalid characters'),
  code: z.string()
    .max(20, 'Code must not exceed 20 characters')
    .regex(/^[A-Z0-9\-]*$/, 'Code must be uppercase letters, numbers, and hyphens only')
    .optional()
    .nullable(),
  department_type: z.enum(['academic', 'administrative', 'support', 'operations', 'other']),
  description: z.string().max(500, 'Description must not exceed 500 characters').optional().nullable(),
  parent_department_id: z.string().uuid().optional().nullable(),
  head_id: z.string().uuid().optional().nullable(),
  head_name: z.string().max(100).optional().nullable(),
  head_email: z.string().email('Invalid email format').optional().nullable().or(z.literal('')),
  contact_email: z.string().email('Invalid email format').optional().nullable().or(z.literal('')),
  contact_phone: z.string()
    .regex(/^(\+\d{1,4}\s?)?\d{4,}$/, 'Invalid phone number format')
    .optional()
    .nullable()
    .or(z.literal('')),
  status: z.enum(['active', 'inactive'])
});

type DepartmentFormData = z.infer<typeof departmentSchema>;

// Stats interface
interface DepartmentStats {
  total: number;
  active: number;
  inactive: number;
  byType: Record<string, number>;
  withHeads: number;
  parentDepartments: number;
}

// Activity interface for timeline
interface DepartmentActivity {
  id: string;
  action: 'created' | 'updated' | 'deleted' | 'status_changed';
  department_name: string;
  user_name: string;
  timestamp: string;
  details?: string;
}

interface DepartmentsTabProps {
  companyId: string | null;
}

// Skeleton loader component
const DepartmentSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
      ))}
    </div>
  </div>
);

// Department type configuration
const DEPARTMENT_TYPES = [
  { value: 'academic', label: 'Academic', icon: BookOpen, color: 'green' },
  { value: 'administrative', label: 'Administrative', icon: Building2, color: 'purple' },
  { value: 'support', label: 'Support', icon: Users, color: 'green' },
  { value: 'operations', label: 'Operations', icon: Settings, color: 'orange' },
  { value: 'other', label: 'Other', icon: Layers, color: 'gray' }
] as const;

// Enhanced Hierarchical Department Node Component with proper expand/collapse
const DepartmentNode = ({ 
  department, 
  level = 0,
  onToggleExpand,
  onEdit,
  onDelete,
  onDuplicate,
  onViewDetails,
  onAddChild
}: {
  department: Department;
  level?: number;
  onToggleExpand: (deptId: string) => void;
  onEdit: (dept: Department) => void;
  onDelete: (dept: Department) => void;
  onDuplicate: (dept: Department) => void;
  onViewDetails: (dept: Department) => void;
  onAddChild?: (parentDept: Department) => void;
}) => {
  const hasChildren = department.children && department.children.length > 0;
  const typeConfig = DEPARTMENT_TYPES.find(t => t.value === department.department_type);
  const Icon = typeConfig?.icon || Building2;
  
  return (
    <>
      <div 
        className={cn(
          "group flex items-center justify-between py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 rounded-lg",
          level > 0 && "ml-8 border-l-2 border-gray-200 dark:border-gray-700"
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Expand/Collapse Button */}
          <button
            onClick={() => onToggleExpand(department.id)}
            className={cn(
              "p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors shrink-0",
              !hasChildren && "invisible"
            )}
            type="button"
          >
            {department.isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {/* Department Icon with proper color coding */}
          <div className={cn(
            "p-1.5 rounded-lg shrink-0",
            department.department_type === 'academic' ? 'bg-green-100 dark:bg-green-900/30' :
            department.department_type === 'administrative' ? 'bg-purple-100 dark:bg-purple-900/30' :
            department.department_type === 'support' ? 'bg-green-100 dark:bg-green-900/30' :
            department.department_type === 'operations' ? 'bg-orange-100 dark:bg-orange-900/30' :
            'bg-gray-100 dark:bg-gray-900/30'
          )}>
            <Icon className={cn(
              "h-4 w-4",
              department.department_type === 'academic' ? 'text-green-600 dark:text-green-400' :
              department.department_type === 'administrative' ? 'text-purple-600 dark:text-purple-400' :
              department.department_type === 'support' ? 'text-green-600 dark:text-green-400' :
              department.department_type === 'operations' ? 'text-orange-600 dark:text-orange-400' :
              'text-gray-600 dark:text-gray-400'
            )} />
          </div>
          
          {/* Department Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900 dark:text-white truncate">
                {department.name}
              </span>
              {department.code && (
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded shrink-0">
                  {department.code}
                </span>
              )}
              <StatusBadge status={department.status} size="sm" />
            </div>
            
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
              {department.head_name && (
                <span className="flex items-center gap-1 truncate">
                  <Users className="h-3 w-3 shrink-0" />
                  {department.head_name}
                </span>
              )}
              {department.school_names && department.school_names.length > 0 && (
                <span className="flex items-center gap-1">
                  <School className="h-3 w-3 shrink-0" />
                  {department.school_names.length} school{department.school_names.length > 1 ? 's' : ''}
                </span>
              )}
              {hasChildren && (
                <span className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3 shrink-0" />
                  {department.children?.length} sub-dept{department.children?.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails(department)}
            className="h-8 w-8 p-0"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(department)}
            className="h-8 w-8 p-0"
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          {onAddChild && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddChild(department)}
              className="h-8 w-8 p-0"
              title="Add Sub-department"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDuplicate(department)}
            className="h-8 w-8 p-0"
            title="Duplicate"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(department)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Render Children with animation */}
      {hasChildren && department.isExpanded && (
        <div className={cn(
          "transition-all duration-300 ease-in-out",
          department.isExpanded ? "opacity-100" : "opacity-0"
        )}>
          {department.children?.map(child => (
            <DepartmentNode
              key={child.id}
              department={child}
              level={level + 1}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onViewDetails={onViewDetails}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </>
  );
};

// Hierarchical Table Row Component for nested display in table view
const DepartmentTableRow = ({
  department,
  level = 0,
  onToggleExpand,
  onEdit,
  onDelete,
  onDuplicate,
  onViewDetails
}: {
  department: Department;
  level?: number;
  onToggleExpand: (deptId: string) => void;
  onEdit: (dept: Department) => void;
  onDelete: (dept: Department) => void;
  onDuplicate: (dept: Department) => void;
  onViewDetails: (dept: Department) => void;
}) => {
  const hasChildren = department.children && department.children.length > 0;
  const typeConfig = DEPARTMENT_TYPES.find(t => t.value === department.department_type);
  const Icon = typeConfig?.icon || Building2;
  const DeptLevelIcon = department.department_level === 'company' ? Building :
                         department.department_level === 'school' ? School : 
                         department.department_level === 'branch' ? MapPin : Building2;
  
  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        {/* Department Name Cell with Expand/Collapse */}
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 2}rem` }}>
            <button
              onClick={() => onToggleExpand(department.id)}
              className={cn(
                "p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors",
                !hasChildren && "invisible"
              )}
              type="button"
            >
              {department.isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
            
            <div className={cn(
              "p-1.5 rounded-lg",
              department.department_type === 'academic' ? 'bg-green-100 dark:bg-green-900/30' :
              department.department_type === 'administrative' ? 'bg-purple-100 dark:bg-purple-900/30' :
              department.department_type === 'support' ? 'bg-green-100 dark:bg-green-900/30' :
              department.department_type === 'operations' ? 'bg-orange-100 dark:bg-orange-900/30' :
              'bg-gray-100 dark:bg-gray-900/30'
            )}>
              <Icon className={cn(
                "h-4 w-4",
                department.department_type === 'academic' ? 'text-green-600 dark:text-green-400' :
                department.department_type === 'administrative' ? 'text-purple-600 dark:text-purple-400' :
                department.department_type === 'support' ? 'text-green-600 dark:text-green-400' :
                department.department_type === 'operations' ? 'text-orange-600 dark:text-orange-400' :
                'text-gray-600 dark:text-gray-400'
              )} />
            </div>
            
            <DeptLevelIcon className={cn(
              "h-4 w-4",
              department.department_level === 'company' ? 'text-purple-500' :
              department.department_level === 'school' ? 'text-green-500' :
              department.department_level === 'branch' ? 'text-green-500' :
              'text-gray-500'
            )} />
            
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {department.name}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {department.code && (
                  <div className="flex items-center gap-1">
                    <Hash className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {department.code}
                    </span>
                  </div>
                )}
                {level > 0 && department.parent_department && (
                  <div className="flex items-center gap-1">
                    <ChevronRight className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Under {department.parent_department.name}
                    </span>
                  </div>
                )}
                {hasChildren && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {department.children?.length} sub-dept{department.children?.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>
        
        {/* Type Cell */}
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
            department.department_type === 'academic' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
            department.department_type === 'administrative' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
            department.department_type === 'support' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
            department.department_type === 'operations' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
            'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
          )}>
            {typeConfig?.label || department.department_type}
          </span>
        </td>
        
        {/* Schools Cell */}
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex flex-wrap gap-1">
            {department.school_names?.slice(0, 2).map((name, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700">
                <School className="h-3 w-3" />
                {name}
              </span>
            ))}
            {department.school_names && department.school_names.length > 2 && (
              <span className="text-xs text-gray-500">
                +{department.school_names.length - 2} more
              </span>
            )}
            {(!department.school_names || department.school_names.length === 0) && (
              <span className="text-xs text-gray-400">All schools</span>
            )}
          </div>
        </td>
        
        {/* Branches Cell */}
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex flex-wrap gap-1">
            {department.branch_names && department.branch_names.length > 0 ? (
              <>
                {department.branch_names.slice(0, 1).map((name, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700">
                    <MapPin className="h-3 w-3" />
                    {name}
                  </span>
                ))}
                {department.branch_names.length > 1 && (
                  <span className="text-xs text-gray-500">
                    +{department.branch_names.length - 1} more
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-400">All branches</span>
            )}
          </div>
        </td>
        
        {/* Department Head Cell */}
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm">
            {department.head_name ? (
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {department.head_name}
                </div>
                {department.head_email && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {department.head_email}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-400">Not assigned</span>
            )}
          </div>
        </td>
        
        {/* Contact Cell */}
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="space-y-1">
            {department.contact_email && (
              <div className="flex items-center gap-1 text-sm">
                <Mail className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">
                  {department.contact_email}
                </span>
              </div>
            )}
            {department.contact_phone && (
              <div className="flex items-center gap-1 text-sm">
                <Phone className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">
                  {department.contact_phone}
                </span>
              </div>
            )}
            {!department.contact_email && !department.contact_phone && (
              <span className="text-sm text-gray-400">-</span>
            )}
          </div>
        </td>
        
        {/* Status Cell */}
        <td className="px-6 py-4 whitespace-nowrap">
          <StatusBadge status={department.status} />
        </td>
        
        {/* Actions Cell */}
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <QuickActionsMenu
            department={department}
            onEdit={() => onEdit(department)}
            onDelete={() => onDelete(department)}
            onDuplicate={() => onDuplicate(department)}
            onViewDetails={() => onViewDetails(department)}
          />
        </td>
      </tr>
      
      {/* Render Children Rows */}
      {hasChildren && department.isExpanded && department.children?.map(child => (
        <DepartmentTableRow
          key={child.id}
          department={child}
          level={level + 1}
          onToggleExpand={onToggleExpand}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onViewDetails={onViewDetails}
        />
      ))}
    </>
  );
};

// Quick actions menu component
const QuickActionsMenu = ({ 
  department, 
  onEdit, 
  onDelete, 
  onDuplicate, 
  onViewDetails 
}: {
  department: Department;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onViewDetails: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8 p-0"
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
          <button
            onClick={() => { onViewDetails(); setIsOpen(false); }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Eye className="h-4 w-4" />
            View Details
          </button>
          <button
            onClick={() => { onEdit(); setIsOpen(false); }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => { onDuplicate(); setIsOpen(false); }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </button>
          <hr className="my-1 border-gray-200 dark:border-gray-700" />
          <button
            onClick={() => { onDelete(); setIsOpen(false); }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export function DepartmentsTab({ companyId }: DepartmentsTabProps) {
  const queryClient = useQueryClient();
  const { getScopeFilters, isEntityAdmin, isSubEntityAdmin, can } = useAccessControl();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [viewingDepartment, setViewingDepartment] = useState<Department | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'assignments' | 'contact' | 'settings'>('details');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    departments: Department[];
  }>({ isOpen: false, departments: [] });
  const [isExporting, setIsExporting] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'hierarchy'>('table');
  const [isSaving, setIsSaving] = useState(false);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());

  // Auto-expand parent departments when data loads
  useEffect(() => {
    if (departments && departments.length > 0) {
      const parentsWithChildren = departments.filter(d => (d.children_count || 0) > 0);
      const parentIds = new Set(parentsWithChildren.map(d => d.id));
      console.log('Auto-expanding parent departments:', parentsWithChildren.map(d => d.name));
      setExpandedDepartments(parentIds);
    }
  }, [departments]);

  // Tab error tracking
  const [tabErrors, setTabErrors] = useState({
    details: false,
    assignments: false,
    contact: false,
    settings: false
  });

  // Filter state with enhanced options
  const [filters, setFilters] = useState({
    search: '',
    school_ids: [] as string[],
    branch_ids: [] as string[],
    department_type: [] as string[],
    status: [] as string[],
    has_head: null as boolean | null,
    parent_id: '',
    date_from: '',
    date_to: ''
  });

  // Form state
  const [formData, setFormData] = useState<DepartmentFormData>({
    company_id: companyId || '',
    school_ids: [],
    branch_ids: [],
    name: '',
    code: null,
    department_type: 'academic',
    description: null,
    parent_department_id: null,
    head_id: null,
    head_name: null,
    head_email: null,
    contact_email: null,
    contact_phone: null,
    status: 'active'
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Get scope filters
  const scopeFilters = getScopeFilters('schools');
  const canAccessAll = isEntityAdmin || isSubEntityAdmin;

  // Fetch schools
  const { data: schools = [], isLoading: schoolsLoading } = useQuery({
    queryKey: ['schools-for-departments', companyId, scopeFilters],
    queryFn: async () => {
      if (!companyId) return [];

      let query = supabase
        .from('schools')
        .select('id, name, code, status')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      if (!canAccessAll && scopeFilters.school_ids?.length) {
        query = query.in('id', scopeFilters.school_ids);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId
  });

  // Fetch branches based on selected schools
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-for-departments', formData.school_ids],
    queryFn: async () => {
      if (!formData.school_ids.length) return [];

      const { data, error } = await supabase
        .from('branches')
        .select('id, name, code, school_id')
        .in('school_id', formData.school_ids)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: formData.school_ids.length > 0
  });

  // Fetch all branches for filtering
  const { data: allBranches = [] } = useQuery({
    queryKey: ['all-branches-for-filtering', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('branches')
        .select('id, name, school_id')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId
  });

  // Fetch departments with enhanced joins
  const { 
    data: departments = [], 
    isLoading, 
    isFetching,
    refetch 
  } = useQuery({
    queryKey: ['departments', companyId, filters],
    queryFn: async () => {
      if (!companyId) return [];

      // Base query
      let query = supabase
        .from('departments')
        .select(`
          *,
          parent_department:parent_department_id(id, name)
        `)
        .eq('company_id', companyId)
        .order('name');

      // Apply filters
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        query = query.or(
          `name.ilike.%${searchLower}%,` +
          `code.ilike.%${searchLower}%,` +
          `head_name.ilike.%${searchLower}%,` +
          `description.ilike.%${searchLower}%`
        );
      }

      if (filters.department_type.length > 0) {
        query = query.in('department_type', filters.department_type);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters.has_head === true) {
        query = query.not('head_name', 'is', null);
      } else if (filters.has_head === false) {
        query = query.is('head_name', null);
      }

      if (filters.parent_id) {
        query = query.eq('parent_department_id', filters.parent_id);
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data: departmentsData, error } = await query;
      if (error) throw error;

      // Fetch school and branch assignments
      const departmentIds = departmentsData?.map(d => d.id) || [];
      if (departmentIds.length === 0) return [];

      // Fetch school assignments
      const { data: schoolAssignments } = await supabase
        .from('department_schools')
        .select(`
          department_id,
          school:school_id(id, name)
        `)
        .in('department_id', departmentIds);

      // Fetch branch assignments
      const { data: branchAssignments } = await supabase
        .from('department_branches')
        .select(`
          department_id,
          branch:branch_id(id, name)
        `)
        .in('department_id', departmentIds);

      // Get children counts
      const { data: childrenCounts } = await supabase
        .from('departments')
        .select('parent_department_id')
        .in('parent_department_id', departmentIds);

      // Process and combine data
      const processedDepartments = departmentsData?.map(dept => {
        const deptSchools = schoolAssignments?.filter(sa => sa.department_id === dept.id) || [];
        const deptBranches = branchAssignments?.filter(ba => ba.department_id === dept.id) || [];
        const childrenCount = childrenCounts?.filter(c => c.parent_department_id === dept.id).length || 0;

        const schoolIds = deptSchools.map(ds => ds.school?.id).filter(Boolean);
        const schoolNames = deptSchools.map(ds => ds.school?.name).filter(Boolean);
        const branchIds = deptBranches.map(db => db.branch?.id).filter(Boolean);
        const branchNames = deptBranches.map(db => db.branch?.name).filter(Boolean);

        // Determine department level
        let departmentLevel: 'company' | 'school' | 'branch' = 'company';
        if (branchIds.length > 0) {
          departmentLevel = 'branch';
        } else if (schoolIds.length > 0) {
          departmentLevel = 'school';
        }

        // Build hierarchy path
        let hierarchyPath = dept.name;
        if (dept.parent_department) {
          hierarchyPath = `${dept.parent_department.name} > ${dept.name}`;
        }

        return {
          ...dept,
          assigned_schools: schoolIds,
          school_names: schoolNames,
          assigned_branches: branchIds,
          branch_names: branchNames,
          children_count: childrenCount,
          department_level: departmentLevel,
          hierarchy_path: hierarchyPath,
          isExpanded: expandedDepartments.has(dept.id)
        };
      }) || [];

      // Apply school/branch filters
      let filteredDepartments = processedDepartments;

      if (filters.school_ids.length > 0) {
        filteredDepartments = filteredDepartments.filter(dept => 
          dept.assigned_schools?.some(schoolId => filters.school_ids.includes(schoolId))
        );
      }

      if (filters.branch_ids.length > 0) {
        filteredDepartments = filteredDepartments.filter(dept => 
          dept.assigned_branches?.some(branchId => filters.branch_ids.includes(branchId))
        );
      }

      return filteredDepartments;
    },
    enabled: !!companyId
  });

  // Build hierarchical structure with proper isExpanded
  const hierarchicalDepartments = useMemo(() => {
    const buildTree = (departments: Department[]): Department[] => {
      const departmentMap = new Map<string, Department>();
      const rootDepartments: Department[] = [];
      
      // First pass: create map of all departments with isExpanded property
      departments.forEach(dept => {
        departmentMap.set(dept.id, { 
          ...dept, 
          children: [],
          isExpanded: expandedDepartments.has(dept.id) // Add isExpanded here
        });
      });
      
      // Second pass: build tree structure
      departments.forEach(dept => {
        const currentDept = departmentMap.get(dept.id);
        if (!currentDept) return;
        
        if (dept.parent_department_id) {
          const parent = departmentMap.get(dept.parent_department_id);
          if (parent) {
            if (!parent.children) parent.children = [];
            parent.children.push(currentDept);
          } else {
            rootDepartments.push(currentDept);
          }
        } else {
          rootDepartments.push(currentDept);
        }
      });
      
      // Sort children at each level
      const sortDepartments = (depts: Department[]): Department[] => {
        return depts.sort((a, b) => a.name.localeCompare(b.name)).map(dept => ({
          ...dept,
          children: dept.children ? sortDepartments(dept.children) : []
        }));
      };
      
      return sortDepartments(rootDepartments);
    };
    
    return buildTree(departments);
  }, [departments, expandedDepartments]); // Add expandedDepartments as dependency

  // Toggle department expansion
  const toggleDepartmentExpansion = useCallback((deptId: string) => {
    setExpandedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deptId)) {
        newSet.delete(deptId);
      } else {
        newSet.add(deptId);
      }
      return newSet;
    });
  }, []);

  // Add child department handler
  const handleAddChild = useCallback((parentDept: Department) => {
    setEditingDepartment(null);
    setFormData(prev => ({
      ...prev,
      parent_department_id: parentDept.id,
      department_type: parentDept.department_type, // Inherit parent's type by default
      school_ids: parentDept.assigned_schools || [], // Inherit parent's schools
      branch_ids: parentDept.assigned_branches || [], // Inherit parent's branches
      name: '',
      code: null,
      description: null,
      head_id: null,
      head_name: null,
      head_email: null,
      contact_email: null,
      contact_phone: null,
      status: 'active'
    }));
    setIsFormOpen(true);
    setActiveTab('details');
  }, []);

  // Calculate statistics
  const stats = useMemo<DepartmentStats>(() => {
    const byType = departments.reduce((acc, dept) => {
      acc[dept.department_type] = (acc[dept.department_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: departments.length,
      active: departments.filter(d => d.status === 'active').length,
      inactive: departments.filter(d => d.status === 'inactive').length,
      byType,
      withHeads: departments.filter(d => d.head_name).length,
      parentDepartments: departments.filter(d => (d.children_count || 0) > 0).length
    };
  }, [departments]);

  // Get parent departments for dropdown
  const parentDepartments = useMemo(() => {
    return departments.filter(d => d.id !== editingDepartment?.id);
  }, [departments, editingDepartment]);

  // Check for duplicate department name
  const checkDuplicateName = useCallback(async (name: string, excludeId?: string) => {
    if (!name || !companyId) return false;

    let query = supabase
      .from('departments')
      .select('id')
      .eq('company_id', companyId)
      .ilike('name', name);
    
    // Only add the neq filter if excludeId is provided
    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query;

    return (data?.length || 0) > 0;
  }, [companyId]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      company_id: companyId || '',
      school_ids: [],
      branch_ids: [],
      name: '',
      code: null,
      department_type: 'academic',
      description: null,
      parent_department_id: null,
      head_id: null,
      head_name: null,
      head_email: null,
      contact_email: null,
      contact_phone: null,
      status: 'active'
    });
    setFormErrors({});
    setTabErrors({
      details: false,
      assignments: false,
      contact: false,
      settings: false
    });
    setActiveTab('details');
    setIsSaving(false);
  }, [companyId]);

  // Load department for editing
  const loadDepartmentForEdit = useCallback(async (dept: Department) => {
    // Fetch school assignments
    const { data: schoolAssignments } = await supabase
      .from('department_schools')
      .select('school_id')
      .eq('department_id', dept.id);

    const schoolIds = schoolAssignments?.map(sa => sa.school_id) || [];

    // Fetch branch assignments
    const { data: branchAssignments } = await supabase
      .from('department_branches')
      .select('branch_id')
      .eq('department_id', dept.id);

    const branchIds = branchAssignments?.map(ba => ba.branch_id) || [];

    setFormData({
      company_id: dept.company_id || companyId || '',
      school_ids: schoolIds,
      branch_ids: branchIds,
      name: dept.name,
      code: dept.code,
      department_type: dept.department_type,
      description: dept.description,
      parent_department_id: dept.parent_department_id,
      head_id: dept.head_id,
      head_name: dept.head_name,
      head_email: dept.head_email,
      contact_email: dept.contact_email,
      contact_phone: dept.contact_phone,
      status: dept.status
    });
  }, [companyId]);

  // Handle form open/close
  useEffect(() => {
    if (isFormOpen) {
      if (editingDepartment) {
        loadDepartmentForEdit(editingDepartment);
      } else if (!formData.parent_department_id) {
        // Only reset if not adding a child department
        resetForm();
      }
    }
  }, [isFormOpen, editingDepartment, loadDepartmentForEdit, resetForm, formData.parent_department_id]);

  // Validate form and update tab errors
  const validateForm = useCallback((): boolean => {
    try {
      departmentSchema.parse(formData);
      setFormErrors({});
      setTabErrors({
        details: false,
        assignments: false,
        contact: false,
        settings: false
      });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        const newTabErrors = {
          details: false,
          assignments: false,
          contact: false,
          settings: false
        };

        error.errors.forEach(err => {
          const field = err.path[0]?.toString();
          if (field) {
            errors[field] = err.message;

            // Update tab errors
            if (['name', 'code', 'department_type', 'description', 'parent_department_id'].includes(field)) {
              newTabErrors.details = true;
            } else if (['school_ids', 'branch_ids'].includes(field)) {
              newTabErrors.assignments = true;
            } else if (['head_name', 'head_email', 'contact_email', 'contact_phone'].includes(field)) {
              newTabErrors.contact = true;
            } else if (['status'].includes(field)) {
              newTabErrors.settings = true;
            }
          }
        });

        setFormErrors(errors);
        setTabErrors(newTabErrors);
      }
      return false;
    }
  }, [formData]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: DepartmentFormData) => {
      // Check for duplicate name
      const isDuplicate = await checkDuplicateName(data.name);
      if (isDuplicate) {
        throw new Error('A department with this name already exists');
      }

      // Validate data
      const validated = departmentSchema.parse(data);

      // Create department
      const departmentData = {
        company_id: validated.company_id,
        name: validated.name,
        code: validated.code,
        department_type: validated.department_type,
        description: validated.description,
        parent_department_id: validated.parent_department_id,
        head_id: validated.head_id,
        head_name: validated.head_name,
        head_email: validated.head_email,
        contact_email: validated.contact_email,
        contact_phone: validated.contact_phone,
        status: validated.status
      };

      const { data: newDept, error } = await supabase
        .from('departments')
        .insert([departmentData])
        .select()
        .single();

      if (error) throw error;

      // Create school assignments
      if (validated.school_ids.length > 0) {
        const schoolAssignments = validated.school_ids.map(schoolId => ({
          department_id: newDept.id,
          school_id: schoolId
        }));

        const { error: schoolError } = await supabase
          .from('department_schools')
          .insert(schoolAssignments);

        if (schoolError) throw schoolError;
      }

      // Create branch assignments
      if (validated.branch_ids && validated.branch_ids.length > 0) {
        const branchAssignments = validated.branch_ids.map(branchId => ({
          department_id: newDept.id,
          branch_id: branchId
        }));

        const { error: branchError } = await supabase
          .from('department_branches')
          .insert(branchAssignments);

        if (branchError) throw branchError;
      }

      return newDept;
    },
    onSuccess: () => {
      toast.success('Department created successfully');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsFormOpen(false);
      resetForm();
      setIsSaving(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create department');
      setIsSaving(false);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: DepartmentFormData) => {
      if (!editingDepartment) throw new Error('No department to update');

      // Check for duplicate name
      const isDuplicate = await checkDuplicateName(data.name, editingDepartment.id);
      if (isDuplicate) {
        throw new Error('A department with this name already exists');
      }

      // Validate data
      const validated = departmentSchema.parse(data);

      // Update department - ensure phone is properly formatted
      const departmentData = {
        name: validated.name,
        code: validated.code,
        department_type: validated.department_type,
        description: validated.description,
        parent_department_id: validated.parent_department_id,
        head_id: validated.head_id,
        head_name: validated.head_name,
        head_email: validated.head_email,
        contact_email: validated.contact_email,
        contact_phone: validated.contact_phone ? String(validated.contact_phone).trim() : null,
        status: validated.status,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('departments')
        .update(departmentData)
        .eq('id', editingDepartment.id);

      if (error) throw error;

      // Update school assignments
      await supabase
        .from('department_schools')
        .delete()
        .eq('department_id', editingDepartment.id);

      if (validated.school_ids.length > 0) {
        const schoolAssignments = validated.school_ids.map(schoolId => ({
          department_id: editingDepartment.id,
          school_id: schoolId
        }));

        const { error: schoolError } = await supabase
          .from('department_schools')
          .insert(schoolAssignments);

        if (schoolError) throw schoolError;
      }

      // Update branch assignments
      await supabase
        .from('department_branches')
        .delete()
        .eq('department_id', editingDepartment.id);

      if (validated.branch_ids && validated.branch_ids.length > 0) {
        const branchAssignments = validated.branch_ids.map(branchId => ({
          department_id: editingDepartment.id,
          branch_id: branchId
        }));

        const { error: branchError } = await supabase
          .from('department_branches')
          .insert(branchAssignments);

        if (branchError) throw branchError;
      }

      return { ...editingDepartment, ...departmentData };
    },
    onSuccess: () => {
      toast.success('Department updated successfully');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsFormOpen(false);
      setEditingDepartment(null);
      resetForm();
      setIsSaving(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update department');
      setIsSaving(false);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (departmentIds: string[]) => {
      // Check for child departments
      const { data: children } = await supabase
        .from('departments')
        .select('id')
        .in('parent_department_id', departmentIds);

      if (children && children.length > 0) {
        throw new Error('Cannot delete departments with child departments');
      }

      // Delete assignments first
      await supabase
        .from('department_schools')
        .delete()
        .in('department_id', departmentIds);

      await supabase
        .from('department_branches')
        .delete()
        .in('department_id', departmentIds);

      await supabase
        .from('class_section_departments')
        .delete()
        .in('department_id', departmentIds);

      // Delete departments
      const { error } = await supabase
        .from('departments')
        .delete()
        .in('id', departmentIds);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Department(s) deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setDeleteConfirmation({ isOpen: false, departments: [] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete department(s)');
    }
  });

  // Handle form submission
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!isSaving) {
      return;
    }
    
    setIsSaving(false);
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    if (editingDepartment) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  }, [formData, editingDepartment, validateForm, createMutation, updateMutation, isSaving]);

  // Handle intentional save (button click)
  const handleSaveClick = useCallback(() => {
    setIsSaving(true);
    setTimeout(() => {
      const form = document.querySelector('#department-form') as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }, 0);
  }, []);

  // Handle Enter key press for save
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      e.stopPropagation();
      setIsSaving(true);
      setTimeout(() => {
        const form = document.querySelector('#department-form') as HTMLFormElement;
        if (form) {
          form.requestSubmit();
        }
      }, 0);
    }
  }, []);

  // Handle delete
  const handleDelete = useCallback((departments: Department[]) => {
    setDeleteConfirmation({
      isOpen: true,
      departments
    });
  }, []);

  // Confirm delete
  const confirmDelete = useCallback(() => {
    const ids = deleteConfirmation.departments.map(d => d.id);
    deleteMutation.mutate(ids);
  }, [deleteConfirmation.departments, deleteMutation]);

  // Handle duplicate
  const handleDuplicate = useCallback((dept: Department) => {
    setEditingDepartment(null);
    setFormData(prev => ({
      ...prev,
      name: `${dept.name} (Copy)`,
      code: dept.code ? `${dept.code}-COPY` : null
    }));
    setIsFormOpen(true);
  }, []);

  // Export to CSV
  const handleExport = useCallback(() => {
    setIsExporting(true);
    
    try {
      const csvContent = [
        // Headers
        ['Name', 'Code', 'Type', 'Schools', 'Head', 'Contact Email', 'Status', 'Created'],
        // Data
        ...departments.map(dept => [
          dept.name,
          dept.code || '',
          dept.department_type,
          dept.school_names?.join(', ') || '',
          dept.head_name || '',
          dept.contact_email || '',
          dept.status,
          new Date(dept.created_at).toLocaleDateString()
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `departments-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Departments exported successfully');
    } catch (error) {
      toast.error('Failed to export departments');
    } finally {
      setIsExporting(false);
    }
  }, [departments]);

  // Department level icon component
  const DepartmentLevelIcon = ({ level }: { level: string }) => {
    switch (level) {
      case 'company':
        return <Building className="h-4 w-4 text-purple-500" />;
      case 'school':
        return <School className="h-4 w-4 text-green-500" />;
      case 'branch':
        return <MapPin className="h-4 w-4 text-green-500" />;
      default:
        return <Building2 className="h-4 w-4 text-gray-500" />;
    }
  };

  // Table columns configuration
  const columns = [
    {
      id: 'name',
      header: 'Department',
      accessorKey: 'name',
      enableSorting: true,
      cell: (row: Department) => {
        const typeConfig = DEPARTMENT_TYPES.find(t => t.value === row.department_type);
        const Icon = typeConfig?.icon || Building2;
        
        return (
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-lg",
              row.department_type === 'academic' ? 'bg-green-100 dark:bg-green-900/30' :
              row.department_type === 'administrative' ? 'bg-purple-100 dark:bg-purple-900/30' :
              row.department_type === 'support' ? 'bg-green-100 dark:bg-green-900/30' :
              row.department_type === 'operations' ? 'bg-orange-100 dark:bg-orange-900/30' :
              'bg-gray-100 dark:bg-gray-900/30'
            )}>
              <Icon className={cn(
                "h-4 w-4",
                row.department_type === 'academic' ? 'text-green-600 dark:text-green-400' :
                row.department_type === 'administrative' ? 'text-purple-600 dark:text-purple-400' :
                row.department_type === 'support' ? 'text-green-600 dark:text-green-400' :
                row.department_type === 'operations' ? 'text-orange-600 dark:text-orange-400' :
                'text-gray-600 dark:text-gray-400'
              )} />
            </div>
            <div className="flex items-center gap-1">
              <DepartmentLevelIcon level={row.department_level || 'company'} />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {row.name}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {row.code && (
                  <div className="flex items-center gap-1">
                    <Hash className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {row.code}
                    </span>
                  </div>
                )}
                {row.parent_department && (
                  <div className="flex items-center gap-1">
                    <ChevronRight className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Under {row.parent_department.name}
                    </span>
                  </div>
                )}
                {row.children_count && row.children_count > 0 && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {row.children_count} sub-dept{row.children_count > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      id: 'type',
      header: 'Type',
      accessorKey: 'department_type',
      enableSorting: true,
      cell: (row: Department) => {
        const typeConfig = DEPARTMENT_TYPES.find(t => t.value === row.department_type);
        return (
          <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
            row.department_type === 'academic' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
            row.department_type === 'administrative' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
            row.department_type === 'support' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
            row.department_type === 'operations' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
            'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
          )}>
            {typeConfig?.label || row.department_type}
          </span>
        );
      }
    },
    {
      id: 'schools',
      header: 'Schools',
      cell: (row: Department) => (
        <div className="flex flex-wrap gap-1">
          {row.school_names?.slice(0, 2).map((name, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700">
              <School className="h-3 w-3" />
              {name}
            </span>
          ))}
          {row.school_names && row.school_names.length > 2 && (
            <span className="text-xs text-gray-500">
              +{row.school_names.length - 2} more
            </span>
          )}
          {(!row.school_names || row.school_names.length === 0) && (
            <span className="text-xs text-gray-400">All schools</span>
          )}
        </div>
      )
    },
    {
      id: 'branches',
      header: 'Branches',
      cell: (row: Department) => (
        <div className="flex flex-wrap gap-1">
          {row.branch_names && row.branch_names.length > 0 ? (
            <>
              {row.branch_names.slice(0, 1).map((name, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700">
                  <MapPin className="h-3 w-3" />
                  {name}
                </span>
              ))}
              {row.branch_names.length > 1 && (
                <span className="text-xs text-gray-500">
                  +{row.branch_names.length - 1} more
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-400">All branches</span>
          )}
        </div>
      )
    },
    {
      id: 'head',
      header: 'Department Head',
      cell: (row: Department) => (
        <div className="text-sm">
          {row.head_name ? (
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {row.head_name}
              </div>
              {row.head_email && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {row.head_email}
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-400">Not assigned</span>
          )}
        </div>
      )
    },
    {
      id: 'contact',
      header: 'Contact',
      cell: (row: Department) => (
        <div className="space-y-1">
          {row.contact_email && (
            <div className="flex items-center gap-1 text-sm">
              <Mail className="h-3 w-3 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">
                {row.contact_email}
              </span>
            </div>
          )}
          {row.contact_phone && (
            <div className="flex items-center gap-1 text-sm">
              <Phone className="h-3 w-3 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">
                {row.contact_phone}
              </span>
            </div>
          )}
          {!row.contact_email && !row.contact_phone && (
            <span className="text-sm text-gray-400">-</span>
          )}
        </div>
      )
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      enableSorting: true,
      cell: (row: Department) => <StatusBadge status={row.status} />
    },
    {
      id: 'actions',
      header: '',
      cell: (row: Department) => (
        <QuickActionsMenu
          department={row}
          onEdit={() => {
            setEditingDepartment(row);
            setIsFormOpen(true);
          }}
          onDelete={() => handleDelete([row])}
          onDuplicate={() => handleDuplicate(row)}
          onViewDetails={() => setViewingDepartment(row)}
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Departments
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage academic and administrative departments across your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                "px-3 py-1.5 text-sm rounded transition-colors",
                viewMode === 'table' 
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={cn(
                "px-3 py-1.5 text-sm rounded transition-colors",
                viewMode === 'cards' 
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('hierarchy')}
              className={cn(
                "px-3 py-1.5 text-sm rounded transition-colors",
                viewMode === 'hierarchy' 
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              Tree
            </button>
          </div>

          {/* Export button */}
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting || departments.length === 0}
            leftIcon={isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          >
            Export
          </Button>

          {/* Add button - Always visible */}
          <Button
            onClick={() => {
              setEditingDepartment(null);
              setIsFormOpen(true);
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Department
          </Button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.total}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {stats.active}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </div>

          {Object.entries(DEPARTMENT_TYPES).map(([_, config]) => {
            const count = stats.byType[config.value] || 0;
            const Icon = config.icon;
            
            return (
              <div key={config.value} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{config.label}</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {count}
                    </p>
                  </div>
                  <Icon className={cn(
                    "h-8 w-8",
                    config.color === 'green' ? 'text-green-400' :
                    config.color === 'purple' ? 'text-purple-400' :
                    config.color === 'orange' ? 'text-orange-400' :
                    'text-gray-400'
                  )} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <FilterCard
        title="Filters"
        onApply={() => refetch()}
        onClear={() => {
          setFilters({
            search: '',
            school_ids: [],
            branch_ids: [],
            department_type: [],
            status: [],
            has_head: null,
            parent_id: '',
            date_from: '',
            date_to: ''
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField id="search" label="Search">
            <Input
              id="search"
              placeholder="Search name, code, head, description..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              leftIcon={<Search className="h-4 w-4 text-gray-400" />}
            />
          </FormField>

          <SearchableMultiSelect
            label="Schools"
            options={schools.map(s => ({ value: s.id, label: s.name }))}
            selectedValues={filters.school_ids}
            onChange={(values) => setFilters(prev => ({ ...prev, school_ids: values }))}
            placeholder="All schools"
          />

          <SearchableMultiSelect
            label="Branches"
            options={allBranches.map(b => ({ value: b.id, label: b.name }))}
            selectedValues={filters.branch_ids}
            onChange={(values) => setFilters(prev => ({ ...prev, branch_ids: values }))}
            placeholder="All branches"
            disabled={filters.school_ids.length === 0}
          />

          <SearchableMultiSelect
            label="Type"
            options={DEPARTMENT_TYPES.map(t => ({ value: t.value, label: t.label }))}
            selectedValues={filters.department_type}
            onChange={(values) => setFilters(prev => ({ ...prev, department_type: values }))}
            placeholder="All types"
          />

          <SearchableMultiSelect
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            selectedValues={filters.status}
            onChange={(values) => setFilters(prev => ({ ...prev, status: values }))}
            placeholder="All statuses"
          />

          <FormField id="parent" label="Parent Department">
            <Select
              id="parent"
              value={filters.parent_id}
              onChange={(value) => setFilters(prev => ({ ...prev, parent_id: value }))}
              options={[
                { value: '', label: 'All departments' },
                ...parentDepartments.map(d => ({ value: d.id, label: d.name }))
              ]}
            />
          </FormField>

          <FormField id="date_from" label="Created From">
            <Input
              id="date_from"
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target ? e.target.value : e }))}
            />
          </FormField>

          <FormField id="date_to" label="Created To">
            <Input
              id="date_to"
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target ? e.target.value : e }))}
            />
          </FormField>
        </div>
      </FilterCard>

      {/* Data Display */}
      {isLoading ? (
        <DepartmentSkeleton />
      ) : viewMode === 'table' ? (
        <DataTable
          data={departments}
          columns={columns}
          keyField="id"
          caption="List of departments with details"
          ariaLabel="Departments table"
          loading={isLoading}
          isFetching={isFetching}
          onEdit={(dept) => {
            setEditingDepartment(dept);
            setIsFormOpen(true);
          }}
          onDelete={handleDelete}
          emptyMessage="No departments found"
        />
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => {
            const typeConfig = DEPARTMENT_TYPES.find(t => t.value === dept.department_type);
            const Icon = typeConfig?.icon || Building2;
            
            return (
              <div
                key={dept.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-2 rounded-lg",
                      dept.department_type === 'academic' ? 'bg-green-100 dark:bg-green-900/30' :
                      dept.department_type === 'administrative' ? 'bg-purple-100 dark:bg-purple-900/30' :
                      dept.department_type === 'support' ? 'bg-green-100 dark:bg-green-900/30' :
                      dept.department_type === 'operations' ? 'bg-orange-100 dark:bg-orange-900/30' :
                      'bg-gray-100 dark:bg-gray-900/30'
                    )}>
                      <Icon className={cn(
                        "h-5 w-5",
                        dept.department_type === 'academic' ? 'text-green-600 dark:text-green-400' :
                        dept.department_type === 'administrative' ? 'text-purple-600 dark:text-purple-400' :
                        dept.department_type === 'support' ? 'text-green-600 dark:text-green-400' :
                        dept.department_type === 'operations' ? 'text-orange-600 dark:text-orange-400' :
                        'text-gray-600 dark:text-gray-400'
                      )} />
                    </div>
                    <DepartmentLevelIcon level={dept.department_level || 'company'} />
                  </div>
                  <StatusBadge status={dept.status} size="sm" />
                </div>

                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {dept.name}
                </h3>

                {dept.code && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Code: {dept.code}
                  </p>
                )}

                {dept.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                    {dept.description}
                  </p>
                )}

                <div className="space-y-2">
                  {dept.head_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">{dept.head_name}</span>
                    </div>
                  )}

                  {dept.school_names && dept.school_names.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <School className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">
                        {dept.school_names.length} school{dept.school_names.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {dept.children_count && dept.children_count > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <GitBranch className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">
                        {dept.children_count} sub-departments
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewingDepartment(dept)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingDepartment(dept);
                      setIsFormOpen(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete([dept])}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'hierarchy' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Department Hierarchy
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({departments.length} department{departments.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const allIds = new Set<string>();
                    const collectIds = (depts: Department[]) => {
                      depts.forEach(dept => {
                        allIds.add(dept.id);
                        if (dept.children) collectIds(dept.children);
                      });
                    };
                    collectIds(hierarchicalDepartments);
                    setExpandedDepartments(allIds);
                  }}
                  className="text-[#8CC63F] border-[#8CC63F] hover:bg-[#8CC63F]/10"
                >
                  <FolderOpen className="h-4 w-4 mr-1" />
                  Expand All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExpandedDepartments(new Set())}
                  className="text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <FolderClosed className="h-4 w-4 mr-1" />
                  Collapse All
                </Button>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {hierarchicalDepartments.length > 0 ? (
              <div className="space-y-1">
                {hierarchicalDepartments.map(dept => (
                  <DepartmentNode
                    key={dept.id}
                    department={dept}
                    level={0}
                    onToggleExpand={toggleDepartmentExpansion}
                    onEdit={(d) => {
                      setEditingDepartment(d);
                      setIsFormOpen(true);
                    }}
                    onDelete={(d) => handleDelete([d])}
                    onDuplicate={handleDuplicate}
                    onViewDetails={setViewingDepartment}
                    onAddChild={handleAddChild}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No departments found
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Click "Add Department" to create your first department
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Modal */}
      <SlideInForm
        title={editingDepartment ? 'Edit Department' : 'Create Department'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingDepartment(null);
          resetForm();
          setIsSaving(false);
        }}
        onSave={handleSaveClick}
        loading={createMutation.isPending || updateMutation.isPending}
        className="[&_input:focus]:ring-2 [&_input:focus]:ring-[#8CC63F] [&_input:focus]:border-[#8CC63F] [&_textarea:focus]:ring-2 [&_textarea:focus]:ring-[#8CC63F] [&_textarea:focus]:border-[#8CC63F] [&_select:focus]:ring-2 [&_select:focus]:ring-[#8CC63F] [&_select:focus]:border-[#8CC63F] [&_.react-select__control--is-focused]:border-[#8CC63F] [&_.react-select__control--is-focused]:shadow-[0_0_0_1px_#8CC63F] [&_button:focus]:ring-2 [&_button:focus]:ring-[#8CC63F] [&_button:focus]:border-[#8CC63F]"
      >
        <form 
          id="department-form"
          onSubmit={handleSubmit} 
          className="space-y-4"
          onKeyDown={handleKeyDown}
        >
          <Tabs 
            value={activeTab} 
            onValueChange={(v) => {
              setActiveTab(v as any);
            }}
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details" className="relative">
                Details
                {tabErrors.details && !editingDepartment && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
                )}
              </TabsTrigger>
              <TabsTrigger value="assignments" className="relative">
                Assignments
                {tabErrors.assignments && !editingDepartment && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
                )}
              </TabsTrigger>
              <TabsTrigger value="contact" className="relative">
                Contact
                {tabErrors.contact && !editingDepartment && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" className="relative">
                Settings
                {tabErrors.settings && !editingDepartment && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <FormField
                id="name"
                label="Department Name"
                required
                error={formErrors.name}
              >
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Mathematics Department"
                  leftIcon={<Building2 className="h-4 w-4 text-gray-400" />}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  id="code"
                  label="Department Code"
                  error={formErrors.code}
                  description="Uppercase letters, numbers, and hyphens only"
                >
                  <Input
                    id="code"
                    value={formData.code || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      code: e.target.value.toUpperCase() || null 
                    }))}
                    placeholder="e.g., MATH"
                    leftIcon={<Hash className="h-4 w-4 text-gray-400" />}
                  />
                </FormField>

                <FormField
                  id="department_type"
                  label="Department Type"
                  required
                  error={formErrors.department_type}
                >
                  <Select
                    id="department_type"
                    value={formData.department_type}
                    onChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      department_type: value as Department['department_type']
                    }))}
                    options={DEPARTMENT_TYPES.map(t => ({ 
                      value: t.value, 
                      label: t.label 
                    }))}
                  />
                </FormField>
              </div>

              <FormField
                id="description"
                label="Description"
                error={formErrors.description}
                description="Brief description of the department's purpose and responsibilities"
              >
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    description: e.target.value || null 
                  }))}
                  placeholder="Describe the department..."
                  rows={3}
                />
              </FormField>

              <FormField
                id="parent_department"
                label="Parent Department"
                error={formErrors.parent_department_id}
                description="Select if this is a sub-department"
              >
                <Select
                  id="parent_department"
                  value={formData.parent_department_id || ''}
                  onChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    parent_department_id: value || null 
                  }))}
                  options={[
                    { value: '', label: 'No Parent (Top Level)' },
                    ...parentDepartments.map(d => ({
                      value: d.id,
                      label: d.hierarchy_path || d.name
                    }))
                  ]}
                />
              </FormField>
            </TabsContent>

            <TabsContent value="assignments" className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                  School & Branch Assignment
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Assign this department to specific schools and optionally to specific branches
                </p>
              </div>

              <FormField
                id="school_ids"
                label="Assigned Schools"
                required
                error={formErrors.school_ids}
                description="Select one or more schools where this department operates"
              >
                <SearchableMultiSelect
                  label=""
                  options={schools.map(s => ({ value: s.id, label: s.name }))}
                  selectedValues={formData.school_ids}
                  onChange={(values) => setFormData(prev => ({ 
                    ...prev, 
                    school_ids: values,
                    branch_ids: []
                  }))}
                  placeholder="Select schools..."
                />
              </FormField>

              {formData.school_ids.length > 0 && branches.length > 0 && (
                <FormField
                  id="branch_ids"
                  label="Assigned Branches (Optional)"
                  error={formErrors.branch_ids}
                  description="Leave empty to include all branches in selected schools"
                >
                  <SearchableMultiSelect
                    label=""
                    options={branches.map(b => ({ value: b.id, label: b.name }))}
                    selectedValues={formData.branch_ids || []}
                    onChange={(values) => setFormData(prev => ({ 
                      ...prev, 
                      branch_ids: values 
                    }))}
                    placeholder="All branches in selected schools"
                  />
                </FormField>
              )}
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                  Contact Information
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Department head and contact details for inquiries
                </p>
              </div>

              <FormField
                id="head_name"
                label="Department Head"
                error={formErrors.head_name}
                description="Name of the person in charge of this department"
              >
                <Input
                  id="head_name"
                  value={formData.head_name || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    head_name: e.target.value || null 
                  }))}
                  placeholder="Full name"
                  leftIcon={<Users className="h-4 w-4 text-gray-400" />}
                />
              </FormField>

              <FormField
                id="head_email"
                label="Head's Email"
                error={formErrors.head_email}
                description="Email address of the department head"
              >
                <Input
                  id="head_email"
                  type="email"
                  value={formData.head_email || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    head_email: e.target.value || null 
                  }))}
                  placeholder="head@example.com"
                  leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
                />
              </FormField>

              <FormField
                id="contact_email"
                label="Department Email"
                error={formErrors.contact_email}
                description="General contact email for the department"
              >
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    contact_email: e.target.value || null 
                  }))}
                  placeholder="department@example.com"
                  leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
                />
              </FormField>

              <FormField
                id="contact_phone"
                label="Contact Phone"
                error={formErrors.contact_phone}
                description="Department phone number for inquiries"
              >
                <div className="relative flex [&_input:focus]:ring-2 [&_input:focus]:ring-[#8CC63F] [&_input:focus]:border-[#8CC63F] [&_button:focus]:ring-2 [&_button:focus]:ring-[#8CC63F] [&_button:focus]:border-[#8CC63F]">
                  <PhoneInput
                    value={formData.contact_phone || ''}
                    onChange={(value: string | undefined) => {
                      // Store the complete phone number with country code
                      const phoneValue = value ? String(value) : '';
                      console.log('Phone value being saved:', phoneValue); // Debug log
                      setFormData(prev => ({ 
                        ...prev, 
                        contact_phone: phoneValue || null 
                      }));
                    }}
                    placeholder="XXXX XXXX"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="w-full [&_input]:focus:ring-[#8CC63F] [&_input]:focus:border-[#8CC63F] [&_button]:focus:ring-[#8CC63F] [&_button]:focus:border-[#8CC63F]"
                    defaultCountry="KW"
                    international
                    countryCallingCodeEditable={false}
                  />
                </div>
              </FormField>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                  Department Settings
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Configure department status and visibility
                </p>
              </div>

              <FormField id="status" label="Status">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Department Status
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formData.status === 'active' 
                        ? 'Department is active and operational' 
                        : 'Department is inactive and hidden'}
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={formData.status === 'active'}
                    onChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      status: checked ? 'active' : 'inactive' 
                    }))}
                  />
                </div>
              </FormField>

              {editingDepartment && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Department Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Created</span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(editingDepartment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {editingDepartment.updated_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last Updated</span>
                        <span className="text-gray-900 dark:text-white">
                          {new Date(editingDepartment.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {editingDepartment.children_count && editingDepartment.children_count > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sub-departments</span>
                        <span className="text-gray-900 dark:text-white">
                          {editingDepartment.children_count}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </form>
      </SlideInForm>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        title="Delete Department(s)"
        message={
          <div className="space-y-2">
            <p>Are you sure you want to delete {deleteConfirmation.departments.length} department(s)?</p>
            {deleteConfirmation.departments.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mt-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      Departments to be deleted:
                    </p>
                    <ul className="list-disc list-inside text-yellow-700 dark:text-yellow-300">
                      {deleteConfirmation.departments.map(dept => (
                        <li key={dept.id}>
                          {dept.name}
                          {dept.children_count && dept.children_count > 0 && (
                            <span className="text-red-600 dark:text-red-400 ml-1">
                              (has {dept.children_count} sub-department{dept.children_count > 1 ? 's' : ''})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              This action cannot be undone.
            </p>
          </div>
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="destructive"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, departments: [] })}
      />
    </div>
  );
}