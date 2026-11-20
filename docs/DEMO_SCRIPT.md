# PRIVACLOUD AI — 5-Minute Evaluation & Demo Script

This script provides a concise, professional step-by-step walkthrough to demonstrate the complete feature set of **PRIVACLOUD AI** during an evaluation or project presentation.

---

## 🎬 Demo Timeline (Total: 5 Minutes)

### Minute 0:00 – 0:45: Project Overview & Motivation
- **Presenter says:**
  > "Welcome to PRIVACLOUD AI. In today's digital landscape, users frequently upload sensitive identity documents—such as Aadhaar cards, PAN cards, and salary slips—to the cloud, and often need to share them with third parties like banks, landlords, or recruiters. Traditional cloud storage shares the unredacted original file, leading to severe identity theft and privacy leaks.
  > PRIVACLOUD AI introduces an automated, privacy-aware cloud architecture. When you upload a document, our engine scans it using OCR and pattern matching, computes a sensitivity risk score, generates an opaque redacted copy, and enforces server-side time-to-live (TTL) expiration on all shareable links. Raw PII is never persisted."

---

### Minute 0:45 – 1:30: Vault Authentication & Dashboard
1. Open the frontend at `http://localhost:5173`.
2. Demonstrate **Supabase Auth**:
   - Show signup / login interface.
   - Click the **"Quick Demo Login"** button or enter credentials.
3. Arrive at the **Dashboard**:
   - Highlight the dark-themed UI with status metrics:
     - Total Vault Files
     - High Risk Documents
     - Active Share Links
     - Total Masked Views
   - Explain that storage is isolated per user using **Supabase Row Level Security (RLS)**.

---

### Minute 1:30 – 2:45: File Upload, OCR Privacy Scanner & Masking
1. Navigate to **Upload & Scan** (`/upload`).
2. Select `sample_identity_high_risk.png` from `sample-data/`:
   - Click **"Upload & Privacy Scan"**.
3. Watch the real-time scanning pipeline:
   - File is securely uploaded to private cloud storage (`<userId>/<fileId>-<filename>`).
   - The backend runs **Tesseract.js OCR** to extract text blocks and bounding boxes.
   - Regex patterns match Indian PII:
     - Aadhaar: `\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b` (40 pts)
     - PAN: `\b[A-Z]{5}\d{4}[A-Z]\b` (30 pts)
     - Phone: `\b(?:\+91)?[6-9]\d{9}\b` (10 pts)
     - Email: `\b[A-Za-z0-9._%+-]+@...\b` (10 pts)
4. Show the **Scan Results Card**:
   - Risk score: **90/100 (High Risk)**.
   - PII counts breakdown (1 Aadhaar, 1 PAN, 1 Phone, 1 Email).
   - Click **"Preview Mask"**:
     - Display the **Masked Copy Modal**. Notice the solid black rectangles drawn with **Sharp** that completely cover the sensitive numbers and letters.
     - Emphasize: *The original file remains unmodified in the private vault; only the masked copy is exposed.*

---

### Minute 2:45 – 3:45: Secure Sharing Links & Server-Enforced TTL
1. Click **"Create Share Link"** on the scanned document.
2. Highlight the risk-based policy:
   - High Risk documents receive a strict **5-minute TTL**.
   - Medium Risk documents receive a **10-minute TTL**.
   - Low Risk documents receive a **15-minute TTL**.
3. Point out security mechanics:
   - Raw token is a cryptographically secure 256-bit random string (`crypto.randomBytes(32)`).
   - Database stores only the **SHA-256 hash** of the token.
4. Copy the generated URL and open an **Incognito / Private Window** (no login required).
5. Arrive at `/transfer/:token`:
   - Note the **Live Countdown Timer** ticking down.
   - Show the masked document image rendered in the browser.
   - Click **"Download Masked Copy"** (`/api/transfer/:token/download`) to demonstrate safe masked export.
6. Emphasize HTTP 410 Gone:
   - If the link expires, the server returns an HTTP 410 Gone response and refuses to serve the file content.

---

### Minute 3:45 – 4:30: Privacy-Safe Analytics
1. Switch back to the authenticated app and click **Privacy Analytics** (`/analytics`).
2. Demonstrate that **zero plaintext PII** is displayed:
   - **Document Sensitivity Distribution** (Pie chart).
   - **Detected Sensitive Elements Breakdown** (Bar chart showing cumulative counts).
   - **Share Link Lifecycle** (Active vs Expired counts, total views, download events).
3. Reiterate compliance with GDPR / Indian Digital Personal Data Protection Act (DPDP Act).

---

### Minute 4:30 – 5:00: Summary & Q&A
- Summarize key technological highlights:
  1. Full-stack React + Node.js + Supabase architecture.
  2. OCR bounding-box pixel redaction using Sharp.
  3. Server-enforced cryptographic link TTL with HTTP 410 Gone.
  4. Privacy preservation: only counts and metadata saved in DB.
- Open floor for examiner questions.
