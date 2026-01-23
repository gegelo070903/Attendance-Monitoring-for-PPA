import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class", // Changed to class-based for manual toggle
  theme: {
    extend: {
      colors: {
        // PPA Brand Colors
        primary: {
          50: '#e6f0f7',
          100: '#cce1ef',
          200: '#99c3df',
          300: '#66a5cf',
          400: '#3387bf',
          500: '#1a5f8a',
          600: '#164e72',
          700: '#0d3a5c',
          800: '#0a2d47',
          900: '#071f33',
        },
        // PPA Navy Blue
        ppa: {
          navy: '#0d3a5c',
          blue: '#1a5f8a',
          light: '#3387bf',
        },
        // Accent colors from logo
        accent: {
          red: '#c41e3a',
          gold: '#d4a418',
          yellow: '#fbbf24',
        },
      },
    },
  },
  plugins: [],
};
export default config;
