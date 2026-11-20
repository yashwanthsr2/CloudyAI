# PRIVACLOUD AI — Project Specification
Status: FINALIZED

## 1. Overview
PRIVACLOUD AI is a privacy-aware cloud storage and secure file sharing system designed to safeguard sensitive identity information before sharing files.
Files uploaded to a private cloud drive (Supabase Auth + Storage) are scanned via OCR (Tesseract.js) and pattern matching for Indian PII (Aadhaar, PAN, Phone, Email).
A risk score and level (Low, Medium, High) are computed. A masked copy with opaque redaction is automatically created.
Public links are generated with cryptographically secure random tokens and server-enforced risk-based expiration (High: 5m, Medium: 10m, Low: 15m).
Only metadata is stored; raw PII is never persisted.

## 2. Core Requirements
- **Authentication**: Supabase Auth (Signup, Login, Logout, Session management).
- **Private Storage**: Authenticated file upload and listing; originals kept in private folder strictly restricted by user ID.
- **Privacy Scanner**: OCR via Tesseract.js, bounding box extraction, regex pattern matching:
  - Aadhaar: `\b\d{4}\s?\d{4}\s?\d{4}\b` (weight: 40)
  - PAN: `\b[A-Z]{5}\d{4}[A-Z]\b` (weight: 30)
  - Phone: `\b(?:\+91[\-\s]?)?[6-9]\d{9}\b` or `\b\d{10}\b` (weight: 10)
  - Email: `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b` (weight: 10)
  - Score capped at 100.
  - Classification: 0-19 (Low), 20-49 (Medium), 50+ (High).
- **Masked Copy Generation**: Sharp composites black rectangles over sensitive text bounding boxes. Original remains intact.
- **Secure Sharing**:
  - Raw 256-bit token returned in URL (`/transfer/:token`).
  - SHA-256 token hash stored in DB.
  - Server-side TTL enforcement: High = 5 min, Med = 10 min, Low = 15 min.
  - Public transfer endpoint returns HTTP 410 Gone when expired.
  - View & download tracking in `share_events`.
- **Privacy Analytics**: Dashboard displaying counts, risk levels, and share stats without storing or revealing raw sensitive data.
- **Tech Stack**: React (Vite, Tailwind, Lucide, Recharts), Node.js (Express, Tesseract.js, Sharp), Supabase (PostgreSQL, Storage, Auth).
