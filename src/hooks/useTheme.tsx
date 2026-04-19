import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme } from '../theme';

export type Theme = typeof darkTheme;

const THEME_KEY = 'aura_theme_preference';

export interface ThemeValue {
    colors: Theme;
    isDark: boolean;
    toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeValue>({
    colors: darkTheme,
    isDark: true,
    toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    const systemScheme = useColorScheme();
    const [themeKey, setThemeKey] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        AsyncStorage.getItem(THEME_KEY).then((val) => {
            if (val === 'dark' || val === 'light') setThemeKey(val);
        });
    }, []);

    const toggleTheme = useCallback(() => {
        const next = themeKey === 'dark' ? 'light' : 'dark';
        setThemeKey(next);
        AsyncStorage.setItem(THEME_KEY, next);
    }, [themeKey]);

    const colors = themeKey === 'dark' ? darkTheme : lightTheme;
    const isDark = themeKey === 'dark';

    return (
        <ThemeContext.Provider value={{ colors, isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// Hook returns theme colors + helpers
export function useAppTheme() {
    const ctx = useContext(ThemeContext);
    return ctx;
}
