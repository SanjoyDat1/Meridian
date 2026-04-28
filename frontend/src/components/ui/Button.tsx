import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "accent" | "ghost" | "danger" | "ink";
type Size = "sm" | "md" | "lg";

/** Explicit label colors (!) override Tailwind preflight `button { color: inherit }` so text stays visible on light headers. */
const variants: Record<Variant, string> = {
  primary: "!text-white bg-ink hover:bg-ink-soft shadow-lift",
  accent: "!text-white bg-accent hover:bg-accent-hover shadow-lift border border-transparent",
  ghost:
    "!text-ink bg-white border-2 border-paper-line hover:bg-paper-muted hover:!text-ink hover:border-ink/20",
  danger: "!text-white bg-red-700 hover:bg-red-800 border border-transparent",
  ink: "!text-ink bg-paper-line/90 hover:bg-paper-line border border-paper-line",
};

const sizes: Record<Size, string> = {
  sm: "min-h-[2.25rem] px-4 py-2 text-sm gap-2",
  md: "min-h-[2.75rem] px-6 py-2.5 text-base gap-2",
  lg: "min-h-[3.25rem] px-8 py-3 text-lg gap-2",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      type="button"
      className={[
        "inline-flex items-center justify-center rounded-lg font-sans font-semibold leading-tight tracking-normal transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
