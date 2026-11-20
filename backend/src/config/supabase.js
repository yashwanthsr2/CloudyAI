import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_DIR = path.resolve(__dirname, '../../.local_storage');
const DB_FILE = path.join(STORE_DIR, 'db.json');
const BLOBS_DIR = path.join(STORE_DIR, 'blobs');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'privacloud-storage';

export const USER_QUOTA_BYTES = (parseInt(process.env.USER_QUOTA_GB, 10) || 10) * 1024 * 1024 * 1024; // 10 GB per-user quota
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB per file

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
 * High-fidelity persistent & transactional local store for standalone demo & testing
 */
class LocalStoreFallback {
  constructor() {
    this.files = new Map();
    this.shares = new Map();
    this.securityEvents = [];
    this.storageBlobs = new Map(); // path -> { buffer, mimeType }

    this._initStorage();
  }

  _initStorage() {
    try {
      if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
      if (!fs.existsSync(BLOBS_DIR)) fs.mkdirSync(BLOBS_DIR, { recursive: true });

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.files)) {
          for (const f of data.files) this.files.set(f.id, f);
        }
        if (Array.isArray(data.shares)) {
          for (const s of data.shares) this.shares.set(s.id, s);
        }
        if (Array.isArray(data.securityEvents)) {
          this.securityEvents = data.securityEvents;
        }
      }
    } catch (e) {
      console.warn('LocalStore init warning:', e.message);
    }
  }

  _persistDb() {
    try {
      const payload = {
        files: Array.from(this.files.values()),
        shares: Array.from(this.shares.values()),
        securityEvents: this.securityEvents
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (e) {
      console.warn('LocalStore persist error:', e.message);
    }
  }

  _getBlobFilePath(storagePath) {
    const safeName = Buffer.from(storagePath).toString('hex');
    return path.join(BLOBS_DIR, safeName);
  }

  // Storage
  async uploadFile(storagePath, buffer, mimeType) {
    this.storageBlobs.set(storagePath, { buffer, mimeType });
    try {
      const filePath = this._getBlobFilePath(storagePath);
      fs.writeFileSync(filePath, buffer);
    } catch (e) {
      console.warn('Blob write error:', e.message);
    }
    return { data: { path: storagePath }, error: null };
  }

  async downloadFile(storagePath) {
    let file = this.storageBlobs.get(storagePath);
    if (!file) {
      try {
        const filePath = this._getBlobFilePath(storagePath);
        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath);
          file = { buffer, mimeType: 'image/png' };
          this.storageBlobs.set(storagePath, file);
        }
      } catch (e) {
        console.warn('Blob read error:', e.message);
      }
    }
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
    this._persistDb();
    return record;
  }

  async updateFile(fileId, updates) {
    const file = this.files.get(fileId);
    if (!file) return null;
    const updated = { ...file, ...updates };
    this.files.set(fileId, updated);
    this._persistDb();
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
      try {
        const p1 = this._getBlobFilePath(file.storage_path_original);
        if (fs.existsSync(p1)) fs.unlinkSync(p1);
      } catch (e) {}

      if (file.storage_path_masked) {
        this.storageBlobs.delete(file.storage_path_masked);
        try {
          const p2 = this._getBlobFilePath(file.storage_path_masked);
          if (fs.existsSync(p2)) fs.unlinkSync(p2);
        } catch (e) {}
      }
      this.files.delete(fileId);
      // Remove associated shares
      for (const [sId, share] of this.shares.entries()) {
        if (share.file_id === fileId) {
          this.shares.delete(sId);
        }
      }
      this._persistDb();
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
    this._persistDb();
    return record;
  }

  async updateShare(shareId, updates) {
    const share = this.shares.get(shareId);
    if (!share) return null;
    const updated = { ...share, ...updates };
    this.shares.set(shareId, updated);
    this._persistDb();
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
    this._persistDb();
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
