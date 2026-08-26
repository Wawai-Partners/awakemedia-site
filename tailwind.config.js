/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Poppins'", 'system-ui', 'sans-serif'],
        // `font-mono` is used for the small uppercase labels; by design it
        // renders in the body face rather than an actual monospace.
        mono: ["'Poppins'", 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
