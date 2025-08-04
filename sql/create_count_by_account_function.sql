-- Function to count records by account code
CREATE OR REPLACE FUNCTION count_records_by_account_code()
RETURNS TABLE (codigo TEXT, count BIGINT) 
LANGUAGE SQL
AS $$
  SELECT 
    codigo::TEXT, 
    COUNT(*) AS count
  FROM 
    financial_data
  WHERE 
    report_id IS NOT NULL
  GROUP BY 
    codigo
  ORDER BY 
    codigo;
$$;