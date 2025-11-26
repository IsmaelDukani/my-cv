import React from 'react';
import { CVData } from './OnboardingFlow';
import { Template } from './TemplateSelector';
import { Mail, Phone, MapPin, Calendar, Linkedin, Github } from 'lucide-react';

interface LivePreviewProps {
  data: CVData;
  template: Template;
}

export function LivePreview({ data, template }: LivePreviewProps) {
  const formatDate = (date: string) => {
    if (!date) return '';
    // If it's just a year (4 digits), return it
    if (/^\d{4}$/.test(date.trim())) return date;

    // If it's YYYY-MM format
    if (/^\d{4}-\d{2}$/.test(date)) {
      const [year, month] = date.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    }

    // If it's already formatted (e.g. "Oct 2024"), return as is
    return date;
  };

  const getSocialUrl = (input: string, type: 'linkedin' | 'github') => {
    if (!input) return '';
    if (input.startsWith('http')) return input;
    if (type === 'linkedin') return `https://linkedin.com/in/${input.replace(/^@/, '')}`;
    if (type === 'github') return `https://github.com/${input.replace(/^@/, '')}`;
    return input;
  };

  const getSocialLabel = (input: string) => {
    if (!input) return '';
    if (input.startsWith('http')) {
      const parts = input.split('/');
      return parts[parts.length - 1] || parts[parts.length - 2] || input;
    }
    return input;
  };

  const getTemplateStyles = () => {
    switch (template) {
      case 'modern':
        return {
          bg: 'bg-white',
          headerBg: 'bg-gradient-to-r from-indigo-600 to-purple-600',
          headerText: 'text-white',
          sectionTitle: 'text-indigo-600 border-b-2 border-indigo-600',
          accentText: 'text-indigo-600',
          bulletColor: 'text-slate-700'
        };
      case 'minimalist':
        return {
          bg: 'bg-white',
          headerBg: 'bg-slate-900',
          headerText: 'text-white',
          sectionTitle: 'text-slate-900 border-b border-slate-300',
          accentText: 'text-slate-900',
          bulletColor: 'text-slate-600'
        };
      case 'creative':
        return {
          bg: 'bg-gradient-to-br from-orange-50 to-pink-50',
          headerBg: 'bg-gradient-to-r from-pink-600 to-orange-500',
          headerText: 'text-white',
          sectionTitle: 'text-pink-600 border-b-2 border-pink-600',
          accentText: 'text-orange-600',
          bulletColor: 'text-slate-700'
        };
      case 'corporate':
        return {
          bg: 'bg-white',
          headerBg: 'bg-blue-700',
          headerText: 'text-white',
          sectionTitle: 'text-blue-700 border-b-2 border-blue-700',
          accentText: 'text-blue-700',
          bulletColor: 'text-slate-700'
        };
      default:
        return {
          bg: 'bg-white',
          headerBg: 'bg-slate-800',
          headerText: 'text-white',
          sectionTitle: 'text-slate-800 border-b border-slate-300',
          accentText: 'text-slate-800',
          bulletColor: 'text-slate-600'
        };
    }
  };

  const styles = getTemplateStyles();

  if (template === 'elegant') {
    return (
      <div className="bg-white flex flex-col" style={{ width: '210mm', minHeight: '297mm' }}>
        {/* Header */}
        <div className="bg-slate-800 text-white p-8 text-center">
          <h1 className="text-4xl font-light tracking-wider mb-2 uppercase">{data.personalInfo.name || 'Your Name'}</h1>
          <p className="text-xl font-light opacity-90 mb-6">{data.personalInfo.title || 'Professional Title'}</p>

          <div className="flex flex-wrap justify-center gap-6 text-sm font-light opacity-80">
            {data.personalInfo.phone && (
              <span>{data.personalInfo.phone}</span>
            )}
            {data.personalInfo.email && (
              <span>{data.personalInfo.email}</span>
            )}
            {data.personalInfo.location && (
              <span>{data.personalInfo.location}</span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 grid grid-cols-12">
          {/* Left Column */}
          <div className="col-span-4 bg-slate-50 p-6 border-r border-slate-100">
            {/* Summary */}
            {data.personalInfo.summary && (
              <div className="mb-8">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4 border-b border-slate-300 pb-2">Professional Summary</h2>
                <p className="text-xs text-slate-600 leading-relaxed text-justify">{data.personalInfo.summary}</p>
              </div>
            )}

            {/* Skills */}
            {data.skills.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4 border-b border-slate-300 pb-2">Skills</h2>
                <ul className="space-y-2">
                  {data.skills.map((skill, idx) => (
                    <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="mt-1.5 w-1 h-1 bg-slate-400 rounded-full flex-shrink-0" />
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Education */}
            {data.education.length > 0 && data.education[0].institution && (
              <div className="mb-8">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4 border-b border-slate-300 pb-2">Education</h2>
                <div className="space-y-4">
                  {data.education.map((edu) => (
                    edu.institution && (
                      <div key={edu.id}>
                        <h3 className="text-xs font-bold text-slate-800">{edu.institution}</h3>
                        <p className="text-xs text-slate-600 italic">{edu.degree} in {edu.field}</p>
                        {(edu.startDate || edu.endDate) && (
                          <p className="text-[10px] text-slate-500 mt-1">
                            {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
                          </p>
                        )}
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Social Links */}
            {(data.personalInfo.linkedin || data.personalInfo.github) && (
              <div>
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4 border-b border-slate-300 pb-2">Links</h2>
                <div className="space-y-2">
                  {data.personalInfo.linkedin && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Linkedin className="w-3 h-3" />
                      <a href={getSocialUrl(data.personalInfo.linkedin, 'linkedin')} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {getSocialLabel(data.personalInfo.linkedin)}
                      </a>
                    </div>
                  )}
                  {data.personalInfo.github && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Github className="w-3 h-3" />
                      <a href={getSocialUrl(data.personalInfo.github, 'github')} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {getSocialLabel(data.personalInfo.github)}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="col-span-8 p-8">
            {/* Experience */}
            {data.experiences.length > 0 && data.experiences[0].company && (
              <div>
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-6 border-b border-slate-300 pb-2">Work Experience</h2>
                <div className="space-y-6">
                  {data.experiences.map((exp) => (
                    exp.company && (
                      <div key={exp.id}>
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="text-sm font-bold text-slate-800">{exp.position}</h3>
                          {(exp.startDate || exp.endDate) && (
                            <span className="text-xs text-slate-500 italic">
                              {formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mb-2 italic">{exp.company} {exp.location && `| ${exp.location}`}</p>

                        {exp.bullets.some(b => b.trim()) && (
                          <ul className="space-y-1.5">
                            {exp.bullets.filter(b => b.trim()).map((bullet, idx) => (
                              <li key={idx} className="text-xs text-slate-600 flex items-start gap-2 leading-relaxed">
                                <span className="mt-1.5 w-1 h-1 bg-slate-400 rounded-full flex-shrink-0" />
                                {bullet}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.bg}`} style={{ width: '210mm', minHeight: '297mm' }}>
      {/* Header */}
      <div className={`${styles.headerBg} ${styles.headerText} p-8`}>
        <h1 className="text-3xl mb-2">{data.personalInfo.name || 'Your Name'}</h1>
        <p className="text-lg opacity-90 mb-4">{data.personalInfo.title || 'Professional Title'}</p>

        <div className="flex flex-wrap gap-4 text-sm opacity-90">
          {data.personalInfo.email && (
            <div className="flex items-center gap-1">
              <Mail className="w-4 h-4" />
              {data.personalInfo.email}
            </div>
          )}
          {data.personalInfo.phone && (
            <div className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              {data.personalInfo.phone}
            </div>
          )}
          {data.personalInfo.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {data.personalInfo.location}
            </div>
          )}
          {data.personalInfo.linkedin && (
            <div className="flex items-center gap-1">
              <Linkedin className="w-4 h-4" />
              <a href={getSocialUrl(data.personalInfo.linkedin, 'linkedin')} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {getSocialLabel(data.personalInfo.linkedin)}
              </a>
            </div>
          )}
          {data.personalInfo.github && (
            <div className="flex items-center gap-1">
              <Github className="w-4 h-4" />
              <a href={getSocialUrl(data.personalInfo.github, 'github')} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {getSocialLabel(data.personalInfo.github)}
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="p-8">
        {/* Summary */}
        {data.personalInfo.summary && (
          <div className="mb-6">
            <h2 className={`text-lg ${styles.sectionTitle} pb-1 mb-3`}>Professional Summary</h2>
            <p className="text-sm text-slate-700 leading-relaxed">{data.personalInfo.summary}</p>
          </div>
        )}

        {/* Experience */}
        {data.experiences.length > 0 && data.experiences[0].company && (
          <div className="mb-6">
            <h2 className={`text-lg ${styles.sectionTitle} pb-1 mb-3`}>Experience</h2>
            <div className="space-y-4">
              {data.experiences.map((exp) => (
                exp.company && (
                  <div key={exp.id}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className={`${styles.accentText}`}>{exp.position}</h3>
                        <p className="text-sm text-slate-600">{exp.company}{exp.location && ` • ${exp.location}`}</p>
                      </div>
                      {(exp.startDate || exp.endDate) && (
                        <div className="text-sm text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate)}
                        </div>
                      )}
                    </div>
                    {exp.bullets.some(b => b.trim()) && (
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {exp.bullets.filter(b => b.trim()).map((bullet, idx) => (
                          <li key={idx} className={styles.bulletColor}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {data.education.length > 0 && data.education[0].institution && (
          <div className="mb-6">
            <h2 className={`text-lg ${styles.sectionTitle} pb-1 mb-3`}>Education</h2>
            <div className="space-y-3">
              {data.education.map((edu) => (
                edu.institution && (
                  <div key={edu.id}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className={`${styles.accentText}`}>{edu.degree} in {edu.field}</h3>
                        <p className="text-sm text-slate-600">{edu.institution}</p>
                        {edu.gpa && <p className="text-sm text-slate-500">GPA: {edu.gpa}</p>}
                      </div>
                      {(edu.startDate || edu.endDate) && (
                        <div className="text-sm text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {data.skills.length > 0 && (
          <div>
            <h2 className={`text-lg ${styles.sectionTitle} pb-1 mb-3`}>Skills</h2>
            <div className="flex flex-wrap gap-2">
              {data.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className={`px-3 py-1 ${template === 'creative' ? 'bg-pink-100 text-pink-700' : template === 'modern' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'} rounded text-sm`}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
