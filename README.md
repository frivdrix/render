# NexusSend - Instantly-Style Cold Email CRM

A high-deliverability Cold Email CRM inspired by Instantly.ai and Smartlead, designed to connect multiple Google Workspace accounts, paste Excel/Google Sheets lead lists, auto-rotate sending inboxes, and track email opens and clicks without triggering Google spam or promotions tabs.

---

## Deliverability Architecture (Primary Tab Guarantee)

1. **Multi-Account Inbox Rotation**:
   - Round-robin outbound dispatch across all connected Google Workspace inboxes.
   - Enforces strict daily quotas (e.g. 30–50 emails/day per inbox) to prevent volume spike flags.
2. **Spintax Engine (`{Hi|Hey|Hello}` & `{{tags}}`)**:
   - Randomizes email copy for each prospect so no two outgoing emails have identical content fingerprints.
   - Supports fallback variable values (e.g. `{{firstName | there}}`, `{{company | your team}}`).
3. **Natural Human Jitter & Sending Windows**:
   - Dynamic delays (e.g. 60–180 seconds randomized jitter) between consecutive sends.
   - Timezone-aware delivery windows (e.g. 09:00 to 17:00, Mon-Fri).
4. **Stealth Open & Click Tracking**:
   - 1x1 zero-cache transparent tracking pixel with no third-party tracker footprints.
   - 100% Plain-Text Mode toggle for VIP and high-security prospect outreach.
5. **Real-Time Deliverability & Spam Score Audit**:
   - Built-in spam trigger keyword analyzer (evaluates subject lines and body copy for spam words).

---

## Quick Start Guide

### 1. Install & Run
```bash
# In the root project directory:
npm run dev
```
This runs both:
- Backend API & Background Queue Dispatcher on `http://localhost:5000`
- React Frontend Dashboard on `http://localhost:5173`

---

## Connecting Google Workspace Accounts

### Method A: Google App Password (Quickest Setup)
1. Go to your [Google Account Security Settings](https://myaccount.google.com/security).
2. Ensure **2-Step Verification** is turned ON.
3. Search for **App Passwords** or visit: `https://myaccount.google.com/apppasswords`.
4. Create an App Password named `NexusSend Cold Email` and copy the 16-character code.
5. In NexusSend, go to **Google Inboxes** -> Click **Connect Google Inbox** -> Enter your Google Workspace email and the 16-character app password.

### Method B: Google Cloud OAuth 2.0 (Direct Gmail API)
1. In the Google Cloud Console, create a project and enable the **Gmail API**.
2. Create **OAuth 2.0 Client Credentials** (Web Application) with redirect URI:
   `http://localhost:5000/api/accounts/oauth/callback`
3. Enter your **Client ID** and **Client Secret** in **Settings**.
4. Click **Sign In with Google Workspace** to authenticate with 1 click.

---

## Pasting Excel & Google Sheets Leads

1. Open any spreadsheet in Microsoft Excel, Google Sheets, or Numbers.
2. Ensure columns have recognizable headers like:
   - `Email` (Required)
   - `First Name`
   - `Company`
   - `Subject` (Optional custom subject line)
   - `Body` / `Message` (Optional custom icebreaker or body)
   - Any custom columns like `city`, `industry`, `icebreaker` (accessible as `{{city}}`, `{{icebreaker}}`)
3. Copy the rows (Ctrl+C / Cmd+C).
4. In your Campaign -> **Leads List** -> Click **Paste Excel / Upload File** -> Paste (Ctrl+V) and click **Import Leads**.

---

## Best Practices for Cold Emailing

- **Keep Daily Sends Under 40/Inbox**: Scale volume horizontally by adding 3–10 Google Workspace accounts rather than sending 200 emails from 1 account.
- **Always Use Spintax**: Use `{Hey|Hi|Hello}` and `{Quick question regarding|Reaching out about}` in your templates.
- **Keep Body Copy Under 120 Words**: Short, conversational messages have a 3x higher reply rate and avoid promotions tab filtering.
