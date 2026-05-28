/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary:  '#FF6B35',
        teal:     '#00C49A',
        navy: {
          950: '#040B15',
          900: '#060E1A',
          800: '#0A1628',
          700: '#0F1E35',
          600: '#1A2E4A',
          500: '#243D5F',
          400: '#3A5A82',
        },
        muted: '#6B8CAE',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pop':        'pop 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: 0 },                              '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        pop:     { '0%': { opacity: 0, transform: 'scale(0.75)' },     '100%': { opacity: 1, transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}
