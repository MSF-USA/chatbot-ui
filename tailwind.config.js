/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        'scroll-text': {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        indeterminate: {
          '0%': { left: '-50%', width: '50%' },
          '50%': { left: '25%', width: '50%' },
          '100%': { left: '100%', width: '0%' },
        },
      },
      animation: {
        'scroll-text': 'scroll-text 10s linear infinite',
        indeterminate: 'indeterminate 1.5s infinite',
      },
    },
  },
  variants: {
    extend: {
      visibility: ['group-hover'],
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
