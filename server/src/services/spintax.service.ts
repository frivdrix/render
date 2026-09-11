import { Lead } from '../types/index.js';

export class SpintaxService {
  /**
   * Recursively parses spintax format {option1|option2|{nested1|nested2}}
   * Preserves double-brace template variables like {{firstName | default}}
   */
  public static parseSpintax(text: string): string {
    if (!text) return '';

    // Temporarily mask {{...}} variables so spintax parser doesn't treat {{var | fallback}} as spintax
    const varPlaceholders: string[] = [];
    let maskedText = text.replace(/\{\{[^{}]+\}\}/g, (match) => {
      const token = `__VAR_TOKEN_${varPlaceholders.length}__`;
      varPlaceholders.push(match);
      return token;
    });

    // Parse single curly braces {A|B|C}
    const spintaxRegex = /\{([^{}]+)\}/g;
    while (spintaxRegex.test(maskedText)) {
      maskedText = maskedText.replace(spintaxRegex, (_match, group) => {
        const choices = group.split('|');
        const randomIndex = Math.floor(Math.random() * choices.length);
        return choices[randomIndex];
      });
    }

    // Restore {{...}} variables
    varPlaceholders.forEach((origVar, idx) => {
      maskedText = maskedText.replace(`__VAR_TOKEN_${idx}__`, origVar);
    });

    return maskedText;
  }

  /**
   * Replaces dynamic merge tags like {{firstName}}, {{company}}, or {{firstName | default_val}}
   */
  public static replaceVariables(text: string, lead: Partial<Lead>): string {
    if (!text) return '';

    return text.replace(/\{\{\s*([a-zA-Z0-9_]+)(?:\s*\|\s*([^}]+))?\s*\}\}/g, (_match, key, fallback) => {
      const lowerKey = key.toLowerCase();
      let value: string | undefined;

      if (lowerKey === 'firstname' || lowerKey === 'first_name' || lowerKey === 'name') {
        value = lead.firstName;
      } else if (lowerKey === 'lastname' || lowerKey === 'last_name') {
        value = lead.lastName;
      } else if (lowerKey === 'email') {
        value = lead.email;
      } else if (lowerKey === 'company' || lowerKey === 'companyname' || lowerKey === 'company_name') {
        value = lead.company;
      } else if (lowerKey === 'customsubject' || lowerKey === 'subject') {
        value = lead.customSubject;
      } else if (lead.customFields && lead.customFields[key]) {
        value = lead.customFields[key];
      }

      if (value && value.trim().length > 0) {
        return value.trim();
      }

      return fallback ? fallback.trim() : '';
    });
  }

  /**
   * Full personalization process: Spintax first, then lead variables
   */
  public static processText(template: string, lead: Partial<Lead>): string {
    const afterSpintax = this.parseSpintax(template);
    return this.replaceVariables(afterSpintax, lead);
  }

  /**
   * Cold Email Spam & Deliverability Checker
   */
  public static analyzeDeliverability(subject: string, body: string): {
    score: number; // 0 to 100 (higher is better)
    grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    const spamTriggerWords = [
      '100% free', '100% satisfied', 'act now', 'apply now', 'as seen on', 'bargain', 'beneficiary',
      'best price', 'big bucks', 'billion', 'bonus', 'buy now', 'cancel at any time', 'cash bonus',
      'certified', 'cheap', 'claim', 'clearance', 'click below', 'click here', 'congratulations',
      'cures', 'deal', 'dear friend', 'direct marketing', 'discount', 'double your income', 'earn extra cash',
      'eliminate debt', 'exclusive deal', 'expect to earn', 'extra income', 'fast cash', 'financial freedom',
      'free consultation', 'free gift', 'free info', 'free membership', 'free money', 'free sample',
      'free trial', 'get out of debt', 'get paid', 'giveaway', 'guaranteed', 'hidden assets', 'income from home',
      'increase sales', 'instant', 'investment', 'join millions', 'limited time', 'lowest price', 'make money',
      'millionaire', 'miracle', 'money back', 'no catch', 'no cost', 'no credit check', 'no experience',
      'no fees', 'no hidden costs', 'no obligation', 'no purchase necessary', 'no risk', 'no strings attached',
      'not spam', 'obligation', 'off shore', 'one time', 'online marketing', 'open immediately', 'opportunity',
      'order now', 'passwords', 'pennies a day', 'potential earnings', 'prize', 'promise you', 'pure profit',
      'refund', 'remove', 'reverse aging', 'risk free', 'save big', 'save money', 'score', 'secret',
      'special promotion', 'stop snoring', 'terms and conditions', 'this isn\'t spam', 'unlimited',
      'unsecured credit', 'urgent', 'valuable', 'viagra', 'vicodin', 'warranty', 'winner', 'winning',
      'work from home', 'you have been selected'
    ];

    const fullText = `${subject} ${body}`.toLowerCase();

    // Check spam triggers
    const foundTriggers = spamTriggerWords.filter(word => fullText.includes(word));
    if (foundTriggers.length > 0) {
      score -= Math.min(40, foundTriggers.length * 8);
      issues.push(`Found ${foundTriggers.length} spam trigger keywords: "${foundTriggers.slice(0, 4).join('", "')}"`);
      recommendations.push('Rephrase promotional keywords with natural conversational tone.');
    }

    // Check ALL CAPS in subject
    const subjectLetters = subject.replace(/[^a-zA-Z]/g, '');
    if (subjectLetters.length > 5) {
      const upperLetters = subject.replace(/[^A-Z]/g, '');
      const upperRatio = upperLetters.length / subjectLetters.length;
      if (upperRatio > 0.4) {
        score -= 25;
        issues.push('Excessive CAPITAL letters in subject line triggers spam filters.');
        recommendations.push('Use sentence case or lowercase subject lines (e.g. "quick question regarding {{company}}").');
      }
    }

    // Check excessive punctuation (!!! or ??? or $$$)
    if (/[!?$]{2,}/.test(subject) || /[!?$]{3,}/.test(body)) {
      score -= 15;
      issues.push('Multiple exclamation marks or question marks detected.');
      recommendations.push('Keep punctuation minimal and natural.');
    }

    // Check subject length
    const subjectWords = subject.trim().split(/\s+/).filter(Boolean).length;
    if (subjectWords > 9) {
      score -= 10;
      issues.push(`Subject line is relatively long (${subjectWords} words).`);
      recommendations.push('Top cold emailers use 2–6 word casual subject lines.');
    } else if (subjectWords === 0) {
      score -= 30;
      issues.push('Subject line is empty.');
    }

    // Check body length
    const bodyWords = body.trim().split(/\s+/).filter(Boolean).length;
    if (bodyWords > 180) {
      score -= 15;
      issues.push(`Email body is long (${bodyWords} words).`);
      recommendations.push('Keep cold email bodies under 100–120 words for maximum replies.');
    } else if (bodyWords < 15 && bodyWords > 0) {
      score -= 5;
      issues.push('Email body is very short.');
    }

    // Check for Spintax usage
    if (!/\{[^{}]+\|[^{}]+\}/.test(subject) && !/\{[^{}]+\|[^{}]+\}/.test(body)) {
      score -= 10;
      recommendations.push('Tip: Add Spintax variations like "{Hi|Hey|Hello}" to keep inbox patterns randomized.');
    }

    // Check personalization
    if (!/\{\{[^}]+\}\}/.test(subject) && !/\{\{[^}]+\}\}/.test(body)) {
      score -= 10;
      recommendations.push('Tip: Add dynamic variables like {{firstName}} or {{company}} to personalize.');
    }

    score = Math.max(10, Math.min(100, score));

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A+';
    if (score >= 90) grade = 'A+';
    else if (score >= 80) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 50) grade = 'D';
    else grade = 'F';

    return {
      score,
      grade,
      issues,
      recommendations
    };
  }
}
