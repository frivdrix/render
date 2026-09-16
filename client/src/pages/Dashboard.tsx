import React, { useEffect, useState } from 'react';
import {
  Send,
  MessageSquare,
  ShieldCheck,
  Zap,
  Mail,
  Play,
  Pause,
  ArrowUpRight,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { StatCard } from '../components/StatCard.js';
import { api } from '../services/api.js';
import { AnalyticsData, Campaign } from '../types/index.js';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingReplies, setSyncingReplies] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [analyticsRes, campaignsRes] = await Promise.all([
        api.getAnalytics(),
        api.getCampaigns(),
      ]);
      setData(analyticsRes);
      setCampaigns(campaignsRes);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleCampaign = async (campaign: Campaign) => {
    try {
      if (campaign.status === 'running') {
        await api.pauseCampaign(campaign.id);
      } else {
        await api.startCampaign(campaign.id);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleSyncReplies = async () => {
    setSyncingReplies(true);
    setSyncFeedback(null);
    try {
      const res = await api.syncReplies();
      setSyncFeedback(res.message);
      await loadData();
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to sync replies');
    } finally {
      setSyncingReplies(false);
    }
  };

  const handleResetStats = async () => {
    if (confirm('Are you sure you want to reset all dashboard metrics, outreach logs, and test data to ZERO (0)? Connected inboxes will not be removed.')) {
      setRefreshing(true);
      try {
        const res = await api.resetAllStats();
        alert(res.message);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Failed to reset statistics');
      } finally {
        setRefreshing(false);
      }
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex items-center gap-3 text-brand-400">
          <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full" />
          <span className="text-sm font-medium">Loading Deliverability Engine...</span>
        </div>
      </div>
    );
  }

  const { stats, accountStats } = data;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            Agency Outbound Command Center
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              100% Pure Plain Text • 0 Tracking
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Zero Tracking Pixels • Native Google Workspace Inbox Rotation • 99% Primary Tab Delivery
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {syncFeedback && (
            <span className="text-xs text-emerald-400 font-semibold animate-in fade-in bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
              {syncFeedback}
            </span>
          )}
          <button
            onClick={handleSyncReplies}
            disabled={syncingReplies}
            className="px-3.5 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center gap-2 transition"
            title="Scan connected inboxes for new prospect replies"
          >
            <MessageSquare className={`w-4 h-4 ${syncingReplies ? 'animate-spin' : ''}`} />
            <span>{syncingReplies ? 'Scanning...' : 'Sync Replies'}</span>
          </button>
          <button
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-400' : ''}`} />
          </button>
          <button
            onClick={handleResetStats}
            disabled={refreshing}
            className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Wipe test data and reset statistics to 0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Stats</span>
          </button>
          <Link
            to="/summary"
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 font-bold text-xs text-slate-200 flex items-center gap-2 transition"
          >
            <span>Daily Summary</span>
          </Link>
          <Link
            to="/campaigns"
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-xs text-white shadow-lg shadow-brand-500/20 flex items-center gap-2 transition"
          >
            <Zap className="w-4 h-4" />
            New Campaign
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Outbound Sent"
          value={stats.totalSent}
          subtitle={`Across ${stats.totalCampaigns} campaigns`}
          icon={Send}
          color="blue"
        />
        <StatCard
          title="Replies Received"
          value={stats.totalReplied}
          subtitle="Prospect responses detected"
          icon={MessageSquare}
          color="amber"
          trend="Positive"
          trendType="positive"
        />
        <StatCard
          title="Overall Reply Rate"
          value={stats.replyRate}
          subtitle="Pure Plain-Text deliverability"
          icon={Zap}
          color="purple"
          trend="Primary Tab"
          trendType="positive"
        />
        <StatCard
          title="Deliverability Shield"
          value="100%"
          subtitle="Zero Tracking Pixels • Native Inboxes"
          icon={ShieldCheck}
          color="green"
          trend="Protected"
          trendType="positive"
        />
      </div>

      {/* Main Grid: Campaigns & Inbox Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Campaigns Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-brand-400" />
              Active Campaigns
            </h2>
            <Link to="/campaigns" className="text-xs font-semibold text-brand-400 hover:underline flex items-center gap-1">
              View all ({campaigns.length}) <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center">
                <p className="text-slate-400 text-sm">No campaigns created yet.</p>
                <Link
                  to="/campaigns"
                  className="mt-3 inline-block px-4 py-2 rounded-xl bg-brand-600 text-xs font-bold text-white"
                >
                  Create First Campaign
                </Link>
              </div>
            ) : (
              campaigns.slice(0, 4).map((camp) => (
                <div
                  key={camp.id}
                  className="glass-card rounded-2xl p-4 transition-all duration-200 glass-card-hover flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <Link
                        to={`/campaigns/${camp.id}`}
                        className="text-sm font-bold text-white hover:text-brand-400 transition"
                      >
                        {camp.name}
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

                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>Leads: <b className="text-slate-200">{camp.stats.totalLeads}</b></span>
                      <span>Sent: <b className="text-slate-200">{camp.stats.sent}</b></span>
                      <span>
                        Replies: <b className="text-amber-400">{camp.stats.replied}</b>
                      </span>
                      <span>
                        Bounced: <b className="text-slate-400">{camp.stats.bounced}</b>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleCampaign(camp)}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
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
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Google Workspace Inboxes Breakdown (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-400" />
              Connected Inboxes ({accountStats.length})
            </h2>
            <Link to="/accounts" className="text-xs font-semibold text-brand-400 hover:underline">
              Manage
            </Link>
          </div>

          <div className="glass-card rounded-2xl p-4 space-y-3">
            {accountStats.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No sender accounts connected.</p>
            ) : (
              accountStats.map((acc) => {
                const percent = Math.min(100, Math.round((acc.sentToday / acc.dailyLimit) * 100));
                return (
                  <div key={acc.id} className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="truncate max-w-[170px]">
                        <p className="font-bold text-slate-200 truncate">{acc.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono truncate">{acc.email}</p>
                      </div>
                      <span className="font-semibold text-slate-300">
                        {acc.sentToday} / <span className="text-slate-500">{acc.dailyLimit}</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          percent >= 90 ? 'bg-amber-400' : 'bg-brand-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
