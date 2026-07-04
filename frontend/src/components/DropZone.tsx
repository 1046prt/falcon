import { useCallback, useRef, useState } from 'react';

interface DropZoneProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function DropZone({ file, onFileSelect, disabled }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files[0];
      if (dropped?.type.startsWith('video/')) onFileSelect(dropped);
    },
    [disabled, onFileSelect]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 ${
        dragging
          ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
          : file
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : 'border-white/[0.1] hover:border-blue-500/40 hover:bg-white/[0.02]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) onFileSelect(selected);
        }}
      />

      <div className="flex flex-col items-center justify-center py-12 px-6">
        {file ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-white font-medium text-center truncate max-w-xs">{file.name}</p>
            <p className="text-zinc-500 text-sm mt-1">{formatSize(file.size)}</p>
            {!disabled && (
              <p className="text-zinc-600 text-xs mt-3">Click or drop to replace</p>
            )}
          </>
        ) : (
          <>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
              dragging ? 'bg-blue-500/20' : 'bg-zinc-800'
            }`}>
              <svg className={`w-7 h-7 transition-colors ${dragging ? 'text-blue-400' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-zinc-300 font-medium">
              {dragging ? 'Drop your video here' : 'Drag & drop your video'}
            </p>
            <p className="text-zinc-500 text-sm mt-1">or click to browse · MP4, MOV, WebM</p>
          </>
        )}
      </div>
    </div>
  );
}
