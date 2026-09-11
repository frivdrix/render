import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { Campaign, Lead } from '../types/index.js';
import { SpintaxService } from '../services/spintax.service.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET all campaigns
router.get('/', (_req: Request, res: Response) => {
  const campaigns = db.getCampaigns();
  // Recalculate lead counts live
  const enriched = campaigns.map((c) => {
    const leads = db.getLeads(c.id);
    const sent = leads.filter((l) => l.status === 'sent' || l.status === 'opened' || l.status === 'clicked' || l.status === 'replied').length;
    const opened = leads.filter((l) => l.status === 'opened' || l.openCount > 0).length;
    const clicked = leads.filter((l) => l.status === 'clicked' || l.clickCount > 0).length;
    const replied = leads.filter((l) => l.status === 'replied').length;
    const bounced = leads.filter((l) => l.status === 'bounced').length;

    return {
      ...c,
      stats: {
        totalLeads: leads.length,
        sent,
        opened,
        clicked,
        replied,
        bounced,
      },
    };
  });

  res.json({ success: true, campaigns: enriched });
});

// GET single campaign
router.get('/:id', (req: Request, res: Response) => {
  const campaign = db.getCampaignById(req.params.id);
  if (!campaign) {
    return res.status(404).json({ success: false, error: 'Campaign not found' });
  }

  const leads = db.getLeads(campaign.id);
  const sent = leads.filter((l) => l.status === 'sent' || l.status === 'opened' || l.status === 'clicked' || l.status === 'replied').length;
  const opened = leads.filter((l) => l.status === 'opened' || l.openCount > 0).length;
  const clicked = leads.filter((l) => l.status === 'clicked' || l.clickCount > 0).length;
  const replied = leads.filter((l) => l.status === 'replied').length;
  const bounced = leads.filter((l) => l.status === 'bounced').length;

  res.json({
    success: true,
    campaign: {
      ...campaign,
      stats: {
        totalLeads: leads.length,
        sent,
        opened,
        clicked,
        replied,
        bounced,
      },
    },
  });
});

// POST create campaign
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, subject, body, accountIds, settings } = req.body;

    const newCampaign: Campaign = {
      id: uuidv4(),
      name: name?.trim() || `Campaign ${new Date().toLocaleDateString()}`,
      status: 'draft',
      subject: subject || '{Quick question|Reaching out} {{firstName | there}}',
      body: body || 'Hi {{firstName | there}},\n\nWanted to quickly check in regarding {{company | your company}}...\n\nBest,\nYour Name',
      accountIds: accountIds || [],
      settings: {
        trackOpens: settings?.trackOpens ?? true,
        trackClicks: settings?.trackClicks ?? true,
        plainTextMode: settings?.plainTextMode ?? false,
        addUnsubscribeLink: settings?.addUnsubscribeLink ?? false,
        dailyLimitPerAccount: settings?.dailyLimitPerAccount ?? 40,
        minJitterSeconds: settings?.minJitterSeconds ?? 60,
        maxJitterSeconds: settings?.maxJitterSeconds ?? 180,
        sendWindowStart: settings?.sendWindowStart ?? '09:00',
        sendWindowEnd: settings?.sendWindowEnd ?? '17:00',
        timezone: settings?.timezone ?? 'America/New_York',
        sendDays: settings?.sendDays ?? [1, 2, 3, 4, 5],
        customTrackingDomain: settings?.customTrackingDomain || '',
      },
      stats: {
        totalLeads: 0,
        sent: 0,
        opened: 0,
        clicked: 0,
        replied: 0,
        bounced: 0,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    db.saveCampaign(newCampaign);
    res.json({ success: true, campaign: newCampaign });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update campaign
router.put('/:id', (req: Request, res: Response) => {
  try {
    const campaign = db.getCampaignById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const { name, subject, body, accountIds, settings, status } = req.body;

    if (name !== undefined) campaign.name = name;
    if (subject !== undefined) campaign.subject = subject;
    if (body !== undefined) campaign.body = body;
    if (accountIds !== undefined) campaign.accountIds = accountIds;
    if (status !== undefined) campaign.status = status;
    if (settings) {
      campaign.settings = { ...campaign.settings, ...settings };
    }
    campaign.updatedAt = Date.now();

    db.saveCampaign(campaign);
    res.json({ success: true, campaign });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE campaign
router.delete('/:id', (req: Request, res: Response) => {
  const success = db.deleteCampaign(req.params.id);
  res.json({ success });
});

// POST start/resume campaign
router.post('/:id/start', (req: Request, res: Response) => {
  const campaign = db.getCampaignById(req.params.id);
  if (!campaign) {
    return res.status(404).json({ success: false, error: 'Campaign not found' });
  }

  const leads = db.getLeads(campaign.id);
  const pendingLeads = leads.filter((l) => l.status === 'pending');

  if (pendingLeads.length === 0) {
    return res.status(400).json({ success: false, error: 'No pending leads in this campaign to send.' });
  }

  if (campaign.accountIds.length === 0) {
    return res.status(400).json({ success: false, error: 'Please assign at least one sender Google Workspace account to this campaign.' });
  }

  campaign.status = 'running';
  campaign.updatedAt = Date.now();
  db.saveCampaign(campaign);

  res.json({ success: true, campaign, message: `Campaign "${campaign.name}" started with ${pendingLeads.length} leads in queue!` });
});

// POST pause campaign
router.post('/:id/pause', (req: Request, res: Response) => {
  const campaign = db.getCampaignById(req.params.id);
  if (!campaign) {
    return res.status(404).json({ success: false, error: 'Campaign not found' });
  }

  campaign.status = 'paused';
  campaign.updatedAt = Date.now();
  db.saveCampaign(campaign);

  res.json({ success: true, campaign, message: `Campaign "${campaign.name}" is now paused.` });
});

// POST analyze deliverability score
router.post('/analyze-spam', (req: Request, res: Response) => {
  const { subject, body } = req.body;
  const analysis = SpintaxService.analyzeDeliverability(subject || '', body || '');
  res.json({ success: true, analysis });
});

// POST live preview generation
router.post('/:id/preview', (req: Request, res: Response) => {
  const campaign = db.getCampaignById(req.params.id);
  const { subject, body, sampleLead } = req.body;

  const leadToUse: Partial<Lead> = sampleLead || {
    firstName: 'Alex',
    lastName: 'Johnson',
    company: 'Acme Corp',
    email: 'alex@acme.org',
  };

  const templateSubject = subject || campaign?.subject || '';
  const templateBody = body || campaign?.body || '';

  const variations = [];
  for (let i = 0; i < 3; i++) {
    variations.push({
      iteration: i + 1,
      subject: SpintaxService.processText(templateSubject, leadToUse),
      body: SpintaxService.processText(templateBody, leadToUse),
    });
  }

  const analysis = SpintaxService.analyzeDeliverability(templateSubject, templateBody);

  res.json({
    success: true,
    variations,
    analysis,
  });
});

export default router;
