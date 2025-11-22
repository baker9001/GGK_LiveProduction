/**
 * Audio Recorder Component for Spoken Responses
 *
 * Uses HTML5 MediaRecorder API for audio recording.
 * Supports recording, playback, time limits, and re-recording.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Download,
  AlertCircle,
  Check,
  Volume2
} from 'lucide-react';
import Button from '@/components/shared/Button';
import { cn } from '@/lib/utils';
import { uploadAnswerAsset, formatFileSize } from '../utils/assetUpload';
import { validateAudioRecording } from '../utils/dataValidation';

export interface AudioRecording {
  id: string;
  url: string;
  path: string;
  duration: number; // seconds
  fileSize: number; // bytes
  recordedAt: string;
  waveformData?: number[]; // For visualization
}

interface AudioRecorderProps {
  questionId: string;
  value: AudioRecording | null;
  onChange: (recording: AudioRecording | null) => void;
  disabled?: boolean;
  maxDuration?: number; // seconds, default: 300 (5 min)
  minDuration?: number; // seconds, default: 10
  audioFormat?: 'audio/webm' | 'audio/mp4' | 'audio/ogg';
  studentId?: string;
  showCorrectAnswer?: boolean;
  correctAnswerUrl?: string;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  questionId,
  value,
  onChange,
  disabled = false,
  maxDuration = 300, // 5 minutes
  minDuration = 10,
  audioFormat = 'audio/webm',
  studentId = 'temp-user',
  showCorrectAnswer = false,
  correctAnswerUrl
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check microphone permission on mount
  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setMicPermission(result.state as 'granted' | 'denied' | 'prompt');

      result.onchange = () => {
        setMicPermission(result.state as 'granted' | 'denied' | 'prompt');
      };
    } catch (err) {
      console.log('Permission API not supported, will request on record');
    }
  };

  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission('granted');

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported(audioFormat)
        ? audioFormat
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleRecordingComplete(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;

          // Auto-stop at max duration
          if (newTime >= maxDuration) {
            stopRecording();
          }

          return newTime;
        });
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to access microphone. Please check permissions.');
      setMicPermission('denied');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    // Validate recording
    const validation = validateAudioRecording(audioBlob, minDuration, maxDuration);

    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    // Upload to Supabase
    setUploading(true);

    try {
      const fileName = `recording_${questionId}_${Date.now()}.webm`;
      const result = await uploadAnswerAsset(audioBlob, fileName, studentId, 'audio');

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      const recording: AudioRecording = {
        id: crypto.randomUUID(),
        url: result.url!,
        path: result.path!,
        duration: recordingTime,
        fileSize: audioBlob.size,
        recordedAt: new Date().toISOString()
      };

      onChange(recording);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload recording');
    } finally {
      setUploading(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);

      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    } else {
      audioRef.current.play();
      setIsPlaying(true);

      playbackTimerRef.current = setInterval(() => {
        if (audioRef.current) {
          setPlaybackTime(audioRef.current.currentTime);
        }
      }, 100);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setPlaybackTime(0);

    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
    }
  };

  const handleReRecord = () => {
    onChange(null);
    setRecordingTime(0);
    setPlaybackTime(0);
    setError(null);
  };

  const handleDownload = () => {
    if (value?.url) {
      const link = document.createElement('a');
      link.href = value.url;
      link.download = `recording_${questionId}.webm`;
      link.click();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Microphone Permission Warning */}
      {micPermission === 'denied' && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Microphone Access Denied</p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                Please enable microphone access in your browser settings to record audio.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recording Controls */}
      {!value && !uploading && (
        <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex flex-col items-center space-y-4">
            {/* Recording Status */}
            <div className="text-center">
              {isRecording ? (
                <div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                    <span className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {isPaused ? 'Recording Paused' : 'Recording...'}
                    </span>
                  </div>
                  <p className="text-3xl font-mono font-bold text-gray-900 dark:text-gray-100">
                    {formatTime(recordingTime)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Max: {formatTime(maxDuration)}
                  </p>
                </div>
              ) : (
                <div>
                  <Mic className="w-16 h-16 mx-auto mb-3 text-gray-400" />
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    Ready to record
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Min: {minDuration}s • Max: {formatTime(maxDuration)}
                  </p>
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="flex items-center gap-3">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  disabled={disabled || micPermission === 'denied'}
                  className="px-6 py-3 bg-[#8CC63F] hover:bg-[#7AB62F] text-white"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Start Recording
                </Button>
              ) : (
                <>
                  {isPaused ? (
                    <Button
                      onClick={resumeRecording}
                      className="px-6 py-3 bg-[#8CC63F] hover:bg-[#7AB62F] text-white"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Resume
                    </Button>
                  ) : (
                    <Button
                      onClick={pauseRecording}
                      className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white"
                    >
                      <Pause className="w-5 h-5 mr-2" />
                      Pause
                    </Button>
                  )}

                  <Button
                    onClick={stopRecording}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Square className="w-5 h-5 mr-2" />
                    Stop
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Uploading State */}
      {uploading && (
        <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
          <div className="animate-pulse">
            <Volume2 className="w-12 h-12 mx-auto mb-3 text-[#8CC63F]" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
              Uploading recording...
            </p>
          </div>
        </div>
      )}

      {/* Recording Complete */}
      {value && !uploading && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                Recording Complete
              </p>

              {/* Audio Player */}
              <audio
                ref={audioRef}
                src={value.url}
                onEnded={handleAudioEnded}
                className="hidden"
              />

              {/* Playback Controls */}
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePlayPause}
                  disabled={disabled}
                  className="h-10 w-10 p-0"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </Button>

                <div className="flex-1">
                  <div className="text-sm font-mono text-gray-700 dark:text-gray-300">
                    {formatTime(playbackTime)} / {formatTime(value.duration)}
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-[#8CC63F] transition-all duration-100"
                      style={{ width: `${(playbackTime / value.duration) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Recording Info */}
              <p className="text-xs text-green-700 dark:text-green-400">
                Duration: {formatTime(value.duration)} • Size: {formatFileSize(value.fileSize)}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="h-8"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>

                {!disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReRecord}
                    className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Re-record
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Error</p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Correct Answer Audio */}
      {showCorrectAnswer && correctAnswerUrl && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
            Sample Answer:
          </p>
          <audio controls src={correctAnswerUrl} className="w-full">
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
