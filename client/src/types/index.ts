export interface GoogleAccount {
  id: string;
  email: string;
  name: string;
  authType: 'oauth' | 'app_password' | 'service_account';
  smtpHost?: string;
  smtpPort?: number;
  appPassword?: string;
  domainId?: string;
  dailyLimit: number;
  sentToday: number;
  lastResetDate: string;
  minDelaySeconds: number;
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
  subject: string;
  body: string;
  accountIds: string[];
  settings: {
    trackOpens: boolean;
    trackClicks: boolean;
    plainTextMode: boolean;
    addUnsubscribeLink: boolean;
    dailyLimitPerAccount: number;
    minJitterSeconds: number;
    maxJitterSeconds: number;
    sendWindowStart: string;
    sendWindowEnd: string;
    timezone: string;
    sendDays: number[];
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

export interface AnalyticsData {
  stats: {
    totalLeads: number;
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    totalReplied: number;
    totalBounced: number;
    openRate: string;
    clickRate: string;
    replyRate: string;
    bounceRate: string;
    healthScore: number;
    activeAccounts: number;
    totalCampaigns: number;
    runningCampaigns: number;
  };
  accountStats: {
    id: string;
    email: string;
    name: string;
    dailyLimit: number;
    sentToday: number;
    totalSent: number;
    status: string;
  }[];
  recentActivities: {
    id: string;
    type: 'open' | 'click';
    email: string;
    campaignName: string;
    timestamp: number;
  }[];
  recentLogs: any[];
}

export interface SystemSettings {
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  appBaseUrl: string;
  trackingDomain?: string;
  globalDeliverabilitySafety: boolean;
}

export interface SpamAnalysis {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  issues: string[];
  recommendations: string[];
}

export interface DaySummaryLog {
  id: string;
  toEmail: string;
  fromEmail: string;
  campaignName: string;
  subject: string;
  status: string;
  sentAt: number;
}

export interface DaySummaryItem {
  date: string;
  displayDate: string;
  dayNumber: number;
  sentCount: number;
  repliedCount: number;
  replyRate: string;
  bouncedCount: number;
  bounceRate: string;
  inboxCounts: Record<string, number>;
  campaignCounts: Record<string, number>;
  totalInboxesUsed: number;
  logs: DaySummaryLog[];
}

export interface DailySummaryData {
  success: boolean;
  today: DaySummaryItem;
  totalDaysActive: number;
  days: DaySummaryItem[];
}

