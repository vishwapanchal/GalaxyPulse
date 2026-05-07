/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Samsung-inspired deep navy + electric blue palette
        brand: {
          50:  "#eef4ff",
          100: "#d9e8ff",
          200: "#bcd4ff",
          300: "#8fb6ff",
          400: "#5f8eff",
          500: "#3b6cff",  // primary CTA
          600: "#1f4ddb",
          700: "#1a3db0",
          800: "#1c3591",
          900: "#1c3177",
        },
        surface: {
          900: "#080c14",  // page background
          800: "#0d1424",  // card background
          700: "#131d35",  // elevated card
          600: "#1c2a47",  // border / divider
          500: "#253555",
        },
        accent: {
          cyan:   "#00d4ff",
          purple: "#a855f7",
          green:  "#22c55e",
          amber:  "#f59e0b",
          red:    "#ef4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "gradient-brand":  "linear-gradient(135deg, #3b6cff 0%, #00d4ff 100%)",
        "gradient-danger": "linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)",
        "gradient-glow":   "radial-gradient(ellipse at top, #1c2a4799 0%, #080c1400 70%)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in":    "fadeIn 0.4s ease-out",
        "slide-up":   "slideUp 0.35s ease-out",
      },
      keyframes: {
        fadeIn:  { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
