import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db.js';
import { GoogleAccount, WorkspaceDomain } from '../types/index.js';

export interface ServiceAccountKeyJson {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key: string;
  client_email: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
}

export class WorkspaceDomainService {
  /**
   * Create JWT Auth Client with Domain-Wide Delegation impersonation
   */
  public static getJwtClient(
    clientEmail: string,
    privateKey: string,
    impersonateSubjectEmail: string,
    scopes: string[] = ['https://www.googleapis.com/auth/gmail.send']
  ) {
    return new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes,
      subject: impersonateSubjectEmail,
    });
  }

  /**
   * Sync and discover ALL inboxes in a Google Workspace domain
   */
  public static async syncAllInboxes(domainConfig: {
    domain?: string;
    adminEmail: string;
    clientEmail: string;
    privateKey: string;
    clientId?: string;
    dailyLimitPerInbox?: number;
    manualEmails?: string;
  }): Promise<{
    domain: WorkspaceDomain;
    inboxes: GoogleAccount[];
    discoveredCount: number;
  }> {
    const { domain, adminEmail, clientEmail, privateKey, clientId, dailyLimitPerInbox = 40, manualEmails } = domainConfig;

    const detectedDomain = domain || (adminEmail.includes('@') ? adminEmail.split('@')[1] : 'workspace');
    let usersList: { email: string; name?: string }[] = [];

    // If manual emails are provided, use them directly
    if (manualEmails && manualEmails.trim()) {
      const parsedEmails = manualEmails
        .split(/[\r\n,;\t]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes('@'));

      for (const em of parsedEmails) {
        usersList.push({
          email: em,
          name: em.split('@')[0],
        });
      }
    } else {
      // Otherwise query Google Admin Directory API
      try {
        const authClient = this.getJwtClient(
          clientEmail,
          privateKey,
          adminEmail,
          ['https://www.googleapis.com/auth/admin.directory.user.readonly']
        );
        const admin = google.admin({ version: 'directory_v1', auth: authClient });

        const res = await admin.users.list({
          customer: 'my_customer',
          maxResults: 500,
          orderBy: 'email',
        });

        const rawUsers = res.data.users || [];
        usersList = rawUsers
          .filter((u) => u.primaryEmail && !u.suspended)
          .map((u) => ({
            email: u.primaryEmail!.toLowerCase(),
            name: u.name?.fullName || u.name?.givenName || u.primaryEmail!.split('@')[0],
          }));
      } catch (err: any) {
        console.error('[WorkspaceDomainService] Directory API error:', err);
        throw new Error(
          `Directory API Sync Notice: ${err.message}.\n\nTwo quick fixes:\n1. Enable the "Admin SDK API" in Google Cloud Console (https://console.cloud.google.com/apis/library/admin.googleapis.com) and wait 1 minute for Google auth propagation.\n2. Or paste your domain's email addresses below to connect them directly via Domain-Wide Delegation!`
        );
      }
    }

    if (usersList.length === 0) {
      throw new Error('No user inboxes were found. Please check the domain or enter the email addresses.');
    }

    // Create or update domain record
    const domainRecord: WorkspaceDomain = {
      id: uuidv4(),
      domain: detectedDomain,
      adminEmail: adminEmail.trim().toLowerCase(),
      serviceAccountClientEmail: clientEmail.trim(),
      serviceAccountPrivateKey: privateKey,
      serviceAccountClientId: clientId,
      status: 'connected',
      lastSyncedAt: Date.now(),
      inboxesCount: usersList.length,
      createdAt: Date.now(),
    };

    db.saveDomain(domainRecord);

    // Register all inboxes
    const accounts: GoogleAccount[] = [];
    for (const u of usersList) {
      const account: GoogleAccount = {
        id: uuidv4(),
        email: u.email,
        name: u.name || u.email.split('@')[0],
        authType: 'service_account',
        domainId: domainRecord.id,
        serviceAccountClientEmail: clientEmail,
        serviceAccountPrivateKey: privateKey,
        dailyLimit: dailyLimitPerInbox,
        sentToday: 0,
        lastResetDate: new Date().toISOString().slice(0, 10),
        minDelaySeconds: 60,
        status: 'active',
        createdAt: Date.now(),
      };

      accounts.push(account);
    }

    db.saveAccountsBulk(accounts);

    return {
      domain: domainRecord,
      inboxes: accounts,
      discoveredCount: accounts.length,
    };
  }

  /**
   * Bulk import inboxes from pasted text (e.g. email:password:name)
   */
  public static bulkImportAppPasswords(rawText: string, defaultLimit = 40): {
    imported: GoogleAccount[];
    count: number;
  } {
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const imported: GoogleAccount[] = [];

    for (const line of lines) {
      const parts = line.split(/[\t,|:]+/).map((p) => p.trim());
      const email = parts.find((p) => p.includes('@'));
      if (!email) continue;

      const otherParts = parts.filter((p) => p !== email);
      const appPassword = otherParts.find((p) => p.length >= 16) || otherParts[0] || '';
      const name = otherParts.find((p) => p !== appPassword) || email.split('@')[0];

      const account: GoogleAccount = {
        id: uuidv4(),
        email: email.toLowerCase(),
        name,
        authType: 'app_password',
        appPassword,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        dailyLimit: defaultLimit,
        sentToday: 0,
        lastResetDate: new Date().toISOString().slice(0, 10),
        minDelaySeconds: 60,
        status: 'active',
        createdAt: Date.now(),
      };

      imported.push(account);
    }

    if (imported.length > 0) {
      db.saveAccountsBulk(imported);
    }

    return {
      imported,
      count: imported.length,
    };
  }
}
