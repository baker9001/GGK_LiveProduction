/**
 * File: /src/lib/sessionHelpers.ts
 *
 * Helper utilities for session management throughout the application
 */

import { extendSession, isUserActive } from './sessionManager';
import { getSessionRemainingTime } from './auth';
import { withLongOperationTracking } from './longOperationManager';

/**
 * Wrap a file upload with session tracking
 */
export async function uploadFileWithSessionTracking(
  file: File,
  uploadFn: (file: File, onProgress: (progress: number) => void) => Promise<any>
): Promise<any> {
  const estimatedDuration = Math.max(file.size / 100000, 60000); // Estimate based on file size

  return withLongOperationTracking(
    `Uploading ${file.name}`,
    estimatedDuration,
    async (updateProgress) => {
      return await uploadFn(file, updateProgress);
    }
  );
}

/**
 * Wrap a bulk import operation with session tracking
 */
export async function bulkImportWithSessionTracking<T>(
  items: T[],
  importFn: (items: T[], onProgress: (progress: number) => void) => Promise<any>,
  operationName: string = 'Bulk Import'
): Promise<any> {
  const estimatedDuration = Math.max(items.length * 1000, 120000); // Estimate: 1 second per item, minimum 2 minutes

  return withLongOperationTracking(
    operationName,
    estimatedDuration,
    async (updateProgress) => {
      return await importFn(items, updateProgress);
    }
  );
}

/**
 * Wrap report generation with session tracking
 */
export async function generateReportWithSessionTracking(
  reportFn: (onProgress: (progress: number) => void) => Promise<any>,
  reportName: string = 'Report'
): Promise<any> {
  return withLongOperationTracking(
    `Generating ${reportName}`,
    3 * 60 * 1000, // Estimate: 3 minutes
    async (updateProgress) => {
      return await reportFn(updateProgress);
    }
  );
}

/**
 * Check if session needs extension and show warning if necessary
 */
export function checkAndWarnSession(): boolean {
  const remainingMinutes = getSessionRemainingTime();

  if (remainingMinutes <= 5 && remainingMinutes > 0) {
    console.warn(`[SessionHelper] Session expiring in ${remainingMinutes} minutes`);
    return true;
  }

  return false;
}

/**
 * Extend session if user is active
 */
export function extendIfActive(): boolean {
  if (isUserActive()) {
    extendSession();
    return true;
  }
  return false;
}

/**
 * Get user-friendly session status message
 */
export function getSessionStatusMessage(): string {
  const remainingMinutes = getSessionRemainingTime();

  if (remainingMinutes === 0) {
    return 'Session expired';
  }

  if (remainingMinutes <= 5) {
    return `Session expiring in ${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'}`;
  }

  if (remainingMinutes < 60) {
    return `Session expires in ${remainingMinutes} minutes`;
  }

  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  if (minutes === 0) {
    return `Session expires in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }

  return `Session expires in ${hours}h ${minutes}m`;
}
