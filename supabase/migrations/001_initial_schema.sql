-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Sessions table (created first as other tables reference it)
create table if not exists sessions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  show_cabin_info boolean not null default false,
  deposit_amount numeric(10,2) not null default 0,
  deposit_due_date date,
  tuition_amount numeric(10,2) not null default 0,
  tuition_due_date date,
  session_closed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Users table (extends Supabase auth.users)
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null check (role in ('director','media','store','parent')),
  push_notification_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- Campers table
create table if not exists campers (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  dob date,
  photo_url text,
  cabin text,
  counselor_name text,
  session_id uuid references sessions(id),
  store_balance numeric(10,2) not null default 0,
  camper_code text unique not null default upper(substring(md5(random()::text), 1, 8)),
  created_at timestamptz not null default now()
);

-- Parent-Camper links
create table if not exists parent_camper_links (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references users(id) on delete cascade,
  camper_id uuid not null references campers(id) on delete cascade,
  approved boolean not null default false,
  linked_at timestamptz not null default now(),
  unique(parent_id, camper_id)
);

-- Tuition payments
create table if not exists tuition_payments (
  id uuid primary key default uuid_generate_v4(),
  camper_id uuid not null references campers(id) on delete cascade,
  parent_id uuid not null references users(id),
  amount numeric(10,2) not null,
  type text not null check (type in ('deposit','balance')),
  square_payment_id text,
  paid_at timestamptz not null default now()
);

-- Store transactions
create table if not exists store_transactions (
  id uuid primary key default uuid_generate_v4(),
  camper_id uuid not null references campers(id) on delete cascade,
  amount numeric(10,2) not null,
  type text not null check (type in ('credit','debit')),
  note text,
  staff_id uuid references users(id),
  created_at timestamptz not null default now()
);

-- End of session balance choices
create table if not exists session_balance_choices (
  id uuid primary key default uuid_generate_v4(),
  camper_id uuid not null references campers(id),
  parent_id uuid not null references users(id),
  session_id uuid not null references sessions(id),
  choice text not null check (choice in ('refund','donate')),
  balance_at_close numeric(10,2) not null,
  chosen_at timestamptz not null default now()
);

-- Messages
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  from_parent_id uuid not null references users(id),
  to_camper_id uuid not null references campers(id),
  body text not null check (char_length(body) <= 500),
  sent_at timestamptz not null default now(),
  status text not null default 'unread' check (status in ('unread','delivered')),
  delivered_at timestamptz
);

-- Photos
create table if not exists photos (
  id uuid primary key default uuid_generate_v4(),
  url text not null,
  caption text,
  date_taken date not null default current_date,
  uploaded_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- Photo tags
create table if not exists photo_tags (
  id uuid primary key default uuid_generate_v4(),
  photo_id uuid not null references photos(id) on delete cascade,
  camper_id uuid not null references campers(id) on delete cascade,
  tagged_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique(photo_id, camper_id)
);

-- Announcements
create table if not exists announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text not null,
  image_url text,
  posted_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- Push tokens
create table if not exists push_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('web','ios','android')),
  created_at timestamptz not null default now(),
  unique(user_id, token)
);

-- Camp info pages (packing list, emergency contacts)
create table if not exists info_pages (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  content text not null default '',
  updated_by uuid references users(id),
  updated_at timestamptz not null default now()
);

-- Insert default info pages
insert into info_pages (slug, title, content) values
  ('packing-list', 'Packing List & Camp Rules', ''),
  ('emergency-contacts', 'Emergency Contacts & Address', '')
on conflict (slug) do nothing;

-- Row Level Security
alter table users enable row level security;
alter table campers enable row level security;
alter table parent_camper_links enable row level security;
alter table sessions enable row level security;
alter table tuition_payments enable row level security;
alter table store_transactions enable row level security;
alter table messages enable row level security;
alter table photos enable row level security;
alter table photo_tags enable row level security;
alter table announcements enable row level security;
alter table push_tokens enable row level security;
alter table info_pages enable row level security;
alter table session_balance_choices enable row level security;

-- Helper: get current user role
create or replace function get_user_role()
returns text as $$
  select role from users where id = auth.uid();
$$ language sql security definer;

-- Helper: is director
create or replace function is_director()
returns boolean as $$
  select exists(select 1 from users where id = auth.uid() and role = 'director');
$$ language sql security definer;

-- RLS Policies

-- users: read own, director reads all
create policy "users_select_own" on users for select using (id = auth.uid() or is_director());
create policy "users_insert_own" on users for insert with check (id = auth.uid());
create policy "users_update_own" on users for update using (id = auth.uid() or is_director());

-- sessions: all authenticated can read, only director writes
create policy "sessions_select" on sessions for select using (auth.uid() is not null);
create policy "sessions_insert" on sessions for insert with check (is_director());
create policy "sessions_update" on sessions for update using (is_director());

-- campers: parents see their linked/approved campers, staff see all
create policy "campers_select_parent" on campers for select using (
  is_director()
  or get_user_role() in ('media','store')
  or exists(
    select 1 from parent_camper_links
    where parent_camper_links.camper_id = campers.id
    and parent_camper_links.parent_id = auth.uid()
    and parent_camper_links.approved = true
  )
);
create policy "campers_insert" on campers for insert with check (is_director());
create policy "campers_update" on campers for update using (is_director());
create policy "campers_delete" on campers for delete using (is_director());

-- parent_camper_links: parents see own, director sees all
create policy "pcl_select" on parent_camper_links for select using (
  parent_id = auth.uid() or is_director()
);
create policy "pcl_insert" on parent_camper_links for insert with check (
  parent_id = auth.uid() or is_director()
);
create policy "pcl_update" on parent_camper_links for update using (is_director());
create policy "pcl_delete" on parent_camper_links for delete using (is_director());

-- tuition_payments
create policy "tp_select" on tuition_payments for select using (
  parent_id = auth.uid() or is_director()
);
create policy "tp_insert" on tuition_payments for insert with check (
  parent_id = auth.uid() or is_director()
);

-- store_transactions
create policy "st_select" on store_transactions for select using (
  is_director()
  or get_user_role() = 'store'
  or exists(
    select 1 from parent_camper_links
    where parent_camper_links.camper_id = store_transactions.camper_id
    and parent_camper_links.parent_id = auth.uid()
    and parent_camper_links.approved = true
  )
);
create policy "st_insert" on store_transactions for insert with check (
  is_director() or get_user_role() = 'store' or get_user_role() = 'parent'
);

-- messages
create policy "msg_select" on messages for select using (
  from_parent_id = auth.uid() or is_director()
);
create policy "msg_insert" on messages for insert with check (
  get_user_role() = 'parent' and from_parent_id = auth.uid()
);
create policy "msg_update" on messages for update using (is_director());

-- photos: all authenticated can read
create policy "photos_select" on photos for select using (auth.uid() is not null);
create policy "photos_insert" on photos for insert with check (
  is_director() or get_user_role() = 'media'
);
create policy "photos_delete" on photos for delete using (
  is_director() or get_user_role() = 'media'
);

-- photo_tags: all authenticated can read, parents and media can tag
create policy "pt_select" on photo_tags for select using (auth.uid() is not null);
create policy "pt_insert" on photo_tags for insert with check (auth.uid() is not null);
create policy "pt_delete" on photo_tags for delete using (
  tagged_by = auth.uid() or is_director() or get_user_role() = 'media'
);

-- announcements: all can read
create policy "ann_select" on announcements for select using (auth.uid() is not null);
create policy "ann_insert" on announcements for insert with check (is_director());
create policy "ann_update" on announcements for update using (is_director());
create policy "ann_delete" on announcements for delete using (is_director());

-- info_pages: all can read
create policy "ip_select" on info_pages for select using (auth.uid() is not null);
create policy "ip_update" on info_pages for update using (is_director());

-- push_tokens: own only
create policy "push_select" on push_tokens for select using (user_id = auth.uid());
create policy "push_insert" on push_tokens for insert with check (user_id = auth.uid());
create policy "push_delete" on push_tokens for delete using (user_id = auth.uid() or is_director());

-- session_balance_choices
create policy "sbc_select" on session_balance_choices for select using (
  parent_id = auth.uid() or is_director()
);
create policy "sbc_insert" on session_balance_choices for insert with check (
  parent_id = auth.uid()
);
