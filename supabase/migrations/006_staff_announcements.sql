create table if not exists staff_announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text not null,
  posted_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table if not exists staff_announcement_comments (
  id uuid primary key default uuid_generate_v4(),
  announcement_id uuid references staff_announcements(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table staff_announcements enable row level security;
alter table staff_announcement_comments enable row level security;

create policy "staff_announcements_select" on staff_announcements
  for select using (
    exists (select 1 from users where id = auth.uid() and role in ('director','administrator','staff','nurse','media','store'))
  );

create policy "staff_announcements_insert" on staff_announcements
  for insert with check (
    exists (select 1 from users where id = auth.uid() and role in ('director','administrator'))
  );

create policy "staff_announcements_delete" on staff_announcements
  for delete using (
    exists (select 1 from users where id = auth.uid() and role in ('director','administrator'))
  );

create policy "staff_comments_select" on staff_announcement_comments
  for select using (
    exists (select 1 from users where id = auth.uid() and role in ('director','administrator','staff','nurse','media','store'))
  );

create policy "staff_comments_insert" on staff_announcement_comments
  for insert with check (
    user_id = auth.uid() and
    exists (select 1 from users where id = auth.uid() and role in ('director','administrator','staff','nurse','media','store'))
  );

create policy "staff_comments_delete" on staff_announcement_comments
  for delete using (
    user_id = auth.uid() or
    exists (select 1 from users where id = auth.uid() and role in ('director','administrator'))
  );
