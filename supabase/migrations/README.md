# Supabase migrations (notes)

- Keep legacy versions that exist in the remote `schema_migrations` table, even if they are no longer
  used, so `supabase db push` can reconcile local and remote history.
- If a migration needs to be re-applied or made idempotent, prefer adding a new timestamped migration
  instead of renaming or deleting the original.

## Hydra match queue

- `20251229000000_create_hydra_match_queue_table.sql` must stay because the cloud history contains
  version `20251229000000`.
- `20251229000005_create_hydra_match_queue_table.sql` is the idempotent migration that actually
  guarantees the table exists on cloud.
