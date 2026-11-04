-- Read-only schema verification for isolated Neon POC (#53).
-- Expected: 9 tables, 9 RLS-enabled, 0 policies, 9 without PUBLIC SELECT.
SELECT
  count(*) AS tables,
  count(*) FILTER (WHERE c.relrowsecurity) AS rls_enabled,
  count(*) FILTER (WHERE NOT EXISTS (
    SELECT 1
    FROM aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
    WHERE a.grantee = 0 AND a.privilege_type = 'SELECT'
  )) AS no_public_select,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'chess_simul') AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'chess_simul' AND c.relkind = 'r';
