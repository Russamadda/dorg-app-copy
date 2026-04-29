begin;

-- Kjerne-tabeller som appen leser/skriver direkte må være låst til innlogget brukers firma.
alter table public.firma enable row level security;

drop policy if exists "Les eget firma" on public.firma;
drop policy if exists "Skriv eget firma" on public.firma;
drop policy if exists "Oppdater eget firma" on public.firma;

create policy "Les eget firma"
on public.firma for select
to authenticated
using (user_id = auth.uid());

create policy "Skriv eget firma"
on public.firma for insert
to authenticated
with check (user_id = auth.uid());

create policy "Oppdater eget firma"
on public.firma for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

alter table public.tilbud enable row level security;

drop policy if exists "Les egne tilbud" on public.tilbud;
drop policy if exists "Skriv egne tilbud" on public.tilbud;
drop policy if exists "Oppdater egne tilbud" on public.tilbud;
drop policy if exists "Slett egne tilbud" on public.tilbud;

create policy "Les egne tilbud"
on public.tilbud for select
to authenticated
using (
  exists (
    select 1
    from public.firma f
    where f.id = tilbud.firma_id
      and f.user_id = auth.uid()
  )
);

create policy "Skriv egne tilbud"
on public.tilbud for insert
to authenticated
with check (
  exists (
    select 1
    from public.firma f
    where f.id = tilbud.firma_id
      and f.user_id = auth.uid()
  )
);

create policy "Oppdater egne tilbud"
on public.tilbud for update
to authenticated
using (
  exists (
    select 1
    from public.firma f
    where f.id = tilbud.firma_id
      and f.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.firma f
    where f.id = tilbud.firma_id
      and f.user_id = auth.uid()
  )
);

create policy "Slett egne tilbud"
on public.tilbud for delete
to authenticated
using (
  exists (
    select 1
    from public.firma f
    where f.id = tilbud.firma_id
      and f.user_id = auth.uid()
  )
);

alter table public.tilbud_hendelser enable row level security;

drop policy if exists "Les egne tilbudshendelser" on public.tilbud_hendelser;
drop policy if exists "Skriv egne tilbudshendelser" on public.tilbud_hendelser;
drop policy if exists "Oppdater egne tilbudshendelser" on public.tilbud_hendelser;
drop policy if exists "Slett egne tilbudshendelser" on public.tilbud_hendelser;

create policy "Les egne tilbudshendelser"
on public.tilbud_hendelser for select
to authenticated
using (
  firma_id in (select id from public.firma where user_id = auth.uid())
);

create policy "Skriv egne tilbudshendelser"
on public.tilbud_hendelser for insert
to authenticated
with check (
  firma_id in (select id from public.firma where user_id = auth.uid())
  and exists (
    select 1
    from public.tilbud t
    where t.id = tilbud_hendelser.tilbud_id
      and t.firma_id = tilbud_hendelser.firma_id
  )
);

create policy "Oppdater egne tilbudshendelser"
on public.tilbud_hendelser for update
to authenticated
using (
  firma_id in (select id from public.firma where user_id = auth.uid())
)
with check (
  firma_id in (select id from public.firma where user_id = auth.uid())
  and exists (
    select 1
    from public.tilbud t
    where t.id = tilbud_hendelser.tilbud_id
      and t.firma_id = tilbud_hendelser.firma_id
  )
);

create policy "Slett egne tilbudshendelser"
on public.tilbud_hendelser for delete
to authenticated
using (
  firma_id in (select id from public.firma where user_id = auth.uid())
);

-- Stram inn eksisterende material-policyer slik at en rad ikke kan kobles til et tilbud
-- som tilhører et annet firma, selv om klienten setter sin egen firma_id.
drop policy if exists "Les egne materialer" on public.tilbud_materialer;
drop policy if exists "Skriv egne materialer" on public.tilbud_materialer;
drop policy if exists "Oppdater egne materialer" on public.tilbud_materialer;
drop policy if exists "Slett egne materialer" on public.tilbud_materialer;

create policy "Les egne materialer"
on public.tilbud_materialer for select
to authenticated
using (
  firma_id in (select id from public.firma where user_id = auth.uid())
  and exists (
    select 1
    from public.tilbud t
    where t.id = tilbud_materialer.tilbud_id
      and t.firma_id = tilbud_materialer.firma_id
  )
);

create policy "Skriv egne materialer"
on public.tilbud_materialer for insert
to authenticated
with check (
  firma_id in (select id from public.firma where user_id = auth.uid())
  and exists (
    select 1
    from public.tilbud t
    where t.id = tilbud_materialer.tilbud_id
      and t.firma_id = tilbud_materialer.firma_id
  )
);

create policy "Oppdater egne materialer"
on public.tilbud_materialer for update
to authenticated
using (
  firma_id in (select id from public.firma where user_id = auth.uid())
)
with check (
  firma_id in (select id from public.firma where user_id = auth.uid())
  and exists (
    select 1
    from public.tilbud t
    where t.id = tilbud_materialer.tilbud_id
      and t.firma_id = tilbud_materialer.firma_id
  )
);

create policy "Slett egne materialer"
on public.tilbud_materialer for delete
to authenticated
using (
  firma_id in (select id from public.firma where user_id = auth.uid())
);

-- Utført-snapshot må også være koblet til et tilbud for samme firma.
drop policy if exists "Les egne utforte oppdrag" on public.utfort_oppdrag;
drop policy if exists "Skriv egne utforte oppdrag" on public.utfort_oppdrag;
drop policy if exists "Oppdater egne utforte oppdrag" on public.utfort_oppdrag;
drop policy if exists "Slett egne utforte oppdrag" on public.utfort_oppdrag;

create policy "Les egne utforte oppdrag"
on public.utfort_oppdrag for select
to authenticated
using (
  firma_id in (select id from public.firma where user_id = auth.uid())
  and exists (
    select 1
    from public.tilbud t
    where t.id = utfort_oppdrag.tilbud_id
      and t.firma_id = utfort_oppdrag.firma_id
  )
);

create policy "Skriv egne utforte oppdrag"
on public.utfort_oppdrag for insert
to authenticated
with check (
  firma_id in (select id from public.firma where user_id = auth.uid())
  and exists (
    select 1
    from public.tilbud t
    where t.id = utfort_oppdrag.tilbud_id
      and t.firma_id = utfort_oppdrag.firma_id
  )
);

create policy "Oppdater egne utforte oppdrag"
on public.utfort_oppdrag for update
to authenticated
using (
  firma_id in (select id from public.firma where user_id = auth.uid())
)
with check (
  firma_id in (select id from public.firma where user_id = auth.uid())
  and exists (
    select 1
    from public.tilbud t
    where t.id = utfort_oppdrag.tilbud_id
      and t.firma_id = utfort_oppdrag.firma_id
  )
);

create policy "Slett egne utforte oppdrag"
on public.utfort_oppdrag for delete
to authenticated
using (
  firma_id in (select id from public.firma where user_id = auth.uid())
);

-- Historikk-tabellen finnes i appkoden, men ikke i repoets migrations. Legg på RLS
-- bare hvis tabellen faktisk finnes i miljøet.
do $$
begin
  if to_regclass('public.prishistorikk') is not null then
    alter table public.prishistorikk enable row level security;

    drop policy if exists "Les egen prishistorikk" on public.prishistorikk;
    drop policy if exists "Skriv egen prishistorikk" on public.prishistorikk;
    drop policy if exists "Oppdater egen prishistorikk" on public.prishistorikk;
    drop policy if exists "Slett egen prishistorikk" on public.prishistorikk;

    create policy "Les egen prishistorikk"
    on public.prishistorikk for select
    to authenticated
    using (firma_id in (select id from public.firma where user_id = auth.uid()));

    create policy "Skriv egen prishistorikk"
    on public.prishistorikk for insert
    to authenticated
    with check (firma_id in (select id from public.firma where user_id = auth.uid()));

    create policy "Oppdater egen prishistorikk"
    on public.prishistorikk for update
    to authenticated
    using (firma_id in (select id from public.firma where user_id = auth.uid()))
    with check (firma_id in (select id from public.firma where user_id = auth.uid()));

    create policy "Slett egen prishistorikk"
    on public.prishistorikk for delete
    to authenticated
    using (firma_id in (select id from public.firma where user_id = auth.uid()));
  end if;
end
$$;

-- Public read er akseptabelt for firmalogoer, men write/update/delete må låses til
-- en mappe med auth.uid() som første path-segment.
drop policy if exists "Logoer bucket insert (authenticated)" on storage.objects;
drop policy if exists "Logoer bucket select (authenticated)" on storage.objects;
drop policy if exists "Logoer bucket update (authenticated)" on storage.objects;
drop policy if exists "Logoer bucket insert own folder" on storage.objects;
drop policy if exists "Logoer bucket select public" on storage.objects;
drop policy if exists "Logoer bucket update own folder" on storage.objects;
drop policy if exists "Logoer bucket delete own folder" on storage.objects;

create policy "Logoer bucket select public"
on storage.objects for select
to public
using (bucket_id = 'logoer');

create policy "Logoer bucket insert own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'logoer'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Logoer bucket update own folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'logoer'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'logoer'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Logoer bucket delete own folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'logoer'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
