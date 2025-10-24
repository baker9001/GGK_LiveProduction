// src/app/system-admin/learning/practice-management/papers-setup/tabs/QuestionsTab/hooks/useSimulation.ts

/**
 * Custom hook for managing test simulation state and logic
 * Extracted from QuestionsTab.tsx to improve modularity
 */

import { useState, useCallback, useMemo } from 'react';

export interface SimulationIssue {
  questionId: string;
  type: 'error' | 'warning' | 'info';
  message: string;
}

export interface SimulationResult {
  completed: boolean;
  completedAt?: string;
  flaggedQuestions: string[];
  issues: SimulationIssue[];
  recommendations: string[];
  overallScore?: number;
  timeSpent?: number;
}

export interface SimulationState {
  isActive: boolean;
  startedAt?: string;
  currentQuestionIndex: number;
  flaggedQuestions: Set<string>;
  issues: SimulationIssue[];
  notes: Record<string, string>;
}

export interface UseSimulationReturn {
  isSimulationActive: boolean;
  simulationState: SimulationState;
  simulationResult: SimulationResult | null;
  startSimulation: () => void;
  endSimulation: () => void;
  flagQuestion: (questionId: string, reason: string) => void;
  unflagQuestion: (questionId: string) => void;
  addIssue: (issue: SimulationIssue) => void;
  addNote: (questionId: string, note: string) => void;
  goToNextQuestion: () => void;
  goToPreviousQuestion: () => void;
  goToQuestion: (index: number) => void;
  isQuestionFlagged: (questionId: string) => boolean;
  getQuestionNote: (questionId: string) => string | undefined;
  resetSimulation: () => void;
}

const INITIAL_STATE: SimulationState = {
  isActive: false,
  currentQuestionIndex: 0,
  flaggedQuestions: new Set(),
  issues: [],
  notes: {}
};

/**
 * Hook for managing test simulation
 */
export function useSimulation(totalQuestions: number = 0): UseSimulationReturn {
  const [simulationState, setSimulationState] = useState<SimulationState>(INITIAL_STATE);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  const isSimulationActive = simulationState.isActive;

  const startSimulation = useCallback(() => {
    setSimulationState({
      ...INITIAL_STATE,
      isActive: true,
      startedAt: new Date().toISOString()
    });
    setSimulationResult(null);
  }, []);

  const endSimulation = useCallback(() => {
    const endTime = new Date();
    const startTime = simulationState.startedAt ? new Date(simulationState.startedAt) : endTime;
    const timeSpent = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    const result: SimulationResult = {
      completed: true,
      completedAt: endTime.toISOString(),
      flaggedQuestions: Array.from(simulationState.flaggedQuestions),
      issues: simulationState.issues,
      recommendations: generateRecommendations(simulationState),
      overallScore: calculateOverallScore(simulationState, totalQuestions),
      timeSpent
    };

    setSimulationResult(result);
    setSimulationState(prev => ({ ...prev, isActive: false }));
  }, [simulationState, totalQuestions]);

  const flagQuestion = useCallback((questionId: string, reason: string) => {
    setSimulationState(prev => ({
      ...prev,
      flaggedQuestions: new Set([...prev.flaggedQuestions, questionId]),
      issues: [
        ...prev.issues,
        {
          questionId,
          type: 'warning',
          message: reason
        }
      ]
    }));
  }, []);

  const unflagQuestion = useCallback((questionId: string) => {
    setSimulationState(prev => {
      const newFlagged = new Set(prev.flaggedQuestions);
      newFlagged.delete(questionId);

      return {
        ...prev,
        flaggedQuestions: newFlagged,
        issues: prev.issues.filter(issue => issue.questionId !== questionId)
      };
    });
  }, []);

  const addIssue = useCallback((issue: SimulationIssue) => {
    setSimulationState(prev => ({
      ...prev,
      issues: [...prev.issues, issue]
    }));
  }, []);

  const addNote = useCallback((questionId: string, note: string) => {
    setSimulationState(prev => ({
      ...prev,
      notes: {
        ...prev.notes,
        [questionId]: note
      }
    }));
  }, []);

  const goToNextQuestion = useCallback(() => {
    setSimulationState(prev => ({
      ...prev,
      currentQuestionIndex: Math.min(prev.currentQuestionIndex + 1, totalQuestions - 1)
    }));
  }, [totalQuestions]);

  const goToPreviousQuestion = useCallback(() => {
    setSimulationState(prev => ({
      ...prev,
      currentQuestionIndex: Math.max(prev.currentQuestionIndex - 1, 0)
    }));
  }, []);

  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setSimulationState(prev => ({
        ...prev,
        currentQuestionIndex: index
      }));
    }
  }, [totalQuestions]);

  const isQuestionFlagged = useCallback((questionId: string) => {
    return simulationState.flaggedQuestions.has(questionId);
  }, [simulationState.flaggedQuestions]);

  const getQuestionNote = useCallback((questionId: string) => {
    return simulationState.notes[questionId];
  }, [simulationState.notes]);

  const resetSimulation = useCallback(() => {
    setSimulationState(INITIAL_STATE);
    setSimulationResult(null);
  }, []);

  return {
    isSimulationActive,
    simulationState,
    simulationResult,
    startSimulation,
    endSimulation,
    flagQuestion,
    unflagQuestion,
    addIssue,
    addNote,
    goToNextQuestion,
    goToPreviousQuestion,
    goToQuestion,
    isQuestionFlagged,
    getQuestionNote,
    resetSimulation
  };
}

/**
 * Generate recommendations based on simulation results
 */
function generateRecommendations(state: SimulationState): string[] {
  const recommendations: string[] = [];

  if (state.flaggedQuestions.size > 0) {
    recommendations.push(`Review ${state.flaggedQuestions.size} flagged questions before import`);
  }

  const errorCount = state.issues.filter(i => i.type === 'error').length;
  if (errorCount > 0) {
    recommendations.push(`Fix ${errorCount} critical errors before proceeding`);
  }

  const warningCount = state.issues.filter(i => i.type === 'warning').length;
  if (warningCount > 5) {
    recommendations.push('Consider reviewing questions with warnings for quality improvement');
  }

  if (recommendations.length === 0) {
    recommendations.push('All questions passed simulation review successfully');
  }

  return recommendations;
}

/**
 * Calculate overall quality score
 */
function calculateOverallScore(state: SimulationState, totalQuestions: number): number {
  if (totalQuestions === 0) return 0;

  const errorCount = state.issues.filter(i => i.type === 'error').length;
  const warningCount = state.issues.filter(i => i.type === 'warning').length;

  // Base score of 100, deduct points for issues
  let score = 100;
  score -= errorCount * 10; // -10 points per error
  score -= warningCount * 5; // -5 points per warning

  return Math.max(0, Math.min(100, score));
}
