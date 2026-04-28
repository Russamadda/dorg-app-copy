begin;

create extension if not exists pgcrypto;

create table if not exists public.utfort_oppdrag (
  id uuid primary key default gen_random_uuid(),
  tilbud_id uuid not null unique references public.tilbud(id) on delete cascade,
  firma_id uuid not null references public.firma(id) on delete cascade,
  firmanavn text not null default '',
  firma_org_nummer text null,
  firma_epost text null,
  firma_telefon text null,
  firma_adresse text null,
  kunde_navn text not null default '',
  kunde_epost text null,
  kunde_telefon text null,
  kunde_adresse text null,
  jobb_beskrivelse text null,
  kort_beskrivelse text null,
  jobb_type text null,
  tilbudstekst text null,
  timer numeric not null default 0,
  materialkostnad numeric not null default 0,
  pris_eks_mva numeric not null default 0,
  prisgrunnlag jsonb not null default '{}'::jsonb,
  materialspesifikasjon jsonb not null default '[]'::jsonb,
  summary_data jsonb not null default '{}'::jsonb,
  utfort_dato timestamptz not null default now(),
  opprettet_dato timestamptz not null default now(),
  sist_oppdatert_dato timestamptz not null default now()
);

create index if not exists utfort_oppdrag_firma_idx
  on public.utfort_oppdrag(firma_id, utfort_dato desc);

create index if not exists utfort_oppdrag_tilbud_idx
  on public.utfort_oppdrag(tilbud_id);

alter table public.utfort_oppdrag enable row level security;

create policy "Les egne utforte oppdrag"
on public.utfort_oppdrag for select
using (firma_id in (select id from public.firma where user_id = auth.uid()));

create policy "Skriv egne utforte oppdrag"
on public.utfort_oppdrag for insert
with check (firma_id in (select id from public.firma where user_id = auth.uid()));

create policy "Oppdater egne utforte oppdrag"
on public.utfort_oppdrag for update
using (firma_id in (select id from public.firma where user_id = auth.uid()));

create policy "Slett egne utforte oppdrag"
on public.utfort_oppdrag for delete
using (firma_id in (select id from public.firma where user_id = auth.uid()));

create or replace function public.set_utfort_oppdrag_sist_oppdatert_dato()
returns trigger
language plpgsql
as $$
begin
  new.sist_oppdatert_dato = now();
  return new;
end;
$$;

drop trigger if exists trg_utfort_oppdrag_sist_oppdatert_dato on public.utfort_oppdrag;

create trigger trg_utfort_oppdrag_sist_oppdatert_dato
before update on public.utfort_oppdrag
for each row
execute function public.set_utfort_oppdrag_sist_oppdatert_dato();

commit;
