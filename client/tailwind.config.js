/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink:    "#e91e8c",
          "pink-dark":  "#c0176f",
          "pink-glow":  "rgba(233, 30, 140, 0.25)",
          purple:  "#7c3aed",
          "purple-soft": "#a855f7",
        },
        bg: {
          base:    "#0d0d1a",
          card:    "#12122a",
          "card-hover": "#1a1a35",
          border:  "rgba(255,255,255,0.07)",
        },
        text: {
          primary:   "#f0f0ff",
          secondary: "#9090c0",
          muted:     "#5a5a80",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "hero-gradient": "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(233,30,140,0.18) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 40%, rgba(124,58,237,0.12) 0%, transparent 60%)",
        "card-gradient": "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)",
        "pink-glow-btn": "linear-gradient(135deg, #e91e8c 0%, #c0176f 100%)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2.5s infinite",
        "fade-up": "fadeUp 0.6s ease forwards",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-12px)" },
        },
        fadeUp: {
          "0%":   { opacity: 0, transform: "translateY(24px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
      },
      boxShadow: {
        "pink-glow":    "0 0 40px rgba(233, 30, 140, 0.3), 0 0 80px rgba(233, 30, 140, 0.1)",
        "pink-sm":      "0 0 20px rgba(233, 30, 140, 0.4)",
        "card-glow":    "0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
      },
    },
  },
  plugins: [],
}
