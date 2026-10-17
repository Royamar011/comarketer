-- The company's market: competitors (suggested, confirmed or removed by the user) and buyer groups, each with its evidence.
alter table companies add column if not exists competitors jsonb not null default '[]';
alter table companies add column if not exists buyer_groups jsonb not null default '[]';
