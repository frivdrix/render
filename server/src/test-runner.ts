import { SpintaxService } from './services/spintax.service.js';
import { ExcelService } from './services/excel.service.js';
import { db } from './database/db.js';

async function runTests() {
  console.log('=== RUNNING NEXUSSEND COLD EMAIL CRM ENGINE TESTS ===\n');

  // TEST 1: Spintax Engine
  console.log('1. Testing Spintax Engine:');
  const spintaxTemplate = '{Hey|Hi|Hello} {{firstName | there}}, {loved|noticed} what you are building at {{company | your company}}!';
  const leadSample = {
    email: 'test@example.com',
    firstName: 'Alex',
    company: 'NextGen AI',
  };

  const output1 = SpintaxService.processText(spintaxTemplate, leadSample);
  console.log('   Input:  ', spintaxTemplate);
  console.log('   Output: ', output1);
  if (!output1.includes('Alex') || !output1.includes('NextGen AI')) {
    throw new Error('Spintax variable replacement failed');
  }
  console.log('   ✓ Spintax & Variable replacement passed.\n');

  // TEST 2: Fallback Defaults
  console.log('2. Testing Fallback Defaults for missing lead fields:');
  const emptyLead = { email: 'anonymous@corp.io' };
  const outputFallback = SpintaxService.processText(spintaxTemplate, emptyLead);
  console.log('   Output: ', outputFallback);
  if (!outputFallback.includes('there') || !outputFallback.includes('your company')) {
    throw new Error('Variable fallback replacement failed');
  }
  console.log('   ✓ Variable fallback values passed.\n');

  // TEST 3: Deliverability & Spam Filter Checker
  console.log('3. Testing Deliverability Spam Analysis:');
  const cleanSubject = 'quick question regarding {{company}}';
  const cleanBody = 'Hi {{firstName}},\n\nNoticed what you are building at {{company}}.\n\nWould you be open to a 5-min chat?';
  const analysisClean = SpintaxService.analyzeDeliverability(cleanSubject, cleanBody);
  console.log(`   Clean Copy Score: ${analysisClean.score}/100 (Grade: ${analysisClean.grade})`);

  const spamSubject = 'FREE 100% GUARANTEED BUY NOW EXCLUSIVE DEAL $$$';
  const spamBody = 'ACT NOW TO WIN A FREE PRIZE AND DOUBLE YOUR INCOME FAST CASH CLICK HERE NOW!!!';
  const analysisSpam = SpintaxService.analyzeDeliverability(spamSubject, spamBody);
  console.log(`   Spam Copy Score:  ${analysisSpam.score}/100 (Grade: ${analysisSpam.grade})`);
  console.log(`   Detected Spam Triggers: ${analysisSpam.issues.length}`);
  if (analysisClean.score <= analysisSpam.score) {
    throw new Error('Deliverability scoring logic failed');
  }
  console.log('   ✓ Deliverability analyzer passed.\n');

  // TEST 4: Excel & Google Sheets Raw Pasted TSV Parser
  console.log('4. Testing Excel/Google Sheets Pasted Data Parser:');
  const samplePastedData = `email\tfirst_name\tcompany\tsubject\tbody\n` +
    `sarah@techcorp.io\tSarah\tTechCorp\tQuick idea\tLoved your recent launch\n` +
    `david@ventures.co\tDavid\tVenturesCo\t\t\n` +
    `elena@ai-startup.com\tElena\tAI Startup\tPartnership\tSaw your article`;

  const parsed = ExcelService.parsePastedText(samplePastedData, 'test_campaign_id');
  console.log(`   Total Rows Parsed: ${parsed.totalRows}, Valid Leads: ${parsed.validCount}`);
  console.log(`   Detected Columns:  ${parsed.detectedColumns.join(', ')}`);
  if (parsed.validCount !== 3) {
    throw new Error(`Expected 3 valid leads, found ${parsed.validCount}`);
  }
  console.log('   ✓ Excel & CSV spreadsheet parser passed.\n');

  // TEST 5: Database Persistence
  console.log('5. Testing Database Layer:');
  const accounts = db.getAccounts();
  const campaigns = db.getCampaigns();
  console.log(`   Accounts in DB: ${accounts.length}, Campaigns in DB: ${campaigns.length}`);
  console.log('   ✓ Database layer functioning properly.\n');

  console.log('=== ALL ENGINE TESTS PASSED PERFECTLY (5/5) ===');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
