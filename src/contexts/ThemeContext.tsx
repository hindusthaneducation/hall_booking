import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

type Theme = 'default' | 'hindusthan';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const { profile } = useAuth();
    // Default to 'hindusthan' as requested
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('theme');
        return (saved as Theme) || 'hindusthan';
    });

    // Sync theme with profile when user logs in
    useEffect(() => {
        if (profile?.theme_preference) {
            setTheme(profile.theme_preference);
        }
    }, [profile]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = async () => {
        const newTheme = theme === 'default' ? 'hindusthan' : 'default';
        setTheme(newTheme);

        // Persist to DB if logged in
        if (profile) {
            try {
                // Determine table based on where profiles are stored. 
                // Usually profiles table is updated via api.put('/users/:id') or similar if that maps to profiles
                // The api.put('/users/:id') in Settings.tsx updates profiles. 
                // We'll trust that endpoint or use a direct update if available.
                // Assuming api.put(`/users/${profile.id}`) works for profile updates as seen in Settings.tsx
                await api.put(`/users/${profile.id}`, { theme_preference: newTheme });
            } catch (error) {
                console.error('Failed to persist theme:', error);
            }
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
