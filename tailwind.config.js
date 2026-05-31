/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#7B5EA7',      // purple — new brand primary
        accent:  '#4FACFE',      // electric blue — gradient endpoint
        teal:    '#00C49A',
        gold:    '#F59E0B',
        orange:  '#FF6B35',      // kept for score/data viz only
        indigo:  '#6366F1',
        navy: {
          950: '#030811',
          900: '#050810',
          800: '#080E1C',
          700: '#0C1628',
          600: '#142035',
          500: '#1E3048',
          400: '#2E4A6A',
        },
        muted: '#6B8CAE',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
