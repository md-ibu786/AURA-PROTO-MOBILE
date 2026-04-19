// Theme constants matching AURA-PROTO admin panel
export const darkTheme = {
    primary: '#FFD400',
    primaryHover: '#E6BF00',
    bgPrimary: '#0a0a0a',
    bgSecondary: '#111111',
    bgTertiary: '#1a1a1a',
    textPrimary: '#ffffff',
    textSecondary: '#b0b0b0',
    textMuted: '#888888',
    border: '#2a2a2a',
    error: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
};

export const lightTheme = {
    primary: '#D4AA00',
    primaryHover: '#BF8F00',
    bgPrimary: '#f5f5f5',
    bgSecondary: '#ffffff',
    bgTertiary: '#eeeeee',
    textPrimary: '#1a1a1a',
    textSecondary: '#555555',
    textMuted: '#999999',
    border: '#dddddd',
    error: '#dc2626',
    success: '#16a34a',
    warning: '#d97706',
};

export const Fonts = {
    regular: undefined,
    mono: 'monospace' as const,
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const Radius = {
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
};

// Default export for compatibility — consumers should use Colors from theme context
export const Colors = darkTheme;
