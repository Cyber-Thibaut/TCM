/** @type {import('tailwindcss').Config} */
module.exports = {
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
  plugins: [require("daisyui"),require('flowbite/plugin')],
}

