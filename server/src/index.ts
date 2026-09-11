import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import accountsRoutes from './routes/accounts.routes.js';
import campaignsRoutes from './routes/campaigns.routes.js';
import leadsRoutes from './routes/leads.routes.js';
import trackingRoutes from './routes/tracking.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import { QueueService } from './services/queue.service.js';
import { db } from './database/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and rich JSON parsing (supports large pasted Excel spreadsheets)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});
app.get('/api/health', (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API Routes
app.use('/api/accounts', accountsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);

// Tracking Endpoints (Open pixel & Click redirects)
app.use('/t', trackingRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

// Start Background Campaign Queue Engine
QueueService.start();

// Seed initial sample data if completely empty so user has an out-of-the-box working experience
function seedDemoDataIfEmpty() {
  const accounts = db.getAccounts();
  const campaigns = db.getCampaigns();

  if (accounts.length === 0 && campaigns.length === 0) {
    console.log('[Database] Seeding initial demo Google Workspace accounts and campaign...');
    
    const demoAccount1 = {
      id: 'acc_demo_1',
      email: 'aryan.growth@mycompany.co',
      name: 'Aryan Sharma',
      authType: 'app_password' as const,
      appPassword: 'abcd efgh ijkl mnop',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 465,
      dailyLimit: 40,
      sentToday: 12,
      lastResetDate: new Date().toISOString().slice(0, 10),
      minDelaySeconds: 90,
      status: 'active' as const,
      signature: 'Best regards,\nAryan Sharma\nFounder & CEO',
      createdAt: Date.now() - 86400000 * 5,
    };

    const demoAccount2 = {
      id: 'acc_demo_2',
      email: 'outreach@sales-mycompany.com',
      name: 'Sales Team',
      authType: 'app_password' as const,
      appPassword: 'wxyz efgh ijkl mnop',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 465,
      dailyLimit: 40,
      sentToday: 8,
      lastResetDate: new Date().toISOString().slice(0, 10),
      minDelaySeconds: 120,
      status: 'active' as const,
      signature: 'Warmly,\nPartnerships Team',
      createdAt: Date.now() - 86400000 * 3,
    };

    db.saveAccount(demoAccount1);
    db.saveAccount(demoAccount2);

    const demoCampaign = {
      id: 'camp_q3_outreach',
      name: 'Q3 B2B Growth Outreach',
      status: 'paused' as const,
      subject: '{Quick question regarding|Reaching out about} {{company | your company}}',
      body: 'Hi {{firstName | there}},\n\n{Noticed what you are building at|Came across} {{company | your team}} and was really impressed by your recent growth.\n\nWe helped teams scale their pipeline by 3.4x using automated cold inbox rotation.\n\nWould you be open to a 5-min chat this Thursday?\n\nBest,\nAryan',
      accountIds: ['acc_demo_1', 'acc_demo_2'],
      settings: {
        trackOpens: true,
        trackClicks: true,
        plainTextMode: false,
        addUnsubscribeLink: true,
        dailyLimitPerAccount: 40,
        minJitterSeconds: 60,
        maxJitterSeconds: 180,
        sendWindowStart: '09:00',
        sendWindowEnd: '17:00',
        timezone: 'America/New_York',
        sendDays: [1, 2, 3, 4, 5],
      },
      stats: {
        totalLeads: 4,
        sent: 2,
        opened: 2,
        clicked: 1,
        replied: 1,
        bounced: 0,
      },
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now(),
    };

    db.saveCampaign(demoCampaign);

    const demoLeads = [
      {
        id: 'lead_1',
        campaignId: 'camp_q3_outreach',
        email: 'sarah.connor@cyberdyne.tech',
        firstName: 'Sarah',
        lastName: 'Connor',
        company: 'Cyberdyne Systems',
        status: 'opened' as const,
        openCount: 3,
        clickCount: 1,
        sentAt: Date.now() - 3600000 * 4,
        sentFromAccountId: 'acc_demo_1',
        sentSubject: 'Quick question regarding Cyberdyne Systems',
        sentBody: 'Hi Sarah,\n\nNoticed what you are building at Cyberdyne Systems and was really impressed by your recent growth.\n\nWe helped teams scale their pipeline by 3.4x using automated cold inbox rotation.\n\nWould you be open to a 5-min chat this Thursday?\n\nBest,\nAryan',
        trackingToken: 'tok_demo_lead_1',
        createdAt: Date.now() - 86400000 * 2,
      },
      {
        id: 'lead_2',
        campaignId: 'camp_q3_outreach',
        email: 'elon.t@xtech-labs.io',
        firstName: 'Elon',
        company: 'XTech Labs',
        status: 'replied' as const,
        openCount: 2,
        clickCount: 0,
        sentAt: Date.now() - 3600000 * 6,
        sentFromAccountId: 'acc_demo_2',
        sentSubject: 'Reaching out about XTech Labs',
        sentBody: 'Hi Elon,\n\nCame across XTech Labs and was really impressed by your recent growth.\n\nWould you be open to a 5-min chat this Thursday?',
        trackingToken: 'tok_demo_lead_2',
        createdAt: Date.now() - 86400000 * 2,
      },
      {
        id: 'lead_3',
        campaignId: 'camp_q3_outreach',
        email: 'priya.sharma@innovate-corp.com',
        firstName: 'Priya',
        lastName: 'Sharma',
        company: 'InnovateCorp',
        status: 'pending' as const,
        openCount: 0,
        clickCount: 0,
        trackingToken: 'tok_demo_lead_3',
        createdAt: Date.now() - 86400000 * 2,
      },
      {
        id: 'lead_4',
        campaignId: 'camp_q3_outreach',
        email: 'marcus.v@acme-ventures.co',
        firstName: 'Marcus',
        company: 'Acme Ventures',
        status: 'pending' as const,
        openCount: 0,
        clickCount: 0,
        trackingToken: 'tok_demo_lead_4',
        createdAt: Date.now() - 86400000 * 2,
      },
    ];

    db.saveLeadsBulk(demoLeads);
  }
}

seedDemoDataIfEmpty();

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 NexusSend Cold Email CRM Backend is live on port ${PORT}`);
  console.log(`📡 Tracking Base URL: http://localhost:${PORT}/t`);
  console.log(`====================================================`);
});
