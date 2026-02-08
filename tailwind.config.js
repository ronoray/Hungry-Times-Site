/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { red: '#E02424', redDark: '#B81E1E', white: '#FFFFFF', gray: '#111316' }
      },
      boxShadow: { soft: '0 8px 30px rgba(0,0,0,0.25)' },
      borderRadius: { xl2: '1.25rem' },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        slideUp: 'slideUp 0.25s ease-out',
      },
    }
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')]
}
