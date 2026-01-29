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
        // Philippine Flag Colors
        flag: {
          blue: '#0038A8',
          red: '#CE1126',
          yellow: '#FCD116',
          white: '#FFFFFF',
        },
        // Accent colors from logo
        accent: {
          red: '#CE1126',
          gold: '#FCD116',
          yellow: '#fbbf24',
        },
      },
      backgroundImage: {
        'flag-gradient': 'linear-gradient(to bottom, #0038A8 0%, #1a5f8a 40%, #8B1538 70%, #CE1126 100%)',
        'flag-gradient-subtle': 'linear-gradient(to bottom, #0038A8 0%, #164e72 50%, #8B1538 100%)',
      },
    },
  },
  plugins: [],
};
export default config;
