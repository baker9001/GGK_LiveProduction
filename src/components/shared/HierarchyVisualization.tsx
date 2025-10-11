'use client';

import React, { useMemo } from 'react';
import { Building2, ChevronRight, GraduationCap, Users } from 'lucide-react';

export interface HierarchyNode {
  id: string;
  name: string;
  type: 'school' | 'branch' | 'grade' | 'section';
  count?: number;
  children?: HierarchyNode[];
  isSelected?: boolean;
}

interface HierarchyVisualizationProps {
  nodes: HierarchyNode[];
  selectedSchools?: string[];
  selectedBranches?: string[];
  selectedGrades?: string[];
  selectedSections?: string[];
  onNodeClick?: (node: HierarchyNode) => void;
  showCounts?: boolean;
  compact?: boolean;
  className?: string;
}

export function HierarchyVisualization({
  nodes,
  selectedSchools = [],
  selectedBranches = [],
  selectedGrades = [],
  selectedSections = [],
  onNodeClick,
  showCounts = true,
  compact = false,
  className = '',
}: HierarchyVisualizationProps) {
  const getNodeIcon = (type: string, size: string = 'w-4 h-4') => {
    switch (type) {
      case 'school':
        return <Building2 className={size} />;
      case 'branch':
        return <Building2 className={size} />;
      case 'grade':
        return <GraduationCap className={size} />;
      case 'section':
        return <Users className={size} />;
      default:
        return null;
    }
  };

  const isNodeSelected = (node: HierarchyNode): boolean => {
    switch (node.type) {
      case 'school':
        return selectedSchools.includes(node.id);
      case 'branch':
        return selectedBranches.includes(node.id);
      case 'grade':
        return selectedGrades.includes(node.id);
      case 'section':
        return selectedSections.includes(node.id);
      default:
        return false;
    }
  };

  const renderNode = (node: HierarchyNode, level: number = 0, isLast: boolean = false) => {
    const selected = isNodeSelected(node);
    const hasChildren = node.children && node.children.length > 0;
    const indent = level * (compact ? 16 : 24);

    return (
      <div key={node.id} className="relative">
        {/* Connection lines */}
        {level > 0 && (
          <>
            <div
              className="absolute left-0 top-0 h-6 w-px bg-gray-300 dark:bg-gray-600"
              style={{ left: `${indent - 12}px` }}
            />
            <div
              className="absolute top-6 w-3 h-px bg-gray-300 dark:bg-gray-600"
              style={{ left: `${indent - 12}px` }}
            />
          </>
        )}

        {/* Node */}
        <button
          onClick={() => onNodeClick?.(node)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg transition-all w-full text-left
            ${selected
              ? 'bg-[#8CC63F]/10 border-2 border-[#8CC63F] shadow-sm'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-[#8CC63F]/50 hover:shadow-sm'
            }
            ${onNodeClick ? 'cursor-pointer' : 'cursor-default'}
            ${compact ? 'text-sm' : ''}
          `}
          style={{ marginLeft: `${indent}px` }}
          disabled={!onNodeClick}
        >
          <div className={`
            flex items-center justify-center rounded-full
            ${selected
              ? 'bg-[#8CC63F] text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }
            ${compact ? 'w-7 h-7' : 'w-8 h-8'}
          `}>
            {getNodeIcon(node.type, compact ? 'w-3.5 h-3.5' : 'w-4 h-4')}
          </div>

          <span className={`
            flex-1 font-medium
            ${selected
              ? 'text-[#7AB635] dark:text-[#8CC63F]'
              : 'text-gray-900 dark:text-white'
            }
            ${compact ? 'text-sm' : ''}
          `}>
            {node.name}
          </span>

          {showCounts && node.count !== undefined && (
            <span className={`
              px-2 py-0.5 rounded-full text-xs font-medium
              ${selected
                ? 'bg-[#8CC63F]/20 text-[#7AB635] dark:text-[#8CC63F]'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }
            `}>
              {node.count} {node.type === 'section' ? 'students' : node.type === 'grade' ? 'sections' : 'students'}
            </span>
          )}

          {hasChildren && (
            <ChevronRight className={`
              ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}
              ${selected ? 'text-[#8CC63F]' : 'text-gray-400 dark:text-gray-600'}
            `} />
          )}
        </button>

        {/* Children */}
        {hasChildren && (
          <div className={`space-y-${compact ? '1' : '2'} mt-${compact ? '1' : '2'}`}>
            {node.children!.map((child, index) =>
              renderNode(child, level + 1, index === node.children!.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  const totalNodes = useMemo(() => {
    let count = 0;
    const countNodes = (nodes: HierarchyNode[]) => {
      nodes.forEach(node => {
        count++;
        if (node.children) {
          countNodes(node.children);
        }
      });
    };
    countNodes(nodes);
    return count;
  }, [nodes]);

  const selectedCount = useMemo(() => {
    return selectedSchools.length + selectedBranches.length + selectedGrades.length + selectedSections.length;
  }, [selectedSchools, selectedBranches, selectedGrades, selectedSections]);

  if (nodes.length === 0) {
    return (
      <div className={`p-8 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-lg ${className}`}>
        <Building2 className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" />
        <p className="text-sm text-gray-600 dark:text-gray-400">No schools available</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Configure schools in the organization settings
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Organization Hierarchy
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            {selectedCount} of {totalNodes} items selected
          </p>
        </div>
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            {selectedSchools.length > 0 && (
              <span className="px-2 py-1 rounded-full bg-[#8CC63F]/10 text-[#7AB635]">
                {selectedSchools.length} schools
              </span>
            )}
            {selectedGrades.length > 0 && (
              <span className="px-2 py-1 rounded-full bg-[#E8F5DC] dark:bg-[#5D7E23]/30 text-[#5D7E23] dark:text-[#AAD775]">
                {selectedGrades.length} grades
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tree */}
      <div className={`space-y-${compact ? '1' : '2'} max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600`}>
        {nodes.map((node, index) => renderNode(node, 0, index === nodes.length - 1))}
      </div>

      {/* Summary */}
      {selectedCount > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-[#8CC63F]/5 border border-[#8CC63F]/20">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-[#8CC63F]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <GraduationCap className="w-3 h-3 text-[#8CC63F]" />
            </div>
            <div className="flex-1 text-xs">
              <p className="font-medium text-gray-900 dark:text-white mb-1">
                Selection Summary
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Mock exam will be delivered across {selectedSchools.length} school{selectedSchools.length !== 1 ? 's' : ''}
                {selectedBranches.length > 0 && ` and ${selectedBranches.length} branch${selectedBranches.length !== 1 ? 'es' : ''}`}
                , targeting {selectedGrades.length} year group{selectedGrades.length !== 1 ? 's' : ''}
                {selectedSections.length > 0 && ` in ${selectedSections.length} specific section${selectedSections.length !== 1 ? 's' : ''}`}.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
