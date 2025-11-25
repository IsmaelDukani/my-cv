import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Loader, ArrowLeft } from 'lucide-react';
import { CVData } from '../components/OnboardingFlow';
import { CVService } from '../services/CVService';
import { useTheme } from '../components/ThemeContext';
import { ThemeLanguageControls } from './ThemeLanguageControls';

interface SavedCV {
  id: string;
  title: string;
  template: string;
  updated_at: string;
  created_at: string;
}

interface AccountPageProps {
  accessToken: string;
  user: any;
  onBack: () => void;
  onLoadCV: (cvId: string) => void;
  onCreateNew: () => void;
}

export function AccountPage({ accessToken, user, onBack, onLoadCV, onCreateNew }: AccountPageProps) {
  const { t, theme } = useTheme();
  const [cvs, setCvs] = useState<SavedCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadCVs();
  }, []);

  const loadCVs = async () => {
    setLoading(true);
    setError('');

    try {
      const { cvs, error } = await CVService.listCVs(user.id);

      if (error) throw new Error(error);

      setCvs(cvs || []);
    } catch (err: any) {
      console.error('Load CVs error:', err);
      setError(err.message || 'Failed to load CVs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cvId: string) => {
    if (!confirm(t('confirmDelete'))) return;

    setDeleting(cvId);

    try {
      const { error } = await CVService.deleteCV(cvId);

      if (error) throw new Error(error);

      setCvs(cvs.filter(cv => cv.id !== cvId));
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Failed to delete CV: ' + (err.message || 'Unknown error'));
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <button
          onClick={onBack}
          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-8 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('back')}
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl mb-2 text-slate-800 dark:text-slate-100">{t('myAccount')}</h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              {t('savedCVs')}
            </p>
          </div>

          <button
            onClick={onCreateNew}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {t('createNewCV')}
          </button>
        </div>

        {loading ? (
          <div className={`bg-white dark:bg-slate-800 rounded-xl p-12 shadow-sm border border-slate-200 dark:border-slate-700 text-center ${theme === 'dark-glass' ? 'glass-card' : ''}`}>
            <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600 dark:text-indigo-400" />
            <p className="text-slate-600 dark:text-slate-300">{t('loading')}</p>
          </div>
        ) : error ? (
          <div className={`bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-8 text-center ${theme === 'dark-glass' ? 'glass-card' : ''}`}>
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={loadCVs}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              {t('loading')}
            </button>
          </div>
        ) : cvs.length === 0 ? (
          <div className={`bg-white dark:bg-slate-800 rounded-xl p-12 shadow-sm border border-slate-200 dark:border-slate-700 text-center ${theme === 'dark-glass' ? 'glass-card' : ''}`}>
            <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl mb-2 text-slate-800 dark:text-slate-100">{t('noCVsYet')}</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              {t('noCVsDesc')}
            </p>
            <button
              onClick={onCreateNew}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {t('createNewCV')}
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cvs.map((cv) => (
              <div
                key={cv.id}
                className={`bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow ${theme === 'dark-glass' ? 'glass-card' : ''}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-slate-800 dark:text-slate-100 line-clamp-1">{cv.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{cv.template}</p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  {formatDate(cv.updated_at)}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => onLoadCV(cv.id)}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    {t('loadCV')}
                  </button>
                  <button
                    onClick={() => handleDelete(cv.id)}
                    disabled={deleting === cv.id}
                    className="px-4 py-2 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
                  >
                    {deleting === cv.id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
