// src/app/system-admin/learning/practice-management/papers-setup/components/PreviousSessionsTable.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../../../lib/supabase';
import { DataTable } from '../../../../../../components/shared/DataTable';
import { StatusBadge } from '../../../../../../components/shared/StatusBadge';
import { Button } from '../../../../../../components/shared/Button';
import { Download, Eye, RefreshCw, Play, AlertCircle, FileJson, Hash } from 'lucide-react';
import { toast } from '../../../../../../components/shared/Toast';
import dayjs from 'dayjs';
import { ConfirmationDialog } from '../../../../../../components/shared/ConfirmationDialog';

interface ImportSession {
  id: string;
  created_at: string;
  status: 'in_progress' | 'completed' | 'failed';
  metadata: any;
  raw_json: any;
  paper_id: string | null;
  subject_id: string | null;
  year: number | null;
  json_file_name: string | null;
  json_hash: string | null;
  error_message: string | null;
  edu_subjects?: { name: string } | null;
  papers_setup?: { paper_code: string } | null;
}

interface PreviousSessionsTableProps {
  onSelectSession: (session: ImportSession) => void;
  currentSessionId?: string;
}

export function PreviousSessionsTable({ onSelectSession, currentSessionId }: PreviousSessionsTableProps) {
  const navigate = useNavigate();
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonToView, setJsonToView] = useState<any>(null);
  const [jsonFileName, setJsonFileName] = useState<string>('');
  
  const {
    data: sessions = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<ImportSession[]>(
    ['previous-import-sessions'],
    async () => {
      // Try with json_hash first
      let { data, error } = await supabase
        .from('past_paper_import_sessions')
        .select(
          `
          id,
          created_at,
          status,
          metadata,
          raw_json,
          paper_id,
          subject_id,
          year,
          json_file_name,
          json_hash,
          error_message,
          edu_subjects(name),
          papers_setup(paper_code)
        `
        )
        .order('created_at', { ascending: false })
        .limit(20);

      // If json_hash column doesn't exist, try without it
      if (error && error.message?.includes('json_hash')) {
        const fallbackResult = await supabase
          .from('past_paper_import_sessions')
          .select(
            `
            id,
            created_at,
            status,
            metadata,
            raw_json,
            paper_id,
            subject_id,
            year,
            json_file_name,
            error_message,
            edu_subjects(name),
            papers_setup(paper_code)
          `
          )
          .order('created_at', { ascending: false })
          .limit(20);
        
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) {
        console.error('Error fetching previous sessions:', error);
        toast.error('Failed to load previous import sessions');
        throw error;
      }

      // Add json_hash as null if not present
      return (data || []).map(session => ({
        ...session,
        json_hash: session.json_hash || null
      }));
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchOnWindowFocus: false,
    }
  );

  const handleViewJson = (session: ImportSession) => {
    if (!session.raw_json) {
      toast.error('No JSON data available for this session.');
      return;
    }
    
    setJsonToView(session.raw_json);
    setJsonFileName(getFileName(session));
    setShowJsonModal(true);
  };
  
  const getFileName = (session: ImportSession): string => {
    // Use stored file name if available
    if (session.json_file_name) {
      return session.json_file_name;
    }
    
    // Use stored file name in metadata if available
    if (session.metadata?.original_file_name) {
      return session.metadata.original_file_name;
    }
    
    // Generate a filename based on session data
    const paperCode = session.raw_json?.paper_code || session.papers_setup?.paper_code || 'unknown';
    const date = dayjs(session.created_at).format('YYYYMMDD_HHmmss');
    return `${paperCode}_${date}.json`;
  };
  
  const handleDownloadJson = (session: ImportSession) => {
    if (!session.raw_json) {
      toast.error('No JSON data available for this session.');
      return;
    }

    try {
      const jsonString = JSON.stringify(session.raw_json, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const fileName = getFileName(session);

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('JSON file downloaded successfully!');
    } catch (error) {
      console.error('Error downloading JSON:', error);
      toast.error('Failed to download JSON file.');
    }
  };

  const handleResumeSession = (session: ImportSession) => {
    onSelectSession(session);
  };
  
  const getSessionProgress = (session: ImportSession) => {
    const steps = [
      { key: 'upload', label: 'Uploaded', completed: true },
      { key: 'structure', label: 'Structure', completed: session.metadata?.structure_complete },
      { key: 'metadata', label: 'Metadata', completed: session.metadata?.metadata_complete },
      { key: 'questions', label: 'Questions', completed: session.metadata?.questions_imported },
    ];
    
    const completedSteps = steps.filter(s => s.completed).length;
    return `${completedSteps}/4`;
  };

  // Check for duplicate sessions
  const getDuplicateInfo = (session: ImportSession) => {
    if (!session.json_hash || !sessions) return null;
    
    const duplicates = sessions.filter(s => 
      s.json_hash && // Only compare if both have hashes
      s.json_hash === session.json_hash && 
      s.id !== session.id &&
      s.created_at < session.created_at
    );
    
    return duplicates.length > 0 ? duplicates[0] : null;
  };

  const columns = [
    {
      id: 'created_at',
      header: 'Date',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: ImportSession) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {dayjs(row.created_at).format('MMM D, YYYY HH:mm')}
        </span>
      ),
    },
    {
      id: 'file_name',
      header: 'JSON File',
      cell: (row: ImportSession) => {
        const duplicate = getDuplicateInfo(row);
        
        return (
          <div className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-gray-900 dark:text-gray-100 truncate max-w-[200px]" title={getFileName(row)}>
              {getFileName(row)}
            </span>
            {duplicate && (
              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400" title={`Duplicate of session from ${dayjs(duplicate.created_at).format('MMM D, YYYY HH:mm')}`}>
                <Hash className="h-3 w-3" />
                <span>Duplicate</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'subject',
      header: 'Subject',
      cell: (row: ImportSession) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.raw_json?.subject || row.edu_subjects?.name || 'N/A'}
        </span>
      ),
    },
    {
      id: 'paper_code',
      header: 'Paper Code',
      cell: (row: ImportSession) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.raw_json?.paper_code || row.papers_setup?.paper_code || 'N/A'}
        </span>
      ),
    },
    {
      id: 'year',
      header: 'Year',
      cell: (row: ImportSession) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.raw_json?.exam_year || row.year || 'N/A'}
        </span>
      ),
    },
    {
      id: 'progress',
      header: 'Progress',
      cell: (row: ImportSession) => {
        if (row.status === 'completed') {
          return <StatusBadge status="active" label="Completed" />;
        } else if (row.status === 'failed') {
          return <StatusBadge status="error" label="Failed" />;
        } else {
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {getSessionProgress(row)}
              </span>
              <StatusBadge status="pending" label="In Progress" />
            </div>
          );
        }
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row: ImportSession) => {
        const isCurrentSession = row.id === currentSessionId;
        
        return (
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Eye className="h-4 w-4" />}
              onClick={() => handleViewJson(row)}
              disabled={!row.raw_json}
              title="View JSON"
            >
              View
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => handleDownloadJson(row)}
              disabled={!row.raw_json}
              title="Download JSON"
            >
              Download
            </Button>
            <Button
              size="sm"
              variant={isCurrentSession ? "secondary" : "outline"}
              leftIcon={<Play className="h-4 w-4" />}
              onClick={() => handleResumeSession(row)}
              disabled={row.status === 'completed' || isCurrentSession}
              title={
                isCurrentSession ? 'Current session' :
                row.status === 'completed' ? 'Session already completed' : 
                'Resume import session'
              }
            >
              {isCurrentSession ? 'Current' : 'Resume'}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Recent import sessions. Identical files automatically use existing sessions.
          </p>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        
        <DataTable
          data={sessions}
          columns={columns}
          keyField="id"
          loading={isLoading}
          isFetching={isFetching}
          emptyMessage="No previous import sessions found."
          showPagination={sessions.length > 10}
          defaultPageSize={10}
        />
        
        {/* Show warning if there are many sessions */}
        {sessions.length >= 20 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Only showing the most recent 20 sessions. Older sessions are still available in the database.
            </p>
          </div>
        )}
      </div>
      
      {/* JSON View Modal */}
      <ConfirmationDialog
        isOpen={showJsonModal}
        title={`JSON Data: ${jsonFileName}`}
        message={
          <div className="max-h-[60vh] overflow-auto">
            <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
              {jsonToView ? JSON.stringify(jsonToView, null, 2) : 'No data available'}
            </pre>
          </div>
        }
        confirmText="Download"
        cancelText="Close"
        onConfirm={() => {
          if (jsonToView) {
            const jsonString = JSON.stringify(jsonToView, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = jsonFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('JSON file downloaded');
          }
          setShowJsonModal(false);
        }}
        onCancel={() => setShowJsonModal(false)}
        size="xl"
      />
    </>
  );
}