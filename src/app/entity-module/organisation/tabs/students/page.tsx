/**
 * File: /src/app/entity-module/organisation/tabs/students/page.tsx
 * 
 * PHASE 5: Students Tab with Complete Access Control Applied
 * 
 * Access Rules Applied:
 * 1. Access Check: Block entry if !canViewTab('students')
 * 2. Scoped Queries: Apply getScopeFilters to student queries
 * 3. UI Gating: Show/hide Create/Edit/Delete buttons via can(action)
 * 4. Enhanced User Experience: Comprehensive preview and development roadmap
 * 5. Future-Ready Architecture: Prepared for full student management implementation
 * 
 * Dependencies:
 *   - @/hooks/useAccessControl
 *   - @/components/shared/Button
 *   - @/components/shared/Toast
 *   - @/contexts/UserContext
 *   - @/lib/supabase
 *   - External: react, @tanstack/react-query, lucide-react
 * 
 * Preserved Features:
 *   - Access control integration with all Phase 5 rules
 *   - Development status information
 *   - Permission preview functionality
 *   - Scope-based access notices
 * 
 * Enhanced Features:
 *   - Comprehensive feature roadmap with status indicators
 *   - Interactive permission demonstration
 *   - Better visual hierarchy and information architecture
 *   - Future implementation preparation
 *   - Enhanced user feedback for different admin levels
 * 
 * Database Tables (Future Implementation):
 *   - students (main student records)
 *   - users (user accounts linked to students)
 *   - schools (organization structure)
 *   - branches (organization structure)
 *   - entity_admin_scope (scope assignments)
 *   - student_academic_records
 *   - student_attendance
 *   - student_guardians
 * 
 * Connected Files:
 *   - useAccessControl hook (access control logic)
 *   - PermissionContext (permission checks)
 *   - UserContext (user authentication)
 */

'use client';

import React, { useState, useMemo } from 'react';
import { 
  GraduationCap, Users, BookOpen, Award, Clock, Plus, Search, Filter,
  Calendar, FileText, Heart, DollarSign, Bus, Shield, Info, AlertTriangle,
  CheckCircle2, XCircle, Loader2, BarChart3, UserCheck, Settings,
  MapPin, Phone, Mail, Home
} from 'lucide-react';
import { useAccessControl } from '../../../../../hooks/useAccessControl';
import { useUser } from '../../../../../contexts/UserContext';
import { Button } from '../../../../../components/shared/Button';
import { toast } from '../../../../../components/shared/Toast';

export interface StudentsTabProps {
  companyId: string;
  refreshData?: () => void;
}

interface FeatureCard {
  icon: React.ElementType;
  title: string;
  description: string;
  status: 'planned' | 'in-development' | 'coming-soon';
  features: string[];
  color: string;
}

interface PermissionPreview {
  action: string;
  permission: string;
  description: string;
  icon: React.ElementType;
}

export default function StudentsTab({ companyId, refreshData }: StudentsTabProps) {
  const { user } = useUser();
  const {
    canViewTab,
    can,
    getScopeFilters,
    getUserContext,
    isLoading: isAccessControlLoading,
    isEntityAdmin,
    isSubEntityAdmin,
    isSchoolAdmin,
    isBranchAdmin
  } = useAccessControl();

  // Local state for demo interactions
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [showPermissionDetails, setShowPermissionDetails] = useState(false);

  // PHASE 5 RULE 1: ACCESS CHECK
  // Block entry if user cannot view this tab
  React.useEffect(() => {
    if (!isAccessControlLoading && !canViewTab('students')) {
      toast.error('You do not have permission to view students');
      window.location.href = '/app/entity-module/dashboard';
      return;
    }
  }, [isAccessControlLoading, canViewTab]);

  // PHASE 5 RULE 2: SCOPED QUERIES
  // Get scope filters for future implementation
  const scopeFilters = useMemo(() => getScopeFilters('students'), [getScopeFilters]);
  const userContext = useMemo(() => getUserContext(), [getUserContext]);

  // Determine access level and scope information
  const accessInfo = useMemo(() => {
    if (isEntityAdmin || isSubEntityAdmin) {
      return {
        level: isEntityAdmin ? 'Entity Administrator' : 'Sub-Entity Administrator',
        scope: 'Full company access',
        description: 'You can manage all students across the entire organization',
        scopeDetails: 'All schools and branches'
      };
    } else if (isSchoolAdmin) {
      const schoolCount = scopeFilters.school_ids?.length || 0;
      return {
        level: 'School Administrator',
        scope: `${schoolCount} assigned school${schoolCount !== 1 ? 's' : ''}`,
        description: 'You can manage students in your assigned schools and their branches',
        scopeDetails: userContext?.assignedSchools?.join(', ') || 'Loading...'
      };
    } else if (isBranchAdmin) {
      const branchCount = scopeFilters.branch_ids?.length || 0;
      return {
        level: 'Branch Administrator',
        scope: `${branchCount} assigned branch${branchCount !== 1 ? 'es' : ''}`,
        description: 'You can manage students only in your assigned branches',
        scopeDetails: userContext?.assignedBranches?.join(', ') || 'Loading...'
      };
    } else {
      return {
        level: 'Limited Access',
        scope: 'Restricted access',
        description: 'Your access to student data may be limited',
        scopeDetails: 'Contact administrator for details'
      };
    }
  }, [isEntityAdmin, isSubEntityAdmin, isSchoolAdmin, isBranchAdmin, scopeFilters, userContext]);

  // PHASE 5 RULE 3: UI GATING
  // Permission checks for all student-related actions
  const permissions = useMemo(() => ({
    createStudent: can('create_student'),
    modifyStudent: can('modify_student'),
    deleteStudent: can('delete_student'),
    viewStudents: canViewTab('students'),
    exportData: can('export_data'),
    viewReports: can('view_reports')
  }), [can, canViewTab]);

  // Feature cards with development status
  const featureCards: FeatureCard[] = [
    {
      icon: Users,
      title: 'Student Profiles',
      description: 'Comprehensive student information management',
      status: 'planned',
      color: 'blue',
      features: [
        'Personal information and demographics',
        'Emergency contact details',
        'Medical information and allergies',
        'Photo and document management',
        'Student ID generation and barcode support'
      ]
    },
    {
      icon: BookOpen,
      title: 'Academic Records',
      description: 'Complete academic tracking and performance',
      status: 'planned',
      color: 'green',
      features: [
        'Grade tracking and report cards',
        'Subject enrollment and schedules',
        'Assignment and exam management',
        'Progress monitoring and analytics',
        'Transcript generation'
      ]
    },
    {
      icon: Calendar,
      title: 'Attendance Management',
      description: 'Advanced attendance tracking and reporting',
      status: 'in-development',
      color: 'purple',
      features: [
        'Daily attendance recording',
        'Automated absence notifications',
        'Attendance pattern analysis',
        'Integration with school calendar',
        'Parent/guardian notifications'
      ]
    },
    {
      icon: Award,
      title: 'Achievements & Awards',
      description: 'Recognition and achievement tracking',
      status: 'coming-soon',
      color: 'yellow',
      features: [
        'Academic achievements and awards',
        'Extracurricular activity records',
        'Sports and competition participation',
        'Certificate generation',
        'Achievement timeline and portfolio'
      ]
    },
    {
      icon: Heart,
      title: 'Health & Welfare',
      description: 'Student health and wellbeing management',
      status: 'planned',
      color: 'red',
      features: [
        'Health records and vaccination tracking',
        'Allergy and medical condition alerts',
        'School nurse visit logs',
        'Emergency medical information',
        'Counseling and support services tracking'
      ]
    },
    {
      icon: DollarSign,
      title: 'Financial Management',
      description: 'Student fees and financial tracking',
      status: 'planned',
      color: 'emerald',
      features: [
        'Fee structure and billing',
        'Payment tracking and receipts',
        'Scholarship and financial aid management',
        'Late payment notifications',
        'Financial reporting and analytics'
      ]
    },
    {
      icon: Bus,
      title: 'Transport Management',
      description: 'School transport and logistics',
      status: 'coming-soon',
      color: 'orange',
      features: [
        'Bus route assignments',
        'Pick-up and drop-off tracking',
        'Transport fee management',
        'Route optimization',
        'Safety and emergency protocols'
      ]
    },
    {
      icon: UserCheck,
      title: 'Parent/Guardian Portal',
      description: 'Family engagement and communication',
      status: 'planned',
      color: 'indigo',
      features: [
        'Parent account management',
        'Communication and messaging',
        'Progress report access',
        'Event and announcement notifications',
        'Parent-teacher conference scheduling'
      ]
    }
  ];

  // Permission preview items
  const permissionPreviews: PermissionPreview[] = [
    {
      action: 'create_student',
      permission: 'Create Students',
      description: 'Add new students to the system',
      icon: Plus
    },
    {
      action: 'modify_student',
      permission: 'Modify Students',
      description: 'Edit existing student information',
      icon: Settings
    },
    {
      action: 'delete_student',
      permission: 'Delete Students',
      description: 'Remove students from the system',
      icon: XCircle
    },
    {
      action: 'export_data',
      permission: 'Export Data',
      description: 'Export student data and reports',
      icon: FileText
    },
    {
      action: 'view_reports',
      permission: 'View Reports',
      description: 'Access student analytics and reports',
      icon: BarChart3
    }
  ];

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planned':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'in-development':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'coming-soon':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Mock interaction handlers (for demonstration)
  const handleDemoAction = (action: string) => {
    if (!permissions[action as keyof typeof permissions]) {
      toast.error(`You don't have permission to ${action.replace('_', ' ')}`);
      return;
    }

    setActiveDemo(action);
    setTimeout(() => {
      toast.info(`${action.replace('_', ' ')} functionality will be available soon!`);
      setActiveDemo(null);
    }, 1500);
  };

  // Handle loading state
  if (isAccessControlLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">
          Checking permissions...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-full flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Student Management System
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Comprehensive student information and academic management
              </p>
            </div>
          </div>

          {/* Demo Action Buttons */}
          <div className="flex gap-2">
            {permissions.createStudent && (
              <Button
                onClick={() => handleDemoAction('create_student')}
                disabled={activeDemo === 'create_student'}
                className="relative"
              >
                {activeDemo === 'create_student' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add Student
              </Button>
            )}
            
            {permissions.exportData && (
              <Button
                variant="outline"
                onClick={() => handleDemoAction('export_data')}
                disabled={activeDemo === 'export_data'}
              >
                {activeDemo === 'export_data' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Export Data
              </Button>
            )}
          </div>
        </div>

        {/* Access Control Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Current Access Level */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Your Access Level
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700 dark:text-blue-300">Level:</span>
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  {accessInfo.level}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700 dark:text-blue-300">Scope:</span>
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  {accessInfo.scope}
                </span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 pt-2 border-t border-blue-200 dark:border-blue-700">
                {accessInfo.description}
              </p>
            </div>
          </div>

          {/* Scope Details */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="font-semibold text-green-900 dark:text-green-100">
                Assigned Scope
              </h3>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-green-700 dark:text-green-300">
                <strong>Coverage:</strong> {accessInfo.scopeDetails}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 pt-2 border-t border-green-200 dark:border-green-700">
                When implemented, you will only see students within your assigned scope
              </p>
            </div>
          </div>
        </div>

        {/* Permission Previews */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Permissions Preview
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPermissionDetails(!showPermissionDetails)}
            >
              {showPermissionDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {permissionPreviews.map((item) => {
              const hasPermission = can(item.action);
              const IconComponent = item.icon;
              
              return (
                <div
                  key={item.action}
                  className={`p-3 rounded-lg border transition-colors ${
                    hasPermission
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
                      : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {hasPermission ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                    <IconComponent className={`w-4 h-4 ${
                      hasPermission 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`} />
                  </div>
                  <div className={`text-xs font-medium ${
                    hasPermission 
                      ? 'text-green-800 dark:text-green-200' 
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {item.permission}
                  </div>
                  {showPermissionDetails && (
                    <div className={`text-xs mt-1 ${
                      hasPermission 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {item.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {featureCards.map((card, index) => {
          const IconComponent = card.icon;
          const colorClasses = {
            blue: 'from-blue-500 to-blue-600',
            green: 'from-green-500 to-green-600',
            purple: 'from-purple-500 to-purple-600',
            yellow: 'from-yellow-500 to-yellow-600',
            red: 'from-red-500 to-red-600',
            emerald: 'from-emerald-500 to-emerald-600',
            orange: 'from-orange-500 to-orange-600',
            indigo: 'from-indigo-500 to-indigo-600'
          };

          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 bg-gradient-to-r ${colorClasses[card.color as keyof typeof colorClasses]} rounded-lg flex items-center justify-center`}>
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {card.title}
                  </h3>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${getStatusBadge(card.status)}`}>
                    {card.status.replace('-', ' ')}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {card.description}
              </p>
              
              <ul className="space-y-1 text-xs text-gray-500 dark:text-gray-500">
                {card.features.slice(0, 3).map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    {feature}
                  </li>
                ))}
                {card.features.length > 3 && (
                  <li className="text-xs text-gray-400 italic">
                    +{card.features.length - 3} more features
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Development Roadmap */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Development Roadmap
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              Phase 1: Core Foundation
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 pl-5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                Access control integration ✓
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                Permission framework ✓
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                Database schema design
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                Basic student profiles
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              Phase 2: Core Features
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 pl-5">
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500 flex-shrink-0" />
                Student enrollment system
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500 flex-shrink-0" />
                Attendance management
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500 flex-shrink-0" />
                Academic records
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500 flex-shrink-0" />
                Parent portal integration
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              Phase 3: Advanced Features
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 pl-5">
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                Financial management
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                Transport management
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                Health & welfare tracking
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                Advanced analytics & reporting
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Implementation Timeline
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Student management functionality is being developed in phases to ensure robust, 
                secure, and user-friendly implementation. Each phase builds upon the previous one, 
                with your current access control integration serving as the foundation for all 
                future features.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact and Support */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Need Help or Have Suggestions?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            We're actively developing this feature and would love to hear your feedback
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" size="sm">
              <Mail className="w-4 h-4 mr-2" />
              Contact Support
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Feature Request
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}