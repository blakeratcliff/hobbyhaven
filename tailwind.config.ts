import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Card hobby palette
        navy: {
          50: "#f4f6fb",
          100: "#e6ecf5",
          200: "#c8d4e8",
          300: "#9ab1d4",
          400: "#6786b8",
          500: "#44669e",
          600: "#345084",
          700: "#2b416c",
          800: "#26385a",
          900: "#1a2540",
          950: "#10172a",
        },
        cream: {
          50: "#fdfcf7",
          100: "#faf6e8",
          200: "#f3ebca",
          300: "#e9daa1",
          400: "#dec376",
          500: "#d4ab53",
          600: "#bf8e3e",
          700: "#9e7034",
          800: "#825a30",
          900: "#6c4b2c",
        },
        gold: {
          DEFAULT: "#c8a14a",
          light: "#dcbb73",
          dark: "#9c7a31",
        },
        ink: {
          DEFAULT: "#1a1a1a",
          muted: "#4a4a4a",
          subtle: "#7a7a7a",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "card-hover": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        inset: "inset 0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      backgroundImage: {
        "noise":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
