// src/lib/layout/treeLayout.ts
// Enhanced tree layout algorithm with grid support for large sibling groups
// Prevents horizontal sprawl by arranging many siblings in a grid formation

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
  maxSiblingsPerRow?: number;    // Maximum siblings before wrapping to grid (default: 8)
  compactGapX?: number;          // Tighter horizontal gap for large groups (default: 20)
  gridRowGapY?: number;          // Vertical gap between grid rows (default: 20)
}

export interface LayoutResult {
  positions: Map<string, NodePosition>;
  totalSize: { width: number; height: number };
  levelHeights: Map<number, number>;
}

interface GridLayout {
  rows: number;
  cols: number;
  width: number;
  height: number;
}

export class TreeLayoutEngine {
  private nodes: Map<string, TreeNode>;
  private dimensions: Map<string, NodeDimensions>;
  private config: LayoutConfig;
  private subtreeWidths: Map<string, number> = new Map();
  private subtreeHeights: Map<string, number> = new Map();
  private nodeLevels: Map<string, number> = new Map();
  private gridLayouts: Map<string, GridLayout> = new Map();

  constructor(
    nodes: Map<string, TreeNode>,
    dimensions: Map<string, NodeDimensions>,
    config: LayoutConfig
  ) {
    this.nodes = nodes;
    this.dimensions = dimensions;
    // Set defaults for new config options
    this.config = {
      ...config,
      maxSiblingsPerRow: config.maxSiblingsPerRow || 8,
      compactGapX: config.compactGapX || 20,
      gridRowGapY: config.gridRowGapY || 20
    };
  }

  public layout(rootId: string): LayoutResult {
    // Clear previous calculations
    this.subtreeWidths.clear();
    this.subtreeHeights.clear();
    this.nodeLevels.clear();
    this.gridLayouts.clear();

    // Step 1: Calculate node levels
    this.calculateLevels(rootId, 0);

    // Step 2: Calculate subtree dimensions (width and height for grid layouts)
    this.calculateSubtreeDimensions(rootId);

    // Step 3: Position nodes
    const positions = new Map<string, NodePosition>();
    const levelHeights = this.calculateLevelHeights();
    
    this.positionNodes(rootId, 0, 0, positions, levelHeights);

    // Step 4: Normalize positions
    const normalizedPositions = this.normalizePositions(positions);

    // Step 5: Calculate total canvas size
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

  private calculateOptimalGrid(childCount: number): { rows: number; cols: number } {
    if (childCount <= this.config.maxSiblingsPerRow!) {
      return { rows: 1, cols: childCount };
    }

    // Calculate optimal grid dimensions
    // Aim for a roughly square layout, slightly wider than tall
    const cols = this.config.maxSiblingsPerRow!;
    const rows = Math.ceil(childCount / cols);
    
    return { rows, cols };
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

    // Calculate children dimensions
    const childDimensions = node.children.map(childId => 
      this.calculateSubtreeDimensions(childId)
    );

    // Determine if we need grid layout
    const useGrid = node.children.length > this.config.maxSiblingsPerRow!;
    
    if (useGrid) {
      // Grid layout for many children
      const grid = this.calculateOptimalGrid(node.children.length);
      const gap = this.config.compactGapX!;
      
      // Calculate grid dimensions
      const maxChildWidth = Math.max(...childDimensions.map(d => d.width));
      const maxChildHeight = Math.max(...childDimensions.map(d => d.height));
      
      const gridWidth = (maxChildWidth * grid.cols) + (gap * (grid.cols - 1));
      const gridHeight = (maxChildHeight * grid.rows) + (this.config.gridRowGapY! * (grid.rows - 1));
      
      // Store grid layout info
      this.gridLayouts.set(nodeId, {
        rows: grid.rows,
        cols: grid.cols,
        width: gridWidth,
        height: gridHeight
      });
      
      const subtreeWidth = Math.max(cardWidth, gridWidth);
      const subtreeHeight = cardHeight + this.config.gapY + gridHeight;
      
      this.subtreeWidths.set(nodeId, subtreeWidth);
      this.subtreeHeights.set(nodeId, subtreeHeight);
      
      return { width: subtreeWidth, height: subtreeHeight };
    } else {
      // Linear layout for few children
      const totalChildrenWidth = childDimensions.reduce((sum, d) => sum + d.width, 0) +
                                (childDimensions.length - 1) * this.config.gapX;
      
      const maxChildHeight = Math.max(...childDimensions.map(d => d.height));
      
      const subtreeWidth = Math.max(cardWidth, totalChildrenWidth);
      const subtreeHeight = cardHeight + this.config.gapY + maxChildHeight;
      
      this.subtreeWidths.set(nodeId, subtreeWidth);
      this.subtreeHeights.set(nodeId, subtreeHeight);
      
      return { width: subtreeWidth, height: subtreeHeight };
    }
  }

  private calculateLevelHeights(): Map<number, number> {
    const levelHeights = new Map<number, number>();
    const levelExtraHeights = new Map<number, number>();

    // First pass: get base heights
    this.nodeLevels.forEach((level, nodeId) => {
      const dimensions = this.dimensions.get(nodeId);
      const height = dimensions?.height || 140;
      
      const currentMaxHeight = levelHeights.get(level) || 0;
      levelHeights.set(level, Math.max(currentMaxHeight, height));
      
      // Check if this node uses grid layout
      const gridLayout = this.gridLayouts.get(nodeId);
      if (gridLayout && gridLayout.rows > 1) {
        // Need extra space for grid rows at the next level
        const nextLevel = level + 1;
        const extraHeight = gridLayout.height - (dimensions?.height || 140);
        const currentExtra = levelExtraHeights.get(nextLevel) || 0;
        levelExtraHeights.set(nextLevel, Math.max(currentExtra, extraHeight));
      }
    });

    // Second pass: add extra heights for grid layouts
    levelExtraHeights.forEach((extraHeight, level) => {
      const currentHeight = levelHeights.get(level) || 140;
      levelHeights.set(level, currentHeight + extraHeight);
    });

    return levelHeights;
  }

  private positionNodes(
    nodeId: string,
    parentX: number,
    parentY: number,
    positions: Map<string, NodePosition>,
    levelHeights: Map<number, number>
  ): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const level = this.nodeLevels.get(nodeId) || 0;
    const cardDimensions = this.dimensions.get(nodeId);
    const cardWidth = cardDimensions?.width || this.config.minCardWidth;

    // Calculate Y position
    let yPosition = 0;
    for (let i = 0; i < level; i++) {
      const levelHeight = levelHeights.get(i) || 140;
      yPosition += levelHeight + this.config.gapY;
    }

    // Handle leaf nodes
    if (node.children.length === 0) {
      positions.set(nodeId, { x: parentX, y: yPosition });
      return;
    }

    // Check for grid layout
    const gridLayout = this.gridLayouts.get(nodeId);
    const useGrid = gridLayout && node.children.length > this.config.maxSiblingsPerRow!;

    if (useGrid) {
      // Position children in grid
      this.positionChildrenInGrid(
        node,
        nodeId,
        parentX,
        yPosition,
        positions,
        levelHeights,
        gridLayout
      );
    } else {
      // Position children linearly
      this.positionChildrenLinearly(
        node,
        nodeId,
        parentX,
        yPosition,
        positions,
        levelHeights
      );
    }

    // Position parent (centering logic remains the same)
    if (this.config.centerParents && node.children.length > 0) {
      const childPositions = node.children.map(childId => positions.get(childId)).filter(p => p);
      if (childPositions.length > 0) {
        const minX = Math.min(...childPositions.map(p => p!.x));
        const maxX = Math.max(...childPositions.map(p => p!.x));
        const centerX = (minX + maxX) / 2;
        positions.set(nodeId, { x: centerX, y: yPosition });
      } else {
        positions.set(nodeId, { x: parentX, y: yPosition });
      }
    } else {
      positions.set(nodeId, { x: parentX, y: yPosition });
    }
  }

  private positionChildrenInGrid(
    node: TreeNode,
    nodeId: string,
    parentX: number,
    parentY: number,
    positions: Map<string, NodePosition>,
    levelHeights: Map<number, number>,
    gridLayout: GridLayout
  ): void {
    const level = this.nodeLevels.get(nodeId) || 0;
    const gap = this.config.compactGapX!;
    const rowGap = this.config.gridRowGapY!;
    
    // Calculate child level Y
    let childBaseY = parentY;
    for (let i = 0; i <= level; i++) {
      const levelHeight = levelHeights.get(i) || 140;
      if (i <= level) {
        childBaseY += levelHeight + this.config.gapY;
      }
    }

    // Get max dimensions for uniform grid cells
    const childDimensions = node.children.map(childId => 
      this.dimensions.get(childId) || { width: this.config.minCardWidth, height: 140 }
    );
    const maxChildWidth = Math.max(...childDimensions.map(d => d.width));
    const maxChildHeight = Math.max(...childDimensions.map(d => d.height));

    // Calculate starting position to center grid under parent
    const gridStartX = parentX - gridLayout.width / 2;

    // Position each child in the grid
    node.children.forEach((childId, index) => {
      const row = Math.floor(index / gridLayout.cols);
      const col = index % gridLayout.cols;
      
      const childX = gridStartX + (col * (maxChildWidth + gap)) + maxChildWidth / 2;
      const childY = childBaseY + (row * (maxChildHeight + rowGap));
      
      // Recursively position this child's subtree
      this.positionNodes(childId, childX, childY, positions, levelHeights);
    });
  }

  private positionChildrenLinearly(
    node: TreeNode,
    nodeId: string,
    parentX: number,
    parentY: number,
    positions: Map<string, NodePosition>,
    levelHeights: Map<number, number>
  ): void {
    const subtreeWidth = this.subtreeWidths.get(nodeId) || this.config.minCardWidth;
    const childWidths = node.children.map(childId => 
      this.subtreeWidths.get(childId) || this.config.minCardWidth
    );

    // Calculate total width and starting position
    const totalChildrenWidth = childWidths.reduce((sum, width) => sum + width, 0) +
                              (childWidths.length - 1) * this.config.gapX;
    
    const childrenStartX = parentX - totalChildrenWidth / 2;

    // Position each child
    let currentX = childrenStartX;
    node.children.forEach((childId, index) => {
      const childWidth = childWidths[index];
      const childCenterX = currentX + childWidth / 2;
      
      this.positionNodes(childId, childCenterX, parentY, positions, levelHeights);
      currentX += childWidth + this.config.gapX;
    });
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
        x: pos.x - minX,
        y: pos.y - minY
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
      width: maxX + this.config.gapX,
      height: maxY + this.config.gapY
    };
  }
}

// Tree building function remains the same - no changes needed
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
          const branches = school.branches || lazyLoadedData.get(schoolId) || branchesData.get(school.id) || [];
          
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
              const branchGrades = lazyLoadedData.get(`grades-branch-${branch.id}`) || branch.grade_levels || [];
              
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
                    const sections = lazyLoadedData.get(`sections-grade-${grade.id}`) || grade.class_sections || [];
                    
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
          const schoolGrades = lazyLoadedData.get(`grades-school-${school.id}`) || school.grade_levels || [];
          
          schoolGrades.forEach((grade: any) => {
            const gradeId = `grade-${grade.id}`;
            
            // Check if this grade is already added under a branch
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
              const sections = lazyLoadedData.get(`sections-grade-${grade.id}`) || grade.class_sections || [];
              
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

// SVG path generation remains the same
export function generateConnectionPath(
  parentPos: NodePosition,
  childPos: NodePosition,
  parentHeight: number,
  childHeight: number,
  gapY: number
): string {
  const parentBottom = parentPos.y + parentHeight;
  const childTop = childPos.y;
  const midY = parentBottom + gapY / 2;

  const parentCenterX = parentPos.x;
  const childCenterX = childPos.x;
  
  return `M ${parentCenterX} ${parentBottom} L ${parentCenterX} ${midY} L ${childCenterX} ${midY} L ${childCenterX} ${childTop}`;
}