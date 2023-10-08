/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}", "./index.html"],
  theme: {
    container: {
      padding: '3rem',
    },
    extend: {},
  },
  daisyui: {
    themes: ["winter", "night", "dark"],
  },
  plugins: [require("daisyui", 'flowbite/plugin','@tailwindcss/aspect-ratio')],
}

