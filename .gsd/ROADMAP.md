# PRIVACLOUD AI — Development Roadmap

## Phase 1: Project Setup & Database Architecture (Day 1)
- [x] Configure git, `.gitignore`, initial repository structure
- [x] Initialize Node.js/Express backend with dependencies
- [x] Initialize React/Vite frontend with Tailwind CSS & dependencies
- [x] Create Supabase schema (files, scans, shares, share_events) with RLS policies and storage config
- [x] Configure environment variable templates (`.env.example`)

## Phase 2: Authentication & Storage Infrastructure (Day 2)
- [x] Supabase Auth integration (Signup, Login, Logout)
- [x] Auth middleware in Express (verifying JWT / Supabase tokens)
- [x] File upload API (`POST /api/upload`) with validation (type, size < 5MB)
- [x] Private file storage handling with user folder isolation
- [x] Dashboard & "My Files" list UI (`GET /api/files`)

## Phase 3: Privacy Scanner Engine (Day 3)
- [x] Integrate Tesseract.js for OCR & bounding box extraction
- [x] Implement regex detection for Aadhaar, PAN, Phone, Email
- [x] Scoring algorithm (weighted 40/30/10/10, cap 100) & risk classification (Low/Medium/High)
- [x] API endpoint `POST /api/scan/:file_id`
- [x] Store scan metadata (counts, risk score, level) without raw PII
- [x] Scan results display in UI

## Phase 4: Automatic Masking Engine (Day 4)
- [x] Coordinate mapping & Sharp SVG/overlay compositing
- [x] Masked image generation & storage in private bucket
- [x] Endpoint `POST /api/mask/:file_id` (auto-masking within scan)
- [x] UI side-by-side or toggle preview (Original vs Masked)

## Phase 5: Secure Sharing Links & Transfer Portal (Day 5)
- [x] Cryptographic token generation (`crypto.randomBytes`) & SHA-256 hashing
- [x] Risk-based TTL calculation (High: 5m, Medium: 10m, Low: 15m)
- [x] Endpoint `POST /api/share/:file_id`
- [x] Public endpoint `GET /api/transfer/:token` & `GET /api/transfer/:token/download` with HTTP 410 on expiry
- [x] Public Transfer Page in frontend with masked viewer, countdown timer, download button, expired state
- [x] Event tracking (`share_events`)

## Phase 6: Privacy Analytics & UI Polish (Day 6)
- [x] Aggregated analytics endpoint `GET /api/analytics`
- [x] Analytics dashboard with Recharts (Risk distribution, detected types, link activity)
- [x] Dark theme UI polish, responsive design, notifications/toasts
- [x] Rate limiting & security headers

## Phase 7: Testing, Documentation & Demo Assets (Day 7)
- [x] Unit & integration tests (Regex patterns, scoring, token hashing, TTL logic)
- [x] Sample document generator with synthetic PII
- [x] Comprehensive README with Mermaid architecture diagram
- [x] Demo script & Viva preparation guide
