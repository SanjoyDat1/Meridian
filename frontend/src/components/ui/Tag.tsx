export function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {label}
    </span>
  );
}
