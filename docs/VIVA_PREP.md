# PRIVACLOUD AI — Comprehensive Viva Preparation & Defense Guide

This guide prepares you for common technical questions and defense points asked during viva examinations, project reviews, or technical interviews.

---

## 1. Architecture & Cloud Storage

### Q1: What is the architecture of PRIVACLOUD AI?
**Answer:**
PRIVACLOUD AI uses a modern three-tier decoupled architecture:
1. **Frontend**: React (Vite) Single-Page Application styled with Tailwind CSS, using React Router DOM for routing and Recharts for privacy analytics.
2. **Backend**: Node.js with Express providing a RESTful API, Tesseract.js worker threads for OCR extraction, Sharp for image compositing and redaction, and Node's native `crypto` module for secure token generation and hashing.
3. **Database & Storage**: Supabase (PostgreSQL with Row Level Security, Supabase Auth for identity management, and Supabase Storage for encrypted cloud file persistence).

### Q2: Why use Supabase instead of a custom MongoDB or local filesystem?
**Answer:**
- **PostgreSQL Row Level Security (RLS)**: Enforces access control policies at the database engine level (`auth.uid() = user_id`), ensuring tenant isolation even if application code has a bug.
- **Integrated Storage Engine**: Supabase Storage provides S3-compatible private object buckets with programmatic signed URLs and access rules.
- **Enterprise-grade Auth**: Built-in support for secure JWT issuance, password hashing with bcrypt, session refresh, and user lifecycle management.

---

## 2. Privacy & Security Mechanics

### Q3: How does the system guarantee zero-leakage of sensitive personal data?
**Answer:**
- **Zero Raw PII Storage**: The backend never inserts detected Aadhaar numbers, PAN numbers, phone numbers, or email strings into any database table.
- **Metadata Only**: Only aggregated counts (`count_aadhaar`, `count_pan`), computed numeric risk scores, and categorical risk levels are stored.
- **Memory-only Processing**: OCR text strings and bounding boxes exist solely in Node's transient execution memory during the scan request lifecycle and are garbage collected immediately.

### Q4: How is file sharing secured? Why not use sequential database IDs?
**Answer:**
- Sequential IDs (`/transfer/1`, `/transfer/2`) are vulnerable to **Insecure Direct Object Reference (IDOR)** attacks where an attacker enumerates IDs.
- PRIVACLOUD AI generates **256-bit cryptographically secure random tokens** using `crypto.randomBytes(32)`.
- The database stores only the **SHA-256 hash** of the token. Even if an attacker gains read access to the `shares` table, they cannot reconstruct the plaintext share URL.
- Expiration is strictly **enforced on the server clock**: any request after `expires_at` immediately terminates with an `HTTP 410 Gone` status code.

### Q5: What are the risk levels and how are they computed?
**Answer:**
Risk score is a weighted composite metric capped at 100:
$$\text{Score} = \min(100, (\text{Aadhaar} \times 40) + (\text{PAN} \times 30) + (\text{Phone} \times 10) + (\text{Email} \times 10))$$
- **High Risk ($\ge 50$)**: Contains high-impact identity identifiers (e.g. Aadhaar or Aadhaar + PAN). **TTL: 5 minutes**.
- **Medium Risk ($20 - 49$)**: Contains secondary identifiers (e.g. PAN card). **TTL: 10 minutes**.
- **Low Risk ($0 - 19$)**: Contains low-impact contact info or clean documents. **TTL: 15 minutes**.

---

## 3. OCR vs AI / Machine Learning

### Q6: Does PRIVACLOUD AI use Deep Learning or Machine Learning?
**Answer:**
- No. We explicitly use **Optical Character Recognition (OCR) via Tesseract.js** paired with deterministic **Regular Expression (Regex)** pattern matching.
- **Why?**:
  1. **Determinism**: Regex patterns for Aadhaar (`\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b`) and PAN (`\b[A-Z]{5}\d{4}[A-Z]\b`) have legally specified formats. Regex is $100\%$ explainable and does not suffer from generative AI hallucinations or non-deterministic classifications.
  2. **Efficiency**: Does not require heavy GPU infrastructure or costly proprietary LLM API tokens.
  3. **Privacy**: Processing happens on the server without sending user identity documents to third-party AI APIs (like OpenAI or Anthropic).

---

## 4. Image Processing & Masking

### Q7: How does the automatic masking engine work? Can someone remove the mask?
**Answer:**
- Tesseract.js extracts bounding box coordinates (`x0, y0, x1, y1`) for every word matching our regex patterns.
- **Sharp** generates an SVG overlay containing solid black rectangular elements with $+4\text{px}$ safety padding.
- Sharp **composites** this SVG into the image buffer and writes it as a new PNG image.
- **Irreversibility**: The mask is baked directly into the pixel grid. The masked pixels are permanently replaced by black $(0,0,0)$ RGB values. Unlike PDF annotation overlays or CSS styles, there is no underlying layer to peel back.

### Q8: What happens to the original file when a masked copy is created?
**Answer:**
- The original file remains completely unmodified in the user's private storage folder.
- The masked copy is stored as a separate file (`<userId>/masked-<fileId>.png`).
- When a public share link is accessed, only the masked image is ever streamed or downloaded. The original storage path is never exposed to public endpoints.

---

## 5. Potential Extensions & Future Work

### Q9: Why was PDF redaction treated as a stretch goal?
**Answer:**
- True PDF redaction requires removing the underlying vector text stream. Merely drawing a black rectangle over a PDF leaves the selectable text layer underneath intact, allowing anyone to copy/paste the hidden numbers.
- In PRIVACLOUD AI, PDFs can be converted page-by-page into flattened raster images, OCR scanned, masked with Sharp, and saved as flattened images to guarantee safe redaction.

### Q10: How does PRIVACLOUD AI comply with data privacy regulations (e.g. GDPR, DPDP Act)?
**Answer:**
- **Data Minimization (Art. 5(1)(c) GDPR)**: Storing only aggregate counts and risk levels, not the PII itself.
- **Storage Limitation (Art. 5(1)(e) GDPR)**: Automatic server-enforced expiration of public links with HTTP 410.
- **Integrity and Confidentiality**: Strong encryption at rest and in transit via TLS and Supabase RLS.
