-- Companies, their articles, and what happened to each article. Plain Postgres: runs on PGlite locally and on Supabase.
create table if not exists companies(
 id uuid primary key default gen_random_uuid(),
 domain text not null unique,
 name text not null default '',
 logo text not null default '',
 brief_md text not null default '',
 pages_saved integer not null default 0,
 page_groups jsonb not null default '[]',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists articles(
 id text primary key,
 company_id uuid not null references companies(id) on delete cascade,
 keyword text not null default '',
 title text not null default '',
 status text not null default 'in_progress' check (status in ('in_progress','ready','scheduled','published')),
 step smallint check (step between 1 and 4),
 waiting text check (waiting in ('you','us')),
 next_action text,
 voice text check (voice in ('founder','team')),
 plan jsonb,
 content jsonb,
 words integer,
 quality smallint,
 sources smallint,
 images smallint,
 slug text,
 cms text,
 external_id text,
 live_url text,
 edit_url text,
 scheduled_for timestamptz,
 published_at timestamptz,
 archived_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists articles_company_updated on articles(company_id, updated_at desc);

create table if not exists article_events(
 id bigint generated always as identity primary key,
 article_id text not null references articles(id) on delete cascade,
 label text not null,
 detail text not null default '',
 created_at timestamptz not null default now()
);
create index if not exists article_events_article on article_events(article_id, created_at desc);

-- Only the server reads and writes these tables. On Supabase, row level security with no policies keeps them
-- out of the public API; the server's direct connection is not affected.
alter table companies enable row level security;
alter table articles enable row level security;
alter table article_events enable row level security;
