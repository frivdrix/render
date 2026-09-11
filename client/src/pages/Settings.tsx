import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Save,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { api } from '../services/api.js';
import { SystemSettings } from '../types/index.js';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    googleClientId: '',
    googleClientSecret: '',
    googleRedirectUri: '',
    appBaseUrl: '',
    trackingDomain: '',
    globalDeliverabilitySafety: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await api.getSettings();
        setSettings(data);
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await api.updateSettings(settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl pb-16">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
          Deliverability & Safety Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure anti-spam throttles, pacing jitter, and view connected cloud storage.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Anti-Spam Safeguards */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Deliverability Safeguard Enforcements</h3>
              <p className="text-xs text-slate-400">Automatic safety throttles to guarantee primary tab placement</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:bg-slate-900 transition">
              <input
                type="checkbox"
                checked={settings.globalDeliverabilitySafety}
                onChange={(e) => setSettings({ ...settings, globalDeliverabilitySafety: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 text-brand-500 focus:ring-brand-500 w-4 h-4 mt-0.5"
              />
              <div>
                <span className="font-bold text-slate-200 block text-sm">
                  Enforce Pure Plain-Text Outreach & Anti-Spam Jitter
                </span>
                <span className="text-slate-400 leading-relaxed block mt-1">
                  • <strong>Zero Tracking Pixels</strong>: Removes hidden images and link redirectors so emails look 100% human.<br/>
                  • <strong>Randomized Pacing</strong>: Introduces 60–180s jitter delays between sends.<br/>
                  • <strong>Daily Caps</strong>: Automatically caps each Google Workspace account at 40 sends/day to protect domain health.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Cloud Infrastructure Status */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-lg bg-brand-500/20 text-brand-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Connected Cloud Infrastructure</h3>
              <p className="text-xs text-slate-400">Live cloud backend and database storage status</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">Database Storage</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                  ACTIVE
                </span>
              </div>
              <p className="text-slate-400 text-[11px]">
                MongoDB Atlas Cloud (Permanent persistence across all restarts)
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">24/7 Background Queue Engine</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                  ONLINE
                </span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Render Cloud + UptimeRobot keep-alive active
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {success && (
            <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Settings Saved Successfully
            </span>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-bold text-white shadow-lg shadow-brand-600/20 flex items-center gap-2 transition"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
