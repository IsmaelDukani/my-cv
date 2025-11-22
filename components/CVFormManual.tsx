import React, { useState } from 'react';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { CVData } from './OnboardingFlow';
import { useTheme } from '../components/ThemeContext';

interface CVFormManualProps {
  onComplete: (data: CVData) => void;
  onBack: () => void;
}

export function CVFormManual({ onComplete, onBack }: CVFormManualProps) {
  const { t, theme } = useTheme();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<CVData>({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      location: '',
      title: '',
      summary: '',
      linkedin: '',
      github: ''
    },
    experiences: [{
      id: crypto.randomUUID(),
      company: '',
      position: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      bullets: ['']
    }],
    education: [{
      id: crypto.randomUUID(),
      institution: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      gpa: ''
    }],
    skills: []
  });

  const [skillInput, setSkillInput] = useState('');
  const [validationError, setValidationError] = useState('');

  const updatePersonalInfo = (field: string, value: string) => {
    setData({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value }
    });
    if (validationError) setValidationError('');
  };

  const addExperience = () => {
    setData({
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
    setData({
      ...data,
      experiences: data.experiences.filter(e => e.id !== id)
    });
  };

  const updateExperience = (id: string, field: string, value: any) => {
    setData({
      ...data,
      experiences: data.experiences.map(e =>
        e.id === id ? { ...e, [field]: value } : e
      )
    });
    if (validationError) setValidationError('');
  };

  const addBullet = (expId: string) => {
    setData({
      ...data,
      experiences: data.experiences.map(e =>
        e.id === expId ? { ...e, bullets: [...e.bullets, ''] } : e
      )
    });
  };

  const updateBullet = (expId: string, index: number, value: string) => {
    setData({
      ...data,
      experiences: data.experiences.map(e =>
        e.id === expId ? {
          ...e,
          bullets: e.bullets.map((b, i) => i === index ? value : b)
        } : e
      )
    });
  };

  const removeBullet = (expId: string, index: number) => {
    setData({
      ...data,
      experiences: data.experiences.map(e =>
        e.id === expId ? {
          ...e,
          bullets: e.bullets.filter((_, i) => i !== index)
        } : e
      )
    });
  };

  const addEducation = () => {
    setData({
      ...data,
      education: [...data.education, {
        id: crypto.randomUUID(),
        institution: '',
        degree: '',
        field: '',
        startDate: '',
        endDate: '',
        gpa: ''
      }]
    });
  };

  const removeEducation = (id: string) => {
    setData({
      ...data,
      education: data.education.filter(e => e.id !== id)
    });
  };

  const updateEducation = (id: string, field: string, value: string) => {
    setData({
      ...data,
      education: data.education.map(e =>
        e.id === id ? { ...e, [field]: value } : e
      )
    });
    if (validationError) setValidationError('');
  };

  const addSkill = () => {
    if (skillInput.trim()) {
      setData({
        ...data,
        skills: [...data.skills, skillInput.trim()]
      });
      setSkillInput('');
      if (validationError) setValidationError('');
    }
  };

  const removeSkill = (index: number) => {
    setData({
      ...data,
      skills: data.skills.filter((_, i) => i !== index)
    });
  };

  const validateStep = () => {
    if (step === 1) {
      if (!data.personalInfo.name.trim()) return 'Name is required';
      if (!data.personalInfo.title.trim()) return 'Job title is required';
      if (!data.personalInfo.email.trim()) return 'Email is required';
    }

    if (step === 2) {
      for (const exp of data.experiences) {
        if (!exp.company.trim()) return 'Company name is required';
        if (!exp.position.trim()) return 'Job title is required';
      }
    }

    if (step === 3) {
      for (const edu of data.education) {
        if (!edu.institution.trim()) return 'Institution is required';
        if (!edu.degree.trim()) return 'Degree is required';
      }
    }

    if (step === 4) {
      if (data.skills.length === 0) return 'At least one skill is required';
    }

    return null;
  };

  const handleNext = () => {
    const error = validateStep();
    if (error) {
      setValidationError(error);
      return;
    }

    if (step < 4) {
      setStep(step + 1);
      setValidationError('');
    } else {
      onComplete(data);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <button onClick={onBack} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-8">
          ← {t('back')}
        </button>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[t('personalInfo'), t('experience'), t('education'), t('skills')].map((label, i) => (
              <div
                key={label}
                className={`text-sm ${step > i ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
              >
                {label}
              </div>
            ))}
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {validationError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {validationError}
          </div>
        )}

        <div className={`bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 ${theme === 'dark-glass' ? 'glass-card' : ''}`}>
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl mb-6 text-slate-800 dark:text-slate-100">{t('personalInfo')}</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">{t('name')} *</label>
                  <input
                    type="text"
                    value={data.personalInfo.name}
                    onChange={(e) => updatePersonalInfo('name', e.target.value)}
                    className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">{t('jobTitle')} *</label>
                  <input
                    type="text"
                    placeholder="e.g., Senior Software Engineer"
                    value={data.personalInfo.title}
                    onChange={(e) => updatePersonalInfo('title', e.target.value)}
                    className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">{t('email')} *</label>
                    <input
                      type="email"
                      value={data.personalInfo.email}
                      onChange={(e) => updatePersonalInfo('email', e.target.value)}
                      className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">Phone Number</label>
                    <input
                      type="tel"
                      value={data.personalInfo.phone}
                      onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">{t('location')}</label>
                  <input
                    type="text"
                    placeholder="e.g., San Francisco, CA"
                    value={data.personalInfo.location}
                    onChange={(e) => updatePersonalInfo('location', e.target.value)}
                    className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">LinkedIn</label>
                    <input
                      type="url"
                      placeholder="linkedin.com/in/username"
                      value={data.personalInfo.linkedin || ''}
                      onChange={(e) => updatePersonalInfo('linkedin', e.target.value)}
                      className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">GitHub</label>
                    <input
                      type="url"
                      placeholder="github.com/username"
                      value={data.personalInfo.github || ''}
                      onChange={(e) => updatePersonalInfo('github', e.target.value)}
                      className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">{t('professionalSummary')}</label>
                  <textarea
                    value={data.personalInfo.summary}
                    onChange={(e) => updatePersonalInfo('summary', e.target.value)}
                    rows={4}
                    placeholder={t('summaryPlaceholder')}
                    className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Experience */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl mb-6 text-slate-800 dark:text-slate-100">{t('experience')}</h2>

              <div className="space-y-6">
                {data.experiences.map((exp, idx) => (
                  <div key={exp.id} className="p-6 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-slate-700 dark:text-slate-300">{t('experience')} {idx + 1}</h3>
                      {data.experiences.length > 1 && (
                        <button
                          onClick={() => removeExperience(exp.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">{t('company')} *</label>
                          <input
                            type="text"
                            value={exp.company}
                            onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                            className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                          />
                        </div>

                        <div>
                          <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">{t('jobTitle')} *</label>
                          <input
                            type="text"
                            value={exp.position}
                            onChange={(e) => updateExperience(exp.id, 'position', e.target.value)}
                            className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">{t('location')}</label>
                          <input
                            type="text"
                            value={exp.location}
                            onChange={(e) => updateExperience(exp.id, 'location', e.target.value)}
                            className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                          />
                        </div>

                        <div>
                          <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">{t('startDate')}</label>
                          <input
                            type="month"
                            value={exp.startDate}
                            onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                            className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                          />
                        </div>

                        <div>
                          <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">{t('endDate')}</label>
                          <input
                            type="month"
                            value={exp.endDate}
                            onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                            disabled={exp.current}
                            className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                          />
                          <label className="flex items-center mt-2 text-sm text-slate-600 dark:text-slate-400">
                            <input
                              type="checkbox"
                              checked={exp.current}
                              onChange={(e) => updateExperience(exp.id, 'current', e.target.checked)}
                              className="mr-2"
                            />
                            {t('currentRole')}
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">{t('responsibilities')}</label>
                        {exp.bullets.map((bullet, bulletIdx) => (
                          <div key={bulletIdx} className="flex gap-2 mb-2">
                            <textarea
                              value={bullet}
                              onChange={(e) => updateBullet(exp.id, bulletIdx, e.target.value)}
                              rows={2}
                              placeholder={t('responsibilities')}
                              className={`flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                            />
                            {exp.bullets.length > 1 && (
                              <button
                                onClick={() => removeBullet(exp.id, bulletIdx)}
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => addBullet(exp.id)}
                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 mt-2"
                        >
                          <Plus className="w-4 h-4" /> {t('add')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addExperience}
                className="mt-4 px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 w-full flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> {t('addExperience')}
              </button>
            </div>
          )}

          {/* Step 3: Education */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl mb-6 text-slate-800 dark:text-slate-100">{t('education')}</h2>

              <div className="space-y-6">
                {data.education.map((edu, idx) => (
                  <div key={edu.id} className="p-6 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-slate-700 dark:text-slate-300">{t('education')} {idx + 1}</h3>
                      {data.education.length > 1 && (
                        <button
                          onClick={() => removeEducation(edu.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">{t('institution')} *</label>
                        <input
                          type="text"
                          value={edu.institution}
                          onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                          className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">{t('degree')} *</label>
                          <input
                            type="text"
                            placeholder="e.g., Bachelor of Science"
                            value={edu.degree}
                            onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                            className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                          />
                        </div>

                        <div>
                          <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">{t('degree')}</label>
                          <input
                            type="text"
                            placeholder="e.g., Computer Science"
                            value={edu.field}
                            onChange={(e) => updateEducation(edu.id, 'field', e.target.value)}
                            className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">{t('startDate')}</label>
                          <input
                            type="month"
                            value={edu.startDate}
                            onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)}
                            className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                          />
                        </div>

                        <div>
                          <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">{t('graduationYear')}</label>
                          <input
                            type="month"
                            value={edu.endDate}
                            onChange={(e) => updateEducation(edu.id, 'endDate', e.target.value)}
                            className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                          />
                        </div>

                        <div>
                          <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">GPA</label>
                          <input
                            type="text"
                            placeholder="e.g., 3.8/4.0"
                            value={edu.gpa}
                            onChange={(e) => updateEducation(edu.id, 'gpa', e.target.value)}
                            className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addEducation}
                className="mt-4 px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 w-full flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> {t('addEducation')}
              </button>
            </div>
          )}

          {/* Step 4: Skills */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl mb-6 text-slate-800 dark:text-slate-100">{t('skills')}</h2>

              <div className="mb-4">
                <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">{t('skills')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder={t('skillsPlaceholder')}
                    className={`flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${theme === 'dark-glass' ? 'glass-input' : ''}`}
                  />
                  <button
                    onClick={addSkill}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {data.skills.map((skill, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg flex items-center gap-2"
                  >
                    <span>{skill}</span>
                    <button
                      onClick={() => removeSkill(idx)}
                      className="hover:text-indigo-900 dark:hover:text-indigo-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {data.skills.length === 0 && (
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-4">
                  {t('skillsPlaceholder')}
                </p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {t('back')}
              </button>
            )}
            <button
              onClick={handleNext}
              className="ml-auto px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              {step === 4 ? t('continue') : t('continue')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
