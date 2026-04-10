begin;

create extension if not exists pgcrypto;

create table if not exists public.tilbud_hendelser (
  id uuid primary key default gen_random_uuid(),
  tilbud_id uuid not null references public.tilbud(id) on delete cascade,
  firma_id uuid not null references public.firma(id) on delete cascade,
  hendelse_type text not null,
  tittel text not null,
  beskrivelse text null,
  metadata jsonb not null default '{}'::jsonb,
  opprettet_dato timestamptz not null default now()
);

alter table public.tilbud
  add column if not exists sist_oppdatert_dato timestamptz default now(),
  add column if not exists forste_sendt_dato timestamptz,
  add column if not exists sist_sendt_dato timestamptz,
  add column if not exists forste_paminnelse_sendt_dato timestamptz,
  add column if not exists siste_paminnelse_sendt_dato timestamptz,
  add column if not exists godkjent_dato timestamptz,
  add column if not exists avslatt_dato timestamptz,
  add column if not exists justering_onsket_dato timestamptz,
  add column if not exists versjon integer not null default 1;

update public.tilbud
set status = 'paminnelse_sendt'
where status = 'paminnelse';

update public.tilbud
set status = 'siste_paminnelse_sendt'
where status = 'siste';

update public.tilbud
set
  forste_sendt_dato = coalesce(
    forste_sendt_dato,
    case
      when status <> 'avventer' then coalesce(sendt_dato, opprettet_dato)
      else null
    end
  ),
  sist_sendt_dato = coalesce(
    sist_sendt_dato,
    sendt_dato,
    case
      when status <> 'avventer' then opprettet_dato
      else null
    end
  ),
  forste_paminnelse_sendt_dato = coalesce(forste_paminnelse_sendt_dato, forste_paminnelse_dato),
  siste_paminnelse_sendt_dato = coalesce(siste_paminnelse_sendt_dato, siste_paminnelse_dato),
  godkjent_dato = coalesce(
    godkjent_dato,
    case when status = 'godkjent' then coalesce(sist_sendt_dato, sendt_dato, opprettet_dato) end
  ),
  avslatt_dato = coalesce(
    avslatt_dato,
    case when status = 'avslatt' then coalesce(sist_sendt_dato, sendt_dato, opprettet_dato) end
  ),
  justering_onsket_dato = coalesce(
    justering_onsket_dato,
    case
      when status = 'justering' or kunde_justering is not null or ai_oppsummering is not null
        then coalesce(
          siste_paminnelse_sendt_dato,
          siste_paminnelse_dato,
          forste_paminnelse_sendt_dato,
          forste_paminnelse_dato,
          sist_sendt_dato,
          sendt_dato,
          opprettet_dato
        )
      else null
    end
  ),
  versjon = coalesce(versjon, 1),
  sist_oppdatert_dato = coalesce(sist_oppdatert_dato, now());

create index if not exists tilbud_status_idx
  on public.tilbud(status);

create index if not exists tilbud_firma_status_idx
  on public.tilbud(firma_id, status);

create index if not exists tilbud_hendelser_tilbud_id_opprettet_dato_idx
  on public.tilbud_hendelser(tilbud_id, opprettet_dato);

create index if not exists tilbud_hendelser_firma_id_opprettet_dato_idx
  on public.tilbud_hendelser(firma_id, opprettet_dato desc);

create index if not exists tilbud_hendelser_type_idx
  on public.tilbud_hendelser(hendelse_type);

create or replace function public.set_tilbud_sist_oppdatert_dato()
returns trigger
language plpgsql
as $$
begin
  new.sist_oppdatert_dato = now();
  return new;
end;
$$;

drop trigger if exists trg_tilbud_sist_oppdatert_dato on public.tilbud;

create trigger trg_tilbud_sist_oppdatert_dato
before update on public.tilbud
for each row
execute function public.set_tilbud_sist_oppdatert_dato();

insert into public.tilbud_hendelser (
  tilbud_id,
  firma_id,
  hendelse_type,
  tittel,
  metadata,
  opprettet_dato
)
select
  t.id,
  t.firma_id,
  'tilbud_sendt',
  'Tilbud sendt',
  jsonb_build_object('legacy_backfill', true, 'versjon', coalesce(t.versjon, 1)),
  coalesce(t.forste_sendt_dato, t.opprettet_dato)
from public.tilbud t
where t.firma_id is not null
  and t.status <> 'avventer'
  and coalesce(t.forste_sendt_dato, t.opprettet_dato) is not null
  and not exists (
    select 1
    from public.tilbud_hendelser th
    where th.tilbud_id = t.id
      and th.hendelse_type = 'tilbud_sendt'
  );

insert into public.tilbud_hendelser (
  tilbud_id,
  firma_id,
  hendelse_type,
  tittel,
  metadata,
  opprettet_dato
)
select
  t.id,
  t.firma_id,
  'paminnelse_sendt',
  'Påminnelse sendt',
  jsonb_build_object('legacy_backfill', true),
  t.forste_paminnelse_sendt_dato
from public.tilbud t
where t.firma_id is not null
  and t.forste_paminnelse_sendt_dato is not null
  and not exists (
    select 1
    from public.tilbud_hendelser th
    where th.tilbud_id = t.id
      and th.hendelse_type = 'paminnelse_sendt'
  );

insert into public.tilbud_hendelser (
  tilbud_id,
  firma_id,
  hendelse_type,
  tittel,
  metadata,
  opprettet_dato
)
select
  t.id,
  t.firma_id,
  'siste_paminnelse_sendt',
  'Siste påminnelse sendt',
  jsonb_build_object('legacy_backfill', true),
  t.siste_paminnelse_sendt_dato
from public.tilbud t
where t.firma_id is not null
  and t.siste_paminnelse_sendt_dato is not null
  and not exists (
    select 1
    from public.tilbud_hendelser th
    where th.tilbud_id = t.id
      and th.hendelse_type = 'siste_paminnelse_sendt'
  );

insert into public.tilbud_hendelser (
  tilbud_id,
  firma_id,
  hendelse_type,
  tittel,
  beskrivelse,
  metadata,
  opprettet_dato
)
select
  t.id,
  t.firma_id,
  'justering_forespurt',
  'Kunde ba om justering',
  coalesce(t.kunde_justering, t.ai_oppsummering),
  jsonb_build_object('legacy_backfill', true),
  t.justering_onsket_dato
from public.tilbud t
where t.firma_id is not null
  and t.justering_onsket_dato is not null
  and not exists (
    select 1
    from public.tilbud_hendelser th
    where th.tilbud_id = t.id
      and th.hendelse_type = 'justering_forespurt'
  );

insert into public.tilbud_hendelser (
  tilbud_id,
  firma_id,
  hendelse_type,
  tittel,
  metadata,
  opprettet_dato
)
select
  t.id,
  t.firma_id,
  'nytt_tilbud_sendt',
  'Nytt tilbud sendt',
  jsonb_build_object('legacy_backfill', true, 'versjon', coalesce(t.versjon, 1)),
  t.sist_sendt_dato
from public.tilbud t
where t.firma_id is not null
  and t.sist_sendt_dato is not null
  and t.forste_sendt_dato is not null
  and t.sist_sendt_dato > t.forste_sendt_dato
  and not exists (
    select 1
    from public.tilbud_hendelser th
    where th.tilbud_id = t.id
      and th.hendelse_type = 'nytt_tilbud_sendt'
  );

insert into public.tilbud_hendelser (
  tilbud_id,
  firma_id,
  hendelse_type,
  tittel,
  metadata,
  opprettet_dato
)
select
  t.id,
  t.firma_id,
  'godkjent',
  'Tilbud godkjent',
  jsonb_build_object('legacy_backfill', true),
  t.godkjent_dato
from public.tilbud t
where t.firma_id is not null
  and t.godkjent_dato is not null
  and not exists (
    select 1
    from public.tilbud_hendelser th
    where th.tilbud_id = t.id
      and th.hendelse_type = 'godkjent'
  );

insert into public.tilbud_hendelser (
  tilbud_id,
  firma_id,
  hendelse_type,
  tittel,
  metadata,
  opprettet_dato
)
select
  t.id,
  t.firma_id,
  'avslatt',
  'Tilbud avslått',
  jsonb_build_object('legacy_backfill', true),
  t.avslatt_dato
from public.tilbud t
where t.firma_id is not null
  and t.avslatt_dato is not null
  and not exists (
    select 1
    from public.tilbud_hendelser th
    where th.tilbud_id = t.id
      and th.hendelse_type = 'avslatt'
  );

commit;
