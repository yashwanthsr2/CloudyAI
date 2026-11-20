# PRIVACLOUD AI — PowerPoint Presentation Outline
## 12-Slide Academic Project Presentation & Defense

---

### Slide 1: Title Slide
- **Title:** PRIVACLOUD AI
- **Subtitle:** AI-Assisted Privacy-Aware Cloud Storage and Secure One-Time File Sharing
- **Tagline:** *Your Cloud. Your Privacy. Your Control.*
- **Presenter:** Individual B.Tech CSE Mini-Project (Cloud Computing)
- **Key Concepts:** Zero-Plaintext Cloud Storage, Data Loss Prevention (DLP), Optical Character Recognition (OCR), Cryptographic Ephemeral Transfer.

---

### Slide 2: Introduction & Motivation
- **The Modern Cloud Dilemma:** Millions of users store and share sensitive documents (Aadhaar cards, PAN cards, bills, tax filings) on public cloud drives (Google Drive, Dropbox, OneDrive).
- **The Risk:** Once a document link is generated, it remains active indefinitely, accessible to anyone who acquires the URL, and exposes unmasked personal identity numbers.
- **The Vision:** Build a zero-knowledge cloud drive that actively shields identity documents through automated scanning, client-safe opaque redaction, and strict one-time cryptographic transfer.

---

### Slide 3: Problem Statement
- **Lack of Content Awareness:** Traditional cloud drives are passive bit-buckets; they cannot detect or alert users when unmasked identity credentials are being exposed.
- **Over-Privileged File Sharing:** Recipients often only need to verify document authenticity, not retain permanent unmasked records of 12-digit Aadhaar or PAN identifiers.
- **Link Leakage & Replay Attacks:** Public links lack single-recipient gating and atomic consumption guarantees, making forwarded links vulnerable to unauthorized scraping.
- **Target Constraints:** Enforce strict JPG/PNG formats (rejecting unsafe PDF vector layers), 5 MB individual limits, and 100 MB user storage quotas.

---

### Slide 4: Existing Systems vs. PRIVACLOUD AI
| Feature | Traditional Cloud Drives | Ephemeral Transfer Tools | PRIVACLOUD AI |
| :--- | :--- | :--- | :--- |
| **PII Detection** | ❌ None | ❌ None | ✅ **Server-Side OCR + Regex** |
| **Automated Masking** | ❌ Manual editing required | ❌ None | ✅ **Sharp SVG Compositing** |
| **Recipient Gate** | ⚠️ Full Account Login required | ❌ Anonymous URL only | ✅ **Authorized Email + 6-Digit OTP** |
| **Link Expiry** | ❌ Indefinite / Manual | ⚠️ Days/Weeks | ✅ **5 / 10 / 15 Min Server TTL** |
| **Consumption** | ❌ Unlimited downloads | ⚠️ Unreliable count limits | ✅ **Atomic PostgreSQL One-Time Claim** |

---

### Slide 5: System Architecture & Data Flow
- **Three-Tier Decoupled Cloud Architecture:**
  1. **Presentation Layer:** React (Vite) Single-Page Application with custom Cosmic Glassmorphism UI (Tailwind CSS, Lucide icons, starfield particle canvas).
  2. **Application / Microservices Layer:** Node.js + Express REST API orchestrating Multer memory streaming, Sharp image preprocessing ($\ge 1800\text{px}$ upscaling), Tesseract.js OCR, and Nodemailer OTP dispatch.
  3. **Cloud Data & Object Storage Layer:** Supabase PostgreSQL with Row Level Security (RLS) policies and encrypted private S3 storage buckets.
- **Visual Callout:** Original files stay permanently private in owner vault; only server-masked variants are ever served to public transfer endpoints.

---

### Slide 6: Technologies & Tooling
- **Frontend:** React 18, Vite, Tailwind CSS, React Router v6, Lucide React, HTML5 Canvas.
- **Backend:** Node.js (v24), Express.js, Tesseract.js (Worker Threads), Sharp (libvips C-bindings).
- **Security & Cryptography:** Node `crypto` (`crypto.randomBytes(32)` for 256-bit entropy, SHA-256 hashing for tokens and OTPs).
- **Database & Storage:** Supabase PostgreSQL 15, PostgreSQL Row-Level Security (RLS), Supabase S3 Object Storage.
- **Transactional Messaging:** Nodemailer SMTP Transporter with HTML email templates and console simulation fallback.

---

### Slide 7: OCR & Visual Redaction Pipeline
- **Step 1 — Preprocessing:** Sharp scales up low-res images to $\ge 1800\text{px}$, converts to grayscale, and applies adaptive contrast normalization to optimize character boundary recognition.
- **Step 2 — Deterministic Detection:**
  - **Aadhaar:** 12-digit triple sequence parsing (`w1 w2 w3`), regex matching, and UIDAI context validation.
  - **PAN:** Legal 10-character alphanumeric structure (`[A-Z]{5}[0-9]{4}[A-Z]`).
  - **Phone / Email:** Valid 10-digit Indian mobile and RFC-compliant email expressions.
- **Step 3 — Irreversible Baking:** Sharp renders an SVG overlay with $+4\text{px}$ coordinate padding and composites solid black boxes directly into the pixel grid ($RGBA = [0, 0, 0, 255]$).

---

### Slide 8: Strict Priority Risk & Server-Enforced TTL
- **Deterministic Priority Table:**
  - 🔴 **HIGH RISK:** Contains Aadhaar or PAN card. **TTL = 5 Minutes**.
  - 🟡 **MEDIUM RISK:** Contains Phone Number (no Aadhaar/PAN). **TTL = 10 Minutes**.
  - 🟢 **LOW RISK:** Contains Email Address only. **TTL = 15 Minutes**.
  - ⚪ **NONE:** Clean document.
- **Server Clock Enforcement:** Link validity is checked at the Express API layer using server UTC timestamps (`expires_at < NOW()`). Any late attempt immediately terminates with `HTTP 410 Gone`.

---

### Slide 9: Secure One-to-One Sharing & Recipient OTP Protocol
- **Sender Action:** Selects file, inputs exactly one authorized recipient email address.
- **Cryptographic Token:** Generates a 256-bit URL-safe token; stores only its SHA-256 hash in the database.
- **Recipient Flow (Zero Login Required):**
  1. Recipient opens `/transfer/:token`.
  2. Enters email address $\rightarrow$ Backend checks match against `authorized_email`.
  3. System generates a 6-digit numeric OTP and delivers it via email (5-minute TTL).
  4. Recipient enters OTP in 6 discrete auto-focus input boxes.
  5. Backend verifies hash, limits attempts to 5, and authorizes one-time download.

---

### Slide 10: Atomic One-Time Download & Concurrency Control
- **The Concurrency Problem:** Multiple parallel download threads or automated curl scripts attempting to consume the same single-use token simultaneously.
- **PostgreSQL Atomic Claim (`claim_share_download`):**
  - Uses `SELECT ... FOR UPDATE` row-level exclusive locks.
  - Checks `status = 'ACTIVE'`, `expires_at > NOW()`, and `otp_verified = true`.
  - Atomically updates status to `'USED'` and records `used_at = NOW()` in the same transaction.
  - Exactly one thread succeeds and streams the masked PNG; all subsequent and concurrent requests return `HTTP 410 Gone`.

---

### Slide 11: Experimental Results & Automated Verification
- **Automated Test Suite:** Built on Node's native test runner (`node --test tests/extreme_master.test.js`).
- **26 Test Cases Executed & Passed (100% Pass Rate in ~1.05s):**
  - Authentication, credential rejection, and cross-user tenant isolation.
  - JPG/PNG format verification and strict PDF rejection.
  - 5 MB individual limit and 100 MB vault quota enforcement.
  - Aadhaar, PAN, phone, and email detection and risk classification.
  - Pixel-level solid black mask verification.
  - Recipient email mismatch denial, OTP expiration, and 5-attempt brute-force protection.
  - Concurrency lock verification and complete audit logging.

---

### Slide 12: Conclusion & Future Scope
- **Project Achievements:**
  - Commercial-grade SaaS implementation delivering all 6 visual design reference pages.
  - Zero raw PII persisted in storage, databases, or logs.
  - End-to-end working demonstration ready for viva evaluation.
- **Future Enhancements:**
  - Client-Side WASM OCR/Redaction (zero server image processing).
  - Dynamic recipient-specific watermarking.
  - WebAuthn / Passkey biometric authentication for recipients.
- **Q&A:** Open for faculty defense and questions.
