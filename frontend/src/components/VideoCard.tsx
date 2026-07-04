import { Link } from 'react-router-dom';
import type { Video } from '../api';
import ProgressTracker from './ProgressTracker';
import StatusBadge from './StatusBadge';

interface VideoCardProps {
  video: Video;
  index?: number;
}

export default function VideoCard({ video, index = 0 }: VideoCardProps) {
  const isProcessing = video.status === 'PROCESSING' || video.status === 'UPLOADING';

  return (
    <Link
      to={`/videos/${video.id}`}
      className="glass-card group p-5 hover:border-white/[0.15] hover:bg-zinc-900/80 transition-all duration-300 animate-fade-in block"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex gap-4">
        <div className="relative w-36 h-20 shrink-0 rounded-xl bg-zinc-800 overflow-hidden flex items-center justify-center">
          {video.status === 'COMPLETED' ? (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20" />
          ) : null}
          <svg className="w-8 h-8 text-zinc-600 group-hover:text-zinc-400 transition-colors relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {isProcessing && (
            <div className="absolute inset-0 border-2 border-blue-500/30 rounded-xl animate-pulse-ring" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
              {video.title}
            </h3>
            <StatusBadge status={video.status} />
          </div>
          {video.description && (
            <p className="text-zinc-500 text-sm mt-1 line-clamp-1">{video.description}</p>
          )}
          <p className="text-zinc-600 text-xs mt-2">
            {new Date(video.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {video.progress && isProcessing && (
        <div className="mt-4">
          <ProgressTracker
            progress={video.progress.progress}
            status={video.progress.status}
            resolutions={{
              '1080p': video.progress['1080p'],
              '720p': video.progress['720p'],
              '480p': video.progress['480p'],
            }}
            compact
          />
        </div>
      )}
    </Link>
  );
}
