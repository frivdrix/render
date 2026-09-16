import { ImapFlow } from 'imapflow';
import { google } from 'googleapis';
import { db } from '../database/db.js';
import { GoogleAccount, Lead, Campaign } from '../types/index.js';
import { WorkspaceDomainService } from './workspace-domain.service.js';

export class ReplyScannerService {
  private static isScanning = false;
  private static intervalTimer: NodeJS.Timeout | null = null;

  public static start() {
    if (this.intervalTimer) return;
    console.log('[ReplyScanner] Automated Inbox Reply Detection Worker Started (Every 60s)');
    
    // Initial scan after 10s
    setTimeout(() => {
      this.scanAllInboxes().catch((err) => console.error('[ReplyScanner] Initial scan error:', err));
    }, 10000);

    // Periodic scan every 60 seconds
    this.intervalTimer = setInterval(() => {
      this.scanAllInboxes().catch((err) => console.error('[ReplyScanner] Interval scan error:', err));
    }, 60000);
  }

  public static stop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  /**
   * Scan all active inboxes for replies
   */
  public static async scanAllInboxes(): Promise<{ scannedInboxes: number; newRepliesFound: number }> {
    if (this.isScanning) {
      return { scannedInboxes: 0, newRepliesFound: 0 };
    }
    this.isScanning = true;

    let scannedInboxes = 0;
    let newRepliesFound = 0;

    try {
      const accounts = db.getAccounts().filter((a) => a.status === 'active');
      const leads = db.getLeads();
      const campaigns = db.getCampaigns();

      // Build quick lookup of sent leads by email (lowercase)
      const leadMap = new Map<string, Lead[]>();
      for (const lead of leads) {
        if (lead.email) {
          const emailNorm = lead.email.trim().toLowerCase();
          if (!leadMap.has(emailNorm)) {
            leadMap.set(emailNorm, []);
          }
          leadMap.get(emailNorm)!.push(lead);
        }
      }

      for (const account of accounts) {
        scannedInboxes += 1;
        try {
          if (account.authType === 'app_password' && account.appPassword) {
            const count = await this.scanImapInbox(account, leadMap, campaigns);
            newRepliesFound += count;
          } else if (account.authType === 'service_account' && account.serviceAccountClientEmail && account.serviceAccountPrivateKey) {
            const count = await this.scanServiceAccountInbox(account, leadMap, campaigns);
            newRepliesFound += count;
          }
        } catch (err: any) {
          console.warn(`[ReplyScanner] Could not scan inbox ${account.email}:`, err.message || err);
        }
      }

      if (newRepliesFound > 0) {
        console.log(`[ReplyScanner] Total ${newRepliesFound} new replies recorded and updated in database!`);
      }
    } finally {
      this.isScanning = false;
    }

    return { scannedInboxes, newRepliesFound };
  }

  /**
   * Scan IMAP Inbox for App Password Accounts
   */
  private static async scanImapInbox(
    account: GoogleAccount,
    leadMap: Map<string, Lead[]>,
    campaigns: Campaign[]
  ): Promise<number> {
    const client = new ImapFlow({
      host: account.smtpHost === 'smtp.gmail.com' ? 'imap.gmail.com' : (account.smtpHost || 'imap.gmail.com'),
      port: 993,
      secure: true,
      auth: {
        user: account.email,
        pass: account.appPassword!.replace(/\s+/g, ''),
      },
      logger: false,
    });

    let newReplies = 0;

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        // Search for messages received in the last 7 days
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 7);

        const searchCriteria = { since: sinceDate };
        const messages = client.fetch(searchCriteria, {
          envelope: true,
          internalDate: true,
        });

        for await (const msg of messages) {
          const fromAddress = msg.envelope?.from?.[0]?.address?.toLowerCase()?.trim();
          if (!fromAddress) continue;

          // Check if this sender email matches any sent lead
          const matchedLeads = leadMap.get(fromAddress);
          if (matchedLeads && matchedLeads.length > 0) {
            for (const lead of matchedLeads) {
              if (lead.status !== 'replied') {
                const repliedTime = msg.internalDate ? new Date(msg.internalDate).getTime() : Date.now();
                lead.status = 'replied';
                lead.repliedAt = repliedTime;
                db.saveLead(lead);
                db.updateLogReply(lead.id, repliedTime);

                // Update campaign stats
                const campaign = campaigns.find((c) => c.id === lead.campaignId) || db.getCampaignById(lead.campaignId);
                if (campaign) {
                  campaign.stats.replied = db.getLeads(campaign.id).filter((l) => l.status === 'replied').length;
                  db.saveCampaign(campaign);
                }

                newReplies += 1;
                console.log(`[ReplyScanner] ✅ Reply detected from ${fromAddress} for campaign "${campaign?.name || lead.campaignId}"!`);
              }
            }
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (err: any) {
      try { await client.logout(); } catch {}
      throw err;
    }

    return newReplies;
  }

  /**
   * Scan Service Account / Domain-Wide Delegation Inbox
   */
  private static async scanServiceAccountInbox(
    account: GoogleAccount,
    leadMap: Map<string, Lead[]>,
    campaigns: Campaign[]
  ): Promise<number> {
    let newReplies = 0;
    try {
      const authClient = WorkspaceDomainService.getJwtClient(
        account.serviceAccountClientEmail!,
        account.serviceAccountPrivateKey!,
        account.email,
        ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send']
      );

      const gmail = google.gmail({ version: 'v1', auth: authClient });
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:inbox newer_than:7d',
        maxResults: 50,
      });

      const messages = res.data.messages || [];
      for (const m of messages) {
        if (!m.id) continue;
        const msgRes = await gmail.users.messages.get({
          userId: 'me',
          id: m.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date', 'In-Reply-To'],
        });

        const headers = msgRes.data.payload?.headers || [];
        const fromHeader = headers.find((h) => h.name?.toLowerCase() === 'from')?.value || '';
        
        // Extract email from "Name <email@example.com>"
        const match = fromHeader.match(/<([^>]+)>/) || [null, fromHeader];
        const fromEmail = (match[1] || fromHeader).trim().toLowerCase();

        if (fromEmail) {
          const matchedLeads = leadMap.get(fromEmail);
          if (matchedLeads && matchedLeads.length > 0) {
            for (const lead of matchedLeads) {
              if (lead.status !== 'replied') {
                const repliedTime = Date.now();
                lead.status = 'replied';
                lead.repliedAt = repliedTime;
                db.saveLead(lead);
                db.updateLogReply(lead.id, repliedTime);

                const campaign = campaigns.find((c) => c.id === lead.campaignId) || db.getCampaignById(lead.campaignId);
                if (campaign) {
                  campaign.stats.replied = db.getLeads(campaign.id).filter((l) => l.status === 'replied').length;
                  db.saveCampaign(campaign);
                }

                newReplies += 1;
                console.log(`[ReplyScanner] ✅ Service Account reply detected from ${fromEmail}!`);
              }
            }
          }
        }
      }
    } catch (err: any) {
      // If gmail.readonly scope is not authorized in Workspace Admin, log cleanly
      // Fallback: manual sync or IMAP
    }

    return newReplies;
  }
}
