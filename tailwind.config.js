/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'], // Define Inter font
      },
      colors: {
        primary: '#1a202c', // Dark blue/gray for primary elements
        secondary: '#2d3748', // Slightly lighter dark for secondary
        accent: '#667eea', // Purple/blue for accents
        textLight: '#e2e8f0', // Light text on dark backgrounds
        textDark: '#1a202c', // Dark text on light backgrounds
        cardBg: '#2f3b4c', // Background for cards
        inputBg: '#4a5568', // Background for input fields
      },
    },
  },
  plugins: [],
};
