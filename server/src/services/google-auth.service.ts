import { google } from 'googleapis';
import { db } from '../database/db.js';
import { GoogleAccount } from '../types/index.js';

export class GoogleAuthService {
  public static getOAuth2Client() {
    const settings = db.getSettings();
    if (!settings.googleClientId || !settings.googleClientSecret) {
      throw new Error('Google OAuth credentials not configured in Settings.');
    }

    return new google.auth.OAuth2(
      settings.googleClientId,
      settings.googleClientSecret,
      settings.googleRedirectUri
    );
  }

  public static getAuthUrl(state?: string): string {
    const oauth2Client = this.getOAuth2Client();
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Force consent to ensure refresh token is returned
      scope: scopes,
      state: state || 'google_auth_connect',
    });
  }

  public static async handleCallback(code: string): Promise<Partial<GoogleAccount>> {
    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    if (!userInfo.data.email) {
      throw new Error('Could not retrieve email from Google OAuth.');
    }

    return {
      email: userInfo.data.email,
      name: userInfo.data.name || userInfo.data.email.split('@')[0],
      authType: 'oauth',
      refreshToken: tokens.refresh_token || undefined,
      accessToken: tokens.access_token || undefined,
      tokenExpiry: tokens.expiry_date || undefined,
    };
  }

  public static async getAuthenticatedClientForAccount(account: GoogleAccount) {
    const settings = db.getSettings();
    const oauth2Client = new google.auth.OAuth2(
      settings.googleClientId,
      settings.googleClientSecret,
      settings.googleRedirectUri
    );

    oauth2Client.setCredentials({
      refresh_token: account.refreshToken,
      access_token: account.accessToken,
      expiry_date: account.tokenExpiry,
    });

    // Refresh access token if expired
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.access_token) {
        account.accessToken = tokens.access_token;
      }
      if (tokens.refresh_token) {
        account.refreshToken = tokens.refresh_token;
      }
      if (tokens.expiry_date) {
        account.tokenExpiry = tokens.expiry_date;
      }
      db.saveAccount(account);
    });

    return oauth2Client;
  }
}
