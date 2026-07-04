import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getVideos, type Video } from '../api';
import VideoCard from '../components/VideoCard';

export default function VideoListPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadVideos = useCallback(async () => {
    try {
      const data = await getVideos();
      setVideos(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
    const interval = setInterval(loadVideos, 5000);
    return () => clearInterval(interval);
  }, [loadVideos]);

  const processingCount = videos.filter(
    (v) => v.status === 'PROCESSING' || v.status === 'UPLOADING'
  ).length;

  return (
    <div className="animate-fade-in">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Video Library</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {videos.length === 0
              ? 'No videos yet'
              : `${videos.length} video${videos.length !== 1 ? 's' : ''}${
                  processingCount > 0 ? ` · ${processingCount} processing` : ''
                }`}
          </p>
        </div>
        <Link to="/upload" className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card h-24 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card p-8 text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <p className="text-zinc-600 text-xs mb-4">
            Make sure Docker is running and backend services are started.
          </p>
          <button onClick={loadVideos} className="btn-ghost">
            Retry
          </button>
        </div>
      ) : videos.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-zinc-400 mb-1">Your library is empty</p>
          <p className="text-zinc-600 text-sm mb-6">Upload a video to start the transcoding pipeline</p>
          <Link to="/upload" className="btn-primary">
            Upload your first video
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((video, i) => (
            <VideoCard key={video.id} video={video} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
