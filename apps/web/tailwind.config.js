/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: {
      xs: '420px', // narrow phones in landscape, iPhone Mini portrait
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Legacy tokens (kept stable for components not yet migrated)
        'brand-background': '#0a0a0b',
        'brand-surface': '#16161a',
        'brand-primary': '#E50914',
        'brand-secondary': '#FFFFFF',
        'brand-muted': '#9a9aa3',
        // Surface scale — deeper black, layered cards
        ink: {
          900: '#0a0a0b',
          800: '#101013',
          700: '#16161a',
          600: '#1f1f25',
          500: '#2a2a32',
          400: '#3d3d47',
          300: '#5a5a66',
          200: '#9a9aa3',
          100: '#d4d4dc',
          50:  '#f5f5f7',
        },
        accent: {
          DEFAULT: '#E50914',
          hover: '#f6121e',
          glow: 'rgba(229, 9, 20, 0.45)',
          soft: 'rgba(229, 9, 20, 0.12)',
        },
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      boxShadow: {
        'glow-accent': '0 0 24px 0 rgba(229, 9, 20, 0.35)',
        'glow-accent-lg': '0 0 40px 0 rgba(229, 9, 20, 0.5)',
        'card': '0 4px 24px 0 rgba(0, 0, 0, 0.4)',
        'card-lg': '0 12px 48px 0 rgba(0, 0, 0, 0.55)',
      },
      animation: {
        'fade-in': 'fadeIn 1s ease-in-out',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'pulse-glow': 'pulseGlow 2.5s infinite ease-in-out',
        levitate: 'levitate 4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(229, 9, 20, 0.4)' },
          '50%': { boxShadow: '0 0 35px rgba(229, 9, 20, 0.8)' },
        },
        levitate: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
};
