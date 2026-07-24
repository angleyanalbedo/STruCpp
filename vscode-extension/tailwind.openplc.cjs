const path = require("node:path");

module.exports = {
  content: [
    path.join(
      __dirname,
      "client/src/plcopen/vendor/openplc-editor/**/*.{js,jsx,ts,tsx,html}",
    ),
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontSize: {
        "cp-xs": ["0.5rem", "0.625rem"],
        "cp-sm": ["0.625rem", "0.75rem"],
        "cp-base": ["0.75rem", "1rem"],
      },
      colors: {
        brand: {
          light: "var(--primary-light)",
          DEFAULT: "var(--primary-default)",
          medium: "var(--primary-medium)",
          "medium-dark": "var(--primary-medium-dark)",
          dark: "var(--primary-dark)",
        },
        neutral: {
          50: "#f5f7f8",
          100: "#edeff2",
          200: "#dde2e8",
          300: "#c8d0d9",
          400: "#b1b9c8",
          500: "#9ca4b8",
          600: "#868ca5",
          700: "#7d8297",
          800: "#5e6275",
          850: "#50545f",
          900: "#2e3038",
          950: "#121316",
          1000: "#030303",
        },
      },
      fontFamily: {
        display: ["Poppins", "sans-serif"],
        caption: ["Inter", "sans-serif"],
      },
      screens: {
        xl: "1294px",
        "2xl": "1550px",
        xm: "1806px",
        "3xl": "2062px",
        "4xl": "2318px",
      },
      rotate: { 270: "270deg" },
      boxShadow: {
        oplc: "0px 4px 20px 0px rgba(0, 0, 0, 0.25)",
        "oplc-dark": "0px 1px 7px 0px rgba(255, 255, 255, 0.25)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("tailwind-scrollbar"),
  ],
};
