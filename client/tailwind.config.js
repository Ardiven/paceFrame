/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#006b47",
        "primary-container": "#13865b",
        "primary-fixed": "#92f7c3",
        "primary-fixed-dim": "#76daa8",
        "on-primary": "#ffffff",
        "on-primary-container": "#fdfffa",
        "secondary": "#006d44",
        "secondary-container": "#80f6b7",
        "secondary-fixed": "#83f9b9",
        "secondary-fixed-dim": "#66dc9f",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#007147",
        "background": "#f0fcf4",
        "surface": "#f0fcf4",
        "surface-bright": "#f0fcf4",
        "surface-dim": "#d0ddd5",
        "surface-container": "#e4f1e9",
        "surface-container-high": "#deebe3",
        "surface-container-highest": "#d9e6dd",
        "surface-container-low": "#eaf7ee",
        "surface-container-lowest": "#ffffff",
        "surface-variant": "#d9e6dd",
        "on-surface": "#131e19",
        "on-surface-variant": "#3e4942",
        "outline": "#6e7a72",
        "outline-variant": "#bdcac0",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a"
      },
      borderRadius: {
        "DEFAULT": "1rem",
        "lg": "2rem",
        "xl": "3rem",
        "full": "9999px"
      },
      spacing: {
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2rem",
        "space-2xl": "3rem",
        "margin-mobile": "1rem",
        "gutter-mobile": "0.75rem"
      },
      fontFamily: {
        "headline": ["Manrope", "sans-serif"],
        "body": ["Inter", "sans-serif"]
      }
    },
  },
  plugins: [],
};
