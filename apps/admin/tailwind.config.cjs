/** Tailwind is used ONLY by the management console (src/console + console/index.html). */
module.exports = {
  content: [__dirname + '/console/index.html', __dirname + '/src/console/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
          500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
};
