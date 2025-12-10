import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Download, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { fetchWithAuth, AuthenticatedFetchError } from '../../lib/utils/authenticatedFetch';
import { MaterialFileService } from '../../services/materialFileService';

interface ExcelViewerProps {
  fileUrl: string;
  title: string;
  onError?: (error: string) => void;
}

export const ExcelViewer: React.FC<ExcelViewerProps> = ({ fileUrl, title, onError }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    loadSpreadsheet();
  }, [fileUrl]);

  useEffect(() => {
    if (workbook && workbook.SheetNames.length > 0) {
      renderSheet(currentSheetIndex);
    }
  }, [currentSheetIndex, workbook]);

  const loadSpreadsheet = async () => {
    try {
      setLoading(true);
      setError(null);

      let urlToFetch = fileUrl;

      if (!fileUrl.startsWith('http')) {
        const signedUrlResult = await MaterialFileService.getDocumentSignedUrl(fileUrl);

        if (signedUrlResult.error) {
          throw new Error(signedUrlResult.error);
        }

        urlToFetch = signedUrlResult.url;
      }

      const arrayBuffer = await fetchWithAuth(urlToFetch);

      const wb = XLSX.read(arrayBuffer, {
        type: 'array',
        cellStyles: true,
        cellDates: true,
      });

      setWorkbook(wb);
      setCurrentSheetIndex(0);
      setLoading(false);
    } catch (err) {
      console.error('Error loading Excel file:', err);

      let errorMessage = 'Failed to load spreadsheet';

      if (err instanceof AuthenticatedFetchError) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setLoading(false);

      if (onError) {
        onError(errorMessage);
      }
    }
  };

  const renderSheet = (sheetIndex: number) => {
    if (!workbook || !workbook.SheetNames[sheetIndex]) {
      return;
    }

    const sheetName = workbook.SheetNames[sheetIndex];
    const worksheet = workbook.Sheets[sheetName];

    const html = XLSX.utils.sheet_to_html(worksheet, {
      id: 'excel-table',
      editable: false,
    });

    setHtmlContent(html);
  };

  const handleDownload = async () => {
    try {
      await MaterialFileService.downloadFile(fileUrl, title);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const goToPreviousSheet = () => {
    if (currentSheetIndex > 0) {
      setCurrentSheetIndex(currentSheetIndex - 1);
    }
  };

  const goToNextSheet = () => {
    if (workbook && currentSheetIndex < workbook.SheetNames.length - 1) {
      setCurrentSheetIndex(currentSheetIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900 p-8">
        <Loader2 className="h-12 w-12 animate-spin text-green-600 dark:text-green-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading spreadsheet...</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Parsing Excel file</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900 p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Unable to Load Spreadsheet
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md">{error}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={loadSpreadsheet}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>
    );
  }

  if (!workbook) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Sheet Navigation */}
      {workbook.SheetNames.length > 1 && (
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
          <button
            onClick={goToPreviousSheet}
            disabled={currentSheetIndex === 0}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous Sheet"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>

          <div className="flex items-center gap-2 overflow-x-auto">
            {workbook.SheetNames.map((sheetName, index) => (
              <button
                key={index}
                onClick={() => setCurrentSheetIndex(index)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  index === currentSheetIndex
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {sheetName}
              </button>
            ))}
          </div>

          <button
            onClick={goToNextSheet}
            disabled={currentSheetIndex === workbook.SheetNames.length - 1}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next Sheet"
          >
            <ChevronRight className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      )}

      {/* Spreadsheet Content */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-4">
        <div
          className="excel-content bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-auto"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>

      <style>{`
        .excel-content table {
          border-collapse: collapse;
          width: 100%;
          font-family: 'Arial', sans-serif;
          font-size: 14px;
        }

        .excel-content table th,
        .excel-content table td {
          border: 1px solid #d1d5db;
          padding: 8px 12px;
          text-align: left;
          min-width: 100px;
        }

        .dark .excel-content table th,
        .dark .excel-content table td {
          border-color: #4b5563;
          color: #e5e7eb;
        }

        .excel-content table th {
          background-color: #f3f4f6;
          font-weight: 600;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .dark .excel-content table th {
          background-color: #374151;
        }

        .excel-content table tr:nth-child(even) {
          background-color: #f9fafb;
        }

        .dark .excel-content table tr:nth-child(even) {
          background-color: #1f2937;
        }

        .excel-content table tr:hover {
          background-color: #f3f4f6;
        }

        .dark .excel-content table tr:hover {
          background-color: #374151;
        }

        .excel-content table td[data-t='n'] {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .excel-content table td[data-t='b'] {
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default ExcelViewer;
