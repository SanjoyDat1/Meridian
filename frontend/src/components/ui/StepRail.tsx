export function StepRail({
  labels,
  activeIndex,
}: {
  labels: string[];
  activeIndex: number;
}) {
  return (
    <nav aria-label="Flow progress" className="flex flex-wrap items-center gap-2 md:gap-4">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={[
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
              i === activeIndex
                ? "!text-white bg-accent shadow-sm"
                : i < activeIndex
                  ? "!text-white bg-ink/70"
                  : "!text-ink/55 bg-paper-muted",
            ].join(" ")}
            aria-current={i === activeIndex ? "step" : undefined}
          >
            {i + 1}
          </div>
          <span
            className={`text-sm ${i === activeIndex ? "font-semibold !text-ink" : "!text-ink/55"}`}
          >
            {label}
          </span>
          {i < labels.length - 1 && (
            <span className="mx-1 hidden h-px w-6 bg-paper-line sm:block" aria-hidden />
          )}
        </div>
      ))}
    </nav>
  );
}
