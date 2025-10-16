/*
  # Add function to calculate daily statistics

  1. New Functions
    - `calculate_daily_stats()` - Calculates statistics from order_timing table
      - Counts total orders, completed orders, warning orders
      - Calculates average preparation time and total time
      - Counts orders by time buckets (under 15min, 15-30min, over 30min)
      - Finds max preparation time
      - Inserts or updates daily_stats table with today's data
  
  2. Notes
    - Function should be called periodically or on demand
    - Uses order_timing table as the source of truth
    - Groups statistics by date
*/

CREATE OR REPLACE FUNCTION calculate_daily_stats()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO daily_stats (
    date,
    total_orders,
    completed_orders,
    warning_orders,
    avg_preparation_time,
    avg_total_time,
    max_preparation_time,
    orders_under_15min,
    orders_15_30min,
    orders_over_30min
  )
  SELECT
    DATE(created_at) as date,
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE all_items_completed IS NOT NULL) as completed_orders,
    COUNT(*) FILTER (WHERE status = 'warning') as warning_orders,
    AVG(preparation_time) FILTER (WHERE preparation_time IS NOT NULL) as avg_preparation_time,
    AVG(total_time) FILTER (WHERE total_time IS NOT NULL) as avg_total_time,
    MAX(preparation_time) as max_preparation_time,
    COUNT(*) FILTER (WHERE preparation_time IS NOT NULL AND preparation_time < 900) as orders_under_15min,
    COUNT(*) FILTER (WHERE preparation_time IS NOT NULL AND preparation_time >= 900 AND preparation_time <= 1800) as orders_15_30min,
    COUNT(*) FILTER (WHERE preparation_time IS NOT NULL AND preparation_time > 1800) as orders_over_30min
  FROM order_timing
  WHERE DATE(created_at) = CURRENT_DATE
  GROUP BY DATE(created_at)
  ON CONFLICT (date)
  DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    completed_orders = EXCLUDED.completed_orders,
    warning_orders = EXCLUDED.warning_orders,
    avg_preparation_time = EXCLUDED.avg_preparation_time,
    avg_total_time = EXCLUDED.avg_total_time,
    max_preparation_time = EXCLUDED.max_preparation_time,
    orders_under_15min = EXCLUDED.orders_under_15min,
    orders_15_30min = EXCLUDED.orders_15_30min,
    orders_over_30min = EXCLUDED.orders_over_30min;
END;
$$;
