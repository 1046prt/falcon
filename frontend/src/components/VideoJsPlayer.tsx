import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

interface VideoJsPlayerProps {
  src: string;
}

export default function VideoJsPlayer({ src }: VideoJsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<ReturnType<typeof videojs> | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    playerRef.current = videojs(videoRef.current, {
      controls: true,
      fluid: true,
      responsive: true,
      preload: 'auto',
      sources: [{ src, type: 'application/x-mpegURL' }],
    });

    return () => {
      playerRef.current?.dispose();
      playerRef.current = null;
    };
  }, [src]);

  return (
    <div data-vjs-player className="rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl">
      <video ref={videoRef} className="video-js vjs-big-play-centered w-full" />
    </div>
  );
}
