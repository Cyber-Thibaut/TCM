/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["/**/*.{html,js}"],
  theme: {
    container: {
      padding: '3rem',
    },
    extend: {},
  },
  daisyui: {
    themes: ["winter", "night", "dark"],
  },
  plugins: [require("daisyui", '@tailwindcss/aspect-ratio')],
}

