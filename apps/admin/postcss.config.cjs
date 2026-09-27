const path = require('path');

// Tailwind only expands the @tailwind directives found in src/console/index.css; every other
// stylesheet in the admin app passes through unchanged (plus autoprefixer).
module.exports = {
  plugins: {
    tailwindcss: { config: path.join(__dirname, 'tailwind.config.cjs') },
    autoprefixer: {},
  },
};
