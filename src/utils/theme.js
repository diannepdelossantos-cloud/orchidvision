// Shared design tokens for the OrchidVision app.
// Colors are sampled from the approved storyboard (dark green splash/headers,
// light green accents, off-white surfaces).

export const COLORS = {
  primary: '#4CAF50',
  primaryDark: '#223F1E', // sampled directly from the official logo background
  primaryDarker: '#152713',
  secondary: '#8BC34A',
  background: '#F7F8F5',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  textInverse: '#FFFFFF',
  textInverseMuted: 'rgba(255,255,255,0.75)',
  border: '#E0E0E0',
  error: '#E53935',
  danger: '#E53935',
  success: '#4CAF50',
  warning: '#FF9800',
  info: '#2196F3',
};

// Dark-mode counterpart, consumed via ThemeContext (see src/context/ThemeContext.js).
// Only screens built for the User Account module (Profile, Settings, the tab
// bar) read this through the context; earlier screens still import COLORS
// directly and are unaffected by the theme toggle.
export const DARK_COLORS = {
  primary: '#66BB6A',
  primaryDark: '#152713',
  primaryDarker: '#0D1A0B',
  secondary: '#8BC34A',
  background: '#121412',
  surface: '#1C1F1C',
  textPrimary: '#F2F3F1',
  textSecondary: '#A7ACA6',
  textInverse: '#FFFFFF',
  textInverseMuted: 'rgba(255,255,255,0.75)',
  border: '#33362F',
  error: '#EF5350',
  danger: '#EF5350',
  success: '#66BB6A',
  warning: '#FFA726',
  info: '#42A5F5',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
};

export const TYPOGRAPHY = {
  logo: { fontSize: 32, fontWeight: '700' },
  h1: { fontSize: 26, fontWeight: '700' },
  h2: { fontSize: 20, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
  button: { fontSize: 16, fontWeight: '700' },
};

// Admin Control Center tag colors — soft background + matching text, used
// for disease category / severity chips, status pills, and log-level tags
// across the Admin screens (Users, Diseases, Data, Monitor).
export const TAG_COLORS = {
  fungal: { bg: '#EDE7F6', text: '#6A1B9A' },
  bacterial: { bg: '#FFF3E0', text: '#EF6C00' },
  viral: { bg: '#E3F2FD', text: '#1565C0' },
  mild: { bg: '#E8F5E9', text: '#2E7D32' },
  moderate: { bg: '#FFF3E0', text: '#EF6C00' },
  severe: { bg: '#FDECEA', text: '#C62828' },
  active: { bg: '#E8F5E9', text: '#2E7D32' },
  inactive: { bg: '#F1F1EF', text: '#6B7280' },
  admin: { bg: '#152713', text: '#FFFFFF' },
  user: { bg: '#FFFFFF', text: '#6B7280' },
  error: { bg: '#FDECEA', text: '#C62828' },
  warn: { bg: '#FFF3E0', text: '#EF6C00' },
  info: { bg: '#E3F2FD', text: '#1565C0' },
};

// Fixed palette for chart series (disease distribution donut, etc.) so
// colors stay consistent between the legend and the chart itself.
export const CHART_COLORS = ['#E57373', '#FFB74D', '#64B5F6', '#9575CD', '#81C784', '#4DB6AC'];

export const SHADOW = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
};