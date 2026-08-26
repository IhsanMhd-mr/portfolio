# Portfolio

Next.js portfolio site with an admin-driven CMS backend (Prisma + PostgreSQL).

Content — projects, technologies, education, experience, timeline — is managed
through an admin dashboard with a visual page builder, draft/published
versioning, and three selectable front-end templates.

## Requirements

- Node.js 20.12+ (the scripts rely on `process.loadEnvFile` and `--env-file`)
- PostgreSQL 17 running locally, or a hosted Postgres (Neon works)

## Getting started

```bash
npm install
cp .env.example .env    # then fill it in — see below
npm run db:setup        # apply migrations + initialize
npm run admin:super     # create the admin account you will log in with
npm run dev
```

Open <http://localhost:3000>, and the dashboard at
<http://localhost:3000/admin/login>.

`npm run db:setup` prints a generated password for the `admin` account, once.
`npm run admin:super` creates a second `superadmin` account using
`SUPERADMIN_PASSWORD`. Both are needed only the first time.

## Environment

All of these live in `.env`, which is gitignored.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Primary database. Every script targets this by default. |
| `DATABASE_URL_LOCAL` | for `npm run dev` | Local Postgres; `dev` swaps it in via `DB_TARGET=local`. |
| `AUTH_SECRET` | yes | Session signing. Any long random string. `NEXTAUTH_SECRET` also works. |
| `AUTH_GOOGLE_ID` | for Google sign-in | OAuth client id. |
| `AUTH_GOOGLE_SECRET` | for Google sign-in | OAuth client secret. |
| `SUPERADMIN_PASSWORD` | recommended | Password for `npm run admin:super`. |
| `INITIAL_PASSWORD` | optional | Fixes the `admin` password instead of generating one. |

The app **fails fast** if `DATABASE_URL` is missing in production, rather than
silently falling back to localhost and failing per-request.

## Database

Two databases are supported, both configured in `.env`:

| Command | Database |
| --- | --- |
| `npm run dev` | Local Postgres (`DATABASE_URL_LOCAL`) |
| `npm run dev:cloud` | Whatever `DATABASE_URL` points at |

**Every other script targets `DATABASE_URL`.** To run one against local instead,
override it for that command:

```bash
DATABASE_URL=$(node --env-file=.env -e "process.stdout.write(process.env.DATABASE_URL_LOCAL)") \
  npm run db:verify
```

Never run raw `prisma migrate` / `db push` directly — use the scripts below,
which also run initialization and verification:

| Command | Use for |
| --- | --- |
| `npm run db:setup` | Deploy migrations + initialize (production / first time) |
| `npm run db:migrate` | Create a new dev migration + initialize |
| `npm run db:reset` | Full reset — **destroys all data** |
| `npm run initialize` | Rerun initialization (idempotent, safe) |
| `npm run admin:super` | Create the permanent superadmin (idempotent) |
| `npm run db:verify` | Verify required records exist |

Content helpers:

| Command | Use for |
| --- | --- |
| `npm run content:clear` | Blank every long-form prose field, keeping structure |
| `npm run content:push-cloud` | Replace the cloud database with a copy of local (dry-run by default) |

Both are destructive in different ways — read their file headers first.

## Deploy

Deploy on [Vercel](https://vercel.com/new). Before the first boot:

1. Set `DATABASE_URL`, `AUTH_SECRET`, and the `AUTH_GOOGLE_*` pair as Production
   environment variables. Do **not** set `DATABASE_URL_LOCAL` there.
2. Run `npm run db:setup` against the production database.
3. Add `https://<your-domain>/api/auth/callback/google` to the Google OAuth
   authorised redirect URIs, or Google sign-in will fail.
