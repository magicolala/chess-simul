/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin';

export default {
  content: [
    "./index.html",
    "./src/**/*.{html,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'sans-serif'],
      },
    },
  },
  plugins: [
    plugin(function({ addUtilities }) {
      addUtilities({
        '.wero-shadow': {
          'box-shadow': '4px 4px 0px 0px #1d1c1c',
        },
        '.wero-shadow-sm': {
          'box-shadow': '2px 2px 0px 0px #1d1c1c',
        },
        '.wero-shadow-hover': {
          'box-shadow': '6px 6px 0px 0px #1d1c1c',
          'transform': 'translate(-2px, -2px)',
        },
        '.wero-shadow-active': {
          'box-shadow': '0px 0px 0px 0px #1d1c1c',
          'transform': 'translate(2px, 2px)',
        },
      })
    })
  ],
}
