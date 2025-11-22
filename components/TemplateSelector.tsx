import React from 'react';
import { Check } from 'lucide-react';
import { useTheme } from '../components/ThemeContext';

export type Template = 'modern' | 'minimalist' | 'creative' | 'corporate' | 'elegant';

interface TemplateSelectorProps {
  selected: Template;
  onSelect: (template: Template) => void;
}

export function TemplateSelector({ selected, onSelect }: TemplateSelectorProps) {
  const { t, theme } = useTheme();

  const templates: Array<{
    id: Template;
    name: string;
    description: string;
    preview: string;
  }> = [
      {
        id: 'modern',
        name: t('modernTemplate'),
        description: 'Clean and contemporary with accent colors',
        preview: 'bg-gradient-to-br from-indigo-500 to-purple-500'
      },
      {
        id: 'minimalist',
        name: t('minimalTemplate'),
        description: 'Simple black and white, maximum readability',
        preview: 'bg-gradient-to-br from-slate-700 to-slate-900'
      },
      {
        id: 'creative',
        name: t('classicTemplate'),
        description: 'Bold and eye-catching for design roles',
        preview: 'bg-gradient-to-br from-pink-500 to-orange-500'
      },
      {
        id: 'corporate',
        name: 'Corporate',
        description: 'Professional and traditional',
        preview: 'bg-gradient-to-br from-blue-600 to-blue-800'
      },
      {
        id: 'elegant',
        name: 'Elegant',
        description: 'Sophisticated two-column layout',
        preview: 'bg-slate-800'
      }
    ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {templates.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelect(template.id)}
          className={`text-left p-4 rounded-lg border-2 transition-all ${selected === template.id
              ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
              : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
            } ${theme === 'dark-glass' ? 'glass-card' : ''}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`w-full h-20 rounded ${template.preview}`} />
            {selected === template.id && (
              <div className="ml-2 w-6 h-6 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <h4 className="text-slate-800 dark:text-slate-100 mb-1">{template.name}</h4>
          <p className="text-xs text-slate-600 dark:text-slate-300">{template.description}</p>
        </button>
      ))}
    </div>
  );
}
