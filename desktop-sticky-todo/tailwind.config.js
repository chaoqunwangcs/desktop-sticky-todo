/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Inter"',
          '"Microsoft YaHei"',
          '"Segoe UI"',
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        accent: {
          DEFAULT: "rgb(var(--color-accent-rgb) / <alpha-value>)",
          soft: "rgb(var(--color-accent-soft-rgb) / <alpha-value>)",
          deep: "rgb(var(--color-accent-deep-rgb) / <alpha-value>)",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
        "pop": "pop 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pop: {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
