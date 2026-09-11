import { GoogleAccount, WorkspaceDomain, Campaign, Lead, AnalyticsData, SystemSettings, SpamAnalysis } from '../types/index.js';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_BASE = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';


export const api = {
  // Accounts
  async getAccounts(): Promise<GoogleAccount[]> {
    const res = await fetch(`${API_BASE}/accounts`);
    const data = await res.json();
    return data.accounts || [];
  },

  async addAccount(accountData: Partial<GoogleAccount>): Promise<GoogleAccount> {
    const res = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accountData),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to add account');
    return data.account;
  },

  async updateAccount(id: string, updates: Partial<GoogleAccount>): Promise<GoogleAccount> {
    const res = await fetch(`${API_BASE}/accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update account');
    return data.account;
  },

  async deleteAccount(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/accounts/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  },

  async testSend(id: string, targetEmail: string): Promise<string> {
    const res = await fetch(`${API_BASE}/accounts/${id}/test-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetEmail }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Test email failed');
    return data.message;
  },

  async resetAccountLimit(id: string): Promise<void> {
    await fetch(`${API_BASE}/accounts/${id}/reset-limit`, { method: 'POST' });
  },

  async getOAuthUrl(): Promise<string> {
    const res = await fetch(`${API_BASE}/accounts/oauth/url`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to get OAuth URL');
    return data.url;
  },

  // Workspace Domain-Wide 1-Click Sync
  async getWorkspaceDomains(): Promise<WorkspaceDomain[]> {
    const res = await fetch(`${API_BASE}/accounts/domains`);
    const data = await res.json();
    return data.domains || [];
  },

  async syncWorkspaceDomain(payload: {
    keyJson?: string | object;
    adminEmail: string;
    clientEmail?: string;
    privateKey?: string;
    clientId?: string;
    domain?: string;
    dailyLimit?: number;
    manualEmails?: string;
  }) {
    const res = await fetch(`${API_BASE}/accounts/workspace/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to sync Google Workspace inboxes');
    return data;
  },

  async deleteWorkspaceDomain(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/accounts/domains/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  },

  async bulkImportAccounts(rawText: string, defaultLimit = 40) {
    const res = await fetch(`${API_BASE}/accounts/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText, defaultLimit }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to bulk import accounts');
    return data;
  },

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    const res = await fetch(`${API_BASE}/campaigns`);
    const data = await res.json();
    return data.campaigns || [];
  },

  async getCampaign(id: string): Promise<Campaign> {
    const res = await fetch(`${API_BASE}/campaigns/${id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Campaign not found');
    return data.campaign;
  },

  async createCampaign(campaignData: Partial<Campaign>): Promise<Campaign> {
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaignData),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create campaign');
    return data.campaign;
  },

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    const res = await fetch(`${API_BASE}/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update campaign');
    return data.campaign;
  },

  async deleteCampaign(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/campaigns/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  },

  async startCampaign(id: string): Promise<string> {
    const res = await fetch(`${API_BASE}/campaigns/${id}/start`, { method: 'POST' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to start campaign');
    return data.message;
  },

  async pauseCampaign(id: string): Promise<string> {
    const res = await fetch(`${API_BASE}/campaigns/${id}/pause`, { method: 'POST' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to pause campaign');
    return data.message;
  },

  async analyzeSpam(subject: string, body: string): Promise<SpamAnalysis> {
    const res = await fetch(`${API_BASE}/campaigns/analyze-spam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body }),
    });
    const data = await res.json();
    return data.analysis;
  },

  async previewCampaign(id: string, subject: string, body: string, sampleLead?: Partial<Lead>) {
    const res = await fetch(`${API_BASE}/campaigns/${id}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body, sampleLead }),
    });
    return await res.json();
  },

  // Leads
  async getLeads(campaignId?: string, status?: string): Promise<Lead[]> {
    const params = new URLSearchParams();
    if (campaignId) params.append('campaignId', campaignId);
    if (status) params.append('status', status);

    const res = await fetch(`${API_BASE}/leads?${params.toString()}`);
    const data = await res.json();
    return data.leads || [];
  },

  async pasteLeads(campaignId: string, rawText: string) {
    const res = await fetch(`${API_BASE}/leads/paste`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, rawText }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to parse leads');
    return data;
  },

  async uploadLeadsFile(campaignId: string, file: File) {
    const formData = new FormData();
    formData.append('campaignId', campaignId);
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/leads/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to upload spreadsheet');
    return data;
  },

  async deleteLead(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/leads/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  },

  async clearCampaignLeads(campaignId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/leads/campaign/${campaignId}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  },

  // Analytics
  async getAnalytics(): Promise<AnalyticsData> {
    const res = await fetch(`${API_BASE}/analytics/overview`);
    const data = await res.json();
    return data;
  },

  async getDailySummary(): Promise<{ success: boolean; today: any; totalDaysActive: number; days: any[] }> {
    const res = await fetch(`${API_BASE}/analytics/daily`);
    const data = await res.json();
    return data;
  },

  // Settings
  async getSettings(): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    const data = await res.json();
    return data.settings;
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    return data.settings;
  },
};

