import React, { useEffect, useState } from 'react';
import {
  Search,
  Eye,
  Trash2,
  Send,
} from 'lucide-react';
import { api } from '../services/api.js';
import { Lead, Campaign } from '../types/index.js';

export const LeadsView: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');

  const loadLeads = async () => {
    try {
      const [leadsData, campaignsData] = await Promise.all([
        api.getLeads(),
        api.getCampaigns(),
      ]);
      setLeads(leadsData);
      setCampaigns(campaignsData);
    } catch (err) {
      console.error('Failed to load leads', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const handleDeleteLead = async (id: string) => {
    if (confirm('Delete this lead?')) {
      await api.deleteLead(id);
      loadLeads();
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.firstName && lead.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesCampaign = campaignFilter === 'all' || lead.campaignId === campaignFilter;

    return matchesSearch && matchesStatus && matchesCampaign;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            Master Lead Database
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30 font-bold">
              {filteredLeads.length} Leads
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global view of all prospect emails, delivery states, and open activity.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search leads by email, name, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="opened">Opened</option>
            <option value="clicked">Clicked</option>
            <option value="replied">Replied</option>
            <option value="bounced">Bounced</option>
          </select>

          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading leads...</div>
      ) : filteredLeads.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-400 text-xs">
          No leads found matching your search filters.
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Company</th>
                  <th className="p-3.5">Campaign</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Activity</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLeads.map((lead) => {
                  const camp = campaigns.find((c) => c.id === lead.campaignId);
                  return (
                    <tr key={lead.id} className="hover:bg-slate-800/30 transition font-mono">
                      <td className="p-3.5 font-bold text-slate-200">{lead.email}</td>
                      <td className="p-3.5 text-slate-300">
                        {lead.firstName ? `${lead.firstName} ${lead.lastName || ''}`.trim() : '—'}
                      </td>
                      <td className="p-3.5 text-slate-300">{lead.company || '—'}</td>
                      <td className="p-3.5 text-slate-400 font-sans">{camp?.name || '—'}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider ${
                            lead.status === 'opened'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : lead.status === 'replied'
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
                      <td className="p-3.5 text-slate-400 font-sans">
                        {lead.openCount > 0 ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {lead.openCount} opens
                          </span>
                        ) : lead.sentAt ? (
                          <span className="text-slate-400 flex items-center gap-1">
                            <Send className="w-3.5 h-3.5 text-brand-400" />
                            Sent
                          </span>
                        ) : (
                          <span className="text-slate-500">Unsent</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
