export type WelcomeTheme = 'default' | 'charcoal' | 'bronze' | 'teal';
export type WelcomeFont = 'sans' | 'serif';
export type WelcomeSize = 's' | 'm' | 'l';

export type WelcomeStyle = {
  theme: WelcomeTheme;
  font: WelcomeFont;
  size: WelcomeSize;
  headlineColor: string | null;
  bodyColor: string | null;
  accentColor: string | null;
};

export type ResolvedWelcomeStyle = {
  fontFamily: WelcomeFont;
  size: WelcomeSize;
  headlineColor: string;
  bodyColor: string;
  accentColor: string;
};

const THEMES = new Set<WelcomeTheme>(['default', 'charcoal', 'bronze', 'teal']);
const FONTS = new Set<WelcomeFont>(['sans', 'serif']);
const SIZES = new Set<WelcomeSize>(['s', 'm', 'l']);

const THEME_COLORS: Record<
  WelcomeTheme,
  { headline: string; body: string; accent: string }
> = {
  default: { headline: '#14110f', body: '#6b635a', accent: '#8a6a3a' },
  charcoal: { headline: '#14110f', body: '#4a433c', accent: '#2a2420' },
  bronze: { headline: '#4a3820', body: '#5c4728', accent: '#8a6a3a' },
  teal: { headline: '#1e3d34', body: '#3d6b5c', accent: '#3d6b5c' },
};

const HEX = /^#[0-9a-fA-F]{6}$/;

export const DEFAULT_WELCOME_STYLE: WelcomeStyle = {
  theme: 'default',
  font: 'sans',
  size: 'm',
  headlineColor: null,
  bodyColor: null,
  accentColor: null,
};

function normalizeHex(value: unknown, label: string): string | null {
  if (value == null || value === '') return null;
  const text = String(value).trim();
  if (!text) return null;
  const hex = text.startsWith('#') ? text : `#${text}`;
  if (!HEX.test(hex)) throw new Error(`${label} color must be a hex value like #8A6A3A`);
  return hex;
}

/** Normalize and validate style from admin input or DB JSON. */
export function assertWelcomeStyle(input: unknown): WelcomeStyle {
  if (input == null || input === '') return { ...DEFAULT_WELCOME_STYLE };

  let raw: Record<string, unknown>;
  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input) as Record<string, unknown>;
    } catch {
      throw new Error('Style must be valid JSON');
    }
  } else if (typeof input === 'object') {
    raw = input as Record<string, unknown>;
  } else {
    throw new Error('Style is invalid');
  }

  const theme = (raw.theme as WelcomeTheme) || 'default';
  if (!THEMES.has(theme)) throw new Error('Style theme is invalid');

  const font = (raw.font as WelcomeFont) || 'sans';
  if (!FONTS.has(font)) throw new Error('Style font is invalid');

  const size = (raw.size as WelcomeSize) || 'm';
  if (!SIZES.has(size)) throw new Error('Style size is invalid');

  return {
    theme,
    font,
    size,
    headlineColor: normalizeHex(raw.headlineColor, 'Headline'),
    bodyColor: normalizeHex(raw.bodyColor, 'Body'),
    accentColor: normalizeHex(raw.accentColor, 'Accent'),
  };
}

/** Resolve preset + overrides into concrete colors for rendering. */
export function resolveWelcomeStyle(style: WelcomeStyle): ResolvedWelcomeStyle {
  const preset = THEME_COLORS[style.theme] || THEME_COLORS.default;
  return {
    fontFamily: style.font,
    size: style.size,
    headlineColor: style.headlineColor || preset.headline,
    bodyColor: style.bodyColor || preset.body,
    accentColor: style.accentColor || preset.accent,
  };
}

export function welcomeFontClass(font: WelcomeFont): string {
  return font === 'serif' ? 'font-serif' : 'font-sans';
}

export function welcomeHeadlineClass(size: WelcomeSize): string {
  if (size === 's') return 'text-headline-md';
  if (size === 'l') return 'text-headline-lg lg:text-[2.15rem]';
  return 'text-headline-lg';
}

export function welcomeBodyClass(size: WelcomeSize): string {
  if (size === 's') return 'text-body-sm';
  if (size === 'l') return 'text-body-lg';
  return 'text-body-md';
}
