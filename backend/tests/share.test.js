import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createShareLink, validateShareToken, recordEvent } from '../src/services/shareService.js';
import { localStore } from '../src/config/supabase.js';
import crypto from 'crypto';

describe('PRIVACLOUD AI — Secure Sharing Service & HTTP 410 Gone Expiry', () => {

  test('createShareLink creates token and computes correct risk-based TTL', async () => {
    const fileId = crypto.randomUUID();
    await localStore.insertFile({
      id: fileId,
      user_id: 'test-user',
      filename: 'pan_card.jpg',
      storage_path: 'test-user/pan_card.jpg',
      mime_type: 'image/jpeg',
      size_bytes: 1024
    });

    const share = await createShareLink(fileId, 'High');
    assert.ok(share.rawToken);
    assert.strictEqual(share.ttlMinutes, 5, 'High risk files must have 5 minute TTL');
    assert.ok(new Date(share.expiresAt) > new Date());
  });

  test('validateShareToken grants access before expiration', async () => {
    const fileId = crypto.randomUUID();
    await localStore.insertFile({
      id: fileId,
      user_id: 'test-user',
      filename: 'doc.png',
      storage_path: 'test-user/doc.png',
      mime_type: 'image/png',
      size_bytes: 2048
    });

    const { rawToken } = await createShareLink(fileId, 'Low');
    const validated = await validateShareToken(rawToken);
    assert.ok(validated);
    assert.strictEqual(validated.file_id, fileId);
    assert.strictEqual(validated.masked_copy_flag, true);
  });

  test('validateShareToken throws HTTP 410 Gone when token has expired', async () => {
    const fileId = crypto.randomUUID();
    const rawToken = 'expired-token-' + crypto.randomBytes(16).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Create an already-expired share in localStore
    await localStore.createShare({
      id: crypto.randomUUID(),
      file_id: fileId,
      token_hash: tokenHash,
      // Expired 10 minutes ago
      expires_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      masked_copy_flag: true,
      created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString()
    });

    try {
      await validateShareToken(rawToken);
      assert.fail('Expected HTTP 410 error was not thrown');
    } catch (err) {
      assert.strictEqual(err.status, 410, 'Must return HTTP 410 Gone on expiration');
      assert.strictEqual(err.code, 'LINK_EXPIRED');
    }
  });

  test('Access events (VIEW, DOWNLOAD, EXPIRED_ATTEMPT) are recorded in event log', async () => {
    const shareId = crypto.randomUUID();
    await recordEvent(shareId, 'VIEW');
    await recordEvent(shareId, 'DOWNLOAD');
    await recordEvent(shareId, 'EXPIRED_ATTEMPT');

    const events = await localStore.getShareEvents();
    const shareEvents = events.filter(e => e.share_id === shareId);
    assert.strictEqual(shareEvents.length, 3);
    assert.deepStrictEqual(
      shareEvents.map(e => e.event_type),
      ['VIEW', 'DOWNLOAD', 'EXPIRED_ATTEMPT']
    );
  });

});
