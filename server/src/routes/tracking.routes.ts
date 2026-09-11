import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { TrackingEvent } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Transparent 1x1 PNG buffer
const TRANSPARENT_1X1_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

// GET Open tracking pixel (/t/o/:token or /t/o/:token.png)
router.get('/o/:token', (req: Request, res: Response) => {
  try {
    const rawToken = req.params.token.replace(/\.png$/i, '');
    const userAgent = req.headers['user-agent'] || '';
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';

    // Ignore known bots / prefetch proxies if needed, or record standard
    const isBot = /bot|googleimageproxy|spider|crawler/i.test(userAgent);

    const lead = db.getLeadByToken(rawToken);
    if (lead) {
      lead.openCount = (lead.openCount || 0) + 1;
      lead.lastOpenedAt = Date.now();
      if (lead.status === 'sent') {
        lead.status = 'opened';
      }
      db.saveLead(lead);

      const campaign = db.getCampaignById(lead.campaignId);
      if (campaign) {
        const allCampaignLeads = db.getLeads(campaign.id);
        campaign.stats.opened = allCampaignLeads.filter((l) => l.status === 'opened' || l.openCount > 0).length;
        db.saveCampaign(campaign);
      }

      const event: TrackingEvent = {
        id: uuidv4(),
        campaignId: lead.campaignId,
        leadId: lead.id,
        type: 'open',
        ip,
        userAgent,
        timestamp: Date.now(),
      };
      db.addTrackingEvent(event);
    }
  } catch (err) {
    console.error('[Tracking] Open tracking error:', err);
  }

  // Return non-cached 1x1 image
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': TRANSPARENT_1X1_PNG.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  res.end(TRANSPARENT_1X1_PNG);
});

// GET Click tracking redirect (/t/c/:token?url=...)
router.get('/c/:token', (req: Request, res: Response) => {
  const rawToken = req.params.token;
  const targetUrl = (req.query.url as string) || 'https://google.com';
  const userAgent = req.headers['user-agent'] || '';
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';

  try {
    const lead = db.getLeadByToken(rawToken);
    if (lead) {
      lead.clickCount = (lead.clickCount || 0) + 1;
      lead.lastClickedAt = Date.now();
      if (lead.status === 'sent' || lead.status === 'opened') {
        lead.status = 'clicked';
      }
      db.saveLead(lead);

      const campaign = db.getCampaignById(lead.campaignId);
      if (campaign) {
        const allCampaignLeads = db.getLeads(campaign.id);
        campaign.stats.clicked = allCampaignLeads.filter((l) => l.status === 'clicked' || l.clickCount > 0).length;
        db.saveCampaign(campaign);
      }

      const event: TrackingEvent = {
        id: uuidv4(),
        campaignId: lead.campaignId,
        leadId: lead.id,
        type: 'click',
        ip,
        userAgent,
        targetUrl,
        timestamp: Date.now(),
      };
      db.addTrackingEvent(event);
    }
  } catch (err) {
    console.error('[Tracking] Click tracking error:', err);
  }

  // Redirect to original destination URL
  res.redirect(302, targetUrl);
});

// GET Unsubscribe handler (/t/u/:token)
router.get('/u/:token', (req: Request, res: Response) => {
  const rawToken = req.params.token;
  try {
    const lead = db.getLeadByToken(rawToken);
    if (lead) {
      lead.status = 'unsubscribed';
      db.saveLead(lead);
    }
  } catch (err) {
    console.error('[Tracking] Unsubscribe error:', err);
  }

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Unsubscribed</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0F19; color: #e2e8f0; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #111827; padding: 40px; border-radius: 12px; border: 1px solid #1f2937; text-align: center; max-width: 420px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
          h2 { margin-top: 0; color: #38bdf8; font-size: 22px; }
          p { color: #94a3b8; font-size: 15px; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>✓ Unsubscribed Successfully</h2>
          <p>Your email has been removed from our outreach list and you will not receive further messages from this campaign.</p>
        </div>
      </body>
    </html>
  `);
});

export default router;
