import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'privacloud-storage';

// Check if valid Supabase URL is configured (not dummy)
const isConfigured = 
  SUPABASE_URL.startsWith('http') && 
  SUPABASE_SERVICE_ROLE_KEY && 
  !SUPABASE_URL.includes('your-project-id');

let supabase = null;
if (isConfigured) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// In-memory fallback mock for offline/standalone execution and automated testing
class LocalStoreFallback {
  constructor() {
    this.files = new Map();
    this.scans = new Map();
    this.shares = new Map();
    this.shareEvents = [];
    this.storageBlobs = new Map(); // key -> Buffer
  }

  // Storage simulation
  async uploadFile(storagePath, buffer, mimeType) {
    this.storageBlobs.set(storagePath, { buffer, mimeType });
    return { data: { path: storagePath }, error: null };
  }

  async downloadFile(storagePath) {
    const file = this.storageBlobs.get(storagePath);
    if (!file) return { data: null, error: new Error('File not found in storage') };
    return { data: file.buffer, mimeType: file.mimeType, error: null };
  }

  // Files simulation
  async insertFile(fileRecord) {
    this.files.set(fileRecord.id, { ...fileRecord, created_at: new Date().toISOString() });
    return this.files.get(fileRecord.id);
  }

  async getFilesByUser(userId) {
    return Array.from(this.files.values()).filter(f => f.user_id === userId);
  }

  async getFileById(fileId) {
    return this.files.get(fileId) || null;
  }

  async deleteFile(fileId) {
    const file = this.files.get(fileId);
    if (file) {
      this.storageBlobs.delete(file.storage_path);
      this.files.delete(fileId);
      this.scans.delete(fileId);
    }
    return true;
  }

  // Scans simulation
  async upsertScan(scanRecord) {
    this.scans.set(scanRecord.file_id, {
      ...scanRecord,
      scanned_at: new Date().toISOString()
    });
    return this.scans.get(scanRecord.file_id);
  }

  async getScanByFileId(fileId) {
    return this.scans.get(fileId) || null;
  }

  // Shares simulation
  async createShare(shareRecord) {
    this.shares.set(shareRecord.id, { ...shareRecord, created_at: new Date().toISOString() });
    return this.shares.get(shareRecord.id);
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

  // Share Events simulation
  async recordShareEvent(eventRecord) {
    const event = { ...eventRecord, id: crypto.randomUUID(), event_time: new Date().toISOString() };
    this.shareEvents.push(event);
    return event;
  }

  async getShareEvents() {
    return [...this.shareEvents];
  }
}

export const localStore = new LocalStoreFallback();
export { isConfigured, supabase, STORAGE_BUCKET };
