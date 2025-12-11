/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'rgb(var(--color-primary) / <alpha-value>)',
          'primary-light': 'rgb(var(--color-primary-light) / <alpha-value>)',
          secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
          base: 'rgb(var(--color-bg-base) / <alpha-value>)',
          card: 'rgb(var(--color-bg-card) / <alpha-value>)',
          text: 'rgb(var(--color-text-main) / <alpha-value>)',
        }
      }
    },
  },
  plugins: [],
};
