import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Save,
  Key,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api.js';
import { SystemSettings } from '../types/index.js';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    googleClientId: '',
    googleClientSecret: '',
    googleRedirectUri: 'http://localhost:5000/api/accounts/oauth/callback',
    appBaseUrl: 'http://localhost:5000',
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
          Deliverability & Integration Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure Google Workspace API credentials, tracking domains, and anti-spam safeguards.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Google OAuth Credentials */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-lg bg-brand-500/20 text-brand-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Google Cloud Console OAuth 2.0 Credentials</h3>
              <p className="text-xs text-slate-400">Allows 1-click Google Workspace login via Gmail API</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Google Client ID</label>
              <input
                type="text"
                placeholder="xxxx.apps.googleusercontent.com"
                value={settings.googleClientId}
                onChange={(e) => setSettings({ ...settings, googleClientId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Google Client Secret</label>
              <input
                type="password"
                placeholder="GOCSPX-xxxx"
                value={settings.googleClientSecret}
                onChange={(e) => setSettings({ ...settings, googleClientSecret: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">OAuth Authorized Redirect URI</label>
              <input
                type="text"
                value={settings.googleRedirectUri}
                onChange={(e) => setSettings({ ...settings, googleRedirectUri: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-slate-300 font-mono focus:outline-none focus:border-brand-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Add this exact URL to your Google Cloud Console Authorized Redirect URIs.
              </p>
            </div>
          </div>
        </div>

        {/* Custom Tracking Domain */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Custom Tracking Domain (CNAME)</h3>
              <p className="text-xs text-slate-400">Isolates open/click tracking from generic domains</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                Custom Tracking Host (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. http://track.yourdomain.com:5000"
                value={settings.trackingDomain || ''}
                onChange={(e) => setSettings({ ...settings, trackingDomain: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Point a CNAME record from <code>track.yourdomain.com</code> to your server IP to eliminate shared tracking footprint.
              </p>
            </div>
          </div>
        </div>

        {/* Deliverability Safeguards */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Deliverability Safeguard Enforcements</h3>
              <p className="text-xs text-slate-400">Automatic safety throttles to prevent Google spam flags</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:bg-slate-900">
              <input
                type="checkbox"
                checked={settings.globalDeliverabilitySafety}
                onChange={(e) => setSettings({ ...settings, globalDeliverabilitySafety: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 text-brand-500 focus:ring-brand-500 w-4 h-4 mt-0.5"
              />
              <div>
                <span className="font-bold text-slate-200 block">Enforce Anti-Spam Jitter & Warmup Limits</span>
                <span className="text-slate-400">
                  Automatically introduces 60–180s randomized intervals between emails and enforces max 40–50 sends/day per Google Workspace account.
                </span>
              </div>
            </label>
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
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
