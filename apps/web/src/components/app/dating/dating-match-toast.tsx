"use client";

export function DatingMatchToast({
  peerName,
  onOpenMatches,
  onDismiss,
}: {
  peerName: string;
  onOpenMatches: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed bottom-24 left-1/2 z-[95] w-[min(100%,22rem)] -translate-x-1/2 rounded-[1rem] border border-fuchsia-300/40 bg-[linear-gradient(160deg,rgba(28,16,84,0.98),rgba(18,12,58,0.98))] p-4 shadow-2xl sm:bottom-8">
      <p className="text-sm font-semibold text-white">It&apos;s a match!</p>
      <p className="mt-1 text-xs text-fuchsia-100/80">You and {peerName} liked each other.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="suzi-primary-btn flex-1 py-2 text-xs" onClick={onOpenMatches}>
          View matches
        </button>
        <button type="button" className="suzi-secondary-btn flex-1 py-2 text-xs" onClick={onDismiss}>
          Keep browsing
        </button>
      </div>
    </div>
  );
}
