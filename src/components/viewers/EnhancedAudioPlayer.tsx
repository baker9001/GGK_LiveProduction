import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Music, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { MaterialFileService } from '../../services/materialFileService';

interface EnhancedAudioPlayerProps {
  fileUrl: string;
  title: string;
  mimeType?: string;
  autoPlay?: boolean;
  onError?: (error: string) => void;
}

export const EnhancedAudioPlayer: React.FC<EnhancedAudioPlayerProps> = ({
  fileUrl,
  title,
  mimeType = 'audio/mpeg',
  autoPlay = false,
  onError,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  const fetchSignedUrl = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (fileUrl.startsWith('http')) {
        setSignedUrl(fileUrl);
        return;
      }

      const result = await MaterialFileService.getSignedUrl(fileUrl, 'materials_files', {
        expiresIn: 7200,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setSignedUrl(result.url);
      setExpiresAt(result.expiresAt);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load audio';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  useEffect(() => {
    fetchSignedUrl();
  }, [fileUrl]);

  useEffect(() => {
    if (!expiresAt) return;

    const refreshTime = new Date(expiresAt.getTime() - 5 * 60 * 1000);
    const timeUntilRefresh = refreshTime.getTime() - Date.now();

    if (timeUntilRefresh <= 0) {
      fetchSignedUrl();
      return;
    }

    const refreshTimer = setTimeout(() => {
      fetchSignedUrl();
    }, timeUntilRefresh);

    return () => clearTimeout(refreshTimer);
  }, [expiresAt]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setError('Failed to load audio file');
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [signedUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(duration, audio.currentTime + 10);
  };

  const changePlaybackRate = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const formatTime = (time: number): string => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (error && !signedUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Unable to Load Audio
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={fetchSignedUrl}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!signedUrl && isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <Loader2 className="h-16 w-16 text-emerald-600 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Loading Audio
          </h3>
          <p className="text-gray-600 dark:text-gray-400">Preparing secure playback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-8">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="mb-8">
          <div className="w-48 h-48 mx-auto bg-gradient-to-br from-emerald-600 to-teal-600 rounded-full flex items-center justify-center shadow-xl">
            <Music className={`h-24 w-24 text-white ${isPlaying ? 'animate-pulse' : ''}`} />
          </div>
        </div>

        <h3 className="text-center text-2xl font-bold mb-2 text-gray-900 dark:text-white truncate">
          {title}
        </h3>

        <div className="mb-6">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
            disabled={isLoading || !signedUrl}
          />
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={skipBackward}
            className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Skip backward 10s"
            disabled={isLoading || !signedUrl}
          >
            <SkipBack className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </button>

          <button
            onClick={togglePlayPause}
            className="p-5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg"
            disabled={isLoading || !signedUrl}
          >
            {isPlaying ? (
              <Pause className="h-8 w-8 text-white fill-current" />
            ) : (
              <Play className="h-8 w-8 text-white fill-current ml-1" />
            )}
          </button>

          <button
            onClick={skipForward}
            className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Skip forward 10s"
            disabled={isLoading || !signedUrl}
          >
            <SkipForward className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={toggleMute}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Volume2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Speed:</span>
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => changePlaybackRate(rate)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  playbackRate === rate
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {isLoading && signedUrl && (
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading audio...</p>
          </div>
        )}

        {signedUrl && (
          <audio
            ref={audioRef}
            src={signedUrl}
            preload="metadata"
            autoPlay={autoPlay}
            controlsList="nodownload"
          >
            <source src={signedUrl} type={mimeType} />
            Your browser does not support audio playback.
          </audio>
        )}
      </div>

      <style>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider-thumb::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider-thumb:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default EnhancedAudioPlayer;
