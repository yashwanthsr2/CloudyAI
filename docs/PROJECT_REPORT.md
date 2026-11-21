# PRIVACLOUD AI — Academic Project Report Outline
## B.Tech Computer Science & Engineering (Cloud Computing Mini-Project)

---

### Table of Contents
1. [Title Page and Metadata](#1-title-page-and-metadata)
2. [Certificate, Declaration and Acknowledgements](#2-certificate-declaration-and-acknowledgements)
3. [Abstract](#3-abstract)
4. [Introduction and Motivation](#4-introduction-and-motivation)
5. [Problem Statement](#5-problem-statement)
6. [Objectives and Scope](#6-objectives-and-scope)
7. [Literature Review and Existing Systems Survey](#7-literature-review-and-existing-systems-survey)
8. [System Architecture and Design](#8-system-architecture-and-design)
9. [Security and Privacy Model](#9-security-and-privacy-model)
10. [Implementation Details](#10-implementation-details)
11. [Testing, Results and Analysis](#11-testing-results-and-analysis)
12. [Demonstrable Use Cases](#12-demonstrable-use-cases)
13. [Limitations and Future Work](#13-limitations-and-future-work)
14. [Cloud Deployment Architecture](#14-cloud-deployment-architecture)
15. [Ethical Considerations](#15-ethical-considerations)
16. [Conclusion](#16-conclusion)
17. [References and Appendices](#17-references-and-appendices)

---

## 1. Title Page and Metadata
- **Project Title:** PRIVACLOUD AI: AI-Assisted Privacy-Aware Cloud Storage and Secure One-Time File Sharing
- **Tagline:** *Your Cloud. Your Privacy. Your Control.*
- **Degree:** Bachelor of Technology (B.Tech) in Computer Science & Engineering
- **Specialization / Domain:** Cloud Computing, Application Security & Data Loss Prevention (DLP)
- **Institution:** Department of Computer Science and Engineering
- **Academic Sprint:** Final Review Submission

---

## 2. Certificate, Declaration and Acknowledgements
- **Certificate:** Formal verification by project supervisor confirming original implementation of the cloud privacy drive and zero-plaintext file sharing architecture.
- **Declaration:** Student affirmation that the design, frontend, Node.js microservices, Tesseract OCR scanner, Sharp visual redaction engine, and 26-test automated verification suite were developed independently.
- **Acknowledgements:** Acknowledgements extended to faculty mentors, open-source contributors (Supabase, Tesseract.js, Sharp, Lucide, Tailwind CSS), and cloud infrastructure providers.

---

## 3. Abstract
In today's digital cloud ecosystem, users routinely upload identity documents, financial statements, and personal records to cloud drives (e.g., Google Drive, Dropbox, OneDrive) without visibility into the sensitive Personally Identifiable Information (PII) contained within them. When sharing documents, users face an "all-or-nothing" dilemma: sharing an image exposes raw credentials (such as 12-digit Aadhaar numbers, 10-character PAN identifiers, mobile numbers, and emails) without recipient restriction or time bounding.

**PRIVACLOUD AI** solves this critical vulnerability through a privacy-aware cloud storage platform built on zero-knowledge and Data Loss Prevention (DLP) principles. Upon uploading an image (JPG, JPEG, PNG, up to 5 MB per file, within a 100 MB per-user vault quota), the system automatically executes server-side Optical Character Recognition (OCR) via Tesseract.js. It deterministically classifies documents into strict priority risk tiers: **HIGH** (Aadhaar or PAN, 5-minute TTL), **MEDIUM** (Phone, 10-minute TTL), **LOW** (Email, 15-minute TTL), and **NONE**. For sensitive files, an opaque, irreversible server-rendered masked copy is synthesized using Sharp compositing, permanently baking solid black rectangles ($#000000$) over detected credentials while preserving the original securely in the owner's private vault. 

Public transfer operates under a **Zero-Trust One-Time Ephemeral Exchange**: the sender assigns a single authorized recipient email; the recipient accesses an unauthenticated portal (`/transfer/:token`) using a 256-bit cryptographically secure token, verifies identity through a time-limited 6-digit email OTP, and performs an atomic single-use download that transitions the share state to `USED` (`HTTP 410 Gone` on subsequent attempts). All operations generate an immutable security audit trail with zero plaintext PII persistence.

---

## 4. Introduction and Motivation
Cloud storage has transitioned from static archiving to collaborative sharing. However, accidental oversharing and identity theft remain pervasive threats:
1. **Unintentional PII Exposure:** Users frequently share identity cards (Aadhaar, PAN) for routine verifications (e.g., hotel check-in, rental agreements, job verification) where the full 12 digits or PAN numbers are unnecessary and dangerous to expose.
2. **Persistent Public Links:** Standard cloud storage links remain active indefinitely unless manually revoked. If leaked or forwarded, unauthorized third parties gain unrestricted access.
3. **Absence of Recipient Validation:** Traditional links do not verify who is downloading the document; anyone holding the URL can view it.
4. **Permanent Digital Footprints:** Cloud platforms frequently store plaintext index tokens and extracted text strings in server databases, creating honeypots for data breaches.

PRIVACLOUD AI was engineered to bridge these gaps, offering an enterprise-grade SaaS experience designed for high-security personal document custody.

### 4.1 Target User Personas & Ecosystem Applications

| User Category | How AI Cloud Drive Helps |
| :--- | :--- |
| **College students** | Share certificates while hiding personal details. |
| **Job applicants** | Share identity documents more safely with HR. |
| **Hospitals** | Share patient documents with sensitive details masked. |
| **Small businesses** | Share invoices and documents while protecting private information. |
| **Employees** | Share office documents with controlled access. |

---

## 5. Problem Statement
To design and construct an end-to-end cloud storage and document transfer system that:
1. Automatically discovers Indian identity PII (Aadhaar, PAN, phone numbers, email addresses) in uploaded raster images without user intervention.
2. Produces an irrecoverable, opaque masked variant while preserving the original pristine document in an encrypted, authenticated vault.
3. Implements strict risk-based Time-To-Live (TTL) server enforcement.
4. Restricts public transfer to exactly one designated recipient email through a two-step handshake: cryptographic token validation + 6-digit dynamic OTP verification.
5. Guarantees atomic one-time download semantics, preventing replay or concurrent double-claim attacks.
6. Enforces a strict Zero-Plaintext Storage standard, logging only privacy-safe aggregate audit events.

---

## 6. Objectives and Scope
### Core Objectives
- **Automated DLP Pipeline:** Integrate high-resolution image preprocessing with OCR and regex engines for deterministic credential detection.
- **Pixel-Level Permanent Redaction:** Replace sensitive coordinate regions with opaque black pixels ($RGBA = [0, 0, 0, 255]$), eliminating client-side inspection vulnerabilities.
- **Cryptographic Ephemeral Sharing:** Employ SHA-256 token hashing, single authorized recipient validation, and transactional database state transitions (`ACTIVE` $\rightarrow$ `USED` / `REVOKED` / `EXPIRED`).
- **Quota & Format Enforcement:** Strictly accept JPG/JPEG/PNG formats (rejecting non-image formats such as PDF), enforcing a 5 MB file size limit and a 100 MB per-user quota.

### System Scope
- **Included:** Authenticated user vault, drag-and-drop uploader with live scanning animation, side-by-side DLP analysis viewer, secure sharing creator, public recipient transfer portal with OTP auto-focus, security audit activity stream, and comprehensive unit/integration test suite.
- **Explicit Exclusions:** PDF documents (due to complex text-layer flattening security risks), multi-party group sharing, and video/audio streaming.

---

## 7. Literature Review and Existing Systems Survey

| System / Platform | Automated PII Detection | Irreversible Image Masking | Recipient Email + OTP Gate | One-Time Atomic Download | Server-Enforced Strict TTL |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Google Drive** | ❌ No | ❌ No | ⚠️ Requires Google Account | ❌ No (Indefinite) | ❌ Manual Revocation |
| **Dropbox Transfer** | ❌ No | ❌ No | ❌ Password only | ⚠️ Custom Tier | ⚠️ Static Date Picker |
| **WeTransfer** | ❌ No | ❌ No | ❌ Link-based | ❌ Multiple downloads | ⚠️ 7-day default |
| **Firefox Send (Archived)**| ❌ No | ❌ No | ❌ Password only | ✅ 1–100 downloads | ✅ 5m–7d |
| **PRIVACLOUD AI** | ✅ **OCR + Regex** | ✅ **Sharp SVG Compositing** | ✅ **Email + 6-Digit OTP** | ✅ **Atomic Single-Use** | ✅ **Strict 5m / 10m / 15m** |

---

## 8. System Architecture and Design
PRIVACLOUD AI employs a decoupled three-tier cloud architecture:
```
+------------------------------------------------------------------+
|                     PRESENTATION TIER (Vite / React)             |
|  - Cosmic Auth (Ref 1)          - Cloud Dashboard (Ref 2)        |
|  - Upload & Scan (Ref 3)        - DLP Analysis (Ref 4)           |
|  - Sharing Portal (Ref 5)       - Security Audit Log (Ref 6)     |
+------------------------------------------------------------------+
                                  │ HTTPS / REST (JSON)
                                  ▼
+------------------------------------------------------------------+
|                      APPLICATION TIER (Node.js / Express)        |
|  - Auth Middleware (JWT / Demo) - Multer 5MB / 100MB Quota Guard |
|  - Preprocessing Engine (Sharp) - OCR Engine (Tesseract.js)      |
|  - Regex Scanner Service        - Masking Service (Sharp SVG)    |
|  - Share / Transfer Controller  - Email Service (Nodemailer)     |
+------------------------------------------------------------------+
                                  │ SQL / Signed S3 URLs
                                  ▼
+------------------------------------------------------------------+
|                      DATA & STORAGE TIER (Supabase / Postgres)   |
|  - PostgreSQL Database Tables (files, shares, security_events)  |
|  - Row Level Security (RLS) Policies (auth.uid() = user_id)     |
|  - Atomic RPC claim_share_download (SELECT FOR UPDATE)           |
|  - Encrypted Supabase Storage Buckets (Private Originals/Masks)  |
+------------------------------------------------------------------+
```

---

## 9. Security and Privacy Model
1. **Zero-Plaintext Policy:** Raw Aadhaar numbers, PAN cards, phone numbers, and email strings are never committed to disk, database, or logging sinks.
2. **256-Bit Cryptographic Tokens:** Generated via `crypto.randomBytes(32)` providing $2^{256}$ entropy; only `crypto.createHash('sha256').update(token).digest('hex')` is stored.
3. **One-Time Email OTP Verification:**
   - Recipient must supply the sender-authorized email.
   - A 6-digit numeric OTP ($100000 - 999999$) is generated, hashed with SHA-256, and assigned a 5-minute validity window.
   - Maximum 5 failed attempts allowed before permanent lockdown (`MAX_ATTEMPTS_EXCEEDED`).
4. **Atomic Claim Concurrency Protection:**
   - PostgreSQL RPC function `claim_share_download` locks the row with `FOR UPDATE`.
   - Checks `status = 'ACTIVE'`, `expires_at > NOW()`, and `otp_verified = true`.
   - Transitions `status` to `'USED'` atomically in the same transaction, guaranteeing that race conditions or concurrent curl requests return `HTTP 410 Gone`.

---

## 10. Implementation Details
### Backend Microservices
- `uploadMiddleware.js`: Validates MIME type strictly (`image/jpeg`, `image/png`), rejects PDFs with `INVALID_FILE_TYPE`, enforces 5 MB limit.
- `ocrService.js`: Sharp auto-upscales images with width/height $< 1800\text{px}$, converts to grayscale, normalizes contrast, and scales coordinate bounding boxes.
- `scannerService.js`: Implements triple-token sequence parsing for Aadhaar (`w1 w2 w3`), regex matching for PAN (`[A-Z]{5}\d{4}[A-Z]`), phone, and email, with contextual keyword boosting (`UIDAI`, `AADHAAR`).
- `maskingService.js`: Renders SVG rectangles with $+4\text{px}$ boundary padding and composites onto the original buffer using `sharp.composite([{ input: svgBuffer }]).png()`.
- `transferController.js`: Manages the three-stage recipient handshake: metadata probe $\rightarrow$ OTP dispatch $\rightarrow$ OTP verification $\rightarrow$ stream masked PNG download.

### Frontend Architecture
- Cosmic design language inspired by modern SaaS interfaces, built with Tailwind CSS, custom canvas starfields, and glassmorphic panels.
- OTP input component with 6 discrete numeric fields, keyboard navigation, auto-focus, backspace handling, and paste detection.

---

## 11. Testing, Results and Analysis
The system underwent rigorous automated testing via `node --test tests/extreme_master.test.js` validating all 26 critical requirements:
- **Test 1–2:** Authentication & credential rejection.
- **Test 3–7:** Format validation (JPG/PNG pass, PDF rejected), 5 MB file size limit, 100 MB per-user quota check, and tenant isolation.
- **Test 8–12:** Indian PII pattern detection (Aadhaar, PAN, phone, email) and strict risk classification (HIGH/MEDIUM/LOW).
- **Test 13–15:** Original preservation and pixel-level black mask verification ($RGBA = [0, 0, 0, 255]$).
- **Test 16–20:** Recipient email matching, invalid email denial, incorrect OTP rejection, OTP expiration, and 5-attempt brute-force lockdown.
- **Test 21–25:** Link expiration (HTTP 410), immediate revocation, atomic single-use transition, concurrent download prevention, and original image privacy isolation.
- **Test 26:** Comprehensive security timeline audit logging.
- **Outcome:** **26/26 tests passed (100% success rate, ~1.05s execution time).**

---

## 12. Demonstrable Use Cases
1. **Confidential Identity Verification:** A job applicant shares a masked Aadhaar card with an HR recruiter where the Aadhaar number is permanently masked, and the link expires after 5 minutes or upon the recruiter's first download.
2. **Secure Real Estate Rental Invoicing:** A tenant shares a utility bill with a landlord, with phone number and personal email masked (Medium Risk, 10-minute TTL).
3. **Emergency Medical Document Sharing:** A patient shares a lab report with a consulting specialist via single-use OTP verification, preventing unauthorized re-distribution.

---

## 13. Limitations and Future Work
- **Limitations:**
  - Raster images only; text-based PDFs are intentionally rejected due to the risk of hidden vector layers.
  - Handwritten identity documents with extreme skew or low contrast may challenge standard OCR models.
- **Future Work:**
  - Client-side WebAssembly (WASM) redaction to eliminate server image transmission entirely.
  - Support for custom dynamic watermarking with recipient email overlays.
  - Mobile biometric authentication (WebAuthn / Passkeys) for recipient verification.

---

## 14. Cloud Deployment Architecture
- **Frontend:** Hosted on Vercel Edge Network with worldwide CDN distribution, custom domain SSL, and automatic branch previews.
- **Backend:** Containerized Node.js service on Render / Railway with environment variable encryption for Supabase and SMTP keys.
- **Database & Storage:** Managed PostgreSQL and S3-compatible Object Storage on Supabase Cloud (AWS region `ap-south-1` Mumbai for Indian data sovereignty).

---

## 15. Ethical Considerations
- **Data Minimization:** Adheres to GDPR and Indian Digital Personal Data Protection Act (DPDPA 2023) by collecting zero unnecessary metadata and retaining zero raw PII.
- **Right to Erasure:** Deleting a vault file permanently purges both the private original and the masked variant from storage.

---

## 16. Conclusion
PRIVACLOUD AI demonstrates that user privacy in cloud storage does not require sacrificing convenience. By unifying automated OCR detection, pixel-level redaction, strict risk-based TTLs, and single-use OTP transfer mechanisms, PRIVACLOUD AI sets a new standard for confidential personal file management.

---

## 17. References and Appendices
1. *The Digital Personal Data Protection Act, 2023*, Ministry of Electronics and Information Technology (MeitY), Government of India.
2. Smith, R. (2007). *An Overview of the Tesseract OCR Engine*. ICDAR.
3. Postel, J. (1982). *Simple Mail Transfer Protocol*. RFC 821.
4. Rescorla, E. (2018). *The Transport Layer Security (TLS) Protocol Version 1.3*. RFC 8446.
5. Supabase Documentation: *Row Level Security (RLS) in PostgreSQL*.
