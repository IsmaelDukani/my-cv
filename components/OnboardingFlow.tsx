// components/ThemeContext.tsx
"use client";   // ← ADD THIS LINE
import React, { useState } from 'react';
import { FileUp, Edit3 } from 'lucide-react';
import { CVFormManual } from '../components/CVFormManual';
import { FileUploader } from '../components/FileUploader';
import { useTheme } from '../components/ThemeContext';

export type CVData = CV;
import { CV } from '@/types/cv';

interface OnboardingFlowProps {
  onComplete: (data: CVData) => void;
  onBack: () => void;
}

export function OnboardingFlow({ onComplete, onBack }: OnboardingFlowProps) {
  const { t, theme } = useTheme();
  const [mode, setMode] = useState<'select' | 'manual' | 'upload'>('select');

  if (mode === 'manual') {
    return <CVFormManual onComplete={onComplete} onBack={() => setMode('select')} />;
  }

  if (mode === 'upload') {
    return <FileUploader onComplete={onComplete} onBack={() => setMode('select')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <button
          onClick={onBack}
          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-8"
        >
          ← {t('back')}
        </button>

        <h1 className="text-4xl mb-4 text-slate-800 dark:text-slate-100">{t('chooseMethod')}</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 mb-12">
          {t('chooseMethod')}
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => setMode('manual')}
            className={`bg-white dark:bg-slate-800 p-8 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-lg transition-all text-left group ${theme === 'dark-glass' ? 'glass-card' : ''}`}
          >
            <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors">
              <Edit3 className="w-7 h-7 text-indigo-600 dark:text-indigo-400 group-hover:text-white" />
            </div>
            <h3 className="text-xl mb-2 text-slate-800 dark:text-slate-100">{t('manualEntry')}</h3>
            <p className="text-slate-600 dark:text-slate-300">
              {t('manualEntryDesc')}
            </p>
          </button>

          <button
            onClick={() => setMode('upload')}
            className={`bg-white dark:bg-slate-800 p-8 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:shadow-lg transition-all text-left group ${theme === 'dark-glass' ? 'glass-card' : ''}`}
          >
            <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-600 transition-colors">
              <FileUp className="w-7 h-7 text-purple-600 dark:text-purple-400 group-hover:text-white" />
            </div>
            <h3 className="text-xl mb-2 text-slate-800 dark:text-slate-100">{t('uploadCV')}</h3>
            <p className="text-slate-600 dark:text-slate-300">
              {t('uploadCVDesc')}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
