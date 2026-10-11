# Database

Companies, articles and article history live in Postgres. The browser keeps a copy so pages open instantly, but the database holds the record.

## Which database

**Use Supabase in production. Locally, use the built-in Postgres (PGlite), which needs no setup.**

Both are plain Postgres. They run the same migrations and the same queries (`server/db/`), so moving from local to Supabase is one setting: `DATABASE_URL`.

Why Supabase fits Comarketer:

| Need | Supabase |
|---|---|
| Relational data: companies → articles → history, filtered by status and date | Postgres, with `jsonb` for the article body and plan |
| Logins and teams (next step) | Supabase Auth: email, Google, magic links |
| Files that are on local disk today: research pages (`research-store/`), images | Supabase Storage, with the same access rules as the tables |
| Blog platform keys (`.secrets/` today) | Supabase Vault (encrypted secrets in Postgres) |
| One company never sees another's data | Row level security |
| Cost while small | Free tier, then about $25 a month |

**No lock-in.** The app talks to Postgres through `pg` with ordinary SQL, not through the Supabase client. If you ever leave, point `DATABASE_URL` at Neon, RDS or your own Postgres and nothing else changes.

Other options considered:
- **Neon + Clerk + S3/R2.** Just as good a database, but auth, storage and secrets become three more services to wire up.
- **Firebase / Firestore.** A document store, which suits Comarketer's data less well: it is relational, and the library needs filters and counts.
- **Convex.** Very nice to build with, but its own query model means real lock-in.
- **SQLite alone.** Fine for one person on one machine, but you would need to move off it before launch.

## Running it

Locally: nothing to do. On first start the dev server creates `.data/pglite` (gitignored) and runs the migrations.

To use Supabase:
1. Create a project at supabase.com.
2. Click **Connect** → **Session pooler** and copy the connection string. The session pooler suits this long-running server; the transaction pooler (port 6543) is for serverless.
3. Add it to `.env` as `DATABASE_URL=...` and restart `npm run dev`. The tables are created on first request.

You can also paste `server/db/migrations/*.sql` into Supabase's SQL editor yourself.

Your existing articles: anything saved in the browser by an earlier version moves into the database the first time that company loads. History marks it "Moved from this browser to the database".

## Tables

`server/db/migrations/001_init.sql`

| Table | What it holds |
|---|---|
| `companies` | One row per website: name, logo, brief (`context.md`), pages saved. `domain` is unique |
| `articles` | Keyword, title, status (`in_progress`, `ready`, `scheduled`, `published`), step and next action, voice, `plan` (every choice made so far, so an article reopens where it was left), `content` (the finished `Post`, including edits), counts, slug, the blog it went to and its links, scheduled and published dates, `archived_at` |
| `article_events` | The article's history: started, each step done, ready, edited, SEO changed, sent as a draft, scheduled, published, archived, restored, duplicated |
| `schema_migrations` | Which migration files have run |

Row level security is turned on with no policies. Supabase's public API therefore cannot read these tables, while the server's direct connection can. When logins arrive, add policies tied to `auth.uid()`.

## How it fits together

- `server/db/index.ts` picks the driver (`pg` when `DATABASE_URL` is set, otherwise PGlite), runs migrations under an advisory lock, and opens on first use.
- `server/db/store.ts` holds every read and write. Each call names its company, and an article is only read or changed through the company that owns it. History entries are written in the same transaction as the change they describe.
- `server/db/routes.ts` defines the API:

| Route | Use |
|---|---|
| `GET /api/workspace?domain=` | Company plus its articles, newest first, without content |
| `PUT/POST /api/companies` | Save the company after research |
| `POST /api/import` | One-time move of browser-only data |
| `POST /api/articles` | Create or change an article; send only the fields that change, with `null` to clear one |
| `GET /api/articles/:id?domain=` | One article with its content |
| `GET /api/articles/:id/events?domain=` | Its history |
| `POST /api/articles/:id/duplicate` | A copy to rework, not linked to any blog |
| `POST /api/articles/bulk` | `archive`, `restore` or `delete` several at once |

- `/api/publish` records where an article went (blog, links, status, dates) on the server, so the record is right even if the tab closes mid-publish.
- `src/workspace.ts` is the browser side. Changes show immediately and save in order in the background. The sidebar shows "Saving…", "All changes saved" or "Not saved".

## Next steps

1. **Logins.** Add Supabase Auth, a `members(company_id, user_id, role)` table and RLS policies. Check the session on the server instead of trusting the `domain` parameter. Until then the API assumes one trusted user on their own machine, as it does today.
2. **Research and images to Storage.** Move `research-store/` into Supabase Storage, keyed by company.
3. **Blog keys to Vault.** Move `.secrets/connections.json` into an encrypted table.
4. **Paging.** The library loads every article for a company in one go, which is fine into the low thousands. Beyond that, add `limit`/`before` to `/api/workspace` and search on the server (`pg_trgm`).
