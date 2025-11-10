import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import QuestionNavigationService from '@/services/questionNavigationService';
import type {
  NavigationFilter,
  QuestionStatus,
  AttachmentStatus,
} from '@/components/shared/EnhancedQuestionNavigator';

interface UseQuestionNavigationOptions {
  paperId: string;
  questions: any[];
  autoSave?: boolean;
  autoSync?: boolean;
}

export function useQuestionNavigation({
  paperId,
  questions,
  autoSave = true,
  autoSync = true,
}: UseQuestionNavigationOptions) {
  const { user } = useUser();
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<NavigationFilter>({
    showCompleted: true,
    showIncomplete: true,
    showNeedsAttachment: true,
    showErrors: true,
  });
  const [statusData, setStatusData] = useState<Map<string, QuestionStatus>>(new Map());
  const [attachmentData, setAttachmentData] = useState<Map<string, AttachmentStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadNavigationState = useCallback(async () => {
    if (!user?.auth_user_id || !paperId) return;

    try {
      setIsLoading(true);

      const state = await QuestionNavigationService.getNavigationState(
        user.auth_user_id,
        paperId
      );

      if (state) {
        setCurrentId(state.current_position_id);
        setExpandedItems(new Set(state.expanded_items || []));
        setFilter(state.filter_settings);
      }

      const [statusMap, attachmentMap] = await Promise.all([
        QuestionNavigationService.getReviewProgress(paperId),
        QuestionNavigationService.getAttachmentTracking(paperId),
      ]);

      setStatusData(statusMap);
      setAttachmentData(attachmentMap);
    } catch (error) {
      console.error('Error loading navigation state:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.auth_user_id, paperId]);

  const saveNavigationState = useCallback(
    async (immediate = false) => {
      if (!user?.auth_user_id || !paperId || !autoSave) return;

      if (immediate) {
        setIsSaving(true);
      }

      try {
        await QuestionNavigationService.saveNavigationState(user.auth_user_id, paperId, {
          currentPositionId: currentId,
          expandedItems: Array.from(expandedItems),
          filterSettings: filter,
        });
      } catch (error) {
        console.error('Error saving navigation state:', error);
      } finally {
        if (immediate) {
          setIsSaving(false);
        }
      }
    },
    [user?.auth_user_id, paperId, currentId, expandedItems, filter, autoSave]
  );

  const handleNavigate = useCallback(
    (id: string) => {
      setCurrentId(id);
      if (autoSave) {
        saveNavigationState();
      }
    },
    [autoSave, saveNavigationState]
  );

  const handleFilterChange = useCallback(
    (newFilter: NavigationFilter) => {
      setFilter(newFilter);
      if (autoSave) {
        saveNavigationState();
      }
    },
    [autoSave, saveNavigationState]
  );

  const updateQuestionStatus = useCallback(
    async (itemId: string, itemType: 'question' | 'subquestion', status: Partial<QuestionStatus>) => {
      if (!paperId) return;

      try {
        await QuestionNavigationService.updateReviewProgress(
          paperId,
          itemId,
          itemType,
          status,
          user?.auth_user_id
        );

        setStatusData((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(itemId) || {
            isComplete: false,
            needsAttachment: false,
            hasError: false,
            inProgress: false,
            validationIssues: [],
          };
          newMap.set(itemId, { ...existing, ...status });
          return newMap;
        });
      } catch (error) {
        console.error('Error updating question status:', error);
      }
    },
    [paperId, user?.auth_user_id]
  );

  const updateAttachmentStatus = useCallback(
    async (
      itemId: string,
      itemType: 'question' | 'subquestion',
      required: number,
      figureRequired: boolean
    ) => {
      if (!paperId) return;

      try {
        await QuestionNavigationService.updateAttachmentTracking(
          paperId,
          itemId,
          itemType,
          required,
          figureRequired
        );

        const attachmentMap = await QuestionNavigationService.getAttachmentTracking(paperId);
        setAttachmentData(attachmentMap);
      } catch (error) {
        console.error('Error updating attachment status:', error);
      }
    },
    [paperId]
  );

  const syncProgress = useCallback(async () => {
    if (!paperId || !questions.length || !autoSync) return;

    try {
      await QuestionNavigationService.syncProgressFromQuestions(paperId, questions);
      await QuestionNavigationService.initializeAttachmentTracking(paperId, questions);

      const [statusMap, attachmentMap] = await Promise.all([
        QuestionNavigationService.getReviewProgress(paperId),
        QuestionNavigationService.getAttachmentTracking(paperId),
      ]);

      setStatusData(statusMap);
      setAttachmentData(attachmentMap);
    } catch (error) {
      console.error('Error syncing progress:', error);
    }
  }, [paperId, questions, autoSync]);

  const refreshData = useCallback(async () => {
    if (!paperId) return;

    try {
      const [statusMap, attachmentMap] = await Promise.all([
        QuestionNavigationService.getReviewProgress(paperId),
        QuestionNavigationService.getAttachmentTracking(paperId),
      ]);

      setStatusData(statusMap);
      setAttachmentData(attachmentMap);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [paperId]);

  useEffect(() => {
    loadNavigationState();
  }, [loadNavigationState]);

  useEffect(() => {
    if (questions.length > 0 && autoSync) {
      syncProgress();
    }
  }, [questions.length, autoSync, syncProgress]);

  useEffect(() => {
    if (!autoSave) return;

    const timeoutId = setTimeout(() => {
      saveNavigationState();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [currentId, expandedItems, filter, autoSave, saveNavigationState]);

  return {
    currentId,
    expandedItems,
    filter,
    statusData,
    attachmentData,
    isLoading,
    isSaving,
    handleNavigate,
    handleFilterChange,
    updateQuestionStatus,
    updateAttachmentStatus,
    syncProgress,
    refreshData,
    saveNavigationState: () => saveNavigationState(true),
  };
}
