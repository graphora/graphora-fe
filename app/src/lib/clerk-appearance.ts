import type { Appearance } from '@clerk/types'

/**
 * Clerk `<SignIn>` / `<SignUp>` theme — binds every surface to the Graphora
 * design tokens so the embedded form reads the same in dark and light mode.
 *
 * Why inline styles (not Tailwind classes)? Clerk ships its own CSS that wins
 * specificity, and Tailwind's JIT didn't reliably generate classes from the
 * concatenated `!bg-[color:var(--...)]` strings we were composing inside this
 * module. The `elements` object form — `{ style: CSSProperties }` — sidesteps
 * both problems: CSS variables resolve at render time, and browser inline-
 * style specificity beats any `cl-*` rule Clerk emits.
 */
export const clerkAppearance: Appearance = {
  elements: {
    rootBox: { width: '100%' },
    card: { boxShadow: 'none', border: 0, background: 'transparent', padding: 0 },
    headerTitle: { display: 'none' },
    headerSubtitle: { display: 'none' },

    // Social buttons — icon-only (square logo tiles)
    socialButtonsIconButton: {
      background: 'var(--bg-elev)',
      border: '1px solid var(--line-strong)',
      boxShadow: 'none',
      color: 'var(--fg)',
      transition: 'background var(--dur-1) var(--ease), border-color var(--dur-1) var(--ease)',
    },
    // Hover via className — Clerk appends our className after its own, so
    // this CSS-in-class trick wins because inline styles take hover from :hover rules.
    socialButtonsBlockButton: {
      background: 'var(--bg-elev)',
      border: '1px solid var(--line-strong)',
      boxShadow: 'none',
      color: 'var(--fg)',
    },
    socialButtonsBlockButtonText: { color: 'var(--fg)', fontWeight: 500 },
    socialButtonsProviderIcon: { opacity: 1 },

    // Divider
    dividerLine: { background: 'var(--line)' },
    dividerText: {
      color: 'var(--fg-faint)',
      fontSize: '10.5px',
      textTransform: 'uppercase',
      letterSpacing: '0.14em',
    },

    // Inputs
    formFieldLabel: {
      color: 'var(--fg-muted)',
      fontSize: '11.5px',
      fontWeight: 500,
    },
    formFieldInput: {
      background: 'var(--bg-deep)',
      border: '1px solid var(--line-strong)',
      color: 'var(--fg)',
      boxShadow: 'none',
    },
    formFieldInputShowPasswordButton: { color: 'var(--fg-muted)' },

    // Primary CTA
    formButtonPrimary: {
      background: 'var(--gx-accent)',
      color: 'var(--gx-accent-fg)',
      border: 0,
      boxShadow: 'none',
      fontWeight: 500,
    },

    // Footer links
    footerAction: { background: 'transparent' },
    footerActionText: { color: 'var(--fg-muted)' },
    footerActionLink: { color: 'var(--gx-accent)' },

    // Identity preview (email summary on password step)
    identityPreview: {
      background: 'var(--bg-elev)',
      border: '1px solid var(--line)',
      color: 'var(--fg)',
    },
    identityPreviewText: { color: 'var(--fg)' },
    identityPreviewEditButton: { color: 'var(--fg-muted)' },

    // Form messages
    formFieldErrorText: { color: 'var(--danger)' },
    alertText: { color: 'var(--fg)' },
  },
  variables: {
    colorPrimary: 'var(--gx-accent)',
    colorText: 'var(--fg)',
    colorTextSecondary: 'var(--fg-muted)',
    colorTextOnPrimaryBackground: 'var(--gx-accent-fg)',
    colorBackground: 'var(--bg)',
    colorInputBackground: 'var(--bg-deep)',
    colorInputText: 'var(--fg)',
    colorNeutral: 'var(--line-strong)',
    borderRadius: 'var(--r-sm)',
    fontFamily: 'var(--font-sans), "IBM Plex Sans", system-ui, sans-serif',
    fontSize: '13.5px',
  },
}
