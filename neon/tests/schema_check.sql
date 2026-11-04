-- Read-only schema verification for the isolated Neon POC (#53).
-- Expected: 9 tables, 9 RLS-enabled, 0 policies, 9 without PUBLIC SELECT.
SELECT
  count(*) AS tables,
  count(*) FILTER (WHERE c.relrowsecurity) AS rls_enabled,
  count(*) FILTER (WHERE NOT has_table_privilege('PUBLIC', c.oid, 'SELECT')) AS no_public_select,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'chess_simul') AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'chess_simul'
  AND c.relkind = 'r';
