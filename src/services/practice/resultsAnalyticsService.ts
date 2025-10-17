import { supabase } from '@/lib/supabase';
import { PracticeSession, PracticeAnswer, PracticeSetItem } from '@/types/practice';
import dayjs from 'dayjs';

export interface UnitPerformance {
  unitId: string | null;
  unitName: string;
  questionsTotal: number;
  questionsCorrect: number;
  questionsPartial: number;
  questionsIncorrect: number;
  marksEarned: number;
  marksAvailable: number;
  accuracy: number;
  averageTime: number;
  difficultyBreakdown: {
    easy: { correct: number; total: number; accuracy: number };
    medium: { correct: number; total: number; accuracy: number };
    hard: { correct: number; total: number; accuracy: number };
  };
}

export interface TopicPerformance {
  topicId: string | null;
  topicName: string;
  unitId: string | null;
  unitName: string;
  questionsTotal: number;
  questionsCorrect: number;
  marksEarned: number;
  marksAvailable: number;
  accuracy: number;
  averageTime: number;
  status: 'mastered' | 'progressing' | 'needs_work';
}

export interface SubtopicPerformance {
  subtopicId: string | null;
  subtopicName: string;
  topicId: string | null;
  topicName: string;
  questionsTotal: number;
  questionsCorrect: number;
  marksEarned: number;
  marksAvailable: number;
  accuracy: number;
  averageTime: number;
  status: 'mastered' | 'progressing' | 'needs_work';
}

export interface DifficultyAnalysis {
  easy: {
    total: number;
    correct: number;
    partial: number;
    incorrect: number;
    accuracy: number;
    averageTime: number;
    marksEarned: number;
    marksAvailable: number;
  };
  medium: {
    total: number;
    correct: number;
    partial: number;
    incorrect: number;
    accuracy: number;
    averageTime: number;
    marksEarned: number;
    marksAvailable: number;
  };
  hard: {
    total: number;
    correct: number;
    partial: number;
    incorrect: number;
    accuracy: number;
    averageTime: number;
    marksEarned: number;
    marksAvailable: number;
  };
}

export interface QuestionTypeAnalysis {
  mcq: { total: number; correct: number; accuracy: number };
  tf: { total: number; correct: number; accuracy: number };
  descriptive: { total: number; correct: number; accuracy: number };
  complex: { total: number; correct: number; accuracy: number };
}

export interface StrengthWeaknessArea {
  type: 'unit' | 'topic' | 'subtopic';
  id: string | null;
  name: string;
  accuracy: number;
  questionsTotal: number;
  improvementPotential: number;
}

export interface StudyRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  area: string;
  areaType: 'unit' | 'topic' | 'subtopic';
  currentAccuracy: number;
  targetAccuracy: number;
  estimatedStudyTime: number;
  resources: {
    type: 'video' | 'practice' | 'notes';
    title: string;
    url?: string;
  }[];
  actionText: string;
}

export interface QuestionDetailedReview {
  questionId: string;
  questionNumber: string;
  questionText: string;
  questionType: string;
  unit: { id: string | null; name: string };
  topic: { id: string | null; name: string };
  subtopic: { id: string | null; name: string };
  difficulty: string;
  marks: number;
  marksEarned: number;
  isCorrect: boolean;
  isPartial: boolean;
  timeSpent: number;
  expectedTime: number;
  studentAnswer: any;
  correctAnswers: any[];
  explanation: string | null;
  hint: string | null;
  feedback: string;
  markingDetails: any;
}

export interface ComprehensiveAnalytics {
  sessionId: string;
  studentId: string;

  // Overall Summary
  summary: {
    totalQuestions: number;
    questionsAnswered: number;
    questionsCorrect: number;
    questionsPartial: number;
    questionsIncorrect: number;
    marksEarned: number;
    marksAvailable: number;
    accuracy: number;
    percentage: number;
    gradePrediction: string;
    totalTimeSeconds: number;
    averageTimePerQuestion: number;
    timeEfficiency: number;
  };

  // Curriculum Structure Performance
  unitPerformance: UnitPerformance[];
  topicPerformance: TopicPerformance[];
  subtopicPerformance: SubtopicPerformance[];

  // Difficulty Analysis
  difficultyAnalysis: DifficultyAnalysis;

  // Question Type Analysis
  questionTypeAnalysis: QuestionTypeAnalysis;

  // Strengths and Weaknesses
  strongAreas: StrengthWeaknessArea[];
  weakAreas: StrengthWeaknessArea[];

  // Recommendations
  recommendations: StudyRecommendation[];

  // Detailed Question Review
  questionReviews: QuestionDetailedReview[];

  // Comparative Data (if available)
  previousAttempt?: {
    accuracy: number;
    percentage: number;
    improvement: number;
  };

  // Metadata
  computedAt: string;
}

interface QuestionWithMetadata extends PracticeAnswer {
  question: any;
  item: PracticeSetItem;
  timeSpent: number;
}

export async function computeComprehensiveAnalytics(
  sessionId: string
): Promise<ComprehensiveAnalytics> {
  // Fetch session data with all related information
  const { data: session, error: sessionError } = await supabase
    .from('practice_sessions')
    .select(`
      *,
      practice_set:practice_sets(*),
      answers:practice_answers(*),
      items:practice_set_items(
        *,
        question:questions_master_admin(
          *,
          unit:edu_units(id, name),
          topic:edu_topics(id, name),
          subtopic:edu_subtopics(id, name)
        )
      )
    `)
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError || !session) {
    throw new Error('Unable to load session data for analytics');
  }

  const answers: PracticeAnswer[] = session.answers ?? [];
  const items: PracticeSetItem[] = session.items ?? [];

  // Build question metadata map
  const questionsWithMeta: QuestionWithMetadata[] = answers.map((answer) => {
    const item = items.find((i) => i.id === answer.item_id);
    const question = item?.question;

    // Calculate time spent (simplified - in real implementation, use session events)
    const timeSpent = 90; // Default 90 seconds per question

    return {
      ...answer,
      question,
      item: item!,
      timeSpent
    };
  });

  // Compute overall summary
  const totalQuestions = questionsWithMeta.length;
  const questionsAnswered = questionsWithMeta.filter((q) => q.answer).length;
  const questionsCorrect = questionsWithMeta.filter((q) => q.is_correct === true).length;
  const questionsPartial = questionsWithMeta.filter(
    (q) => q.is_correct === false && (q.marks_earned ?? 0) > 0
  ).length;
  const questionsIncorrect = questionsWithMeta.filter(
    (q) => (q.marks_earned ?? 0) === 0 && q.answer
  ).length;

  const marksEarned = session.total_marks_earned ?? 0;
  const marksAvailable = session.total_marks_available ?? 0;
  const accuracy = marksAvailable > 0 ? marksEarned / marksAvailable : 0;
  const percentage = Math.round(accuracy * 100);

  const gradePrediction = calculateGradePrediction(percentage);

  const totalTimeSeconds = questionsWithMeta.reduce((sum, q) => sum + q.timeSpent, 0);
  const averageTimePerQuestion = totalQuestions > 0 ? totalTimeSeconds / totalQuestions : 0;
  const expectedTotalTime = totalQuestions * 90; // 90 seconds per question
  const timeEfficiency = expectedTotalTime > 0 ? (expectedTotalTime / totalTimeSeconds) * 100 : 100;

  // Compute unit performance
  const unitPerformance = computeUnitPerformance(questionsWithMeta);

  // Compute topic performance
  const topicPerformance = computeTopicPerformance(questionsWithMeta);

  // Compute subtopic performance
  const subtopicPerformance = computeSubtopicPerformance(questionsWithMeta);

  // Compute difficulty analysis
  const difficultyAnalysis = computeDifficultyAnalysis(questionsWithMeta);

  // Compute question type analysis
  const questionTypeAnalysis = computeQuestionTypeAnalysis(questionsWithMeta);

  // Identify strong and weak areas
  const { strongAreas, weakAreas } = identifyStrengthsWeaknesses(
    unitPerformance,
    topicPerformance,
    subtopicPerformance
  );

  // Generate recommendations
  const recommendations = generateRecommendations(weakAreas, difficultyAnalysis);

  // Build detailed question reviews
  const questionReviews = buildQuestionReviews(questionsWithMeta);

  // Try to get previous attempt data
  const previousAttempt = await getPreviousAttemptComparison(session.student_id, sessionId);

  const analytics: ComprehensiveAnalytics = {
    sessionId,
    studentId: session.student_id,
    summary: {
      totalQuestions,
      questionsAnswered,
      questionsCorrect,
      questionsPartial,
      questionsIncorrect,
      marksEarned,
      marksAvailable,
      accuracy,
      percentage,
      gradePrediction,
      totalTimeSeconds,
      averageTimePerQuestion,
      timeEfficiency
    },
    unitPerformance,
    topicPerformance,
    subtopicPerformance,
    difficultyAnalysis,
    questionTypeAnalysis,
    strongAreas,
    weakAreas,
    recommendations,
    questionReviews,
    previousAttempt,
    computedAt: dayjs().toISOString()
  };

  // Store analytics in database
  await storeAnalytics(analytics);

  // Update session metadata
  await supabase
    .from('practice_sessions')
    .update({
      overall_accuracy: accuracy * 100,
      overall_percentage: percentage,
      time_per_question: averageTimePerQuestion,
      analytics_computed: true
    })
    .eq('id', sessionId);

  return analytics;
}

function computeUnitPerformance(questions: QuestionWithMetadata[]): UnitPerformance[] {
  const unitMap = new Map<string, UnitPerformance>();

  questions.forEach((q) => {
    const unitId = q.question?.unit?.id ?? null;
    const unitName = q.question?.unit?.name ?? 'Unassigned';
    const key = unitId ?? 'unassigned';

    if (!unitMap.has(key)) {
      unitMap.set(key, {
        unitId,
        unitName,
        questionsTotal: 0,
        questionsCorrect: 0,
        questionsPartial: 0,
        questionsIncorrect: 0,
        marksEarned: 0,
        marksAvailable: 0,
        accuracy: 0,
        averageTime: 0,
        difficultyBreakdown: {
          easy: { correct: 0, total: 0, accuracy: 0 },
          medium: { correct: 0, total: 0, accuracy: 0 },
          hard: { correct: 0, total: 0, accuracy: 0 }
        }
      });
    }

    const unit = unitMap.get(key)!;
    unit.questionsTotal++;

    if (q.is_correct) unit.questionsCorrect++;
    else if ((q.marks_earned ?? 0) > 0) unit.questionsPartial++;
    else unit.questionsIncorrect++;

    unit.marksEarned += q.marks_earned ?? 0;
    unit.marksAvailable += q.question?.marks ?? 0;
    unit.averageTime = (unit.averageTime * (unit.questionsTotal - 1) + q.timeSpent) / unit.questionsTotal;

    // Update difficulty breakdown
    const difficulty = (q.question?.difficulty ?? 'Medium').toLowerCase();
    if (difficulty === 'easy') {
      unit.difficultyBreakdown.easy.total++;
      if (q.is_correct) unit.difficultyBreakdown.easy.correct++;
    } else if (difficulty === 'medium') {
      unit.difficultyBreakdown.medium.total++;
      if (q.is_correct) unit.difficultyBreakdown.medium.correct++;
    } else if (difficulty === 'hard') {
      unit.difficultyBreakdown.hard.total++;
      if (q.is_correct) unit.difficultyBreakdown.hard.correct++;
    }
  });

  // Calculate final accuracy and difficulty accuracies
  unitMap.forEach((unit) => {
    unit.accuracy = unit.marksAvailable > 0 ? unit.marksEarned / unit.marksAvailable : 0;
    unit.difficultyBreakdown.easy.accuracy =
      unit.difficultyBreakdown.easy.total > 0
        ? unit.difficultyBreakdown.easy.correct / unit.difficultyBreakdown.easy.total
        : 0;
    unit.difficultyBreakdown.medium.accuracy =
      unit.difficultyBreakdown.medium.total > 0
        ? unit.difficultyBreakdown.medium.correct / unit.difficultyBreakdown.medium.total
        : 0;
    unit.difficultyBreakdown.hard.accuracy =
      unit.difficultyBreakdown.hard.total > 0
        ? unit.difficultyBreakdown.hard.correct / unit.difficultyBreakdown.hard.total
        : 0;
  });

  return Array.from(unitMap.values()).sort((a, b) => b.questionsTotal - a.questionsTotal);
}

function computeTopicPerformance(questions: QuestionWithMetadata[]): TopicPerformance[] {
  const topicMap = new Map<string, TopicPerformance>();

  questions.forEach((q) => {
    const topicId = q.question?.topic?.id ?? null;
    const topicName = q.question?.topic?.name ?? 'Unassigned';
    const unitId = q.question?.unit?.id ?? null;
    const unitName = q.question?.unit?.name ?? 'Unassigned';
    const key = topicId ?? 'unassigned';

    if (!topicMap.has(key)) {
      topicMap.set(key, {
        topicId,
        topicName,
        unitId,
        unitName,
        questionsTotal: 0,
        questionsCorrect: 0,
        marksEarned: 0,
        marksAvailable: 0,
        accuracy: 0,
        averageTime: 0,
        status: 'needs_work'
      });
    }

    const topic = topicMap.get(key)!;
    topic.questionsTotal++;
    if (q.is_correct) topic.questionsCorrect++;
    topic.marksEarned += q.marks_earned ?? 0;
    topic.marksAvailable += q.question?.marks ?? 0;
    topic.averageTime =
      (topic.averageTime * (topic.questionsTotal - 1) + q.timeSpent) / topic.questionsTotal;
  });

  // Calculate accuracy and status
  topicMap.forEach((topic) => {
    topic.accuracy = topic.marksAvailable > 0 ? topic.marksEarned / topic.marksAvailable : 0;

    if (topic.accuracy >= 0.8) topic.status = 'mastered';
    else if (topic.accuracy >= 0.6) topic.status = 'progressing';
    else topic.status = 'needs_work';
  });

  return Array.from(topicMap.values()).sort((a, b) => b.questionsTotal - a.questionsTotal);
}

function computeSubtopicPerformance(questions: QuestionWithMetadata[]): SubtopicPerformance[] {
  const subtopicMap = new Map<string, SubtopicPerformance>();

  questions.forEach((q) => {
    const subtopicId = q.question?.subtopic?.id ?? null;
    const subtopicName = q.question?.subtopic?.name ?? 'Unassigned';
    const topicId = q.question?.topic?.id ?? null;
    const topicName = q.question?.topic?.name ?? 'Unassigned';
    const key = subtopicId ?? 'unassigned';

    if (!subtopicMap.has(key)) {
      subtopicMap.set(key, {
        subtopicId,
        subtopicName,
        topicId,
        topicName,
        questionsTotal: 0,
        questionsCorrect: 0,
        marksEarned: 0,
        marksAvailable: 0,
        accuracy: 0,
        averageTime: 0,
        status: 'needs_work'
      });
    }

    const subtopic = subtopicMap.get(key)!;
    subtopic.questionsTotal++;
    if (q.is_correct) subtopic.questionsCorrect++;
    subtopic.marksEarned += q.marks_earned ?? 0;
    subtopic.marksAvailable += q.question?.marks ?? 0;
    subtopic.averageTime =
      (subtopic.averageTime * (subtopic.questionsTotal - 1) + q.timeSpent) / subtopic.questionsTotal;
  });

  // Calculate accuracy and status
  subtopicMap.forEach((subtopic) => {
    subtopic.accuracy = subtopic.marksAvailable > 0 ? subtopic.marksEarned / subtopic.marksAvailable : 0;

    if (subtopic.accuracy >= 0.8) subtopic.status = 'mastered';
    else if (subtopic.accuracy >= 0.6) subtopic.status = 'progressing';
    else subtopic.status = 'needs_work';
  });

  return Array.from(subtopicMap.values()).sort((a, b) => b.questionsTotal - a.questionsTotal);
}

function computeDifficultyAnalysis(questions: QuestionWithMetadata[]): DifficultyAnalysis {
  const analysis: DifficultyAnalysis = {
    easy: {
      total: 0,
      correct: 0,
      partial: 0,
      incorrect: 0,
      accuracy: 0,
      averageTime: 0,
      marksEarned: 0,
      marksAvailable: 0
    },
    medium: {
      total: 0,
      correct: 0,
      partial: 0,
      incorrect: 0,
      accuracy: 0,
      averageTime: 0,
      marksEarned: 0,
      marksAvailable: 0
    },
    hard: {
      total: 0,
      correct: 0,
      partial: 0,
      incorrect: 0,
      accuracy: 0,
      averageTime: 0,
      marksEarned: 0,
      marksAvailable: 0
    }
  };

  questions.forEach((q) => {
    const difficulty = (q.question?.difficulty ?? 'Medium').toLowerCase() as 'easy' | 'medium' | 'hard';
    const level = analysis[difficulty];

    level.total++;
    if (q.is_correct) level.correct++;
    else if ((q.marks_earned ?? 0) > 0) level.partial++;
    else level.incorrect++;

    level.marksEarned += q.marks_earned ?? 0;
    level.marksAvailable += q.question?.marks ?? 0;
    level.averageTime = (level.averageTime * (level.total - 1) + q.timeSpent) / level.total;
  });

  // Calculate accuracies
  Object.values(analysis).forEach((level) => {
    level.accuracy = level.marksAvailable > 0 ? level.marksEarned / level.marksAvailable : 0;
  });

  return analysis;
}

function computeQuestionTypeAnalysis(questions: QuestionWithMetadata[]): QuestionTypeAnalysis {
  const analysis: QuestionTypeAnalysis = {
    mcq: { total: 0, correct: 0, accuracy: 0 },
    tf: { total: 0, correct: 0, accuracy: 0 },
    descriptive: { total: 0, correct: 0, accuracy: 0 },
    complex: { total: 0, correct: 0, accuracy: 0 }
  };

  questions.forEach((q) => {
    const type = q.question?.type ?? 'descriptive';
    if (analysis[type as keyof QuestionTypeAnalysis]) {
      analysis[type as keyof QuestionTypeAnalysis].total++;
      if (q.is_correct) {
        analysis[type as keyof QuestionTypeAnalysis].correct++;
      }
    }
  });

  // Calculate accuracies
  Object.values(analysis).forEach((type) => {
    type.accuracy = type.total > 0 ? type.correct / type.total : 0;
  });

  return analysis;
}

function identifyStrengthsWeaknesses(
  units: UnitPerformance[],
  topics: TopicPerformance[],
  subtopics: SubtopicPerformance[]
): { strongAreas: StrengthWeaknessArea[]; weakAreas: StrengthWeaknessArea[] } {
  const strongAreas: StrengthWeaknessArea[] = [];
  const weakAreas: StrengthWeaknessArea[] = [];

  // Check units
  units.forEach((unit) => {
    const area: StrengthWeaknessArea = {
      type: 'unit',
      id: unit.unitId,
      name: unit.unitName,
      accuracy: unit.accuracy,
      questionsTotal: unit.questionsTotal,
      improvementPotential: Math.round((1 - unit.accuracy) * unit.marksAvailable)
    };

    if (unit.accuracy >= 0.8) strongAreas.push(area);
    else if (unit.accuracy < 0.7) weakAreas.push(area);
  });

  // Check topics
  topics.forEach((topic) => {
    if (topic.questionsTotal < 2) return; // Skip topics with too few questions

    const area: StrengthWeaknessArea = {
      type: 'topic',
      id: topic.topicId,
      name: topic.topicName,
      accuracy: topic.accuracy,
      questionsTotal: topic.questionsTotal,
      improvementPotential: Math.round((1 - topic.accuracy) * topic.marksAvailable)
    };

    if (topic.accuracy >= 0.8) strongAreas.push(area);
    else if (topic.accuracy < 0.7) weakAreas.push(area);
  });

  // Sort by improvement potential
  weakAreas.sort((a, b) => b.improvementPotential - a.improvementPotential);
  strongAreas.sort((a, b) => b.accuracy - a.accuracy);

  return { strongAreas: strongAreas.slice(0, 5), weakAreas: weakAreas.slice(0, 5) };
}

function generateRecommendations(
  weakAreas: StrengthWeaknessArea[],
  difficultyAnalysis: DifficultyAnalysis
): StudyRecommendation[] {
  const recommendations: StudyRecommendation[] = [];

  // Add recommendations for weak areas
  weakAreas.slice(0, 3).forEach((area, index) => {
    recommendations.push({
      id: `rec-${index}`,
      priority: index === 0 ? 'high' : index === 1 ? 'medium' : 'low',
      area: area.name,
      areaType: area.type,
      currentAccuracy: Math.round(area.accuracy * 100),
      targetAccuracy: 80,
      estimatedStudyTime: Math.ceil(area.improvementPotential * 5), // 5 mins per mark
      resources: [
        { type: 'video', title: `${area.name} Video Tutorial` },
        { type: 'practice', title: `${area.name} Practice Questions` },
        { type: 'notes', title: `${area.name} Study Notes` }
      ],
      actionText: `Focus on mastering ${area.name} concepts with targeted practice`
    });
  });

  // Add difficulty-based recommendations
  if (difficultyAnalysis.easy.accuracy < 0.7) {
    recommendations.push({
      id: 'rec-easy',
      priority: 'high',
      area: 'Foundation Concepts',
      areaType: 'topic',
      currentAccuracy: Math.round(difficultyAnalysis.easy.accuracy * 100),
      targetAccuracy: 90,
      estimatedStudyTime: 60,
      resources: [{ type: 'practice', title: 'Basic Concept Drills' }],
      actionText: 'Strengthen your foundation with easy-level practice'
    });
  }

  if (difficultyAnalysis.hard.total > 0 && difficultyAnalysis.hard.accuracy < 0.5) {
    recommendations.push({
      id: 'rec-hard',
      priority: 'medium',
      area: 'Advanced Problem Solving',
      areaType: 'topic',
      currentAccuracy: Math.round(difficultyAnalysis.hard.accuracy * 100),
      targetAccuracy: 70,
      estimatedStudyTime: 120,
      resources: [{ type: 'video', title: 'Advanced Techniques Tutorial' }],
      actionText: 'Build confidence with challenging questions after mastering basics'
    });
  }

  return recommendations.slice(0, 5);
}

function buildQuestionReviews(questions: QuestionWithMetadata[]): QuestionDetailedReview[] {
  return questions.map((q, index) => ({
    questionId: q.question_id,
    questionNumber: `${index + 1}`,
    questionText: q.question?.question_description ?? '',
    questionType: q.question?.type ?? 'descriptive',
    unit: {
      id: q.question?.unit?.id ?? null,
      name: q.question?.unit?.name ?? 'Unassigned'
    },
    topic: {
      id: q.question?.topic?.id ?? null,
      name: q.question?.topic?.name ?? 'Unassigned'
    },
    subtopic: {
      id: q.question?.subtopic?.id ?? null,
      name: q.question?.subtopic?.name ?? 'Unassigned'
    },
    difficulty: q.question?.difficulty ?? 'Medium',
    marks: q.question?.marks ?? 0,
    marksEarned: q.marks_earned ?? 0,
    isCorrect: q.is_correct ?? false,
    isPartial: !q.is_correct && (q.marks_earned ?? 0) > 0,
    timeSpent: q.timeSpent,
    expectedTime: 90,
    studentAnswer: q.raw_answer_json,
    correctAnswers: [], // Would be populated from correct_answers table
    explanation: q.question?.explanation ?? null,
    hint: q.question?.hint ?? null,
    feedback: q.is_correct
      ? 'Correct!'
      : (q.marks_earned ?? 0) > 0
        ? 'Partially correct'
        : 'Incorrect',
    markingDetails: q.auto_mark_json
  }));
}

function calculateGradePrediction(percentage: number): string {
  if (percentage >= 90) return 'A*';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  if (percentage >= 40) return 'E';
  if (percentage >= 30) return 'F';
  return 'G';
}

async function getPreviousAttemptComparison(
  studentId: string,
  currentSessionId: string
): Promise<{ accuracy: number; percentage: number; improvement: number } | undefined> {
  const { data } = await supabase
    .from('practice_sessions')
    .select('overall_accuracy, overall_percentage')
    .eq('student_id', studentId)
    .eq('status', 'completed')
    .neq('id', currentSessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return undefined;

  const previousAccuracy = (data.overall_accuracy ?? 0) / 100;
  const previousPercentage = data.overall_percentage ?? 0;

  // Get current session data
  const { data: currentSession } = await supabase
    .from('practice_sessions')
    .select('overall_accuracy, overall_percentage')
    .eq('id', currentSessionId)
    .maybeSingle();

  if (!currentSession) return undefined;

  const currentPercentage = currentSession.overall_percentage ?? 0;
  const improvement = currentPercentage - previousPercentage;

  return {
    accuracy: previousAccuracy,
    percentage: previousPercentage,
    improvement
  };
}

async function storeAnalytics(analytics: ComprehensiveAnalytics): Promise<void> {
  const { error } = await supabase.from('practice_results_analytics').upsert(
    {
      session_id: analytics.sessionId,
      student_id: analytics.studentId,
      total_questions: analytics.summary.totalQuestions,
      questions_answered: analytics.summary.questionsAnswered,
      questions_correct: analytics.summary.questionsCorrect,
      questions_partial: analytics.summary.questionsPartial,
      questions_incorrect: analytics.summary.questionsIncorrect,
      overall_accuracy: analytics.summary.accuracy * 100,
      overall_percentage: analytics.summary.percentage,
      grade_prediction: analytics.summary.gradePrediction,
      total_time_seconds: analytics.summary.totalTimeSeconds,
      average_time_per_question: analytics.summary.averageTimePerQuestion,
      time_efficiency_score: analytics.summary.timeEfficiency,
      unit_performance: analytics.unitPerformance,
      topic_performance: analytics.topicPerformance,
      subtopic_performance: analytics.subtopicPerformance,
      difficulty_breakdown: analytics.difficultyAnalysis,
      question_type_breakdown: analytics.questionTypeAnalysis,
      strong_areas: analytics.strongAreas,
      weak_areas: analytics.weakAreas,
      study_recommendations: analytics.recommendations,
      previous_attempt_comparison: analytics.previousAttempt,
      computed_at: analytics.computedAt
    },
    { onConflict: 'session_id' }
  );

  if (error) {
    console.error('Failed to store analytics:', error);
  }
}

export async function getStoredAnalytics(sessionId: string): Promise<ComprehensiveAnalytics | null> {
  const { data, error } = await supabase
    .from('practice_results_analytics')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  // Reconstruct analytics object from stored data
  return {
    sessionId: data.session_id,
    studentId: data.student_id,
    summary: {
      totalQuestions: data.total_questions,
      questionsAnswered: data.questions_answered,
      questionsCorrect: data.questions_correct,
      questionsPartial: data.questions_partial,
      questionsIncorrect: data.questions_incorrect,
      marksEarned: 0, // Would need to calculate from session
      marksAvailable: 0,
      accuracy: (data.overall_accuracy ?? 0) / 100,
      percentage: data.overall_percentage ?? 0,
      gradePrediction: data.grade_prediction ?? 'N/A',
      totalTimeSeconds: data.total_time_seconds ?? 0,
      averageTimePerQuestion: data.average_time_per_question ?? 0,
      timeEfficiency: data.time_efficiency_score ?? 100
    },
    unitPerformance: (data.unit_performance as any) ?? [],
    topicPerformance: (data.topic_performance as any) ?? [],
    subtopicPerformance: (data.subtopic_performance as any) ?? [],
    difficultyAnalysis: (data.difficulty_breakdown as any) ?? {},
    questionTypeAnalysis: (data.question_type_breakdown as any) ?? {},
    strongAreas: (data.strong_areas as any) ?? [],
    weakAreas: (data.weak_areas as any) ?? [],
    recommendations: (data.study_recommendations as any) ?? [],
    questionReviews: [],
    previousAttempt: data.previous_attempt_comparison as any,
    computedAt: data.computed_at
  };
}
