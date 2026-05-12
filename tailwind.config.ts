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
        jubilee: {
          // Exact brand colors from brand guide
          navy: "#3a4755",       // Dark slate — headings, nav background
          gold: "#c18d31",       // Brand gold — primary accent
          coral: "#df7557",      // Brand coral — secondary accent
          cream: "#fff6e8",      // Brand cream — page background
          blue: "#8099cb",       // Periwinkle — tertiary accent
          green: "#335e4b",      // Forest green — primary action color

          // Semantic aliases so all components work without renaming
          "green-light": "#5a8a72",   // Lighter tint of forest green
          "green-dark": "#3a4755",    // Maps to navy (sidebar, dark surfaces)
          amber: "#c18d31",           // Maps to brand gold
          "amber-light": "#d4a843",   // Lighter gold
          brown: "#df7557",           // Maps to coral (warm accent)
          "brown-light": "#e8906f",   // Lighter coral
          sky: "#8099cb",             // Maps to periwinkle
          red: "#c0392b",             // Error red (unchanged)
        },
      },
      fontFamily: {
        sans: ["Roboto", "system-ui", "sans-serif"],
        display: ["Nunito", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
