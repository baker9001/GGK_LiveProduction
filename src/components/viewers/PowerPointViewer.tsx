import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Download, RefreshCw, ChevronLeft, ChevronRight, Presentation, Maximize2, Minimize2 } from 'lucide-react';
import JSZip from 'jszip';
import { fetchWithAuth, AuthenticatedFetchError } from '../../lib/utils/authenticatedFetch';
import { MaterialFileService } from '../../services/materialFileService';

interface PowerPointViewerProps {
  fileUrl: string;
  title: string;
  onError?: (error: string) => void;
}

interface SlideInfo {
  id: string;
  content: string;
  imageData?: string;
}

export const PowerPointViewer: React.FC<PowerPointViewerProps> = ({
  fileUrl,
  title,
  onError,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slides, setSlides] = useState<SlideInfo[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useGoogleViewer, setUseGoogleViewer] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    loadPresentation();
  }, [fileUrl]);

  const loadPresentation = async () => {
    try {
      setLoading(true);
      setError(null);
      setSlides([]);

      let urlToFetch = fileUrl;

      if (!fileUrl.startsWith('http')) {
        const signedUrlResult = await MaterialFileService.getDocumentSignedUrl(fileUrl);

        if (signedUrlResult.error) {
          throw new Error(signedUrlResult.error);
        }

        urlToFetch = signedUrlResult.url;
        setSignedUrl(signedUrlResult.url);
      } else {
        setSignedUrl(fileUrl);
      }

      const arrayBuffer = await fetchWithAuth(urlToFetch);
      const zip = await JSZip.loadAsync(arrayBuffer);

      const slideFiles = Object.keys(zip.files)
        .filter(name => name.match(/ppt\/slides\/slide\d+\.xml$/))
        .sort((a, b) => {
          const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
          const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
          return numA - numB;
        });

      if (slideFiles.length === 0) {
        setUseGoogleViewer(true);
        setLoading(false);
        return;
      }

      const extractedSlides: SlideInfo[] = [];

      for (let i = 0; i < slideFiles.length; i++) {
        const slideFile = slideFiles[i];
        const slideXml = await zip.file(slideFile)?.async('string');

        if (slideXml) {
          const textContent = extractTextFromXml(slideXml);

          const slideNum = slideFile.match(/slide(\d+)\.xml/)?.[1] || String(i + 1);
          const imageFile = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
          let imageData: string | undefined;

          const relsFile = zip.file(imageFile);
          if (relsFile) {
            const relsXml = await relsFile.async('string');
            const imageMatch = relsXml.match(/Target="\.\.\/media\/([^"]+)"/);
            if (imageMatch) {
              const imagePath = `ppt/media/${imageMatch[1]}`;
              const imageFileData = zip.file(imagePath);
              if (imageFileData) {
                const base64 = await imageFileData.async('base64');
                const ext = imageMatch[1].split('.').pop()?.toLowerCase();
                const mimeType = ext === 'png' ? 'image/png' :
                               ext === 'gif' ? 'image/gif' :
                               ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
                imageData = `data:${mimeType};base64,${base64}`;
              }
            }
          }

          extractedSlides.push({
            id: `slide-${i}`,
            content: textContent,
            imageData,
          });
        }
      }

      if (extractedSlides.length === 0) {
        setUseGoogleViewer(true);
      } else {
        setSlides(extractedSlides);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading PowerPoint:', err);

      let errorMessage = 'Failed to load presentation';
      if (err instanceof AuthenticatedFetchError) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setUseGoogleViewer(true);
      setLoading(false);

      if (onError) {
        onError(errorMessage);
      }
    }
  };

  const extractTextFromXml = (xml: string): string => {
    const textParts: string[] = [];
    const textMatches = xml.matchAll(/<a:t>([^<]*)<\/a:t>/g);

    for (const match of textMatches) {
      if (match[1].trim()) {
        textParts.push(match[1]);
      }
    }

    return textParts.join('\n');
  };

  const handleDownload = async () => {
    try {
      await MaterialFileService.downloadFile(fileUrl, title);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const goToPreviousSlide = () => {
    setCurrentSlide(prev => Math.max(0, prev - 1));
  };

  const goToNextSlide = () => {
    setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPreviousSlide();
      } else if (e.key === 'ArrowRight') {
        goToNextSlide();
      } else if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900 p-8">
        <Loader2 className="h-12 w-12 animate-spin text-orange-600 dark:text-orange-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading presentation...</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Extracting slides</p>
      </div>
    );
  }

  if (useGoogleViewer && signedUrl) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Presentation className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <span className="font-medium text-gray-900 dark:text-white truncate">{title}</span>
          </div>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
        <div className="flex-1">
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`}
            className="w-full h-full border-0"
            title="PowerPoint Viewer"
          />
        </div>
      </div>
    );
  }

  if (error && slides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900 p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Unable to Load Presentation
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md">{error}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={loadPresentation}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors inline-flex items-center gap-2"
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

  if (slides.length === 0) {
    return null;
  }

  const currentSlideData = slides[currentSlide];

  return (
    <div className={`h-full flex flex-col bg-white dark:bg-gray-900 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousSlide}
            disabled={currentSlide === 0}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous Slide (Left Arrow)"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>

          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Slide {currentSlide + 1} of {slides.length}
          </span>

          <button
            onClick={goToNextSlide}
            disabled={currentSlide === slides.length - 1}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next Slide (Right Arrow)"
          >
            <ChevronRight className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            ) : (
              <Maximize2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            )}
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Download"
          >
            <Download className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900 p-4 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl aspect-video flex flex-col overflow-hidden">
          {currentSlideData.imageData ? (
            <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
              <img
                src={currentSlideData.imageData}
                alt={`Slide ${currentSlide + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="flex-1 p-8 overflow-auto bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-900">
              <div className="text-center mb-4">
                <Presentation className="h-12 w-12 mx-auto text-orange-600 dark:text-orange-400 mb-2" />
                <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  Slide {currentSlide + 1}
                </span>
              </div>
              <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap text-lg leading-relaxed">
                {currentSlideData.content || 'No text content on this slide'}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700">
        <div className="flex gap-2 overflow-x-auto py-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => setCurrentSlide(index)}
              className={`flex-shrink-0 w-24 h-16 rounded-lg border-2 transition-all overflow-hidden ${
                index === currentSlide
                  ? 'border-orange-600 ring-2 ring-orange-200 dark:ring-orange-800'
                  : 'border-gray-200 dark:border-gray-700 hover:border-orange-400'
              }`}
            >
              {slide.imageData ? (
                <img
                  src={slide.imageData}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                  <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                    {index + 1}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PowerPointViewer;
