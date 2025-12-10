import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, Download, RefreshCw } from 'lucide-react';
import { renderAsync } from 'docx-preview';
import { fetchWithAuth, AuthenticatedFetchError } from '../../lib/utils/authenticatedFetch';
import { MaterialFileService } from '../../services/materialFileService';

interface EnhancedDocxViewerProps {
  fileUrl: string;
  title: string;
  onError?: (error: string) => void;
}

export const EnhancedDocxViewer: React.FC<EnhancedDocxViewerProps> = ({
  fileUrl,
  title,
  onError,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDocument();

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [fileUrl]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!containerRef.current) {
        throw new Error('Container not initialized');
      }

      containerRef.current.innerHTML = '';

      let urlToFetch = fileUrl;

      if (!fileUrl.startsWith('http')) {
        const signedUrlResult = await MaterialFileService.getDocumentSignedUrl(fileUrl);

        if (signedUrlResult.error) {
          throw new Error(signedUrlResult.error);
        }

        urlToFetch = signedUrlResult.url;
      }

      const arrayBuffer = await fetchWithAuth(urlToFetch);

      const blob = new Blob([arrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      await renderAsync(blob, containerRef.current, undefined, {
        className: 'docx-preview-wrapper',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: false,
        experimental: false,
        trimXmlDeclaration: true,
        useBase64URL: false,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
      });

      setLoading(false);
    } catch (err) {
      console.error('Error loading DOCX document:', err);

      let errorMessage = 'Failed to load document';

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

  const handleDownload = async () => {
    try {
      await MaterialFileService.downloadFile(fileUrl, title);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900 p-8">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading Word document...</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          Using enhanced DOCX viewer
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900 p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Unable to Load Document
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md">{error}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={loadDocument}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
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

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-800">
        <div className="max-w-5xl mx-auto py-8">
          <div
            ref={containerRef}
            className="docx-container bg-white dark:bg-gray-900 shadow-lg"
            style={{
              minHeight: '100%',
              padding: '0',
            }}
          />
        </div>
      </div>

      <style>{`
        .docx-preview-wrapper {
          background: white;
          padding: 0;
        }

        .dark .docx-preview-wrapper {
          background: #1a202c;
          color: #e2e8f0;
        }

        .docx-container {
          font-family: 'Calibri', 'Arial', sans-serif;
        }

        .docx-wrapper {
          background: white !important;
          padding: 40px !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin: 20px;
        }

        .dark .docx-wrapper {
          background: #1a202c !important;
          color: #e2e8f0 !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .docx-wrapper section.docx {
          background: white;
          padding: 0;
          margin-bottom: 0;
        }

        .dark .docx-wrapper section.docx {
          background: #1a202c;
          color: #e2e8f0;
        }

        .docx-wrapper p {
          margin: 0.5em 0;
          line-height: 1.6;
        }

        .dark .docx-wrapper p {
          color: #e2e8f0;
        }

        .docx-wrapper table {
          border-collapse: collapse;
          margin: 1em 0;
        }

        .docx-wrapper table td,
        .docx-wrapper table th {
          border: 1px solid #ddd;
          padding: 8px;
        }

        .dark .docx-wrapper table td,
        .dark .docx-wrapper table th {
          border-color: #4a5568;
        }

        .docx-wrapper img {
          max-width: 100%;
          height: auto;
        }
      `}</style>
    </div>
  );
};

export default EnhancedDocxViewer;
