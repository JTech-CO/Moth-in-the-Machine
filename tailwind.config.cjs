/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        amber: 'var(--accent-amber)',
        brass: 'var(--accent-brass)',
        cream: 'var(--text-cream)',
        gunmetal: 'var(--bg-dark)',
        muted: 'var(--text-muted)',
        panel: 'var(--panel-metal)',
      },
      fontFamily: {
        mono: ['var(--font-typewriter)'],
        sans: ['var(--font-ui)'],
      },
    },
  },
  plugins: [],
};
