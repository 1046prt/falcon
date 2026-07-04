/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        falcon: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9dffd',
          300: '#7cc5fb',
          400: '#36a7f6',
          500: '#0c8ce9',
          600: '#006fc7',
          700: '#0159a1',
          800: '#064c85',
          900: '#0b406e',
          950: '#072849',
        },
      },
    },
  },
  plugins: [],
};
