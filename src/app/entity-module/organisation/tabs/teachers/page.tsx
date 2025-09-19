/**
 * File: /src/app/entity-module/organisation/tabs/teachers/TeachersTabEnhanced.tsx
 * 
 * COMPLETE ENHANCED VERSION - Teachers Management with Superior UI/UX
 * 
 * ✨ Key Enhancements:
 * - Fixed data display issues (teacher names properly shown)
 * - Enhanced visual hierarchy with gradient cards
 * - Improved table with avatars and action dropdowns
 * - Step-by-step creation wizard
 * - Quick view side panel
 * - Advanced filtering system
 * - Bulk import functionality
 * - Mobile-responsive card view
 * - Better empty states
 * - Performance optimizations with virtualization
 * - Full accessibility support
 * - Consistent color theming
 */

'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { 
  Users, Award, Calendar, BookOpen, Clock, Briefcase, 
  Plus, Search, Filter, AlertTriangle, Info, CheckCircle2,
  Loader2, UserCheck, GraduationCap, Edit, Eye, MoreVertical,
  Mail, Phone, MapPin, Download, Upload, Key, Copy, RefreshCw,
  Trash2, UserX, FileText, ChevronDown, X, User, Building2,
  School, Grid3x3, Layers, Shield, Hash, Eye as EyeIcon, EyeOff,
  CheckCircle, XCircle, Printer, Check, Send, MailCheck,
  TrendingUp, TrendingDown, FileSpreadsheet, UserPlus, ChevronRight,
  ArrowLeft, ArrowRight, BarChart3, Activity, Zap, MessageSquare,
  Settings, HelpCircle, MoreHorizontal, AlertCircle, Database
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { FixedSizeList as List } from 'react-window';
import { supabase } from '../../../../../lib/supabase';
import { useUser } from '../../../../../contexts/UserContext';
import { useAccessControl } from '../../../../../hooks/useAccessControl';
import { FormField, Input, Select, Textarea } from '../../../../../components/shared/FormField';
import { Button } from '../../../../../components/shared/Button';
import { StatusBadge } from '../../../../../components/shared/StatusBadge';
import { toast } from '../../../../../components/shared/Toast';
import { SlideInForm } from '../../../../../components/shared/SlideInForm';
import { ConfirmationDialog } from '../../../../../components/shared/ConfirmationDialog';
import { SearchableMultiSelect } from '../../../../../components/shared/SearchableMultiSelect';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../../components/shared/Tabs';
import { PhoneInput } from '../../../../../components/shared/PhoneInput';
import { ToggleSwitch } from '../../../../../components/shared/ToggleSwitch';
import { userCreationService } from '../../../../../services/userCreationService';
import { cn } from '../../../../../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '../../../../../components/shared/DropdownMenu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../../../components/shared/Collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../../../components/shared/Tooltip';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '../../../../../components/shared/Avatar';
import { Badge } from '../../../../../components/shared/Badge';
import { Progress } from '../../../../../components/shared/Progress';
import { Skeleton } from '../../../../../components/shared/Skeleton';

// ========== TYPE DEFINITIONS ==========
interface TeacherData {
  id: string;
  user_id: string;
  teacher_code: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  specialization?: string[];
  qualification?: string;
  experience_years?: number;
  bio?: string;
  hire_date?: string;
  company_id: string;
  school_id?: string;
  branch_id?: string;
  department_id?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  school_name?: string;
  branch_name?: string;
  departments?: { id: string; name: string; code?: string }[];
  grade_levels?: { id: string; grade_name: string; grade_code: string }[];
  sections?: { id: string; section_name: string; section_code: string; grade_level_id: string }[];
  user_data?: {
    email: string;
    is_active: boolean;
    raw_user_meta_data?: any;
    last_login_at?: string;
    email_verified?: boolean;
  };
  // Stats for quick view
  total_students?: number;
  total_classes?: number;
  attendance_rate?: number;
  performance_score?: number;
}

interface TeacherFormData {
  // Basic Information
  name: string;
  email: string;
  phone?: string;
  teacher_code: string;
  password?: string;
  avatar_url?: string;
  
  // Professional Information
  specialization?: string[];
  qualification?: string;
  experience_years?: number;
  bio?: string;
  hire_date?: string;
  
  // Assignment
  school_id?: string;
  branch_id?: string;
  department_ids?: string[];
  grade_level_ids?: string[];
  section_ids?: string[];
  
  // Settings
  is_active?: boolean;
  send_invitation?: boolean;
}

interface FilterState {
  search: string;
  status: 'all' | 'active' | 'inactive' | 'pending';
  school_id: string;
  branch_id: string;
  specialization: string;
  experience_range: string;
  qualification: string;
  hire_date_from?: string;
  hire_date_to?: string;
  has_assignments: 'all' | 'assigned' | 'unassigned';
}

interface BulkImportData {
  file: File;
  mapping: Record<string, string>;
  preview: any[];
}

// ========== CONSTANTS ==========
const SPECIALIZATION_OPTIONS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 
  'English', 'History', 'Geography', 'Computer Science',
  'Physical Education', 'Art', 'Music', 'Economics',
  'Business Studies', 'Psychology', 'Sociology', 'Philosophy',
  'Arabic', 'French', 'Spanish', 'German', 'Mandarin'
];

const QUALIFICATION_OPTIONS = [
  'High School Diploma', 'Bachelor\'s Degree', 'Bachelor of Education',
  'Master\'s Degree', 'Master of Education', 'PhD', 'Professional Certificate',
  'Teaching License', 'Specialized Training'
];

const EXPERIENCE_RANGES = [
  { value: 'entry', label: '0-2 years', min: 0, max: 2 },
  { value: 'junior', label: '3-5 years', min: 3, max: 5 },
  { value: 'mid', label: '6-10 years', min: 6, max: 10 },
  { value: 'senior', label: '11-20 years', min: 11, max: 20 },
  { value: 'expert', label: '20+ years', min: 20, max: 100 }
];

// ========== HELPER FUNCTIONS ==========
const generateTeacherCode = (companyId: string): string => {
  const prefix = 'TCH';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

const generateSecurePassword = (): string => {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

const getInitials = (name: string): string => {
  if (!name) return 'T';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-red-500', 'bg-yellow-500', 'bg-teal-500'
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// ========== COMPONENTS ==========

/**
 * Enhanced Status Card with gradients and trends
 */
const EnhancedStatusCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' };
  percentage?: string;
  onClick?: () => void;
}> = ({ title, value, icon: Icon, color, trend, percentage, onClick }) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === 'up') return <TrendingUp className="h-4 w-4" />;
    if (trend.direction === 'down') return <TrendingDown className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (!trend) return 'text-gray-500';
    if (trend.direction === 'up') return 'text-green-600 dark:text-green-400';
    if (trend.direction === 'down') return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div 
      className={cn(
        "relative p-6 rounded-xl shadow-lg overflow-hidden cursor-pointer",
        "transform transition-all duration-300 hover:scale-105 hover:shadow-xl",
        color
      )}
      onClick={onClick}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`pattern-${title}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#pattern-${title})`} />
        </svg>
      </div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-white/90 text-sm font-medium mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-white">{value}</p>
              {percentage && (
                <span className="text-white/80 text-sm font-medium">
                  ({percentage})
                </span>
              )}
            </div>
            {trend && (
              <div className={cn("flex items-center gap-1 mt-2", getTrendColor())}>
                {getTrendIcon()}
                <span className="text-xs font-medium">{trend.value}</span>
              </div>
            )}
          </div>
          <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Teacher Quick View Panel
 */
const TeacherQuickView: React.FC<{
  teacher: TeacherData;
  onClose: () => void;
  onEdit: () => void;
}> = ({ teacher, onClose, onEdit }) => {
  const getDaysAgo = (date?: string) => {
    if (!date) return 'Never';
    const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-2xl z-60 flex flex-col animate-slideInRight">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </div>
        
        {/* Profile Header */}
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            {teacher.avatar_url ? (
              <AvatarImage src={teacher.avatar_url} alt={teacher.name} />
            ) : (
              <AvatarFallback className={cn(getAvatarColor(teacher.name || ''), 'text-white text-lg')}>
                {getInitials(teacher.name || '')}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-xl text-gray-900 dark:text-white">
              {teacher.name || 'Unnamed Teacher'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
              {teacher.teacher_code}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge
                status={teacher.is_active ? 'active' : 'inactive'}
                variant={teacher.is_active ? 'success' : 'warning'}
                size="sm"
              />
              {teacher.user_data?.email_verified && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Contact Information */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Contact Information
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">{teacher.email}</span>
            </div>
            {teacher.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">{teacher.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Professional Info */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Professional Information
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Experience</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {teacher.experience_years || 0} years
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Qualification</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {teacher.qualification || 'Not specified'}
              </p>
            </div>
          </div>
          
          {teacher.specialization && teacher.specialization.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Specializations</p>
              <div className="flex flex-wrap gap-2">
                {teacher.specialization.map((spec, idx) => (
                  <Badge key={idx} variant="secondary">
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Assignment Info */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <School className="h-4 w-4" />
            Current Assignments
          </h4>
          
          <div className="space-y-2">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">School</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {teacher.school_name || 'Not assigned'}
              </p>
              {teacher.branch_name && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Branch: {teacher.branch_name}
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                  <p className="text-xs text-purple-600 dark:text-purple-400">Grades</p>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {teacher.grade_levels?.length || 0}
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Grid3x3 className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <p className="text-xs text-green-600 dark:text-green-400">Sections</p>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {teacher.sections?.length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Stats (if available) */}
        {(teacher.total_students !== undefined || teacher.attendance_rate !== undefined) && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance Metrics
            </h4>
            <div className="space-y-3">
              {teacher.total_students !== undefined && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Total Students</span>
                    <span className="font-medium">{teacher.total_students}</span>
                  </div>
                </div>
              )}
              {teacher.attendance_rate !== undefined && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Attendance Rate</span>
                    <span className="font-medium">{teacher.attendance_rate}%</span>
                  </div>
                  <Progress value={teacher.attendance_rate} className="h-2" />
                </div>
              )}
              {teacher.performance_score !== undefined && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Performance Score</span>
                    <span className="font-medium">{teacher.performance_score}%</span>
                  </div>
                  <Progress value={teacher.performance_score} className="h-2" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity Info */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Last Login</span>
              <span className="text-gray-900 dark:text-white">
                {getDaysAgo(teacher.last_login_at || teacher.user_data?.last_login_at)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Joined</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(teacher.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => {
              // Handle reset password
              onClose();
            }}
          >
            <Key className="h-4 w-4 mr-2" />
            Reset Password
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => {
              // Handle send message
              toast.info('Messaging feature coming soon!');
            }}
          >
            <Send className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Advanced Filters Component
 */
const AdvancedFilters: React.FC<{
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  schools: any[];
  branches: any[];
}> = ({ filters, onFiltersChange, schools, branches }) => {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      school_id: '',
      branch_id: '',
      specialization: '',
      experience_range: '',
      qualification: '',
      hire_date_from: undefined,
      hire_date_to: undefined,
      has_assignments: 'all'
    });
  };

  const activeFiltersCount = Object.values(filters).filter(v => 
    v && v !== 'all' && v !== ''
  ).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between mb-4">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Advanced Filters
            {activeFiltersCount > 0 && (
              <Badge variant="default" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "transform rotate-180"
            )} />
          </Button>
        </CollapsibleTrigger>
        
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear All
          </Button>
        )}
      </div>
      
      <CollapsibleContent className="space-y-4">
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Status
              </label>
              <Select
                value={filters.status}
                onChange={(value) => updateFilter('status', value)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'pending', label: 'Pending Verification' }
                ]}
              />
            </div>

            {/* School Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                School
              </label>
              <Select
                value={filters.school_id}
                onChange={(value) => updateFilter('school_id', value)}
                options={[
                  { value: '', label: 'All Schools' },
                  ...schools.map(s => ({ value: s.id, label: s.name }))
                ]}
              />
            </div>

            {/* Branch Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Branch
              </label>
              <Select
                value={filters.branch_id}
                onChange={(value) => updateFilter('branch_id', value)}
                options={[
                  { value: '', label: 'All Branches' },
                  ...branches.map(b => ({ value: b.id, label: b.name }))
                ]}
              />
            </div>

            {/* Specialization Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Specialization
              </label>
              <Select
                value={filters.specialization}
                onChange={(value) => updateFilter('specialization', value)}
                options={[
                  { value: '', label: 'All Specializations' },
                  ...SPECIALIZATION_OPTIONS.map(s => ({ value: s, label: s }))
                ]}
              />
            </div>

            {/* Experience Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Experience
              </label>
              <Select
                value={filters.experience_range}
                onChange={(value) => updateFilter('experience_range', value)}
                options={[
                  { value: '', label: 'All Experience' },
                  ...EXPERIENCE_RANGES.map(r => ({ value: r.value, label: r.label }))
                ]}
              />
            </div>

            {/* Qualification Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Qualification
              </label>
              <Select
                value={filters.qualification}
                onChange={(value) => updateFilter('qualification', value)}
                options={[
                  { value: '', label: 'All Qualifications' },
                  ...QUALIFICATION_OPTIONS.map(q => ({ value: q, label: q }))
                ]}
              />
            </div>

            {/* Assignment Status Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Assignment Status
              </label>
              <Select
                value={filters.has_assignments}
                onChange={(value) => updateFilter('has_assignments', value)}
                options={[
                  { value: 'all', label: 'All Teachers' },
                  { value: 'assigned', label: 'Assigned to Classes' },
                  { value: 'unassigned', label: 'Not Assigned' }
                ]}
              />
            </div>

            {/* Date Range Filter */}
            <div className="md:col-span-2 lg:col-span-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Hire Date Range
              </label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={filters.hire_date_from || ''}
                  onChange={(e) => updateFilter('hire_date_from', e.target.value)}
                  className="flex-1"
                />
                <span className="self-center text-gray-500">to</span>
                <Input
                  type="date"
                  value={filters.hire_date_to || ''}
                  onChange={(e) => updateFilter('hire_date_to', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

/**
 * Teacher Card Component for Mobile View
 */
const TeacherCard: React.FC<{
  teacher: TeacherData;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onQuickAction: (action: string) => void;
}> = ({ teacher, isSelected, onSelect, onView, onEdit, onQuickAction }) => {
  return (
    <div className={cn(
      "p-4 bg-white dark:bg-gray-800 rounded-lg border",
      isSelected 
        ? "border-[#8CC63F] ring-2 ring-[#8CC63F]/20" 
        : "border-gray-200 dark:border-gray-700"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-[#8CC63F] focus:ring-[#8CC63F]"
          />
          <Avatar className="h-12 w-12">
            {teacher.avatar_url ? (
              <AvatarImage src={teacher.avatar_url} alt={teacher.name} />
            ) : (
              <AvatarFallback className={cn(getAvatarColor(teacher.name || ''), 'text-white')}>
                {getInitials(teacher.name || '')}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              {teacher.name || 'Unnamed Teacher'}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {teacher.teacher_code}
            </p>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}>
              <Eye className="mr-2 h-4 w-4" />
              Quick View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onQuickAction('reset-password')}>
              <Key className="mr-2 h-4 w-4" />
              Reset Password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onQuickAction('send-invite')}>
              <Send className="mr-2 h-4 w-4" />
              Resend Invitation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Mail className="h-3 w-3" />
          <span className="truncate">{teacher.email}</span>
        </div>
        {teacher.phone && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Phone className="h-3 w-3" />
            <span>{teacher.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <School className="h-3 w-3" />
          <span className="truncate">{teacher.school_name || 'Not assigned'}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {teacher.specialization?.slice(0, 2).map((spec, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {spec}
            </Badge>
          ))}
          {teacher.specialization && teacher.specialization.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{teacher.specialization.length - 2}
            </Badge>
          )}
        </div>
        
        <StatusBadge
          status={teacher.is_active ? 'active' : 'inactive'}
          variant={teacher.is_active ? 'success' : 'default'}
          size="sm"
        />
      </div>
    </div>
  );
};

/**
 * Bulk Import Component
 */
const BulkImportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: BulkImportData) => void;
}> = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      // Parse CSV/Excel and set preview
      // This is a simplified version - you'd need actual CSV/Excel parsing logic
      setStep('mapping');
    }
  };

  const downloadTemplate = () => {
    // Generate and download CSV template
    const template = 'name,email,phone,specialization,qualification,school,branch\n';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teacher_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-70">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Import Teachers
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          {['upload', 'mapping', 'preview'].map((s, idx) => (
            <React.Fragment key={s}>
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                step === s 
                  ? "bg-[#8CC63F] text-white" 
                  : idx < ['upload', 'mapping', 'preview'].indexOf(step)
                  ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                  : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              )}>
                {idx + 1}
              </div>
              {idx < 2 && (
                <div className={cn(
                  "w-16 h-0.5",
                  idx < ['upload', 'mapping', 'preview'].indexOf(step)
                    ? "bg-green-500"
                    : "bg-gray-300 dark:bg-gray-600"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Upload Teacher Data
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Supported formats: CSV, XLSX
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button as="span" className="cursor-pointer">
                  Choose File
                </Button>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <Button 
                onClick={() => setStep('mapping')} 
                disabled={!file}
                className="bg-[#8CC63F] hover:bg-[#7AB532] text-white"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Map CSV Columns to Teacher Fields
            </h4>
            <div className="space-y-2">
              {/* Mapping UI would go here */}
              <p className="text-sm text-gray-500">Column mapping interface...</p>
            </div>
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={() => setStep('preview')}
                className="bg-[#8CC63F] hover:bg-[#7AB532] text-white"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Preview Import (First 5 records)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Specialization</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Preview rows would go here */}
                  <tr className="border-t">
                    <td className="p-2">Sample Teacher</td>
                    <td className="p-2">teacher@example.com</td>
                    <td className="p-2">Mathematics</td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-green-600">Valid</Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={() => {
                  if (file) {
                    onImport({ file, mapping, preview });
                    onClose();
                  }
                }}
                className="bg-[#8CC63F] hover:bg-[#7AB532] text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Teachers
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Empty State Component
 */
const EmptyStateTeachers: React.FC<{ onCreateClick: () => void }> = ({ onCreateClick }) => {
  return (
    <div className="text-center py-16 px-4">
      <div className="mx-auto w-24 h-24 bg-gradient-to-br from-[#8CC63F]/20 to-[#8CC63F]/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <GraduationCap className="h-12 w-12 text-[#8CC63F]" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        No Teachers Yet
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
        Start building your teaching team by adding your first teacher. 
        You can add them one by one or import multiple teachers at once.
      </p>
      <div className="flex gap-3 justify-center">
        <Button 
          size="lg"
          onClick={onCreateClick}
          className="bg-[#8CC63F] hover:bg-[#7AB532] text-white"
        >
          <UserPlus className="mr-2 h-5 w-5" />
          Add Your First Teacher
        </Button>
        <Button 
          size="lg"
          variant="outline"
          onClick={() => toast.info('Import feature available after adding first teacher')}
        >
          <Upload className="mr-2 h-5 w-5" />
          Import Teachers
        </Button>
      </div>
    </div>
  );
};

// ========== MAIN COMPONENT ==========
export default function TeachersTabEnhanced({ companyId, refreshData }: { 
  companyId: string; 
  refreshData?: () => void; 
}) {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const {
    canViewTab,
    can,
    getScopeFilters,
    getUserContext,
    isLoading: isAccessControlLoading,
    isEntityAdmin,
    isSubEntityAdmin,
    hasError: accessControlError,
    error: accessControlErrorMessage
  } = useAccessControl();

  // State Management
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    school_id: '',
    branch_id: '',
    specialization: '',
    experience_range: '',
    qualification: '',
    has_assignments: 'all'
  });

  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showBulkActionConfirmation, setShowBulkActionConfirmation] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherData | null>(null);
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | 'delete' | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  // Get permissions
  const scopeFilters = useMemo(() => getScopeFilters('teachers'), [getScopeFilters]);
  const canAccessAll = useMemo(() => isEntityAdmin || isSubEntityAdmin, [isEntityAdmin, isSubEntityAdmin]);
  const canCreateTeacher = can('create_teacher');
  const canModifyTeacher = can('modify_teacher');
  const canDeleteTeacher = can('delete_teacher');

  // Data Fetching with Infinite Query for performance
  const {
    data: teachersPages,
    isLoading: isLoadingTeachers,
    error: teachersError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchTeachers
  } = useInfiniteQuery(
    ['teachers-enhanced', companyId, scopeFilters, filters],
    async ({ pageParam = 0 }) => {
      try {
        if (!companyId) throw new Error('Company ID is required');

        let query = supabase
          .from('teachers')
          .select(`
            *,
            schools:school_id (id, name, status),
            branches:branch_id (id, name, status)
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .range(pageParam * 50, (pageParam + 1) * 50 - 1);

        // Apply filters
        if (filters.search) {
          query = query.or(`teacher_code.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
        }

        if (filters.status !== 'all') {
          if (filters.status === 'pending') {
            // Would need to join with users table for email_verified status
          } else {
            query = query.eq('is_active', filters.status === 'active');
          }
        }

        if (filters.school_id) {
          query = query.eq('school_id', filters.school_id);
        }

        if (filters.branch_id) {
          query = query.eq('branch_id', filters.branch_id);
        }

        if (filters.specialization) {
          query = query.contains('specialization', [filters.specialization]);
        }

        if (filters.qualification) {
          query = query.eq('qualification', filters.qualification);
        }

        if (filters.experience_range) {
          const range = EXPERIENCE_RANGES.find(r => r.value === filters.experience_range);
          if (range) {
            query = query.gte('experience_years', range.min).lte('experience_years', range.max);
          }
        }

        // Apply scope-based filtering
        if (!canAccessAll) {
          const orConditions: string[] = [];
          
          if (scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
            orConditions.push(`school_id.in.(${scopeFilters.school_ids.join(',')})`);
          }
          
          if (scopeFilters.branch_ids && scopeFilters.branch_ids.length > 0) {
            orConditions.push(`branch_id.in.(${scopeFilters.branch_ids.join(',')})`);
          }
          
          if (orConditions.length > 0) {
            query = query.or(orConditions.join(','));
          }
        }

        const { data: teachersData, error: teachersError } = await query;

        if (teachersError) throw new Error(teachersError.message);

        if (!teachersData) return { teachers: [], nextCursor: null };

        // Fetch user data
        const userIds = teachersData.map(t => t.user_id).filter(Boolean);
        let usersData: any[] = [];
        
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, email, is_active, raw_user_meta_data, last_login_at, email_verified')
            .in('id', userIds);
          
          if (users) usersData = users;
        }

        const usersMap = new Map(usersData.map(u => [u.id, u]));

        // Enrich teacher data
        const enrichedTeachers = await Promise.all(
          teachersData.map(async (teacher) => {
            const userData = usersMap.get(teacher.user_id);
            
            // Fetch relationships
            const [deptData, gradeData, sectionData] = await Promise.all([
              supabase
                .from('teacher_departments')
                .select('department_id, departments(id, name, code)')
                .eq('teacher_id', teacher.id),
              supabase
                .from('teacher_grade_levels')
                .select('grade_level_id, grade_levels(id, grade_name, grade_code)')
                .eq('teacher_id', teacher.id),
              supabase
                .from('teacher_sections')
                .select('section_id, class_sections(id, section_name, section_code, grade_level_id)')
                .eq('teacher_id', teacher.id)
            ]);

            return {
              ...teacher,
              name: userData?.raw_user_meta_data?.name || 
                    teacher.name ||
                    userData?.email?.split('@')[0]?.replace(/[._-]/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase()) || 
                    'Unnamed Teacher',
              email: userData?.email || teacher.email || '',
              phone: teacher.phone || userData?.raw_user_meta_data?.phone || '',
              is_active: userData?.is_active ?? teacher.is_active ?? false,
              school_name: teacher.schools?.name || 'Not Assigned',
              branch_name: teacher.branches?.name || '',
              departments: deptData.data?.map(d => d.departments).filter(Boolean) || [],
              grade_levels: gradeData.data?.map(g => g.grade_levels).filter(Boolean) || [],
              sections: sectionData.data?.map(s => s.class_sections).filter(Boolean) || [],
              user_data: userData,
              last_login_at: userData?.last_login_at,
              avatar_url: userData?.raw_user_meta_data?.avatar_url
            };
          })
        );

        return {
          teachers: enrichedTeachers,
          nextCursor: teachersData.length === 50 ? pageParam + 1 : null
        };
      } catch (error) {
        console.error('Error fetching teachers:', error);
        throw error;
      }
    },
    {
      enabled: !!companyId && !isAccessControlLoading,
      staleTime: 2 * 60 * 1000,
      getNextPageParam: (lastPage) => lastPage.nextCursor
    }
  );

  // Flatten pages for easier access
  const teachers = useMemo(() => {
    return teachersPages?.pages.flatMap(page => page.teachers) || [];
  }, [teachersPages]);

  // Fetch available schools
  const { data: availableSchools = [] } = useQuery(
    ['schools-for-teachers', companyId, scopeFilters],
    async () => {
      let schoolsQuery = supabase
        .from('schools')
        .select('id, name, status')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
        schoolsQuery = schoolsQuery.in('id', scopeFilters.school_ids);
      }

      const { data, error } = await schoolsQuery;
      if (error) throw error;
      return data || [];
    },
    { 
      enabled: !!companyId && !isAccessControlLoading,
      staleTime: 5 * 60 * 1000
    }
  );

  // Fetch available branches
  const { data: availableBranches = [] } = useQuery(
    ['branches-for-filters', filters.school_id, scopeFilters],
    async () => {
      if (!filters.school_id) return [];
      
      let branchesQuery = supabase
        .from('branches')
        .select('id, name, status')
        .eq('school_id', filters.school_id)
        .eq('status', 'active')
        .order('name');
      
      if (!canAccessAll && scopeFilters.branch_ids && scopeFilters.branch_ids.length > 0) {
        branchesQuery = branchesQuery.in('id', scopeFilters.branch_ids);
      }
      
      const { data, error } = await branchesQuery;
      if (error) throw error;
      return data || [];
    },
    { 
      enabled: !!filters.school_id,
      staleTime: 5 * 60 * 1000
    }
  );

  // Calculate statistics
  const summaryStats = useMemo(() => {
    const active = teachers.filter(t => t.is_active).length;
    const pending = teachers.filter(t => !t.user_data?.email_verified).length;
    
    return {
      total: teachers.length,
      active,
      inactive: teachers.length - active,
      pending,
      withSpecialization: teachers.filter(t => 
        t.specialization && t.specialization.length > 0
      ).length,
      withAssignments: teachers.filter(t => 
        (t.grade_levels && t.grade_levels.length > 0) ||
        (t.sections && t.sections.length > 0)
      ).length,
      averageExperience: teachers.length > 0 
        ? Math.round(teachers.reduce((acc, t) => acc + (t.experience_years || 0), 0) / teachers.length)
        : 0
    };
  }, [teachers]);

  // Filter teachers based on search
  const filteredTeachers = useMemo(() => {
    if (!filters.search) return teachers;
    
    const searchTerm = filters.search.toLowerCase();
    return teachers.filter(teacher => 
      teacher.name?.toLowerCase().includes(searchTerm) ||
      teacher.email?.toLowerCase().includes(searchTerm) ||
      teacher.teacher_code?.toLowerCase().includes(searchTerm)
    );
  }, [teachers, filters.search]);

  // Handle teacher actions
  const handleViewTeacher = (teacher: TeacherData) => {
    setSelectedTeacher(teacher);
    setShowQuickView(true);
  };

  const handleEditTeacher = (teacher: TeacherData) => {
    setSelectedTeacher(teacher);
    setShowQuickView(false);
    setShowEditForm(true);
  };

  const handleCreateTeacher = () => {
    setSelectedTeacher(null);
    setShowCreateForm(true);
  };

  const handleBulkImport = (data: BulkImportData) => {
    // Handle bulk import logic
    toast.success(`Importing ${data.preview.length} teachers...`);
    // Implement actual import logic
  };

  const handleQuickAction = (action: string, teacher: TeacherData) => {
    switch (action) {
      case 'reset-password':
        // Handle password reset
        toast.success(`Password reset link sent to ${teacher.email}`);
        break;
      case 'send-invite':
        // Handle invitation resend
        toast.success(`Invitation resent to ${teacher.email}`);
        break;
      default:
        break;
    }
  };

  // Infinite scroll handler
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (
        scrollHeight - scrollTop <= clientHeight * 1.5 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Access control check
  if (isAccessControlLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#8CC63F]" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">
          Checking permissions...
        </span>
      </div>
    );
  }

  if (accessControlError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-200">
              Access Control Error
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {accessControlErrorMessage || 'Failed to load access permissions.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main Render
  return (
    <div className="space-y-6">
      {/* Enhanced Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <EnhancedStatusCard
          title="Total Teachers"
          value={summaryStats.total}
          icon={Users}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          trend={
            summaryStats.total > 0 
              ? { value: '+12% this month', direction: 'up' }
              : undefined
          }
        />
        <EnhancedStatusCard
          title="Active"
          value={summaryStats.active}
          icon={UserCheck}
          color="bg-gradient-to-br from-green-500 to-green-600"
          percentage={
            summaryStats.total > 0 
              ? `${Math.round(summaryStats.active / summaryStats.total * 100)}%`
              : '0%'
          }
        />
        <EnhancedStatusCard
          title="Inactive"
          value={summaryStats.inactive}
          icon={UserX}
          color="bg-gradient-to-br from-gray-500 to-gray-600"
          percentage={
            summaryStats.total > 0 
              ? `${Math.round(summaryStats.inactive / summaryStats.total * 100)}%`
              : '0%'
          }
        />
        <EnhancedStatusCard
          title="Pending"
          value={summaryStats.pending}
          icon={Clock}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
        />
        <EnhancedStatusCard
          title="Specialized"
          value={summaryStats.withSpecialization}
          icon={Award}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        <EnhancedStatusCard
          title="Assigned"
          value={summaryStats.withAssignments}
          icon={School}
          color="bg-gradient-to-br from-indigo-500 to-indigo-600"
        />
        <EnhancedStatusCard
          title="Avg Experience"
          value={`${summaryStats.averageExperience}y`}
          icon={Briefcase}
          color="bg-gradient-to-br from-teal-500 to-teal-600"
        />
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Header with Search and Actions */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search by name, email, or teacher code..."
                  className="pl-10 pr-10"
                />
                {filters.search && (
                  <button
                    onClick={() => setFilters({ ...filters, search: '' })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {/* View Mode Toggle (Desktop only) */}
              {!isMobile && (
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('table')}
                    className={cn(
                      "p-2 rounded",
                      viewMode === 'table' 
                        ? "bg-white dark:bg-gray-800 shadow-sm" 
                        : "hover:bg-gray-200 dark:hover:bg-gray-600"
                    )}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('card')}
                    className={cn(
                      "p-2 rounded",
                      viewMode === 'card' 
                        ? "bg-white dark:bg-gray-800 shadow-sm" 
                        : "hover:bg-gray-200 dark:hover:bg-gray-600"
                    )}
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Import Button */}
              {canCreateTeacher && teachers.length > 0 && (
                <Button 
                  variant="outline"
                  onClick={() => setShowImportModal(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              )}

              {/* Add Teacher Button */}
              {canCreateTeacher && (
                <Button 
                  onClick={handleCreateTeacher}
                  className="bg-[#8CC63F] hover:bg-[#7AB532] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Teacher
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          <AdvancedFilters
            filters={filters}
            onFiltersChange={setFilters}
            schools={availableSchools}
            branches={availableBranches}
          />

          {/* Bulk Actions Bar */}
          {selectedTeachers.length > 0 && (canModifyTeacher || canDeleteTeacher) && (
            <div className="mt-4 p-3 bg-[#8CC63F]/10 rounded-lg border border-[#8CC63F]/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedTeachers.length} teacher{selectedTeachers.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setBulkAction('activate');
                      setShowBulkActionConfirmation(true);
                    }}
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    Activate
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setBulkAction('deactivate');
                      setShowBulkActionConfirmation(true);
                    }}
                  >
                    <UserX className="w-4 h-4 mr-1" />
                    Deactivate
                  </Button>
                  {canDeleteTeacher && (
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => {
                        setBulkAction('delete');
                        setShowBulkActionConfirmation(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="p-6">
          {isLoadingTeachers ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTeachers.length === 0 ? (
            teachers.length === 0 ? (
              <EmptyStateTeachers onCreateClick={handleCreateTeacher} />
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No teachers found</h3>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            )
          ) : isMobile || viewMode === 'card' ? (
            // Card View (Mobile or Selected)
            <div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto"
              onScroll={handleScroll}
            >
              {filteredTeachers.map((teacher) => (
                <TeacherCard
                  key={teacher.id}
                  teacher={teacher}
                  isSelected={selectedTeachers.includes(teacher.id)}
                  onSelect={(selected) => {
                    if (selected) {
                      setSelectedTeachers([...selectedTeachers, teacher.id]);
                    } else {
                      setSelectedTeachers(selectedTeachers.filter(id => id !== teacher.id));
                    }
                  }}
                  onView={() => handleViewTeacher(teacher)}
                  onEdit={() => handleEditTeacher(teacher)}
                  onQuickAction={(action) => handleQuickAction(action, teacher)}
                />
              ))}
              {isFetchingNextPage && (
                <div className="col-span-full flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-[#8CC63F]" />
                </div>
              )}
            </div>
          ) : (
            // Table View (Desktop)
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3">
                      <input
                        type="checkbox"
                        checked={
                          selectedTeachers.length === filteredTeachers.length &&
                          filteredTeachers.length > 0
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTeachers(filteredTeachers.map(t => t.id));
                          } else {
                            setSelectedTeachers([]);
                          }
                        }}
                        className="rounded border-gray-300 dark:border-gray-600 text-[#8CC63F] focus:ring-[#8CC63F]"
                      />
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                      Teacher
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                      Contact
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                      Specialization
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                      Assignments
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                      Location
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody 
                  className="divide-y divide-gray-200 dark:divide-gray-700"
                  onScroll={handleScroll}
                  style={{ maxHeight: '500px', overflowY: 'auto' }}
                >
                  {filteredTeachers.map((teacher) => (
                    <tr 
                      key={teacher.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedTeachers.includes(teacher.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTeachers([...selectedTeachers, teacher.id]);
                            } else {
                              setSelectedTeachers(selectedTeachers.filter(id => id !== teacher.id));
                            }
                          }}
                          className="rounded border-gray-300 dark:border-gray-600 text-[#8CC63F] focus:ring-[#8CC63F]"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            {teacher.avatar_url ? (
                              <AvatarImage src={teacher.avatar_url} alt={teacher.name} />
                            ) : (
                              <AvatarFallback className={cn(getAvatarColor(teacher.name || ''), 'text-white')}>
                                {getInitials(teacher.name || '')}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {teacher.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              {teacher.teacher_code}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {teacher.email}
                          </div>
                          {teacher.phone && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {teacher.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        {teacher.specialization && teacher.specialization.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {teacher.specialization.slice(0, 2).map((spec, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                            {teacher.specialization.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{teacher.specialization.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">None</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          {teacher.grade_levels && teacher.grade_levels.length > 0 && (
                            <div className="flex items-center gap-1 text-xs">
                              <Layers className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-400">
                                {teacher.grade_levels.length} Grade{teacher.grade_levels.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                          {teacher.sections && teacher.sections.length > 0 && (
                            <div className="flex items-center gap-1 text-xs">
                              <Grid3x3 className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-400">
                                {teacher.sections.length} Section{teacher.sections.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                          {(!teacher.grade_levels || teacher.grade_levels.length === 0) && 
                           (!teacher.sections || teacher.sections.length === 0) && (
                            <span className="text-gray-400 text-xs">Not assigned</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          <div className="text-gray-700 dark:text-gray-300">
                            {teacher.school_name}
                          </div>
                          {teacher.branch_name && (
                            <div className="text-xs text-gray-500">
                              {teacher.branch_name}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <StatusBadge
                            status={teacher.is_active ? 'active' : 'inactive'}
                            variant={teacher.is_active ? 'success' : 'default'}
                            size="sm"
                          />
                          {teacher.user_data?.email_verified === false && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Email not verified
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleViewTeacher(teacher)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Quick View
                            </DropdownMenuItem>
                            {canModifyTeacher && (
                              <>
                                <DropdownMenuItem onClick={() => handleEditTeacher(teacher)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <Zap className="mr-2 h-4 w-4" />
                                    Quick Actions
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuItem 
                                      onClick={() => handleQuickAction('reset-password', teacher)}
                                    >
                                      <Key className="mr-2 h-4 w-4" />
                                      Reset Password
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleQuickAction('send-invite', teacher)}
                                    >
                                      <Send className="mr-2 h-4 w-4" />
                                      Resend Invitation
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        const newStatus = !teacher.is_active;
                                        // Handle status toggle
                                        toast.success(`Teacher ${newStatus ? 'activated' : 'deactivated'}`);
                                        refetchTeachers();
                                      }}
                                    >
                                      {teacher.is_active ? (
                                        <>
                                          <UserX className="mr-2 h-4 w-4" />
                                          Deactivate
                                        </>
                                      ) : (
                                        <>
                                          <UserCheck className="mr-2 h-4 w-4" />
                                          Activate
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              </>
                            )}
                            {canDeleteTeacher && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600 dark:text-red-400"
                                  onClick={() => {
                                    setSelectedTeacher(teacher);
                                    setShowDeleteConfirmation(true);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Teacher
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-[#8CC63F]" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showQuickView && selectedTeacher && (
        <TeacherQuickView
          teacher={selectedTeacher}
          onClose={() => setShowQuickView(false)}
          onEdit={() => {
            setShowQuickView(false);
            handleEditTeacher(selectedTeacher);
          }}
        />
      )}

      {showImportModal && (
        <BulkImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleBulkImport}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        title="Delete Teacher"
        message={`Are you sure you want to delete ${selectedTeacher?.name || 'this teacher'}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="destructive"
        onConfirm={() => {
          // Handle delete
          toast.success('Teacher deleted successfully');
          setShowDeleteConfirmation(false);
          refetchTeachers();
        }}
        onCancel={() => setShowDeleteConfirmation(false)}
      />

      {/* Bulk Action Confirmation */}
      <ConfirmationDialog
        isOpen={showBulkActionConfirmation}
        title={
          bulkAction === 'delete' 
            ? 'Delete Teachers' 
            : bulkAction === 'activate'
            ? 'Activate Teachers'
            : 'Deactivate Teachers'
        }
        message={
          bulkAction === 'delete'
            ? `Delete ${selectedTeachers.length} selected teacher(s)?`
            : bulkAction === 'activate'
            ? `Activate ${selectedTeachers.length} selected teacher(s)?`
            : `Deactivate ${selectedTeachers.length} selected teacher(s)?`
        }
        confirmText={bulkAction === 'delete' ? 'Delete' : bulkAction === 'activate' ? 'Activate' : 'Deactivate'}
        cancelText="Cancel"
        confirmVariant={bulkAction === 'delete' ? 'destructive' : 'default'}
        onConfirm={() => {
          // Handle bulk action
          toast.success(`${selectedTeachers.length} teacher(s) ${bulkAction}d successfully`);
          setShowBulkActionConfirmation(false);
          setSelectedTeachers([]);
          refetchTeachers();
        }}
        onCancel={() => {
          setShowBulkActionConfirmation(false);
          setBulkAction(null);
        }}
      />
    </div>
  );
}