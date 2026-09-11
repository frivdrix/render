import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { Lead } from '../types/index.js';

export interface ParsedLeadRow {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  customSubject?: string;
  customBody?: string;
  customFields?: Record<string, string>;
}

export class ExcelService {
  /**
   * Normalize header string to standardized keys
   */
  private static normalizeHeader(header: string): string {
    return header.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  /**
   * Maps an object with arbitrary keys to normalized lead fields
   */
  public static mapRowToLead(row: Record<string, any>, campaignId: string): Lead | null {
    const normalizedKeys: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      if (val !== undefined && val !== null) {
        normalizedKeys[this.normalizeHeader(key)] = String(val).trim();
      }
    }

    // Find email
    let email = '';
    for (const [key, val] of Object.entries(normalizedKeys)) {
      if (key.includes('email') || key === 'e_mail' || key === 'mail') {
        email = String(val);
        break;
      }
    }

    if (!email || !email.includes('@')) {
      return null; // Invalid email
    }

    // Find first name & last name
    let firstName = '';
    let lastName = '';
    for (const [key, val] of Object.entries(normalizedKeys)) {
      if (key === 'first_name' || key === 'firstname' || key === 'fname') {
        firstName = String(val);
      } else if (key === 'last_name' || key === 'lastname' || key === 'lname') {
        lastName = String(val);
      } else if (key === 'name' || key === 'full_name' || key === 'fullname') {
        const parts = String(val).split(' ');
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
      }
    }

    // Find company
    let company = '';
    for (const [key, val] of Object.entries(normalizedKeys)) {
      if (key === 'company' || key === 'company_name' || key === 'companyname' || key === 'organization' || key === 'account') {
        company = String(val);
        break;
      }
    }

    // Find custom subject / body
    let customSubject = '';
    let customBody = '';
    for (const [key, val] of Object.entries(normalizedKeys)) {
      if (key === 'subject' || key === 'email_subject' || key === 'custom_subject') {
        customSubject = String(val);
      } else if (key === 'body' || key === 'email_body' || key === 'main_email' || key === 'message' || key === 'custom_body') {
        customBody = String(val);
      }
    }

    // Collect other remaining columns into customFields
    const standardKeys = new Set([
      'email', 'e_mail', 'mail',
      'first_name', 'firstname', 'fname',
      'last_name', 'lastname', 'lname',
      'name', 'full_name', 'fullname',
      'company', 'company_name', 'companyname', 'organization', 'account',
      'subject', 'email_subject', 'custom_subject',
      'body', 'email_body', 'main_email', 'message', 'custom_body'
    ]);

    const customFields: Record<string, string> = {};
    for (const [key, val] of Object.entries(normalizedKeys)) {
      if (!standardKeys.has(key) && val) {
        customFields[key] = String(val);
      }
    }

    return {
      id: uuidv4(),
      campaignId,
      email,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      company: company || undefined,
      customSubject: customSubject || undefined,
      customBody: customBody || undefined,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      status: 'pending',
      openCount: 0,
      clickCount: 0,
      trackingToken: `${uuidv4().replace(/-/g, '')}`,
      createdAt: Date.now(),
    };
  }

  /**
   * Parse Raw Pasted Text (e.g. copied directly from Excel / Google Sheets with Tab or Comma delimiters)
   */
  public static parsePastedText(pastedText: string, campaignId: string): {
    leads: Lead[];
    detectedColumns: string[];
    totalRows: number;
    validCount: number;
    invalidCount: number;
  } {
    if (!pastedText || !pastedText.trim()) {
      return { leads: [], detectedColumns: [], totalRows: 0, validCount: 0, invalidCount: 0 };
    }

    // Read workbook from pasted raw TSV/CSV string
    const workbook = XLSX.read(pastedText.trim(), { type: 'string', raw: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    const leads: Lead[] = [];
    const detectedColumns = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
    let invalidCount = 0;

    for (const row of jsonData) {
      const lead = this.mapRowToLead(row, campaignId);
      if (lead) {
        leads.push(lead);
      } else {
        invalidCount++;
      }
    }

    return {
      leads,
      detectedColumns,
      totalRows: jsonData.length,
      validCount: leads.length,
      invalidCount,
    };
  }

  /**
   * Parse Uploaded Buffer (.xlsx, .xls, .csv)
   */
  public static parseFileBuffer(buffer: Buffer, campaignId: string): {
    leads: Lead[];
    detectedColumns: string[];
    totalRows: number;
    validCount: number;
    invalidCount: number;
  } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    const leads: Lead[] = [];
    const detectedColumns = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
    let invalidCount = 0;

    for (const row of jsonData) {
      const lead = this.mapRowToLead(row, campaignId);
      if (lead) {
        leads.push(lead);
      } else {
        invalidCount++;
      }
    }

    return {
      leads,
      detectedColumns,
      totalRows: jsonData.length,
      validCount: leads.length,
      invalidCount,
    };
  }
}
