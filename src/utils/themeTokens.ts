export type ThemePresetId =
  | 'auto_daily'
  | 'emerald_volt'
  | 'gold_obsidian'
  | 'mint_apple'
  | 'ocean_fintech';

export interface ThemePaletteTokens {
  id: Exclude<ThemePresetId, 'auto_daily'>;
  name: string;
  primary: string;
  primaryHover: string;
  accent: string;
  accentInk: string;
  gold: string;
  canvas: string;
  surface: string;
  ink: string;
  muted: string;
}

/**
 * Extracted Design System JSON from the Spendvest & Fold Fintech mobile/web references.
 * All UI components consume these tokens via CSS custom properties so daily theme rotation is instant.
 */
export const DESIGN_STYLE_JSON = {
  meta: {
    style: 'Minimalist Fintech & Apple Wallet',
    references: ['Spendvest Light Bento', 'Spendvest Order Review & Settings', 'Fold Card Accent'],
    gridBase: 4,
    typography: {
      display: 'Plus Jakarta Sans',
      body: 'DM Sans',
      mono: 'JetBrains Mono',
      numericVariant: 'tabular-nums',
    },
    radii: {
      card: '24px',
      innerCard: '16px',
      buttonPill: '9999px',
      gridCell: '12px',
    },
    borders: {
      hairline: '1px solid rgba(0, 0, 0, 0.06)',
    },
  },
  themes: [
    {
      id: 'emerald_volt',
      name: 'Obsidian Lime (Redesign)',
      primary: '#c8ff37',
      primaryHover: '#b4f022',
      accent: '#c8ff37',
      accentInk: '#0a0d0a',
      gold: '#D9B85D',
      canvas: '#080b09',
      surface: '#111512',
      ink: '#f5f7f3',
      muted: '#929a94',
    },
    {
      id: 'gold_obsidian',
      name: 'Obsidian Gold',
      primary: '#D9B85D',
      primaryHover: '#e3c674',
      accent: '#D9B85D',
      accentInk: '#0a0d0a',
      gold: '#F59E0B',
      canvas: '#080b09',
      surface: '#111512',
      ink: '#f5f7f3',
      muted: '#929a94',
    },
    {
      id: 'mint_apple',
      name: 'Emerald Mint Dark',
      primary: '#34D399',
      primaryHover: '#10B981',
      accent: '#34D399',
      accentInk: '#06281E',
      gold: '#D9B85D',
      canvas: '#070c0a',
      surface: '#0f1714',
      ink: '#f5f7f3',
      muted: '#929a94',
    },
    {
      id: 'ocean_fintech',
      name: 'Ocean Neon Dark',
      primary: '#38BDF8',
      primaryHover: '#0EA5E9',
      accent: '#38BDF8',
      accentInk: '#082F49',
      gold: '#FBBF24',
      canvas: '#070b10',
      surface: '#0f151d',
      ink: '#f5f7f3',
      muted: '#94a3b8',
    },
  ] satisfies ThemePaletteTokens[],
} as const;

export const DAILY_THEME_PRESETS: ThemePaletteTokens[] = [...DESIGN_STYLE_JSON.themes];

/**
 * Resolves the active palette automatically by day of the year (rotating daily)
 * or uses a fixed preset if selected.
 */
export function resolveActiveTheme(
  preference: ThemePresetId = 'auto_daily',
  date: Date = new Date()
): ThemePaletteTokens {
  if (preference !== 'auto_daily') {
    const found = DAILY_THEME_PRESETS.find((t) => t.id === preference);
    if (found) return found;
  }
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diffMs = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diffMs / 86_400_000);
  return DAILY_THEME_PRESETS[dayOfYear % DAILY_THEME_PRESETS.length];
}

/**
 * Applies the active palette to CSS custom properties on :root for zero-reload theme switching.
 */
export function applyThemeCssVariables(theme: ThemePaletteTokens): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  root.setProperty('--brand-primary', theme.primary);
  root.setProperty('--brand-primary-hover', theme.primaryHover);
  root.setProperty('--brand-accent', theme.accent);
  root.setProperty('--brand-accent-ink', theme.accentInk);
  root.setProperty('--brand-gold', theme.gold);
  root.setProperty('--brand-canvas', theme.canvas);
  root.setProperty('--brand-surface', theme.surface);
  root.setProperty('--brand-ink', theme.ink);
  root.setProperty('--brand-muted', theme.muted);
}
