insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-exports',
  'public-exports',
  true,
  52428800,
  null
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can read CitizenTrack exports'
  ) then
    create policy "Public can read CitizenTrack exports"
      on storage.objects
      for select
      to public
      using (bucket_id = 'public-exports');
  end if;
end;
$$;
