import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { GoogleAccount, Campaign, Lead } from '../types/index.js';
import { GoogleAuthService } from './google-auth.service.js';
import { WorkspaceDomainService } from './workspace-domain.service.js';

export interface SendEmailOptions {
  account: GoogleAccount;
  campaign: Campaign;
  lead: Lead;
  subject: string;
  body: string;
}

export class EmailSenderService {
  /**
   * Constructs 100% Clean, Pure Human Email Content (Zero tracking pixels / Zero link wrapping)
   */
  public static prepareEmailContent(options: {
    campaign: Campaign;
    lead: Lead;
    subject: string;
    body: string;
  }): { text: string; html: string } {
    const { body } = options;
    const plainText = body.replace(/<[^>]+>/g, '').trim();

    return {
      text: plainText,
      html: plainText.replace(/\n/g, '<br/>'),
    };
  }

  /**
   * Sends clean email via native Gmail API (Domain-Wide Delegation or OAuth) or SMTP
   */
  public static async send(options: SendEmailOptions): Promise<{ messageId: string }> {
    const { account, campaign, lead, subject, body } = options;
    const { text, html } = this.prepareEmailContent({ campaign, lead, subject, body });

    if (account.authType === 'service_account' && account.serviceAccountClientEmail && account.serviceAccountPrivateKey) {
      return this.sendViaServiceAccount(account, lead.email, subject, text, html);
    } else if (account.authType === 'oauth' && account.refreshToken) {
      return this.sendViaGmailApi(account, lead.email, subject, text, html);
    } else {
      return this.sendViaSmtp(account, lead.email, subject, text, html);
    }
  }

  /**
   * Domain-Wide Delegation Service Account Gmail API Sender
   */
  private static async sendViaServiceAccount(
    account: GoogleAccount,
    toEmail: string,
    subject: string,
    text: string,
    html: string
  ): Promise<{ messageId: string }> {
    const authClient = WorkspaceDomainService.getJwtClient(
      account.serviceAccountClientEmail!,
      account.serviceAccountPrivateKey!,
      account.email,
      ['https://www.googleapis.com/auth/gmail.send']
    );
    const gmail = google.gmail({ version: 'v1', auth: authClient });

    const fromHeader = account.name ? `"${account.name.replace(/"/g, '')}" <${account.email}>` : account.email;
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;

    const boundary = `_boundary_${Date.now().toString(16)}`;
    const emailLines = [
      `From: ${fromHeader}`,
      `To: ${toEmail}`,
      `Subject: ${utf8Subject}`,
      `MIME-Version: 1.0`,
      `Date: ${new Date().toUTCString()}`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8; format=flowed`,
      `Content-Transfer-Encoding: 7bit`,
      '',
      text,
      '',
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      '',
      html,
      '',
      `--${boundary}--`,
    ];

    const rawMessage = emailLines.join('\r\n');
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return { messageId: res.data.id || `gservice_${Date.now()}` };
  }

  /**
   * Direct Gmail API Sender (OAuth 2.0)
   */
  private static async sendViaGmailApi(
    account: GoogleAccount,
    toEmail: string,
    subject: string,
    text: string,
    html: string
  ): Promise<{ messageId: string }> {
    const authClient = await GoogleAuthService.getAuthenticatedClientForAccount(account);
    const gmail = google.gmail({ version: 'v1', auth: authClient });

    const fromHeader = account.name ? `"${account.name.replace(/"/g, '')}" <${account.email}>` : account.email;
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;

    const boundary = `_boundary_${Date.now().toString(16)}`;
    const emailLines = [
      `From: ${fromHeader}`,
      `To: ${toEmail}`,
      `Subject: ${utf8Subject}`,
      `MIME-Version: 1.0`,
      `Date: ${new Date().toUTCString()}`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8; format=flowed`,
      `Content-Transfer-Encoding: 7bit`,
      '',
      text,
      '',
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      '',
      html,
      '',
      `--${boundary}--`,
    ];

    const rawMessage = emailLines.join('\r\n');
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return { messageId: res.data.id || `gmail_${Date.now()}` };
  }

  /**
   * App Password / SMTP Sender
   */
  private static async sendViaSmtp(
    account: GoogleAccount,
    toEmail: string,
    subject: string,
    text: string,
    html: string
  ): Promise<{ messageId: string }> {
    const transporter = nodemailer.createTransport({
      host: account.smtpHost || 'smtp.gmail.com',
      port: account.smtpPort || 465,
      secure: (account.smtpPort || 465) === 465,
      auth: {
        user: account.email,
        pass: account.appPassword,
      },
    });

    const info = await transporter.sendMail({
      from: account.name ? `"${account.name}" <${account.email}>` : account.email,
      to: toEmail,
      subject,
      text,
      html,
    });

    return { messageId: info.messageId || `smtp_${Date.now()}` };
  }

  /**
   * Send a test email to verify credentials and inbox placement
   */
  public static async sendTestEmail(account: GoogleAccount, toEmail: string): Promise<boolean> {
    const dummyCampaign: Campaign = {
      id: 'test',
      name: 'Deliverability Test',
      status: 'draft',
      subject: 'Deliverability Test from NexusSend Cold Email CRM',
      body: 'Hi there,\n\nThis is a test message to confirm that your Google Workspace sender account is connected and ready to send.\n\nBest regards,\nNexusSend CRM',
      accountIds: [account.id],
      settings: {
        trackOpens: false,
        trackClicks: false,
        plainTextMode: true,
        addUnsubscribeLink: false,
        dailyLimitPerAccount: 40,
        minJitterSeconds: 30,
        maxJitterSeconds: 60,
        sendWindowStart: '00:00',
        sendWindowEnd: '23:59',
        timezone: 'UTC',
        sendDays: [0, 1, 2, 3, 4, 5, 6],
      },
      stats: { totalLeads: 1, sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const dummyLead: Lead = {
      id: 'test_lead',
      campaignId: 'test',
      email: toEmail,
      firstName: 'Sender Test',
      status: 'pending',
      openCount: 0,
      clickCount: 0,
      trackingToken: `test_${Date.now()}`,
      createdAt: Date.now(),
    };

    await this.send({
      account,
      campaign: dummyCampaign,
      lead: dummyLead,
      subject: dummyCampaign.subject,
      body: dummyCampaign.body,
    });

    return true;
  }
}
