import app from './app.js';
import dotenv from 'dotenv';
import { isConfigured } from './config/supabase.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🛡️  AI CLOUD DRIVE Backend Running on port ${PORT}`);
  console.log(`📡  Storage Mode: ${isConfigured ? 'Supabase Cloud (PostgreSQL + RLS + Storage)' : 'Local Sandbox Mock (Offline Ready)'}`);
  console.log(`🔒  Privacy Shield: Active (OCR + Masking Engine + Server TTL)`);
  console.log(`=======================================================`);
});
