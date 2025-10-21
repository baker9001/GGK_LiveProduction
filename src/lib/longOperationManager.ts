/**
 * File: /src/lib/longOperationManager.ts
 *
 * Manages long-running operations with session awareness
 * Automatically shows activity confirmation dialogs and extends sessions
 */

import { extendSession } from './sessionManager';
import { getSessionRemainingTime } from './auth';

export interface LongOperation {
  id: string;
  name: string;
  estimatedDuration: number; // in milliseconds
  startTime: number;
  progress: number;
  onCancel?: () => void;
}

// Operation tracking
const activeOperations = new Map<string, LongOperation>();
let currentOperationId: string | null = null;

// Event for triggering activity confirmation dialog
export const LONG_OPERATION_CONFIRMATION_EVENT = 'ggk-long-operation-confirmation';

// Thresholds
const LONG_OPERATION_THRESHOLD = 2 * 60 * 1000; // 2 minutes
const SESSION_CHECK_DURING_OPERATION = 30000; // Check every 30 seconds during operations

/**
 * Start tracking a long-running operation
 */
export function startLongOperation(
  name: string,
  estimatedDuration: number,
  onCancel?: () => void
): string {
  const operationId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const operation: LongOperation = {
    id: operationId,
    name,
    estimatedDuration,
    startTime: Date.now(),
    progress: 0,
    onCancel
  };

  activeOperations.set(operationId, operation);
  currentOperationId = operationId;

  console.log(`[LongOperationManager] Started operation: ${name} (${operationId})`);

  // If operation will take longer than threshold, set up monitoring
  if (estimatedDuration >= LONG_OPERATION_THRESHOLD) {
    setupOperationMonitoring(operationId);
  }

  return operationId;
}

/**
 * Update operation progress
 */
export function updateOperationProgress(operationId: string, progress: number): void {
  const operation = activeOperations.get(operationId);
  if (!operation) return;

  operation.progress = Math.min(100, Math.max(0, progress));
  console.log(`[LongOperationManager] Operation ${operationId} progress: ${progress}%`);
}

/**
 * Complete an operation
 */
export function completeOperation(operationId: string): void {
  const operation = activeOperations.get(operationId);
  if (!operation) return;

  console.log(`[LongOperationManager] Completed operation: ${operation.name}`);
  activeOperations.delete(operationId);

  if (currentOperationId === operationId) {
    currentOperationId = null;
  }
}

/**
 * Cancel an operation
 */
export function cancelOperation(operationId: string): void {
  const operation = activeOperations.get(operationId);
  if (!operation) return;

  console.log(`[LongOperationManager] Cancelled operation: ${operation.name}`);

  if (operation.onCancel) {
    operation.onCancel();
  }

  activeOperations.delete(operationId);

  if (currentOperationId === operationId) {
    currentOperationId = null;
  }
}

/**
 * Get current active operation
 */
export function getCurrentOperation(): LongOperation | null {
  if (!currentOperationId) return null;
  return activeOperations.get(currentOperationId) || null;
}

/**
 * Check if any long operations are active
 */
export function hasActiveLongOperations(): boolean {
  return activeOperations.size > 0;
}

/**
 * Set up monitoring for a long operation
 */
function setupOperationMonitoring(operationId: string): void {
  const checkInterval = setInterval(() => {
    const operation = activeOperations.get(operationId);
    if (!operation) {
      clearInterval(checkInterval);
      return;
    }

    // Check if operation is complete
    if (operation.progress >= 100) {
      clearInterval(checkInterval);
      completeOperation(operationId);
      return;
    }

    // Check session status
    const remainingMinutes = getSessionRemainingTime();

    // If session will expire during operation, show confirmation
    if (remainingMinutes <= 5 && remainingMinutes > 0) {
      showActivityConfirmation(operation);
    }

    // If session expired, cancel operation
    if (remainingMinutes === 0) {
      console.warn(`[LongOperationManager] Session expired during operation: ${operation.name}`);
      cancelOperation(operationId);
      clearInterval(checkInterval);
    }
  }, SESSION_CHECK_DURING_OPERATION);
}

/**
 * Show activity confirmation dialog
 */
function showActivityConfirmation(operation: LongOperation): void {
  console.log(`[LongOperationManager] Requesting activity confirmation for: ${operation.name}`);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LONG_OPERATION_CONFIRMATION_EVENT, {
      detail: {
        operationId: operation.id,
        operationName: operation.name,
        progress: operation.progress
      }
    }));
  }
}

/**
 * Handle activity confirmation
 */
export function confirmActivity(operationId: string): void {
  const operation = activeOperations.get(operationId);
  if (!operation) return;

  console.log(`[LongOperationManager] Activity confirmed for: ${operation.name}`);

  // Extend session
  extendSession();
}

/**
 * Wrapper for long-running async operations
 */
export async function withLongOperationTracking<T>(
  name: string,
  estimatedDuration: number,
  operation: (updateProgress: (progress: number) => void) => Promise<T>,
  onCancel?: () => void
): Promise<T> {
  const operationId = startLongOperation(name, estimatedDuration, onCancel);

  try {
    const result = await operation((progress: number) => {
      updateOperationProgress(operationId, progress);
    });

    completeOperation(operationId);
    return result;
  } catch (error) {
    console.error(`[LongOperationManager] Operation failed: ${name}`, error);
    cancelOperation(operationId);
    throw error;
  }
}

/**
 * Clean up all operations
 */
export function cleanupAllOperations(): void {
  console.log('[LongOperationManager] Cleaning up all operations');
  activeOperations.clear();
  currentOperationId = null;
}
