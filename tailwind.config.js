/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js}",
    'node_modules/preline/dist/*.js',
  ],
  theme: {
    extend: {},
  },
  plugins: [
    // ...
    require('@tailwindcss/aspect-ratio'),
    require('preline/plugin'),
  ],
}

