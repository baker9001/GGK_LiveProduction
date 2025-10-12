import React, { useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FileText,
  CheckCircle,
  AlertCircle,
  Hash,
  Target,
  Award,
  Image as ImageIcon,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { cn } from '../../../../../../../lib/utils';

interface QuestionNode {
  id: string;
  number: string;
  label: string;
  type: 'question' | 'part' | 'subpart';
  marks: number;
  hasAnswer: boolean;
  hasAttachments: boolean;
  difficulty?: string;
  children?: QuestionNode[];
}

interface QuestionStructureVisualizationProps {
  questions: any[];
  onNodeClick?: (questionId: string, partId?: string, subpartId?: string) => void;
  expandedNodes?: Set<string>;
  onToggleNode?: (nodeId: string) => void;
}

export function QuestionStructureVisualization({
  questions,
  onNodeClick,
  expandedNodes = new Set(),
  onToggleNode
}: QuestionStructureVisualizationProps) {

  const questionNodes: QuestionNode[] = useMemo(() => {
    return questions.map(q => {
      const node: QuestionNode = {
        id: q.id,
        number: q.question_number || '?',
        label: q.question_description?.substring(0, 80) || 'No description',
        type: 'question',
        marks: q.marks || 0,
        hasAnswer: !!(q.correct_answer || (q.correct_answers && q.correct_answers.length > 0)),
        hasAttachments: !!(q.attachments && q.attachments.length > 0),
        difficulty: q.difficulty,
        children: []
      };

      if (q.parts && q.parts.length > 0) {
        node.children = q.parts.map((part: any, partIndex: number) => {
          const partNode: QuestionNode = {
            id: `${q.id}-${part.id}`,
            number: part.part_label || String.fromCharCode(65 + partIndex),
            label: part.question_description?.substring(0, 60) || 'No description',
            type: 'part',
            marks: part.marks || 0,
            hasAnswer: !!(part.correct_answer || (part.correct_answers && part.correct_answers.length > 0)),
            hasAttachments: !!(part.attachments && part.attachments.length > 0),
            difficulty: part.difficulty,
            children: []
          };

          if (part.subparts && part.subparts.length > 0) {
            partNode.children = part.subparts.map((subpart: any, subIndex: number) => {
              const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'];
              return {
                id: `${q.id}-${part.id}-${subpart.id}`,
                number: subpart.subpart_label || `(${romanNumerals[subIndex] || subIndex + 1})`,
                label: subpart.question_description?.substring(0, 50) || 'No description',
                type: 'subpart' as const,
                marks: subpart.marks || 0,
                hasAnswer: !!(subpart.correct_answer || (subpart.correct_answers && subpart.correct_answers.length > 0)),
                hasAttachments: !!(subpart.attachments && subpart.attachments.length > 0)
              };
            });
          }

          return partNode;
        });
      }

      return node;
    });
  }, [questions]);

  const statistics = useMemo(() => {
    let totalMarks = 0;
    let totalParts = 0;
    let totalSubparts = 0;
    let questionsWithAnswers = 0;
    let questionsWithAttachments = 0;

    questionNodes.forEach(q => {
      totalMarks += q.marks;
      if (q.hasAnswer) questionsWithAnswers++;
      if (q.hasAttachments) questionsWithAttachments++;

      if (q.children && q.children.length > 0) {
        totalParts += q.children.length;
        q.children.forEach(part => {
          totalMarks += part.marks;
          if (part.children && part.children.length > 0) {
            totalSubparts += part.children.length;
            part.children.forEach(subpart => {
              totalMarks += subpart.marks;
            });
          }
        });
      }
    });

    return {
      totalQuestions: questionNodes.length,
      totalParts,
      totalSubparts,
      totalMarks,
      questionsWithAnswers,
      questionsWithAttachments,
      completionRate: questionNodes.length > 0 ? (questionsWithAnswers / questionNodes.length) * 100 : 0
    };
  }, [questionNodes]);

  const NodeComponent: React.FC<{ node: QuestionNode; level: number; parentIds?: string[] }> = ({
    node,
    level,
    parentIds = []
  }) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    const handleClick = () => {
      if (hasChildren && onToggleNode) {
        onToggleNode(node.id);
      }

      if (onNodeClick) {
        const ids = node.id.split('-');
        onNodeClick(ids[0], ids[1], ids[2]);
      }
    };

    return (
      <div className={cn("relative", level > 0 && "ml-6")}>
        {/* Connection Line */}
        {level > 0 && (
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" style={{ left: '-12px' }} />
        )}

        {/* Node */}
        <div
          className={cn(
            "group relative flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
            "hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600",
            node.type === 'question' && "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
            node.type === 'part' && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
            node.type === 'subpart' && "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
          )}
          onClick={handleClick}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren && (
            <div className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </div>
          )}

          {/* Node Icon */}
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0",
            node.type === 'question' && "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
            node.type === 'part' && "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400",
            node.type === 'subpart' && "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
          )}>
            {node.type === 'question' && <Hash className="h-4 w-4" />}
            {node.type === 'part' && <Target className="h-4 w-4" />}
            {node.type === 'subpart' && <Award className="h-4 w-4" />}
          </div>

          {/* Node Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "font-semibold",
                node.type === 'question' && "text-gray-900 dark:text-white",
                node.type === 'part' && "text-blue-900 dark:text-blue-100",
                node.type === 'subpart' && "text-purple-900 dark:text-purple-100"
              )}>
                {node.number}
              </span>
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                node.hasAnswer
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
              )}>
                {node.marks}m
              </span>
              {node.difficulty && (
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium",
                  node.difficulty === 'easy' && "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
                  node.difficulty === 'medium' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
                  node.difficulty === 'hard' && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                )}>
                  {node.difficulty}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {node.label}
            </p>
          </div>

          {/* Status Icons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {node.hasAnswer ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" title="Has answer" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" title="Missing answer" />
            )}
            {node.hasAttachments && (
              <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" title="Has attachments" />
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-2 space-y-2">
            {node.children!.map(child => (
              <NodeComponent
                key={child.id}
                node={child}
                level={level + 1}
                parentIds={[...parentIds, node.id]}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {statistics.totalQuestions}
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            Questions
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
            <BarChart3 className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">
            {statistics.totalParts}
          </div>
          <div className="text-sm text-green-700 dark:text-green-300">
            Parts
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {statistics.totalSubparts}
          </div>
          <div className="text-sm text-purple-700 dark:text-purple-300">
            Subparts
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Hash className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
            {statistics.totalMarks}
          </div>
          <div className="text-sm text-orange-700 dark:text-orange-300">
            Total Marks
          </div>
        </div>
      </div>

      {/* Completion Progress */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Data Completion
          </h4>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {Math.round(statistics.completionRate)}%
          </span>
        </div>

        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
            style={{ width: `${statistics.completionRate}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">With Answers:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {statistics.questionsWithAnswers}/{statistics.totalQuestions}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">With Attachments:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {statistics.questionsWithAttachments}/{statistics.totalQuestions}
            </span>
          </div>
        </div>
      </div>

      {/* Question Tree */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Question Hierarchy
        </h4>

        <div className="space-y-2">
          {questionNodes.map(node => (
            <NodeComponent key={node.id} node={node} level={0} />
          ))}
        </div>

        {questionNodes.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No questions to display
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
