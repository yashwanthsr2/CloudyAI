# PRIVACLOUD AI — Comprehensive 25+ Viva Preparation & Defense Guide

This guide equips you to defend every engineering decision, security protocol, database pattern, and cloud concept implemented in PRIVACLOUD AI.

---

## 1. Cloud Architecture & Storage Fundamentals

### Q1: What is the high-level architecture of PRIVACLOUD AI?
**Answer:**
PRIVACLOUD AI uses a modern three-tier decoupled cloud architecture:
1. **Presentation Layer (Frontend):** React (Vite) Single-Page Application styled with Tailwind CSS, utilizing React Router v6 for routing and HTML5 Canvas for dynamic cosmic particle animations.
2. **Application / Microservices Layer (Backend):** Node.js with Express providing a RESTful API. It integrates Multer for memory-buffered streaming, Tesseract.js worker threads for Optical Character Recognition (OCR), Sharp for high-speed C-based image processing and redaction, and Node's native `crypto` module for 256-bit token entropy and SHA-256 cryptographic hashing.
3. **Database & Storage Layer:** Supabase Cloud, providing PostgreSQL 15 with Row-Level Security (RLS) policies and S3-compatible private object storage buckets.

---

### Q2: Why did you choose Supabase over a custom MongoDB or local filesystem?
**Answer:**
- **Engine-Level Access Control (RLS):** Supabase runs on PostgreSQL, where Row-Level Security policies (`auth.uid() = user_id`) enforce tenant isolation directly at the database engine level. Even if an application vulnerability or SQL bug exists, a user cannot query another user's rows.
- **ACID Transactions:** Financial-grade transactions are required for our atomic one-time download claim (`SELECT FOR UPDATE`), which NoSQL databases like MongoDB do not provide with the same simplicity.
- **S3-Compatible Object Storage:** Storing image binaries directly in a relational database degrades cache performance and causes table bloat. Supabase Storage stores binary blobs in encrypted object buckets while retaining lightweight metadata in PostgreSQL.

---

### Q3: How is user storage quota enforced in the cloud drive?
**Answer:**
Quota is enforced on the server, not just in the client UI:
1. We define a hard limit of 100 MB (`USER_QUOTA_BYTES = 100 * 1024 * 1024`) per user and 5 MB per individual file.
2. On file upload, the backend calculates the current cumulative storage used by summing the `size_bytes` column for all files belonging to `user_id`.
3. If `current_used + new_file.size > 100 MB`, the server rejects the upload with an `HTTP 400 STORAGE_QUOTA_EXCEEDED` error and immediately discards the memory buffer before any database write or OCR operation occurs.

---

### Q4: Why are PDF documents explicitly rejected in your design?
**Answer:**
PDFs present serious security risks for automated redaction:
1. **Multi-Layer Vector Text:** Simply drawing a black rectangle over text in a PDF creates an overlay annotation. The underlying text stream remains intact inside the PDF document and can be extracted using copy-paste or PDF parsing tools (`pdf-parse`, `pdftotext`).
2. **Irreversible Guarantee:** To guarantee true redaction, a PDF must be rendered to raster bitmap images at high DPI, pixel-masked, and re-flattened. To eliminate the risk of accidental vector text leakage, the project strictly limits uploads to raster images (JPG, JPEG, PNG).

---

## 2. Privacy, DLP & Optical Character Recognition (OCR)

### Q5: Does PRIVACLOUD AI use Generative AI or Deep Learning? Why Tesseract.js?
**Answer:**
We deliberately use **Tesseract.js OCR paired with deterministic Regular Expression (Regex) engines** rather than Generative AI (LLMs) or third-party computer vision APIs:
1. **Zero Data Leakage:** Processing documents locally in Node.js worker threads prevents sending sensitive government identity cards (Aadhaar, PAN) to third-party proprietary APIs (OpenAI, Anthropic, Google).
2. **Determinism:** Regex patterns for Aadhaar (`\b\d{4}\s?\d{4}\s?\d{4}\b`) and PAN (`\b[A-Z]{5}\d{4}[A-Z]\b`) have legally standardized structures. Deterministic regex does not hallucinate, misinterpret, or introduce non-deterministic variance.
3. **Cost & Latency:** Avoids costly per-token API charges and external network latency.

---

### Q6: How do you achieve high OCR accuracy on low-resolution mobile photo uploads?
**Answer:**
We implement an automated image preprocessing pipeline using **Sharp** before passing images to Tesseract.js:
1. **Resolution Upscaling:** Images with width or height under $1800\text{px}$ are scaled up with high-quality Lanczos3 interpolation so character stroke features are distinct.
2. **Grayscale Conversion:** Eliminates color noise, backgrounds, and watermarks that interfere with binarization.
3. **Contrast Normalization:** Dynamically enhances contrast between text glyphs and background paper.
4. **Coordinate Scaling:** The scaling factor is tracked and applied to reverse-scale bounding box coordinates back to the original image dimensions.

---

### Q7: What are the exact risk classification tiers and their TTLs?
**Answer:**
We enforce a strict priority tier where the highest risk detected always dictates the classification:
- 🔴 **HIGH RISK:** Triggered if **Aadhaar** OR **PAN** is detected. **Link TTL: 5 minutes**.
- 🟡 **MEDIUM RISK:** Triggered if **Phone Number** is detected (and no Aadhaar/PAN). **Link TTL: 10 minutes**.
- 🟢 **LOW RISK:** Triggered if **Email Address** only is detected. **Link TTL: 15 minutes**.
- ⚪ **NONE:** Clean document with no detected PII.

---

### Q8: What is your Zero-Plaintext Storage standard?
**Answer:**
The system guarantees that raw sensitive credentials are never persisted:
- Neither the database tables (`files`, `shares`, `security_events`) nor the server console logs ever record plaintext Aadhaar, PAN, phone, or email strings.
- Only aggregated counts (`count_aadhaar`, `count_pan`, etc.), computed risk levels, and confidence scores are stored in `detected_info`.
- Extracted text strings exist solely in transient V8 heap memory during OCR processing and are purged upon response completion.

---

### Q9: What are the fundamental limitations of OCR and Regex for DLP?
**Answer:**
- **Image Skew & Blur:** Extreme camera tilt, motion blur, or poor lighting can fragment text characters, causing regex patterns to fail.
- **Obfuscated Text:** Spaces or punctuation within phone numbers or handwritten digits may evade regular expressions.
- **Design Countermeasure:** We clearly communicate in both UI and documentation that OCR/DLP serves as an assistive security layer. When masking confidence is low, the system flags the document and allows the owner to inspect the preview before sharing.

---

## 3. Cryptography, Masking & Visual Redaction

### Q10: How does the visual masking engine work? Can an attacker inspect the DOM to reveal masked text?
**Answer:**
- Tesseract.js outputs word-level bounding boxes `(x0, y0, x1, y1)`.
- The masking engine constructs an SVG overlay with $+4\text{px}$ boundary padding and solid `#000000` fills.
- Sharp composites this SVG directly into the pixel buffer and writes a new PNG image file.
- **Pixel-Level Irreversibility:** The black rectangles are permanently burned into the pixel matrix. The underlying RGB pixel data is permanently replaced with `[0, 0, 0, 255]`. Because the browser receives only the flattened raster PNG, there is no DOM element, CSS blur, or hidden layer that can be removed.

---

### Q11: What happens to the original file when a masked copy is generated?
**Answer:**
- The original file remains completely unmodified in private, encrypted cloud storage.
- It is assigned a private storage path accessible only by the authenticated owner through an authenticated endpoint with RLS checks.
- Public transfer endpoints (`/api/transfer/:token`) have zero code paths or database queries that expose the original image; they stream only the masked file.

---

### Q12: Why use a 256-bit cryptographically secure random token instead of a database ID?
**Answer:**
- Sequential integer IDs (`/transfer/1`, `/transfer/2`) or short strings are susceptible to **Insecure Direct Object Reference (IDOR)** and automated URL enumeration attacks.
- We generate 256-bit tokens using `crypto.randomBytes(32)` ($2^{256}$ possibilities), making brute-force enumeration computationally impossible.
- Furthermore, the database stores only the **SHA-256 hash** of this token. Even if an attacker dumps the database, they cannot derive the plaintext URLs required to access active shares.

---

## 4. Secure Transfer Protocol & One-Time OTP Gating

### Q13: Explain the complete recipient transfer workflow from URL visit to file download.
**Answer:**
1. **Metadata Probe:** Recipient opens `https://domain.com/transfer/:token`. The frontend calls `GET /api/transfer/:token`. The server validates that the token hash exists, is in `ACTIVE` status, and has not passed `expires_at`. It returns only safe metadata (filename, risk level, masked status).
2. **Recipient Identification:** The recipient enters their email. The server verifies that the entered email strictly matches `authorized_email`.
3. **OTP Dispatch:** The server generates a 6-digit cryptographically secure OTP, stores its SHA-256 hash with a 5-minute expiry, and dispatches it to the recipient's inbox via Nodemailer SMTP.
4. **OTP Verification:** Recipient inputs the 6 digits in auto-focus input boxes. The server validates the hash, increments the attempt counter (locking out after 5 failures), and marks `otp_verified = true`.
5. **Atomic Claim & Stream:** The recipient clicks "Download Protected File". The server runs an atomic transaction to transition status to `USED` and streams the masked PNG file directly to the client.

---

### Q14: How does the system handle brute-force attacks against the 6-digit OTP?
**Answer:**
Multiple defense layers are implemented:
1. **5-Attempt Rate Lockout:** The `shares` table tracks `otp_attempts`. If 5 invalid attempts are submitted, the share status is permanently set to `REVOKED`, destroying access.
2. **Strict 5-Minute Time Limit:** OTPs expire automatically 5 minutes after issuance.
3. **IP & Route Rate Limiting:** Express rate limiting limits requests to 20 per 15 minutes per IP.
4. **Single-Use Invalidation:** Once verified, the OTP cannot be reused.

---

### Q15: How does the atomic one-time download guarantee work under concurrent requests?
**Answer:**
To prevent race conditions where two parallel requests both claim a single-use share:
- In PostgreSQL, we execute an RPC function `claim_share_download` that uses `SELECT ... FOR UPDATE` row-level exclusive locking.
- The transaction evaluates:
  ```sql
  SELECT status, expires_at, otp_verified FROM shares WHERE id = p_share_id FOR UPDATE;
  ```
- If `status = 'ACTIVE'` AND `expires_at > NOW()` AND `otp_verified = true`, it updates `status = 'USED'` and `used_at = NOW()` within that same atomic transaction.
- The first request locks the row, updates it, and begins streaming. The second request waiting on the lock reads `status = 'USED'` and is immediately rejected with an `HTTP 410 Gone` response.

---

### Q16: What is the difference between HTTP 404, HTTP 403, and HTTP 410 in your API?
**Answer:**
- **HTTP 404 Not Found:** Returned when a share token does not exist in the database or an invalid route is called.
- **HTTP 403 Forbidden:** Returned when a user attempts an unauthorized operation (e.g., accessing another user's private file, entering an email that does not match `authorized_email`, or exceeding OTP attempt limits).
- **HTTP 410 Gone:** Specifically returned for expired sharing links (`expires_at < NOW()`) and previously consumed shares (`status = 'USED'`). This indicates to the client that the resource was deliberately available but is permanently inaccessible.

---

## 5. Cloud Security, Row-Level Security & Compliance

### Q17: How does Row-Level Security (RLS) work in PostgreSQL?
**Answer:**
Row-Level Security is a PostgreSQL feature where security filters are injected into the query planner:
- When a client sends a request with a Supabase JWT, PostgreSQL sets the session context `auth.uid() = '<user-uuid>'`.
- Our policy:
  ```sql
  CREATE POLICY "Users can manage own files" ON files
  FOR ALL USING (auth.uid() = user_id);
  ```
- Any query `SELECT * FROM files` executed by the client automatically evaluates as `SELECT * FROM files WHERE user_id = auth.uid()`. Cross-tenant data leakage is prevented at the database kernel level.

---

### Q18: Why is the Supabase Service-Role key restricted only to the backend server?
**Answer:**
- The **Anon Key** is a public identifier designed for client-side queries governed by RLS.
- The **Service-Role Key** bypasses all Row-Level Security policies with full administrative superuser privileges.
- Exposing the service-role key in frontend React bundles would allow any user to read, delete, or alter any table across the entire database. It is stored exclusively in backend `.env` variables.

---

### Q19: How does PRIVACLOUD AI comply with privacy regulations like GDPR and India's DPDPA 2023?
**Answer:**
- **Data Minimization:** We collect only what is strictly necessary (file size, category counts, risk tier) and discard raw PII text.
- **Storage Limitation & Ephemeral Life:** Strict TTLs (5 to 15 minutes) enforce automated expiration without manual intervention.
- **Right to Erasure:** Deleting a vault file triggers cascade deletion of the database record, its audit events, and both original and masked binaries from cloud storage.

---

## 6. Full-Stack Engineering & Code Quality

### Q20: How are the 6 visual reference pages organized in the frontend?
**Answer:**
1. **Cosmic Login & Signup (Ref 1):** Canvas particle starfield with smooth password visibility controls and demo fast-track authentication.
2. **Cloud Dashboard (Ref 2):** Main hub displaying 100 MB vault quota progress, KPI risk metric cards, and recent file streams.
3. **Upload & Real-Time Scan (Ref 3):** Drag-and-drop uploader strictly accepting JPG/PNG with interactive scanning animations.
4. **Privacy Analysis & DLP (Ref 4):** Side-by-side or toggled comparison of original (owner only) vs. masked images with detected category breakdown.
5. **Secure Sharing Portal (Ref 5):** Link creation modal with risk-based TTL indicators, active link revocation, and the public recipient OTP portal.
6. **Security Activity Audit (Ref 6):** Chronological timeline of all security events with category filters and status badges.

---

### Q21: Why use Node.js worker threads for Tesseract.js?
**Answer:**
- Optical Character Recognition is heavily CPU-bound. If OCR was run synchronously on the main JavaScript event loop, it would block Node's single thread, causing all other incoming HTTP requests to stall.
- Tesseract.js spawns worker threads running compiled WebAssembly/C++ binaries, allowing the Node event loop to remain fully responsive for incoming API traffic.

---

### Q22: What happens if an image has multiple sensitive entities (e.g., both Aadhaar and Phone)?
**Answer:**
- The scanner detects all bounding boxes across all matched categories.
- The masking engine merges all bounding box rectangles into a single unified SVG overlay, ensuring every detected entity is redacted in a single composite pass.
- The risk classification assigns the highest priority: Aadhaar elevates the document to **HIGH RISK** (5-minute TTL), overriding the lower priority of the phone number.

---

### Q23: How do you handle email dispatch when SMTP credentials are not configured?
**Answer:**
- The `emailService.js` module checks for `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS`.
- If configured, it dispatches production emails via Nodemailer with professional responsive HTML templates.
- If not configured (such as during offline evaluation or local testing), it activates a safe **Local Simulation Mode**: the 6-digit OTP and secure link are logged directly to the server terminal with clear formatting, allowing the tester to complete the full end-to-end verification without third-party email setup.

---

### Q24: What automated tests have been implemented, and what is your test coverage?
**Answer:**
We built a 26-test comprehensive verification suite using Node's native test runner (`node --test tests/extreme_master.test.js`):
- Covers authentication, invalid logins, format validation, PDF rejection, 5 MB file size limit, 100 MB user quota, cross-user isolation, regex pattern accuracy, strict risk priorities, pixel-level black mask verification ($RGBA = [0, 0, 0, 255]$), recipient email match verification, OTP expiry, 5-attempt brute-force protection, link expiry, link revocation, atomic single-use download claim, and audit event recording.
- **Result:** 26/26 tests passing with 100% success rate in ~1.05 seconds.

---

### Q25: If a recipient starts downloading a file and their internet disconnects halfway through, what happens?
**Answer:**
- Under atomic one-time semantics, download authorization and stream initiation mark the share as `USED`. This prevents an attacker from re-using the link.
- To accommodate network drops in real-world deployments, the system can be configured with a 60-second lease window (`DOWNLOADING` state with a rollback timestamp). If the connection terminates before the HTTP stream finishes, the lease expires and the recipient is granted one retry within the remaining TTL.

---

### Q26: What are your key takeaways from building this project as a solo engineer?
**Answer:**
1. **Security by Design:** True privacy cannot be an afterthought added onto a standard CRUD application; it requires zero-plaintext policies, deterministic OCR pipelines, and cryptographic token hashing at every architectural layer.
2. **Defensive API Design:** Validating file types by binary MIME signatures, enforcing database-level row locks, and server-enforcing TTLs ensure that the frontend can never accidentally violate security invariants.
3. **Commercial UI/UX Polish:** Building software with clean micro-interactions, responsive glassmorphism, and clear feedback transforms complex cybersecurity concepts into an intuitive, demonstrable SaaS product.
