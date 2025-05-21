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
        'scroll-text-pause': {
          '0%': { transform: 'translateX(0%)' },
          '10%': { transform: 'translateX(0%)' },
          '40%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(-100%)' },
          '60%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(0%)' },
        },
        indeterminate: {
          '0%': { left: '-50%', width: '50%' },
          '50%': { left: '25%', width: '50%' },
          '100%': { left: '100%', width: '0%' },
        },
        'progress-bar-stripes': {
          '0%': { backgroundPosition: '1rem 0' },
          '100%': { backgroundPosition: '0 0' },
        },
        'animate-pulse': {
          '0%': { opacity: 1 },
          '50%': { opacity: 0.5 },
          '100%': { opacity: 1 },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'scroll-text': 'scroll-text 10s linear infinite',
        'scroll-text-auto': 'scroll-text-pause 12s ease-in-out infinite',
        indeterminate: 'indeterminate 1.5s infinite',
        'progress-bar-stripes': 'progress-bar-stripes 1s linear infinite',
        'animate-pulse': 'pulse 2s infinite',
        'spin-slow': 'spin-slow 4s linear infinite',
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
