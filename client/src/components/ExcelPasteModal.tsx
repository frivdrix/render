import React, { useState } from 'react';
import { X, FileSpreadsheet, Upload, Clipboard, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  onSuccess: () => void;
}

export const ExcelPasteModal: React.FC<Props> = ({
  isOpen,
  onClose,
  campaignId,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    importedCount: number;
    detectedColumns: string[];
    invalidCount: number;
  } | null>(null);

  if (!isOpen) return null;

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) {
      setError('Please paste spreadsheet data first.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.pasteLeads(campaignId, pastedText);
      setResult(res);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to import pasted leads');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select an Excel (.xlsx/.xls) or CSV file.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.uploadLeadsFile(campaignId, selectedFile);
      setResult(res);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to import spreadsheet file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Import Leads from Spreadsheet</h3>
              <p className="text-xs text-slate-400">Paste Excel/Sheets rows or upload .xlsx/.csv</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6 pt-3">
          <button
            onClick={() => {
              setActiveTab('paste');
              setError(null);
            }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'paste'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clipboard className="w-4 h-4" />
            Paste from Excel / Google Sheets
          </button>

          <button
            onClick={() => {
              setActiveTab('upload');
              setError(null);
            }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload File (.xlsx, .csv)
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Import Successful!</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Successfully imported <span className="text-emerald-400 font-bold">{result.importedCount}</span> leads.
                </p>
              </div>

              {result.detectedColumns.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-left max-w-md mx-auto">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Detected Columns:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.detectedColumns.map((col, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-brand-500/15 text-brand-400 border border-brand-500/25 text-xs font-mono font-medium"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition"
              >
                Done & View Leads
              </button>
            </div>
          ) : activeTab === 'paste' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Paste rows directly (Ctrl+V / Cmd+V)
                </label>
                <span className="text-[11px] text-slate-400">
                  Headers like <b>Email</b>, <b>First Name</b>, <b>Company</b>, <b>Subject</b>, <b>Body</b> auto-mapped.
                </span>
              </div>

              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`email\tfirstName\tcompany\tsubject\tbody\nalex@acme.com\tAlex\tAcme Corp\tQuick Question\tHi Alex, loved your product...`}
                rows={9}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3.5 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 leading-relaxed"
              />

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">💡 Pro-Tip:</p>
                <p>
                  You can copy any range directly from Excel or Google Sheets (including custom columns like <code>icebreaker</code>, <code>city</code>) and paste here. Custom columns become available as merge tags: <code>{'{{icebreaker}}'}</code>.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-brand-500/60 rounded-2xl p-8 text-center bg-slate-900/40 transition">
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-200">
                  {selectedFile ? selectedFile.name : 'Click to select or drag and drop spreadsheet'}
                </p>
                <p className="text-xs text-slate-500 mt-1">Supports .xlsx, .xls, and .csv files</p>

                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload-input"
                />
                <label
                  htmlFor="file-upload-input"
                  className="mt-4 inline-block px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer border border-slate-700"
                >
                  Choose Spreadsheet File
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={activeTab === 'paste' ? handlePasteSubmit : handleFileUpload}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-2 shadow-lg shadow-brand-600/20"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Import Leads
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
