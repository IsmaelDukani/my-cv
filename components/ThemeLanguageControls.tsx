import React from 'react';
import { Sparkles, Sun, Globe } from 'lucide-react';
import { useTheme, Theme } from '../components/ThemeContext';
import { Language } from '../components/translations';

interface ThemeLanguageControlsProps {
  showLabels?: boolean;
  className?: string;
}

export function ThemeLanguageControls({ showLabels = false, className = '' }: ThemeLanguageControlsProps) {
  const { theme, setTheme, language, setLanguage, t } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = React.useState(false);
  const [showLangMenu, setShowLangMenu] = React.useState(false);

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Normal Theme', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark-glass', label: 'Dark Glass', icon: <Sparkles className="w-4 h-4" /> },
  ];

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: t('english') },
    { code: 'ar', label: t('arabic') },
    { code: 'ku', label: t('kurdish') },
    { code: 'pl', label: t('polish') },
  ];

  const currentTheme = themes.find(t => t.value === theme) || themes[0];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Theme Selector */}
      <div className="relative">
        <button
          onClick={() => setShowThemeMenu(!showThemeMenu)}
          className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-2"
          title="Theme"
        >
          {currentTheme.icon}
          {showLabels && <span className="text-sm text-slate-700 dark:text-slate-200">{currentTheme.label}</span>}
        </button>

        {showThemeMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowThemeMenu(false)}
            />
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-800 glass:glass-modal rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20">
              {themes.map((themeOption) => (
                <button
                  key={themeOption.value}
                  onClick={() => {
                    setTheme(themeOption.value);
                    setShowThemeMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-3 ${
                    theme === themeOption.value
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {themeOption.icon}
                  <span>{themeOption.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Language Selector */}
      <div className="relative">
        <button
          onClick={() => setShowLangMenu(!showLangMenu)}
          className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-2"
          title={t('language')}
        >
          <Globe className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          {showLabels && <span className="text-sm text-slate-700 dark:text-slate-200">{t('language')}</span>}
        </button>

        {showLangMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowLangMenu(false)}
            />
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 glass:glass-modal rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setShowLangMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors ${
                    language === lang.code
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
