import fs from 'fs';
import path from 'path';
import { MongoClient, Db } from 'mongodb';
import { GoogleAccount, WorkspaceDomain, Campaign, Lead, EmailLog, TrackingEvent, SystemSettings } from '../types/index.js';

interface DatabaseSchema {
  accounts: GoogleAccount[];
  domains: WorkspaceDomain[];
  campaigns: Campaign[];
  leads: Lead[];
  logs: EmailLog[];
  trackingEvents: TrackingEvent[];
  settings: SystemSettings;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const defaultSettings: SystemSettings = {
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/accounts/oauth/callback',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5000',
  trackingDomain: '',
  globalDeliverabilitySafety: true,
};

class Database {
  private data: DatabaseSchema = {
    accounts: [],
    domains: [],
    campaigns: [],
    leads: [],
    logs: [],
    trackingEvents: [],
    settings: defaultSettings,
  };

  private mongoClient: MongoClient | null = null;
  private mongoDb: Db | null = null;
  private isMongoConnected = false;

  constructor() {
    this.init();
  }

  private async init() {
    // 1. Initialize local disk cache
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        this.data = {
          accounts: parsed.accounts || [],
          domains: parsed.domains || [],
          campaigns: parsed.campaigns || [],
          leads: parsed.leads || [],
          logs: parsed.logs || [],
          trackingEvents: parsed.trackingEvents || [],
          settings: { ...defaultSettings, ...(parsed.settings || {}) },
        };
      } else {
        this.saveLocal();
      }
    } catch (err) {
      console.error('Error initializing local database:', err);
    }

    // 2. Connect to MongoDB Atlas if MONGODB_URI is provided
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri) {
      try {
        console.log('[Database] Connecting to MongoDB Atlas Cloud...');
        this.mongoClient = new MongoClient(mongoUri);
        await this.mongoClient.connect();
        this.mongoDb = this.mongoClient.db('nexus_cold_crm');
        this.isMongoConnected = true;
        console.log('✅ [Database] MongoDB Atlas Connected Successfully!');

        // Pull remote cloud data
        await this.loadFromMongo();
      } catch (err) {
        console.error('❌ [Database] MongoDB connection failed, falling back to local storage:', err);
      }
    }
  }

  private async loadFromMongo() {
    if (!this.mongoDb) return;
    try {
      const accounts = await this.mongoDb.collection<GoogleAccount>('accounts').find().toArray();
      const domains = await this.mongoDb.collection<WorkspaceDomain>('domains').find().toArray();
      const campaigns = await this.mongoDb.collection<Campaign>('campaigns').find().toArray();
      const leads = await this.mongoDb.collection<Lead>('leads').find().toArray();
      const logs = await this.mongoDb.collection<EmailLog>('logs').find().sort({ sentAt: -1 }).limit(5000).toArray();
      const settingsDoc = await this.mongoDb.collection('settings').findOne({ id: 'main' });

      if (accounts.length > 0 || campaigns.length > 0 || leads.length > 0) {
        this.data.accounts = accounts;
        this.data.domains = domains;
        this.data.campaigns = campaigns;
        this.data.leads = leads;
        this.data.logs = logs;
        if (settingsDoc && (settingsDoc as any).settings) {
          this.data.settings = { ...defaultSettings, ...(settingsDoc as any).settings };
        }
        this.saveLocal();
        console.log(`[Database] Loaded ${accounts.length} inboxes, ${campaigns.length} campaigns, ${leads.length} leads from MongoDB.`);
      } else {
        // Initial sync to Mongo if Mongo is brand new
        await this.saveMongoAll();
      }
    } catch (err) {
      console.error('[Database] Failed to load from MongoDB:', err);
    }
  }

  public save() {
    this.saveLocal();
    if (this.isMongoConnected) {
      this.saveMongoAll().catch((err) => console.error('[Database] Async Mongo Save Error:', err));
    }
  }

  private saveLocal() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Error saving local database to file:', err);
    }
  }

  private async saveMongoAll() {
    if (!this.mongoDb) return;
    try {
      // Upsert full state to MongoDB collections
      const bulkOpsAccounts = this.data.accounts.map((a) => ({
        replaceOne: { filter: { id: a.id }, replacement: a, upsert: true },
      }));
      if (bulkOpsAccounts.length > 0) await this.mongoDb.collection('accounts').bulkWrite(bulkOpsAccounts);

      const bulkOpsCampaigns = this.data.campaigns.map((c) => ({
        replaceOne: { filter: { id: c.id }, replacement: c, upsert: true },
      }));
      if (bulkOpsCampaigns.length > 0) await this.mongoDb.collection('campaigns').bulkWrite(bulkOpsCampaigns);

      const bulkOpsLeads = this.data.leads.map((l) => ({
        replaceOne: { filter: { id: l.id }, replacement: l, upsert: true },
      }));
      if (bulkOpsLeads.length > 0) await this.mongoDb.collection('leads').bulkWrite(bulkOpsLeads);

      await this.mongoDb.collection('settings').replaceOne({ id: 'main' }, { id: 'main', settings: this.data.settings }, { upsert: true });
    } catch (err) {
      console.error('[Database] Error syncing to MongoDB:', err);
    }
  }

  // ACCOUNTS
  public getAccounts(): GoogleAccount[] {
    return this.data.accounts;
  }

  public getAccountById(id: string): GoogleAccount | undefined {
    return this.data.accounts.find((a) => a.id === id);
  }

  public saveAccount(account: GoogleAccount): GoogleAccount {
    const idx = this.data.accounts.findIndex((a) => a.id === account.id);
    if (idx >= 0) {
      this.data.accounts[idx] = account;
    } else {
      this.data.accounts.push(account);
    }
    this.save();
    return account;
  }

  public saveAccountsBulk(accounts: GoogleAccount[]): void {
    for (const acc of accounts) {
      const idx = this.data.accounts.findIndex((a) => a.id === acc.id || a.email.toLowerCase() === acc.email.toLowerCase());
      if (idx >= 0) {
        this.data.accounts[idx] = { ...this.data.accounts[idx], ...acc };
      } else {
        this.data.accounts.push(acc);
      }
    }
    this.save();
  }

  public deleteAccount(id: string): boolean {
    const initialLen = this.data.accounts.length;
    this.data.accounts = this.data.accounts.filter((a) => a.id !== id);
    this.save();
    return this.data.accounts.length !== initialLen;
  }

  // WORKSPACE DOMAINS (Domain-Wide Delegation)
  public getDomains(): WorkspaceDomain[] {
    return this.data.domains || [];
  }

  public getDomainById(id: string): WorkspaceDomain | undefined {
    return this.data.domains?.find((d) => d.id === id);
  }

  public saveDomain(domain: WorkspaceDomain): WorkspaceDomain {
    if (!this.data.domains) this.data.domains = [];
    const idx = this.data.domains.findIndex((d) => d.id === domain.id);
    if (idx >= 0) {
      this.data.domains[idx] = domain;
    } else {
      this.data.domains.push(domain);
    }
    this.save();
    return domain;
  }

  public deleteDomain(id: string): boolean {
    if (!this.data.domains) return false;
    const initialLen = this.data.domains.length;
    this.data.domains = this.data.domains.filter((d) => d.id !== id);
    this.data.accounts = this.data.accounts.filter((a) => a.domainId !== id);
    this.save();
    return this.data.domains.length !== initialLen;
  }

  // CAMPAIGNS
  public getCampaigns(): Campaign[] {
    return this.data.campaigns;
  }

  public getCampaignById(id: string): Campaign | undefined {
    return this.data.campaigns.find((c) => c.id === id);
  }

  public saveCampaign(campaign: Campaign): Campaign {
    const idx = this.data.campaigns.findIndex((c) => c.id === campaign.id);
    if (idx >= 0) {
      this.data.campaigns[idx] = campaign;
    } else {
      this.data.campaigns.push(campaign);
    }
    this.save();
    return campaign;
  }

  public deleteCampaign(id: string): boolean {
    this.data.campaigns = this.data.campaigns.filter((c) => c.id !== id);
    // Keep logs and already sent/replied leads permanently so Daily Summary and reply rates are never lost!
    // Only remove un-sent / pending leads from this deleted campaign
    this.data.leads = this.data.leads.filter(
      (l) => l.campaignId !== id || l.status === 'sent' || l.status === 'replied' || l.status === 'bounced'
    );
    // IMPORTANT: Logs (this.data.logs) are NEVER deleted, preserving 100% permanent history.
    this.save();
    return true;
  }

  // LEADS
  public getLeads(campaignId?: string): Lead[] {
    if (campaignId) {
      return this.data.leads.filter((l) => l.campaignId === campaignId);
    }
    return this.data.leads;
  }

  public getLeadById(id: string): Lead | undefined {
    return this.data.leads.find((l) => l.id === id);
  }

  public getLeadByToken(token: string): Lead | undefined {
    return this.data.leads.find((l) => l.trackingToken === token);
  }

  public saveLead(lead: Lead): Lead {
    const idx = this.data.leads.findIndex((l) => l.id === lead.id);
    if (idx >= 0) {
      this.data.leads[idx] = lead;
    } else {
      this.data.leads.push(lead);
    }
    this.save();
    return lead;
  }

  public saveLeadsBulk(leads: Lead[]): void {
    for (const lead of leads) {
      const idx = this.data.leads.findIndex((l) => l.id === lead.id);
      if (idx >= 0) {
        this.data.leads[idx] = lead;
      } else {
        this.data.leads.push(lead);
      }
    }
    this.save();
  }

  public deleteLeadsByCampaign(campaignId: string): void {
    this.data.leads = this.data.leads.filter((l) => l.campaignId !== campaignId);
    this.save();
  }

  // LOGS
  public getLogs(campaignId?: string): EmailLog[] {
    if (campaignId) {
      return this.data.logs.filter((l) => l.campaignId === campaignId);
    }
    return this.data.logs;
  }

  public addLog(log: EmailLog): void {
    this.data.logs.unshift(log); // recent first
    if (this.data.logs.length > 5000) {
      this.data.logs = this.data.logs.slice(0, 5000);
    }
    this.save();
  }

  public updateLogReply(leadIdOrToEmail: string, repliedAt: number): void {
    const norm = leadIdOrToEmail.trim().toLowerCase();
    let updated = false;
    for (const log of this.data.logs) {
      if (log.leadId === leadIdOrToEmail || log.toEmail.trim().toLowerCase() === norm) {
        log.status = 'replied';
        log.repliedAt = repliedAt;
        updated = true;
      }
    }
    if (updated) {
      this.save();
    }
  }

  // TRACKING EVENTS
  public addTrackingEvent(event: TrackingEvent): void {
    this.data.trackingEvents.unshift(event);
    if (this.data.trackingEvents.length > 10000) {
      this.data.trackingEvents = this.data.trackingEvents.slice(0, 10000);
    }
    this.save();
  }

  public getTrackingEvents(campaignId?: string): TrackingEvent[] {
    if (campaignId) {
      return this.data.trackingEvents.filter((e) => e.campaignId === campaignId);
    }
    return this.data.trackingEvents;
  }

  // SETTINGS
  public getSettings(): SystemSettings {
    return this.data.settings;
  }

  public updateSettings(settings: Partial<SystemSettings>): SystemSettings {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
    return this.data.settings;
  }
}

export const db = new Database();
