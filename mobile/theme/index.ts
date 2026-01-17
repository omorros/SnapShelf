/**
 * SnapShelf Design System
 * "Fresh Pantry" — Warm Organic Minimalism
 *
 * A premium, inviting aesthetic inspired by modern farm-to-table
 * restaurants and artisanal food branding.
 */

import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const colors = {
  // Primary brand colors
  primary: {
    sage: '#7C9A82',        // Main brand color - fresh, organic
    sageDark: '#5C7A62',    // Pressed/active states
    sageLight: '#A8C4AE',   // Lighter variant
    sageMuted: '#E8F0EA',   // Very light backgrounds
  },

  // Accent colors
  accent: {
    terracotta: '#D4846B',  // Warm accent - appetizing
    terracottaDark: '#B4644B',
    terracottaLight: '#F4C4AB',
    terracottaMuted: '#FDF0EB',
  },

  // Backgrounds
  background: {
    primary: '#FAF8F5',     // Warm cream - main background
    secondary: '#F5F2EE',   // Slightly darker cream
    card: '#FFFFFF',        // Pure white for cards
    elevated: '#FFFFFF',    // Elevated surfaces
  },

  // Text colors
  text: {
    primary: '#2D3436',     // Rich charcoal
    secondary: '#6B7280',   // Warm gray
    tertiary: '#9CA3AF',    // Light gray
    inverse: '#FFFFFF',     // White text on dark
    muted: '#B4B9BE',       // Very muted
  },

  // Status colors
  status: {
    // Expiry states
    expired: '#DC2626',     // Red - expired
    expiredBg: '#FEE2E2',
    warning: '#F59E0B',     // Amber - expiring soon
    warningBg: '#FEF3C7',
    caution: '#EAB308',     // Yellow - approaching
    cautionBg: '#FEF9C3',
    safe: '#10B981',        // Green - plenty of time
    safeBg: '#D1FAE5',

    // General
    success: '#10B981',
    successBg: '#D1FAE5',
    error: '#EF4444',
    errorBg: '#FEE2E2',
    info: '#3B82F6',
    infoBg: '#DBEAFE',
  },

  // Category colors (warm, appetizing palette)
  category: {
    fruits: '#F87171',      // Soft red
    vegetables: '#34D399',  // Mint green
    dairy: '#60A5FA',       // Sky blue
    meat: '#F97316',        // Orange
    fish: '#38BDF8',        // Light blue
    poultry: '#FB923C',     // Light orange
    grains: '#FBBF24',      // Amber
    snacks: '#A78BFA',      // Purple
    beverages: '#2DD4BF',   // Teal
    frozen: '#67E8F9',      // Cyan
    condiments: '#F472B6',  // Pink
    bakery: '#D4A574',      // Warm tan
    eggs: '#FCD34D',        // Yellow
    canned: '#9CA3AF',      // Gray
    seafood: '#06B6D4',     // Cyan
    other: '#9CA3AF',       // Gray
  },

  // UI elements
  ui: {
    border: '#E5E1DC',      // Warm border
    borderLight: '#F0ECE7', // Very light border
    divider: '#E5E1DC',
    overlay: 'rgba(45, 52, 54, 0.5)',
    overlayLight: 'rgba(45, 52, 54, 0.3)',
    shadow: '#2D3436',
  },
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  // Font families (using system fonts with fallbacks)
  // For custom fonts, install expo-font and load them in _layout.tsx
  fontFamily: {
    display: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'Georgia',
    }),
    body: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    mono: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },

  // Font sizes
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },

  // Font weights
  weight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
};

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  base: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: colors.ui.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  base: {
    shadowColor: colors.ui.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: colors.ui.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.ui.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  xl: {
    shadowColor: colors.ui.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 12,
  },
};

// ============================================================================
// ANIMATIONS
// ============================================================================

export const animation = {
  duration: {
    fast: 150,
    base: 250,
    slow: 400,
    slower: 600,
  },
  spring: {
    default: {
      damping: 20,
      stiffness: 300,
    },
    bouncy: {
      damping: 15,
      stiffness: 400,
    },
    gentle: {
      damping: 25,
      stiffness: 200,
    },
  },
};

// ============================================================================
// LAYOUT
// ============================================================================

export const layout = {
  screenPadding: spacing.base,
  cardPadding: spacing.base,
  maxContentWidth: 600,
  headerHeight: 56,
  tabBarHeight: 80,
  fabSize: 64,
  fabOffset: 24,
  inputHeight: 52,
  buttonHeight: 52,
  chipHeight: 36,
  iconSize: {
    sm: 16,
    base: 20,
    md: 24,
    lg: 28,
    xl: 32,
  },
};

// ============================================================================
// SHARED STYLES
// ============================================================================

export const sharedStyles = StyleSheet.create({
  // Containers
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  contentContainer: {
    padding: spacing.base,
  },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Cards
  card: {
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    ...shadows.base,
  },

  cardElevated: {
    backgroundColor: colors.background.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },

  // Typography
  displayLarge: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size['4xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: typography.letterSpacing.tight,
  },

  displayMedium: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: typography.letterSpacing.tight,
  },

  heading: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },

  subheading: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },

  bodyLarge: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    fontWeight: typography.weight.normal,
    color: colors.text.primary,
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
  },

  body: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    fontWeight: typography.weight.normal,
    color: colors.text.primary,
    lineHeight: typography.size.base * typography.lineHeight.normal,
  },

  bodySmall: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.normal,
    color: colors.text.secondary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },

  caption: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.text.tertiary,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase' as const,
  },

  // Buttons
  buttonPrimary: {
    backgroundColor: colors.primary.sage,
    borderRadius: radius.base,
    height: layout.buttonHeight,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    ...shadows.sm,
  },

  buttonPrimaryText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },

  buttonSecondary: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.base,
    height: layout.buttonHeight,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
  },

  buttonSecondaryText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },

  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary.sage,
    borderRadius: radius.base,
    height: layout.buttonHeight,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
  },

  buttonOutlineText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.primary.sage,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  // Inputs
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.base,
    height: layout.inputHeight,
    paddingHorizontal: spacing.base,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.text.primary,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },

  inputFocused: {
    borderColor: colors.primary.sage,
    backgroundColor: colors.background.card,
  },

  inputError: {
    borderColor: colors.status.error,
  },

  inputLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },

  // Chips
  chip: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.full,
    height: layout.chipHeight,
    paddingHorizontal: spacing.md,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.xs,
  },

  chipSelected: {
    backgroundColor: colors.primary.sage,
  },

  chipText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },

  chipTextSelected: {
    color: colors.text.inverse,
  },

  // Dividers
  divider: {
    height: 1,
    backgroundColor: colors.ui.border,
    marginVertical: spacing.md,
  },

  // Row layouts
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },

  rowBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },

  // FAB
  fab: {
    position: 'absolute' as const,
    bottom: layout.fabOffset,
    right: layout.fabOffset,
    width: layout.fabSize,
    height: layout.fabSize,
    borderRadius: radius.xl,
    backgroundColor: colors.primary.sage,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...shadows.lg,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.ui.overlay,
    justifyContent: 'flex-end' as const,
  },

  modalContent: {
    backgroundColor: colors.background.card,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    maxHeight: '90%',
    ...shadows.xl,
  },

  modalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
  },

  modalTitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },

  modalBody: {
    padding: spacing.base,
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get expiry status color based on days until expiry
 */
export function getExpiryColor(daysUntilExpiry: number): {
  text: string;
  background: string;
  label: string;
} {
  if (daysUntilExpiry < 0) {
    return {
      text: colors.status.expired,
      background: colors.status.expiredBg,
      label: 'Expired',
    };
  } else if (daysUntilExpiry <= 2) {
    return {
      text: colors.status.warning,
      background: colors.status.warningBg,
      label: daysUntilExpiry === 0 ? 'Expires today' : `${daysUntilExpiry}d left`,
    };
  } else if (daysUntilExpiry <= 5) {
    return {
      text: colors.status.caution,
      background: colors.status.cautionBg,
      label: `${daysUntilExpiry}d left`,
    };
  } else {
    return {
      text: colors.status.safe,
      background: colors.status.safeBg,
      label: `${daysUntilExpiry}d left`,
    };
  }
}

/**
 * Get category color
 */
export function getCategoryColor(category: string): string {
  const key = category.toLowerCase().replace(/\s+/g, '') as keyof typeof colors.category;
  return colors.category[key] || colors.category.other;
}

/**
 * Get category icon name (Ionicons)
 */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    fruits: 'nutrition',
    vegetables: 'leaf',
    dairy: 'water',
    meat: 'restaurant',
    poultry: 'restaurant',
    fish: 'fish',
    seafood: 'fish',
    grains: 'layers',
    snacks: 'fast-food',
    beverages: 'cafe',
    frozen: 'snow',
    condiments: 'flask',
    bakery: 'pizza',
    eggs: 'egg',
    canned: 'archive',
    other: 'ellipse',
  };
  const key = category.toLowerCase().replace(/\s+/g, '');
  return icons[key] || icons.other;
}

// Export everything as default theme object
const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  animation,
  layout,
  sharedStyles,
  getExpiryColor,
  getCategoryColor,
  getCategoryIcon,
};

export default theme;
