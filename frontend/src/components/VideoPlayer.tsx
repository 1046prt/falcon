import { lazy, Suspense, useEffect, useRef } from 'react';

const VideoJsPlayer = lazy(() => import('./VideoJsPlayer'));

interface VideoPlayerProps {
  src: string;
}

export default function VideoPlayer({ src }: VideoPlayerProps) {
  return (
    <Suspense
      fallback={
        <div className="aspect-video rounded-2xl bg-zinc-900 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VideoJsPlayer src={src} />
    </Suspense>
  );
}

export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  enabled: boolean,
  onData: (data: T) => void
) {
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    const poll = async () => {
      try {
        const data = await fetcher();
        if (active) onDataRef.current(data);
      } catch {
        // silently retry
      }
    };

    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [fetcher, intervalMs, enabled]);
}
