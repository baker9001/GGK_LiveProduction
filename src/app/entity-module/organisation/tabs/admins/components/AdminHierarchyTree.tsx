import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  User, 
  Shield, 
  Building2, 
  School, 
  MapPin,
  Crown,
  Users,
  Settings,
  Eye
} from 'lucide-react';
import { cn } from '../../../../../../lib/utils';
import { AdminLevel } from '../types/admin.types';

// Entity User interface for the tree
interface EntityUser {
  id: string;
  email: string;
  name: string;
  admin_level: AdminLevel;
  company_id: string;
  is_active: boolean;
  created_at: string;
  parent_admin_id?: string | null;
  assigned_schools?: string[];
  assigned_branches?: string[];
  metadata?: Record<string, any>;
}

// Tree node structure
interface AdminTreeNode {
  admin: EntityUser;
  children: AdminTreeNode[];
  level: number;
}

interface AdminHierarchyTreeProps {
  admins: EntityUser[];
  companyId: string;
  onNodeClick?: (admin: EntityUser) => void;
  className?: string;
}

export function AdminHierarchyTree({
  admins,
  companyId,
  onNodeClick,
  className
}: AdminHierarchyTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Helper function to get admin level badge configuration
  const getAdminLevelConfig = (level: AdminLevel) => {
    switch (level) {
      case 'entity_admin':
        return {
          label: 'Entity Admin',
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-700',
          icon: <Crown className="w-3 h-3" />
        };
      case 'sub_entity_admin':
        return {
          label: 'Sub Admin',
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700',
          icon: <Shield className="w-3 h-3" />
        };
      case 'school_admin':
        return {
          label: 'School Admin',
          color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700',
          icon: <School className="w-3 h-3" />
        };
      case 'branch_admin':
        return {
          label: 'Branch Admin',
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-700',
          icon: <MapPin className="w-3 h-3" />
        };
      default:
        return {
          label: 'Admin',
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-200 dark:border-gray-600',
          icon: <User className="w-3 h-3" />
        };
    }
  };

  // Build hierarchical tree structure from flat admin list
  const hierarchyTree = useMemo(() => {
    // TODO: Implement proper hierarchy building logic
    // For now, create a simple structure based on admin_level
    
    const buildTree = (adminList: EntityUser[]): AdminTreeNode[] => {
      // Group admins by parent_admin_id
      const adminMap = new Map<string, EntityUser>();
      const childrenMap = new Map<string, EntityUser[]>();
      
      // Build maps for efficient lookup
      adminList.forEach(admin => {
        adminMap.set(admin.id, admin);
        const parentId = admin.parent_admin_id || 'root';
        
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId)!.push(admin);
      });
      
      // Recursive function to build tree nodes
      const buildNode = (admin: EntityUser, level: number = 0): AdminTreeNode => {
        const children = childrenMap.get(admin.id) || [];
        return {
          admin,
          children: children.map(child => buildNode(child, level + 1)),
          level
        };
      };
      
      // Start with root admins (those without parent_admin_id)
      const rootAdmins = childrenMap.get('root') || [];
      
      // If no explicit hierarchy exists, organize by admin_level
      if (rootAdmins.length === 0) {
        // Fallback: organize by admin level
        const entityAdmins = adminList.filter(a => a.admin_level === 'entity_admin');
        const subAdmins = adminList.filter(a => a.admin_level === 'sub_entity_admin');
        const schoolAdmins = adminList.filter(a => a.admin_level === 'school_admin');
        const branchAdmins = adminList.filter(a => a.admin_level === 'branch_admin');
        
        return entityAdmins.map(admin => ({
          admin,
          children: [
            ...subAdmins.map(subAdmin => ({
              admin: subAdmin,
              children: [
                ...schoolAdmins.map(schoolAdmin => ({
                  admin: schoolAdmin,
                  children: branchAdmins.map(branchAdmin => ({
                    admin: branchAdmin,
                    children: [],
                    level: 3
                  })),
                  level: 2
                }))
              ],
              level: 1
            }))
          ],
          level: 0
        }));
      }
      
      return rootAdmins.map(admin => buildNode(admin, 0));
    };
    
    return buildTree(admins);
  }, [admins]);

  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Recursive AdminNode component
  const AdminNode: React.FC<{ 
    node: AdminTreeNode; 
    isExpanded: boolean; 
    onToggle: () => void;
  }> = ({ node, isExpanded, onToggle }) => {
    const { admin, children, level } = node;
    const hasChildren = children.length > 0;
    const levelConfig = getAdminLevelConfig(admin.admin_level);
    
    return (
      <div className="select-none">
        {/* Admin Node */}
        <div 
          className={cn(
            "flex items-center py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group",
            level > 0 && "ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-4"
          )}
          style={{ marginLeft: `${level * 24}px` }}
          onClick={() => onNodeClick?.(admin)}
        >
          {/* Expand/Collapse Button */}
          <div className="w-6 h-6 flex items-center justify-center mr-2">
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
              </button>
            ) : (
              <div className="w-4 h-4" /> // Spacer for alignment
            )}
          </div>

          {/* Admin Avatar */}
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-3",
            admin.is_active 
              ? "bg-gradient-to-br from-blue-500 to-blue-600" 
              : "bg-gray-400 dark:bg-gray-600"
          )}>
            {admin.name.charAt(0).toUpperCase()}
          </div>

          {/* Admin Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900 dark:text-white truncate">
                {admin.name}
              </span>
              
              {/* Admin Level Badge */}
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                levelConfig.color
              )}>
                {levelConfig.icon}
                {levelConfig.label}
              </span>
              
              {/* Status Badge */}
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                admin.is_active 
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
              )}>
                {admin.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {admin.email}
            </div>
            
            {/* Scope Information */}
            {(admin.assigned_schools?.length || admin.assigned_branches?.length) && (
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                {admin.assigned_schools?.length && (
                  <span className="flex items-center gap-1">
                    <School className="w-3 h-3" />
                    {admin.assigned_schools.length} school{admin.assigned_schools.length > 1 ? 's' : ''}
                  </span>
                )}
                {admin.assigned_branches?.length && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {admin.assigned_branches.length} branch{admin.assigned_branches.length > 1 ? 'es' : ''}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* TODO: Add action buttons for edit, view details, etc. */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Open admin details panel
                console.log('View admin details:', admin.id);
              }}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Children Nodes */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {children.map(childNode => (
              <AdminNode
                key={childNode.admin.id}
                node={childNode}
                isExpanded={expandedNodes.has(childNode.admin.id)}
                onToggle={() => toggleNode(childNode.admin.id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // If no admins, show empty state
  if (admins.length === 0) {
    return (
      <div className={cn("bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8", className)}>
        <div className="text-center">
          <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Administrators Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            No administrators have been created for this organization yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700", className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Admin Hierarchy
            </h3>
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Crown className="w-3 h-3 text-purple-500" />
              <span className="text-gray-600 dark:text-gray-400">Entity</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">Sub</span>
            </div>
            <div className="flex items-center gap-1">
              <School className="w-3 h-3 text-green-500" />
              <span className="text-gray-600 dark:text-gray-400">School</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-orange-500" />
              <span className="text-gray-600 dark:text-gray-400">Branch</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tree Content */}
      <div className="p-6">
        {/* Expand/Collapse All Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {admins.length} administrator{admins.length > 1 ? 's' : ''} total
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Expand all nodes that have children
                const allNodeIds = new Set<string>();
                const collectNodeIds = (nodes: AdminTreeNode[]) => {
                  nodes.forEach(node => {
                    if (node.children.length > 0) {
                      allNodeIds.add(node.admin.id);
                      collectNodeIds(node.children);
                    }
                  });
                };
                collectNodeIds(hierarchyTree);
                setExpandedNodes(allNodeIds);
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              Expand All
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              onClick={() => setExpandedNodes(new Set())}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Tree Nodes */}
        <div className="space-y-1">
          {hierarchyTree.map(rootNode => (
            <AdminNode
              key={rootNode.admin.id}
              node={rootNode}
              isExpanded={expandedNodes.has(rootNode.admin.id)}
              onToggle={() => toggleNode(rootNode.admin.id)}
            />
          ))}
        </div>

        {/* TODO: Future Enhancements */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              🚧 Future Enhancements (TODO)
            </h4>
            <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• Drag-and-drop reordering of hierarchy</li>
              <li>• Lazy loading for large hierarchies</li>
              <li>• Inline role assignment and editing</li>
              <li>• Search and filter within hierarchy</li>
              <li>• Export hierarchy as organizational chart</li>
              <li>• Bulk operations on selected nodes</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminHierarchyTree;