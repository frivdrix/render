import React from 'react';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';
import { SpamAnalysis } from '../types/index.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  analysis: SpamAnalysis | null;
  isLoading?: boolean;
}

export const DeliverabilityAuditModal: React.FC<Props> = ({
  isOpen,
  onClose,
  analysis,
  isLoading,
}) => {
  if (!isOpen) return null;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 75) return 'text-brand-400 border-brand-500/40 bg-brand-500/10';
    if (score >= 60) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-500/20 text-brand-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Deliverability & Spam Audit</h3>
              <p className="text-xs text-slate-400">Primary inbox placement analyzer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm">Analyzing email headers, spintax, and spam triggers...</p>
            </div>
          ) : analysis ? (
            <>
              {/* Score Display */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Deliverability Grade</p>
                  <p className="text-2xl font-black text-white mt-1">
                    {analysis.grade} <span className="text-sm font-normal text-slate-400">({analysis.score}/100)</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {analysis.score >= 85
                      ? 'High probability of landing directly in Gmail Primary tab.'
                      : analysis.score >= 65
                      ? 'Moderate risk of landing in Google Promotions or Spam.'
                      : 'High risk of landing in Spam tab.'}
                  </p>
                </div>
                <div className={`text-4xl font-extrabold px-5 py-3 rounded-2xl border ${getScoreColor(analysis.score)}`}>
                  {analysis.grade}
                </div>
              </div>

              {/* Detected Issues */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Spam Filter Triggers ({analysis.issues.length})
                </h4>
                {analysis.issues.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Clean copy! Zero spam trigger words or aggressive formatting detected.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {analysis.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-start gap-2"
                      >
                        <span className="font-bold text-rose-400">•</span>
                        <span>{issue}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-brand-400" />
                  Deliverability Optimization Tips
                </h4>
                <div className="space-y-2">
                  {analysis.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-slate-300 bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-slate-400 text-sm">No analysis available.</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
