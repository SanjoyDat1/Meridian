export function Logo({ inverted = false }: { inverted?: boolean }) {
  if (inverted) {
    return (
      <div className="flex items-center gap-3">
        <svg
          width="38"
          height="38"
          viewBox="0 0 38 38"
          fill="none"
          className="shrink-0"
          aria-hidden
        >
          <rect
            x="1"
            y="1"
            width="36"
            height="36"
            rx="10"
            fill="rgb(255 255 255 / 0.12)"
            stroke="rgb(255 255 255 / 0.85)"
            strokeWidth="1.5"
          />
          <path
            d="M11 27V11l8 10 8-10v16M11 11h16"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="leading-tight">
          <div className="font-display text-lg font-semibold tracking-tight text-white">Meridian</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75">
            Clinical appeals workspace
          </div>
        </div>
      </div>
    );
  }

  const bg = "#ffffff";
  const fg = "#b91c1c";
  const border = "#e5e5e5";

  return (
    <div className="flex items-center gap-3">
      <svg
        width="38"
        height="38"
        viewBox="0 0 38 38"
        fill="none"
        className="shrink-0 drop-shadow-sm"
        aria-hidden
      >
        <rect width="38" height="38" rx="10" fill={bg} stroke={border} strokeWidth={1} />
        <path
          d="M11 27V11l8 10 8-10v16M11 11h16"
          stroke={fg}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="leading-tight">
        <div className="font-display text-lg font-semibold tracking-tight text-ink">Meridian</div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/50">
          Clinical appeals workspace
        </div>
      </div>
    </div>
  );
}
