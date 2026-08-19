/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        jeta: {
          red: {
            DEFAULT: '#F40000',
            dark: '#C00000',
            light: '#FF3333',
          },
          green: {
            DEFAULT: '#45D61F',
            dark: '#239B16',
            light: '#6EE84A',
          },
          blue: {
            DEFAULT: '#0068D6',
            dark: '#004CB3',
            light: '#3391E0',
          },
          white: '#FFFFFF',
          gray: {
            light: '#E8E8E8',
            medium: '#B8B8B8',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'jeta': '0 4px 20px -2px rgba(0, 104, 214, 0.15)',
        'jeta-lg': '0 10px 40px -3px rgba(0, 104, 214, 0.2)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-jeta': 'linear-gradient(135deg, #F40000 0%, #C00000 100%)',
        'gradient-jeta-diagonal': 'linear-gradient(135deg, #0068D6 0%, #45D61F 50%, #F40000 100%)',
        'gradient-card-blue': 'linear-gradient(135deg, #0068D6 0%, #004CB3 100%)',
        'gradient-card-green': 'linear-gradient(135deg, #45D61F 0%, #239B16 100%)',
        'gradient-card-red': 'linear-gradient(135deg, #F40000 0%, #C00000 100%)',
        'gradient-card-amber': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        'gradient-header': 'linear-gradient(90deg, #1a1a2e 0%, #16213e 100%)',
      },
    },
  },
  plugins: [],
};
