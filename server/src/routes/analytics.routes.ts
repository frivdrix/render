import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';

const router = Router();

router.get('/overview', (_req: Request, res: Response) => {
  const campaigns = db.getCampaigns();
  const accounts = db.getAccounts();
  const leads = db.getLeads();
  const logs = db.getLogs();
  const events = db.getTrackingEvents();

  const totalLeads = leads.length;
  const leadSentCount = leads.filter((l) => ['sent', 'opened', 'clicked', 'replied'].includes(l.status)).length;
  const logSentCount = logs.filter((l) => l.status === 'sent' || l.status === 'replied').length;
  const totalSent = Math.max(leadSentCount, logSentCount);

  const totalReplied = Math.max(
    leads.filter((l) => l.status === 'replied').length,
    logs.filter((l) => l.status === 'replied').length
  );
  const totalBounced = Math.max(
    leads.filter((l) => l.status === 'bounced').length,
    logs.filter((l) => l.status === 'bounced' || l.status === 'failed').length
  );

  const replyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : '0';
  const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(1) : '0';

  // Deliverability Health Score calculation
  let healthScore = 98;
  const bRate = parseFloat(bounceRate);
  if (bRate > 5) healthScore -= (bRate - 5) * 5;
  if (accounts.length === 0) healthScore = 0;
  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

  // Account sending distribution
  const accountStats = accounts.map((acc) => {
    const accLogs = logs.filter((l) => l.accountId === acc.id && (l.status === 'sent' || l.status === 'replied'));
    return {
      id: acc.id,
      email: acc.email,
      name: acc.name,
      dailyLimit: acc.dailyLimit,
      sentToday: acc.sentToday,
      totalSent: accLogs.length,
      status: acc.status,
    };
  });

  // Recent activity feed
  const recentActivities = events.slice(0, 20).map((evt) => {
    const lead = db.getLeadById(evt.leadId);
    const campaign = db.getCampaignById(evt.campaignId);
    return {
      id: evt.id,
      type: evt.type,
      email: lead?.email || 'Unknown',
      campaignName: campaign?.name || 'Campaign',
      timestamp: evt.timestamp,
    };
  });

  res.json({
    success: true,
    stats: {
      totalLeads,
      totalSent,
      totalOpened: 0,
      totalClicked: 0,
      totalReplied,
      totalBounced,
      openRate: '0%',
      clickRate: '0%',
      replyRate: `${replyRate}%`,
      bounceRate: `${bounceRate}%`,
      healthScore,
      activeAccounts: accounts.filter((a) => a.status === 'active').length,
      totalCampaigns: campaigns.length,
      runningCampaigns: campaigns.filter((c) => c.status === 'running').length,
    },
    accountStats,
    recentActivities,
    recentLogs: logs.slice(0, 15),
  });
});

/**
 * POST /api/analytics/sync-replies
 * Trigger instant manual reply scan across all inboxes
 */
router.post('/sync-replies', async (_req: Request, res: Response) => {
  try {
    const { ReplyScannerService } = await import('../services/reply-scanner.service.js');
    const result = await ReplyScannerService.scanAllInboxes();
    res.json({
      success: true,
      message: `Scanned ${result.scannedInboxes} inbox(es). Found ${result.newRepliesFound} new reply(ies)!`,
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to sync replies' });
  }
});

/**
 * POST /api/analytics/reset-all
 * Wipe all test data, sent logs, and reset dashboard statistics to 0
 */
router.post('/reset-all', (_req: Request, res: Response) => {
  try {
    db.resetAllStatsAndTestData();
    res.json({
      success: true,
      message: 'All test data, outreach logs, and metrics have been reset to zero.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to reset statistics' });
  }
});

/**
 * GET /api/analytics/daily
 * Persistent Day-by-Day Outreach Summary & Reply Breakdown
 */
router.get('/daily', (req: Request, res: Response) => {
  const logs = db.getLogs();
  const leads = db.getLeads();
  const accounts = db.getAccounts();
  const campaigns = db.getCampaigns();

  const userTz = (req.query.tz as string) || (req.headers['x-timezone'] as string) || 'Asia/Kolkata';

  const accountMap = new Map(accounts.map((a) => [a.id, a.email]));
  const campaignMap = new Map(campaigns.map((c) => [c.id, c.name]));

  // Helper to get YYYY-MM-DD string in user's timezone
  const toDateStr = (timestamp: number) => {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: userTz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(new Date(timestamp)); // returns YYYY-MM-DD
    } catch {
      const d = new Date(timestamp);
      return d.toISOString().split('T')[0];
    }
  };

  const toDisplayDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      return date.toLocaleDateString('en-US', { timeZone: userTz, month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Group logs and leads by date
  interface DayAggregate {
    date: string;
    displayDate: string;
    sentCount: number;
    repliedCount: number;
    bouncedCount: number;
    inboxCounts: Record<string, number>;
    campaignCounts: Record<string, number>;
    logs: Array<{
      id: string;
      toEmail: string;
      fromEmail: string;
      campaignName: string;
      subject: string;
      status: string;
      sentAt: number;
    }>;
  }

  const daysMap = new Map<string, DayAggregate>();

  // Ensure today in user's timezone is always present
  const todayStr = toDateStr(Date.now());
  daysMap.set(todayStr, {
    date: todayStr,
    displayDate: toDisplayDate(todayStr),
    sentCount: 0,
    repliedCount: 0,
    bouncedCount: 0,
    inboxCounts: {},
    campaignCounts: {},
    logs: [],
  });

  // Group logs by sent date
  for (const log of logs) {
    if (!log.sentAt) continue;
    const dateStr = toDateStr(log.sentAt);
    if (!daysMap.has(dateStr)) {
      daysMap.set(dateStr, {
        date: dateStr,
        displayDate: toDisplayDate(dateStr),
        sentCount: 0,
        repliedCount: 0,
        bouncedCount: 0,
        inboxCounts: {},
        campaignCounts: {},
        logs: [],
      });
    }

    const day = daysMap.get(dateStr)!;
    if (log.status === 'sent' || log.status === 'replied') {
      day.sentCount += 1;
    }
    if (log.status === 'replied') {
      day.repliedCount += 1;
    } else if (log.status === 'bounced' || log.status === 'failed') {
      day.bouncedCount += 1;
    }

    const fromEmail = log.fromEmail || accountMap.get(log.accountId) || 'Unknown Inbox';
    day.inboxCounts[fromEmail] = (day.inboxCounts[fromEmail] || 0) + 1;

    const campaignName = log.campaignName || campaignMap.get(log.campaignId) || 'Outreach Campaign';
    day.campaignCounts[campaignName] = (day.campaignCounts[campaignName] || 0) + 1;

    day.logs.push({
      id: log.id,
      toEmail: log.toEmail,
      fromEmail,
      campaignName,
      subject: log.subject,
      status: log.status,
      sentAt: log.sentAt,
    });
  }

  // Count replies associated with dates from leads (if not already counted in logs)
  for (const lead of leads) {
    if (lead.status === 'replied') {
      const targetTimestamp = lead.sentAt || lead.repliedAt || lead.createdAt;
      const dateStr = toDateStr(targetTimestamp);
      if (daysMap.has(dateStr)) {
        const day = daysMap.get(dateStr)!;
        const alreadyCounted = day.logs.some(
          (l) => l.toEmail.toLowerCase() === lead.email.toLowerCase() && l.status === 'replied'
        );
        if (!alreadyCounted) {
          day.repliedCount += 1;
        }
      }
    }
  }

  // Sort dates descending (newest first)
  const sortedDates = Array.from(daysMap.keys()).sort((a, b) => b.localeCompare(a));

  // Determine chronological day number (Day 1 = oldest, Day 2 = next, etc.)
  const chronologicalDates = [...sortedDates].reverse();
  const dayNumberMap = new Map<string, number>();
  chronologicalDates.forEach((d, idx) => dayNumberMap.set(d, idx + 1));

  const daysList = sortedDates.map((dateStr) => {
    const d = daysMap.get(dateStr)!;
    const replyRate = d.sentCount > 0 ? ((d.repliedCount / d.sentCount) * 100).toFixed(1) : '0.0';
    const bounceRate = d.sentCount > 0 ? ((d.bouncedCount / d.sentCount) * 100).toFixed(1) : '0.0';

    return {
      date: d.date,
      displayDate: d.displayDate,
      dayNumber: dayNumberMap.get(dateStr) || 1,
      sentCount: d.sentCount,
      repliedCount: d.repliedCount,
      replyRate: `${replyRate}%`,
      bouncedCount: d.bouncedCount,
      bounceRate: `${bounceRate}%`,
      inboxCounts: d.inboxCounts,
      campaignCounts: d.campaignCounts,
      totalInboxesUsed: Object.keys(d.inboxCounts).length,
      logs: d.logs.sort((a, b) => b.sentAt - a.sentAt),
    };
  });

  // Today summary
  const todaySummary = daysList.find((d) => d.date === todayStr) || daysList[0];

  res.json({
    success: true,
    today: todaySummary,
    totalDaysActive: daysList.filter((d) => d.sentCount > 0).length || 1,
    days: daysList,
  });
});

export default router;
