-- Schema
create table if not exists opportunities (
  id bigserial primary key,
  title text not null,
  type text check (type in ('grant','loan','scholarship')) not null,
  category text,
  amount text,
  provider text,
  deadline text,
  location text,
  scope text,
  description text,
  approval_rate text,
  processing_time text,
  match_score int
);

create table if not exists applications (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id bigint not null references opportunities(id) on delete cascade,
  status text default 'in_progress',
  started_at timestamptz default now(),
  unique (user_id, opportunity_id)
);

-- RLS
alter table applications enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'applications' and policyname = 'user owns applications') then
    create policy "user owns applications" on applications for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'applications' and policyname = 'user inserts own applications') then
    create policy "user inserts own applications" on applications for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'applications' and policyname = 'user updates own applications') then
    create policy "user updates own applications" on applications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- Example data
insert into opportunities (title,type,category,amount,provider,deadline,location,scope,description,approval_rate,processing_time,match_score) values
('Philadelphia Business Expansion Grant','grant','business','$10,000 - $100,000','City of Philadelphia','March 31, 2026','Philadelphia, PA','local','Grants for businesses expanding operations within Philadelphia city limits.','45%','45-60 days',94),
('SBA 7(a) Loan Program','loan','business','Up to $5,000,000','U.S. Small Business Administration','Ongoing','Nationwide','national','SBA''s primary loan program for working capital, equipment, and real estate.','58%','30-90 days',88),
('Google CS Scholarship','scholarship','individual','$10,000','Google','December 1, 2025','Nationwide','national','Scholarship for students pursuing computer science degrees.','15%','60 days',76);
