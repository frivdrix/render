import React, { useEffect, useState } from 'react';
import {
  Send,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
  Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { Campaign } from '../types/index.js';

export const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();

  const loadCampaigns = async () => {
    try {
      const data = await api.getCampaigns();
      setCampaigns(data);
    } catch (err) {
      console.error('Failed to load campaigns', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createCampaign({
        name: newCampaignName.trim() || `Campaign ${new Date().toLocaleDateString()}`,
      });
      setIsCreateModalOpen(false);
      setNewCampaignName('');
      navigate(`/campaigns/${created.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create campaign');
    }
  };

  const handleToggleCampaign = async (campaign: Campaign) => {
    try {
      if (campaign.status === 'running') {
        await api.pauseCampaign(campaign.id);
      } else {
        await api.startCampaign(campaign.id);
      }
      loadCampaigns();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (confirm('Delete this campaign and all its imported leads?')) {
      await api.deleteCampaign(id);
      loadCampaigns();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            Cold Outreach Campaigns
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30 font-bold">
              {campaigns.length} Total
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Build multi-step cold outreach sequences with dynamic Spintax and multi-inbox rotation.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-xs text-white shadow-lg shadow-brand-500/20 flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto">
            <Send className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">No Campaigns Created Yet</h3>
            <p className="text-xs text-slate-400 mt-1">
              Create your first cold email campaign, paste an Excel lead list, and start sending with automated inbox rotation.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-xs text-white shadow-lg shadow-brand-500/20 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create First Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((camp) => {
            const replyRate = camp.stats.sent > 0 ? Math.round((camp.stats.replied / camp.stats.sent) * 100) : 0;

            return (
              <div
                key={camp.id}
                className="glass-card rounded-2xl p-5 transition-all duration-200 glass-card-hover flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/campaigns/${camp.id}`}
                      className="text-base font-bold text-white hover:text-brand-400 transition flex items-center gap-1.5"
                    >
                      {camp.name}
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100" />
                    </Link>
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        camp.status === 'running'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : camp.status === 'paused'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : camp.status === 'completed'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {camp.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-mono truncate max-w-xl">
                    Subject: {camp.subject}
                  </p>

                  <div className="flex items-center gap-6 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      Leads: <b className="text-slate-200">{camp.stats.totalLeads}</b>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-brand-400" />
                      Sent: <b className="text-slate-200">{camp.stats.sent}</b>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      Replies: <b className="text-amber-400">{replyRate}%</b> ({camp.stats.replied})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Deliverability: <b className="text-emerald-400">100% Plain Text</b>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-center">
                  <button
                    onClick={() => handleToggleCampaign(camp)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                      camp.status === 'running'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    {camp.status === 'running' ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Start
                      </>
                    )}
                  </button>

                  <Link
                    to={`/campaigns/${camp.id}`}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Edit Campaign"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => handleDeleteCampaign(camp.id)}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                    title="Delete Campaign"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Campaign Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Create New Outreach Campaign</h3>
              <p className="text-xs text-slate-400">Give your campaign a name to begin</p>
            </div>

            <form onSubmit={handleCreateCampaign} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SaaS Founders Q3 Outreach"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-bold text-white shadow-lg shadow-brand-600/20"
                >
                  Create & Configure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
