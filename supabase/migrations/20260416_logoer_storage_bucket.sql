-- Oppretter public bucket for firmalogoer brukt av appen (`storage.from('logoer')`).
insert into storage.buckets (id, name, public)
values ('logoer', 'logoer', true)
on conflict (id) do update
set public = excluded.public;

-- RLS-policyer for opplasting med `upsert: true`.
-- Supabase krever INSERT + SELECT + UPDATE for upsert på storage.objects.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Logoer bucket insert (authenticated)'
  ) then
    create policy "Logoer bucket insert (authenticated)"
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'logoer');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Logoer bucket select (authenticated)'
  ) then
    create policy "Logoer bucket select (authenticated)"
      on storage.objects
      for select
      to authenticated
      using (bucket_id = 'logoer');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Logoer bucket update (authenticated)'
  ) then
    create policy "Logoer bucket update (authenticated)"
      on storage.objects
      for update
      to authenticated
      using (bucket_id = 'logoer')
      with check (bucket_id = 'logoer');
  end if;
end
$$;
