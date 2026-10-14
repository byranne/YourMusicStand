-- A total upload allowance per account, now that anyone can sign up: every
-- account shares the project's storage, so one user must not be able to fill it.

-- ---------------------------------------------------------------------------
-- Bytes the caller has stored in the 'resources' bucket
-- ---------------------------------------------------------------------------
-- Counts what Storage recorded for each object, not the size_bytes the client
-- reports on public.resources. Security invoker: the read policy on
-- storage.objects already limits the caller to their own folder.
create function public.resource_bytes_used()
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum((metadata ->> 'size')::bigint), 0)::bigint
  from storage.objects
  where bucket_id = 'resources'
    and (storage.foldername(name))[1] = (select auth.uid())::text;
$$;

revoke execute on function public.resource_bytes_used() from public, anon;
grant execute on function public.resource_bytes_used() to authenticated;

-- ---------------------------------------------------------------------------
-- Uploads stop once the account holds 50 MB
-- ---------------------------------------------------------------------------
-- The size of the file being uploaded isn't known here, so an account can end
-- up at most one file (20 MB) over. The app checks the exact total first.
drop policy "users upload own resource files" on storage.objects;

create policy "users upload own resource files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'resources'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.resource_bytes_used()) < 52428800
  );
