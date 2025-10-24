/**
 * File: /src/hooks/useLongOperation.ts
 *
 * React hook for managing long-running operations with session awareness
 */

import { useState, useCallback } from 'react';
import {
  startLongOperation,
  updateOperationProgress,
  completeOperation,
  cancelOperation,
  withLongOperationTracking
} from '../lib/longOperationManager';

export interface UseLongOperationOptions {
  onCancel?: () => void;
  onComplete?: () => void;
  onError?: (error: any) => void;
}

export function useLongOperation(
  operationName: string,
  estimatedDuration: number,
  options: UseLongOperationOptions = {}
) {
  const [operationId, setOperationId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<any>(null);

  const startOperation = useCallback(() => {
    const id = startLongOperation(
      operationName,
      estimatedDuration,
      () => {
        setIsRunning(false);
        setOperationId(null);
        options.onCancel?.();
      }
    );

    setOperationId(id);
    setIsRunning(true);
    setProgress(0);
    setError(null);

    return id;
  }, [operationName, estimatedDuration, options]);

  const updateProgress = useCallback((newProgress: number) => {
    if (operationId) {
      updateOperationProgress(operationId, newProgress);
      setProgress(newProgress);
    }
  }, [operationId]);

  const complete = useCallback(() => {
    if (operationId) {
      completeOperation(operationId);
      setIsRunning(false);
      setOperationId(null);
      setProgress(100);
      options.onComplete?.();
    }
  }, [operationId, options]);

  const cancel = useCallback(() => {
    if (operationId) {
      cancelOperation(operationId);
      setIsRunning(false);
      setOperationId(null);
      options.onCancel?.();
    }
  }, [operationId, options]);

  const executeOperation = useCallback(async <T,>(
    operation: (updateProgress: (progress: number) => void) => Promise<T>
  ): Promise<T | null> => {
    try {
      setIsRunning(true);
      setProgress(0);
      setError(null);

      const result = await withLongOperationTracking(
        operationName,
        estimatedDuration,
        operation,
        options.onCancel
      );

      setProgress(100);
      setIsRunning(false);
      options.onComplete?.();

      return result;
    } catch (err) {
      console.error('[useLongOperation] Operation failed:', err);
      setError(err);
      setIsRunning(false);
      options.onError?.(err);
      return null;
    }
  }, [operationName, estimatedDuration, options]);

  return {
    startOperation,
    updateProgress,
    complete,
    cancel,
    executeOperation,
    isRunning,
    progress,
    error,
    operationId
  };
}
