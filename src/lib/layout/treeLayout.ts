// src/lib/layout/treeLayout.ts
// Complete rewrite with proper grid layout support
// Maintains all existing integrations and features

export interface TreeNode {
  id: string;
  type: 'company' | 'school' | 'branch' | 'year' | 'section';
  parentId?: string;
  children: string[];
  data?: any;
}

export interface NodeDimensions {
  width: number;
  height: number;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface LayoutConfig {
  gapX: number;                  // Horizontal spacing between siblings
  gapY: number;                  // Vertical spacing between levels
  centerParents: boolean;        // Whether to center parents over children
  minCardWidth: number;          // Minimum card width
  maxCardWidth: number;          // Maximum card width
  maxSiblingsPerRow?: number;    // Maximum siblings before wrapping to grid
  compactGapX?: number;          // Tighter horizontal gap for large groups
  gridRowGapY?: number;          // Vertical gap between grid rows
}

export interface LayoutResult {
  positions: Map<string, NodePosition>;
  totalSize: { width: number; height: number };
  levelHeights: Map<number, number>;
}

interface NodeLayout {
  nodeId: string;
  width: number;
  height: number;
  x: number;
  y: number;
  childrenBounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export class TreeLayoutEngine {
  protected nodes: Map<string, TreeNode>;
  protected dimensions: Map<string, NodeDimensions>;
  protected config: LayoutConfig;
  private layouts: Map<string, NodeLayout> = new Map();
  private levels: Map<string, number> = new Map();

  constructor(
    nodes: Map<string, TreeNode>,
    dimensions: Map<string, NodeDimensions>,
    config: LayoutConfig
  ) {
    this.nodes = nodes;
    this.dimensions = dimensions;
    this.config = {
      ...config,
      maxSiblingsPerRow: config.maxSiblingsPerRow ?? 6,
      compactGapX: config.compactGapX ?? 20,
      gridRowGapY: config.gridRowGapY ?? 30
    };
  }

  public layout(rootId: string): LayoutResult {
    // Reset
    this.layouts.clear();
    this.levels.clear();
    
    // Calculate levels
    this.calculateLevels(rootId, 0);
    
    // Perform bottom-up layout calculation
    this.calculateLayout(rootId);
    
    // Extract positions
    const positions = new Map<string, NodePosition>();
    this.layouts.forEach((layout, nodeId) => {
      positions.set(nodeId, { x: layout.x, y: layout.y });
    });
    
    // Normalize to start from (0,0) with padding
    const normalizedPositions = this.normalizePositions(positions);
    
    // Calculate level heights for compatibility
    const levelHeights = this.calculateLevelHeights();
    
    // Calculate total size
    const totalSize = this.calculateTotalSize(normalizedPositions);
    
    return {
      positions: normalizedPositions,
      totalSize,
      levelHeights
    };
  }

  private calculateLevels(nodeId: string, level: number): void {
    this.levels.set(nodeId, level);
    const node = this.nodes.get(nodeId);
    if (node && node.children) {
      node.children.forEach(childId => {
        this.calculateLevels(childId, level + 1);
      });
    }
  }

  private calculateLayout(nodeId: string): NodeLayout {
    const node = this.nodes.get(nodeId);
    const dimensions = this.dimensions.get(nodeId) || { width: this.config.minCardWidth, height: 140 };
    const level = this.levels.get(nodeId) || 0;
    
    if (!node) {
      return {
        nodeId,
        width: dimensions.width,
        height: dimensions.height,
        x: 0,
        y: 0,
        childrenBounds: { minX: 0, maxX: dimensions.width, minY: 0, maxY: dimensions.height }
      };
    }
    
    // Base Y position based on level
    const y = level * (140 + this.config.gapY);
    
    // Handle leaf nodes
    if (!node.children || node.children.length === 0) {
      const layout: NodeLayout = {
        nodeId,
        width: dimensions.width,
        height: dimensions.height,
        x: 0,
        y,
        childrenBounds: { 
          minX: -dimensions.width / 2, 
          maxX: dimensions.width / 2, 
          minY: y, 
          maxY: y + dimensions.height 
        }
      };
      this.layouts.set(nodeId, layout);
      return layout;
    }
    
    // Calculate layouts for all children first
    const childLayouts = node.children.map(childId => this.calculateLayout(childId));
    
    // Determine if we need grid layout
    const needsGrid = node.children.length > (this.config.maxSiblingsPerRow || 6);
    
    let childrenBounds: { minX: number; maxX: number; minY: number; maxY: number };
    
    if (needsGrid) {
      // GRID LAYOUT
      childrenBounds = this.arrangeChildrenInGrid(node.children, childLayouts, y + dimensions.height);
    } else {
      // LINEAR LAYOUT
      childrenBounds = this.arrangeChildrenLinearly(node.children, childLayouts, y + dimensions.height);
    }
    
    // Position parent centered over children
    const parentX = this.config.centerParents 
      ? (childrenBounds.minX + childrenBounds.maxX) / 2
      : 0;
    
    const layout: NodeLayout = {
      nodeId,
      width: dimensions.width,
      height: dimensions.height,
      x: parentX,
      y,
      childrenBounds
    };
    
    this.layouts.set(nodeId, layout);
    return layout;
  }

  private arrangeChildrenInGrid(
    childIds: string[], 
    childLayouts: NodeLayout[], 
    startY: number
  ): { minX: number; maxX: number; minY: number; maxY: number } {
    const cols = this.config.maxSiblingsPerRow!;
    const rows = Math.ceil(childIds.length / cols);
    const gap = this.config.compactGapX!;
    const rowGap = this.config.gridRowGapY!;
    
    // Find max child dimensions for uniform grid
    let maxChildWidth = 0;
    let maxChildHeight = 0;
    childLayouts.forEach(layout => {
      maxChildWidth = Math.max(maxChildWidth, layout.width);
      maxChildHeight = Math.max(maxChildHeight, layout.height);
    });
    
    // Calculate grid dimensions
    const gridWidth = (maxChildWidth * cols) + (gap * (cols - 1));
    const gridHeight = (maxChildHeight * rows) + (rowGap * (rows - 1));
    
    // Start position to center the grid
    const gridStartX = -gridWidth / 2;
    const gridStartY = startY + this.config.gapY;
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    // Position each child in the grid
    childIds.forEach((childId, index) => {
      const childLayout = childLayouts[index];
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      // For the last row with fewer items, center them
      const itemsInLastRow = childIds.length % cols || cols;
      const isLastRow = row === rows - 1;
      const itemsInRow = isLastRow ? itemsInLastRow : cols;
      
      let childX: number;
      if (isLastRow && itemsInRow < cols) {
        // Center the last row
        const lastRowWidth = (maxChildWidth * itemsInRow) + (gap * (itemsInRow - 1));
        const lastRowStartX = -lastRowWidth / 2;
        childX = lastRowStartX + (col * (maxChildWidth + gap)) + (maxChildWidth / 2);
      } else {
        // Normal grid positioning
        childX = gridStartX + (col * (maxChildWidth + gap)) + (maxChildWidth / 2);
      }
      
      const childY = gridStartY + (row * (maxChildHeight + rowGap));
      
      // Update child layout position
      const updatedLayout: NodeLayout = {
        ...childLayout,
        x: childX,
        y: childY,
        childrenBounds: {
          minX: childX + childLayout.childrenBounds.minX,
          maxX: childX + childLayout.childrenBounds.maxX,
          minY: childY,
          maxY: childY + childLayout.childrenBounds.maxY - childLayout.y
        }
      };
      
      this.layouts.set(childId, updatedLayout);
      
      // Update bounds
      minX = Math.min(minX, childX - maxChildWidth / 2);
      maxX = Math.max(maxX, childX + maxChildWidth / 2);
      minY = Math.min(minY, childY);
      maxY = Math.max(maxY, childY + maxChildHeight);
      
      // Include children's bounds
      if (childLayout.childrenBounds) {
        minX = Math.min(minX, childX + childLayout.childrenBounds.minX);
        maxX = Math.max(maxX, childX + childLayout.childrenBounds.maxX);
        maxY = Math.max(maxY, childY + childLayout.childrenBounds.maxY - childLayout.y);
      }
    });
    
    return { minX, maxX, minY, maxY };
  }

  private arrangeChildrenLinearly(
    childIds: string[], 
    childLayouts: NodeLayout[], 
    startY: number
  ): { minX: number; maxX: number; minY: number; maxY: number } {
    const gap = this.config.gapX;
    const childY = startY + this.config.gapY;
    
    // Calculate total width needed
    let totalWidth = 0;
    childLayouts.forEach((layout, index) => {
      totalWidth += layout.width;
      if (index < childLayouts.length - 1) {
        totalWidth += gap;
      }
    });
    
    // Start position to center children
    let currentX = -totalWidth / 2;
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    // Position each child
    childIds.forEach((childId, index) => {
      const childLayout = childLayouts[index];
      const childX = currentX + (childLayout.width / 2);
      
      // Update child layout position
      const updatedLayout: NodeLayout = {
        ...childLayout,
        x: childX,
        y: childY,
        childrenBounds: {
          minX: childX + childLayout.childrenBounds.minX,
          maxX: childX + childLayout.childrenBounds.maxX,
          minY: childY,
          maxY: childY + childLayout.childrenBounds.maxY - childLayout.y
        }
      };
      
      this.layouts.set(childId, updatedLayout);
      
      // Update bounds
      minX = Math.min(minX, currentX);
      maxX = Math.max(maxX, currentX + childLayout.width);
      minY = Math.min(minY, childY);
      maxY = Math.max(maxY, childY + childLayout.height);
      
      // Include children's bounds
      if (childLayout.childrenBounds) {
        minX = Math.min(minX, childX + childLayout.childrenBounds.minX);
        maxX = Math.max(maxX, childX + childLayout.childrenBounds.maxX);
        maxY = Math.max(maxY, childY + childLayout.childrenBounds.maxY - childLayout.y);
      }
      
      currentX += childLayout.width + gap;
    });
    
    return { minX, maxX, minY, maxY };
  }

  private normalizePositions(positions: Map<string, NodePosition>): Map<string, NodePosition> {
    let minX = Infinity;
    let minY = Infinity;
    
    positions.forEach(pos => {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
    });
    
    // Also consider node dimensions for proper bounds
    positions.forEach((pos, nodeId) => {
      const dimensions = this.dimensions.get(nodeId) || { width: this.config.minCardWidth, height: 140 };
      minX = Math.min(minX, pos.x - dimensions.width / 2);
    });
    
    const normalized = new Map<string, NodePosition>();
    positions.forEach((pos, nodeId) => {
      normalized.set(nodeId, {
        x: pos.x - minX + 100, // Add padding
        y: pos.y - minY + 50
      });
    });
    
    return normalized;
  }

  private calculateLevelHeights(): Map<number, number> {
    const levelHeights = new Map<number, number>();
    
    this.levels.forEach((level, nodeId) => {
      const dimensions = this.dimensions.get(nodeId) || { width: this.config.minCardWidth, height: 140 };
      const currentHeight = levelHeights.get(level) || 0;
      levelHeights.set(level, Math.max(currentHeight, dimensions.height));
    });
    
    return levelHeights;
  }

  private calculateTotalSize(positions: Map<string, NodePosition>): { width: number; height: number } {
    let maxX = 0;
    let maxY = 0;
    
    positions.forEach((pos, nodeId) => {
      const dimensions = this.dimensions.get(nodeId) || { width: this.config.minCardWidth, height: 140 };
      maxX = Math.max(maxX, pos.x + dimensions.width / 2);
      maxY = Math.max(maxY, pos.y + dimensions.height);
    });
    
    return {
      width: maxX + 100,  // Add padding
      height: maxY + 50
    };
  }
}

// Tree building function - NO CHANGES NEEDED
export function buildTreeFromData(
  companyData: any,
  expandedNodes: Set<string>,
  lazyLoadedData: Map<string, any[]>,
  branchesData: Map<string, any[]>,
  visibleLevels?: Set<string>
): Map<string, TreeNode> {
  const nodes = new Map<string, TreeNode>();

  if (!companyData) {
    return nodes;
  }

  // Add company node
  nodes.set('company', {
    id: 'company',
    type: 'company',
    children: [],
    data: companyData
  });

  // Only add school children if company is expanded
  if (expandedNodes.has('company') && companyData?.schools) {
    const schoolChildren: string[] = [];
    
    companyData.schools.forEach((school: any) => {
      const schoolId = `school-${school.id}`;
      schoolChildren.push(schoolId);
      
      nodes.set(schoolId, {
        id: schoolId,
        type: 'school',
        parentId: 'company',
        children: [],
        data: school
      });
    });

    const companyNode = nodes.get('company');
    if (companyNode) {
      companyNode.children = schoolChildren;
    }
  }

  // Process each school for branches and grade levels
  if (companyData?.schools) {
    companyData.schools.forEach((school: any) => {
      const schoolId = `school-${school.id}`;
      const schoolNode = nodes.get(schoolId);
      
      if (schoolNode && expandedNodes.has(schoolId)) {
        const children: string[] = [];
        
        // Add branches if branches tab is visible
        if (visibleLevels?.has('branches')) {
          const branches = school.branches || [];
          
          branches.forEach((branch: any) => {
            const branchId = `branch-${branch.id}`;
            children.push(branchId);
            
            nodes.set(branchId, {
              id: branchId,
              type: 'branch',
              parentId: schoolId,
              children: [],
              data: branch
            });
            
            // Add branch-level grades if years tab is visible and branch is expanded
            if (visibleLevels?.has('years') && expandedNodes.has(branchId)) {
              const branchGrades = branch.grade_levels || [];
              
              if (branchGrades.length > 0) {
                const branchNode = nodes.get(branchId);
                const branchGradeChildren: string[] = [];
                
                branchGrades.forEach((grade: any) => {
                  const gradeId = `grade-${grade.id}`;
                  branchGradeChildren.push(gradeId);
                  
                  nodes.set(gradeId, {
                    id: gradeId,
                    type: 'year',
                    parentId: branchId,
                    children: [],
                    data: grade
                  });
                  
                  // Add sections if sections tab is visible and grade is expanded
                  if (visibleLevels?.has('sections') && expandedNodes.has(gradeId)) {
                    const sections = grade.class_sections || [];
                    
                    if (sections.length > 0) {
                      const gradeNode = nodes.get(gradeId);
                      const sectionChildren: string[] = [];
                      
                      sections.forEach((section: any) => {
                        const sectionId = `section-${section.id}`;
                        sectionChildren.push(sectionId);
                        
                        nodes.set(sectionId, {
                          id: sectionId,
                          type: 'section',
                          parentId: gradeId,
                          children: [],
                          data: section
                        });
                      });
                      
                      if (gradeNode) {
                        gradeNode.children = sectionChildren;
                      }
                    }
                  }
                });
                
                if (branchNode) {
                  branchNode.children = branchGradeChildren;
                }
              }
            }
          });
        }
        
        // Add school-level grades if years tab is visible
        if (visibleLevels?.has('years')) {
          const schoolGrades = school.grade_levels || [];
          
          schoolGrades.forEach((grade: any) => {
            const gradeId = `grade-${grade.id}`;
            
            // Only add if not already added under a branch
            if (!nodes.has(gradeId)) {
              children.push(gradeId);
              
              nodes.set(gradeId, {
                id: gradeId,
                type: 'year',
                parentId: schoolId,
                children: [],
                data: grade
              });
              
              // Add sections if sections tab is visible and grade is expanded
              if (visibleLevels?.has('sections') && expandedNodes.has(gradeId)) {
                const gradeNode = nodes.get(gradeId);
                const sections = grade.class_sections || [];
                
                if (sections.length > 0 && gradeNode) {
                  const sectionChildren: string[] = [];
                  
                  sections.forEach((section: any) => {
                    const sectionId = `section-${section.id}`;
                    sectionChildren.push(sectionId);
                    
                    nodes.set(sectionId, {
                      id: sectionId,
                      type: 'section',
                      parentId: gradeId,
                      children: [],
                      data: section
                    });
                  });
                  
                  gradeNode.children = sectionChildren;
                }
              }
            }
          });
        }
        
        schoolNode.children = children;
      }
    });
  }

  return nodes;
}

// SVG path generation - NO CHANGES NEEDED
export function generateConnectionPath(
  parentPos: NodePosition,
  childPos: NodePosition,
  parentHeight: number,
  childHeight: number,
  gapY: number
): string {
  const parentBottom = parentPos.y + parentHeight;
  const childTop = childPos.y;
  const midY = parentBottom + (gapY / 2);

  const parentCenterX = parentPos.x;
  const childCenterX = childPos.x;
  
  if (Math.abs(parentCenterX - childCenterX) < 1) {
    // Straight vertical line
    return `M ${parentCenterX} ${parentBottom} L ${childCenterX} ${childTop}`;
  }
  
  // L-shaped path
  return `M ${parentCenterX} ${parentBottom} 
          L ${parentCenterX} ${midY}
          L ${childCenterX} ${midY}
          L ${childCenterX} ${childTop}`;
}