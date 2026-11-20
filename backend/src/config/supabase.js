import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'privacloud-storage';

export const USER_QUOTA_BYTES = 100 * 1024 * 1024; // 100 MB per-user quota
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per file

const isConfigured = 
  SUPABASE_URL.startsWith('http') && 
  SUPABASE_SERVICE_ROLE_KEY && 
  !SUPABASE_URL.includes('your-project-id');

let supabase = null;
if (isConfigured) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

/**
 * High-fidelity in-memory transactional store for standalone demo & testing
 */
class LocalStoreFallback {
  constructor() {
    this.files = new Map();
    this.shares = new Map();
    this.securityEvents = [];
    this.storageBlobs = new Map(); // path -> { buffer, mimeType }
  }

  // Storage
  async uploadFile(storagePath, buffer, mimeType) {
    this.storageBlobs.set(storagePath, { buffer, mimeType });
    return { data: { path: storagePath }, error: null };
  }

  async downloadFile(storagePath) {
    const file = this.storageBlobs.get(storagePath);
    if (!file) return { data: null, error: new Error('File not found in storage') };
    return { data: file.buffer, mimeType: file.mimeType, error: null };
  }

  // Files
  async insertFile(fileRecord) {
    const record = {
      ...fileRecord,
      uploaded_at: new Date().toISOString()
    };
    this.files.set(fileRecord.id, record);
    return record;
  }

  async updateFile(fileId, updates) {
    const file = this.files.get(fileId);
    if (!file) return null;
    const updated = { ...file, ...updates };
    this.files.set(fileId, updated);
    return updated;
  }

  async getFilesByUser(userId) {
    return Array.from(this.files.values())
      .filter(f => f.user_id === userId)
      .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
  }

  async getFileById(fileId) {
    return this.files.get(fileId) || null;
  }

  async deleteFile(fileId) {
    const file = this.files.get(fileId);
    if (file) {
      this.storageBlobs.delete(file.storage_path_original);
      if (file.storage_path_masked) {
        this.storageBlobs.delete(file.storage_path_masked);
      }
      this.files.delete(fileId);
      // Remove associated shares
      for (const [sId, share] of this.shares.entries()) {
        if (share.file_id === fileId) {
          this.shares.delete(sId);
        }
      }
    }
    return true;
  }

  async getUserStorageUsed(userId) {
    let sum = 0;
    for (const file of this.files.values()) {
      if (file.user_id === userId) {
        sum += file.size_bytes || 0;
      }
    }
    return sum;
  }

  // Shares
  async createShare(shareRecord) {
    const record = {
      ...shareRecord,
      created_at: new Date().toISOString()
    };
    this.shares.set(shareRecord.id, record);
    return record;
  }

  async updateShare(shareId, updates) {
    const share = this.shares.get(shareId);
    if (!share) return null;
    const updated = { ...share, ...updates };
    this.shares.set(shareId, updated);
    return updated;
  }

  async getShareByTokenHash(tokenHash) {
    for (const share of this.shares.values()) {
      if (share.token_hash === tokenHash) return share;
    }
    return null;
  }

  async getSharesByFileId(fileId) {
    return Array.from(this.shares.values()).filter(s => s.file_id === fileId);
  }

  async getAllShares() {
    return Array.from(this.shares.values());
  }

  // Security Events
  async recordSecurityEvent(eventRecord) {
    const event = {
      id: crypto.randomUUID(),
      ...eventRecord,
      created_at: new Date().toISOString()
    };
    this.securityEvents.unshift(event);
    return event;
  }

  async getSecurityEvents(filter = {}) {
    let events = [...this.securityEvents];
    if (filter.userId) {
      events = events.filter(e => e.user_id === filter.userId);
    }
    if (filter.eventType) {
      events = events.filter(e => e.event_type === filter.eventType);
    }
    if (filter.eventStatus) {
      events = events.filter(e => e.event_status === filter.eventStatus);
    }
    return events;
  }
}

export const localStore = new LocalStoreFallback();
export { isConfigured, supabase, STORAGE_BUCKET };
