type FeedUploadProgressProps = {
  percent: number;
  label?: string;
};

export function FeedUploadProgress({ percent, label = "Uploading" }: FeedUploadProgressProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));

  return (
    <div className="w-full rounded-[0.65rem] border border-cyan-300/22 bg-[rgba(8,12,30,0.55)] px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 text-[0.68rem] font-medium text-cyan-100/85">
        <span>{label}</span>
        <span>{clamped}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/14">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400/85 to-fuchsia-400/75 transition-[width] duration-150 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
