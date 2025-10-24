import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CalendarConflictService, type ConflictCheckParams, type ConflictCheck } from '../services/calendarConflictService';

export function useConflictDetection(params: ConflictCheckParams | null, autoCheck: boolean = true) {
  const [isChecking, setIsChecking] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictCheck | null>(null);

  const checkConflicts = useCallback(async () => {
    if (!params) return;

    setIsChecking(true);
    try {
      const result = await CalendarConflictService.checkConflicts(params);
      setConflictData(result);
    } catch (error) {
      console.error('Error checking conflicts:', error);
      setConflictData({
        hasConflicts: false,
        conflicts: [],
        warnings: [],
      });
    } finally {
      setIsChecking(false);
    }
  }, [params]);

  useEffect(() => {
    if (autoCheck && params) {
      // Debounce conflict checking
      const timeoutId = setTimeout(() => {
        checkConflicts();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [autoCheck, params, checkConflicts]);

  return {
    conflictData,
    isChecking,
    checkConflicts,
    hasConflicts: conflictData?.hasConflicts || false,
    conflicts: conflictData?.conflicts || [],
    warnings: conflictData?.warnings || [],
  };
}

export function useBusyTimeSlots(date: string | null, schoolIds: string[]) {
  return useQuery({
    queryKey: ['busyTimeSlots', date, schoolIds],
    queryFn: () => {
      if (!date) throw new Error('Date is required');
      return CalendarConflictService.getBusyTimeSlots(date, schoolIds);
    },
    enabled: !!date && schoolIds.length > 0,
  });
}

export function useSuggestAlternatives() {
  return useMutation({
    mutationFn: (params: ConflictCheckParams) =>
      CalendarConflictService.suggestAlternatives(params),
  });
}
