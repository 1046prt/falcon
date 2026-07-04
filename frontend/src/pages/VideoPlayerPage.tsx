import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProgress, getVideo, type Video } from '../api';
import ProgressTracker from '../components/ProgressTracker';
import StatusBadge from '../components/StatusBadge';
import VideoPlayer from '../components/VideoPlayer';

export default function VideoPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getVideo(id);
      if (data.status !== 'COMPLETED' && data.status !== 'FAILED') {
        try {
          const progress = await getProgress(id);
          data.progress = progress;
        } catch {
          // progress may not exist yet
        }
      }
      setVideo(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse mb-6" />
        <div className="aspect-video rounded-2xl bg-zinc-900 animate-pulse" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="glass-card p-12 text-center animate-fade-in">
        <p className="text-red-400 mb-4">{error || 'Video not found'}</p>
        <Link to="/" className="btn-ghost">
          ← Back to library
        </Link>
      </div>
    );
  }

  const isReady = video.status === 'COMPLETED' && video.hls_master_url;
  const isFailed = video.status === 'FAILED';
  const isProcessing = !isReady && !isFailed;

  return (
    <div className="animate-fade-in">
      <Link to="/" className="btn-ghost mb-6 -ml-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Library
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{video.title}</h1>
          {video.description && (
            <p className="text-zinc-500 text-sm mt-1">{video.description}</p>
          )}
        </div>
        <StatusBadge status={video.status} size="md" />
      </div>

      {isReady ? (
        <VideoPlayer src={video.hls_master_url!} />
      ) : (
        <div className="glass-card p-8">
          {isFailed ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-red-950/50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-zinc-300 font-medium">Processing failed</p>
              <p className="text-zinc-500 text-sm mt-1">Try uploading the video again</p>
              <Link to="/upload" className="btn-primary mt-6 inline-flex">
                Upload again
              </Link>
            </div>
          ) : (
            <div className="py-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <div>
                  <p className="text-white font-medium">Processing your video</p>
                  <p className="text-zinc-500 text-sm">Transcoding and generating HLS streams</p>
                </div>
              </div>
              {video.progress && (
                <ProgressTracker
                  progress={video.progress.progress}
                  status={video.progress.status}
                  resolutions={{
                    '1080p': video.progress['1080p'],
                    '720p': video.progress['720p'],
                    '480p': video.progress['480p'],
                  }}
                />
              )}
              {isProcessing && !video.progress && (
                <ProgressTracker progress={5} status="PROCESSING" />
              )}
            </div>
          )}
        </div>
      )}

      {isReady && (
        <div className="mt-4 flex gap-4 text-xs text-zinc-600">
          <span>Adaptive HLS streaming</span>
          <span>·</span>
          <span>1080p · 720p · 480p</span>
        </div>
      )}
    </div>
  );
}
