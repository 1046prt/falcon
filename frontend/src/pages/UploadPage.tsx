import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CHUNK_SIZE,
  completeUpload,
  initUpload,
  uploadChunk,
} from '../api';
import DropZone from '../components/DropZone';
import ProgressTracker from '../components/ProgressTracker';
import { useToast } from '../components/Toast';

export default function UploadPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('PENDING');
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'processing'>('idle');

  const handleUpload = useCallback(async () => {
    if (!file || !title.trim()) {
      toast('Please provide a title and select a video', 'error');
      return;
    }

    setUploading(true);
    setStatus('UPLOADING');
    setProgress(0);
    setPhase('uploading');

    try {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const session = await initUpload({
        title: title.trim(),
        description: description.trim() || undefined,
        fileName: file.name,
        fileSize: file.size,
        chunkSize: CHUNK_SIZE,
        totalChunks,
      });

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const result = await uploadChunk(session.sessionId, i, chunk);
        setProgress(Math.round(result.progress * 0.5)); // upload = first 50%
      }

      setPhase('processing');
      setStatus('PROCESSING');
      setProgress(50);

      const result = await completeUpload(session.sessionId);
      toast('Upload complete — transcoding started', 'success');
      navigate(`/videos/${result.videoId}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error');
      setStatus('FAILED');
      setPhase('idle');
    } finally {
      setUploading(false);
    }
  }, [file, title, description, navigate, toast]);

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Upload Video</h1>
        <p className="text-zinc-500 mt-1.5 text-sm leading-relaxed">
          Chunked upload with automatic transcoding to 1080p, 720p, and 480p HLS streams.
        </p>
      </div>

      <div className="glass-card p-6 space-y-5">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-zinc-400 mb-2">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your video a name"
            className="input-field"
            disabled={uploading}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-zinc-400 mb-2">
            Description <span className="text-zinc-600">(optional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this video about?"
            rows={2}
            className="input-field resize-none"
            disabled={uploading}
          />
        </div>

        <DropZone file={file} onFileSelect={setFile} disabled={uploading} />

        {uploading && (
          <ProgressTracker
            progress={progress}
            status={phase === 'uploading' ? 'UPLOADING' : status}
          />
        )}

        <button
          onClick={handleUpload}
          disabled={uploading || !file || !title.trim()}
          className="btn-primary w-full py-3"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {phase === 'uploading' ? 'Uploading chunks...' : 'Starting pipeline...'}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload & Process
            </>
          )}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Chunked Upload', desc: '5 MB chunks' },
          { label: '3 Resolutions', desc: '1080p · 720p · 480p' },
          { label: 'HLS Streaming', desc: 'Adaptive bitrate' },
        ].map((item) => (
          <div key={item.label} className="text-center p-3 rounded-xl bg-zinc-900/40 border border-white/[0.04]">
            <p className="text-xs font-medium text-zinc-300">{item.label}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
