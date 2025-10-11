// src/app/system-admin/learning/practice-management/questions-setup/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, FileText, BarChart3, X, CheckCircle, Clock, Archive, AlertTriangle } from 'lucide-react';
import { Button } from '../../../../../components/shared/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../../components/shared/Tabs';
import { PaperCard } from './components/PaperCard';
import { ExamSimulation } from './components/ExamSimulation';
import { QuestionAnalytics } from './components/QuestionAnalytics';
import { QuickActionToolbar } from './components/QuickActionToolbar';
import { FilterSection } from './components/FilterSection';
import { supabase } from '../../../../../lib/supabase';
import { toast } from '../../../../../components/shared/Toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Type definitions (keeping your existing types)
export interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface QuestionOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  order: number;
}

export interface Subtopic {
  id: string;
  name: string;
}

export interface SubQuestion {
  id: string;
  part_label?: string;
  question_description: string;
  marks: number;
  difficulty?: string;
  type: 'mcq' | 'tf' | 'descriptive';
  status: string;
  topic_id?: string;
  topic_name?: string;
  unit_name?: string;
  subtopics?: Subtopic[];
  options?: QuestionOption[];
  attachments: Attachment[];
  hint?: string;
  explanation?: string;
}

export interface Question {
  id: string;
  question_number: string;
  question_description: string;
  marks: number;
  type: 'mcq' | 'tf' | 'descriptive';
  difficulty: string;
  category: string;
  status: string;
  topic_id?: string;
  topic_name?: string;
  subtopic_id?: string;
  subtopics?: Subtopic[];
  options?: QuestionOption[];
  parts: SubQuestion[];
  attachments: Attachment[];
  hint?: string;
  explanation?: string;
}

export interface GroupedPaper {
  id: string;
  code: string;
  subject: string;
  provider: string;
  program: string;
  region: string;
  status: string;
  duration?: string;
  total_marks?: number;
  questions: Question[];
}

interface SimulationPaper {
  id: string;
  code: string;
  subject: string;
  duration?: string;
  total_marks: number;
  questions: Array<{
    id: string;
    question_number: string;
    question_description: string;
    marks: number;
    type: 'mcq' | 'tf' | 'descriptive';
    difficulty: string;
    topic_name?: string;
    subtopic_names?: string[];
    options?: QuestionOption[];
    parts: SubQuestion[];
    hint?: string;
    explanation?: string;
    attachments?: Attachment[];
  }>;
}

interface FilterOptions {
  status: string;
  provider: string;
  subject: string;
  difficulty: string;
  questionType: string;
  marksRange: [number, number];
  hasAttachments: boolean | null;
  validationStatus: string;
  dateRange: [Date | null, Date | null];
}

export default function QuestionsSetupPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('analytics');
  const [filters, setFilters] = useState({
    provider_ids: [] as string[],
    subject_ids: [] as string[],
    unit_ids: [] as string[],
    difficulty: [] as string[],
    validation_status: [] as string[]
  });
  const [simulationPaper, setSimulationPaper] = useState<SimulationPaper | null>(null);
  const [isQAMode, setIsQAMode] = useState(true);
  const queryClient = useQueryClient();

  // Fetch providers and subjects for filters
  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_subjects')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch units for filters
  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_units')
        .select('id, name, subject_id')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch questions with proper grouping
  const { data: groupedPapers = [], isLoading, refetch } = useQuery({
    queryKey: ['questions', filters, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('questions_master_admin')
        .select(`
          id,
          paper_id,
          question_number,
          question_description,
          marks,
          type,
          difficulty,
          category,
          status,
          topic_id,
          subtopic_id,
          explanation,
          hint,
          created_at,
          updated_at,
          papers_setup!inner(
            id,
            paper_code,
            subject_id,
            provider_id,
            status,
            duration,
            data_structure_id
          ),
          question_subtopics(
            subtopic_id,
            edu_subtopics(
              id,
              name,
              topic_id
            )
          ),
          question_options(
            id,
            option_text,
            is_correct,
            order
          ),
          sub_questions(
            id,
            question_id,
            type,
            topic_id,
            question_description,
            marks,
            hint,
            sort_order,
            created_at,
            updated_at,
            order_index,
            order,
            parent_id,
            level,
            explanation,
            status,
            question_subtopics(
              subtopic_id,
              edu_subtopics(
                id,
                name,
                topic_id
              )
            ),
            question_options(
              id,
              option_text,
              is_correct,
              order
            ),
            questions_attachments(
              id,
              file_url,
              file_name,
              file_type,
              file_size,
              created_at
            ),
            questions_hints(
              hint_text
            )
          ),
          questions_attachments(
            id,
            file_url,
            file_name,
            file_type,
            file_size,
            created_at
          ),
          questions_hints(
            hint_text
          )
        `)
        .order('question_number', { ascending: true });

      // Apply filters
      if (filters.difficulty.length > 0) {
        query = query.in('difficulty', filters.difficulty);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching questions:', error);
        toast.error('Failed to load questions');
        return [];
      }

      // Fetch paper details with data structure info
      const paperIds = [...new Set(data?.map(q => q.paper_id).filter(Boolean))];
      
      const { data: paperDetails } = await supabase
        .from('papers_setup')
        .select(`
          id,
          paper_code,
          data_structure_id,
          data_structures(
            id,
            edu_subjects(id, name),
            providers(id, name),
            programs(id, name),
            regions(id, name)
          )
        `)
        .in('id', paperIds);

      const paperDetailsMap = new Map(
        paperDetails?.map(p => [p.id, p]) || []
      );

      // Fetch topics and units for questions
      const topicIds = [...new Set([
        ...data?.map(q => q.topic_id).filter(Boolean) || [],
        ...data?.flatMap(q => q.sub_questions?.map(sq => sq.topic_id).filter(Boolean)) || []
      ])];
      
      const { data: topicDetails } = await supabase
        .from('edu_topics')
        .select('id, name, unit_id')
        .in('id', topicIds);

      const topicMap = new Map(
        topicDetails?.map(t => [t.id, { name: t.name, unit_id: t.unit_id }]) || []
      );

      // Fetch units for the topics
      const unitIds = [...new Set(topicDetails?.map(t => t.unit_id).filter(Boolean) || [])];
      
      const { data: unitDetails } = await supabase
        .from('edu_units')
        .select('id, name')
        .in('id', unitIds);

      const unitMap = new Map(
        unitDetails?.map(u => [u.id, u.name]) || []
      );

      // Group questions by paper
      const paperGroups: Record<string, GroupedPaper> = {};

      data?.forEach((question) => {
        const paper = question.papers_setup;
        const paperId = paper.id;
        const paperDetail = paperDetailsMap.get(paperId);

        if (!paperGroups[paperId]) {
          const dataStructure = paperDetail?.data_structures;
          paperGroups[paperId] = {
            id: paperId,
            code: paper.paper_code,
            subject: dataStructure?.edu_subjects?.name || 'Unknown',
            provider: dataStructure?.providers?.name || 'Unknown',
            program: dataStructure?.programs?.name || 'Unknown',
            region: dataStructure?.regions?.name || 'Unknown',
            status: paper.status,
            duration: paper.duration,
            total_marks: 0,
            questions: []
          };
        }

        // Calculate total marks
        const questionMarks = question.marks + (question.sub_questions?.reduce((sum: number, sq: any) => sum + sq.marks, 0) || 0);
        paperGroups[paperId].total_marks += questionMarks;

        // Get topic and unit information
        const topicInfo = topicMap.get(question.topic_id || '');
        const unitName = topicInfo?.unit_id ? unitMap.get(topicInfo.unit_id) : undefined;

        // Format the question
        const formattedQuestion: Question = {
          id: question.id,
          question_number: question.question_number,
          question_description: question.question_description,
          marks: question.marks,
          type: question.type,
          difficulty: question.difficulty,
          category: question.category,
          status: question.status === 'active' ? 'active' : 'qa_review',
          topic_id: question.topic_id,
          topic_name: topicInfo?.name,
          unit_name: unitName,
          subtopic_id: question.subtopic_id,
          subtopics: question.question_subtopics?.map((qs: any) => ({
            id: qs.edu_subtopics.id,
            name: qs.edu_subtopics.name
          })) || [],
          options: question.question_options || [],
          attachments: question.questions_attachments || [],
          hint: question.hint || question.questions_hints?.[0]?.hint_text,
          explanation: question.explanation,
          parts: question.sub_questions?.
            sort((a: any, b: any) => (a.sort_order || a.order_index || a.order || 0) - (b.sort_order || b.order_index || b.order || 0))
            .map((sq: any, index: number) => ({
              id: sq.id,
              part_label: `Part ${String.fromCharCode(97 + index)}`,
              question_description: sq.question_description,
              marks: sq.marks,
              difficulty: 'medium', // Default since sub_questions doesn't have difficulty column
              type: sq.type,
              status: sq.status === 'active' ? 'active' : 'qa_review',
              topic_id: sq.topic_id,
              topic_name: topicMap.get(sq.topic_id || '')?.name,
              unit_name: sq.topic_id ? unitMap.get(topicMap.get(sq.topic_id)?.unit_id || '') : undefined,
              subtopics: sq.question_subtopics?.map((qs: any) => ({
                id: qs.edu_subtopics.id,
                name: qs.edu_subtopics.name
              })) || [],
              options: sq.question_options || [],
              attachments: sq.questions_attachments || [],
              hint: sq.hint || sq.questions_hints?.[0]?.hint_text,
              explanation: sq.explanation
            })) || []
        };

        paperGroups[paperId].questions.push(formattedQuestion);
      });

      return Object.values(paperGroups);
    }
  });

  // Fetch topics and subtopics for the dropdowns
  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_topics')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: subtopics = [] } = useQuery({
    queryKey: ['subtopics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_subtopics')
        .select('id, name, topic_id')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Enhanced filtering logic
  const filteredPapers = groupedPapers.filter(paper => {
    // Search term filter
    const matchesSearch = !searchTerm || 
      paper.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paper.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paper.questions.some(q => 
        q.question_description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    // Provider filter
    const matchesProvider = filters.provider_ids.length === 0 || 
      filters.provider_ids.some(id => providers.find(p => p.id === id)?.name === paper.provider);
    
    // Subject filter
    const matchesSubject = filters.subject_ids.length === 0 || 
      filters.subject_ids.some(id => subjects.find(s => s.id === id)?.name === paper.subject);
    
    // Unit filter
    const matchesUnit = filters.unit_ids.length === 0 || 
      paper.questions.some(q => 
        q.unit_name && filters.unit_ids.some(id => units.find(u => u.id === id)?.name === q.unit_name)
      );
    
    // Validation status filter
    let matchesValidation = true;
    if (filters.validation_status.length > 0) {
      const hasIncomplete = paper.questions.some(q => {
        const isIncomplete = !q.question_description || !q.marks || 
                           !q.difficulty || !q.topic_id || !q.hint || !q.explanation;
        return isIncomplete;
      });
      
      const needsAttachment = paper.questions.some(q => {
        const mentionsFigure = q.question_description?.toLowerCase().includes('figure') || 
                             q.question_description?.toLowerCase().includes('diagram');
        const hasAttachment = q.attachments && q.attachments.length > 0;
        return mentionsFigure && !hasAttachment;
      });
      
      matchesValidation = filters.validation_status.some(status => {
        if (status === 'complete') return !hasIncomplete && !needsAttachment;
        if (status === 'incomplete') return hasIncomplete;
        if (status === 'needs-attachment') return needsAttachment;
        return false;
      });
    }
    
    return matchesSearch && matchesProvider && matchesSubject && matchesUnit && matchesValidation;
  });

  // Filter papers by status for tabs
  const activePapers = groupedPapers.filter(paper => paper.status === 'active');
  const underQAPapers = groupedPapers.filter(paper => 
    paper.status === 'draft' || paper.status === 'qa_review'
  );
  const archivedPapers = groupedPapers.filter(paper => paper.status === 'inactive');

  const handleDeleteQuestion = async (question: Question) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('questions_master_admin')
        .delete()
        .eq('id', question.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Question deleted successfully');
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  const handleDeleteSubQuestion = async (subQuestion: SubQuestion) => {
    if (!window.confirm('Are you sure you want to delete this sub-question?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sub_questions')
        .delete()
        .eq('id', subQuestion.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Sub-question deleted successfully');
    } catch (error) {
      console.error('Error deleting sub-question:', error);
      toast.error('Failed to delete sub-question');
    }
  };

  const handleStartTestMode = (paper: GroupedPaper) => {
    const testPaper: SimulationPaper = {
      id: paper.id,
      code: paper.code,
      subject: paper.subject,
      duration: paper.duration,
      total_marks: paper.total_marks || 0,
      questions: paper.questions.map(q => ({
        ...q,
        subtopic_names: q.subtopics?.map(s => s.name) || [],
        attachments: q.attachments || []
      }))
    };
    
    setSimulationPaper(testPaper);
  };

  const handleBulkExport = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalPapers: filteredPapers.length,
      papers: filteredPapers.map(paper => ({
        code: paper.code,
        subject: paper.subject,
        provider: paper.provider,
        program: paper.program,
        region: paper.region,
        status: paper.status,
        duration: paper.duration,
        total_marks: paper.total_marks,
        questions: paper.questions.map(q => ({
          number: q.question_number,
          description: q.question_description,
          marks: q.marks,
          type: q.type,
          difficulty: q.difficulty,
          topic: q.topic_name,
          subtopics: q.subtopics?.map(s => s.name),
          hint: q.hint,
          explanation: q.explanation,
          options: q.options,
          parts: q.parts
        }))
      }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${filteredPapers.length} papers successfully`);
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (simulationPaper) {
    return (
      <ExamSimulation
        paper={simulationPaper}
        onExit={() => setSimulationPaper(null)}
        isQAMode={isQAMode}
      />
    );
  }

  const renderPapersList = (papers: GroupedPaper[], emptyMessage: string) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#99C93B]" />
        </div>
      );
    }

    if (papers.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {emptyMessage}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md">
            {searchTerm || filters.status !== 'all' 
              ? 'Try adjusting your search criteria or filters'
              : 'No papers available in this category'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {papers.map((paper) => (
          <PaperCard
            key={paper.id}
            paper={paper}
            topics={topics}
            subtopics={subtopics}
            units={units}
            onDeleteQuestion={handleDeleteQuestion}
            onDeleteSubQuestion={handleDeleteSubQuestion}
            onStartTestMode={() => handleStartTestMode(paper)}
            onStartSimulation={() => handleStartTestMode(paper)}
            showQAActions={isQAMode}
            readOnly={!isQAMode}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2" data-testid="page-title">
            Questions Setup & QA
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Review and manage exam questions
            {isQAMode && <span className="ml-2 text-[#99C93B] dark:text-[#AAD775]">(QA Mode)</span>}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <FilterSection
        providers={providers}
        subjects={subjects}
        units={units}
        searchTerm={searchTerm}
        filters={filters}
        resultCount={filteredPapers.length}
        onSearchChange={setSearchTerm}
        onFilterChange={setFilters}
        onClearFilters={() => {
          setSearchTerm('');
          setFilters({
            provider_ids: [],
            subject_ids: [],
            unit_ids: [],
            difficulty: [],
            validation_status: []
          });
        }}
      />

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="qa" className="flex items-center text-orange-600 dark:text-orange-400">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Under QA ({underQAPapers.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4 mr-2" />
            Active Papers ({activePapers.length})
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center text-gray-600 dark:text-gray-400">
            <Archive className="h-4 w-4 mr-2" />
            Archived ({archivedPapers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <QuestionAnalytics papers={groupedPapers} />
        </TabsContent>

        <TabsContent value="qa" className="space-y-6">
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-orange-800 dark:text-orange-300">
                  Papers Under QA Review
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-400">
                  These papers are either newly imported (Draft) or currently under quality assurance review. 
                  Complete the review process to activate them.
                </p>
              </div>
            </div>
          </div>
          {renderPapersList(underQAPapers, "No papers under QA review")}
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                  Active Papers
                </h3>
                <p className="text-sm text-green-700 dark:text-green-400">
                  These papers are confirmed and ready for use in the system. All questions have been validated and approved.
                </p>
              </div>
            </div>
          </div>
          {renderPapersList(activePapers, "No active papers found")}
        </TabsContent>

        <TabsContent value="archived" className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center">
              <Archive className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-300">
                  Archived Papers
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-400">
                  These papers have been deactivated and are no longer in use. 
                  They can be reactivated if needed.
                </p>
              </div>
            </div>
          </div>
          {renderPapersList(archivedPapers, "No archived papers found")}
        </TabsContent>
      </Tabs>
      
      {/* Quick Action Toolbar */}
      <QuickActionToolbar
        onScrollToTop={handleScrollToTop}
        onRefresh={() => refetch()}
        onShowAnalytics={() => setActiveTab('analytics')}
        onBulkImport={() => toast.info('Bulk import feature coming soon')}
        onBulkExport={handleBulkExport}
      />
    </div>
  );
}