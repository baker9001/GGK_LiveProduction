// src/app/system-admin/learning/practice-management/validation-dashboard/page.tsx

/**
 * Validation Dashboard
 *
 * Provides system administrators with comprehensive insights into
 * answer format and requirement validation across all questions.
 *
 * Features:
 * - Overview statistics (compatible, suboptimal, incompatible)
 * - Questions requiring attention
 * - Format/requirement usage analytics
 * - Subject-specific validation patterns
 * - Export capabilities
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Download,
  RefreshCw,
  Filter,
  TrendingUp,
  FileText,
  BookOpen,
  Target
} from 'lucide-react';
import { Button } from '../../../../../components/shared/Button';
import { toast } from '../../../../../components/shared/Toast';
import { supabase } from '../../../../../lib/supabase';
import { cn } from '../../../../../lib/utils';
import {
  checkCompatibility,
  type CompatibilityLevel
} from '../../../../../lib/validation/formatRequirementCompatibility';
import {
  ANSWER_FORMAT_OPTIONS,
  ANSWER_REQUIREMENT_OPTIONS
} from '../../../../../lib/constants/answerOptions';

interface ValidationStats {
  total: number;
  compatible: number;
  suboptimal: number;
  incompatible: number;
  notSet: number;
}

interface QuestionValidationIssue {
  id: string;
  question_number: string;
  question_text: string;
  answer_format: string | null;
  answer_requirement: string | null;
  compatibility_level: CompatibilityLevel;
  issue_description: string;
  subject_name?: string;
  topic_name?: string;
  paper_name?: string;
}

interface FormatRequirementUsage {
  format: string;
  requirement: string;
  count: number;
  compatibility: CompatibilityLevel;
}

export default function ValidationDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ValidationStats>({
    total: 0,
    compatible: 0,
    suboptimal: 0,
    incompatible: 0,
    notSet: 0
  });
  const [issues, setIssues] = useState<QuestionValidationIssue[]>([]);
  const [usageData, setUsageData] = useState<FormatRequirementUsage[]>([]);
  const [filterLevel, setFilterLevel] = useState<'all' | 'incompatible' | 'suboptimal'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);

  // Load data on mount
  useEffect(() => {
    loadValidationData();
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('edu_subjects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadValidationData = async () => {
    setLoading(true);
    try {
      // Fetch all questions with format/requirement data
      const { data: questions, error } = await supabase
        .from('questions')
        .select(`
          id,
          question_number,
          question_text,
          answer_format,
          answer_requirement,
          question_type,
          subtopics (
            id,
            name,
            topics (
              id,
              name,
              edu_subjects (
                id,
                name
              )
            )
          ),
          paper_questions!inner (
            papers_setup (
              id,
              paper_name
            )
          )
        `)
        .eq('status', 'active')
        .not('question_type', 'in', '("mcq","tf")'); // Exclude MCQ/TF as they don't need format/requirement

      if (error) throw error;

      // Analyze validation status
      const validationIssues: QuestionValidationIssue[] = [];
      const usage: Map<string, FormatRequirementUsage> = new Map();
      let compatibleCount = 0;
      let suboptimalCount = 0;
      let incompatibleCount = 0;
      let notSetCount = 0;

      (questions || []).forEach((q: any) => {
        const format = q.answer_format;
        const requirement = q.answer_requirement;

        // Track not set
        if (!format || !requirement) {
          notSetCount++;
          validationIssues.push({
            id: q.id,
            question_number: q.question_number,
            question_text: q.question_text?.substring(0, 100) || '',
            answer_format: format,
            answer_requirement: requirement,
            compatibility_level: 'incompatible',
            issue_description: 'Answer format or requirement not set',
            subject_name: q.subtopics?.[0]?.topics?.edu_subjects?.name,
            topic_name: q.subtopics?.[0]?.topics?.name,
            paper_name: q.paper_questions?.[0]?.papers_setup?.paper_name
          });
          return;
        }

        // Check compatibility
        const compatibility = checkCompatibility(format, requirement);

        switch (compatibility.level) {
          case 'compatible':
            compatibleCount++;
            break;
          case 'suboptimal':
            suboptimalCount++;
            validationIssues.push({
              id: q.id,
              question_number: q.question_number,
              question_text: q.question_text?.substring(0, 100) || '',
              answer_format: format,
              answer_requirement: requirement,
              compatibility_level: compatibility.level,
              issue_description: compatibility.reason || 'Suboptimal combination',
              subject_name: q.subtopics?.[0]?.topics?.edu_subjects?.name,
              topic_name: q.subtopics?.[0]?.topics?.name,
              paper_name: q.paper_questions?.[0]?.papers_setup?.paper_name
            });
            break;
          case 'incompatible':
            incompatibleCount++;
            validationIssues.push({
              id: q.id,
              question_number: q.question_number,
              question_text: q.question_text?.substring(0, 100) || '',
              answer_format: format,
              answer_requirement: requirement,
              compatibility_level: compatibility.level,
              issue_description: compatibility.reason || 'Incompatible combination',
              subject_name: q.subtopics?.[0]?.topics?.edu_subjects?.name,
              topic_name: q.subtopics?.[0]?.topics?.name,
              paper_name: q.paper_questions?.[0]?.papers_setup?.paper_name
            });
            break;
        }

        // Track usage
        const key = `${format}:${requirement}`;
        const existing = usage.get(key);
        if (existing) {
          existing.count++;
        } else {
          usage.set(key, {
            format,
            requirement,
            count: 1,
            compatibility: compatibility.level
          });
        }
      });

      setStats({
        total: questions?.length || 0,
        compatible: compatibleCount,
        suboptimal: suboptimalCount,
        incompatible: incompatibleCount,
        notSet: notSetCount
      });

      setIssues(validationIssues);
      setUsageData(Array.from(usage.values()).sort((a, b) => b.count - a.count));

    } catch (error) {
      console.error('Error loading validation data:', error);
      toast.error('Failed to load validation data');
    } finally {
      setLoading(false);
    }
  };

  // Filter issues based on selected filters
  const filteredIssues = useMemo(() => {
    let filtered = issues;

    if (filterLevel !== 'all') {
      filtered = filtered.filter(issue => issue.compatibility_level === filterLevel);
    }

    if (selectedSubject !== 'all') {
      filtered = filtered.filter(issue => issue.subject_name === selectedSubject);
    }

    return filtered;
  }, [issues, filterLevel, selectedSubject]);

  // Calculate quality score
  const qualityScore = stats.total > 0
    ? Math.round(((stats.compatible + stats.suboptimal * 0.5) / stats.total) * 100)
    : 0;

  const exportReport = () => {
    // Create CSV content
    const headers = ['Question ID', 'Question Number', 'Format', 'Requirement', 'Status', 'Issue', 'Subject', 'Topic', 'Paper'];
    const rows = filteredIssues.map(issue => [
      issue.id,
      issue.question_number,
      issue.answer_format || 'Not set',
      issue.answer_requirement || 'Not set',
      issue.compatibility_level,
      issue.issue_description,
      issue.subject_name || '',
      issue.topic_name || '',
      issue.paper_name || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Report exported successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading validation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Validation Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor answer format and requirement validation across all questions
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={loadValidationData}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              onClick={exportReport}
              leftIcon={<Download className="w-4 h-4" />}
              disabled={filteredIssues.length === 0}
            >
              Export Report
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Questions</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-400">Compatible</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-500 mt-2">{stats.compatible}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {stats.total > 0 ? Math.round((stats.compatible / stats.total) * 100) : 0}%
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Suboptimal</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-500 mt-2">{stats.suboptimal}</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  {stats.total > 0 ? Math.round((stats.suboptimal / stats.total) * 100) : 0}%
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Incompatible</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-500 mt-2">{stats.incompatible}</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {stats.total > 0 ? Math.round((stats.incompatible / stats.total) * 100) : 0}%
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Quality Score</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-500 mt-2">{qualityScore}%</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {qualityScore >= 90 ? 'Excellent' : qualityScore >= 75 ? 'Good' : qualityScore >= 60 ? 'Fair' : 'Needs Improvement'}
                </p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex-1 flex gap-4">
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Issues</option>
                <option value="incompatible">Incompatible Only</option>
                <option value="suboptimal">Suboptimal Only</option>
              </select>

              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.name}>{subject.name}</option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredIssues.length} of {issues.length} issues
            </div>
          </div>
        </div>

        {/* Issues Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Questions Requiring Attention
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Question
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Format
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Requirement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Issue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Subject
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredIssues.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <p className="text-lg font-medium">No issues found</p>
                      <p className="text-sm">All questions have compatible format/requirement combinations</p>
                    </td>
                  </tr>
                ) : (
                  filteredIssues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {issue.question_number}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {issue.question_text}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {issue.answer_format || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {issue.answer_requirement || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                            issue.compatibility_level === 'incompatible' &&
                              'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
                            issue.compatibility_level === 'suboptimal' &&
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          )}
                        >
                          {issue.compatibility_level === 'incompatible' ? (
                            <AlertCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          )}
                          {issue.compatibility_level}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {issue.issue_description}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {issue.subject_name || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Usage Patterns */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Most Common Format/Requirement Combinations
            </h2>
          </div>
          <div className="space-y-2">
            {usageData.slice(0, 10).map((usage, index) => (
              <div
                key={`${usage.format}-${usage.requirement}`}
                className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-shrink-0 w-8 text-center font-semibold text-gray-600 dark:text-gray-400">
                  #{index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {ANSWER_FORMAT_OPTIONS.find(opt => opt.value === usage.format)?.label || usage.format}
                    {' + '}
                    {ANSWER_REQUIREMENT_OPTIONS.find(opt => opt.value === usage.requirement)?.label || usage.requirement}
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  {usage.count} questions
                </div>
                <div>
                  {usage.compatibility === 'compatible' && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  {usage.compatibility === 'suboptimal' && (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                  {usage.compatibility === 'incompatible' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
