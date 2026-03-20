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
          pink:    "#FF90E8", // Pastel brutalist pink
          blue:    "#90E0FF", // Pastel blue
          yellow:  "#FFEE90", // Pastel yellow
          green:   "#90FF90", // Pastel green
          peach:   "#FFC090", // Pastel peach
          purple:  "#C090FF", // Pastel purple
        },
        bg: {
          base:    "#F4F4F9", // Off-white canvas
          card:    "#FFFFFF", // Pure white for cards
          border:  "#000000", // Solid black borders
        },
        text: {
          primary:   "#000000",
          secondary: "#333333",
          muted:     "#666666",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        "brutal":       "4px 4px 0px 0px rgba(0,0,0,1)",
        "brutal-sm":    "2px 2px 0px 0px rgba(0,0,0,1)",
        "brutal-lg":    "8px 8px 0px 0px rgba(0,0,0,1)",
      },
    },
  },
  plugins: [],
}
