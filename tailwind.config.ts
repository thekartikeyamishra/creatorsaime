import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Studio Noir palette
        ink: {
          DEFAULT: "#0c0a09", // warm near-black canvas
          800: "#171311",
          700: "#211b18",
          600: "#2e2620",
        },
        bone: {
          DEFAULT: "#f4ede1", // warm cream text
          dim: "#cdc3b4",
          faint: "#9b9186",
        },
        coral: {
          DEFAULT: "#ff5436", // electric accent
          soft: "#ff7a63",
          deep: "#d63b1f",
        },
        sage: "#a8b89a", // muted secondary (tool badges)
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.8s ease both",
      },
    },
  },
  plugins: [],
};

export default config;
