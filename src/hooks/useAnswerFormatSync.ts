// src/hooks/useAnswerFormatSync.ts

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  answerFieldMigrationService,
  MigrationStrategy,
  MigrationResult,
  CompatibilityCheck
} from '../services/answerFieldMigrationService';

interface CorrectAnswer {
  answer: string;
  marks?: number;
  alternative_id?: number;
  [key: string]: unknown;
}

export interface FormatSyncState {
  pendingFormatChange: {
    oldFormat: string | null;
    newFormat: string | null;
    compatibility: CompatibilityCheck;
  } | null;
  pendingRequirementChange: {
    oldRequirement: string | null;
    newRequirement: string | null;
    compatibility: CompatibilityCheck;
  } | null;
  showFormatDialog: boolean;
  showRequirementDialog: boolean;
  showInlineAdaptor: boolean;
  canUndo: boolean;
  undoState: {
    format: string | null;
    requirement: string | null;
    answers: CorrectAnswer[];
  } | null;
}

interface UseAnswerFormatSyncOptions {
  currentFormat: string | null;
  currentRequirement: string | null;
  currentAnswers: CorrectAnswer[];
  onFormatChange: (format: string | null) => Promise<void> | void;
  onRequirementChange: (requirement: string | null) => Promise<void> | void;
  onAnswersUpdate: (answers: CorrectAnswer[]) => Promise<void> | void;
  autoAdapt?: boolean;
  enabled?: boolean;
}

export function useAnswerFormatSync({
  currentFormat,
  currentRequirement,
  currentAnswers,
  onFormatChange,
  onRequirementChange,
  onAnswersUpdate,
  autoAdapt = false,
  enabled = true
}: UseAnswerFormatSyncOptions) {
  const [state, setState] = useState<FormatSyncState>({
    pendingFormatChange: null,
    pendingRequirementChange: null,
    showFormatDialog: false,
    showRequirementDialog: false,
    showInlineAdaptor: false,
    canUndo: false,
    undoState: null
  });

  const prevFormatRef = useRef<string | null>(currentFormat);
  const prevRequirementRef = useRef<string | null>(currentRequirement);
  const prevAnswersRef = useRef<CorrectAnswer[]>(currentAnswers);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Detect format changes
   */
  useEffect(() => {
    if (!enabled) return;

    const prevFormat = prevFormatRef.current;
    const newFormat = currentFormat;

    if (prevFormat !== newFormat && prevFormat !== null) {
      const compatibility = answerFieldMigrationService.checkFormatCompatibility(
        prevFormat,
        newFormat,
        currentAnswers
      );

      if (compatibility.canAutoMigrate && autoAdapt) {
        handleAutoFormatMigration(prevFormat, newFormat, compatibility);
      } else if (compatibility.requiresConfirmation) {
        setState(prev => ({
          ...prev,
          pendingFormatChange: { oldFormat: prevFormat, newFormat, compatibility },
          showFormatDialog: true
        }));
      } else {
        setState(prev => ({
          ...prev,
          showInlineAdaptor: true,
          pendingFormatChange: { oldFormat: prevFormat, newFormat, compatibility }
        }));
      }
    }

    prevFormatRef.current = currentFormat;
  }, [currentFormat, currentAnswers, autoAdapt, enabled]);

  /**
   * Detect requirement changes
   */
  useEffect(() => {
    if (!enabled) return;

    const prevRequirement = prevRequirementRef.current;
    const newRequirement = currentRequirement;

    if (prevRequirement !== newRequirement && prevRequirement !== null) {
      const compatibility = answerFieldMigrationService.checkRequirementCompatibility(
        prevRequirement,
        newRequirement,
        currentAnswers
      );

      if (compatibility.canAutoMigrate && autoAdapt) {
        handleAutoRequirementMigration(prevRequirement, newRequirement, compatibility);
      } else if (compatibility.requiresConfirmation || !compatibility.isCompatible) {
        setState(prev => ({
          ...prev,
          pendingRequirementChange: { oldRequirement: prevRequirement, newRequirement, compatibility },
          showRequirementDialog: true
        }));
      } else {
        setState(prev => ({
          ...prev,
          showInlineAdaptor: true,
          pendingRequirementChange: { oldRequirement: prevRequirement, newRequirement, compatibility }
        }));
      }
    }

    prevRequirementRef.current = currentRequirement;
  }, [currentRequirement, currentAnswers, autoAdapt, enabled]);

  /**
   * Auto-migrate format changes
   */
  const handleAutoFormatMigration = useCallback(
    async (oldFormat: string | null, newFormat: string | null, compatibility: CompatibilityCheck) => {
      saveUndoState();

      const result = answerFieldMigrationService.migrateAnswerFormat(
        oldFormat,
        newFormat,
        currentAnswers,
        'auto'
      );

      if (result.success && result.migratedAnswers.length > 0) {
        await onAnswersUpdate(result.migratedAnswers);
      }

      if (result.warnings.length > 0 || !result.success) {
        setState(prev => ({
          ...prev,
          showInlineAdaptor: true,
          pendingFormatChange: { oldFormat, newFormat, compatibility }
        }));
      }
    },
    [currentAnswers, onAnswersUpdate]
  );

  /**
   * Auto-migrate requirement changes
   */
  const handleAutoRequirementMigration = useCallback(
    (oldRequirement: string | null, newRequirement: string | null, compatibility: CompatibilityCheck) => {
      saveUndoState();

      if (compatibility.warnings.length > 0) {
        setState(prev => ({
          ...prev,
          showInlineAdaptor: true,
          pendingRequirementChange: { oldRequirement, newRequirement, compatibility }
        }));
      }
    },
    []
  );

  /**
   * Confirm format change with selected strategy
   */
  const confirmFormatChange = useCallback(
    async (strategy: MigrationStrategy) => {
      if (!state.pendingFormatChange) return;

      saveUndoState();

      const { oldFormat, newFormat } = state.pendingFormatChange;
      const result = answerFieldMigrationService.migrateAnswerFormat(
        oldFormat,
        newFormat,
        currentAnswers,
        strategy
      );

      if (result.success) {
        await onAnswersUpdate(result.migratedAnswers);
      }

      setState(prev => ({
        ...prev,
        pendingFormatChange: null,
        showFormatDialog: false,
        showInlineAdaptor: result.warnings.length > 0
      }));

      return result;
    },
    [state.pendingFormatChange, currentAnswers, onAnswersUpdate]
  );

  /**
   * Confirm requirement change
   */
  const confirmRequirementChange = useCallback(
    async (selectedAnswers?: CorrectAnswer[]) => {
      if (!state.pendingRequirementChange) return;

      saveUndoState();

      if (selectedAnswers) {
        await onAnswersUpdate(selectedAnswers);
      }

      setState(prev => ({
        ...prev,
        pendingRequirementChange: null,
        showRequirementDialog: false,
        showInlineAdaptor: false
      }));
    },
    [state.pendingRequirementChange, onAnswersUpdate]
  );

  /**
   * Cancel pending changes
   */
  const cancelFormatChange = useCallback(async () => {
    if (!state.pendingFormatChange) return;

    const { oldFormat } = state.pendingFormatChange;
    await onFormatChange(oldFormat);

    setState(prev => ({
      ...prev,
      pendingFormatChange: null,
      showFormatDialog: false
    }));
  }, [state.pendingFormatChange, onFormatChange]);

  const cancelRequirementChange = useCallback(async () => {
    if (!state.pendingRequirementChange) return;

    const { oldRequirement } = state.pendingRequirementChange;
    await onRequirementChange(oldRequirement);

    setState(prev => ({
      ...prev,
      pendingRequirementChange: null,
      showRequirementDialog: false
    }));
  }, [state.pendingRequirementChange, onRequirementChange]);

  /**
   * Dismiss inline adaptor
   */
  const dismissInlineAdaptor = useCallback(() => {
    setState(prev => ({
      ...prev,
      showInlineAdaptor: false,
      pendingFormatChange: null,
      pendingRequirementChange: null
    }));
  }, []);

  /**
   * Save undo state
   */
  const saveUndoState = useCallback(() => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    setState(prev => ({
      ...prev,
      canUndo: true,
      undoState: {
        format: prevFormatRef.current,
        requirement: prevRequirementRef.current,
        answers: [...prevAnswersRef.current]
      }
    }));

    undoTimeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        canUndo: false,
        undoState: null
      }));
    }, 30000);
  }, []);

  /**
   * Undo last change
   */
  const undo = useCallback(async () => {
    if (!state.undoState) return;

    const { format, requirement, answers } = state.undoState;

    if (format !== null) {
      await onFormatChange(format);
    }
    if (requirement !== null) {
      await onRequirementChange(requirement);
    }
    await onAnswersUpdate(answers);

    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    setState(prev => ({
      ...prev,
      canUndo: false,
      undoState: null,
      showInlineAdaptor: false
    }));
  }, [state.undoState, onFormatChange, onRequirementChange, onAnswersUpdate]);

  /**
   * Validate current answer structure
   */
  const validateAnswerStructure = useCallback(() => {
    return answerFieldMigrationService.validateAnswerStructure(
      currentFormat,
      currentRequirement,
      currentAnswers
    );
  }, [currentFormat, currentRequirement, currentAnswers]);

  /**
   * Get suggested answer count
   */
  const getSuggestedAnswerCount = useCallback(() => {
    return answerFieldMigrationService.suggestAnswerCount(currentRequirement);
  }, [currentRequirement]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    confirmFormatChange,
    confirmRequirementChange,
    cancelFormatChange,
    cancelRequirementChange,
    dismissInlineAdaptor,
    undo,
    validateAnswerStructure,
    getSuggestedAnswerCount
  };
}
