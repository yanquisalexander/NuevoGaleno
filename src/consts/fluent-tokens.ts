/**
 * Fluent UI v9 / Windows 11 Design Tokens — Galeno Central Theme
 *
 * Centraliza los tokens de diseño que antes estaban duplicados en ~20 componentes.
 *
 * Tres variantes disponibles:
 *   - fluentDark         → Superficies principales (app frame, paneles, tarjetas)
 *   - fluentDarkOverlay  → Superficies flotantes (search overlay, context menu, flyout)
 *   - fluentDarkCompact  → Nombres cortos ("F.*") para componentes estilo agenda / cuentas
 */

// ─────────────────────────────────────────────────────────────────────────────
// Variante principal — tema oscuro estándar de toda la aplicación
// ─────────────────────────────────────────────────────────────────────────────
export const fluentDark = {
    // ── Neutral backgrounds (layered system) ──────────────────────────────────
    colorNeutralBackground1: '#1c1c1c',
    colorNeutralBackground2: '#242424',
    colorNeutralBackground3: '#2e2e2e',
    colorNeutralBackground4: '#383838',
    colorNeutralBackground1Hover: '#333333',
    colorNeutralBackground1Selected: '#383838',
    colorNeutralBackground1Pressed: '#2a2a2a',
    colorNeutralBackgroundInverted: '#ffffff',

    // ── Neutral foregrounds ────────────────────────────────────────────────────
    colorNeutralForeground1: '#ffffff',
    colorNeutralForeground2: 'rgba(255,255,255,0.72)',
    colorNeutralForeground3: 'rgba(255,255,255,0.48)',
    colorNeutralForeground4: 'rgba(255,255,255,0.28)',

    // ── Neutral strokes ────────────────────────────────────────────────────────
    colorNeutralStroke1: 'rgba(255,255,255,0.10)',
    colorNeutralStroke2: 'rgba(255,255,255,0.06)',
    colorNeutralStrokeAccessible: '#616161',

    // ── Brand / Accent (WinUI Blue) ────────────────────────────────────────────
    colorBrandBackground: '#0078d4',
    colorBrandBackgroundHover: '#106ebe',
    colorBrandBackgroundPressed: '#005a9e',
    colorBrandForeground: '#4da6ff',   // tokens.colorBrandForeground  (estilo v9 principal)
    colorBrandForeground1: '#479ef5',   // tokens.colorBrandForeground1 (estilo v9 overlay)
    colorBrandForeground2: '#2899f5',
    colorBrandStroke1: '#479ef5',
    colorBrandBackground2: 'rgba(71,158,245,0.08)',

    // ── Status palette: Green ──────────────────────────────────────────────────
    colorPaletteGreenForeground: '#73c765',
    colorPaletteGreenBackground: 'rgba(107,191,89,0.12)',
    colorPaletteGreenBorder: 'rgba(107,191,89,0.25)',

    // ── Status palette: Red ────────────────────────────────────────────────────
    colorPaletteRedForeground: '#f1707a',
    colorPaletteRedBackground: 'rgba(232,17,35,0.12)',
    colorPaletteRedBorder: 'rgba(232,17,35,0.25)',

    // ── Status palette: Yellow ─────────────────────────────────────────────────
    colorPaletteYellowForeground: '#ffb900',
    colorPaletteYellowBackground: 'rgba(255,185,0,0.12)',

    // ── Status palette: Marigold ───────────────────────────────────────────────
    colorPaletteMarigoldForeground: '#e08c00',
    colorPaletteMarigoldBackground: 'rgba(224,140,0,0.14)',

    // ── Border radii (Fluent v9 spec) ──────────────────────────────────────────
    borderRadiusMedium: '4px',
    borderRadiusLarge: '8px',
    borderRadiusXLarge: '12px',

    // ── Motion ─────────────────────────────────────────────────────────────────
    durationNormal: '150ms',
    curveEasyEase: 'cubic-bezier(0.33,0,0.67,1)',

    // ── Typography ─────────────────────────────────────────────────────────────
    fontFamilyBase: '"Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
    fontFamilyMono: '"Cascadia Code", "Cascadia Mono", Consolas, monospace',
    fontSizeBase200: '11px',
    fontSizeBase300: '12px',
    fontSizeBase400: '14px',
    fontSizeBase500: '16px',
    fontSizeBase600: '20px',
    fontSizeBase700: '24px',
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightSemibold: 600,

    // ── Elevation / Shadows ────────────────────────────────────────────────────
    shadow4: '0 2px 4px rgba(0,0,0,0.26), 0 0 2px rgba(0,0,0,0.16)',
    shadow8: '0 4px 8px rgba(0,0,0,0.28)',
    shadow16: '0 8px 16px rgba(0,0,0,0.24)',
    shadow28: '0 14px 28px rgba(0,0,0,0.32)',
    shadow64: '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Variante overlay — context menu, search, flyouts (bg más claro: #292929)
// ─────────────────────────────────────────────────────────────────────────────
export const fluentDarkOverlay = {
    ...fluentDark,

    // Superficies elevadas sobre el canvas principal
    colorNeutralBackground1: '#292929',
    colorNeutralBackground1Hover: '#333333',
    colorNeutralBackground1Selected: '#383838',
    colorNeutralBackground1Pressed: '#333333',

    // Profundidad interior del overlay (backdrop)
    colorNeutralBackground3: '#1f1f1f',

    // Foregrounds con mayor contraste para legibilidad sobre fondo semitransparente
    colorNeutralForeground2: '#d6d6d6',
    colorNeutralForeground3: '#adadad',
    colorNeutralForeground4: '#707070',

    // Stroke más visible sobre superficies intermedias
    colorNeutralStroke2: '#404040',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Variante compact — nombres cortos ("F.*") para apps estilo Appointments/Accounts
// ─────────────────────────────────────────────────────────────────────────────
export const fluentDarkCompact = {
    // Backgrounds
    bg: '#141414',
    surface: '#1c1c1c',
    surfaceRaised: '#222222',
    overlay: '#282828',

    // Interaction states
    hover: 'rgba(255,255,255,0.06)',
    pressed: 'rgba(255,255,255,0.04)',

    // Borders
    border: 'rgba(255,255,255,0.08)',
    borderMed: 'rgba(255,255,255,0.12)',

    // Brand
    brand: '#479ef5',
    brandBg: '#0078d4',
    brandHover: '#106ebe',
    brandMuted: 'rgba(71,158,245,0.12)',
    brandBorder: 'rgba(71,158,245,0.28)',

    // Text
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.62)',
    textDisabled: 'rgba(255,255,255,0.32)',

    // Status
    success: '#6ccb5f',
    successMuted: 'rgba(108,203,95,0.10)',
    successBorder: 'rgba(108,203,95,0.22)',
    warning: '#fce100',
    warningMuted: 'rgba(252,225,0,0.08)',
    warningBorder: 'rgba(252,225,0,0.22)',

    // Calendar-specific
    weekend: 'rgba(255,255,255,0.018)',
    today: 'rgba(71,158,245,0.07)',
    todayBorder: '#479ef5',

    // Typography
    font: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
    fontMono: "'Cascadia Code', 'Consolas', monospace",
} as const;

// Re-exportar tipos para uso en TypeScript
export type FluentDarkTokens = typeof fluentDark;
export type FluentOverlayTokens = typeof fluentDarkOverlay;
export type FluentCompactTokens = typeof fluentDarkCompact;
