/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Sora", "sans-serif"],
        body: ["Plus Jakarta Sans", "sans-serif"],
      },
      boxShadow: {
        panel: "0 18px 40px -28px rgba(15, 23, 42, 0.5)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(14px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%": { opacity: 0.7, transform: "scale(1)" },
          "100%": { opacity: 1, transform: "scale(1.08)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.45s ease-out",
        pulseSoft: "pulseSoft 1.25s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};
