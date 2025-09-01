/**
 * File: /src/components/configuration/GradeHierarchyTree.tsx
 * 
 * Hierarchical Tree View Component for Grade Levels
 * Displays schools -> branches (if any) -> grade levels -> class sections in a tree structure
 * 
 * Features:
 * - Branch-level organization
 * - Collapsible/expandable nodes (click card to expand/collapse)
 * - Status indicators
 * - Action buttons for each node type
 * - Responsive design
 * 
 * FIXED: Made entire cards clickable for expand/collapse
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
  User,
  Building2
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
  branch_id?: string;
  branch_name?: string;
}

export interface BranchNode {
  id: string;
  name: string;
  code?: string;
  status: 'active' | 'inactive';
  grade_levels: GradeLevelNode[];
}

export interface SchoolNode {
  id: string;
  name: string;
  code?: string;
  status: 'active' | 'inactive';
  branches?: BranchNode[];
  grade_levels: GradeLevelNode[]; // School-level grades (not assigned to branches)
}

export interface HierarchyData {
  schools: SchoolNode[];
}

interface GradeHierarchyTreeProps {
  data: HierarchyData;
  onAddGrade?: (schoolId: string, branchId?: string) => void;
  onEditGrade?: (grade: GradeLevelNode, schoolId: string, branchId?: string) => void;
  onDeleteGrade?: (grade: GradeLevelNode, schoolId: string, branchId?: string) => void;
  onAddSection?: (gradeId: string, schoolId: string, branchId?: string) => void;
  onEditSection?: (section: ClassSectionNode, gradeId: string, schoolId: string, branchId?: string) => void;
  onDeleteSection?: (section: ClassSectionNode, gradeId: string, schoolId: string, branchId?: string) => void;
  onEditSchool?: (school: SchoolNode) => void;
  onAddBranch?: (schoolId: string) => void;
  onEditBranch?: (branch: BranchNode, schoolId: string) => void;
  onDeleteBranch?: (branch: BranchNode, schoolId: string) => void;
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
  onAddBranch,
  onEditBranch,
  onDeleteBranch,
  className
}: GradeHierarchyTreeProps) {
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
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

  const toggleBranch = (branchId: string) => {
    setExpandedBranches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(branchId)) {
        newSet.delete(branchId);
      } else {
        newSet.add(branchId);
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
    const allBranchIds = new Set(
      data.schools.flatMap(s => s.branches?.map(b => b.id) || [])
    );
    const allGradeIds = new Set(
      data.schools.flatMap(s => [
        ...s.grade_levels.map(g => g.id),
        ...(s.branches?.flatMap(b => b.grade_levels.map(g => g.id)) || [])
      ])
    );
    setExpandedSchools(allSchoolIds);
    setExpandedBranches(allBranchIds);
    setExpandedGrades(allGradeIds);
  };

  const collapseAll = () => {
    setExpandedSchools(new Set());
    setExpandedBranches(new Set());
    setExpandedGrades(new Set());
  };

  // Branch Node Component
  const BranchNodeComponent: React.FC<{ 
    branch: BranchNode; 
    schoolId: string 
  }> = ({ branch, schoolId }) => {
    const isExpanded = expandedBranches.has(branch.id);
    const hasGrades = branch.grade_levels.length > 0;

    return (
      <div className="mb-2">
        {/* Branch Header - CLICKABLE */}
        <div 
          className={cn(
            "flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700 transition-colors",
            hasGrades && "cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30"
          )}
        >
          <div 
            className="flex items-center gap-3 flex-1"
            onClick={() => hasGrades && toggleBranch(branch.id)}
          >
            {/* Expand/Collapse Icon */}
            <div className="p-1">
              {hasGrades ? (
                isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                )
              ) : (
                <div className="h-4 w-4" />
              )}
            </div>

            {/* Branch Icon and Info */}
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {branch.name}
                  </span>
                  {branch.code && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({branch.code})
                    </span>
                  )}
                  <StatusBadge status={branch.status} size="xs" />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {branch.grade_levels.length} grade{branch.grade_levels.length !== 1 ? 's' : ''}
                  {branch.grade_levels.length > 0 && (
                    <span className="ml-2">
                      • {branch.grade_levels.reduce((sum, g) => sum + g.class_sections.length, 0)} section{branch.grade_levels.reduce((sum, g) => sum + g.class_sections.length, 0) !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Branch Actions - Stop propagation to prevent expand/collapse */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {onAddGrade && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddGrade(schoolId, branch.id)}
                leftIcon={<Plus className="h-3 w-3" />}
              >
                Add Grade
              </Button>
            )}
            {onEditBranch && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEditBranch(branch, schoolId)}
                leftIcon={<Edit className="h-3 w-3" />}
              >
                Edit
              </Button>
            )}
            {onDeleteBranch && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDeleteBranch(branch, schoolId)}
                leftIcon={<Trash2 className="h-3 w-3" />}
                className="text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Branch Grade Levels */}
        {isExpanded && hasGrades && (
          <div className="ml-8 mt-2 space-y-2">
            {branch.grade_levels
              .sort((a, b) => a.grade_order - b.grade_order)
              .map(grade => (
                <GradeNode 
                  key={grade.id} 
                  grade={grade} 
                  schoolId={schoolId}
                  branchId={branch.id}
                />
              ))}
          </div>
        )}
      </div>
    );
  };

  // School Node Component
  const SchoolNode: React.FC<{ school: SchoolNode }> = ({ school }) => {
    const isExpanded = expandedSchools.has(school.id);
    const hasBranches = (school.branches?.length || 0) > 0;
    const hasSchoolLevelGrades = school.grade_levels.filter(g => !g.branch_id).length > 0;
    const hasContent = hasBranches || hasSchoolLevelGrades;

    // Calculate totals
    const totalGrades = school.grade_levels.length + (school.branches?.reduce((sum, b) => sum + b.grade_levels.length, 0) || 0);
    const totalSections = school.grade_levels.reduce((sum, g) => sum + g.class_sections.length, 0) + 
                          (school.branches?.reduce((sum, b) => sum + b.grade_levels.reduce((gSum, g) => gSum + g.class_sections.length, 0), 0) || 0);

    return (
      <div className="mb-2">
        {/* School Header - CLICKABLE */}
        <div 
          className={cn(
            "flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-shadow",
            hasContent && "cursor-pointer hover:shadow-md"
          )}
        >
          <div 
            className="flex items-center gap-3 flex-1"
            onClick={() => hasContent && toggleSchool(school.id)}
          >
            {/* Expand/Collapse Icon */}
            <div className="p-1">
              {hasContent ? (
                isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                )
              ) : (
                <div className="h-4 w-4" />
              )}
            </div>

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
                  {hasBranches && (
                    <span>{school.branches?.length} branch{school.branches?.length !== 1 ? 'es' : ''} • </span>
                  )}
                  {totalGrades} grade level{totalGrades !== 1 ? 's' : ''}
                  {totalSections > 0 && (
                    <span className="ml-2">
                      • {totalSections} section{totalSections !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* School Actions - Stop propagation to prevent expand/collapse */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {onAddBranch && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddBranch(school.id)}
                leftIcon={<Plus className="h-3 w-3" />}
              >
                Add Branch
              </Button>
            )}
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

        {/* School Content (Branches and School-level Grades) */}
        {isExpanded && hasContent && (
          <div className="ml-8 mt-3 space-y-2">
            {/* Branches */}
            {school.branches?.map(branch => (
              <BranchNodeComponent 
                key={branch.id} 
                branch={branch} 
                schoolId={school.id}
              />
            ))}
            
            {/* School-level Grades (not assigned to branches) */}
            {hasSchoolLevelGrades && (
              <>
                {hasBranches && (
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-3 mb-1">
                    School-level Grades:
                  </div>
                )}
                {school.grade_levels
                  .filter(g => !g.branch_id)
                  .sort((a, b) => a.grade_order - b.grade_order)
                  .map(grade => (
                    <GradeNode 
                      key={grade.id} 
                      grade={grade} 
                      schoolId={school.id}
                    />
                  ))}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // Grade Level Node Component
  const GradeNode: React.FC<{ 
    grade: GradeLevelNode; 
    schoolId: string;
    branchId?: string;
  }> = ({ grade, schoolId, branchId }) => {
    const isExpanded = expandedGrades.has(grade.id);
    const hasSections = grade.class_sections.length > 0;

    return (
      <div className="mb-2">
        {/* Grade Header - CLICKABLE */}
        <div 
          className={cn(
            "flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors",
            hasSections && "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50"
          )}
        >
          <div 
            className="flex items-center gap-3 flex-1"
            onClick={() => hasSections && toggleGrade(grade.id)}
          >
            {/* Expand/Collapse Icon */}
            <div className="p-1">
              {hasSections ? (
                isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                )
              ) : (
                <div className="h-4 w-4" />
              )}
            </div>

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

          {/* Grade Actions - Stop propagation to prevent expand/collapse */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {onAddSection && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddSection(grade.id, schoolId, branchId)}
                leftIcon={<Plus className="h-3 w-3" />}
              >
                Add Section
              </Button>
            )}
            {onEditGrade && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEditGrade(grade, schoolId, branchId)}
                leftIcon={<Edit className="h-3 w-3" />}
              >
                Edit
              </Button>
            )}
            {onDeleteGrade && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDeleteGrade(grade, schoolId, branchId)}
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
                  branchId={branchId}
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
    branchId?: string;
  }> = ({ section, gradeId, schoolId, branchId }) => {
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
              onClick={() => onEditSection(section, gradeId, schoolId, branchId)}
              leftIcon={<Edit className="h-3 w-3" />}
            >
              Edit
            </Button>
          )}
          {onDeleteSection && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDeleteSection(section, gradeId, schoolId, branchId)}
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
    </div>
  );
}