-- Schema conventions and shared helpers
set search_path = public;

-- Ensure UUID helpers and cryptographic functions are available for default primary keys
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Standardized timestamps helper
create or replace function public.handle_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.created_at is null then
    new.created_at = timezone('utc', now());
  end if;
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;
comment on function public.handle_timestamps() is
  'Use as a BEFORE INSERT OR UPDATE trigger to keep created_at/updated_at in UTC for all public tables.';

-- Convenience helper for UUID primary keys
create or replace function public.default_uuid()
returns uuid
language sql
as $$
  select gen_random_uuid();
$$;
comment on function public.default_uuid() is 'Shared function for uuid default primary keys (gen_random_uuid wrapper).';
