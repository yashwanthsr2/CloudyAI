-- ====================================================================
-- PRIVACLOUD AI — Database Schema & Security Policies (v2.0 Extreme)
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Files Table
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    storage_path_original TEXT NOT NULL,
    storage_path_masked TEXT,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/jpg', 'image/png')),
    risk_level TEXT NOT NULL DEFAULT 'NONE' CHECK (risk_level IN ('HIGH', 'MEDIUM', 'LOW', 'NONE')),
    risk_reason TEXT,
    detected_info JSONB NOT NULL DEFAULT '{"aadhaar": 0, "pan": 0, "phone": 0, "email": 0}'::jsonb,
    scan_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (scan_status IN ('PENDING', 'SCANNING', 'COMPLETED', 'FAILED')),
    masking_status TEXT NOT NULL DEFAULT 'NONE' CHECK (masking_status IN ('NONE', 'MASKED', 'FAILED')),
    ocr_confidence NUMERIC DEFAULT 0,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_risk_level ON public.files(risk_level);

-- 2. Shares Table
CREATE TABLE IF NOT EXISTS public.shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    authorized_email TEXT NOT NULL,
    otp_hash TEXT,
    otp_expires_at TIMESTAMPTZ,
    otp_attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'OTP_PENDING', 'VERIFIED', 'DOWNLOADING', 'USED', 'EXPIRED', 'REVOKED')),
    verified_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shares_token_hash ON public.shares(token_hash);
CREATE INDEX IF NOT EXISTS idx_shares_file_id ON public.shares(file_id);
CREATE INDEX IF NOT EXISTS idx_shares_status ON public.shares(status);

-- 3. Security Events Table (Audit Log)
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
    share_id UUID REFERENCES public.shares(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'FILE_UPLOAD', 'SCAN_COMPLETED', 'MASK_CREATED', 
        'SHARE_CREATED', 'SHARE_REVOKED', 'OTP_REQUESTED', 
        'OTP_VERIFIED', 'OTP_REJECTED', 'DOWNLOAD_COMPLETED', 
        'ACCESS_DENIED', 'LINK_EXPIRED'
    )),
    event_status TEXT NOT NULL CHECK (event_status IN ('SUCCESS', 'FAILURE', 'WARNING', 'INFO')),
    safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

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

-- Shares Policies
DROP POLICY IF EXISTS "Users can view shares for their files" ON public.shares;
CREATE POLICY "Users can view shares for their files"
    ON public.shares FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.files
            WHERE public.files.id = public.shares.file_id
            AND public.files.user_id = auth.uid()
        )
    );

-- Security Events Policies
DROP POLICY IF EXISTS "Users can view their own security events" ON public.security_events;
CREATE POLICY "Users can view their own security events"
    ON public.security_events FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Atomic RPC Function for One-Time Download Claim (Prevents race conditions)
CREATE OR REPLACE FUNCTION claim_share_download(p_token_hash TEXT, p_email TEXT)
RETURNS TABLE (
    share_id UUID,
    file_id UUID,
    storage_path_masked TEXT,
    filename TEXT
) AS $$
DECLARE
    v_share public.shares%ROWTYPE;
    v_file public.files%ROWTYPE;
BEGIN
    -- Select share with row locking to ensure atomic consumption
    SELECT * INTO v_share
    FROM public.shares
    WHERE token_hash = p_token_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SHARE_NOT_FOUND';
    END IF;

    IF v_share.status = 'USED' THEN
        RAISE EXCEPTION 'SHARE_ALREADY_USED';
    END IF;

    IF v_share.status = 'REVOKED' THEN
        RAISE EXCEPTION 'SHARE_REVOKED';
    END IF;

    IF now() > v_share.expires_at THEN
        UPDATE public.shares SET status = 'EXPIRED' WHERE id = v_share.id;
        RAISE EXCEPTION 'SHARE_EXPIRED';
    END IF;

    IF lower(v_share.authorized_email) <> lower(p_email) THEN
        RAISE EXCEPTION 'EMAIL_MISMATCH';
    END IF;

    IF v_share.status <> 'VERIFIED' THEN
        RAISE EXCEPTION 'OTP_NOT_VERIFIED';
    END IF;

    -- Fetch associated file
    SELECT * INTO v_file
    FROM public.files
    WHERE id = v_share.file_id;

    -- Mark share as USED atomically
    UPDATE public.shares
    SET status = 'USED', used_at = now()
    WHERE id = v_share.id;

    RETURN QUERY
    SELECT v_share.id, v_file.id, v_file.storage_path_masked, v_file.filename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
