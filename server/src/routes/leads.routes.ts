import { Router, Request, Response } from 'express';
import multer from 'multer';
import { db } from '../database/db.js';
import { ExcelService } from '../services/excel.service.js';
import { Lead } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// GET leads
router.get('/', (req: Request, res: Response) => {
  const campaignId = req.query.campaignId as string;
  const status = req.query.status as string;

  let leads = db.getLeads(campaignId);
  if (status) {
    leads = leads.filter((l) => l.status === status);
  }

  res.json({ success: true, leads, total: leads.length });
});

// POST paste raw TSV / CSV / Excel text
router.post('/paste', (req: Request, res: Response) => {
  try {
    const { rawText, campaignId } = req.body;

    if (!campaignId) {
      return res.status(400).json({ success: false, error: 'Campaign ID is required.' });
    }

    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ success: false, error: 'Pasted text cannot be empty.' });
    }

    const parseResult = ExcelService.parsePastedText(rawText, campaignId);

    if (parseResult.leads.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid leads with email addresses were found in the pasted data. Make sure an "email" column is present.',
      });
    }

    db.saveLeadsBulk(parseResult.leads);

    // Update campaign stats
    const campaign = db.getCampaignById(campaignId);
    if (campaign) {
      campaign.stats.totalLeads = db.getLeads(campaignId).length;
      campaign.updatedAt = Date.now();
      db.saveCampaign(campaign);
    }

    res.json({
      success: true,
      importedCount: parseResult.leads.length,
      detectedColumns: parseResult.detectedColumns,
      invalidCount: parseResult.invalidCount,
      leads: parseResult.leads,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to parse pasted data' });
  }
});

// POST upload file (.xlsx, .xls, .csv)
router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    const campaignId = req.body.campaignId;
    if (!campaignId) {
      return res.status(400).json({ success: false, error: 'Campaign ID is required.' });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const parseResult = ExcelService.parseFileBuffer(req.file.buffer, campaignId);

    if (parseResult.leads.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid email rows detected in spreadsheet. Please verify headers.',
      });
    }

    db.saveLeadsBulk(parseResult.leads);

    // Update campaign stats
    const campaign = db.getCampaignById(campaignId);
    if (campaign) {
      campaign.stats.totalLeads = db.getLeads(campaignId).length;
      campaign.updatedAt = Date.now();
      db.saveCampaign(campaign);
    }

    res.json({
      success: true,
      importedCount: parseResult.leads.length,
      detectedColumns: parseResult.detectedColumns,
      invalidCount: parseResult.invalidCount,
      leads: parseResult.leads,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to parse spreadsheet file' });
  }
});

// POST single lead manually
router.post('/', (req: Request, res: Response) => {
  try {
    const { campaignId, email, firstName, lastName, company, customSubject, customBody, customFields } = req.body;

    if (!campaignId || !email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid campaign ID and email required' });
    }

    const lead: Lead = {
      id: uuidv4(),
      campaignId,
      email: email.trim().toLowerCase(),
      firstName: firstName?.trim(),
      lastName: lastName?.trim(),
      company: company?.trim(),
      customSubject: customSubject?.trim(),
      customBody: customBody?.trim(),
      customFields,
      status: 'pending',
      openCount: 0,
      clickCount: 0,
      trackingToken: `${uuidv4().replace(/-/g, '')}`,
      createdAt: Date.now(),
    };

    db.saveLead(lead);

    const campaign = db.getCampaignById(campaignId);
    if (campaign) {
      campaign.stats.totalLeads = db.getLeads(campaignId).length;
      db.saveCampaign(campaign);
    }

    res.json({ success: true, lead });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE single lead
router.delete('/:id', (req: Request, res: Response) => {
  const lead = db.getLeadById(req.params.id);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }

  const campaignId = lead.campaignId;
  const initialLeads = db.getLeads();
  const filtered = initialLeads.filter((l) => l.id !== req.params.id);
  db.saveLeadsBulk(filtered);

  const campaign = db.getCampaignById(campaignId);
  if (campaign) {
    campaign.stats.totalLeads = db.getLeads(campaignId).length;
    db.saveCampaign(campaign);
  }

  res.json({ success: true });
});

// DELETE all leads in campaign
router.delete('/campaign/:campaignId', (req: Request, res: Response) => {
  db.deleteLeadsByCampaign(req.params.campaignId);
  const campaign = db.getCampaignById(req.params.campaignId);
  if (campaign) {
    campaign.stats.totalLeads = 0;
    campaign.stats.sent = 0;
    campaign.stats.opened = 0;
    campaign.stats.clicked = 0;
    campaign.stats.replied = 0;
    campaign.stats.bounced = 0;
    db.saveCampaign(campaign);
  }
  res.json({ success: true });
});

// PUT update lead status (e.g. mark as replied)
router.put('/:id/status', (req: Request, res: Response) => {
  const { status } = req.body;
  const lead = db.getLeadById(req.params.id);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }

  lead.status = status;
  if (status === 'replied' && !lead.repliedAt) {
    lead.repliedAt = Date.now();
  }
  db.saveLead(lead);

  const campaign = db.getCampaignById(lead.campaignId);
  if (campaign) {
    campaign.stats.replied = db.getLeads(campaign.id).filter((l) => l.status === 'replied').length;
    db.saveCampaign(campaign);
  }

  res.json({ success: true, lead });
});

export default router;
