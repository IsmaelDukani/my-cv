import React, { useState, useEffect } from 'react';
import { Save, Download, Sparkles, Palette, Eye, Menu, LogOut, FolderOpen } from 'lucide-react';
import { CVData } from './OnboardingFlow';
import { Template, TemplateSelector } from './TemplateSelector';
import { LivePreview } from './LivePreview';
import { ContentEditor } from './ContentEditor';
import { projectId, publicAnonKey } from '../components/info';
import { CVService } from '../services/CVService';
import { useTheme } from '../components/ThemeContext';
import { ThemeLanguageControls } from './ThemeLanguageControls';

interface EditorPageProps {
  initialData: CVData;
  accessToken: string;
  user: any;
  onSignOut: () => void;
  onViewAccount: () => void;
}

export function EditorPage({ initialData, accessToken, user, onSignOut, onViewAccount }: EditorPageProps) {
  const { t, theme } = useTheme();
  const [data, setData] = useState<CVData>(initialData);
  const [template, setTemplate] = useState<Template>('modern');
  const [activeTab, setActiveTab] = useState<'content' | 'template'>('content');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [cvId, setCvId] = useState<string | null>(null);
  const [cvTitle, setCvTitle] = useState(t('untitledCV'));
  const [showTitleEdit, setShowTitleEdit] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');

    try {
      const { id, error } = await CVService.saveCV(
        cvId,
        cvTitle,
        template,
        data
      );

      if (error) throw new Error(error);

      if (!cvId && id) {
        setCvId(id);
      }

      setSaveMessage(t('savedSuccessfully'));
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err: any) {
      console.error('Save error:', err);
      setSaveMessage(t('errorSaving') + ': ' + (err.message || 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    // For prototype, use browser print
    window.print();

    // Note about PDF generation
    alert('Use your browser\'s Print dialog to save as PDF.\n\nFor production, integrate jsPDF or a server-side PDF generation service.');
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Top Bar */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Menu className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span className="text-lg text-slate-800 dark:text-slate-100">{t('appTitle')}</span>
          </div>

          {showTitleEdit ? (
            <input
              type="text"
              value={cvTitle}
              onChange={(e) => setCvTitle(e.target.value)}
              onBlur={() => setShowTitleEdit(false)}
              onKeyPress={(e) => e.key === 'Enter' && setShowTitleEdit(false)}
              className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setShowTitleEdit(true)}
              className="text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100"
            >
              {cvTitle}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className={`text-sm ${saveMessage.startsWith(t('errorSaving')) ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {saveMessage}
            </span>
          )}

          <ThemeLanguageControls />

          <button
            onClick={onViewAccount}
            className="px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2"
          >
            <FolderOpen className="w-4 h-4" />
            {t('myCVs')}
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? t('saving') : t('save')}
          </button>

          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {t('export')}
          </button>

          <button
            onClick={onSignOut}
            className="px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            {t('signOut')}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Editor */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">
            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 inline-flex">
              <button
                onClick={() => setActiveTab('content')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${activeTab === 'content'
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                <Sparkles className="w-4 h-4" />
                {t('contentAndAI')}
              </button>
              <button
                onClick={() => setActiveTab('template')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${activeTab === 'template'
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                <Palette className="w-4 h-4" />
                {t('template')}
              </button>
            </div>

            {/* Content Area */}
            {activeTab === 'content' ? (
              <ContentEditor
                data={data}
                onChange={setData}
                accessToken={accessToken}
              />
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl mb-2 text-slate-800 dark:text-slate-100">{t('chooseTemplate')}</h2>
                <p className="text-slate-600 dark:text-slate-300 mb-6">
                  {t('chooseTemplateDesc')}
                </p>
                <TemplateSelector selected={template} onSelect={setTemplate} />
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="w-[650px] bg-slate-100 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 overflow-y-auto p-6">
          <div className="flex items-center gap-2 mb-4 text-slate-600 dark:text-slate-400">
            <Eye className="w-4 h-4" />
            <span className="text-sm">{t('livePreview')}</span>
          </div>

          <div className="flex justify-center">
            <div className="transform scale-90 origin-top">
              <LivePreview data={data} template={template} />
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-cv, #printable-cv * {
            visibility: visible;
          }
          #printable-cv {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>

      {/* Hidden printable version */}
      <div id="printable-cv" className="hidden print:block">
        <LivePreview data={data} template={template} />
      </div>
    </div>
  );
}
