import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import { FileText, Download, AlertCircle, Loader2 } from 'lucide-react';
import { fetchWithAuth, AuthenticatedFetchError } from '../../lib/utils/authenticatedFetch';
import { MaterialFileService } from '../../services/materialFileService';

interface WordDocumentViewerProps {
  fileUrl: string;
  title: string;
  onError?: (error: string) => void;
}

export const WordDocumentViewer: React.FC<WordDocumentViewerProps> = ({
  fileUrl,
  title,
  onError,
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [fileUrl]);

  const loadDocument = async () => {
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

      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          styleMap: [
            "p[style-name='Heading 1'] => h1.document-heading-1",
            "p[style-name='Heading 2'] => h2.document-heading-2",
            "p[style-name='Heading 3'] => h3.document-heading-3",
            "p[style-name='Title'] => h1.document-title",
            "p[style-name='Subtitle'] => h2.document-subtitle",
            "r[style-name='Strong'] => strong",
            "r[style-name='Emphasis'] => em",
          ],
          convertImage: mammoth.images.imgElement((image) => {
            return image.read('base64').then((imageBuffer) => {
              return {
                src: `data:${image.contentType};base64,${imageBuffer}`,
              };
            });
          }),
        }
      );

      if (result.messages.length > 0) {
        console.warn('Document conversion warnings:', result.messages);
      }

      setHtmlContent(result.value);
      setLoading(false);
    } catch (err) {
      console.error('Error loading Word document:', err);

      let errorMessage = 'Failed to load document';

      if (err instanceof AuthenticatedFetchError) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setUseFallback(false);
      setLoading(false);

      if (onError) {
        onError(errorMessage);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900 p-8">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading Word document...</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Converting to readable format</p>
      </div>
    );
  }


  if (error) {
    const handleDownload = async () => {
      try {
        await MaterialFileService.downloadFile(fileUrl, title);
      } catch (error) {
        console.error('Download failed:', error);
      }
    };

    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900 p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Unable to Load Document
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md">
          {error}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={loadDocument}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
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
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 md:p-12">
            <div
              className="word-document-content prose prose-sm md:prose-base dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              style={{
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                lineHeight: '1.6',
                color: 'inherit',
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        .word-document-content {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .word-document-content h1.document-heading-1 {
          font-size: 2em;
          font-weight: bold;
          margin-top: 0.67em;
          margin-bottom: 0.67em;
          color: #1a202c;
        }

        .dark .word-document-content h1.document-heading-1 {
          color: #f7fafc;
        }

        .word-document-content h2.document-heading-2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-top: 0.83em;
          margin-bottom: 0.83em;
          color: #2d3748;
        }

        .dark .word-document-content h2.document-heading-2 {
          color: #e2e8f0;
        }

        .word-document-content h3.document-heading-3 {
          font-size: 1.17em;
          font-weight: bold;
          margin-top: 1em;
          margin-bottom: 1em;
          color: #4a5568;
        }

        .dark .word-document-content h3.document-heading-3 {
          color: #cbd5e0;
        }

        .word-document-content h1.document-title {
          font-size: 2.5em;
          font-weight: bold;
          text-align: center;
          margin-bottom: 0.5em;
          color: #1a202c;
        }

        .dark .word-document-content h1.document-title {
          color: #f7fafc;
        }

        .word-document-content h2.document-subtitle {
          font-size: 1.3em;
          font-weight: normal;
          text-align: center;
          margin-bottom: 1em;
          color: #4a5568;
        }

        .dark .word-document-content h2.document-subtitle {
          color: #a0aec0;
        }

        .word-document-content p {
          margin-top: 1em;
          margin-bottom: 1em;
          line-height: 1.6;
        }

        .word-document-content img {
          max-width: 100%;
          height: auto;
          margin: 1em 0;
          border-radius: 0.5rem;
        }

        .word-document-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }

        .word-document-content table td,
        .word-document-content table th {
          border: 1px solid #e2e8f0;
          padding: 0.5em;
        }

        .dark .word-document-content table td,
        .dark .word-document-content table th {
          border-color: #4a5568;
        }

        .word-document-content table th {
          background-color: #f7fafc;
          font-weight: bold;
        }

        .dark .word-document-content table th {
          background-color: #2d3748;
        }

        .word-document-content ul,
        .word-document-content ol {
          margin: 1em 0;
          padding-left: 2em;
        }

        .word-document-content li {
          margin: 0.5em 0;
        }

        .word-document-content strong {
          font-weight: bold;
        }

        .word-document-content em {
          font-style: italic;
        }

        .word-document-content a {
          color: #3182ce;
          text-decoration: underline;
        }

        .dark .word-document-content a {
          color: #63b3ed;
        }

        .word-document-content blockquote {
          border-left: 4px solid #e2e8f0;
          padding-left: 1em;
          margin: 1em 0;
          color: #4a5568;
        }

        .dark .word-document-content blockquote {
          border-left-color: #4a5568;
          color: #a0aec0;
        }
      `}</style>
    </div>
  );
};

export default WordDocumentViewer;
