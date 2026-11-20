# AI CLOUD DRIVE — Cloud Deployment & Live Access Guide

This guide details the exact steps to deploy **AI CLOUD DRIVE — Privacy-Aware Cloud Storage** to the public internet so that anyone in the world can access it from their phone or laptop.

---

## Architecture Overview

```
[Users Worldwide]
       │
       ▼
[Frontend on Vercel]  ──(API Requests)──▶  [Backend on Render / Railway]
(React + Vite Single-Page App)              (Express + OCR + Sharp + TTL Engine)
                                                  │                  │
                                                  ▼                  ▼
                                         [Supabase Cloud]       [Gmail SMTP]
                                         • PostgreSQL + RLS     • Live 6-digit OTP
                                         • Encrypted Buckets      Dispatch to Inbox
```

---

## Step 1: Set Up Free Supabase (Database & Storage)

1. Go to [supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **"New Project"** and choose any name (e.g. `ai-cloud-drive`).
3. Set a strong database password and select a region near you.
4. Once the project is created:
   * **Run Database Tables**:
     * Open the **SQL Editor** on the left menu.
     * Open the file [`supabase/schema.sql`](../supabase/schema.sql) in your code editor, copy its entire contents, paste it into the Supabase SQL editor, and click **Run**.
     * This creates the `files`, `shares`, `security_events` tables and RLS security policies.
   * **Create Storage Bucket**:
     * Click **Storage** on the left menu.
     * Click **"New Bucket"**, name it `privacloud-storage`.
     * Turn **Public bucket** to `OFF` (private encrypted storage).
     * Click **Save**.
   * **Copy Your API Credentials**:
     * Go to **Project Settings** (gear icon) -> **API**.
     * Copy **Project URL** (`https://xyz.supabase.co`).
     * Copy **anon public** key (`eyJh...`).
     * Copy **service_role secret** key (`eyJh...`).

---

## Step 2: Get Your Gmail App Password (For Real Email OTPs)

1. Open your [Google Account](https://myaccount.google.com).
2. Go to **Security** -> Enable **2-Step Verification** (if not already enabled).
3. Search for or navigate to [App Passwords](https://myaccount.google.com/apppasswords).
4. Name the app `AI Cloud Drive` and click **Create**.
5. Copy the generated **16-character password** (e.g. `abcd efgh ijkl mnop`).

---

## Step 3: Deploy Backend to Render (Free Web Service)

1. Push your repository to your **GitHub** account.
2. Sign up or log in at [render.com](https://render.com).
3. Click **"New +"** -> **Web Service**.
4. Connect your GitHub repository.
5. Configure the service:
   * **Name**: `ai-cloud-drive-backend`
   * **Root Directory**: `backend`
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `node src/server.js`
   * **Instance Type**: `Free`
6. Click **Advanced** -> **Add Environment Variable**:
   | Key | Value |
   | :--- | :--- |
   | `NODE_ENV` | `production` |
   | `PORT` | `5000` |
   | `USER_QUOTA_GB` | `10` |
   | `SUPABASE_URL` | *Your Supabase Project URL* |
   | `SUPABASE_ANON_KEY` | *Your Supabase anon key* |
   | `SUPABASE_SERVICE_ROLE_KEY` | *Your Supabase service_role key* |
   | `SUPABASE_STORAGE_BUCKET` | `privacloud-storage` |
   | `SMTP_SERVICE` | `gmail` |
   | `SMTP_USER` | *your-email@gmail.com* |
   | `SMTP_PASS` | *your-16-character-app-password* |
   | `SMTP_FROM` | `"AI CLOUD DRIVE Security" <your-email@gmail.com>` |
7. Click **Create Web Service**.
8. Render will build and deploy your backend. Copy your public service URL (e.g. `https://ai-cloud-drive-backend.onrender.com`).

---

## Step 4: Deploy Frontend to Vercel (Free)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **"Add New..."** -> **Project**.
3. Select your GitHub repository.
4. Configure the project:
   * **Framework Preset**: `Vite`
   * **Root Directory**: Click `Edit` and select `frontend`.
5. Under **Environment Variables**, add:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://ai-cloud-drive-backend.onrender.com/api` *(Your Render URL + `/api`)* |
   | `VITE_SUPABASE_URL` | *Your Supabase Project URL* |
   | `VITE_SUPABASE_ANON_KEY` | *Your Supabase anon key* |
6. Click **Deploy**.
7. Vercel will build and assign your live domain (e.g. `https://ai-cloud-drive.vercel.app`).

---

## Step 5: Final Cross-Origin Link

1. Go back to your **Render dashboard** for `ai-cloud-drive-backend`.
2. Go to **Environment Variables** and add/update:
   * `FRONTEND_URL` = `https://ai-cloud-drive.vercel.app` *(Your Vercel URL)*
3. Click **Save Changes** (Render will automatically re-deploy in ~30 seconds).

---

## Step 6: Test Worldwide Access

1. Open your Vercel link (`https://ai-cloud-drive.vercel.app`) from:
   * Your smartphone browser.
   * A friend's laptop or incognito tab.
2. Sign in or create an account.
3. Upload an identity document (Aadhaar, PAN, utility bill).
4. Create a 1-to-1 share link to a friend's email.
5. Have your friend open the link on their device:
   * They enter their email.
   * They receive the real 6-digit OTP in their inbox from your Gmail.
   * They enter the code and download the redacted image.
   * Refreshing the link displays `HTTP 410 Gone: Transfer Link Closed`.
