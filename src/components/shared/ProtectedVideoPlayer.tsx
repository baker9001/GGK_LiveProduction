import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../contexts/UserContext';

interface ProtectedVideoPlayerProps {
  materialId: string;
  title: string;
  mimeType?: string;
  onError?: (error: string) => void;
  className?: string;
}

interface SignedUrlResponse {
  signedUrl: string;
  expiresAt: string;
  expiresIn: number;
  title: string;
}

export const ProtectedVideoPlayer: React.FC<ProtectedVideoPlayerProps> = ({
  materialId,
  title,
  mimeType = 'video/mp4',
  onError,
  className = '',
}) => {
  const { user } = useUser();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);

  // Fetch signed URL for video
  const fetchVideoUrl = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[ProtectedVideoPlayer] Fetching signed URL for material:', materialId);

      const { data: session } = await supabase.auth.getSession();

      if (!session?.session?.access_token) {
        throw new Error('Not authenticated. Please sign in to view this video.');
      }

      const { data, error: funcError } = await supabase.functions.invoke(
        'generate-signed-video-url',
        {
          body: { materialId },
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
          },
        }
      );

      if (funcError) {
        console.error('[ProtectedVideoPlayer] Function error:', funcError);
        throw new Error(funcError.message || 'Failed to load video');
      }

      if (!data?.signedUrl) {
        throw new Error('Invalid response from server');
      }

      const response = data as SignedUrlResponse;

      console.log('[ProtectedVideoPlayer] Signed URL received, expires at:', response.expiresAt);

      setVideoUrl(response.signedUrl);
      setExpiresAt(new Date(response.expiresAt));
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load video';
      console.error('[ProtectedVideoPlayer] Error:', errorMessage);
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchVideoUrl();
  }, [materialId]);

  // Auto-refresh URL before expiration (refresh 5 minutes before expiry)
  useEffect(() => {
    if (!expiresAt) return;

    const refreshTime = new Date(expiresAt.getTime() - 5 * 60 * 1000); // 5 minutes before
    const timeUntilRefresh = refreshTime.getTime() - Date.now();

    if (timeUntilRefresh <= 0) {
      // URL is about to expire or already expired, refresh now
      fetchVideoUrl();
      return;
    }

    console.log('[ProtectedVideoPlayer] Setting refresh timer for', timeUntilRefresh / 1000, 'seconds');

    const refreshTimer = setTimeout(() => {
      console.log('[ProtectedVideoPlayer] Auto-refreshing URL');
      fetchVideoUrl();
    }, timeUntilRefresh);

    return () => clearTimeout(refreshTimer);
  }, [expiresAt]);

  // Prevent right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  // Detect visibility changes (possible screen recording)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && videoRef.current && !videoRef.current.paused) {
        console.log('[ProtectedVideoPlayer] Window hidden while playing - pausing video');
        videoRef.current.pause();

        // Log suspicious activity
        logSuspiciousActivity('window_hidden_while_playing');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Track play events
  const handlePlay = () => {
    setIsPlaying(true);
    setPlayCount((prev) => prev + 1);

    // Log excessive replays
    if (playCount > 5) {
      logSuspiciousActivity('excessive_replays');
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  // Log suspicious activities
  const logSuspiciousActivity = async (activityType: string) => {
    try {
      if (!user?.id) return;

      await supabase.from('suspicious_activities').insert({
        user_id: user.id,
        material_id: materialId,
        activity_type: activityType,
        severity: 'medium',
        details: {
          play_count: playCount,
          timestamp: new Date().toISOString(),
        },
        ip_address: 'client_detected',
        detected_at: new Date().toISOString(),
      });

      console.log('[ProtectedVideoPlayer] Logged suspicious activity:', activityType);
    } catch (err) {
      console.error('[ProtectedVideoPlayer] Failed to log suspicious activity:', err);
    }
  };

  // Disable keyboard shortcuts that could be used for downloading
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent Ctrl+S, Ctrl+Shift+S (save shortcuts)
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      return false;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mb-4" />
        <p className="text-lg">Loading secure video...</p>
        <p className="text-sm text-gray-400 mt-2">Verifying your access permissions</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold mb-2">Unable to Load Video</p>
        <p className="text-sm text-gray-400 text-center max-w-md">{error}</p>
        <button
          onClick={fetchVideoUrl}
          className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} onKeyDown={handleKeyDown}>
      {/* Security Badge */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        <span className="text-xs text-white font-medium">Protected Content</span>
      </div>

      {/* Watermark Overlay */}
      {user?.email && (
        <div className="absolute top-4 left-4 z-10 opacity-40 text-white text-xs pointer-events-none bg-black/30 px-2 py-1 rounded">
          Licensed to: {user.email}
        </div>
      )}

      {/* Video Player */}
      <div className="flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          controls
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          disableRemotePlayback
          onContextMenu={handleContextMenu}
          onPlay={handlePlay}
          onPause={handlePause}
          className="max-w-full max-h-full"
          autoPlay={false}
          preload="metadata"
        >
          {videoUrl && <source src={videoUrl} type={mimeType} />}
          Your browser does not support video playback.
        </video>
      </div>

      {/* Expiration Warning */}
      {expiresAt && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-black/70 backdrop-blur-sm text-white text-xs px-3 py-2 rounded">
            Session expires: {expiresAt.toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProtectedVideoPlayer;
