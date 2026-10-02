/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // DNA v2 "Lal-Paar Table" — docs/DESIGN_DNA.md §2. Red = action,
        // gold = value; never swap them.
        ht: {
          red: '#7E0E15', red2: '#5A070D', ink: '#150A0A',
          gold: '#E0AE45', gold2: '#F6DC9A', gold3: '#A87524',
          ivory: '#FBF2E1', paper: '#F7EEDC',
          veg: '#1F7A3A', nonveg: '#8A3B12', mute: '#5E4B45',
        },
      },
      fontFamily: {
        sans: ['Archivo', 'system-ui', 'sans-serif'],
        display: ['"Archivo Black"', 'Archivo', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        soft: '0 8px 30px rgba(0,0,0,0.25)',
        plate: '0 18px 30px -12px rgba(60,20,10,.45), 0 2px 4px rgba(60,20,10,.15)',
      },
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
