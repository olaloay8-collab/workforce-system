/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F1F6FB',
          100: '#DBEAFE',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
          dark: '#4F8CFF',
        },
        surface: {
          light: '#FFFFFF',
          lightSec: '#F1F6FB',
          dark: '#0D1321',
          darkSec: '#121A2A',
          darkElevated: '#172033',
        },
        bg: {
          light: '#F6F9FC',
          dark: '#070B14',
        },
        status: {
          green: '#22C55E',
          blue: '#3B82F6',
          amber: '#F59E0B',
          red: '#EF4444',
          indigo: '#6366F1',
          gray: '#64748B',
        }
      },
      borderRadius: {
        'apple': '16px',
        'apple-sm': '12px',
        'apple-lg': '24px',
      },
      boxShadow: {
        'subtle': '0 2px 12px rgba(0, 0, 0, 0.04)',
        'water': '0 8px 32px 0 rgba(37, 99, 235, 0.12)',
        'water-dark': '0 8px 32px 0 rgba(79, 140, 255, 0.15)',
      }
    },
  },
  plugins: [],
}
