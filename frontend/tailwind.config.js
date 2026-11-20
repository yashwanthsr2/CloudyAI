/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Deep Charcoal / Cyber Dark palette (avoiding flat solid pitch black)
        cosmic: {
          950: '#080b12', // deep charcoal background
          900: '#0d121f', // card & panel background
          850: '#111728', // elevated card background
          800: '#161f36', // hover & active surfaces
          750: '#1c2744', // subtle borders / highlights
          700: '#243258', // active borders
          border: 'rgba(255, 255, 255, 0.08)',
          glow: 'rgba(124, 58, 237, 0.15)',
        },
        // Electric Violet (Primary Accent)
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        // Cyan (Secondary Accent)
        cyan: {
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        // Security Status Accents
        security: {
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
      },
      backgroundImage: {
        'cyber-gradient': 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
        'violet-gradient': 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
        'cyan-gradient': 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
        'emerald-gradient': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      },
      boxShadow: {
        'violet-glow': '0 0 25px -5px rgba(124, 58, 237, 0.25)',
        'cyan-glow': '0 0 25px -5px rgba(6, 182, 212, 0.25)',
        'emerald-glow': '0 0 25px -5px rgba(16, 185, 129, 0.25)',
        'panel': '0 10px 30px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      }
    },
  },
  plugins: [],
}
