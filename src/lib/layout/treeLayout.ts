// src/lib/layout/treeLayout.ts
// Enhanced tree layout algorithm with WORKING grid support for large sibling groups
// This version properly implements grid layout to prevent horizontal sprawl

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

export class TreeLayoutEngine {
  protected nodes: Map<string, TreeNode>;
  protected dimensions: Map<string, NodeDimensions>;
  protected config: LayoutConfig;
  private subtreeWidths: Map<string, number> = new Map();
  private subtreeHeights: Map<string, number> = new Map();
  private nodeLevels: Map<string, number> = new Map();

  constructor(
    nodes: Map<string, TreeNode>,
    dimensions: Map<string, NodeDimensions>,
    config: LayoutConfig
  ) {
    this.nodes = nodes;
    this.dimensions = dimensions;
    // Set defaults for grid layout
    this.config = {
      ...config,
      maxSiblingsPerRow: config.maxSiblingsPerRow || 6,
      compactGapX: config.compactGapX || 20,
      gridRowGapY: config.gridRowGapY || 30
    };
  }

  public layout(rootId: string): LayoutResult {
    // Clear previous calculations
    this.subtreeWidths.clear();
    this.subtreeHeights.clear();
    this.nodeLevels.clear();

    // Step 1: Calculate node levels
    this.calculateLevels(rootId, 0);

    // Step 2: Calculate subtree dimensions with grid support
    this.calculateSubtreeDimensions(rootId);

    // Step 3: Position nodes with grid support
    const positions = new Map<string, NodePosition>();
    this.positionNodesWithGrid(rootId, 0, 0, positions);

    // Step 4: Normalize positions
    const normalizedPositions = this.normalizePositions(positions);

    // Step 5: Calculate level heights
    const levelHeights = this.calculateLevelHeights();

    // Step 6: Calculate total canvas size
    const totalSize = this.calculateTotalSize(normalizedPositions);

    return {
      positions: normalizedPositions,
      totalSize,
      levelHeights
    };
  }

  private calculateLevels(nodeId: string, level: number): void {
    this.nodeLevels.set(nodeId, level);
    const node = this.nodes.get(nodeId);
    if (node) {
      node.children.forEach(childId => {
        this.calculateLevels(childId, level + 1);
      });
    }
  }

  private calculateSubtreeDimensions(nodeId: string): { width: number; height: number } {
    const node = this.nodes.get(nodeId);
    if (!node) return { width: this.config.minCardWidth, height: 140 };

    const cardDimensions = this.dimensions.get(nodeId);
    const cardWidth = cardDimensions?.width || this.config.minCardWidth;
    const cardHeight = cardDimensions?.height || 140;

    // Leaf node
    if (node.children.length === 0) {
      this.subtreeWidths.set(nodeId, cardWidth);
      this.subtreeHeights.set(nodeId, cardHeight);
      return { width: cardWidth, height: cardHeight };
    }

    // Calculate children dimensions recursively
    const childDimensions = node.children.map(childId => 
      this.calculateSubtreeDimensions(childId)
    );

    // Check if we need grid layout
    const useGrid = node.children.length > this.config.maxSiblingsPerRow!;
    
    if (useGrid) {
      // GRID LAYOUT CALCULATION
      const cols = this.config.maxSiblingsPerRow!;
      const rows = Math.ceil(node.children.length / cols);
      const gap = this.config.compactGapX!;
      const rowGap = this.config.gridRowGapY!;
      
      // Find max child dimensions
      const maxChildWidth = Math.max(...childDimensions.map(d => d.width));
      const maxChildHeight = Math.max(...childDimensions.map(d => d.height));
      
      // Calculate total grid size
      const gridWidth = (maxChildWidth * cols) + (gap * (cols - 1));
      const gridHeight = (maxChildHeight * rows) + (rowGap * (rows - 1));
      
      const subtreeWidth = Math.max(cardWidth, gridWidth);
      const subtreeHeight = cardHeight; // Just the card height, children are positioned below
      
      this.subtreeWidths.set(nodeId, subtreeWidth);
      this.subtreeHeights.set(nodeId, subtreeHeight);
      
      return { width: subtreeWidth, height: subtreeHeight };
    } else {
      // LINEAR LAYOUT CALCULATION
      const totalChildrenWidth = childDimensions.reduce((sum, d) => sum + d.width, 0) +
                                (childDimensions.length - 1) * this.config.gapX;
      
      const subtreeWidth = Math.max(cardWidth, totalChildrenWidth);
      const subtreeHeight = cardHeight;
      
      this.subtreeWidths.set(nodeId, subtreeWidth);
      this.subtreeHeights.set(nodeId, subtreeHeight);
      
      return { width: subtreeWidth, height: subtreeHeight };
    }
  }

  private positionNodesWithGrid(
    nodeId: string,
    x: number,
    y: number,
    positions: Map<string, NodePosition>
  ): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // Position current node
    positions.set(nodeId, { x, y });

    // If no children, we're done
    if (node.children.length === 0) return;

    // Calculate Y position for children (below current node)
    const cardHeight = this.dimensions.get(nodeId)?.height || 140;
    const childY = y + cardHeight + this.config.gapY;

    // Determine layout type
    const useGrid = node.children.length > this.config.maxSiblingsPerRow!;

    if (useGrid) {
      // GRID LAYOUT FOR MANY CHILDREN
      const cols = this.config.maxSiblingsPerRow!;
      const rows = Math.ceil(node.children.length / cols);
      const gap = this.config.compactGapX!;
      const rowGap = this.config.gridRowGapY!;
      
      // Get max child dimensions for uniform grid
      const childDimensions = node.children.map(childId => 
        this.dimensions.get(childId) || { width: this.config.minCardWidth, height: 140 }
      );
      const maxChildWidth = Math.max(...childDimensions.map(d => d.width));
      const maxChildHeight = Math.max(...childDimensions.map(d => d.height));
      
      // Calculate total grid width
      const totalGridWidth = (maxChildWidth * cols) + (gap * (cols - 1));
      
      // Starting X position to center grid under parent
      const gridStartX = x - (totalGridWidth / 2) + (maxChildWidth / 2);
      
      // Position each child in grid
      node.children.forEach((childId, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        
        // For the last row with fewer items, center them
        const itemsInLastRow = node.children.length % cols || cols;
        const isLastRow = row === rows - 1;
        const itemsInRow = isLastRow ? itemsInLastRow : cols;
        
        let childX: number;
        if (isLastRow && itemsInRow < cols) {
          // Center the last row
          const lastRowWidth = (maxChildWidth * itemsInRow) + (gap * (itemsInRow - 1));
          const lastRowStartX = x - (lastRowWidth / 2) + (maxChildWidth / 2);
          childX = lastRowStartX + (col * (maxChildWidth + gap));
        } else {
          // Normal grid positioning
          childX = gridStartX + (col * (maxChildWidth + gap));
        }
        
        const childYPos = childY + (row * (maxChildHeight + rowGap));
        
        // Recursively position this child's subtree
        this.positionNodesWithGrid(childId, childX, childYPos, positions);
      });
      
    } else {
      // LINEAR LAYOUT FOR FEW CHILDREN
      const childWidths = node.children.map(childId => 
        this.subtreeWidths.get(childId) || this.config.minCardWidth
      );
      
      // Calculate total width needed
      const totalWidth = childWidths.reduce((sum, w) => sum + w, 0) + 
                        (childWidths.length - 1) * this.config.gapX;
      
      // Starting X position to center children under parent
      let currentX = x - (totalWidth / 2);
      
      // Position each child
      node.children.forEach((childId, index) => {
        const childWidth = childWidths[index];
        const childX = currentX + (childWidth / 2);
        
        // Recursively position this child's subtree
        this.positionNodesWithGrid(childId, childX, childY, positions);
        
        currentX += childWidth + this.config.gapX;
      });
    }
  }

  private calculateLevelHeights(): Map<number, number> {
    const levelHeights = new Map<number, number>();

    this.nodeLevels.forEach((level, nodeId) => {
      const dimensions = this.dimensions.get(nodeId);
      const height = dimensions?.height || 140;
      
      const currentMaxHeight = levelHeights.get(level) || 0;
      levelHeights.set(level, Math.max(currentMaxHeight, height));
    });

    return levelHeights;
  }

  private normalizePositions(positions: Map<string, NodePosition>): Map<string, NodePosition> {
    let minX = Infinity;
    let minY = Infinity;

    positions.forEach(pos => {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
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

  private calculateTotalSize(positions: Map<string, NodePosition>): { width: number; height: number } {
    let maxX = 0;
    let maxY = 0;

    positions.forEach((pos, nodeId) => {
      const dimensions = this.dimensions.get(nodeId);
      const width = dimensions?.width || this.config.minCardWidth;
      const height = dimensions?.height || 140;

      maxX = Math.max(maxX, pos.x + width / 2);
      maxY = Math.max(maxY, pos.y + height);
    });

    return {
      width: maxX + 100, // Add padding
      height: maxY + 50
    };
  }
}

// Tree building function remains the same
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
            }
            
            // Add sections if sections tab is visible and grade is expanded
            if (visibleLevels?.has('sections') && expandedNodes.has(gradeId)) {
              const gradeNode = nodes.get(gradeId);
              const sections = grade.class_sections || [];
              
              if (sections.length > 0 && gradeNode && gradeNode.children.length === 0) {
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
          });
        }
        
        schoolNode.children = children;
      }
    });
  }

  return nodes;
}

// SVG path generation for connections
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
  
  // Create orthogonal path with rounded corners
  const cornerRadius = 5;
  
  if (Math.abs(parentCenterX - childCenterX) < 1) {
    // Straight vertical line
    return `M ${parentCenterX} ${parentBottom} L ${childCenterX} ${childTop}`;
  }
  
  // L-shaped path with optional rounded corners
  return `M ${parentCenterX} ${parentBottom} 
          L ${parentCenterX} ${midY}
          L ${childCenterX} ${midY}
          L ${childCenterX} ${childTop}`;
}