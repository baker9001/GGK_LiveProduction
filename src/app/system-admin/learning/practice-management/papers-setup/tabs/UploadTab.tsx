// src/app/system-admin/learning/practice-management/papers-setup/tabs/UploadTab.tsx

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle as CircleCheck, AlertCircle, FileText, ArrowRight, Trash2, RefreshCw, Loader2, FileJson } from 'lucide-react';
import { supabase } from '../../../../../../lib/supabase';
import { FileUploader } from '../../../../../../components/shared/FileUploader';
import { ScrollNavigator } from '../../../../../../components/shared/ScrollNavigator';
import { ProgressBar } from '../../../../../../components/shared/ProgressBar';
import { Button } from '../../../../../../components/shared/Button';
import { toast } from '../../../../../../components/shared/Toast';
import { recordUserActivity } from '../../../../../../lib/sessionManager';

interface UploadTabProps {
  onFileSelected: (file: File) => void;
  uploadedFile: File | null;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  parsedData: any;
  onSelectPreviousSession: (session: any) => void;
  importSession: any;
  onNavigateToTab: (tabId: string, options?: { message?: string }) => void;
}

export function UploadTab({
  onFileSelected,
  uploadedFile,
  isUploading,
  uploadProgress,
  error,
  parsedData,
  onSelectPreviousSession,
  importSession,
  onNavigateToTab
}: UploadTabProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const continueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Handle file selection
  const handleFileSelected = async (file: File, content: string | ArrayBuffer | null) => {
    if (typeof content === 'string') {
      try {
        // Validate JSON before proceeding
        JSON.parse(content);
        onFileSelected(file);
      } catch (err) {
        toast.error('Invalid JSON file. Please check the file format.');
      }
    }
  };
  
  // Delete current session and start new
  const handleDeleteSession = async () => {
    if (!importSession) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('past_paper_import_sessions')
        .update({ status: 'failed' })
        .eq('id', importSession.id);

      if (error) throw error;

      // Clear URL parameters before reload to ensure fresh start
      const cleanUrl = window.location.pathname;
      window.history.replaceState(null, '', cleanUrl);

      // CRITICAL FIX: Record user activity before page reload to prevent session expiry
      recordUserActivity();
      console.log('[UploadTab] Activity recorded before page reload');

      // Reload page to start fresh
      window.location.reload();
    } catch (err) {
      console.error('Error deleting session:', err);
      toast.error('Failed to delete session');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Continue with existing session
  const handleContinueSession = () => {
    if (!importSession) return;

    setIsContinuing(true);

    const clearLoader = () => {
      if (continueTimeoutRef.current) {
        clearTimeout(continueTimeoutRef.current);
      }

      continueTimeoutRef.current = setTimeout(() => {
        setIsContinuing(false);
        continueTimeoutRef.current = null;
      }, 1200);
    };

    // Navigate to the appropriate tab based on session state
    const params = new URLSearchParams(window.location.search);

    if (importSession.metadata?.questions_imported) {
      params.set('tab', 'questions');
      onNavigateToTab('questions', { message: 'Restoring your questions review...' });
    } else if (importSession.metadata?.metadata_complete) {
      params.set('tab', 'questions');
      onNavigateToTab('questions', { message: 'Loading your saved metadata...' });
    } else if (importSession.metadata?.structure_complete) {
      params.set('tab', 'metadata');
      onNavigateToTab('metadata', { message: 'Preparing paper metadata...' });
    } else {
      params.set('tab', 'structure');
      onNavigateToTab('structure', { message: 'Reopening academic structure...' });
    }

    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);

    clearLoader();
  };

  // Refresh session data
  const handleRefreshSession = () => {
    // CRITICAL FIX: Record user activity before page reload to prevent session expiry
    recordUserActivity();
    console.log('[UploadTab] Activity recorded before page reload');

    window.location.reload();
  };

  useEffect(() => {
    return () => {
      if (continueTimeoutRef.current) {
        clearTimeout(continueTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Upload Past Paper JSON
      </h2>
      
      {/* Show resuming session banner if we have an existing session and file */}
      {importSession && uploadedFile && !error && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start">
            <CircleCheck className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Your Import Session In Progress
              </h3>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                You have an active import session for <strong>{uploadedFile.name}</strong>.
                You can continue from where you left off or start a new import. Other users can work on their own imports simultaneously.
              </p>
              
              {/* Show session details */}
              <div className="mt-3 text-xs text-blue-600 dark:text-blue-500 space-y-1">
                <p>Session ID: {importSession.id}</p>
                <p>Created: {new Date(importSession.created_at).toLocaleString()}</p>
                {parsedData && (
                  <>
                    <p>Paper: {parsedData.paper_code || 'Unknown'}</p>
                    <p>Questions: {parsedData.questions?.length || 0}</p>
                  </>
                )}
              </div>
              
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  size="sm"
                  leftIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={handleContinueSession}
                  disabled={isContinuing}
                >
                  {isContinuing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resuming...
                    </>
                  ) : (
                    'Continue Import'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                  onClick={handleRefreshSession}
                >
                  Refresh
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                >
                  Start New Import
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                Confirm Delete Session
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                Are you sure you want to delete the current import session and start over? 
                This action cannot be undone.
              </p>
              <div className="mt-3 flex space-x-3">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteSession}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Yes, Delete & Start New'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                Error
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* File uploader - only show if no existing session or there's an error */}
      {(!importSession || !uploadedFile || error) && !showDeleteConfirm && (
        <div className="space-y-4">
          {/* Upload instructions */}
          {!importSession && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
              <h3 className="text-md font-medium text-blue-800 dark:text-blue-300 mb-2">
                JSON Upload Instructions
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                Please upload a JSON file containing past paper questions and metadata. The system will:
              </p>
              <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-400 space-y-1 ml-2 mb-2">
                <li>Extract metadata (year, session, subject, etc.)</li>
                <li>Parse question data and structure</li>
                <li>Check for duplicate imports</li>
                <li>Save the full JSON for future reference</li>
              </ul>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <strong>Note:</strong> Only JSON files are supported. PDF uploads are no longer required.
              </p>
            </div>
          )}
          
          <FileUploader
            accept=".json"
            onFileSelected={handleFileSelected}
            maxSize={10} // 10MB
            readAsText={true}
            buttonText="Select Past Paper JSON File"
            disabled={isUploading}
          />
          
          {isUploading && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Uploading...</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{uploadProgress}%</span>
              </div>
              <ProgressBar value={uploadProgress} color="blue" />
            </div>
          )}
        </div>
      )}
      
      {/* File preview - enhanced with session info */}
      {uploadedFile && !error && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-start">
            <FileJson className="h-8 w-8 text-blue-500 dark:text-blue-400 mr-3 flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {uploadedFile.name}
              </h3>
              {parsedData && (
                <div className="mt-2 space-y-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div><span className="font-medium">Paper Code:</span> {parsedData.paper_code || 'N/A'}</div>
                      <div><span className="font-medium">Subject:</span> {parsedData.subject || 'N/A'}</div>
                      <div><span className="font-medium">Session:</span> {parsedData.exam_session || 'N/A'}</div>
                      <div><span className="font-medium">Year:</span> {parsedData.exam_year || 'N/A'}</div>
                      <div><span className="font-medium">Exam Board:</span> {parsedData.exam_board || 'N/A'}</div>
                      <div><span className="font-medium">Questions:</span> {parsedData.questions?.length || 0}</div>
                    </div>
                  </div>
                  
                  {/* Show completion status */}
                  {importSession && (
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Import Progress:
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-center text-xs">
                          <CircleCheck className={cn(
                            "h-3 w-3 mr-2",
                            "text-green-500"
                          )} />
                          <span className="text-gray-600 dark:text-gray-400">File uploaded</span>
                        </div>
                        <div className="flex items-center text-xs">
                          <CircleCheck className={cn(
                            "h-3 w-3 mr-2",
                            importSession.metadata?.structure_complete 
                              ? "text-green-500" 
                              : "text-gray-300 dark:text-gray-600"
                          )} />
                          <span className="text-gray-600 dark:text-gray-400">
                            Academic structure {importSession.metadata?.structure_complete ? 'configured' : 'pending'}
                          </span>
                        </div>
                        <div className="flex items-center text-xs">
                          <CircleCheck className={cn(
                            "h-3 w-3 mr-2",
                            importSession.metadata?.metadata_complete 
                              ? "text-green-500" 
                              : "text-gray-300 dark:text-gray-600"
                          )} />
                          <span className="text-gray-600 dark:text-gray-400">
                            Paper metadata {importSession.metadata?.metadata_complete ? 'saved' : 'pending'}
                          </span>
                        </div>
                        <div className="flex items-center text-xs">
                          <CircleCheck className={cn(
                            "h-3 w-3 mr-2",
                            importSession.metadata?.questions_imported 
                              ? "text-green-500" 
                              : "text-gray-300 dark:text-gray-600"
                          )} />
                          <span className="text-gray-600 dark:text-gray-400">
                            Questions {importSession.metadata?.questions_imported ? 'imported' : 'pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Navigation buttons */}
      {importSession && uploadedFile && !error && (
        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleContinueSession}
            rightIcon={<ArrowRight className="h-4 w-4 ml-1" />}
            disabled={isContinuing}
          >
            {isContinuing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing next step...
              </>
            ) : (
              'Continue to Next Step'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// Helper function for className concatenation
function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}