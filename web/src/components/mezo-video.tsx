export function MezoVideo() {
  return (
    <div className="mezo-card overflow-hidden p-3 lg:p-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#0a0a0a]">
        <video
          className="h-full w-full object-cover"
          src="/mezo_video.mp4"
          autoPlay
          muted
          loop
          playsInline
          controls
          preload="metadata"
          aria-label="Mezo ve-economy overview"
        />
      </div>
      <p className="mt-3 px-1 text-xs font-medium uppercase tracking-[0.1em] text-[#737373]">
        Mezo ve-economy
      </p>
    </div>
  );
}
