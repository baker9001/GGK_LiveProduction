// src/app/system-admin/learning/practice-management/papers-setup/tabs/components/ExtractionCompliancePanel.tsx

import React, { useState, useEffect } from 'react';
import {
  Shield, CheckCircle, XCircle, AlertCircle, Info,
  ChevronRight, ChevronDown, Filter, Search, Download,
  GitBranch, Tag, BookOpen, Image, Hash, Layers,
  Zap, Target, AlertTriangle, TrendingUp, Eye
} from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { cn } from '../../../../../../../lib/utils';

interface ExtractionRule {
  id: string;
  name: string;
  description: string;
  category: 'structure' | 'content' | 'educational' | 'subject';
  required: boolean;
  check: (question: any) => boolean;
  fix?: (question: any) => any;
}

interface ComplianceResult {
  questionNumber: string;
  totalRules: number;
  passedRules: number;
  failedRules: ComplianceFailure[];
  warnings: ComplianceWarning[];
  score: number;
}

interface ComplianceFailure {
  ruleId: string;
  ruleName: string;
  message: string;
  severity: 'error' | 'warning';
  fixable: boolean;
}

interface ComplianceWarning {
  ruleId: string;
  message: string;
}

interface ExtractionCompliancePanelProps {
  questions: any[];
  extractionRules: any;
  complianceResults?: Record<string, ComplianceResult>;
  onSelectQuestion: (questionNumber: string) => void;
}

export function ExtractionCompliancePanel({
  questions,
  extractionRules,
  complianceResults: initialResults,
  onSelectQuestion
}: ExtractionCompliancePanelProps) {
  const [results, setResults] = useState<Record<string, ComplianceResult>>(initialResults || {});
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyFailed, setShowOnlyFailed] = useState(false);
  const [selectedRules, setSelectedRules] = useState<Set<string>>(new Set());

  // Define extraction rules based on the extraction guidelines
  const EXTRACTION_RULES: ExtractionRule[] = [
    // Structure Rules
    {
      id: 'forward_slash',
      name: 'Forward Slash Handling',
      description: 'Each segment between slashes must be a separate answer',
      category: 'structure',
      required: true,
      check: (question) => {
        if (!question.correct_answers) return true;
        
        // Check if answers containing "/" are properly split
        const hasUnsplitSlashes = question.correct_answers.some((ca: any) =>
          ca.answer.includes('/') && ca.linked_alternatives.length === 0
        );
        
        return !hasUnsplitSlashes;
      }
    },
    {
      id: 'alternative_linking',
      name: 'Alternative Linking',
      description: 'Linked alternatives must have valid references',
      category: 'structure',
      required: true,
      check: (question) => {
        if (!question.correct_answers) return true;
        
        const ids = new Set(question.correct_answers.map((ca: any) => ca.alternative_id));
        return question.correct_answers.every((ca: any) =>
          ca.linked_alternatives.every((id: number) => ids.has(id))
        );
      }
    },
    {
      id: 'context_required',
      name: 'Context Information',
      description: 'All answers must have context metadata',
      category: 'structure',
      required: true,
      check: (question) => {
        if (!question.correct_answers) return true;
        return question.correct_answers.every((ca: any) =>
          ca.context && ca.context.type && ca.context.value
        );
      }
    },
    {
      id: 'mark_distribution',
      name: 'Mark Distribution',
      description: 'Answer marks must sum to question total',
      category: 'structure',
      required: true,
      check: (question) => {
        if (!question.correct_answers || question.correct_answers.length === 0) return true;
        const totalMarks = question.correct_answers.reduce((sum: number, ca: any) => 
          sum + (ca.marks || 0), 0
        );
        return totalMarks === question.marks;
      }
    },
    
    // Content Rules
    {
      id: 'answer_format',
      name: 'Answer Format Specified',
      description: 'Answer format should match question type',
      category: 'content',
      required: false,
      check: (question) => {
        if (question.type === 'mcq' || question.type === 'tf') return true;
        return !!question.answer_format;
      }
    },
    {
      id: 'figure_detection',
      name: 'Figure Detection',
      description: 'Questions mentioning diagrams must have attachments',
      category: 'content',
      required: true,
      check: (question) => {
        const needsFigure = 
          question.question_description?.toLowerCase().includes('diagram') ||
          question.question_description?.toLowerCase().includes('figure') ||
          question.question_description?.toLowerCase().includes('graph') ||
          question.question_description?.toLowerCase().includes('image');
        
        if (needsFigure) {
          return question.attachments && question.attachments.length > 0;
        }
        return true;
      }
    },
    {
      id: 'mcq_options',
      name: 'MCQ Options Valid',
      description: 'MCQ questions must have options with correct answer marked',
      category: 'content',
      required: true,
      check: (question) => {
        if (question.type !== 'mcq') return true;
        return question.options && 
               question.options.length >= 2 &&
               question.options.some((opt: any) => opt.is_correct);
      }
    },
    
    // Educational Rules
    {
      id: 'hint_provided',
      name: 'Educational Hint',
      description: 'Questions should have hints for learning support',
      category: 'educational',
      required: extractionRules?.educationalContent?.hintsRequired || false,
      check: (question) => {
        return !!question.hint && question.hint.trim().length > 0;
      }
    },
    {
      id: 'explanation_provided',
      name: 'Educational Explanation',
      description: 'Questions should have detailed explanations',
      category: 'educational',
      required: extractionRules?.educationalContent?.explanationsRequired || false,
      check: (question) => {
        return !!question.explanation && question.explanation.trim().length > 0;
      }
    },
    
    // Subject-Specific Rules
    {
      id: 'physics_units',
      name: 'Physics Units Required',
      description: 'Physics calculations must specify units',
      category: 'subject',
      required: extractionRules?.subjectSpecific?.physics || false,
      check: (question) => {
        if (!extractionRules?.subjectSpecific?.physics) return true;
        if (question.type !== 'calculation') return true;
        
        // Check if answer format or correct answers include units
        return question.answer_format?.includes('unit') ||
               question.correct_answers?.some((ca: any) => 
                 /\d+\s*[a-zA-Z]+/.test(ca.answer)
               );
      }
    },
    {
      id: 'chemistry_states',
      name: 'Chemistry State Symbols',
      description: 'Chemical equations should include state symbols',
      category: 'subject',
      required: extractionRules?.subjectSpecific?.chemistry || false,
      check: (question) => {
        if (!extractionRules?.subjectSpecific?.chemistry) return true;
        if (!question.question_description?.toLowerCase().includes('equation')) return true;
        
        return question.correct_answers?.some((ca: any) =>
          /\(s\)|\(l\)|\(g\)|\(aq\)/.test(ca.answer)
        );
      }
    }
  ];

  // Run compliance checks
  useEffect(() => {
    const newResults: Record<string, ComplianceResult> = {};
    
    questions.forEach(question => {
      const failures: ComplianceFailure[] = [];
      const warnings: ComplianceWarning[] = [];
      let passedCount = 0;
      
      EXTRACTION_RULES.forEach(rule => {
        // Skip if rule category is filtered out
        if (selectedRules.size > 0 && !selectedRules.has(rule.id)) return;
        
        try {
          const passed = rule.check(question);
          
          if (passed) {
            passedCount++;
          } else {
            failures.push({
              ruleId: rule.id,
              ruleName: rule.name,
              message: rule.description,
              severity: rule.required ? 'error' : 'warning',
              fixable: !!rule.fix
            });
          }
        } catch (error) {
          warnings.push({
            ruleId: rule.id,
            message: `Error checking rule: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      });
      
      const totalRules = selectedRules.size > 0 ? selectedRules.size : EXTRACTION_RULES.length;
      const score = totalRules > 0 ? Math.round((passedCount / totalRules) * 100) : 0;
      
      newResults[question.question_number] = {
        questionNumber: question.question_number,
        totalRules,
        passedRules: passedCount,
        failedRules: failures,
        warnings,
        score
      };
    });
    
    setResults(newResults);
  }, [questions, selectedRules]);

  // Filter questions
  const filteredQuestions = questions.filter(question => {
    const result = results[question.question_number];
    if (!result) return false;
    
    // Apply search filter
    if (searchQuery && !question.question_number.includes(searchQuery) &&
        !question.question_description?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Apply failed filter
    if (showOnlyFailed && result.score === 100) {
      return false;
    }
    
    // Apply category filter
    if (filterCategory !== 'all') {
      const hasFailureInCategory = result.failedRules.some(failure => {
        const rule = EXTRACTION_RULES.find(r => r.id === failure.ruleId);
        return rule?.category === filterCategory;
      });
      if (!hasFailureInCategory && filterCategory !== 'passed') return false;
      if (filterCategory === 'passed' && result.score !== 100) return false;
    }
    
    return true;
  });

  // Calculate overall statistics
  const overallStats = {
    totalQuestions: questions.length,
    fullyCompliant: Object.values(results).filter(r => r.score === 100).length,
    partiallyCompliant: Object.values(results).filter(r => r.score > 0 && r.score < 100).length,
    nonCompliant: Object.values(results).filter(r => r.score === 0).length,
    averageScore: questions.length > 0 
      ? Math.round(Object.values(results).reduce((sum, r) => sum + r.score, 0) / questions.length)
      : 0
  };

  // Get rule categories
  const ruleCategories = Array.from(new Set(EXTRACTION_RULES.map(r => r.category)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-500" />
              Extraction Rules Compliance
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Validate questions against IGCSE extraction guidelines
            </p>
          </div>
          
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              // Export compliance report
              const report = {
                summary: overallStats,
                details: results,
                timestamp: new Date().toISOString()
              };
              const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'compliance-report.json';
              a.click();
            }}
          >
            <Download className="w-4 h-4 mr-1" />
            Export Report
          </Button>
        </div>
        
        {/* Overall Statistics */}
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{overallStats.totalQuestions}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total Questions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{overallStats.fullyCompliant}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Fully Compliant</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{overallStats.partiallyCompliant}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Partial Compliance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{overallStats.nonCompliant}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Non-Compliant</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{overallStats.averageScore}%</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Average Score</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-3 py-2 w-full border rounded-lg"
              />
            </div>
          </div>
          
          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Categories</option>
            <option value="passed">Fully Compliant</option>
            {ruleCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)} Rules
              </option>
            ))}
          </select>
          
          {/* Failed Only Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyFailed}
              onChange={(e) => setShowOnlyFailed(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Show only failed</span>
          </label>
          
          {/* Rule Selector */}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              // Toggle rule selection modal
              const allSelected = selectedRules.size === EXTRACTION_RULES.length;
              if (allSelected) {
                setSelectedRules(new Set());
              } else {
                setSelectedRules(new Set(EXTRACTION_RULES.map(r => r.id)));
              }
            }}
          >
            <Filter className="w-4 h-4 mr-1" />
            {selectedRules.size > 0 ? `${selectedRules.size} Rules` : 'All Rules'}
          </Button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {filteredQuestions.map(question => {
          const result = results[question.question_number];
          const isExpanded = expandedQuestions.has(question.question_number);
          
          return (
            <div
              key={question.question_number}
              className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden"
            >
              {/* Question Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => {
                  setExpandedQuestions(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(question.question_number)) {
                      newSet.delete(question.question_number);
                    } else {
                      newSet.add(question.question_number);
                    }
                    return newSet;
                  });
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Question {question.question_number}</span>
                      {result.score === 100 ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : result.score > 0 ? (
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {result.passedRules} / {result.totalRules} rules passed
                    </div>
                    
                    <div className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium",
                      result.score === 100 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : result.score >= 75
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    )}>
                      {result.score}%
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectQuestion(question.question_number);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t p-4 space-y-3">
                  {/* Failed Rules */}
                  {result.failedRules.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-red-600 dark:text-red-400">
                        Failed Rules ({result.failedRules.length})
                      </h4>
                      <div className="space-y-2">
                        {result.failedRules.map((failure, idx) => {
                          const rule = EXTRACTION_RULES.find(r => r.id === failure.ruleId);
                          
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "p-3 rounded-lg",
                                failure.severity === 'error'
                                  ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                                  : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                              )}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    {failure.severity === 'error' ? (
                                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                    ) : (
                                      <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                    )}
                                    <span className="font-medium text-sm">{failure.ruleName}</span>
                                    <span className={cn(
                                      "px-2 py-0.5 rounded text-xs",
                                      rule?.category === 'structure' && "bg-blue-100 text-blue-700",
                                      rule?.category === 'content' && "bg-green-100 text-green-700",
                                      rule?.category === 'educational' && "bg-purple-100 text-purple-700",
                                      rule?.category === 'subject' && "bg-orange-100 text-orange-700"
                                    )}>
                                      {rule?.category}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-6">
                                    {failure.message}
                                  </p>
                                </div>
                                
                                {failure.fixable && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="ml-2"
                                    onClick={() => {
                                      // Auto-fix functionality
                                      console.log('Auto-fix rule:', failure.ruleId);
                                    }}
                                  >
                                    <Zap className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-yellow-600 dark:text-yellow-400">
                        Warnings ({result.warnings.length})
                      </h4>
                      <div className="space-y-1">
                        {result.warnings.map((warning, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <Info className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-600 dark:text-gray-400">{warning.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Passed Rules Summary */}
                  {result.passedRules > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-green-600 dark:text-green-400">
                        Passed Rules ({result.passedRules})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {EXTRACTION_RULES.filter(rule => {
                          const failed = result.failedRules.some(f => f.ruleId === rule.id);
                          return !failed && (selectedRules.size === 0 || selectedRules.has(rule.id));
                        }).map(rule => (
                          <div
                            key={rule.id}
                            className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            {rule.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {filteredQuestions.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">No questions match the current filters</p>
        </div>
      )}
    </div>
  );
}