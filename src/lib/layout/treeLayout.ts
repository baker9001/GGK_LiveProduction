// src/lib/layout/treeLayout.ts
// Tidy tree layout algorithm for organizational charts with variable card sizes
// UNIFIED VERSION: Single function that properly handles all hierarchies

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
  gapX: number;        // Minimum horizontal spacing between siblings
  gapY: number;        // Vertical spacing between levels
  centerParents: boolean; // Whether to center parents over children
  minCardWidth: number;   // Minimum card width
  maxCardWidth: number;   // Maximum card width
}

export interface LayoutResult {
  positions: Map<string, NodePosition>;
  totalSize: { width: number; height: number };
  levelHeights: Map<number, number>; // Height of each level
}

export class TreeLayoutEngine {
  private nodes: Map<string, TreeNode>;
  private dimensions: Map<string, NodeDimensions>;
  private config: LayoutConfig;
  private subtreeWidths: Map<string, number> = new Map();
  private nodeLevels: Map<string, number> = new Map();

  constructor(
    nodes: Map<string, TreeNode>,
    dimensions: Map<string, NodeDimensions>,
    config: LayoutConfig
  ) {
    this.nodes = nodes;
    this.dimensions = dimensions;
    this.config = config;
  }

  public layout(rootId: string): LayoutResult {
    // Clear previous calculations
    this.subtreeWidths.clear();
    this.nodeLevels.clear();

    // Step 1: Calculate node levels (depth from root)
    this.calculateLevels(rootId, 0);

    // Step 2: Calculate subtree widths bottom-up
    this.calculateSubtreeWidths(rootId);

    // Step 3: Position nodes top-down
    const positions = new Map<string, NodePosition>();
    const levelHeights = this.calculateLevelHeights();

    this.positionNodes(rootId, 0, 0, positions, levelHeights);

    // Step 4: Normalize positions to start from (0, 0)
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

  private calculateSubtreeWidths(nodeId: string): number {
    const node = this.nodes.get(nodeId);
    if (!node) return this.config.minCardWidth;

    const cardDimensions = this.dimensions.get(nodeId);
    const cardWidth = cardDimensions?.width || this.config.minCardWidth;

    // If leaf node, subtree width is just the card width
    if (node.children.length === 0) {
      this.subtreeWidths.set(nodeId, cardWidth);
      return cardWidth;
    }

    // Calculate children subtree widths
    const childWidths = node.children.map(childId => 
      this.calculateSubtreeWidths(childId)
    );

    // Total width needed for all children with gaps
    const totalChildrenWidth = childWidths.reduce((sum, width) => sum + width, 0) +
                              (childWidths.length - 1) * this.config.gapX;

    // Subtree width is the maximum of card width and children span
    const subtreeWidth = Math.max(cardWidth, totalChildrenWidth);
    this.subtreeWidths.set(nodeId, subtreeWidth);

    return subtreeWidth;
  }

  private calculateLevelHeights(): Map<number, number> {
    const levelHeights = new Map<number, number>();

    // Calculate the maximum height for each level
    this.nodeLevels.forEach((level, nodeId) => {
      const dimensions = this.dimensions.get(nodeId);
      const height = dimensions?.height || 140; // Default height

      const currentMaxHeight = levelHeights.get(level) || 0;
      levelHeights.set(level, Math.max(currentMaxHeight, height));
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

    // Calculate Y position based on level heights
    let yPosition = 0;
    for (let i = 0; i < level; i++) {
      const levelHeight = levelHeights.get(i) || 140;
      yPosition += levelHeight + this.config.gapY;
    }

    if (node.children.length === 0) {
      // Leaf node: position at parentX
      positions.set(nodeId, { x: parentX, y: yPosition });
      return;
    }

    // Calculate positions for children first
    const subtreeWidth = this.subtreeWidths.get(nodeId) || cardWidth;
    const childWidths = node.children.map(childId => 
      this.subtreeWidths.get(childId) || this.config.minCardWidth
    );

    // Calculate starting X for children to center them under parent
    const totalChildrenWidth = childWidths.reduce((sum, width) => sum + width, 0) +
                              (childWidths.length - 1) * this.config.gapX;

    const childrenStartX = parentX - totalChildrenWidth / 2;

    // Position children
    let currentX = childrenStartX;
    node.children.forEach((childId, index) => {
      const childWidth = childWidths[index];
      const childCenterX = currentX + childWidth / 2;

      this.positionNodes(childId, childCenterX, yPosition, positions, levelHeights);
      currentX += childWidth + this.config.gapX;
    });

    // Position parent
    if (this.config.centerParents && node.children.length > 0) {
      // Center parent over children
      const firstChildPos = positions.get(node.children[0]);
      const lastChildPos = positions.get(node.children[node.children.length - 1]);

      if (firstChildPos && lastChildPos) {
        const childrenCenterX = (firstChildPos.x + lastChildPos.x) / 2;
        positions.set(nodeId, { x: childrenCenterX, y: yPosition });
      } else {
        positions.set(nodeId, { x: parentX, y: yPosition });
      }
    } else {
      positions.set(nodeId, { x: parentX, y: yPosition });
    }
  }

  private normalizePositions(positions: Map<string, NodePosition>): Map<string, NodePosition> {
    // Find minimum X and Y to normalize to (0, 0)
    let minX = Infinity;
    let minY = Infinity;

    positions.forEach(pos => {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
    });

    // Normalize all positions
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
      width: maxX + this.config.gapX, // Add some padding
      height: maxY + this.config.gapY
    };
  }
}

// UNIFIED tree building function that properly handles all hierarchy scenarios
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
        // These are grades assigned directly to schools (not through branches)
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

// Generate SVG path for orthogonal connections
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

  // Center the connection points on the cards
  const parentCenterX = parentPos.x;
  const childCenterX = childPos.x;

  // Create smooth orthogonal path
  return `M ${parentCenterX} ${parentBottom} L ${parentCenterX} ${midY} L ${childCenterX} ${midY} L ${childCenterX} ${childTop}`;
}