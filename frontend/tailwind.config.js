/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        surface: {
          900: "#030014",  // Deepest space background
          800: "#0a0a19",  // Slightly lighter for cards
          700: "#141428",  // Elevated elements
          600: "#1e1e38",  // Borders
          500: "#2a2a4a",
        },
        accent: {
          cyan:   "#00d4ff",
          purple: "#8a2be2",
          pink:   "#ff0080",
          green:  "#10b981",
          amber:  "#f59e0b",
          red:    "#ef4444",
        },
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "gradient-brand":  "linear-gradient(135deg, #8a2be2 0%, #00d4ff 100%)",
        "gradient-danger": "linear-gradient(135deg, #ef4444 0%, #ff0080 100%)",
        "gradient-glow":   "radial-gradient(ellipse at top, rgba(138,43,226,0.3) 0%, transparent 70%)",
        "gradient-hero":   "linear-gradient(to bottom right, rgba(138,43,226,0.1), rgba(0,212,255,0.05))",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in":    "fadeIn 0.6s ease-out",
        "slide-up":   "slideUp 0.5s ease-out forwards",
        "float":      "float 6s ease-in-out infinite",
        "spin-slow":  "spin 12s linear infinite",
        "blob":       "blob 7s infinite",
      },
      keyframes: {
        fadeIn:  { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(20px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        }
      },
    },
  },
  plugins: [],
};
