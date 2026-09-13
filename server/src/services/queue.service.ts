import { db } from '../database/db.js';
import { Campaign, Lead, GoogleAccount, EmailLog } from '../types/index.js';
import { EmailSenderService } from './email-sender.service.js';
import { SpintaxService } from './spintax.service.js';
import { v4 as uuidv4 } from 'uuid';

export class QueueService {
  private static isRunning = false;
  private static intervalTimer: NodeJS.Timeout | null = null;
  private static activeDispatchCount = 0;

  public static start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[QueueService] Background Campaign Queue Engine Started');

    // Run tick every 5 seconds to inspect running campaigns
    this.intervalTimer = setInterval(() => {
      this.tick().catch((err) => console.error('[QueueService] Error in tick:', err));
    }, 5000);
  }

  public static stop() {
    this.isRunning = false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    console.log('[QueueService] Background Campaign Queue Engine Stopped');
  }

  /**
   * Main Queue Tick
   */
  private static async tick() {
    // Reset daily counters for accounts if day changed
    this.checkAndResetDailyCounters();

    const campaigns = db.getCampaigns().filter((c) => c.status === 'running');
    if (campaigns.length === 0) return;

    for (const campaign of campaigns) {
      // 1. Check if within schedule window
      if (!this.isWithinSendingWindow(campaign)) {
        console.log(`[QueueService] Campaign "${campaign.name}" (${campaign.id}) is outside configured sending window or day schedule.`);
        continue;
      }

      // 2. Fetch available Google Accounts for this campaign (auto-fallback to all active accounts if none assigned)
      const allActiveAccounts = db.getAccounts().filter((a) => a.status === 'active');
      const assignedAccounts = allActiveAccounts.filter((a) =>
        campaign.accountIds && campaign.accountIds.length > 0 ? campaign.accountIds.includes(a.id) : true
      );

      if (assignedAccounts.length === 0) {
        console.warn(`[QueueService] Campaign "${campaign.name}" (${campaign.id}) has no active connected inboxes.`);
        continue;
      }

      // Find an account that has not exceeded daily limit and has passed cooloff delay
      const availableAccount = this.selectNextAccount(assignedAccounts, campaign);
      if (!availableAccount) {
        // All accounts are either at daily limit or currently cooling down (waiting for jitter delay)
        continue;
      }

      // 3. Find next pending lead
      const leads = db.getLeads(campaign.id);
      const nextLead = leads.find((l) => l.status === 'pending');

      if (!nextLead) {
        // No more pending leads, mark campaign as completed
        campaign.status = 'completed';
        campaign.updatedAt = Date.now();
        db.saveCampaign(campaign);
        console.log(`[QueueService] Campaign "${campaign.name}" completed all leads.`);
        continue;
      }

      // 4. Dispatch Email
      console.log(`[QueueService] Dispatching lead ${nextLead.email} via inbox ${availableAccount.email} for campaign "${campaign.name}"...`);
      await this.dispatchLead(campaign, availableAccount, nextLead);
    }
  }

  /**
   * Reset account sentToday counters at midnight in user timezone (Asia/Kolkata)
   */
  public static checkAndResetDailyCounters(tz: string = 'Asia/Kolkata') {
    let todayStr: string;
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      todayStr = formatter.format(new Date()); // returns YYYY-MM-DD in India time
    } catch {
      todayStr = new Date().toISOString().slice(0, 10);
    }

    const accounts = db.getAccounts();
    for (const acc of accounts) {
      if (acc.lastResetDate !== todayStr) {
        acc.sentToday = 0;
        acc.lastResetDate = todayStr;
        db.saveAccount(acc);
      }
    }
  }

  /**
   * Check if current time matches campaign timezone and schedule
   */
  private static isWithinSendingWindow(campaign: Campaign): boolean {
    const { sendWindowStart, sendWindowEnd, sendDays, timezone } = campaign.settings;
    try {
      const now = new Date();
      // Format current time in campaign timezone
      const tzString = timezone || 'UTC';
      const formatterTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: tzString,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const formatterDay = new Intl.DateTimeFormat('en-US', {
        timeZone: tzString,
        weekday: 'short',
      });

      const [hourStr, minStr] = formatterTime.format(now).split(':');
      const currentMinutes = parseInt(hourStr, 10) * 60 + parseInt(minStr, 10);

      const [startH, startM] = (sendWindowStart || '00:00').split(':').map((v) => parseInt(v, 10));
      const [endH, endM] = (sendWindowEnd || '23:59').split(':').map((v) => parseInt(v, 10));

      const windowStartMin = startH * 60 + startM;
      const windowEndMin = endH * 60 + endM;

      if (currentMinutes < windowStartMin || currentMinutes > windowEndMin) {
        return false;
      }

      // Check day of week (0=Sun, 1=Mon, ..., 6=Sat)
      const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const currentDayName = formatterDay.format(now);
      const currentDayNum = dayMap[currentDayName] ?? now.getUTCDay();

      if (sendDays && sendDays.length > 0 && !sendDays.includes(currentDayNum)) {
        return false;
      }

      return true;
    } catch {
      return true; // fallback to allow sending if tz parsing fails
    }
  }

  /**
   * Round-robin account rotation with cooldown & daily limit checks
   */
  private static selectNextAccount(accounts: GoogleAccount[], campaign: Campaign): GoogleAccount | null {
    const now = Date.now();
    const dailyLimit = campaign.settings.dailyLimitPerAccount || 40;

    // Filter eligible accounts
    const eligibleAccounts = accounts.filter((acc) => {
      // Check daily limit
      const effectiveLimit = Math.min(acc.dailyLimit || 40, dailyLimit);
      if (acc.sentToday >= effectiveLimit) {
        return false;
      }

      // Check cooldown delay with randomized jitter
      const minDelayMs = (acc.minDelaySeconds || campaign.settings.minJitterSeconds || 60) * 1000;
      if (acc.lastSentAt && now - acc.lastSentAt < minDelayMs) {
        return false;
      }

      return true;
    });

    if (eligibleAccounts.length === 0) return null;

    // Pick the account that hasn't sent for the longest time (best round-robin distribution)
    eligibleAccounts.sort((a, b) => (a.lastSentAt || 0) - (b.lastSentAt || 0));
    return eligibleAccounts[0];
  }

  /**
   * Dispatch single email with Spintax, variable resolution, and deliverability protection
   */
  private static async dispatchLead(campaign: Campaign, account: GoogleAccount, lead: Lead) {
    lead.status = 'queued';
    db.saveLead(lead);

    try {
      // 1. Determine Subject and Body
      const templateSubject = lead.customSubject || campaign.subject;
      const templateBody = lead.customBody || campaign.body;

      // 2. Parse Spintax and dynamic variables
      const processedSubject = SpintaxService.processText(templateSubject, lead);
      let processedBody = SpintaxService.processText(templateBody, lead);

      // Append sender signature if configured on account
      if (account.signature && !processedBody.includes(account.signature)) {
        processedBody += `\n\n${account.signature}`;
      }

      // 3. Send email via Google API or SMTP
      await EmailSenderService.send({
        account,
        campaign,
        lead,
        subject: processedSubject,
        body: processedBody,
      });

      const now = Date.now();

      // 4. Update Lead Record
      lead.status = 'sent';
      lead.sentAt = now;
      lead.sentFromAccountId = account.id;
      lead.sentSubject = processedSubject;
      lead.sentBody = processedBody;
      lead.errorMessage = undefined;
      db.saveLead(lead);

      // 5. Update Account Stats & Randomized Jitter Cooldown
      account.sentToday += 1;
      // Calculate randomized jitter delay for next send on this account
      const minJitter = campaign.settings.minJitterSeconds || 60;
      const maxJitter = campaign.settings.maxJitterSeconds || 180;
      const randomJitter = Math.floor(Math.random() * (maxJitter - minJitter + 1)) + minJitter;
      account.minDelaySeconds = randomJitter;
      account.lastSentAt = now;
      db.saveAccount(account);

      // 6. Update Campaign Stats
      campaign.stats.sent += 1;
      campaign.updatedAt = now;
      db.saveCampaign(campaign);

      // 7. Write Log
      const log: EmailLog = {
        id: uuidv4(),
        campaignId: campaign.id,
        leadId: lead.id,
        accountId: account.id,
        toEmail: lead.email,
        fromEmail: account.email,
        subject: processedSubject,
        bodyPreview: processedBody.slice(0, 100),
        status: 'sent',
        sentAt: now,
      };
      db.addLog(log);

      console.log(`[QueueService] Successfully dispatched cold email to ${lead.email} from ${account.email} (Campaign: "${campaign.name}")`);
    } catch (err: any) {
      console.error(`[QueueService] Failed to send email to ${lead.email}:`, err.message || err);
      lead.status = 'bounced';
      lead.errorMessage = err.message || 'Send error';
      db.saveLead(lead);

      campaign.stats.bounced += 1;
      campaign.updatedAt = Date.now();
      db.saveCampaign(campaign);

      const log: EmailLog = {
        id: uuidv4(),
        campaignId: campaign.id,
        leadId: lead.id,
        accountId: account.id,
        toEmail: lead.email,
        fromEmail: account.email,
        subject: lead.customSubject || campaign.subject,
        bodyPreview: (lead.customBody || campaign.body).slice(0, 100),
        status: 'failed',
        sentAt: Date.now(),
        metadata: { error: err.message || String(err) },
      };
      db.addLog(log);
    }
  }
}
