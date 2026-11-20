-- ====================================================================
-- PRIVACLOUD AI — Database Schema & Security Policies
-- ====================================================================

-- 1. Enable pgcrypto / uuid extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Files Table
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);

-- 3. Scans Table (Stores risk metadata only; NEVER stores detected sensitive text)
CREATE TABLE IF NOT EXISTS public.scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL UNIQUE REFERENCES public.files(id) ON DELETE CASCADE,
    risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High')),
    count_aadhaar INTEGER NOT NULL DEFAULT 0,
    count_pan INTEGER NOT NULL DEFAULT 0,
    count_phone INTEGER NOT NULL DEFAULT 0,
    count_email INTEGER NOT NULL DEFAULT 0,
    masked_path TEXT,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scans_file_id ON public.scans(file_id);

-- 4. Shares Table (Cryptographic random token hash with server-enforced TTL)
CREATE TABLE IF NOT EXISTS public.shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    masked_copy_flag BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shares_token_hash ON public.shares(token_hash);
CREATE INDEX IF NOT EXISTS idx_shares_file_id ON public.shares(file_id);

-- 5. Share Events Table (Privacy-preserving access tracking)
CREATE TABLE IF NOT EXISTS public.share_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id UUID NOT NULL REFERENCES public.shares(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('VIEW', 'DOWNLOAD', 'EXPIRED_ATTEMPT')),
    event_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_events_share_id ON public.share_events(share_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;

-- Files Policies
DROP POLICY IF EXISTS "Users can view their own files" ON public.files;
CREATE POLICY "Users can view their own files"
    ON public.files FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own files" ON public.files;
CREATE POLICY "Users can insert their own files"
    ON public.files FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own files" ON public.files;
CREATE POLICY "Users can delete their own files"
    ON public.files FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Scans Policies (Linked via file ownership)
DROP POLICY IF EXISTS "Users can view scans of their files" ON public.scans;
CREATE POLICY "Users can view scans of their files"
    ON public.scans FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.files
            WHERE public.files.id = public.scans.file_id
            AND public.files.user_id = auth.uid()
        )
    );

-- Shares Policies
DROP POLICY IF EXISTS "Users can view shares of their files" ON public.shares;
CREATE POLICY "Users can view shares of their files"
    ON public.shares FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.files
            WHERE public.files.id = public.shares.file_id
            AND public.files.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create shares for their files" ON public.shares;
CREATE POLICY "Users can create shares for their files"
    ON public.shares FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.files
            WHERE public.files.id = public.shares.file_id
            AND public.files.user_id = auth.uid()
        )
    );

-- Storage bucket definition and RLS policies (for Supabase Storage 'privacloud-storage')
-- Run in Supabase SQL Editor:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('privacloud-storage', 'privacloud-storage', false);
--
-- Policy for authenticated uploads into user's folder:
-- CREATE POLICY "Allow user upload" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'privacloud-storage' AND (storage.foldername(name))[1] = auth.uid()::text);
--
-- Policy for user viewing own files:
-- CREATE POLICY "Allow owner select" ON storage.objects
--   FOR SELECT TO authenticated
--   USING (bucket_id = 'privacloud-storage' AND (storage.foldername(name))[1] = auth.uid()::text);
