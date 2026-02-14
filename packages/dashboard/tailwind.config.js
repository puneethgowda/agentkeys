/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0a0a0a",
          secondary: "#111111",
          tertiary: "#1a1a1a",
          hover: "#222222",
        },
        border: {
          DEFAULT: "#2a2a2a",
          hover: "#3a3a3a",
        },
        text: {
          primary: "#fafafa",
          secondary: "#888888",
          tertiary: "#666666",
        },
        accent: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
        },
        success: "#22c55e",
        warning: "#eab308",
        danger: "#ef4444",
      },
    },
  },
  plugins: [],
};
