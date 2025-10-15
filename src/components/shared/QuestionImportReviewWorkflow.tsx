import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  PlayCircle,
  FileCheck,
  CheckCircle,
  AlertTriangle,
  Download,
  Eye,
  Flag,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { Button } from './Button';
import { QuestionReviewStatus, ReviewProgress, ReviewStatus } from './QuestionReviewStatus';
import { EnhancedQuestionDisplay, QuestionDisplayData } from './EnhancedQuestionDisplay';
import { TestSimulationMode } from './TestSimulationMode';
import { supabase } from '../../lib/supabase';
import { toast } from './Toast';
import { cn } from '../../lib/utils';

interface SimulationResults {
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  partiallyCorrect: number;
  incorrectAnswers: number;
  totalMarks: number;
  earnedMarks: number;
  percentage: number;
  timeSpent: number;
  questionResults: Array<{
    questionId: string;
    questionNumber: string;
    isCorrect: boolean;
    earnedMarks: number;
    totalMarks: number;
    userAnswer: any;
    correctAnswers: any[];
    feedback: string;
  }>;
}

interface QuestionImportReviewWorkflowProps {
  questions: QuestionDisplayData[];
  paperTitle: string;
  paperDuration?: string;
  totalMarks: number;
  importSessionId?: string;
  onAllQuestionsReviewed?: () => void;
  onImportReady?: (canImport: boolean) => void;
  requireSimulation?: boolean;
}

export const QuestionImportReviewWorkflow: React.FC<QuestionImportReviewWorkflowProps> = ({
  questions,
  paperTitle,
  paperDuration,
  totalMarks,
  importSessionId,
  onAllQuestionsReviewed,
  onImportReady,
  requireSimulation = false
}) => {
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, ReviewStatus>>({});
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [syncError, setSyncError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const isInitializedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoize questions array to prevent unnecessary re-renders
  const memoizedQuestions = useMemo(() => {
    return questions.map(q => ({
      ...q,
      correct_answers: q.correct_answers || [] // Ensure correct_answers is always an array
    }));
  }, [questions.length, importSessionId]); // Only recalculate when length or session changes

  // Initialize review session
  useEffect(() => {
    // Prevent duplicate initialization
    if (isInitializedRef.current && reviewSessionId) {
      return;
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    initializeReviewSession();

    return () => {
      // Cleanup: abort any pending operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [importSessionId]); // Only depend on importSessionId, not questions

  // Check if ready to import
  useEffect(() => {
    const allReviewed = Object.values(reviewStatuses).every(status => status.isReviewed);
    const simulationPassed = !requireSimulation || (simulationResults && simulationResults.percentage >= 70);
    const canImport = allReviewed && simulationPassed;

    if (allReviewed && onAllQuestionsReviewed) {
      onAllQuestionsReviewed();
    }

    if (onImportReady) {
      onImportReady(canImport);
    }
  }, [reviewStatuses, simulationResults, requireSimulation, onAllQuestionsReviewed, onImportReady]);

  const initializeReviewSession = useCallback(async () => {
    // Check if already initialized
    if (isInitializedRef.current && reviewSessionId) {
      console.log('Review session already initialized, skipping...');
      return;
    }

    try {
      setIsInitializing(true);
      setSyncError(null);

      console.log('Initializing review session...', { importSessionId, questionCount: memoizedQuestions.length });

      // Get current user with retry
      let user = null;
      let authRetries = 0;
      while (authRetries < 3) {
        try {
          const { data, error } = await supabase.auth.getUser();
          if (error) throw error;
          user = data.user;
          break;
        } catch (authError) {
          authRetries++;
          console.warn(`Auth attempt ${authRetries} failed:`, authError);
          if (authRetries === 3) throw authError;
          await new Promise(resolve => setTimeout(resolve, 1000 * authRetries));
        }
      }

      if (!user) {
        setSyncError('User not authenticated. Please log in again.');
        toast.error('User not authenticated');
        return;
      }

      // Check if there's an existing review session
      let sessionId = reviewSessionId;

      if (!sessionId && importSessionId) {
        try {
          const { data: existingSession, error: sessionError } = await supabase
            .from('question_import_review_sessions')
            .select('*')
            .eq('paper_import_session_id', importSessionId)
            .eq('user_id', user.id)
            .eq('status', 'in_progress')
            .maybeSingle();

          if (sessionError) {
            console.error('Error fetching existing session:', sessionError);
            throw sessionError;
          }

          if (existingSession) {
            console.log('Found existing review session:', existingSession.id);
            sessionId = existingSession.id;
            setReviewSessionId(sessionId);

            // Load existing review statuses
            const { data: existingStatuses, error: statusError } = await supabase
              .from('question_import_review_status')
              .select('*')
              .eq('review_session_id', sessionId);

            if (statusError) {
              console.error('Error fetching review statuses:', statusError);
              throw statusError;
            }

            if (existingStatuses && existingStatuses.length > 0) {
              const statusMap: Record<string, ReviewStatus> = {};
              existingStatuses.forEach(status => {
                statusMap[status.question_identifier] = {
                  questionId: status.question_identifier,
                  isReviewed: status.is_reviewed,
                  reviewedAt: status.reviewed_at,
                  hasIssues: status.has_issues,
                  issueCount: status.issue_count,
                  needsAttention: status.needs_attention
                };
              });
              setReviewStatuses(statusMap);
              console.log(`Loaded ${existingStatuses.length} existing review statuses`);
            }

            // Load simulation results if they exist
            const { data: simResults, error: simError } = await supabase
              .from('question_import_simulation_results')
              .select('*')
              .eq('review_session_id', sessionId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (simError) {
              console.warn('Error fetching simulation results (non-critical):', simError);
            } else if (simResults) {
              setSimulationResults({
                totalQuestions: simResults.total_questions,
                answeredQuestions: simResults.answered_questions,
                correctAnswers: simResults.correct_answers,
                partiallyCorrect: simResults.partially_correct,
                incorrectAnswers: simResults.incorrect_answers,
                totalMarks: simResults.total_marks,
                earnedMarks: parseFloat(simResults.earned_marks),
                percentage: parseFloat(simResults.percentage),
                timeSpent: simResults.time_spent_seconds,
                questionResults: simResults.question_results || []
              });
              console.log('Loaded simulation results');
            }
          }
        } catch (err) {
          console.error('Error loading existing session:', err);
          // Continue to create new session
        }
      }

      // Create new session if needed
      if (!sessionId && importSessionId) {
        console.log('Creating new review session...');
        const { data: newSession, error } = await supabase
          .from('question_import_review_sessions')
          .insert({
            paper_import_session_id: importSessionId,
            user_id: user.id,
            total_questions: memoizedQuestions.length,
            simulation_required: requireSimulation,
            metadata: {
              paper_title: paperTitle,
              paper_duration: paperDuration,
              total_marks: totalMarks
            }
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating review session:', error);
          throw error;
        }

        sessionId = newSession.id;
        setReviewSessionId(sessionId);
        console.log('Created new review session:', sessionId);

        // Initialize review statuses for all questions
        const initialStatuses = memoizedQuestions.map(q => ({
          review_session_id: sessionId,
          question_identifier: q.id,
          question_number: q.question_number,
          question_data: q,
          is_reviewed: false,
          has_issues: false,
          issue_count: 0,
          validation_status: 'pending'
        }));

        const { error: statusError } = await supabase
          .from('question_import_review_status')
          .insert(initialStatuses);

        if (statusError) {
          console.error('Error inserting review statuses:', statusError);
          throw statusError;
        }

        // Initialize local state
        const statusMap: Record<string, ReviewStatus> = {};
        memoizedQuestions.forEach(q => {
          statusMap[q.id] = {
            questionId: q.id,
            isReviewed: false,
            hasIssues: false,
            issueCount: 0,
            needsAttention: false
          };
        });
        setReviewStatuses(statusMap);
        console.log(`Initialized ${memoizedQuestions.length} review statuses`);
      }

      // Mark as initialized
      isInitializedRef.current = true;
      console.log('Review session initialization complete');
    } catch (error: any) {
      console.error('Error initializing review session:', error);
      const errorMessage = error?.message || 'Failed to initialize review session';
      setSyncError(errorMessage);
      toast.error(`Unable to sync question review progress: ${errorMessage}`);
      setRetryCount(prev => prev + 1);
    } finally {
      setIsInitializing(false);
    }
  }, [importSessionId, memoizedQuestions.length, paperTitle, paperDuration, totalMarks, requireSimulation, reviewSessionId]);

  const handleToggleReview = async (questionId: string) => {
    if (!reviewSessionId) return;

    const currentStatus = reviewStatuses[questionId];
    const newReviewedState = !currentStatus?.isReviewed;

    try {
      // Update in database
      const { error } = await supabase
        .from('question_import_review_status')
        .update({
          is_reviewed: newReviewedState,
          reviewed_at: newReviewedState ? new Date().toISOString() : null,
          reviewed_by: newReviewedState ? (await supabase.auth.getUser()).data.user?.id : null
        })
        .eq('review_session_id', reviewSessionId)
        .eq('question_identifier', questionId);

      if (error) throw error;

      // Update local state
      setReviewStatuses(prev => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          isReviewed: newReviewedState,
          reviewedAt: newReviewedState ? new Date().toISOString() : undefined
        }
      }));

      toast.success(newReviewedState ? 'Question marked as reviewed' : 'Review status removed');
    } catch (error) {
      console.error('Error updating review status:', error);
      toast.error('Failed to update review status');
    }
  };

  const handleStartSimulation = () => {
    // Validate questions before starting simulation
    const invalidQuestions = memoizedQuestions.filter(q =>
      !q.id || !q.question_number || !q.question_text || q.marks === undefined
    );

    if (invalidQuestions.length > 0) {
      toast.error(`${invalidQuestions.length} question(s) have missing required data. Please fix before starting test.`);
      console.error('Invalid questions:', invalidQuestions);
      return;
    }

    setShowSimulation(true);
  };

  const handleRetrySync = () => {
    isInitializedRef.current = false;
    setReviewSessionId(null);
    setSyncError(null);
    initializeReviewSession();
  };

  const handleSimulationComplete = async (results: SimulationResults) => {
    if (!reviewSessionId) return;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Save simulation results to database
      const { error } = await supabase
        .from('question_import_simulation_results')
        .insert({
          review_session_id: reviewSessionId,
          user_id: user.id,
          simulation_completed_at: new Date().toISOString(),
          total_questions: results.totalQuestions,
          answered_questions: results.answeredQuestions,
          correct_answers: results.correctAnswers,
          partially_correct: results.partiallyCorrect,
          incorrect_answers: results.incorrectAnswers,
          total_marks: results.totalMarks,
          earned_marks: results.earnedMarks,
          percentage: results.percentage,
          time_spent_seconds: results.timeSpent,
          passed: results.percentage >= 70,
          pass_threshold: 70.0,
          question_results: results.questionResults
        });

      if (error) throw error;

      // Update review session
      await supabase
        .from('question_import_review_sessions')
        .update({
          simulation_completed: true,
          simulation_passed: results.percentage >= 70,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewSessionId);

      setSimulationResults(results);
      toast.success('Simulation completed successfully');
    } catch (error) {
      console.error('Error saving simulation results:', error);
      toast.error('Failed to save simulation results');
    }
  };

  const handleSimulationExit = () => {
    setShowSimulation(false);
  };

  const toggleQuestionExpansion = (questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedQuestions(new Set(questions.map(q => q.id)));
  };

  const collapseAll = () => {
    setExpandedQuestions(new Set());
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initializing review session...</p>
        </div>
      </div>
    );
  }

  if (showSimulation) {
    return (
      <TestSimulationMode
        questions={memoizedQuestions}
        paperTitle={paperTitle}
        duration={paperDuration}
        totalMarks={totalMarks}
        onComplete={handleSimulationComplete}
        onExit={handleSimulationExit}
        allowPause={true}
        showAnswersOnCompletion={true}
      />
    );
  }

  const reviewedCount = Object.values(reviewStatuses).filter(s => s.isReviewed).length;
  const questionsWithIssues = Object.values(reviewStatuses).filter(s => s.hasIssues).length;
  const allReviewed = reviewedCount === memoizedQuestions.length;
  const simulationPassed = simulationResults && simulationResults.percentage >= 70;

  return (
    <div className="space-y-6">
      {/* Sync Error Banner */}
      {syncError && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                Unable to sync question review progress
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                {syncError}
              </p>
              <Button onClick={handleRetrySync} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review Progress Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              Question Review & Validation
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {memoizedQuestions.length} question{memoizedQuestions.length !== 1 ? 's' : ''}
              </span>
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click any question card to expand/collapse. Review each question carefully before importing to the question bank.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={expandAll} variant="outline" size="sm">
              Expand All
            </Button>
            <Button onClick={collapseAll} variant="outline" size="sm">
              Collapse All
            </Button>
          </div>
        </div>

        <ReviewProgress
          total={memoizedQuestions.length}
          reviewed={reviewedCount}
          withIssues={questionsWithIssues}
        />

        {/* Simulation Card */}
        {requireSimulation && (
          <div className="mt-6 pt-6 border-t border-blue-200 dark:border-blue-700">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <PlayCircle className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Test Simulation {simulationResults ? '(Completed)' : '(Required)'}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {simulationResults
                      ? `Score: ${simulationResults.percentage}% (${simulationResults.earnedMarks}/${simulationResults.totalMarks} marks)`
                      : 'Complete a test simulation to validate question quality'
                    }
                  </p>
                  {simulationResults && (
                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                      <span>✓ {simulationResults.correctAnswers} correct</span>
                      <span>⚠ {simulationResults.partiallyCorrect} partial</span>
                      <span>✗ {simulationResults.incorrectAnswers} incorrect</span>
                      <span>⏱ {Math.floor(simulationResults.timeSpent / 60)}m {simulationResults.timeSpent % 60}s</span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                onClick={handleStartSimulation}
                variant={simulationResults ? 'outline' : 'default'}
                size="sm"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                {simulationResults ? 'Retake Test' : 'Start Test'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {memoizedQuestions.map((question, index) => {
          const status = reviewStatuses[question.id] || {
            questionId: question.id,
            isReviewed: false,
            hasIssues: false,
            issueCount: 0
          };
          const isExpanded = expandedQuestions.has(question.id);

          return (
            <div
              key={question.id}
              className={cn(
                'border-2 rounded-xl transition-all',
                status.isReviewed
                  ? 'border-green-300 dark:border-green-700 bg-green-50/30 dark:bg-green-900/10'
                  : status.hasIssues
                  ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50/30 dark:bg-yellow-900/10'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
              )}
            >
              {/* Question Header */}
              <div
                className="px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                onClick={() => toggleQuestionExpansion(question.id)}
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleQuestionExpansion(question.id);
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    aria-label={isExpanded ? 'Collapse question' : 'Expand question'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Question {question.question_number}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {question.marks} mark{question.marks !== 1 ? 's' : ''} • {question.question_type}
                    </p>
                  </div>
                </div>

                <QuestionReviewStatus
                  status={status}
                  onToggleReview={handleToggleReview}
                  showLabel={true}
                  size="md"
                />
              </div>

              {/* Question Content */}
              {isExpanded && (
                <div className="p-6 animate-in fade-in duration-200">
                  <EnhancedQuestionDisplay
                    question={question}
                    showAnswers={true}
                    showHints={true}
                    showExplanations={true}
                    showAttachments={true}
                    compact={false}
                    highlightCorrect={true}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Import Ready Status */}
      {allReviewed && (
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                All Questions Reviewed!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                {requireSimulation && !simulationPassed
                  ? 'Complete the test simulation to proceed with import.'
                  : 'You can now proceed to import these questions to the question bank.'}
              </p>
              {requireSimulation && !simulationPassed && (
                <Button onClick={handleStartSimulation} variant="default" size="sm">
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Complete Required Simulation
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
