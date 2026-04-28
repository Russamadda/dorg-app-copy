create table public.tilbud_materialer (
  id uuid primary key default gen_random_uuid(),
  tilbud_id uuid not null references public.tilbud(id) on delete cascade,
  firma_id uuid not null references public.firma(id) on delete cascade,
  navn text not null,
  antall numeric not null default 1,
  enhet text,
  pris_per_enhet numeric not null default 0,
  sortering integer not null default 0,
  opprettet_dato timestamptz not null default now()
);

create index tilbud_materialer_tilbud_idx
  on public.tilbud_materialer(tilbud_id, sortering);
create index tilbud_materialer_firma_idx
  on public.tilbud_materialer(firma_id);

alter table public.tilbud_materialer enable row level security;

create policy "Les egne materialer"
on public.tilbud_materialer for select
using (firma_id in (select id from public.firma where user_id = auth.uid()));

create policy "Skriv egne materialer"
on public.tilbud_materialer for insert
with check (firma_id in (select id from public.firma where user_id = auth.uid()));

create policy "Oppdater egne materialer"
on public.tilbud_materialer for update
using (firma_id in (select id from public.firma where user_id = auth.uid()));

create policy "Slett egne materialer"
on public.tilbud_materialer for delete
using (firma_id in (select id from public.firma where user_id = auth.uid()));
