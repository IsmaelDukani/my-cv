// components/ThemeContext.tsx
"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations, getTranslation } from './translations';

export type Theme = 'light' | 'dark-glass';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setThemeState] = useState<Theme>('light');
  const [language, setLanguageState] = useState<Language>('en');

  // Load preferences from localStorage only after mounting (client-side only)
  useEffect(() => {
    setMounted(true);

    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const savedLanguage = localStorage.getItem('language') as Language | null;

    if (savedTheme && ['light', 'dark-glass'].includes(savedTheme)) {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    }

    if (savedLanguage && ['en', 'ar', 'ku'].includes(savedLanguage)) {
      setLanguageState(savedLanguage);

      // Set direction for RTL languages
      if (savedLanguage === 'ar') {
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
      } else {
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', savedLanguage);
      }
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    if (newTheme === 'dark-glass') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.add('glass');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.remove('glass');
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);

    // Set direction and lang attribute
    if (lang === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', lang);
    }
  };

  const t = (key: keyof typeof translations.en): string => {
    return getTranslation(language, key);
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, language, setLanguage, t }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}