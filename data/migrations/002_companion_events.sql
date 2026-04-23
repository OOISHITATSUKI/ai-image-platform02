-- ============================================================
-- Companion KPI Tracking Schema
-- ============================================================

-- 1. Raw event log table
CREATE TABLE IF NOT EXISTS companion_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  character_id TEXT,
  session_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companion_events_created_at ON companion_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_companion_events_user_id ON companion_events(user_id);
CREATE INDEX IF NOT EXISTS idx_companion_events_event_type ON companion_events(event_type);
CREATE INDEX IF NOT EXISTS idx_companion_events_session_id ON companion_events(session_id);

-- 2. Daily aggregated KPI summary table
CREATE TABLE IF NOT EXISTS companion_kpi_daily (
  date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'all',
  value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  PRIMARY KEY (date, metric_name, segment)
);

CREATE INDEX IF NOT EXISTS idx_companion_kpi_daily_date ON companion_kpi_daily(date DESC);

-- 3. RPC: Count events by trigger
CREATE OR REPLACE FUNCTION count_events_by_trigger(
  p_event_type TEXT,
  p_trigger TEXT,
  p_date DATE
) RETURNS INTEGER AS $$
DECLARE
  result INTEGER;
BEGIN
  SELECT COUNT(*) INTO result
  FROM companion_events
  WHERE event_type = p_event_type
    AND metadata->>'trigger' = p_trigger
    AND DATE(created_at) = p_date;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. RPC: Paid rate by character count
CREATE OR REPLACE FUNCTION calc_paid_rate_by_character_count(p_date DATE)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH user_char_counts AS (
    SELECT
      ce.user_id,
      COUNT(DISTINCT ce.character_id) as char_count
    FROM companion_events ce
    WHERE ce.event_type IN ('companion_session_start', 'companion_message_sent')
      AND DATE(ce.created_at) <= p_date
      AND ce.character_id IS NOT NULL
    GROUP BY ce.user_id
  ),
  user_plans AS (
    SELECT
      ucc.user_id,
      ucc.char_count,
      CASE
        WHEN EXISTS(
          SELECT 1 FROM companion_events pe
          WHERE pe.user_id = ucc.user_id
            AND pe.event_type = 'payment_completed'
        ) THEN true
        ELSE false
      END as is_paid
    FROM user_char_counts ucc
  ),
  bucketed AS (
    SELECT
      CASE
        WHEN char_count = 1 THEN '1'
        WHEN char_count = 2 THEN '2'
        WHEN char_count >= 3 THEN '3_plus'
      END as bucket,
      COUNT(*) FILTER (WHERE is_paid) as paid_count,
      COUNT(*) as total_count
    FROM user_plans
    GROUP BY bucket
  )
  SELECT COALESCE(jsonb_object_agg(
    bucket,
    jsonb_build_object(
      'paid_rate_pct', ROUND((paid_count::NUMERIC / NULLIF(total_count, 0) * 100), 2),
      'paid_count', paid_count,
      'total_count', total_count
    )
  ), '{}'::jsonb) INTO result
  FROM bucketed;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;
