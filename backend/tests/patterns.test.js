import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  PII_PATTERNS,
  calculateRisk,
  calculateExpiry,
  generateShareToken,
  hashToken,
  RISK_TTL_MINUTES
} from '../src/utils/patterns.js';

describe('PRIVACLOUD AI — Pattern Recognition & Risk Scoring', () => {

  test('Aadhaar pattern matches valid 12-digit Indian Aadhaar numbers', () => {
    const text = 'User Aadhaar ID is 4567 8901 2345 and alternate 9876-5432-1098.';
    const matches = text.match(PII_PATTERNS.aadhaar);
    assert.ok(matches, 'Should find Aadhaar numbers');
    assert.strictEqual(matches.length, 2, 'Should find exactly 2 Aadhaar numbers');
  });

  test('PAN pattern matches standard 10-character Indian PAN cards', () => {
    const text = 'Employee tax PAN number: ABCDE1234F. Invalid: 12345ABCDE.';
    const matches = text.match(PII_PATTERNS.pan);
    assert.ok(matches, 'Should match valid PAN');
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0], 'ABCDE1234F');
  });

  test('Phone pattern detects 10-digit Indian mobile numbers with and without prefix', () => {
    const text = 'Contact numbers: 9876543210 and +91 9123456789 or 08765432109.';
    const matches = text.match(PII_PATTERNS.phone);
    assert.ok(matches, 'Should match Indian phone numbers');
    assert.strictEqual(matches.length, 3);
  });

  test('Email pattern identifies standard email addresses', () => {
    const text = 'Send reports to compliance.officer@privacloud.ai and ceo@company.in.';
    const matches = text.match(PII_PATTERNS.email);
    assert.ok(matches);
    assert.strictEqual(matches.length, 2);
  });

  test('Risk calculation computes correct weighted scores and levels', () => {
    // Case 1: Low risk (only 1 email = 10 pts)
    const lowRisk = calculateRisk({ aadhaar: 0, pan: 0, phone: 0, email: 1 });
    assert.strictEqual(lowRisk.riskScore, 10);
    assert.strictEqual(lowRisk.riskLevel, 'Low');

    // Case 2: Medium risk (1 PAN = 30 pts)
    const medRisk = calculateRisk({ aadhaar: 0, pan: 1, phone: 0, email: 0 });
    assert.strictEqual(medRisk.riskScore, 30);
    assert.strictEqual(medRisk.riskLevel, 'Medium');

    // Case 3: High risk (1 Aadhaar + 1 PAN = 40 + 30 = 70 pts)
    const highRisk = calculateRisk({ aadhaar: 1, pan: 1, phone: 1, email: 1 });
    assert.strictEqual(highRisk.riskScore, 90);
    assert.strictEqual(highRisk.riskLevel, 'High');

    // Case 4: Capped at 100 maximum
    const maxRisk = calculateRisk({ aadhaar: 3, pan: 2, phone: 5, email: 5 });
    assert.strictEqual(maxRisk.riskScore, 100);
    assert.strictEqual(maxRisk.riskLevel, 'High');
  });

  test('Server-enforced TTL matches specifications: High=5m, Medium=10m, Low=15m', () => {
    assert.strictEqual(RISK_TTL_MINUTES.High, 5);
    assert.strictEqual(RISK_TTL_MINUTES.Medium, 10);
    assert.strictEqual(RISK_TTL_MINUTES.Low, 15);

    const highExpiry = calculateExpiry('High');
    assert.strictEqual(highExpiry.ttlMinutes, 5);
    const expectedDiffHigh = highExpiry.expiresAt.getTime() - Date.now();
    assert.ok(expectedDiffHigh > 4 * 60 * 1000 && expectedDiffHigh <= 5 * 60 * 1000 + 1000);

    const medExpiry = calculateExpiry('Medium');
    assert.strictEqual(medExpiry.ttlMinutes, 10);

    const lowExpiry = calculateExpiry('Low');
    assert.strictEqual(lowExpiry.ttlMinutes, 15);
  });

  test('Share tokens are cryptographically secure and properly hashed with SHA-256', () => {
    const token1 = generateShareToken();
    const token2 = generateShareToken();
    assert.notStrictEqual(token1, token2, 'Generated tokens must be distinct and random');
    assert.strictEqual(token1.length, 64, 'Token should be 64 hex characters (256-bit)');

    const hash1 = hashToken(token1);
    const hash2 = hashToken(token1);
    assert.strictEqual(hash1, hash2, 'Same token must produce identical SHA-256 hash');
    assert.notStrictEqual(token1, hash1, 'Token and hash must be distinct');
  });

});
