# PRIVACLOUD AI — Privacy-Aware Cloud Storage and Secure File Sharing

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Frontend: React + Vite](https://img.shields.io/badge/Frontend-React_18_+_Vite-blue.svg)](https://vitejs.dev/)
[![Backend: Node + Express](https://img.shields.io/badge/Backend-Node.js_LTS_+_Express-green.svg)](https://expressjs.com/)
[![Database: Supabase](https://img.shields.io/badge/Database-Supabase_PostgreSQL-emerald.svg)](https://supabase.com/)
[![Security: RLS & Zero-Plaintext](https://img.shields.io/badge/Security-RLS_+_Zero--Plaintext_PII-red.svg)]()
[![Automated Tests: 26/26 Passed](https://img.shields.io/badge/Tests-26%2F26%20Passed-brightgreen.svg)]()

> **Tagline:** *Your Cloud. Your Privacy. Your Control.*  
> **Project Description:** AI-Assisted Privacy-Aware Cloud Storage and Secure One-Time File Sharing.  
> **Context:** Individual B.Tech Computer Science Cloud Computing Mini-Project.

---

## 🌟 Executive Summary

**PRIVACLOUD AI** is an enterprise-grade, privacy-first cloud storage and document sharing platform. It bridges the critical vulnerability in consumer cloud drives where users upload and share sensitive identity records (Aadhaar cards, PAN cards, phone numbers, email addresses) without content visibility or recipient controls.

Upon image upload, PRIVACLOUD AI executes server-side Optical Character Recognition (OCR) via **Tesseract.js**, matches deterministic regular expressions for Indian identity PII, calculates a strict priority risk classification, automatically generates a permanently masked copy using **Sharp**, and provisions a **Zero-Trust One-Time Ephemeral Transfer Link** guarded by recipient email matching and a 6-digit email OTP.

---

## 🖥️ The Six Visual Core Pages

The application faithfully implements the 6 design references with a cohesive cosmic glassmorphism design system:

| Reference | Page Name | Route | Core Functionality |
| :--- | :--- | :--- | :--- |
| **Ref 1** | **Cosmic Animated Login & Signup** | `/login` | Starfield canvas, smooth password toggle, email validation, and demo fast-track authentication. |
| **Ref 2** | **Cloud File Management Dashboard** | `/`, `/files` | Left navigation sidebar, 100 MB vault quota indicator, KPI risk metric cards, and recent files table. |
| **Ref 3** | **Drag-and-Drop Upload & Real-Time Scan** | `/upload` | Drag-and-drop zone strictly accepting JPG/PNG, 5 MB file size limit, and real-time OCR progress animation. |
| **Ref 4** | **Privacy Analysis & DLP Redaction** | `/privacy-analysis` | Side-by-side comparison of original (owner only) vs. masked image, policy rationale, and category counts. |
| **Ref 5** | **Secure One-to-One Sharing Portal** | `/shares`, `/transfer/:token` | Sender link creation with risk TTL; recipient public transfer portal with 6-digit auto-focus OTP entry. |
| **Ref 6** | **Security Activity & Audit Log Stream** | `/activity` | Chronological audit stream tracking uploads, scans, shares, OTP requests, and atomic download claims. |

---

## ⚖️ Strict Priority Risk Classification

The system enforces a non-arbitrary, strict priority risk model. The highest detected category dictates the risk level and link Time-To-Live (TTL):

| Detected Information | Risk Level | Link Expiry (TTL) | Rationale |
| :--- | :--- | :--- | :--- |
| **Aadhaar** OR **PAN** | 🔴 **HIGH** | **5 minutes** | High-impact national identity identifiers capable of identity theft. |
| **Phone** (without Aadhaar/PAN) | 🟡 **MEDIUM** | **10 minutes** | Direct contact identifier requiring time-bounded access. |
| **Email Only** | 🟢 **LOW** | **15 minutes** | Low-impact contact information. |
| **None** | ⚪ **NONE** | *Safe Sharing* | Clean document with no sensitive entities detected. |

*Note: Expiration is strictly enforced on the server clock. Any request after expiration terminates with an `HTTP 410 Gone` status code.*

---

## 🔒 Security Architecture & Zero-Plaintext Standard

1. **Zero Raw PII Storage:** Neither database tables (`files`, `shares`, `security_events`) nor application logs ever record plaintext Aadhaar numbers, PAN cards, phone numbers, or email strings. Only category counts and risk levels are stored.
2. **256-Bit Cryptographic Tokens:** Generated via `crypto.randomBytes(32)`; stored solely as a SHA-256 hash in the database.
3. **Authorized Recipient Email Validation:** The sender designates exactly ONE recipient email. Access from any other email is denied.
4. **6-Digit Dynamic Email OTP:** Generated with a 5-minute validity window, SHA-256 hashed, and locked out after 5 invalid attempts.
5. **Atomic One-Time Download:** Built on PostgreSQL row-level locks (`SELECT ... FOR UPDATE` via `claim_share_download` RPC). Concurrently claiming the same share is impossible; subsequent requests return `HTTP 410 Gone`.
6. **Pixel-Level Permanent Masking:** Sharp composites solid black rectangles (`#000000`, $RGBA = [0, 0, 0, 255]$) directly into the image raster buffer. The original file remains in private cloud storage and is never exposed to public endpoints.

---

## 🏛️ System Architecture

```
User (Browser)
   │
   ▼
React Frontend (Vite, Tailwind, Canvas Starfield)
   │ (HTTPS / REST)
   ▼
Express.js Backend API (Node.js)
   ├── Auth Middleware (JWT / Demo User)
   ├── Upload Middleware (Multer Memory, 5MB Limit, JPG/PNG Only)
   ├── Preprocessing Engine (Sharp Upscaling >= 1800px, Grayscale)
   ├── OCR Engine (Tesseract.js Worker Threads)
   ├── Regex Scanner Service (Indian PII Patterns)
   ├── Masking Service (Sharp SVG Compositing)
   ├── Email Service (Nodemailer SMTP / Simulation)
   └── Transfer Controller (3-Stage Recipient Handshake)
   │
   ▼
Supabase Cloud
   ├── PostgreSQL 15 Database (files, shares, security_events)
   ├── Row Level Security (auth.uid() = user_id)
   ├── Atomic RPC claim_share_download (SELECT FOR UPDATE)
   └── Encrypted Private S3 Buckets (originals / masked)
```

---

## 🗄️ Database Schema & Migrations

The full database schema is located in `supabase/schema.sql`:

```sql
-- Files Table with Vault Quota Support
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path_original TEXT NOT NULL,
  storage_path_masked TEXT,
  size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  risk_level TEXT DEFAULT 'NONE',
  detected_info JSONB DEFAULT '{}'::jsonb,
  scan_status TEXT DEFAULT 'PENDING',
  masking_status TEXT DEFAULT 'PENDING',
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shares Table with Hashed Tokens & OTP
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  authorized_email TEXT NOT NULL,
  otp_hash TEXT,
  otp_expires_at TIMESTAMPTZ,
  otp_attempts INT DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  verified_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Events Table (Immutable Audit Log)
CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  file_id UUID,
  share_id UUID,
  event_type TEXT NOT NULL,
  event_status TEXT NOT NULL,
  safe_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own files" ON files FOR ALL USING (auth.uid() = user_id);
```

---

## 🚀 Getting Started & Local Execution

### Prerequisites
- Node.js (v18+ or v20+ LTS recommended)
- npm or pnpm

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-username/privacloud-ai.git
cd privacloud-ai

# Install Backend dependencies
cd backend
npm install

# Install Frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables
Copy the sample environment files:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env`:
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Supabase (Optional: uses local mock sandbox if omitted)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# SMTP Configuration (Optional: uses console simulation if omitted)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="PRIVACLOUD AI Security <security@privacloud.ai>"
```

### 3. Launch Development Servers
Run the backend and frontend in separate terminals:

**Backend Server:**
```bash
cd backend
npm start
# Server starts on http://localhost:5000
```

**Frontend Dev Server:**
```bash
cd frontend
npm run dev
# Frontend starts on http://localhost:5173
```

---

## 🧪 Automated Testing Suite

The project includes an automated test suite verifying all 26 core requirements mandated by the specification:

```bash
cd backend
npm test
# Or directly via node test runner:
node --test tests/extreme_master.test.js
```

### Test Suite Execution Output
```
▶ PRIVACLOUD AI — 26 Test Master Verification Suite
  ✔ 1. Successful login validates user credentials and issues session token
  ✔ 2. Invalid login rejects unauthorized or malformed credentials
  ✔ 3. Successful image upload accepts valid PNG and JPEG formats
  ✔ 4. Rejection of PDF strictly rejects non-image formats
  ✔ 5. Rejection of files above 5 MB limit
  ✔ 6. Per-user quota enforcement prevents uploads exceeding 100 MB total
  ✔ 7. Cross-user file access denial prevents accessing another user files
  ✔ 8. Aadhaar detection matches standard and formatted Aadhaar numbers
  ✔ 9. PAN detection matches standard 10-char PAN numbers
  ✔ 10. Phone detection matches 10-digit Indian mobile numbers
  ✔ 11. Email detection matches valid RFC email addresses
  ✔ 12. Correct risk priority: Aadhaar/PAN=HIGH (5m), Phone=MEDIUM (10m), Email=LOW (15m)
  ✔ 13. Original image preservation leaves original buffer completely intact
  ✔ 14. Masked image generation composites opaque masks
  ✔ 15. Masked image visual verification proves pixels inside bounding box are solid black (0,0,0)
  ✔ 16. Correct receiver email matches authorized recipient
  ✔ 17. Incorrect receiver email is denied access
  ✔ 18. Incorrect OTP is denied verification
  ✔ 19. Expired OTP is rejected when time exceeds 5 minutes
  ✔ 20. OTP attempt limit locks verification after 5 failed attempts
  ✔ 21. Expired sharing link returns expired status
  ✔ 22. Revoked sharing link is immediately marked REVOKED
  ✔ 23. Reused sharing link is marked USED after first download
  ✔ 24. Concurrent download attempts cannot double-claim single-use share
  ✔ 25. Original image is inaccessible through public transfer endpoints
  ✔ 26. Actual audit events recorded in security timeline
✔ PRIVACLOUD AI — 26 Test Master Verification Suite (37.48ms)
ℹ tests 26 | pass 26 | fail 0 | duration_ms ~1050ms
```

---

## ☁️ Production Deployment

### Frontend (Vercel)
1. Push code to GitHub.
2. Import repository in [Vercel](https://vercel.com).
3. Set Root Directory to `frontend`.
4. Configure Build Command: `npm run build`, Output Directory: `dist`.
5. Set Environment Variable: `VITE_API_URL=https://your-backend.onrender.com`.

### Backend (Render / Railway)
1. Create a Web Service on [Render](https://render.com).
2. Set Root Directory to `backend`.
3. Set Build Command: `npm install`, Start Command: `node src/server.js`.
4. Configure Environment Variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`.

---

## 📚 Project Documentation

- **Academic Report Outline:** [docs/PROJECT_REPORT.md](file:///c:/Users/sryas/OneDrive/Desktop/Cloudy%20AI/docs/PROJECT_REPORT.md) (17 formal academic sections)
- **PowerPoint Presentation Outline:** [docs/PRESENTATION_OUTLINE.md](file:///c:/Users/sryas/OneDrive/Desktop/Cloudy%20AI/docs/PRESENTATION_OUTLINE.md) (12 slides for viva defense)
- **Viva Preparation & Defense Guide:** [docs/VIVA_PREP.md](file:///c:/Users/sryas/OneDrive/Desktop/Cloudy%20AI/docs/VIVA_PREP.md) (26 technical questions & answers)
- **Live Demo Script:** [docs/DEMO_SCRIPT.md](file:///c:/Users/sryas/OneDrive/Desktop/Cloudy%20AI/docs/DEMO_SCRIPT.md) (Step-by-step evaluator walkthrough)

---

## ⚖️ License
This project is open-source and licensed under the [MIT License](LICENSE).
