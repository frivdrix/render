import React, { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Send,
  RefreshCw,
  CheckCircle2,
  X,
  Globe,
  Building2,
  FileCode,
  Layers,
  Upload,
} from 'lucide-react';
import { api } from '../services/api.js';
import { GoogleAccount, WorkspaceDomain } from '../types/index.js';

export const Accounts: React.FC = () => {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [domains, setDomains] = useState<WorkspaceDomain[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDomainSyncModalOpen, setIsDomainSyncModalOpen] = useState(false);
  const [isBulkPasteModalOpen, setIsBulkPasteModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<GoogleAccount | null>(null);

  // Single Account Form
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [dailyLimit, setDailyLimit] = useState(40);
  const [signature, setSignature] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Domain-Wide Delegation Sync Form
  const [adminEmail, setAdminEmail] = useState('');
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [manualEmails, setManualEmails] = useState('');
  const [domainLimit, setDomainLimit] = useState(40);
  const [syncingDomain, setSyncingDomain] = useState(false);
  const [domainSyncResult, setDomainSyncResult] = useState<string | null>(null);

  // Bulk Quick-Paste Form
  const [bulkText, setBulkText] = useState('');
  const [bulkLimit, setBulkLimit] = useState(40);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Test Send Form
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);

  const loadAccounts = async () => {
    try {
      const [accData, domainData] = await Promise.all([
        api.getAccounts(),
        api.getWorkspaceDomains(),
      ]);
      setAccounts(accData);
      setDomains(domainData);
    } catch (err) {
      console.error('Failed to load accounts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid Google Workspace email.');
      return;
    }

    try {
      await api.addAccount({
        email,
        name: name || email.split('@')[0],
        appPassword,
        dailyLimit,
        signature,
        authType: 'app_password',
      });
      setIsAddModalOpen(false);
      setEmail('');
      setName('');
      setAppPassword('');
      setSignature('');
      setError(null);
      loadAccounts();
    } catch (err: any) {
      setError(err.message || 'Failed to add account');
    }
  };

  const handleDomainSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncingDomain(true);
    setError(null);
    setDomainSyncResult(null);

    try {
      const res = await api.syncWorkspaceDomain({
        adminEmail,
        keyJson: serviceAccountJson,
        dailyLimit: domainLimit,
        manualEmails: manualEmails.trim() || undefined,
      });

      setDomainSyncResult(res.message);
      loadAccounts();
    } catch (err: any) {
      setError(err.message || 'Failed to sync domain inboxes');
    } finally {
      setSyncingDomain(false);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkLoading(true);
    setError(null);

    try {
      await api.bulkImportAccounts(bulkText, bulkLimit);
      setIsBulkPasteModalOpen(false);
      setBulkText('');
      loadAccounts();
    } catch (err: any) {
      setError(err.message || 'Failed to bulk import inboxes');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setServiceAccountJson(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleGoogleOAuth = async () => {
    try {
      const url = await api.getOAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      alert(err.message || 'Google OAuth credentials not configured in Settings.');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (confirm('Are you sure you want to disconnect this sender inbox?')) {
      await api.deleteAccount(id);
      loadAccounts();
    }
  };

  const handleDeleteDomain = async (id: string, domainName: string) => {
    if (confirm(`Remove domain "${domainName}" and all associated synced inboxes?`)) {
      await api.deleteWorkspaceDomain(id);
      loadAccounts();
    }
  };

  const handleResetLimit = async (id: string) => {
    await api.resetAccountLimit(id);
    loadAccounts();
  };

  const handleSendTest = async () => {
    if (!selectedAccount || !testEmail) return;
    setTestSending(true);
    setTestSuccessMessage(null);
    try {
      const msg = await api.testSend(selectedAccount.id, testEmail);
      setTestSuccessMessage(msg);
    } catch (err: any) {
      alert(err.message || 'Test send failed');
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            Google Workspace Inboxes
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30 font-bold">
              {accounts.length} Inboxes Connected
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Connect entire Google Workspace domains at once with Domain-Wide Delegation or individual inboxes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setError(null);
              setDomainSyncResult(null);
              setIsDomainSyncModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-bold text-xs text-white shadow-lg shadow-purple-600/20 flex items-center gap-2 transition"
          >
            <Building2 className="w-4 h-4" />
            1-Click Connect All Workspace Inboxes
          </button>

          <button
            onClick={() => {
              setError(null);
              setIsBulkPasteModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-xs text-slate-200 border border-slate-700 flex items-center gap-2 transition"
          >
            <Layers className="w-4 h-4" />
            Bulk Paste
          </button>

          <button
            onClick={() => {
              setError(null);
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-xs text-white shadow-lg shadow-brand-500/20 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            Add Single
          </button>
        </div>
      </div>

      {/* Connected Google Workspace Domains Banner */}
      {domains.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Globe className="w-4 h-4 text-purple-400" />
            Connected Workspace Domains ({domains.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {domains.map((dom) => (
              <div
                key={dom.id}
                className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-white font-mono">{dom.domain}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                      Domain-Wide
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Admin: {dom.adminEmail}</p>
                  <p className="text-[11px] text-emerald-400 font-semibold">
                    ✓ {accounts.filter((a) => a.domainId === dom.id).length} Active Inboxes Synced
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteDomain(dom.id, dom.domain)}
                  className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                  title="Remove Domain"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected Accounts List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading inboxes...</div>
      ) : accounts.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">No Google Inboxes Connected Yet</h3>
            <p className="text-xs text-slate-400 mt-1">
              Connect your entire Google Workspace domain in 1 click or add individual inboxes to start automated cold email rotation.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setIsDomainSyncModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-bold text-xs text-white shadow-lg shadow-purple-600/20 inline-flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              1-Click Connect All Workspace Inboxes
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {accounts.map((acc) => {
            const usagePercent = Math.min(100, Math.round((acc.sentToday / acc.dailyLimit) * 100));
            return (
              <div
                key={acc.id}
                className="glass-card rounded-2xl p-5 space-y-4 relative flex flex-col justify-between glass-card-hover transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md ${
                        acc.authType === 'service_account'
                          ? 'bg-gradient-to-tr from-purple-600 to-indigo-600'
                          : 'bg-gradient-to-tr from-brand-600 to-blue-500'
                      }`}>
                        {acc.name ? acc.name.charAt(0).toUpperCase() : 'G'}
                      </div>
                      <div className="truncate max-w-[180px]">
                        <h4 className="font-bold text-sm text-white truncate">{acc.name}</h4>
                        <p className="text-xs text-slate-400 font-mono truncate">{acc.email}</p>
                      </div>
                    </div>

                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {acc.status}
                    </span>
                  </div>

                  {/* Daily Quota Progress */}
                  <div className="mt-5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Daily Send Quota</span>
                      <span className="font-bold text-slate-200">
                        {acc.sentToday} / {acc.dailyLimit}{' '}
                        <span className="text-slate-500 font-normal">emails today</span>
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          usagePercent >= 90 ? 'bg-amber-400' : 'bg-brand-500'
                        }`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Auth Method:</span>
                      <span className="font-mono text-slate-300 uppercase">
                        {acc.authType === 'service_account' ? 'Domain-Wide (1-Click)' : acc.authType.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cooldown Jitter:</span>
                      <span className="text-slate-300">{acc.minDelaySeconds}s delay</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedAccount(acc);
                        setTestEmail(acc.email);
                        setTestSuccessMessage(null);
                        setIsTestModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
                      title="Send Deliverability Test"
                    >
                      <Send className="w-3.5 h-3.5 text-brand-400" />
                      Test Send
                    </button>
                    <button
                      onClick={() => handleResetLimit(acc.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                      title="Reset Daily Counter"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteAccount(acc.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                    title="Disconnect Account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: 1-Click Connect All Google Workspace Inboxes (Domain-Wide Delegation) */}
      {isDomainSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Connect All Workspace Inboxes in 1 Go</h3>
                  <p className="text-xs text-slate-400">
                    Authenticate all domain user inboxes via Domain-Wide Delegation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDomainSyncModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDomainSync} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 leading-relaxed whitespace-pre-line">
                  {error}
                </div>
              )}

              {domainSyncResult && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{domainSyncResult}</span>
                </div>
              )}

              {/* Step Summary */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
                <p className="font-bold text-purple-400 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4" />
                  Quick Checklist for Google Admin Console:
                </p>
                <ul className="text-slate-400 space-y-1 text-[11px] leading-relaxed">
                  <li>
                    1. Enable <b>Admin SDK API</b> & <b>Gmail API</b> in Google Cloud project.
                  </li>
                  <li>
                    2. In <a href="https://admin.google.com" target="_blank" rel="noreferrer" className="text-brand-400 underline">Google Workspace Admin Console</a> (API Controls &gt; Domain-wide Delegation), authorize with scopes:
                    <br />
                    <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300 select-all break-all">
                      https://www.googleapis.com/auth/admin.directory.user.readonly, https://www.googleapis.com/auth/gmail.send
                    </code>
                  </li>
                </ul>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Google Workspace Admin Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. admin@getletsgrowpro.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Service Account JSON Key File *
                  </label>
                  <label className="text-[11px] text-purple-400 hover:underline cursor-pointer flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    Upload .json file
                    <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
                <textarea
                  rows={5}
                  required
                  placeholder={`{\n  "type": "service_account",\n  "client_email": "nexus-sender@gmail-outreach-508318.iam.gserviceaccount.com",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n..."\n}`}
                  value={serviceAccountJson}
                  onChange={(e) => setServiceAccountJson(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Domain Inboxes List (Optional Instant Fallback)
                  </label>
                  <span className="text-[11px] text-slate-500">Paste your 10 inboxes if Directory API is disabled</span>
                </div>
                <textarea
                  rows={3}
                  placeholder={`user1@getletsgrowpro.com\nuser2@getletsgrowpro.com\nuser3@getletsgrowpro.com`}
                  value={manualEmails}
                  onChange={(e) => setManualEmails(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Daily Send Cap per Inbox (Default: 40/day)
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={domainLimit}
                  onChange={(e) => setDomainLimit(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDomainSyncModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={syncingDomain}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-bold text-xs text-white flex items-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
                >
                  {syncingDomain ? (
                    <>
                      <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                      Connecting Inboxes...
                    </>
                  ) : (
                    <>
                      <Building2 className="w-4 h-4" />
                      Connect All Domain Inboxes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Bulk Paste Multiple Inboxes */}
      {isBulkPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Bulk Paste Inboxes</h3>
                  <p className="text-xs text-slate-400">Quickly add dozens of inboxes by pasting a list</p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkPasteModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkImport} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  {error}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Paste rows (Format: <code>email:app_password:name</code> or tab/comma separated)
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder={`user1@domain.com:xxxx xxxx xxxx xxxx:Alex\nuser2@domain.com:yyyy yyyy yyyy yyyy:Sarah\nuser3@domain.com:zzzz zzzz zzzz zzzz:David`}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Daily Sending Cap per Inbox
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={bulkLimit}
                  onChange={(e) => setBulkLimit(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkPasteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkLoading}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-xs text-white shadow-lg shadow-brand-600/20"
                >
                  {bulkLoading ? 'Importing...' : 'Import Inboxes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Single Account */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-brand-500/20 text-brand-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Connect Single Google Workspace Inbox</h3>
                  <p className="text-xs text-slate-400">Connect via App Password or direct OAuth 2.0</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick OAuth Button */}
            <div className="p-6 border-b border-slate-800 space-y-3">
              <button
                onClick={handleGoogleOAuth}
                type="button"
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2.5 shadow-md transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Sign In with Google Workspace (OAuth 2.0)
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">or App Password</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>
            </div>

            <form onSubmit={handleAddAccount} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  {error}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Google Workspace Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. aryan@yourcompany.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Sender Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Aryan Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">16-character Google App Password *</label>
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-brand-400 hover:underline"
                  >
                    Generate in Google Account ↗
                  </a>
                </div>
                <input
                  type="password"
                  required
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Daily Sending Limit (Recommended: 30–50 max per Google inbox)
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Email Signature (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Best regards,&#10;Aryan Sharma&#10;Founder"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-bold text-white shadow-lg shadow-brand-600/20"
                >
                  Save & Connect Inbox
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Test Send Modal */}
      {isTestModalOpen && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Send Deliverability Test</h3>
                  <p className="text-xs text-slate-400">Verify headers and inbox placement</p>
                </div>
              </div>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                <p className="text-slate-400">Sending from:</p>
                <p className="font-bold text-white font-mono">{selectedAccount.email}</p>
                <p className="text-[11px] text-purple-400 font-semibold">
                  Auth: {selectedAccount.authType === 'service_account' ? 'Google Workspace Domain-Wide' : selectedAccount.authType}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Send test email to address:
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="e.g. your-personal@gmail.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              {testSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{testSuccessMessage}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={handleSendTest}
                disabled={testSending || !testEmail}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                {testSending ? 'Sending...' : 'Send Live Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
