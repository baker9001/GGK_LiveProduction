/**
 * File: /src/components/configuration/GradeHierarchyTree.tsx
 * 
 * Hierarchical Tree View Component for Grade Levels
 * Displays schools -> grade levels -> class sections in a tree structure
 * 
 * Features:
 * - Collapsible/expandable nodes
 * - Status indicators
 * - Action buttons for each node type
 * - Responsive design
 * 
 * FIXED: Removed duplicate summary statistics (now only in parent component)
 */

import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  School, 
  GraduationCap, 
  Users, 
  Plus, 
  Edit, 
  Trash2,
  MapPin,
  Calendar,
  Hash,
  User
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../shared/Button';
import { StatusBadge } from '../shared/StatusBadge';

// Type definitions for hierarchical data
export interface ClassSectionNode {
  id: string;
  section_name: string;
  section_code?: string;
  max_capacity: number;
  class_section_order: number;
  status: 'active' | 'inactive';
  current_students?: number;
}

export interface GradeLevelNode {
  id: string;
  grade_name: string;
  grade_code?: string;
  grade_order: number;
  education_level: string;
  status: 'active' | 'inactive';
  class_sections: ClassSectionNode[];
}

export interface SchoolNode {
  id: string;
  name: string;
  code?: string;
  status: 'active' | 'inactive';
  grade_levels: GradeLevelNode[];
}

export interface HierarchyData {
  schools: SchoolNode[];
}

interface GradeHierarchyTreeProps {
  data: HierarchyData;
  onAddGrade?: (schoolId: string) => void;
  onEditGrade?: (grade: GradeLevelNode, schoolId: string) => void;
  onDeleteGrade?: (grade: GradeLevelNode, schoolId: string) => void;
  onAddSection?: (gradeId: string, schoolId: string) => void;
  onEditSection?: (section: ClassSectionNode, gradeId: string, schoolId: string) => void;
  onDeleteSection?: (section: ClassSectionNode, gradeId: string, schoolId: string) => void;
  onEditSchool?: (school: SchoolNode) => void;
  className?: string;
}

export function GradeHierarchyTree({
  data,
  onAddGrade,
  onEditGrade,
  onDeleteGrade,
  onAddSection,
  onEditSection,
  onDeleteSection,
  onEditSchool,
  className
}: GradeHierarchyTreeProps) {
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());

  const toggleSchool = (schoolId: string) => {
    setExpandedSchools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(schoolId)) {
        newSet.delete(schoolId);
      } else {
        newSet.add(schoolId);
      }
      return newSet;
    });
  };

  const toggleGrade = (gradeId: string) => {
    setExpandedGrades(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gradeId)) {
        newSet.delete(gradeId);
      } else {
        newSet.add(gradeId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allSchoolIds = new Set(data.schools.map(s => s.id));
    const allGradeIds = new Set(
      data.schools.flatMap(s => s.grade_levels.map(g => g.id))
    );
    setExpandedSchools(allSchoolIds);
    setExpandedGrades(allGradeIds);
  };

  const collapseAll = () => {
    setExpandedSchools(new Set());
    setExpandedGrades(new Set());
  };

  // School Node Component
  const SchoolNode: React.FC<{ school: SchoolNode }> = ({ school }) => {
    const isExpanded = expandedSchools.has(school.id);
    const hasGrades = school.grade_levels.length > 0;

    return (
      <div className="mb-2">
        {/* School Header */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 flex-1">
            {/* Expand/Collapse Button */}
            <button
              onClick={() => toggleSchool(school.id)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              disabled={!hasGrades}
            >
              {hasGrades ? (
                isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                )
              ) : (
                <div className="h-4 w-4" />
              )}
            </button>

            {/* School Icon and Info */}
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <School className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {school.name}
                  </h3>
                  {school.code && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({school.code})
                    </span>
                  )}
                  <StatusBadge status={school.status} size="sm" />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {school.grade_levels.length} grade level{school.grade_levels.length !== 1 ? 's' : ''}
                  {school.grade_levels.length > 0 && (
                    <span className="ml-2">
                      • {school.grade_levels.reduce((sum, g) => sum + g.class_sections.length, 0)} section{school.grade_levels.reduce((sum, g) => sum + g.class_sections.length, 0) !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* School Actions */}
          <div className="flex items-center gap-2">
            {onAddGrade && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddGrade(school.id)}
                leftIcon={<Plus className="h-3 w-3" />}
              >
                Add Grade
              </Button>
            )}
            {onEditSchool && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEditSchool(school)}
                leftIcon={<Edit className="h-3 w-3" />}
              >
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Grade Levels */}
        {isExpanded && hasGrades && (
          <div className="ml-8 mt-3 space-y-2">
            {school.grade_levels
              .sort((a, b) => a.grade_order - b.grade_order)
              .map(grade => (
                <GradeNode 
                  key={grade.id} 
                  grade={grade} 
                  schoolId={school.id}
                />
              ))}
          </div>
        )}
      </div>
    );
  };

  // Grade Level Node Component
  const GradeNode: React.FC<{ grade: GradeLevelNode; schoolId: string }> = ({ grade, schoolId }) => {
    const isExpanded = expandedGrades.has(grade.id);
    const hasSections = grade.class_sections.length > 0;

    return (
      <div className="mb-2">
        {/* Grade Header */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
          <div className="flex items-center gap-3 flex-1">
            {/* Expand/Collapse Button */}
            <button
              onClick={() => toggleGrade(grade.id)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              disabled={!hasSections}
            >
              {hasSections ? (
                isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                )
              ) : (
                <div className="h-4 w-4" />
              )}
            </button>

            {/* Grade Icon and Info */}
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {grade.grade_name}
                  </span>
                  {grade.grade_code && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({grade.grade_code})
                    </span>
                  )}
                  <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                    Order: {grade.grade_order}
                  </span>
                  <StatusBadge status={grade.status} size="xs" />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {grade.education_level} • {grade.class_sections.length} section{grade.class_sections.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Grade Actions */}
          <div className="flex items-center gap-1">
            {onAddSection && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddSection(grade.id, schoolId)}
                leftIcon={<Plus className="h-3 w-3" />}
              >
                Add Section
              </Button>
            )}
            {onEditGrade && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEditGrade(grade, schoolId)}
                leftIcon={<Edit className="h-3 w-3" />}
              >
                Edit
              </Button>
            )}
            {onDeleteGrade && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDeleteGrade(grade, schoolId)}
                leftIcon={<Trash2 className="h-3 w-3" />}
                className="text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Class Sections */}
        {isExpanded && hasSections && (
          <div className="ml-8 mt-2 space-y-1">
            {grade.class_sections
              .sort((a, b) => a.class_section_order - b.class_section_order)
              .map(section => (
                <SectionNode 
                  key={section.id} 
                  section={section} 
                  gradeId={grade.id}
                  schoolId={schoolId}
                />
              ))}
          </div>
        )}
      </div>
    );
  };

  // Class Section Node Component
  const SectionNode: React.FC<{ 
    section: ClassSectionNode; 
    gradeId: string; 
    schoolId: string; 
  }> = ({ section, gradeId, schoolId }) => {
    return (
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
        <div className="flex items-center gap-3 flex-1">
          {/* Section Icon and Info */}
          <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900/30 rounded flex items-center justify-center">
            <Users className="h-3 w-3 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {section.section_name}
              </span>
              {section.section_code && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({section.section_code})
                </span>
              )}
              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                Order: {section.class_section_order}
              </span>
              <StatusBadge status={section.status} size="xs" />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {section.current_students || 0}/{section.max_capacity} students
              </span>
            </div>
          </div>
        </div>

        {/* Section Actions */}
        <div className="flex items-center gap-1">
          {onEditSection && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEditSection(section, gradeId, schoolId)}
              leftIcon={<Edit className="h-3 w-3" />}
            >
              Edit
            </Button>
          )}
          {onDeleteSection && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDeleteSection(section, gradeId, schoolId)}
              leftIcon={<Trash2 className="h-3 w-3" />}
              className="text-red-600 hover:text-red-700 dark:text-red-400"
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Empty state
  if (!data.schools || data.schools.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <School className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Schools Found
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Schools must be created before grade levels can be configured.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Tree Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Academic Structure
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({data.schools.length} school{data.schools.length !== 1 ? 's' : ''})
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={expandAll}
          >
            Expand All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={collapseAll}
          >
            Collapse All
          </Button>
        </div>
      </div>

      {/* Tree Structure */}
      <div className="space-y-4">
        {data.schools.map(school => (
          <SchoolNode key={school.id} school={school} />
        ))}
      </div>

      {/* REMOVED: Summary Statistics section that was causing duplication */}
      {/* Stats are now only rendered in the parent GradeLevelsTab component */}
    </div>
  );
}