import React, { useState } from 'react';
import { Plus, Trash2, Sparkles, Loader } from 'lucide-react';
import { CVData } from './OnboardingFlow';
import { projectId, publicAnonKey } from '../components/info';
import { useTheme } from '../components/ThemeContext';

interface ContentEditorProps {
  data: CVData;
  onChange: (data: CVData) => void;
  accessToken: string;
}

export function ContentEditor({ data, onChange, accessToken }: ContentEditorProps) {
  const { t, theme } = useTheme();
  const [rewritingExp, setRewritingExp] = useState<string | null>(null);
  const [rewritingSummary, setRewritingSummary] = useState(false);
  const [aiError, setAiError] = useState('');

  const updatePersonalInfo = (field: string, value: string) => {
    onChange({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value }
    });
  };

  const updateExperience = (id: string, field: string, value: any) => {
    onChange({
      ...data,
      experiences: data.experiences.map(e =>
        e.id === id ? { ...e, [field]: value } : e
      )
    });
  };

  const updateBullet = (expId: string, index: number, value: string) => {
    onChange({
      ...data,
      experiences: data.experiences.map(e =>
        e.id === expId ? {
          ...e,
          bullets: e.bullets.map((b, i) => i === index ? value : b)
        } : e
      )
    });
  };

  const addBullet = (expId: string) => {
    onChange({
      ...data,
      experiences: data.experiences.map(e =>
        e.id === expId ? { ...e, bullets: [...e.bullets, ''] } : e
      )
    });
  };

  const removeBullet = (expId: string, index: number) => {
    onChange({
      ...data,
      experiences: data.experiences.map(e =>
        e.id === expId ? {
          ...e,
          bullets: e.bullets.filter((_, i) => i !== index)
        } : e
      )
    });
  };

  const addExperience = () => {
    onChange({
      ...data,
      experiences: [...data.experiences, {
        id: crypto.randomUUID(),
        company: '',
        position: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        bullets: ['']
      }]
    });
  };

  const removeExperience = (id: string) => {
    onChange({
      ...data,
      experiences: data.experiences.filter(e => e.id !== id)
    });
  };

  const moveExperience = (index: number, direction: 'up' | 'down') => {
    const newExperiences = [...data.experiences];
    if (direction === 'up' && index > 0) {
      [newExperiences[index], newExperiences[index - 1]] = [newExperiences[index - 1], newExperiences[index]];
    } else if (direction === 'down' && index < newExperiences.length - 1) {
      [newExperiences[index], newExperiences[index + 1]] = [newExperiences[index + 1], newExperiences[index]];
    }
    onChange({ ...data, experiences: newExperiences });
  };

  const aiRewrite = async (expId: string) => {
    const exp = data.experiences.find(e => e.id === expId);
    if (!exp || exp.bullets.filter(b => b.trim()).length === 0) {
      setAiError('Please add at least one bullet point before using AI rewrite');
      setTimeout(() => setAiError(''), 3000);
      return;
    }

    setRewritingExp(expId);
    setAiError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5f27e429/rewrite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            bullets: exp.bullets.filter(b => b.trim())
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'AI rewrite failed');
      }

      onChange({
        ...data,
        experiences: data.experiences.map(e =>
          e.id === expId ? { ...e, bullets: result.rewritten } : e
        )
      });
    } catch (err: any) {
      console.error('AI rewrite error:', err);
      setAiError(err.message || 'AI rewrite failed. Please try again.');
    } finally {
      setRewritingExp(null);
    }
  };

  const aiRewriteSummary = async () => {
    if (!data.personalInfo.summary.trim()) {
      setAiError('Please add a summary before using AI rewrite');
      setTimeout(() => setAiError(''), 3000);
      return;
    }

    setRewritingSummary(true);
    setAiError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5f27e429/rewrite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            text: data.personalInfo.summary,
            type: 'summary'
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'AI rewrite failed');
      }

      updatePersonalInfo('summary', result.rewritten || result.text);
    } catch (err: any) {
      console.error('AI rewrite error:', err);
      setAiError(err.message || 'AI rewrite failed. Please try again.');
    } finally {
      setRewritingSummary(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Personal Info */}
      <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 ${theme === 'dark-glass' ? 'glass-card' : ''}`}>
        <h3 className="text-xl mb-4 text-slate-800 dark:text-slate-100">{t('personalInfo')}</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder={t('name')}
            value={data.personalInfo.name}
            onChange={(e) => updatePersonalInfo('name', e.target.value)}
            className={`px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
          />
          <input
            type="text"
            placeholder={t('jobTitle')}
            value={data.personalInfo.title}
            onChange={(e) => updatePersonalInfo('title', e.target.value)}
            className={`px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
          />
          <input
            type="email"
            placeholder={t('email')}
            value={data.personalInfo.email}
            onChange={(e) => updatePersonalInfo('email', e.target.value)}
            className={`px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={data.personalInfo.phone}
            onChange={(e) => updatePersonalInfo('phone', e.target.value)}
            className={`px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
          />
          <input
            type="text"
            placeholder={t('location')}
            value={data.personalInfo.location}
            onChange={(e) => updatePersonalInfo('location', e.target.value)}
            className={`px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
          />
          <input
            type="url"
            placeholder="LinkedIn URL"
            value={data.personalInfo.linkedin || ''}
            onChange={(e) => updatePersonalInfo('linkedin', e.target.value)}
            className={`px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
          />
          <input
            type="url"
            placeholder="GitHub URL"
            value={data.personalInfo.github || ''}
            onChange={(e) => updatePersonalInfo('github', e.target.value)}
            className={`px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
          />
          <div className="md:col-span-2 relative">
            <textarea
              placeholder={t('professionalSummary')}
              value={data.personalInfo.summary}
              onChange={(e) => updatePersonalInfo('summary', e.target.value)}
              rows={3}
              className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
            />
            <button
              onClick={aiRewriteSummary}
              disabled={rewritingSummary}
              className="absolute bottom-2 right-2 p-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors"
              title={t('rewrite')}
            >
              {rewritingSummary ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Experience */}
      <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 ${theme === 'dark-glass' ? 'glass-card' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl text-slate-800 dark:text-slate-100">{t('experience')}</h3>
          {aiError && (
            <span className="text-sm text-red-600 dark:text-red-400">{aiError}</span>
          )}
        </div>

        <div className="space-y-6">
          {data.experiences.map((exp, index) => (
            <div key={exp.id} className="p-4 border-2 border-slate-200 dark:border-slate-700 rounded-lg relative group">
              <div className="absolute right-4 top-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => moveExperience(index, 'up')}
                  disabled={index === 0}
                  className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveExperience(index, 'down')}
                  disabled={index === data.experiences.length - 1}
                  className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  onClick={() => removeExperience(exp.id)}
                  className="p-1 text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-3 mb-4">
                <input
                  type="text"
                  placeholder={t('company')}
                  value={exp.company}
                  onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                  className={`px-3 py-2 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                />
                <input
                  type="text"
                  placeholder={t('jobTitle')}
                  value={exp.position}
                  onChange={(e) => updateExperience(exp.id, 'position', e.target.value)}
                  className={`px-3 py-2 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                />
              </div>

              <div className="mb-4">
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">{t('responsibilities')}</label>
                {exp.bullets.map((bullet, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <textarea
                      value={bullet}
                      onChange={(e) => updateBullet(exp.id, idx, e.target.value)}
                      placeholder={t('responsibilities')}
                      rows={2}
                      className={`flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                    />
                    {exp.bullets.length > 1 && (
                      <button
                        onClick={() => removeBullet(exp.id, idx)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addBullet(exp.id)}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> {t('add')}
                </button>
              </div>

              <button
                onClick={() => aiRewrite(exp.id)}
                disabled={rewritingExp === exp.id}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 flex items-center gap-2 disabled:opacity-50"
              >
                {rewritingExp === exp.id ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    {t('rewriting')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {t('rewrite')}
                  </>
                )}
              </button>
            </div>
          ))}
          <button
            onClick={addExperience}
            className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('addExperience')}
          </button>
        </div>
      </div>

      {/* Skills Quick Edit */}
      <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 ${theme === 'dark-glass' ? 'glass-card' : ''}`}>
        <h3 className="text-xl mb-4 text-slate-800 dark:text-slate-100">{t('skills')}</h3>
        <div className="flex flex-wrap gap-2">
          {data.skills.map((skill, idx) => (
            <div
              key={idx}
              className="px-3 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg flex items-center gap-2"
            >
              <span>{skill}</span>
              <button
                onClick={() => {
                  onChange({
                    ...data,
                    skills: data.skills.filter((_, i) => i !== idx)
                  });
                }}
                className="hover:text-indigo-900 dark:hover:text-indigo-100"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <input
            type="text"
            placeholder={t('skillsPlaceholder')}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const input = e.currentTarget;
                if (input.value.trim()) {
                  onChange({
                    ...data,
                    skills: [...data.skills, input.value.trim()]
                  });
                  input.value = '';
                }
              }
            }}
            className={`flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
          />
        </div>
      </div>
    </div>
  );
}
