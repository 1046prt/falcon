const STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  PENDING: { label: 'Pending', className: 'bg-zinc-800 text-zinc-400', dot: 'bg-zinc-500' },
  UPLOADING: { label: 'Uploading', className: 'bg-blue-950/60 text-blue-400', dot: 'bg-blue-400 animate-pulse-ring' },
  UPLOADED: { label: 'Uploaded', className: 'bg-indigo-950/60 text-indigo-400', dot: 'bg-indigo-400' },
  PROCESSING: { label: 'Processing', className: 'bg-amber-950/60 text-amber-400', dot: 'bg-amber-400 animate-pulse-ring' },
  COMPLETED: { label: 'Ready', className: 'bg-emerald-950/60 text-emerald-400', dot: 'bg-emerald-400' },
  FAILED: { label: 'Failed', className: 'bg-red-950/60 text-red-400', dot: 'bg-red-400' },
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.className} ${
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
