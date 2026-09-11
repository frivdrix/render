export interface GoogleAccount {
  id: string;
  email: string;
  name: string;
  authType: 'oauth' | 'app_password' | 'service_account';
  // OAuth credentials
  refreshToken?: string;
  accessToken?: string;
  tokenExpiry?: number;
  // App Password credentials
  smtpHost?: string;
  smtpPort?: number;
  appPassword?: string;
  // Service Account / Domain-Wide Delegation credentials
  domainId?: string;
  serviceAccountClientEmail?: string;
  serviceAccountPrivateKey?: string;
  // Deliverability and limits
  dailyLimit: number; // e.g. 40
  sentToday: number;
  lastResetDate: string; // YYYY-MM-DD
  minDelaySeconds: number; // e.g. 60
  lastSentAt?: number;
  status: 'active' | 'paused' | 'error' | 'warmup';
  errorMessage?: string;
  signature?: string;
  createdAt: number;
}

export interface WorkspaceDomain {
  id: string;
  domain: string;
  adminEmail: string;
  serviceAccountClientEmail: string;
  serviceAccountPrivateKey: string;
  serviceAccountClientId?: string;
  status: 'connected' | 'error';
  errorMessage?: string;
  lastSyncedAt?: number;
  inboxesCount: number;
  createdAt: number;
}

export interface Lead {
  id: string;
  campaignId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  customSubject?: string;
  customBody?: string;
  customFields?: Record<string, string>;
  status: 'pending' | 'queued' | 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'unsubscribed';
  sentAt?: number;
  sentFromAccountId?: string;
  sentSubject?: string;
  sentBody?: string;
  openCount: number;
  clickCount: number;
  lastOpenedAt?: number;
  lastClickedAt?: number;
  repliedAt?: number;
  errorMessage?: string;
  trackingToken: string;
  createdAt: number;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'scheduled';
  subject: string; // Supports Spintax and {{tags}}
  body: string; // Supports Spintax and {{tags}}
  accountIds: string[]; // Connected Google Workspace accounts for rotation
  settings: {
    trackOpens: boolean;
    trackClicks: boolean;
    plainTextMode: boolean; // Ultra safe mode
    addUnsubscribeLink: boolean;
    dailyLimitPerAccount: number;
    minJitterSeconds: number; // e.g. 60
    maxJitterSeconds: number; // e.g. 180
    sendWindowStart: string; // '09:00'
    sendWindowEnd: string; // '17:00'
    timezone: string; // 'America/New_York', 'UTC', etc.
    sendDays: number[]; // [1, 2, 3, 4, 5] (Mon-Fri)
    customTrackingDomain?: string;
  };
  stats: {
    totalLeads: number;
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface EmailLog {
  id: string;
  campaignId: string;
  leadId: string;
  accountId: string;
  toEmail: string;
  fromEmail: string;
  subject: string;
  bodyPreview: string;
  status: 'sent' | 'failed' | 'opened' | 'clicked' | 'replied' | 'bounced';
  sentAt: number;
  metadata?: Record<string, any>;
}

export interface TrackingEvent {
  id: string;
  campaignId: string;
  leadId: string;
  type: 'open' | 'click';
  ip?: string;
  userAgent?: string;
  targetUrl?: string;
  timestamp: number;
}

export interface SystemSettings {
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  appBaseUrl: string;
  trackingDomain?: string;
  globalDeliverabilitySafety: boolean;
}
