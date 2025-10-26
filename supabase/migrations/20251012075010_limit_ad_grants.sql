-- Add ads_watched_count to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ads_watched_count integer NOT NULL DEFAULT 0;

-- Update RPC function to increment scan if allowed with timezone-aware daily reset and daily_scan_limit
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
  v_daily_scan_limit integer;
  v_ads_watched_count integer;
  v_remaining integer;
BEGIN
  -- Lock the user's profile row to avoid race conditions
  SELECT ispremium, timezone, scan_count, scan_count_date, daily_scan_limit, ads_watched_count
    INTO v_ispremium, v_timezone, v_scan_count, v_scan_count_date, v_daily_scan_limit, v_ads_watched_count
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
    v_daily_scan_limit := 3; -- Reset daily_scan_limit to 3 for free users at midnight
    v_ads_watched_count := 0; -- Reset ads_watched_count at midnight

    UPDATE public.profiles
    SET scan_count = v_scan_count,
        scan_count_date = v_scan_count_date,
        daily_scan_limit = v_daily_scan_limit,
        ads_watched_count = v_ads_watched_count
    WHERE id = p_user_id;
  END IF;

  -- Check mode: don't increment, just return remaining after possible reset
  IF p_check THEN
    v_remaining := GREATEST(v_daily_scan_limit - v_scan_count, 0);
    RETURN json_build_object('success', true, 'remaining', v_remaining, 'ads_watched', v_ads_watched_count);
  END IF;

  -- Enforce free user limit using daily_scan_limit
  IF v_scan_count >= v_daily_scan_limit THEN
    RETURN json_build_object('success', false, 'remaining', 0, 'ads_watched', v_ads_watched_count);
  END IF;

  -- Increment scan count
  v_scan_count := v_scan_count + 1;
  UPDATE public.profiles
  SET scan_count = v_scan_count,
      scan_count_date = v_scan_count_date
  WHERE id = p_user_id;

  v_remaining := GREATEST(v_daily_scan_limit - v_scan_count, 0);
  RETURN json_build_object('success', true, 'remaining', v_remaining, 'ads_watched', v_ads_watched_count);
END;
$$
;

-- RPC function to grant an extra scan
DROP FUNCTION IF EXISTS public.grant_extra_scan(uuid);
CREATE OR REPLACE FUNCTION public.grant_extra_scan(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_ispremium boolean;
  v_daily_scan_limit integer;
  v_scan_count integer;
  v_ads_watched_count integer;
  v_remaining integer;
BEGIN
  -- Lock the user's profile row to avoid race conditions
  SELECT ispremium, daily_scan_limit, scan_count, ads_watched_count
    INTO v_ispremium, v_daily_scan_limit, v_scan_count, v_ads_watched_count
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  -- Premium users don't need extra scans
  IF v_ispremium THEN
    RETURN json_build_object('success', true, 'remaining', -1);
  END IF;

  -- Enforce ads watched limit
  IF v_ads_watched_count >= 3 THEN
    RETURN json_build_object('success', false, 'error', 'ads_limit_reached', 'remaining', GREATEST(v_daily_scan_limit - v_scan_count, 0), 'ads_watched', v_ads_watched_count);
  END IF;

  -- Increment the daily scan limit and ads watched count
  v_daily_scan_limit := v_daily_scan_limit + 1;
  v_ads_watched_count := v_ads_watched_count + 1;

  UPDATE public.profiles
  SET daily_scan_limit = v_daily_scan_limit,
      ads_watched_count = v_ads_watched_count
  WHERE id = p_user_id;

  v_remaining := GREATEST(v_daily_scan_limit - v_scan_count, 0);
  RETURN json_build_object('success', true, 'remaining', v_remaining, 'ads_watched', v_ads_watched_count);
END;
$$;
