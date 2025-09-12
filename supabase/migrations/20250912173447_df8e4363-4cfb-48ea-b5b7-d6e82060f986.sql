-- Add scan tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS scan_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scan_count_date date NOT NULL DEFAULT '1970-01-01',
  ADD COLUMN IF NOT EXISTS timezone text;

-- RPC function to increment scan if allowed with timezone-aware daily reset
DROP FUNCTION IF EXISTS public.increment_scan_if_allowed(uuid, boolean);
CREATE OR REPLACE FUNCTION public.increment_scan_if_allowed(p_user_id uuid, p_check boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_ispremium boolean;
  v_timezone text;
  v_today date;
  v_scan_count integer;
  v_scan_count_date date;
  v_remaining integer;
BEGIN
  -- Lock the user's profile row to avoid race conditions
  SELECT ispremium, timezone, scan_count, scan_count_date
    INTO v_ispremium, v_timezone, v_scan_count, v_scan_count_date
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'remaining', 0, 'error', 'profile_not_found');
  END IF;

  IF v_timezone IS NULL OR v_timezone = '' THEN
    v_timezone := 'UTC';
  END IF;

  -- Compute today's date in the user's timezone
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE v_timezone)::date;

  -- Premium users have unlimited scans
  IF v_ispremium THEN
    RETURN json_build_object('success', true, 'remaining', -1);
  END IF;

  -- Reset count if the stored date isn't today (automatic daily reset)
  IF v_scan_count_date IS DISTINCT FROM v_today THEN
    v_scan_count := 0;
    v_scan_count_date := v_today;

    UPDATE public.profiles
    SET scan_count = v_scan_count,
        scan_count_date = v_scan_count_date
    WHERE id = p_user_id;
  END IF;

  -- Check mode: don't increment, just return remaining after possible reset
  IF p_check THEN
    v_remaining := GREATEST(3 - v_scan_count, 0);
    RETURN json_build_object('success', true, 'remaining', v_remaining);
  END IF;

  -- Enforce free user limit
  IF v_scan_count >= 3 THEN
    RETURN json_build_object('success', false, 'remaining', 0);
  END IF;

  -- Increment scan count
  v_scan_count := v_scan_count + 1;
  UPDATE public.profiles
  SET scan_count = v_scan_count,
      scan_count_date = v_scan_count_date
  WHERE id = p_user_id;

  v_remaining := GREATEST(3 - v_scan_count, 0);
  RETURN json_build_object('success', true, 'remaining', v_remaining);
END;
$$;