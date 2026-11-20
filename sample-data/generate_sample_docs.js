import sharp from '../backend/node_modules/sharp/lib/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createSampleDocs() {
  console.log('Generating synthetic privacy test documents...');

  // Sample 1: High Risk Document (Aadhaar + PAN + Phone + Email)
  const highRiskSvg = `
    <svg width="800" height="500" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="500" fill="#f8fafc"/>
      <rect x="20" y="20" width="760" height="460" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      
      <!-- Header -->
      <rect x="20" y="20" width="760" height="70" rx="12" fill="#1e293b"/>
      <text x="40" y="62" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#ffffff">REPUBLIC OF INDIA - IDENTITY CARD</text>
      
      <!-- Content -->
      <text x="50" y="140" font-family="Arial, sans-serif" font-size="18" fill="#475569">Name: ARUN KUMAR VERMA</text>
      <text x="50" y="180" font-family="Arial, sans-serif" font-size="18" fill="#475569">DOB: 15/08/1992 | Gender: Male</text>
      
      <!-- Sensitive PII text (Clear black sans-serif font for 100% OCR detection) -->
      <text x="50" y="240" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#0f172a">Aadhaar: 4532 8910 5621</text>
      <text x="50" y="290" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#0f172a">Permanent Account Number: ABCDE1234F</text>
      <text x="50" y="340" font-family="Arial, sans-serif" font-size="20" fill="#0f172a">Mobile: 9876543210</text>
      <text x="50" y="380" font-family="Arial, sans-serif" font-size="20" fill="#0f172a">Email: arun.verma@example.com</text>
      
      <rect x="580" y="120" width="160" height="200" fill="#e2e8f0" stroke="#94a3b8" rx="8"/>
      <text x="630" y="230" font-family="Arial, sans-serif" font-size="14" fill="#64748b">PHOTO</text>
    </svg>
  `;

  // Sample 2: Medium Risk Document (Only PAN + Phone)
  const mediumRiskSvg = `
    <svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill="#f8fafc"/>
      <rect x="20" y="20" width="760" height="410" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      
      <rect x="20" y="20" width="760" height="60" rx="12" fill="#047857"/>
      <text x="40" y="58" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#ffffff">INCOME TAX DEPARTMENT - GOVT OF INDIA</text>
      
      <text x="50" y="140" font-family="Arial, sans-serif" font-size="18" fill="#475569">Cardholder: PRIYA SHARMA</text>
      <text x="50" y="200" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#0f172a">PAN: BKZPS9876M</text>
      <text x="50" y="260" font-family="Arial, sans-serif" font-size="20" fill="#0f172a">Phone: 9123456789</text>
    </svg>
  `;

  // Sample 3: Low Risk / Clean Document (Only email)
  const lowRiskSvg = `
    <svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="400" fill="#f8fafc"/>
      <rect x="20" y="20" width="760" height="360" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      
      <rect x="20" y="20" width="760" height="60" rx="12" fill="#2563eb"/>
      <text x="40" y="58" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#ffffff">CERTIFICATE OF PARTICIPATION</text>
      
      <text x="50" y="150" font-family="Arial, sans-serif" font-size="20" fill="#334155">This certificate is awarded to Rahul Mehta</text>
      <text x="50" y="220" font-family="Arial, sans-serif" font-size="18" fill="#0f172a">Inquiries: info@cloudconference.org</text>
    </svg>
  `;

  const outDir = __dirname;
  await sharp(Buffer.from(highRiskSvg)).png().toFile(path.join(outDir, 'sample_identity_high_risk.png'));
  await sharp(Buffer.from(mediumRiskSvg)).png().toFile(path.join(outDir, 'sample_pan_medium_risk.png'));
  await sharp(Buffer.from(lowRiskSvg)).png().toFile(path.join(outDir, 'sample_cert_low_risk.png'));

  console.log('✅ Generated 3 sample test documents in sample-data/:');
  console.log(' - sample_identity_high_risk.png (Aadhaar + PAN + Phone + Email)');
  console.log(' - sample_pan_medium_risk.png (PAN + Phone)');
  console.log(' - sample_cert_low_risk.png (Email only)');
}

createSampleDocs().catch(console.error);
