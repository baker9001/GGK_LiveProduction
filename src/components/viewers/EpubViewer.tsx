import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, Download, RefreshCw, ChevronLeft, ChevronRight, Book, List, Maximize2, Minimize2, Sun, Moon } from 'lucide-react';
import JSZip from 'jszip';
import { fetchWithAuth, AuthenticatedFetchError } from '../../lib/utils/authenticatedFetch';
import { MaterialFileService } from '../../services/materialFileService';

interface EpubViewerProps {
  fileUrl: string;
  title: string;
  onError?: (error: string) => void;
}

interface TocItem {
  title: string;
  href: string;
}

interface ChapterContent {
  id: string;
  title: string;
  content: string;
}

export const EpubViewer: React.FC<EpubViewerProps> = ({
  fileUrl,
  title,
  onError,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<ChapterContent[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadEpub();
  }, [fileUrl]);

  const loadEpub = async () => {
    try {
      setLoading(true);
      setError(null);
      setChapters([]);

      let urlToFetch = fileUrl;

      if (!fileUrl.startsWith('http')) {
        const signedUrlResult = await MaterialFileService.getDocumentSignedUrl(fileUrl);
        if (signedUrlResult.error) {
          throw new Error(signedUrlResult.error);
        }
        urlToFetch = signedUrlResult.url;
      }

      const arrayBuffer = await fetchWithAuth(urlToFetch);
      const zip = await JSZip.loadAsync(arrayBuffer);

      const containerXml = await zip.file('META-INF/container.xml')?.async('string');
      if (!containerXml) {
        throw new Error('Invalid EPUB: Missing container.xml');
      }

      const rootfileMatch = containerXml.match(/rootfile[^>]+full-path="([^"]+)"/);
      if (!rootfileMatch) {
        throw new Error('Invalid EPUB: Cannot find rootfile');
      }

      const opfPath = rootfileMatch[1];
      const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
      const opfContent = await zip.file(opfPath)?.async('string');

      if (!opfContent) {
        throw new Error('Invalid EPUB: Cannot read OPF file');
      }

      const manifestItems: Record<string, { href: string; mediaType: string }> = {};
      const manifestMatches = opfContent.matchAll(/<item[^>]+id="([^"]+)"[^>]+href="([^"]+)"[^>]*media-type="([^"]+)"[^>]*\/?>/g);

      for (const match of manifestMatches) {
        manifestItems[match[1]] = {
          href: match[2],
          mediaType: match[3]
        };
      }

      const spineItems: string[] = [];
      const spineMatches = opfContent.matchAll(/<itemref[^>]+idref="([^"]+)"[^>]*\/?>/g);

      for (const match of spineMatches) {
        spineItems.push(match[1]);
      }

      const extractedChapters: ChapterContent[] = [];

      for (let i = 0; i < spineItems.length; i++) {
        const itemId = spineItems[i];
        const item = manifestItems[itemId];

        if (item && (item.mediaType.includes('html') || item.mediaType.includes('xml'))) {
          const chapterPath = opfDir + item.href;
          const chapterContent = await zip.file(chapterPath)?.async('string');

          if (chapterContent) {
            const titleMatch = chapterContent.match(/<title>([^<]*)<\/title>/i);
            const chapterTitle = titleMatch?.[1] || `Chapter ${i + 1}`;

            let processedContent = chapterContent
              .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<\/?html[^>]*>/gi, '')
              .replace(/<\/?body[^>]*>/gi, '');

            processedContent = processedContent.replace(
              /src="([^"]+)"/g,
              (match, src) => {
                if (src.startsWith('http') || src.startsWith('data:')) {
                  return match;
                }
                return `src="data:image/png;base64,placeholder"`;
              }
            );

            extractedChapters.push({
              id: itemId,
              title: chapterTitle,
              content: processedContent
            });
          }
        }
      }

      if (extractedChapters.length === 0) {
        throw new Error('No readable content found in EPUB');
      }

      setChapters(extractedChapters);
      setToc(extractedChapters.map((ch, idx) => ({
        title: ch.title,
        href: `#chapter-${idx}`
      })));

      setLoading(false);
    } catch (err) {
      console.error('Error loading EPUB:', err);

      let errorMessage = 'Failed to load e-book';
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

  const goToPreviousChapter = () => {
    setCurrentChapterIndex(prev => Math.max(0, prev - 1));
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNextChapter = () => {
    setCurrentChapterIndex(prev => Math.min(chapters.length - 1, prev + 1));
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToChapter = (index: number) => {
    setCurrentChapterIndex(index);
    setShowToc(false);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPreviousChapter();
      } else if (e.key === 'ArrowRight') {
        goToNextChapter();
      } else if (e.key === 'Escape') {
        setIsFullscreen(false);
        setShowToc(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chapters.length]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-amber-50 dark:bg-gray-900 p-8">
        <Loader2 className="h-12 w-12 animate-spin text-amber-600 dark:text-amber-400 mb-4" />
        <p className="text-gray-700 dark:text-gray-300">Loading e-book...</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Extracting chapters</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-amber-50 dark:bg-gray-900 p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Unable to Load E-Book
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md">{error}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={loadEpub}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors inline-flex items-center gap-2"
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

  if (chapters.length === 0) {
    return null;
  }

  const currentChapter = chapters[currentChapterIndex];

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-amber-50'} ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <div className={`flex items-center justify-between p-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowToc(!showToc)}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            title="Table of Contents"
          >
            <List className="h-5 w-5" />
          </button>

          <button
            onClick={goToPreviousChapter}
            disabled={currentChapterIndex === 0}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            title="Previous Chapter"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {currentChapterIndex + 1} / {chapters.length}
          </span>

          <button
            onClick={goToNextChapter}
            disabled={currentChapterIndex === chapters.length - 1}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            title="Next Chapter"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2">
            <button
              onClick={() => setFontSize(prev => Math.max(12, prev - 2))}
              className={`px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
              title="Decrease font size"
            >
              A-
            </button>
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{fontSize}px</span>
            <button
              onClick={() => setFontSize(prev => Math.min(24, prev + 2))}
              className={`px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
              title="Increase font size"
            >
              A+
            </button>
          </div>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            title={isDarkMode ? 'Light mode' : 'Dark mode'}
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>

          <button
            onClick={handleDownload}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            title="Download"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {showToc && (
          <div className={`w-72 border-r overflow-auto ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Contents</h3>
            </div>
            <nav className="p-2">
              {toc.map((item, index) => (
                <button
                  key={index}
                  onClick={() => goToChapter(index)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    index === currentChapterIndex
                      ? isDarkMode
                        ? 'bg-amber-600/20 text-amber-400'
                        : 'bg-amber-100 text-amber-800'
                      : isDarkMode
                        ? 'text-gray-300 hover:bg-gray-700'
                        : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.title}
                </button>
              ))}
            </nav>
          </div>
        )}

        <div
          ref={contentRef}
          className={`flex-1 overflow-auto p-8 ${isDarkMode ? 'bg-gray-900' : 'bg-amber-50'}`}
        >
          <div className={`max-w-3xl mx-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-8`}>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <Book className={`h-6 w-6 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {currentChapter.title}
              </h2>
            </div>
            <div
              className={`prose max-w-none ${isDarkMode ? 'prose-invert' : ''}`}
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
              dangerouslySetInnerHTML={{ __html: currentChapter.content }}
            />
          </div>
        </div>
      </div>

      <div className={`p-3 border-t ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex justify-between items-center">
          <button
            onClick={goToPreviousChapter}
            disabled={currentChapterIndex === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDarkMode
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Previous Chapter
          </button>

          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {currentChapter.title}
          </span>

          <button
            onClick={goToNextChapter}
            disabled={currentChapterIndex === chapters.length - 1}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDarkMode
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            Next Chapter
          </button>
        </div>
      </div>
    </div>
  );
};

export default EpubViewer;
