-- KK-Kirppis Supabase security setup (applied to the project; kept here for
-- reproducibility / review). Run against the database with a privileged role.
--
-- Why: the app talks to Postgres via Prisma as the `postgres` role
-- (rolbypassrls = true), so it is unaffected by RLS. Enabling RLS with no
-- policies blocks Supabase's auto-generated Data API (the anon/authenticated
-- PostgREST roles) from reaching these tables directly.

-- 1) Lock the public tables out of the Data API.
alter table public."User" enable row level security;
alter table public."Listing" enable row level security;
alter table public."ListingImage" enable row level security;
alter table public."_prisma_migrations" enable row level security;

-- 2) Storage: listing images are public-read; writes happen only via the
--    server's service-role key (which bypasses RLS), so no client write
--    policy exists by design.
drop policy if exists "listing_images_public_read" on storage.objects;
create policy "listing_images_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'listing-images');

-- 3) Bucket limits (also set via the dashboard / admin API): the
--    `listing-images` bucket must enforce a 5 MB size limit and an
--    image-only MIME allowlist, because direct signed-URL uploads bypass the
--    application. Configure under Storage → bucket settings, or:
--    update storage.buckets
--      set file_size_limit = 5242880,
--          allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif']
--    where id = 'listing-images';
