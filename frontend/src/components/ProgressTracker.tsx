interface ProgressTrackerProps {
  progress: number;
  status: string;
  resolutions?: {
    '1080p': boolean;
    '720p': boolean;
    '480p': boolean;
  };
  compact?: boolean;
}

const RESOLUTIONS = ['1080p', '720p', '480p'] as const;

export default function ProgressTracker({
  progress,
  status,
  resolutions,
  compact = false,
}: ProgressTrackerProps) {
  const isActive = status === 'UPLOADING' || status === 'PROCESSING';

  return (
    <div className={`space-y-3 ${compact ? '' : 'p-4 rounded-xl bg-zinc-900/40 border border-white/[0.06]'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          {status === 'UPLOADING' ? 'Upload Progress' : 'Transcoding Progress'}
        </span>
        <span className="text-sm font-semibold tabular-nums text-blue-400">{progress}%</span>
      </div>

      <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
            isActive
              ? 'bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]'
              : progress === 100
                ? 'bg-emerald-500'
                : 'bg-blue-500'
          }`}
          style={{ width: `${Math.max(progress, isActive ? 2 : 0)}%` }}
        />
      </div>

      {resolutions && (
        <div className="flex gap-2">
          {RESOLUTIONS.map((res) => (
            <div
              key={res}
              className={`flex-1 text-center py-2 rounded-lg text-xs font-medium transition-all duration-300 ${
                resolutions[res]
                  ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20'
                  : isActive
                    ? 'bg-zinc-800/50 text-zinc-500 border border-white/[0.04]'
                    : 'bg-zinc-800/30 text-zinc-600 border border-transparent'
              }`}
            >
              {res}
              {resolutions[res] && (
                <span className="ml-1">✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
