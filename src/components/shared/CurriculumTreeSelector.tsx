import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Book, Layers, FileText, Bookmark, Check, Search, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TreeNode {
  id: string;
  name: string;
  type: 'data_structure' | 'unit' | 'topic' | 'subtopic';
  parentId?: string;
  children?: TreeNode[];
  metadata?: Record<string, string>;
  hasChildren?: boolean;
}

interface CurriculumSelection {
  dataStructureId: string | null;
  dataStructureName?: string;
  unitId: string | null;
  unitName?: string;
  topicId: string | null;
  topicName?: string;
  subtopicId: string | null;
  subtopicName?: string;
}

interface CurriculumTreeSelectorProps {
  value: CurriculumSelection;
  onChange: (selection: CurriculumSelection) => void;
  error?: string;
  disabled?: boolean;
  showBreadcrumb?: boolean;
  placeholder?: string;
}

const NODE_ICONS = {
  data_structure: <Book className="h-4 w-4" />,
  unit: <Layers className="h-4 w-4" />,
  topic: <FileText className="h-4 w-4" />,
  subtopic: <Bookmark className="h-4 w-4" />
};

const NODE_COLORS = {
  data_structure: 'text-blue-600 dark:text-blue-400',
  unit: 'text-emerald-600 dark:text-emerald-400',
  topic: 'text-amber-600 dark:text-amber-400',
  subtopic: 'text-violet-600 dark:text-violet-400'
};

export const CurriculumTreeSelector: React.FC<CurriculumTreeSelectorProps> = ({
  value,
  onChange,
  error,
  disabled = false,
  showBreadcrumb = true,
  placeholder = 'Select curriculum location...'
}) => {
  const [dataStructures, setDataStructures] = useState<TreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [childrenCache, setChildrenCache] = useState<Record<string, TreeNode[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDataStructures();
  }, []);

  const fetchDataStructures = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('data_structures')
        .select(`
          id,
          regions (name),
          programs (name),
          providers (name),
          edu_subjects (id, name)
        `)
        .eq('status', 'active')
        .order('id');

      if (error) throw error;

      const nodes: TreeNode[] = data.map(ds => ({
        id: ds.id,
        name: `${ds.edu_subjects?.name || 'Unknown'} - ${ds.programs?.name || ''} - ${ds.providers?.name || ''}`,
        type: 'data_structure' as const,
        hasChildren: true,
        metadata: {
          region: ds.regions?.name || '',
          program: ds.programs?.name || '',
          provider: ds.providers?.name || '',
          subject: ds.edu_subjects?.name || '',
          subjectId: ds.edu_subjects?.id || ''
        }
      }));

      setDataStructures(nodes);
    } catch (err) {
      console.error('Error fetching data structures:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChildren = async (node: TreeNode): Promise<TreeNode[]> => {
    const cacheKey = `${node.type}-${node.id}`;
    if (childrenCache[cacheKey]) {
      return childrenCache[cacheKey];
    }

    setLoadingNodes(prev => new Set([...prev, node.id]));

    try {
      let children: TreeNode[] = [];

      if (node.type === 'data_structure') {
        const subjectId = node.metadata?.subjectId;
        if (subjectId) {
          const { data, error } = await supabase
            .from('edu_units')
            .select('id, name')
            .eq('subject_id', subjectId)
            .eq('status', 'active')
            .order('name');

          if (!error && data) {
            children = data.map(unit => ({
              id: unit.id,
              name: unit.name,
              type: 'unit' as const,
              parentId: node.id,
              hasChildren: true
            }));
          }
        }
      } else if (node.type === 'unit') {
        const { data, error } = await supabase
          .from('edu_topics')
          .select('id, name')
          .eq('unit_id', node.id)
          .eq('status', 'active')
          .order('name');

        if (!error && data) {
          children = data.map(topic => ({
            id: topic.id,
            name: topic.name,
            type: 'topic' as const,
            parentId: node.id,
            hasChildren: true
          }));
        }
      } else if (node.type === 'topic') {
        const { data, error } = await supabase
          .from('edu_subtopics')
          .select('id, name')
          .eq('topic_id', node.id)
          .eq('status', 'active')
          .order('name');

        if (!error && data) {
          children = data.map(subtopic => ({
            id: subtopic.id,
            name: subtopic.name,
            type: 'subtopic' as const,
            parentId: node.id,
            hasChildren: false
          }));
        }
      }

      setChildrenCache(prev => ({ ...prev, [cacheKey]: children }));
      return children;
    } finally {
      setLoadingNodes(prev => {
        const next = new Set(prev);
        next.delete(node.id);
        return next;
      });
    }
  };

  const handleToggle = useCallback(async (node: TreeNode) => {
    if (disabled) return;

    const isExpanded = expandedNodes.has(node.id);

    if (isExpanded) {
      setExpandedNodes(prev => {
        const next = new Set(prev);
        next.delete(node.id);
        return next;
      });
    } else {
      await fetchChildren(node);
      setExpandedNodes(prev => new Set([...prev, node.id]));
    }
  }, [disabled, expandedNodes]);

  const handleSelect = useCallback((node: TreeNode, parentChain: TreeNode[]) => {
    if (disabled) return;

    const newSelection: CurriculumSelection = {
      dataStructureId: null,
      unitId: null,
      topicId: null,
      subtopicId: null
    };

    for (const parent of parentChain) {
      if (parent.type === 'data_structure') {
        newSelection.dataStructureId = parent.id;
        newSelection.dataStructureName = parent.name;
      } else if (parent.type === 'unit') {
        newSelection.unitId = parent.id;
        newSelection.unitName = parent.name;
      } else if (parent.type === 'topic') {
        newSelection.topicId = parent.id;
        newSelection.topicName = parent.name;
      }
    }

    if (node.type === 'data_structure') {
      newSelection.dataStructureId = node.id;
      newSelection.dataStructureName = node.name;
    } else if (node.type === 'unit') {
      newSelection.unitId = node.id;
      newSelection.unitName = node.name;
    } else if (node.type === 'topic') {
      newSelection.topicId = node.id;
      newSelection.topicName = node.name;
    } else if (node.type === 'subtopic') {
      newSelection.subtopicId = node.id;
      newSelection.subtopicName = node.name;
    }

    onChange(newSelection);
  }, [disabled, onChange]);

  const isNodeSelected = useCallback((node: TreeNode) => {
    if (node.type === 'data_structure') return value.dataStructureId === node.id;
    if (node.type === 'unit') return value.unitId === node.id;
    if (node.type === 'topic') return value.topicId === node.id;
    if (node.type === 'subtopic') return value.subtopicId === node.id;
    return false;
  }, [value]);

  const isNodeInPath = useCallback((node: TreeNode) => {
    if (node.type === 'data_structure') return value.dataStructureId === node.id;
    if (node.type === 'unit') return value.unitId === node.id;
    if (node.type === 'topic') return value.topicId === node.id;
    return false;
  }, [value]);

  const renderTreeNode = (node: TreeNode, depth: number = 0, parentChain: TreeNode[] = []) => {
    const isExpanded = expandedNodes.has(node.id);
    const isLoading = loadingNodes.has(node.id);
    const isSelected = isNodeSelected(node);
    const isInPath = isNodeInPath(node);
    const cacheKey = `${node.type}-${node.id}`;
    const children = childrenCache[cacheKey] || [];

    const matchesSearch = searchQuery
      ? node.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    if (searchQuery && !matchesSearch && children.length === 0) {
      return null;
    }

    return (
      <div key={node.id} className={depth > 0 ? 'ml-4' : ''}>
        <div
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all group
            ${isSelected
              ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500'
              : isInPath
                ? 'bg-blue-50 dark:bg-blue-900/10'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onClick={() => handleSelect(node, parentChain)}
        >
          {node.hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggle(node);
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              disabled={disabled}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
            </button>
          )}

          {!node.hasChildren && <div className="w-5" />}

          <span className={NODE_COLORS[node.type]}>
            {NODE_ICONS[node.type]}
          </span>

          <span
            className={`
              flex-1 text-sm truncate
              ${isSelected ? 'font-medium text-blue-900 dark:text-blue-100' : 'text-gray-700 dark:text-gray-300'}
            `}
          >
            {node.name}
          </span>

          {isSelected && (
            <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          )}
        </div>

        {isExpanded && children.length > 0 && (
          <div className="border-l-2 border-gray-200 dark:border-gray-600 ml-4 mt-1">
            {children.map(child =>
              renderTreeNode(child, depth + 1, [...parentChain, node])
            )}
          </div>
        )}

        {isExpanded && !isLoading && children.length === 0 && (
          <div className="ml-8 py-2 text-sm text-gray-400 dark:text-gray-500 italic">
            No items available
          </div>
        )}
      </div>
    );
  };

  const getBreadcrumbParts = () => {
    const parts: { label: string; type: string }[] = [];
    if (value.dataStructureName) parts.push({ label: value.dataStructureName, type: 'data_structure' });
    if (value.unitName) parts.push({ label: value.unitName, type: 'unit' });
    if (value.topicName) parts.push({ label: value.topicName, type: 'topic' });
    if (value.subtopicName) parts.push({ label: value.subtopicName, type: 'subtopic' });
    return parts;
  };

  const breadcrumbParts = getBreadcrumbParts();

  const filteredDataStructures = searchQuery
    ? dataStructures.filter(ds =>
        ds.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : dataStructures;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Curriculum Location <span className="text-red-500">*</span>
      </label>

      {showBreadcrumb && breadcrumbParts.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          {breadcrumbParts.map((part, index) => (
            <React.Fragment key={part.type}>
              <span
                className={`
                  inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
                  ${NODE_COLORS[part.type as keyof typeof NODE_COLORS]}
                  bg-white dark:bg-gray-800 shadow-sm
                `}
              >
                {NODE_ICONS[part.type as keyof typeof NODE_ICONS]}
                <span className="truncate max-w-[150px]">{part.label}</span>
              </span>
              {index < breadcrumbParts.length - 1 && (
                <ChevronRight className="h-3 w-3 text-blue-400 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search curriculum..."
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={disabled}
        />
      </div>

      <div
        className={`
          border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <div className="max-h-80 overflow-auto p-2 bg-white dark:bg-gray-800">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="ml-2 text-sm text-gray-500">Loading curriculum...</span>
            </div>
          ) : filteredDataStructures.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No matching items found' : 'No curriculum data available'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredDataStructures.map(node => renderTreeNode(node))}
            </div>
          )}
        </div>
      </div>

      {!value.dataStructureId && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {placeholder}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default CurriculumTreeSelector;
