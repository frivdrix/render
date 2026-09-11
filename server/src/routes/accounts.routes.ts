import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { GoogleAccount } from '../types/index.js';
import { GoogleAuthService } from '../services/google-auth.service.js';
import { EmailSenderService } from '../services/email-sender.service.js';
import { WorkspaceDomainService } from '../services/workspace-domain.service.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET all accounts
router.get('/', (_req: Request, res: Response) => {
  const accounts = db.getAccounts();
  // Strip sensitive passwords & keys from response
  const sanitized = accounts.map((acc) => ({
    ...acc,
    appPassword: acc.appPassword ? '••••••••' : undefined,
    serviceAccountPrivateKey: acc.serviceAccountPrivateKey ? '••••••••' : undefined,
    refreshToken: acc.refreshToken ? 'configured' : undefined,
    accessToken: undefined,
  }));
  res.json({ success: true, accounts: sanitized });
});

// GET all workspace domains
router.get('/domains', (_req: Request, res: Response) => {
  const domains = db.getDomains();
  const sanitized = domains.map((d) => ({
    ...d,
    serviceAccountPrivateKey: '••••••••',
  }));
  res.json({ success: true, domains: sanitized });
});

// POST sync ALL inboxes in a Google Workspace domain in one go (Domain-Wide Delegation)
router.post('/workspace/sync', async (req: Request, res: Response) => {
  try {
    const { keyJson, adminEmail, clientEmail, privateKey, clientId, domain, dailyLimit, manualEmails } = req.body;

    let finalClientEmail = clientEmail;
    let finalPrivateKey = privateKey;
    let finalClientId = clientId;

    // Support uploading / pasting entire Google Service Account JSON key
    if (keyJson) {
      let parsed: any;
      try {
        parsed = typeof keyJson === 'string' ? JSON.parse(keyJson) : keyJson;
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid Service Account JSON format.' });
      }

      finalClientEmail = parsed.client_email;
      finalPrivateKey = parsed.private_key;
      finalClientId = parsed.client_id;
    }

    if (!finalClientEmail || !finalPrivateKey) {
      return res.status(400).json({
        success: false,
        error: 'Google Service Account client_email and private_key are required.',
      });
    }

    if (!adminEmail || !adminEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'A Google Workspace Admin email is required for domain-wide impersonation (e.g. admin@yourdomain.com).',
      });
    }

    const syncResult = await WorkspaceDomainService.syncAllInboxes({
      domain,
      adminEmail,
      clientEmail: finalClientEmail,
      privateKey: finalPrivateKey,
      clientId: finalClientId,
      dailyLimitPerInbox: dailyLimit ? parseInt(dailyLimit, 10) : 40,
      manualEmails,
    });

    res.json({
      success: true,
      message: `Successfully connected Google Workspace domain "${syncResult.domain.domain}" and connected ${syncResult.discoveredCount} active user inboxes!`,
      domain: syncResult.domain,
      discoveredCount: syncResult.discoveredCount,
      inboxes: syncResult.inboxes.map((i) => ({
        id: i.id,
        email: i.email,
        name: i.name,
        dailyLimit: i.dailyLimit,
        authType: i.authType,
      })),
    });
  } catch (err: any) {
    console.error('Workspace domain sync error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to sync Google Workspace inboxes' });
  }
});

// DELETE workspace domain
router.delete('/domains/:id', (req: Request, res: Response) => {
  const success = db.deleteDomain(req.params.id);
  res.json({ success });
});

// POST bulk import inboxes via text (email:password:name or table)
router.post('/bulk', (req: Request, res: Response) => {
  try {
    const { rawText, defaultLimit } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ success: false, error: 'Raw text is required' });
    }

    const result = WorkspaceDomainService.bulkImportAppPasswords(rawText, defaultLimit ? parseInt(defaultLimit, 10) : 40);

    if (result.count === 0) {
      return res.status(400).json({ success: false, error: 'No valid email addresses found in the provided text.' });
    }

    res.json({
      success: true,
      importedCount: result.count,
      accounts: result.imported,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST new single App Password / SMTP account
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, name, appPassword, smtpHost, smtpPort, dailyLimit, signature } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address is required.' });
    }

    const newAccount: GoogleAccount = {
      id: uuidv4(),
      email: email.trim().toLowerCase(),
      name: name?.trim() || email.split('@')[0],
      authType: 'app_password',
      appPassword: appPassword?.trim(),
      smtpHost: smtpHost || 'smtp.gmail.com',
      smtpPort: smtpPort ? parseInt(smtpPort, 10) : 465,
      dailyLimit: dailyLimit ? parseInt(dailyLimit, 10) : 40,
      sentToday: 0,
      lastResetDate: new Date().toISOString().slice(0, 10),
      minDelaySeconds: 60,
      status: 'active',
      signature: signature || '',
      createdAt: Date.now(),
    };

    db.saveAccount(newAccount);
    res.json({ success: true, account: newAccount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to add account' });
  }
});

// PUT update account
router.put('/:id', (req: Request, res: Response) => {
  try {
    const account = db.getAccountById(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    const { name, dailyLimit, status, signature, appPassword } = req.body;
    if (name !== undefined) account.name = name;
    if (dailyLimit !== undefined) account.dailyLimit = parseInt(dailyLimit, 10);
    if (status !== undefined) account.status = status;
    if (signature !== undefined) account.signature = signature;
    if (appPassword && appPassword !== '••••••••') account.appPassword = appPassword.trim();

    db.saveAccount(account);
    res.json({ success: true, account });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE account
router.delete('/:id', (req: Request, res: Response) => {
  const success = db.deleteAccount(req.params.id);
  res.json({ success });
});

// POST test email send
router.post('/:id/test-send', async (req: Request, res: Response) => {
  try {
    const account = db.getAccountById(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    const { targetEmail } = req.body;
    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Recipient target email is required' });
    }

    await EmailSenderService.sendTestEmail(account, targetEmail.trim());
    res.json({ success: true, message: `Test email successfully sent to ${targetEmail}!` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to send test email' });
  }
});

// POST reset today count
router.post('/:id/reset-limit', (req: Request, res: Response) => {
  const account = db.getAccountById(req.params.id);
  if (!account) {
    return res.status(404).json({ success: false, error: 'Account not found' });
  }
  account.sentToday = 0;
  db.saveAccount(account);
  res.json({ success: true, account });
});

// GET OAuth URL
router.get('/oauth/url', (_req: Request, res: Response) => {
  try {
    const url = GoogleAuthService.getAuthUrl();
    res.json({ success: true, url });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET OAuth Callback
router.get('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      return res.status(400).send('Missing authorization code');
    }

    const accountData = await GoogleAuthService.handleCallback(code);

    // Check if account already exists
    const existing = db.getAccounts().find((a) => a.email === accountData.email);
    const newAccount: GoogleAccount = {
      id: existing ? existing.id : uuidv4(),
      email: accountData.email!,
      name: accountData.name || accountData.email!.split('@')[0],
      authType: 'oauth',
      refreshToken: accountData.refreshToken || existing?.refreshToken,
      accessToken: accountData.accessToken,
      tokenExpiry: accountData.tokenExpiry,
      dailyLimit: existing ? existing.dailyLimit : 40,
      sentToday: existing ? existing.sentToday : 0,
      lastResetDate: existing ? existing.lastResetDate : new Date().toISOString().slice(0, 10),
      minDelaySeconds: 60,
      status: 'active',
      createdAt: existing ? existing.createdAt : Date.now(),
    };

    db.saveAccount(newAccount);

    // Redirect to frontend accounts page
    res.redirect('http://localhost:5173/accounts?status=success&email=' + encodeURIComponent(newAccount.email));
  } catch (err: any) {
    res.redirect('http://localhost:5173/accounts?status=error&message=' + encodeURIComponent(err.message || 'OAuth Failed'));
  }
});

export default router;
