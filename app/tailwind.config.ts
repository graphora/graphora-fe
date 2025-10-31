import type { Config } from 'tailwindcss'

type FontSizeConfig = [string, { lineHeight: string; fontWeight?: string }]

const fontSizeScale: Record<string, FontSizeConfig> = {
  xs: ['var(--font-size-xs)', { lineHeight: 'var(--line-height-snug)' }],
  sm: ['var(--font-size-sm)', { lineHeight: 'var(--line-height-relaxed)' }],
  base: ['var(--font-size-base)', { lineHeight: 'var(--line-height-relaxed)' }],
  lg: ['var(--font-size-lg)', { lineHeight: 'var(--line-height-relaxed)' }],
  xl: ['var(--font-size-xl)', { lineHeight: 'var(--line-height-snug)', fontWeight: '600' }],
  '2xl': ['var(--font-size-2xl)', { lineHeight: 'var(--line-height-tight)', fontWeight: '600' }],
  '3xl': ['var(--font-size-3xl)', { lineHeight: 'var(--line-height-tight)', fontWeight: '600' }],
  '4xl': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '600' }],
  '5xl': ['3rem', { lineHeight: '1', fontWeight: '700' }],
  '6xl': ['3.75rem', { lineHeight: '1', fontWeight: '700' }],
  '7xl': ['4.5rem', { lineHeight: '1', fontWeight: '700' }],
  '8xl': ['6rem', { lineHeight: '1', fontWeight: '700' }],
  '9xl': ['8rem', { lineHeight: '1', fontWeight: '700' }],
}

const fontSizeAliases: Record<string, FontSizeConfig> = {
  'body-xs': fontSizeScale.xs,
  'body-sm': fontSizeScale.sm,
  body: fontSizeScale.base,
  'body-lg': fontSizeScale.lg,
  'heading-sm': fontSizeScale.lg,
  heading: fontSizeScale.xl,
  'display-sm': fontSizeScale['2xl'],
  'display-lg': fontSizeScale['3xl'],
} as const

const spacingTokens = {
  'content-sm': 'var(--space-content-sm)',
  content: 'var(--space-content-md)',
  'content-lg': 'var(--space-content-lg)',
  'content-gap': 'var(--space-content-gap)',
  'section-sm': 'var(--space-section-sm)',
  section: 'var(--space-section)',
  'section-lg': 'var(--space-section-lg)',
  'section-inline': 'var(--space-section-inline)',
} as const

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    fontSize: fontSizeScale,
    extend: {
      colors: {
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--destructive) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "rgb(var(--success) / <alpha-value>)",
          foreground: "rgb(var(--success-foreground) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "rgb(var(--warning) / <alpha-value>)",
          foreground: "rgb(var(--warning-foreground) / <alpha-value>)",
        },
        info: {
          DEFAULT: "rgb(var(--info) / <alpha-value>)",
          foreground: "rgb(var(--info-foreground) / <alpha-value>)",
        },
        neutral: {
          DEFAULT: "rgb(var(--neutral) / <alpha-value>)",
          foreground: "rgb(var(--neutral-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--popover) / <alpha-value>)",
          foreground: "rgb(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },
      },
      fontSize: fontSizeAliases,
      spacing: spacingTokens,
      boxShadow: {
        soft: 'var(--shadow-soft)',
        medium: 'var(--shadow-medium)',
        large: 'var(--shadow-large)',
        glass: '0 18px 45px rgba(15, 23, 42, 0.16)',
      },
      backdropBlur: {
        glass: '18px',
        panel: '24px',
      },
      backgroundImage: {
        'glass-overlay': 'linear-gradient(140deg, rgba(255,255,255,0.22), rgba(255,255,255,0.05))',
        'glass-overlay-dark': 'linear-gradient(140deg, rgba(148,163,184,0.16), rgba(15,23,42,0.25))',
      },
      borderRadius: {
        xl: 'var(--border-radius-lg)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        fadeOut: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' }
        },
        pressDown: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.98)' },
          '100%': { transform: 'scale(1)' }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        fadeIn: 'fadeIn 0.3s ease-out',
        fadeOut: 'fadeOut 0.3s ease-out',
        pressDown: 'pressDown 0.2s ease-out'
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
