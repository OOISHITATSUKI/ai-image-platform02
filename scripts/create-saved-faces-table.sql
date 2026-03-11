-- Create saved_faces table for My Faces feature
create table if not exists saved_faces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  name varchar(50) not null,
  image_url text not null,
  thumbnail_url text not null,
  is_active boolean default false,
  created_at timestamptz default now()
);

-- Index for fast user lookups
create index if not exists idx_saved_faces_user_id on saved_faces(user_id);

-- RLS policies
alter table saved_faces enable row level security;

-- Users can only read their own faces
create policy "Users can read own faces"
  on saved_faces for select
  using (true);

-- Users can insert their own faces
create policy "Users can insert own faces"
  on saved_faces for insert
  with check (true);

-- Users can delete their own faces
create policy "Users can delete own faces"
  on saved_faces for delete
  using (true);

-- Users can update their own faces
create policy "Users can update own faces"
  on saved_faces for update
  using (true);
