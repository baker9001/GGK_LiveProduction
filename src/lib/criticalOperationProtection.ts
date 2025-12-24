/**
 * File: /src/lib/criticalOperationProtection.ts
 *
 * Critical Operation Protection with Fail-Safe Cleanup
 * Ensures critical operation flags are ALWAYS cleaned up, even on errors
 *
 * CRITICAL SECURITY FIX: Prevents orphaned flags from blocking session checks indefinitely
 */

import { STORAGE_KEYS, CRITICAL_OPERATION_FLAG_TIMEOUT_MS } from './sessionConfig';
import { startGracePeriod } from './sessionGracePeriod';

/**
 * Critical Operation Metadata
 */
interface CriticalOperationMetadata {
  operationName: string;
  startTime: number;
  timeout: number;
}

/**
 * Check if a critical operation is in progress
 */
export function isCriticalOperationInProgress(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const criticalOp = sessionStorage.getItem(STORAGE_KEYS.CRITICAL_OPERATION);
    const startTimeStr = sessionStorage.getItem(STORAGE_KEYS.CRITICAL_OPERATION_START_TIME);

    if (!criticalOp) return false;

    // Check if operation has timed out (SECURITY: prevent orphaned flags)
    if (startTimeStr) {
      const startTime = parseInt(startTimeStr, 10);
      if (!isNaN(startTime)) {
        const elapsed = Date.now() - startTime;
        if (elapsed > CRITICAL_OPERATION_FLAG_TIMEOUT_MS) {
          console.warn(
            `[CriticalOperation] Operation "${criticalOp}" timed out after ` +
              `${Math.round(elapsed / 1000)}s. Auto-cleaning up orphaned flag.`
          );
          forceCleanupCriticalOperation();
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error('[CriticalOperation] Error checking critical operation status:', error);
    return false;
  }
}

/**
 * Get current critical operation name
 */
export function getCurrentCriticalOperation(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return sessionStorage.getItem(STORAGE_KEYS.CRITICAL_OPERATION);
  } catch (error) {
    return null;
  }
}

/**
 * Start a critical operation
 * Returns cleanup function that MUST be called
 */
function startCriticalOperation(operationName: string): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  try {
    const now = Date.now();

    // Store operation metadata
    sessionStorage.setItem(STORAGE_KEYS.CRITICAL_OPERATION, operationName);
    sessionStorage.setItem(STORAGE_KEYS.CRITICAL_OPERATION_START_TIME, now.toString());

    console.log(`[CriticalOperation] Started: ${operationName}`);

    // Set up automatic timeout cleanup (fail-safe)
    const timeoutId = setTimeout(() => {
      const current = sessionStorage.getItem(STORAGE_KEYS.CRITICAL_OPERATION);
      if (current === operationName) {
        console.warn(
          `[CriticalOperation] Auto-cleaning up "${operationName}" after timeout ` +
            `(${CRITICAL_OPERATION_FLAG_TIMEOUT_MS / 1000}s)`
        );
        forceCleanupCriticalOperation();
      }
    }, CRITICAL_OPERATION_FLAG_TIMEOUT_MS);

    // Return cleanup function
    return () => {
      clearTimeout(timeoutId);
      cleanupCriticalOperation(operationName);
    };
  } catch (error) {
    console.error('[CriticalOperation] Error starting critical operation:', error);
    return () => {};
  }
}

/**
 * Clean up critical operation flag
 */
function cleanupCriticalOperation(operationName: string): void {
  if (typeof window === 'undefined') return;

  try {
    const current = sessionStorage.getItem(STORAGE_KEYS.CRITICAL_OPERATION);

    // Only clean up if this is the current operation
    if (current === operationName) {
      sessionStorage.removeItem(STORAGE_KEYS.CRITICAL_OPERATION);
      sessionStorage.removeItem(STORAGE_KEYS.CRITICAL_OPERATION_START_TIME);
      console.log(`[CriticalOperation] Cleaned up: ${operationName}`);
    }
  } catch (error) {
    console.error('[CriticalOperation] Error cleaning up critical operation:', error);
  }
}

/**
 * Force cleanup of critical operation (used for orphaned flags)
 */
export function forceCleanupCriticalOperation(): void {
  if (typeof window === 'undefined') return;

  try {
    const operationName = sessionStorage.getItem(STORAGE_KEYS.CRITICAL_OPERATION);
    sessionStorage.removeItem(STORAGE_KEYS.CRITICAL_OPERATION);
    sessionStorage.removeItem(STORAGE_KEYS.CRITICAL_OPERATION_START_TIME);

    if (operationName) {
      console.log(`[CriticalOperation] Force cleaned up: ${operationName}`);
    }
  } catch (error) {
    console.error('[CriticalOperation] Error force cleaning up:', error);
  }
}

/**
 * Higher-order function to wrap critical operations with protection
 * GUARANTEES cleanup even if operation throws an error
 *
 * @example
 * ```typescript
 * await withCriticalOperationProtection(
 *   'Importing questions',
 *   async () => {
 *     // Your critical operation here
 *     await importQuestions(data);
 *   }
 * );
 * ```
 */
export async function withCriticalOperationProtection<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const cleanup = startCriticalOperation(operationName);

  try {
    const result = await operation();
    return result;
  } catch (error) {
    console.error(`[CriticalOperation] Operation "${operationName}" failed:`, error);
    throw error;
  } finally {
    // CRITICAL: Cleanup is guaranteed to run even if operation throws
    cleanup();
  }
}

/**
 * Synchronous version of withCriticalOperationProtection
 */
export function withCriticalOperationProtectionSync<T>(
  operationName: string,
  operation: () => T
): T {
  const cleanup = startCriticalOperation(operationName);

  try {
    const result = operation();
    return result;
  } catch (error) {
    console.error(`[CriticalOperation] Operation "${operationName}" failed:`, error);
    throw error;
  } finally {
    // CRITICAL: Cleanup is guaranteed to run even if operation throws
    cleanup();
  }
}

/**
 * Wrap a critical operation that involves page reload
 * Marks deliberate reload and starts grace period
 */
export async function withCriticalOperationAndReload<T>(
  operationName: string,
  reloadReason: string,
  operation: () => Promise<T>
): Promise<T> {
  const cleanup = startCriticalOperation(operationName);

  try {
    // Start grace period for the reload
    startGracePeriod(reloadReason as any);

    const result = await operation();
    return result;
  } catch (error) {
    console.error(`[CriticalOperation] Operation "${operationName}" with reload failed:`, error);
    throw error;
  } finally {
    cleanup();
  }
}

/**
 * Clean up orphaned critical operation flags on app initialization
 */
export function cleanupOrphanedCriticalOperations(): void {
  if (typeof window === 'undefined') return;

  try {
    const criticalOp = sessionStorage.getItem(STORAGE_KEYS.CRITICAL_OPERATION);
    const startTimeStr = sessionStorage.getItem(STORAGE_KEYS.CRITICAL_OPERATION_START_TIME);

    if (criticalOp && startTimeStr) {
      const startTime = parseInt(startTimeStr, 10);
      const elapsed = Date.now() - startTime;

      // If flag is older than timeout, it's orphaned
      if (!isNaN(startTime) && elapsed > CRITICAL_OPERATION_FLAG_TIMEOUT_MS) {
        console.warn(
          `[CriticalOperation] Found orphaned flag "${criticalOp}" ` +
            `(age: ${Math.round(elapsed / 1000)}s). Cleaning up.`
        );
        forceCleanupCriticalOperation();
      }
    }
  } catch (error) {
    console.error('[CriticalOperation] Error cleaning up orphaned flags:', error);
  }
}

/**
 * Set up page unload listener to clean up critical operation flags
 * Prevents flags from persisting across page reloads
 */
export function setupCriticalOperationUnloadHandler(): void {
  if (typeof window === 'undefined') return;

  const handleUnload = () => {
    const criticalOp = sessionStorage.getItem(STORAGE_KEYS.CRITICAL_OPERATION);
    if (criticalOp) {
      console.log(`[CriticalOperation] Page unload detected, clearing flag: ${criticalOp}`);
      forceCleanupCriticalOperation();
    }
  };

  window.addEventListener('beforeunload', handleUnload);
  window.addEventListener('pagehide', handleUnload);

  console.log('[CriticalOperation] Unload handlers registered');
}

/**
 * Get critical operation status for debugging
 */
export function getCriticalOperationStatus(): {
  isActive: boolean;
  operationName: string | null;
  startTime: number | null;
  elapsedMs: number;
  remainingMs: number;
} {
  if (typeof window === 'undefined') {
    return {
      isActive: false,
      operationName: null,
      startTime: null,
      elapsedMs: 0,
      remainingMs: 0
    };
  }

  try {
    const operationName = sessionStorage.getItem(STORAGE_KEYS.CRITICAL_OPERATION);
    const startTimeStr = sessionStorage.getItem(STORAGE_KEYS.CRITICAL_OPERATION_START_TIME);

    if (!operationName) {
      return {
        isActive: false,
        operationName: null,
        startTime: null,
        elapsedMs: 0,
        remainingMs: 0
      };
    }

    const startTime = startTimeStr ? parseInt(startTimeStr, 10) : null;
    const elapsedMs = startTime ? Date.now() - startTime : 0;
    const remainingMs = Math.max(0, CRITICAL_OPERATION_FLAG_TIMEOUT_MS - elapsedMs);

    return {
      isActive: true,
      operationName,
      startTime,
      elapsedMs,
      remainingMs
    };
  } catch (error) {
    console.error('[CriticalOperation] Error getting status:', error);
    return {
      isActive: false,
      operationName: null,
      startTime: null,
      elapsedMs: 0,
      remainingMs: 0
    };
  }
}

// Initialize on module load
if (typeof window !== 'undefined') {
  // Clean up any orphaned flags from previous sessions
  cleanupOrphanedCriticalOperations();

  // Set up unload handlers
  setupCriticalOperationUnloadHandler();
}
