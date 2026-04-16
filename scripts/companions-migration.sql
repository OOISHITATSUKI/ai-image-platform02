-- ============================================================
-- AI Companions table (Phase D — spec sections 27, 29)
-- Run this in the Supabase SQL Editor on production.
-- Idempotent: safe to re-run.
-- ============================================================

create table if not exists companions (
  id text primary key,
  name text not null,
  age int not null,
  personality text not null,
  tagline text not null,
  description text not null,
  avatar_url text not null,
  gallery_urls text[] not null default '{}',
  system_prompt text not null,
  tags text[] not null default '{}',
  is_premium boolean not null default false,
  is_new boolean not null default false,
  is_assistant boolean not null default false,
  -- status: 'draft' | 'published' | 'hidden' | 'archived'
  status text not null default 'published',
  sort_order int not null default 0,
  -- Girlfriend-experience data (spec section 28)
  relationship text,
  personality_description text,
  profile_hometown text,
  profile_occupation text,
  profile_favorite_food text,
  profile_hated_food text,
  profile_music text,
  profile_movies text,
  profile_hobbies text,
  profile_catchphrase text,
  first_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_companions_status on companions (status);
create index if not exists idx_companions_sort_order on companions (sort_order);

-- Auto update updated_at
create or replace function update_companions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_companions_updated_at on companions;
create trigger trigger_companions_updated_at
  before update on companions
  for each row
  execute function update_companions_updated_at();

-- Row Level Security: anyone can read published, everything else via service role
alter table companions enable row level security;

drop policy if exists companions_public_read on companions;
create policy companions_public_read on companions
  for select
  using (status = 'published');
