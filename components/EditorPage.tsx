import React, { useState, useEffect } from 'react';
import { Save, Download, Sparkles, Palette, Eye, LogOut, FolderOpen, User } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { CVData } from './OnboardingFlow';
import { Template, TemplateSelector } from './TemplateSelector';
import { LivePreview } from './LivePreview';
import { ContentEditor } from './ContentEditor';
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
  const [activeTab, setActiveTab] = useState<'content' | 'template' | 'preview'>('content');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [cvId, setCvId] = useState<string | null>(null);
  const [cvTitle, setCvTitle] = useState(t('untitledCV'));
  const [showTitleEdit, setShowTitleEdit] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');

    try {
      const { id, error } = await CVService.saveCV(
        user.id,
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

  const handleExport = async () => {
    console.log('Export button clicked');
    setExporting(true);

    try {
      console.log('Importing PDF export utility...');
      const { exportToPDF } = await import('../utils/pdfExport');

      const filename = `${cvTitle.replace(/[^a-z0-9]/gi, '_')}_CV.pdf`;
      console.log('Exporting to PDF with filename:', filename);

      await exportToPDF('printable-cv', filename);
      console.log('PDF export completed successfully');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Top Bar */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 md:px-6 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-lg font-bold text-slate-800 dark:text-slate-100 hidden lg:inline">{t('appTitle')}</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-100 lg:hidden">CV</span>
            </Link>
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
              className="text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 max-w-[80px] sm:max-w-[150px] lg:max-w-none truncate"
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

          <div className="hidden lg:block">
            <ThemeLanguageControls />
          </div>

          <button
            onClick={onViewAccount}
            className="px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="hidden lg:inline">{t('myCVs')}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span className="hidden lg:inline">{saving ? t('saving') : t('save')}</span>
          </button>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span className="hidden lg:inline">{exporting ? 'Exporting...' : t('export')}</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                <User className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('myAccount') || 'My Account'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onViewAccount}>
                <FolderOpen className="w-4 h-4 mr-2" />
                {t('dashboard') || 'Dashboard'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewAccount}>
                <User className="w-4 h-4 mr-2" />
                {t('account') || 'Account'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className="text-red-600 dark:text-red-400">
                <LogOut className="w-4 h-4 mr-2" />
                {t('signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Editor */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">
            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 inline-flex overflow-x-auto max-w-full">
              <button
                onClick={() => setActiveTab('content')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'content'
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                <Sparkles className="w-4 h-4" />
                {t('contentAndAI')}
              </button>
              <button
                onClick={() => setActiveTab('template')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'template'
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                <Palette className="w-4 h-4" />
                {t('template')}
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors lg:hidden whitespace-nowrap ${activeTab === 'preview'
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                <Eye className="w-4 h-4" />
                {t('livePreview')}
              </button>
            </div>

            {/* Content Area */}
            {activeTab === 'content' && (
              <ContentEditor
                data={data}
                onChange={setData}
                accessToken={accessToken}
              />
            )}

            {activeTab === 'template' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl mb-2 text-slate-800 dark:text-slate-100">{t('chooseTemplate')}</h2>
                <p className="text-slate-600 dark:text-slate-300 mb-6">
                  {t('chooseTemplateDesc')}
                </p>
                <TemplateSelector selected={template} onSelect={setTemplate} />
              </div>
            )}

            {/* Mobile Preview Area */}
            {activeTab === 'preview' && (
              <div className="lg:hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden p-4">
                <div className="flex justify-center">
                  <div className="transform scale-[0.6] sm:scale-75 origin-top">
                    <LivePreview data={data} template={template} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Preview (Desktop Only) */}
        <div className="hidden lg:block w-[650px] bg-slate-100 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 overflow-y-auto p-6">
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
