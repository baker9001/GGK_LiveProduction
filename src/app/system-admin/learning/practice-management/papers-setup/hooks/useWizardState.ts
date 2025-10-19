// src/app/system-admin/learning/practice-management/papers-setup/hooks/useWizardState.ts

/**
 * Custom hook for managing wizard state across tabs
 * Centralizes state management to reduce prop drilling
 */

import { useState, useCallback, useMemo } from 'react';

export type TabId = 'upload' | 'structure' | 'metadata' | 'questions' | 'review';

export interface WizardStep {
  id: TabId;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  canNavigate: boolean;
}

export interface WizardState {
  currentTab: TabId;
  steps: WizardStep[];
  importSession: any | null;
  parsedData: any | null;
  uploadedFile: File | null;
  savedPaperDetails: any | null;
  existingPaperId: string | null;
}

export interface UseWizardStateReturn {
  currentTab: TabId;
  steps: WizardStep[];
  importSession: any | null;
  parsedData: any | null;
  uploadedFile: File | null;
  savedPaperDetails: any | null;
  existingPaperId: string | null;
  setCurrentTab: (tab: TabId) => void;
  goToNextTab: () => void;
  goToPreviousTab: () => void;
  markStepCompleted: (tabId: TabId) => void;
  markStepError: (tabId: TabId) => void;
  setImportSession: (session: any) => void;
  setParsedData: (data: any) => void;
  setUploadedFile: (file: File | null) => void;
  setSavedPaperDetails: (details: any) => void;
  setExistingPaperId: (id: string | null) => void;
  canNavigateTo: (tabId: TabId) => boolean;
  isStepCompleted: (tabId: TabId) => boolean;
  getCurrentStepIndex: () => number;
  resetWizard: () => void;
}

const INITIAL_STEPS: WizardStep[] = [
  { id: 'upload', label: 'Upload', status: 'active', canNavigate: true },
  { id: 'structure', label: 'Structure', status: 'pending', canNavigate: false },
  { id: 'metadata', label: 'Metadata', status: 'pending', canNavigate: false },
  { id: 'questions', label: 'Questions', status: 'pending', canNavigate: false },
  { id: 'review', label: 'Review', status: 'pending', canNavigate: false }
];

const TAB_ORDER: TabId[] = ['upload', 'structure', 'metadata', 'questions', 'review'];

/**
 * Hook for managing wizard state
 */
export function useWizardState(initialTab: TabId = 'upload'): UseWizardStateReturn {
  const [currentTab, setCurrentTabState] = useState<TabId>(initialTab);
  const [steps, setSteps] = useState<WizardStep[]>(INITIAL_STEPS);
  const [importSession, setImportSession] = useState<any | null>(null);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [savedPaperDetails, setSavedPaperDetails] = useState<any | null>(null);
  const [existingPaperId, setExistingPaperId] = useState<string | null>(null);

  const setCurrentTab = useCallback((tab: TabId) => {
    setSteps(prev =>
      prev.map(step => ({
        ...step,
        status: step.id === tab ? 'active' : step.status === 'active' ? 'pending' : step.status
      }))
    );
    setCurrentTabState(tab);
  }, []);

  const goToNextTab = useCallback(() => {
    const currentIndex = TAB_ORDER.indexOf(currentTab);
    if (currentIndex < TAB_ORDER.length - 1) {
      const nextTab = TAB_ORDER[currentIndex + 1];
      setCurrentTab(nextTab);
    }
  }, [currentTab, setCurrentTab]);

  const goToPreviousTab = useCallback(() => {
    const currentIndex = TAB_ORDER.indexOf(currentTab);
    if (currentIndex > 0) {
      const prevTab = TAB_ORDER[currentIndex - 1];
      setCurrentTab(prevTab);
    }
  }, [currentTab, setCurrentTab]);

  const markStepCompleted = useCallback((tabId: TabId) => {
    setSteps(prev =>
      prev.map(step => {
        if (step.id === tabId) {
          return { ...step, status: 'completed' as const, canNavigate: true };
        }
        // Enable next step when current step is completed
        const stepIndex = TAB_ORDER.indexOf(step.id);
        const completedIndex = TAB_ORDER.indexOf(tabId);
        if (stepIndex === completedIndex + 1) {
          return { ...step, canNavigate: true };
        }
        return step;
      })
    );
  }, []);

  const markStepError = useCallback((tabId: TabId) => {
    setSteps(prev =>
      prev.map(step =>
        step.id === tabId ? { ...step, status: 'error' as const } : step
      )
    );
  }, []);

  const canNavigateTo = useCallback((tabId: TabId): boolean => {
    const step = steps.find(s => s.id === tabId);
    return step?.canNavigate ?? false;
  }, [steps]);

  const isStepCompleted = useCallback((tabId: TabId): boolean => {
    const step = steps.find(s => s.id === tabId);
    return step?.status === 'completed';
  }, [steps]);

  const getCurrentStepIndex = useCallback((): number => {
    return TAB_ORDER.indexOf(currentTab);
  }, [currentTab]);

  const resetWizard = useCallback(() => {
    setSteps(INITIAL_STEPS);
    setCurrentTabState('upload');
    setImportSession(null);
    setParsedData(null);
    setUploadedFile(null);
    setSavedPaperDetails(null);
    setExistingPaperId(null);
  }, []);

  return {
    currentTab,
    steps,
    importSession,
    parsedData,
    uploadedFile,
    savedPaperDetails,
    existingPaperId,
    setCurrentTab,
    goToNextTab,
    goToPreviousTab,
    markStepCompleted,
    markStepError,
    setImportSession,
    setParsedData,
    setUploadedFile,
    setSavedPaperDetails,
    setExistingPaperId,
    canNavigateTo,
    isStepCompleted,
    getCurrentStepIndex,
    resetWizard
  };
}
