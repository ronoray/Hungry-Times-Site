/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#E02424',
          redDark: '#B81E1E',
          orange: '#F97316',
          orangeDark: '#EA580C',
          white: '#FFFFFF',
          gray: '#111316',
        }
      },
      boxShadow: { soft: '0 8px 30px rgba(0,0,0,0.25)' },
      borderRadius: { xl2: '1.25rem' },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // DNA "hop": floating action buttons rest, then do one small double
        // hop every few seconds — alive, never jittery. Use as
        // motion-safe:animate-hop so reduced-motion users get a still button.
        hop: {
          '0%, 70%, 100%': { transform: 'translateY(0) scale(1)' },
          '76%': { transform: 'translateY(-8px) scale(1.04)' },
          '82%': { transform: 'translateY(0) scale(0.98)' },
          '88%': { transform: 'translateY(-3px) scale(1.01)' },
          '94%': { transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        slideUp: 'slideUp 0.25s ease-out',
        hop: 'hop 4.5s ease-in-out infinite',
      },
    }
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')]
}
