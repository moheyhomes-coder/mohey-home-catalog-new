export function LiveIndicator({ dark = false, label = "LIVE" }) {
  return (
    <div
      data-testid="live-indicator"
      className={`inline-flex items-center gap-2 px-3 py-1.5 border ${
        dark ? "border-white/20 text-white" : "border-[#0A0A0A] text-[#0A0A0A]"
      }`}
    >
      <span className="live-dot w-2 h-2 rounded-full bg-[#FF2A2A]" />
      <span className="text-[10px] tracking-[0.25em] font-bold">{label}</span>
    </div>
  );
}
