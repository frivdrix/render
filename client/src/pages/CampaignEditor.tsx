import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Play,
  Pause,
  Users,
  FileSpreadsheet,
  Mail,
  Clock,
  Sparkles,
  Shuffle,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Plus,
} from 'lucide-react';
import { api } from '../services/api.js';
import { Campaign, Lead, GoogleAccount, SpamAnalysis } from '../types/index.js';
import { ExcelPasteModal } from '../components/ExcelPasteModal.js';
import { SpintaxHelperModal } from '../components/SpintaxHelperModal.js';
import { DeliverabilityAuditModal } from '../components/DeliverabilityAuditModal.js';

export const CampaignEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [activeTab, setActiveTab] = useState<'leads' | 'sequence' | 'schedule'>('sequence');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<Campaign['settings']>({
    trackOpens: false,
    trackClicks: false,
    plainTextMode: true,
    addUnsubscribeLink: false,
    dailyLimitPerAccount: 40,
    minJitterSeconds: 60,
    maxJitterSeconds: 180,
    sendWindowStart: '00:00',
    sendWindowEnd: '23:59',
    timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Kolkata',
    sendDays: [0, 1, 2, 3, 4, 5, 6],
  });

  // Modals & Tools
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isSpintaxModalOpen, setIsSpintaxModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [activeFieldForSpintax, setActiveFieldForSpintax] = useState<'subject' | 'body'>('body');
  const [spamAnalysis, setSpamAnalysis] = useState<SpamAnalysis | null>(null);
  const [previewVariations, setPreviewVariations] = useState<{ iteration: number; subject: string; body: string }[]>([]);

  const loadData = async () => {
    if (!id) return;
    try {
      const [campData, leadsData, accountsData] = await Promise.all([
        api.getCampaign(id),
        api.getLeads(id),
        api.getAccounts(),
      ]);

      setCampaign(campData);
      setLeads(leadsData);
      setAccounts(accountsData);

      setName(campData.name);
      setSubject(campData.subject);
      setBody(campData.body);
      setAccountIds(campData.accountIds);
      setSettings(campData.settings);

      // Run initial spam analysis
      const analysis = await api.analyzeSpam(campData.subject, campData.body);
      setSpamAnalysis(analysis);
    } catch (err) {
      console.error('Failed to load campaign data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await api.updateCampaign(id, {
        name,
        subject,
        body,
        accountIds,
        settings,
      });
      setCampaign(updated);

      // Refresh spam analysis
      const analysis = await api.analyzeSpam(subject, body);
      setSpamAnalysis(analysis);
    } catch (err: any) {
      alert(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStart = async () => {
    if (!campaign) return;
    try {
      if (campaign.status === 'running') {
        await api.pauseCampaign(campaign.id);
      } else {
        await handleSave();
        await api.startCampaign(campaign.id);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleGeneratePreview = async () => {
    if (!id) return;
    try {
      const sample = leads.length > 0 ? leads[0] : undefined;
      const res = await api.previewCampaign(id, subject, body, sample);
      setPreviewVariations(res.variations || []);
      setSpamAnalysis(res.analysis);
    } catch (err: any) {
      alert(err.message || 'Preview generation failed');
    }
  };

  const handleInsertVariable = (variable: string) => {
    if (activeFieldForSpintax === 'subject') {
      setSubject((prev) => prev + ` {{${variable}}}`);
    } else {
      setBody((prev) => prev + ` {{${variable}}}`);
    }
  };

  const handleInsertSpintax = (spintaxStr: string) => {
    if (activeFieldForSpintax === 'subject') {
      setSubject((prev) => prev + ` ${spintaxStr}`);
    } else {
      setBody((prev) => prev + ` ${spintaxStr}`);
    }
  };

  const handleClearLeads = async () => {
    if (!id) return;
    if (confirm('Are you sure you want to clear all imported leads from this campaign?')) {
      await api.clearCampaignLeads(id);
      loadData();
    }
  };

  if (loading || !campaign) {
    return <div className="py-20 text-center text-slate-400">Loading campaign builder...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Top Bar Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/campaigns')}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xl font-black bg-transparent border-b border-transparent hover:border-slate-700 focus:border-brand-500 text-white focus:outline-none px-1"
              />
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  campaign.status === 'running'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : campaign.status === 'paused'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {campaign.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 px-1">
              {leads.length} leads imported • {accountIds.length} inboxes rotating
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 border border-slate-700 transition"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          <button
            onClick={handleToggleStart}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition ${
              campaign.status === 'running'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 shadow-amber-500/10'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
          >
            {campaign.status === 'running' ? (
              <>
                <Pause className="w-4 h-4" />
                Pause Campaign
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Launch Campaign
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('sequence')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'sequence'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mail className="w-4 h-4" />
          Sequence & Spintax Composer
        </button>

        <button
          onClick={() => setActiveTab('leads')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'leads'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Leads List ({leads.length})
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'schedule'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Schedule & Multi-Inbox Rotation ({accountIds.length})
        </button>
      </div>

      {/* TAB 1: SEQUENCE & SPINTAX COMPOSER */}
      {activeTab === 'sequence' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Email Composer (2 Cols) */}
          <div className="lg:col-span-2 space-y-5">
            <div className="glass-card rounded-2xl p-6 space-y-4">
              {/* Variable Quick Inserts & Spintax Button */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-500 font-medium mr-1">Insert tags:</span>
                  {['firstName', 'lastName', 'company', 'email'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertVariable(tag)}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-brand-500/20 hover:text-brand-400 text-[11px] font-mono font-medium text-slate-300 border border-slate-700/80 transition"
                    >
                      {`{{${tag}}}`}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setIsSpintaxModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  Spintax Helper
                </button>
              </div>

              {/* Subject Field */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Subject Line (Supports Spintax & Variables)
                </label>
                <input
                  type="text"
                  value={subject}
                  onFocus={() => setActiveFieldForSpintax('subject')}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. {Quick question regarding|Reaching out about} {{company | your team}}"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              {/* Body Field */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Email Body
                </label>
                <textarea
                  rows={10}
                  value={body}
                  onFocus={() => setActiveFieldForSpintax('body')}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={`Hi {{firstName | there}},\n\n{Noticed what you are building at|Came across} {{company}} and wanted to connect...\n\nWould you be open to a 5-min chat this Thursday?\n\nBest,\nYour Name`}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-4 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 leading-relaxed"
                />
              </div>

              {/* Deliverability Guarantee Banner */}
              <div className="pt-3 border-t border-slate-800">
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white block">100% Pure Plain-Text Outreach Active</span>
                    <span className="text-[11px] text-slate-400">
                      Zero tracking pixels and zero HTML wrappers. Emails land directly in the recipient's primary inbox looking 100% like personal 1-to-1 emails.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Deliverability Score & Live Simulator (1 Col) */}
          <div className="space-y-5">
            {/* Deliverability Health Card */}
            {spamAnalysis && (
              <div className="glass-card rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-brand-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Deliverability Audit
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsAuditModalOpen(true)}
                    className="text-[11px] font-semibold text-brand-400 hover:underline"
                  >
                    View Details
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <p className="text-[11px] text-slate-400">Estimated Grade</p>
                    <p className="text-xl font-black text-white">
                      {spamAnalysis.grade}{' '}
                      <span className="text-xs font-normal text-slate-400">({spamAnalysis.score}/100)</span>
                    </p>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-lg font-black">
                    {spamAnalysis.grade}
                  </div>
                </div>

                {spamAnalysis.issues.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {spamAnalysis.issues.length} Deliverability warnings
                    </p>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      {spamAnalysis.issues[0]}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Copy is clean and ready for primary inbox.</span>
                  </div>
                )}
              </div>
            )}

            {/* Live Random Variation Preview Generator */}
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Spintax Simulator
                </h3>
                <button
                  type="button"
                  onClick={handleGeneratePreview}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                >
                  <RotateCw className="w-3 h-3" />
                  Simulate
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                Click simulate to see how Spintax and dynamic lead tags create distinct variations:
              </p>

              <div className="space-y-2">
                {(previewVariations.length > 0 ? previewVariations : [1, 2]).map((varItem, idx) => {
                  const sub = typeof varItem === 'object' ? varItem.subject : `Reaching out regarding ${leads[0]?.company || 'Acme Corp'}`;
                  const bdy = typeof varItem === 'object' ? varItem.body : `Hi ${leads[0]?.firstName || 'Alex'},\n\nNoticed what you are building...`;

                  return (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-1 text-xs">
                      <span className="text-[10px] uppercase font-bold text-purple-400">Sample #{idx + 1}</span>
                      <p className="font-semibold text-slate-200 truncate">Subj: {sub}</p>
                      <p className="text-slate-400 font-mono text-[11px] line-clamp-2">{bdy}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LEADS LIST */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-white">
                Campaign Leads ({leads.length})
              </h3>
              {leads.length > 0 && (
                <button
                  onClick={handleClearLeads}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Leads
                </button>
              )}
            </div>

            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Paste Excel / Upload File
            </button>
          </div>

          {leads.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center space-y-3">
              <FileSpreadsheet className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">No leads added to this campaign yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Paste rows directly from your spreadsheet or upload an .xlsx/.csv file.
              </p>
              <button
                onClick={() => setIsExcelModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Import Excel Leads
              </button>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">First Name</th>
                      <th className="p-3.5">Company</th>
                      <th className="p-3.5">Custom Subject / Body</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Delivery / Reply Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-800/30 transition font-mono">
                        <td className="p-3.5 font-bold text-slate-200">{lead.email}</td>
                        <td className="p-3.5 text-slate-300">{lead.firstName || '—'}</td>
                        <td className="p-3.5 text-slate-300">{lead.company || '—'}</td>
                        <td className="p-3.5 text-slate-400 truncate max-w-xs">
                          {lead.customSubject || lead.customBody ? 'Customized in sheet' : 'Campaign Template'}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider ${
                              lead.status === 'replied'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : lead.status === 'sent'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : lead.status === 'bounced'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {lead.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right text-slate-300">
                          {lead.status === 'replied' ? (
                            <span className="text-amber-400 font-bold">💬 Replied</span>
                          ) : lead.status === 'sent' ? (
                            <span className="text-blue-400">✓ Delivered (Plain Text)</span>
                          ) : (
                            <span className="text-slate-500">Queued</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SCHEDULE & MULTI-INBOX ROTATION */}
      {activeTab === 'schedule' && (
        <div className="glass-card rounded-2xl p-6 space-y-6 max-w-3xl">
          {/* Multi-Inbox Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Participating Google Workspace Inboxes (Multi-Account Rotation)
            </label>
            <p className="text-xs text-slate-400">
              NexusSend will rotate outbound sends round-robin across selected inboxes to protect sender reputation.
            </p>

            <div className="space-y-2">
              {accounts.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  No Google Inboxes connected yet.{' '}
                  <Link to="/accounts" className="underline font-bold">
                    Connect Inboxes here
                  </Link>
                </div>
              ) : (
                accounts.map((acc) => {
                  const isChecked = accountIds.includes(acc.id);
                  return (
                    <label
                      key={acc.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${
                        isChecked
                          ? 'bg-brand-500/10 border-brand-500/40 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAccountIds([...accountIds, acc.id]);
                            } else {
                              setAccountIds(accountIds.filter((aid) => aid !== acc.id));
                            }
                          }}
                          className="rounded bg-slate-800 border-slate-700 text-brand-500 focus:ring-brand-500 w-4 h-4"
                        />
                        <div>
                          <p className="font-bold text-xs text-slate-200">{acc.name}</p>
                          <p className="text-[11px] font-mono text-slate-400">{acc.email}</p>
                        </div>
                      </div>

                      <span className="text-xs font-semibold text-slate-400">
                        Cap: {acc.dailyLimit} / day
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Schedule Windows & Jitter */}
          <div className="pt-4 border-t border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Outreach Schedule & Allowed Sending Days
              </h4>
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    sendDays: [0, 1, 2, 3, 4, 5, 6],
                    sendWindowStart: '00:00',
                    sendWindowEnd: '23:59',
                  })
                }
                className="text-[11px] font-bold text-brand-400 hover:text-brand-300 px-2.5 py-1 rounded-lg bg-brand-500/10 border border-brand-500/20"
              >
                ⚡ Set to 24/7 (Any Day & Time)
              </button>
            </div>

            {/* Day Selector */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 block">Allowed Sending Days:</label>
              <div className="grid grid-cols-7 gap-2">
                {[
                  { day: 0, label: 'Sun' },
                  { day: 1, label: 'Mon' },
                  { day: 2, label: 'Tue' },
                  { day: 3, label: 'Wed' },
                  { day: 4, label: 'Thu' },
                  { day: 5, label: 'Fri' },
                  { day: 6, label: 'Sat' },
                ].map(({ day, label }) => {
                  const isDayActive = (settings.sendDays || []).includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const current = settings.sendDays || [];
                        const updated = isDayActive
                          ? current.filter((d) => d !== day)
                          : [...current, day].sort();
                        setSettings({ ...settings, sendDays: updated });
                      }}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition border ${
                        isDayActive
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                          : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Sending Window Start</label>
                <input
                  type="time"
                  value={settings.sendWindowStart}
                  onChange={(e) => setSettings({ ...settings, sendWindowStart: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Sending Window End</label>
                <input
                  type="time"
                  value={settings.sendWindowEnd}
                  onChange={(e) => setSettings({ ...settings, sendWindowEnd: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="Asia/Kolkata">India Standard Time (IST) (UTC+5:30)</option>
                <option value="America/New_York">Eastern Time (US & Canada) (UTC-5/UTC-4)</option>
                <option value="America/Chicago">Central Time (US & Canada) (UTC-6/UTC-5)</option>
                <option value="America/Los_Angeles">Pacific Time (US & Canada) (UTC-8/UTC-7)</option>
                <option value="Europe/London">London / GMT</option>
                <option value="Europe/Paris">Central European Time (CET)</option>
                <option value="UTC">Coordinated Universal Time (UTC)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Randomized Jitter Minimum (Seconds)</label>
                <input
                  type="number"
                  min={10}
                  max={600}
                  value={settings.minJitterSeconds}
                  onChange={(e) => setSettings({ ...settings, minJitterSeconds: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Randomized Jitter Maximum (Seconds)</label>
                <input
                  type="number"
                  min={10}
                  max={600}
                  value={settings.maxJitterSeconds}
                  onChange={(e) => setSettings({ ...settings, maxJitterSeconds: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {id && (
        <ExcelPasteModal
          isOpen={isExcelModalOpen}
          onClose={() => setIsExcelModalOpen(false)}
          campaignId={id}
          onSuccess={loadData}
        />
      )}

      <SpintaxHelperModal
        isOpen={isSpintaxModalOpen}
        onClose={() => setIsSpintaxModalOpen(false)}
        onInsert={handleInsertSpintax}
      />

      <DeliverabilityAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        analysis={spamAnalysis}
      />
    </div>
  );
};
