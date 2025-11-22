import React, { useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../components/info';
import { CVData } from './OnboardingFlow';
import { useTheme } from '../components/ThemeContext';

interface FileUploaderProps {
  onComplete: (data: CVData) => void;
  onBack: () => void;
}

export function FileUploader({ onComplete, onBack }: FileUploaderProps) {
  const { t, theme } = useTheme();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];

    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF or DOCX file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB');
      return;
    }

    setFile(file);
    setError('');
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const { parseCV } = await import('../utils/cvParser');
      const data = await parseCV(file);
      onComplete(data);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Parsing failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleManualEntry = () => {
    onBack();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <button onClick={onBack} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-8">
          ← {t('back')}
        </button>

        <h1 className="text-4xl mb-4 text-slate-800 dark:text-slate-100">{t('uploadCV')}</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
          {t('uploadCVDesc')}
        </p>

        <div className={`bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 ${theme === 'dark-glass' ? 'glass-card' : ''}`}>
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${dragActive
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
              : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'
              }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {!file ? (
              <>
                <Upload className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                <p className="text-lg mb-2 text-slate-700 dark:text-slate-300">
                  {t('uploadCV')}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  PDF, DOCX (max 10MB)
                </p>
                <label className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer inline-block">
                  {t('uploadCV')}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleChange}
                    className="hidden"
                  />
                </label>
              </>
            ) : (
              <div className="flex items-center justify-center gap-4">
                <FileText className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                <div className="text-left">
                  <p className="text-slate-800 dark:text-slate-100">{file.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 ml-4"
                >
                  {t('remove')}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}



          <div className="flex gap-3 mt-8">
            <button
              onClick={handleManualEntry}
              className="flex-1 px-6 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              {t('manualEntry')}
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? t('loading') : t('continue')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
