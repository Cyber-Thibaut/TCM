/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'media',
  content: ["./src/**/*.{html,js}", "./index.html", "./404.html"],
  theme: {
    container: {
      padding: '2rem',
    },
    extend: {},
  },
  daisyui: {
    themes: ["winter", "night", "dark"],
  },
  plugins: [require("daisyui", 'flowbite/plugin','@tailwindcss/aspect-ratio')],
}

