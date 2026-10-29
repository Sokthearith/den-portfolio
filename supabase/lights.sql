-- "Leave a light on": the guestbook behind the footer's town.
-- Paste this into Supabase → SQL Editor → New query, and run it once.
--
-- Nothing here is open to the browser. Row level security is on and there are
-- no policies, so the anon and authenticated roles can neither read nor write;
-- only the site's own /api/lights, holding the secret key, can.
--
-- To let a light shine for everyone: Table Editor → lights → tick `approved`.
-- To turn one off: untick it, or delete the row.

create table if not exists public.lights (
  id uuid primary key default gen_random_uuid(),
  name text check (char_length(name) between 1 and 32),
  message text not null check (char_length(message) between 1 and 140),
  approved boolean not null default false,
  -- A keyed hash of the sender's IP, only for the three-a-day limit; the IP
  -- itself is never stored.
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists lights_approved_created on public.lights (approved, created_at desc);
create index if not exists lights_ip_created on public.lights (ip_hash, created_at desc);

alter table public.lights enable row level security;
