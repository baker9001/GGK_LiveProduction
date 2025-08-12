import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2, RefreshCw, Database, Info } from 'lucide-react';
import { supabase } from '../../../../../../lib/supabase';
import { Button } from '../../../../../../components/shared/Button';
import { PaperMetadataForm } from './PaperMetadataForm';

interface PaperMetadataLoaderProps {
  importSession?: any;
  parsedData?: any;
  onPaperFound: (paperId: string) => void;
  onPrevious: () => void;
  onContinue: () => void;
}

export function PaperMetadataLoader({
  importSession,
  parsedData,
  onPaperFound,
  onPrevious,
  onContinue
}: PaperMetadataLoaderProps) {
  // Helper function to extract field from parsedData with fallbacks
  const extractField = (fieldName: string, defaultValue: any = '') => {
    // First check in paper_metadata
    if (parsedData?.paper_metadata && parsedData.paper_metadata[fieldName] !== undefined) {
      return parsedData.paper_metadata[fieldName];
    }
    
    // Then check at root level
    if (parsedData && parsedData[fieldName] !== undefined) {
      return parsedData[fieldName];
    }
    
    // For subject, program, provider - check in first question
    if (['subject', 'program', 'provider'].includes(fieldName) && 
        parsedData?.questions && 
        parsedData.questions.length > 0 && 
        parsedData.questions[0][fieldName] !== undefined) {
      return parsedData.questions[0][fieldName];
    }
    
    // For subject, program, provider - check in question_analysis
    if (['subject', 'program', 'provider'].includes(fieldName) && 
        parsedData?.question_analysis && 
        parsedData.question_analysis.length > 0 && 
        parsedData.question_analysis[0][fieldName] !== undefined) {
      return parsedData.question_analysis[0][fieldName];
    }
    
    return defaultValue;
  };
  
  // Fetch data structures with explicit foreign key names
  const dataStructuresQuery = useQuery<any[]>(
    ['data-structures-for-metadata'],
    async () => { 
      try {
        console.log('Fetching data structures...');
        const { data, error } = await supabase
          .from('data_structures')
          .select(`
            id,
            region_id,
            program_id,
            provider_id,
            subject_id,
            regions (id, name),
            programs (id, name),
            providers (id, name),
            edu_subjects (id, name, code)
          `)
          .eq('status', 'active');

        if (error) {
          console.error('Data structures query error:', error, error.details, error.hint);
          throw new Error(`Failed to load academic structures: ${error.message}`);
        }
        
        console.log('Data structures fetched:', data?.length || 0);
        return data || [];
      } catch (error) {
        console.error('Error fetching data structures:', error);
        throw error;
      }
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      retryDelay: 1000,
    }
  );

  // Fetch paper details if we have an import session
  const paperDetailsQuery = useQuery(
    ['paper-details', importSession?.id],
    async (): Promise<any> => {
      if (!importSession?.id) return null;

      try {
        console.log('Fetching paper details for session:', importSession.id);
        const { data, error } = await supabase
          .from('papers_setup')
          .select('*')
          .eq('import_session_id', importSession.id)
          .maybeSingle();

        if (error) {
          console.error('Paper details query error:', error, error.details, error.hint);
          throw new Error(`Failed to load paper details: ${error.message}`);
        }
        
        console.log('Paper details fetched:', data ? 'found' : 'not found');
        return data;
      } catch (error) {
        console.error('Error fetching paper details:', error);
        throw error;
      }
    },
    {
      enabled: !!importSession?.id,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      retryDelay: 1000,
    }
  );

  // Determine if we're loading or have errors
  const isLoading = dataStructuresQuery.isLoading || (importSession?.id && paperDetailsQuery.isLoading);
  const error = dataStructuresQuery.error || paperDetailsQuery.error;

  // Handle retry for all queries
  const handleRetry = () => {
    dataStructuresQuery.refetch();
    if (importSession?.id) {
      paperDetailsQuery.refetch();
    }
  };

  // If loading, show spinner
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Paper Metadata
        </h2>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 text-blue-500 dark:text-blue-400 animate-spin mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-center">
            Loading paper metadata and academic structures...
          </p>
        </div>
      </div>
    );
  }

  // If error, show error message with retry button
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Paper Metadata
        </h2>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 my-4">
          <div className="flex items-start">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">
                Error Loading Data
              </h3>
              <div className="text-sm text-red-700 dark:text-red-400 mb-4">
                <p className="mb-2">{error instanceof Error ? error.message : 'An unknown error occurred'}</p>
                <p className="font-medium">Possible causes:</p>
                <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                  <li>Database connection issue or timeout</li>
                  <li>Foreign key constraint issues between tables</li>
                  <li>Missing or renamed columns in the database schema</li>
                </ul>
              </div>
              <div className="mt-4">
                <Button
                  onClick={handleRetry}
                  leftIcon={<RefreshCw className="h-4 w-4 mr-2" />}
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Database schema helper */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <Database className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                Database Schema Information
              </h3>
              <p className="text-xs text-blue-700 dark:text-blue-400 mb-2">
                The data structures query requires these relationships:
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-400 list-disc list-inside space-y-1">
                <li>data_structures.region_id → regions.id</li>
                <li>data_structures.program_id → programs.id</li>
                <li>data_structures.provider_id → providers.id</li>
                <li>data_structures.subject_id → edu_subjects.id</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Developer debug info - only shown in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Developer Debug Info</h4>
            <pre className="text-xs overflow-auto p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 max-h-60">
              {JSON.stringify({
                error: error instanceof Error ? {
                  message: error.message,
                  stack: error.stack
                } : String(error),
                dataStructuresState: dataStructuresQuery.status,
                paperDetailsState: paperDetailsQuery.status,
                importSessionId: importSession?.id,
                dataStructuresQueryKey: dataStructuresQuery.queryKey
              }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // If parsedData exists, show a summary of what was found
  if (parsedData) {
    const paperCode = extractField('paper_code');
    const examYear = extractField('exam_year') || extractField('year');
    const examSession = extractField('exam_session') || extractField('session');
    const duration = extractField('duration');
    const subject = extractField('subject');
    
    if (!paperCode || !examYear || !examSession) {
      console.warn('Missing required fields in parsed data:', { paperCode, examYear, examSession });
    }
  }
  
  // If data is loaded successfully, render the form
  return (
    <PaperMetadataForm
      dataStructures={dataStructuresQuery.data || []}
      paperDetails={paperDetailsQuery.data}
      importSession={importSession}
      parsedData={parsedData}
      onPaperFound={onPaperFound}
      onPrevious={onPrevious}
      onContinue={onContinue}
    />
  );
}