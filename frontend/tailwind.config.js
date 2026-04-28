/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#1a1a1a", soft: "#262626", panel: "#fafafa" },
        paper: { DEFAULT: "#ffffff", muted: "#f5f5f5", line: "#e5e5e5" },
        clinical: { DEFAULT: "#b91c1c", hover: "#991b1b", faint: "#fef2f2", border: "#fecaca" },
        accent: { DEFAULT: "#b91c1c", hover: "#991b1b", faint: "#fef2f2" },
        sage: { DEFAULT: "#166534", faint: "#f0fdf4" },
        violet: { DEFAULT: "#525252", faint: "#f5f5f5" },
        amber: { DEFAULT: "#a16207", faint: "#fffbeb" },
      },
      fontFamily: {
        sans: ['Inter', "system-ui", "sans-serif"],
        display: ['"Source Serif 4"', "Georgia", "serif"],
        serif: ['"Source Serif 4"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        lift: "0 8px 30px -6px rgb(185 28 28 / 0.12), 0 2px 8px -4px rgb(0 0 0 / 0.06)",
        insetLine: "inset 0 1px 0 0 rgb(255 255 255 / 0.08)",
      },
      keyframes: {
        travel: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(220%)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        travel: "travel 1.15s ease-in-out infinite alternate",
        fadeUp: "fadeUp 0.45s ease both",
      },
    },
  },
  plugins: [],
};
