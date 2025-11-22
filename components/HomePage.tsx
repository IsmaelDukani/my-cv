import React from 'react';
import { Sparkles, FileText, Download, Palette } from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import { ThemeLanguageControls } from '../components/ThemeLanguageControls';

interface HomePageProps {
  onGetStarted: (mode?: 'signin' | 'signup') => void;
}

export function HomePage({ onGetStarted }: HomePageProps) {
  const { t, theme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span className="text-lg font-bold text-slate-900 dark:text-white">{t('appTitle')}</span>
          </div>

          <div className="flex items-center gap-6">
            <ThemeLanguageControls />
            <button
              onClick={() => onGetStarted('signin')}
              className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
            >
              {t('logInBtn')}
            </button>
            <button
              onClick={() => onGetStarted('signup')}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              {t('createCVBtn')}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-32 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 text-sm font-medium">
            {t('appTitle')}
          </div>

          <h1 className="text-6xl font-bold mb-8 leading-tight">
            {t('bestFree')} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              {t('aiCVBuilderTitle')}
            </span>
          </h1>

          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('heroDescription')}
          </p>

          <button
            onClick={() => onGetStarted('signup')}
            className="px-8 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all transform hover:scale-105 font-semibold text-lg shadow-xl shadow-indigo-900/20"
          >
            {t('createCVBtn')}
          </button>
        </div>
      </header>

      {/* How It Works Section */}
      <main className="py-32 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          {/* Section Header */}
          <div className="text-center mb-32">
            <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-wider uppercase text-sm mb-4 block">{t('howItWorksLabel')}</span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              {t('newKindOf')} <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded">{t('aiCVBuilderTitle')}</span><br />
              {t('poweredByAI')}
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              {t('howItWorksIntro')}
            </p>
          </div>

          {/* Step 1 */}
          <div className="flex flex-col md:flex-row items-center gap-16 mb-32">
            <div className="w-full md:w-1/2 space-y-6">
              <h3 className="text-6xl font-bold text-indigo-600 dark:text-indigo-400">{t('step1Title')}</h3>
              <h4 className="text-3xl font-bold text-slate-900 dark:text-white">{t('step1Heading')}</h4>
              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('step1Detail')}
              </p>
              <button
                onClick={() => onGetStarted('signup')}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                {t('createCVNowBtn')}
              </button>
            </div>
            <div className="w-full md:w-1/2">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-200 dark:border-slate-700 aspect-[4/3] flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="text-center space-y-4 relative z-10">
                  <div className="w-20 h-20 bg-white dark:bg-slate-700 rounded-2xl shadow-lg mx-auto flex items-center justify-center">
                    <FileText className="w-10 h-10 text-indigo-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-slate-200 dark:bg-slate-600 rounded mx-auto" />
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-600 rounded mx-auto" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium mt-4">{t('basicInfoInterface')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-16 mb-32">
            <div className="w-full md:w-1/2 space-y-6">
              <h3 className="text-6xl font-bold text-indigo-600 dark:text-indigo-400">{t('step2Title')}</h3>
              <h4 className="text-3xl font-bold text-slate-900 dark:text-white">{t('step2Heading')}</h4>
              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('step2Detail')}
              </p>
              <button
                onClick={() => onGetStarted('signup')}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                {t('createCVNowBtn')}
              </button>
            </div>
            <div className="w-full md:w-1/2">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-200 dark:border-slate-700 aspect-[4/3] flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="text-center space-y-4 relative z-10">
                  <div className="w-20 h-20 bg-white dark:bg-slate-700 rounded-2xl shadow-lg mx-auto flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-purple-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-56 bg-slate-200 dark:bg-slate-600 rounded mx-auto" />
                    <div className="h-4 w-40 bg-slate-200 dark:bg-slate-600 rounded mx-auto" />
                    <div className="h-4 w-48 bg-slate-200 dark:bg-slate-600 rounded mx-auto" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium mt-4">{t('aiWriterInterface')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col md:flex-row items-center gap-16 mb-32">
            <div className="w-full md:w-1/2 space-y-6">
              <h3 className="text-6xl font-bold text-indigo-600 dark:text-indigo-400">{t('step3Title')}</h3>
              <h4 className="text-3xl font-bold text-slate-900 dark:text-white">{t('step3Heading')}</h4>
              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('step3Detail')}
              </p>
              <button
                onClick={() => onGetStarted('signup')}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                {t('createCVNowBtn')}
              </button>
            </div>
            <div className="w-full md:w-1/2">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-200 dark:border-slate-700 aspect-[4/3] flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="text-center space-y-4 relative z-10">
                  <div className="w-20 h-20 bg-white dark:bg-slate-700 rounded-2xl shadow-lg mx-auto flex items-center justify-center">
                    <Download className="w-10 h-10 text-violet-500" />
                  </div>
                  <div className="flex justify-center gap-2">
                    <div className="h-16 w-12 bg-slate-200 dark:bg-slate-600 rounded" />
                    <div className="h-16 w-12 bg-slate-200 dark:bg-slate-600 rounded" />
                    <div className="h-16 w-12 bg-slate-200 dark:bg-slate-600 rounded" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium mt-4">{t('exportFeedback')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-16 mb-32">
            <div className="w-full md:w-1/2 space-y-6">
              <h3 className="text-6xl font-bold text-indigo-600 dark:text-indigo-400">{t('step4Title')}</h3>
              <h4 className="text-3xl font-bold text-slate-900 dark:text-white">{t('step4Heading')}</h4>
              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('step4Detail')}
              </p>
              <button
                onClick={() => onGetStarted('signup')}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                {t('createCVNowBtn')}
              </button>
            </div>
            <div className="w-full md:w-1/2">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-200 dark:border-slate-700 aspect-[4/3] flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="text-center space-y-4 relative z-10">
                  <div className="w-20 h-20 bg-white dark:bg-slate-700 rounded-2xl shadow-lg mx-auto flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-purple-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-56 bg-slate-200 dark:bg-slate-600 rounded mx-auto" />
                    <div className="h-4 w-40 bg-slate-200 dark:bg-slate-600 rounded mx-auto" />
                    <div className="h-4 w-48 bg-slate-200 dark:bg-slate-600 rounded mx-auto" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium mt-4">{t('step4Heading')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 dark:bg-slate-950 text-slate-300 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p>{t('footerCopyright')}</p>
          <p className="text-sm mt-2 text-slate-400">
            {t('footerDisclaimer')}
          </p>
        </div>
      </footer>
    </div>
  );
}
