# Portfolio

Next.js portfolio site with an admin-driven CMS backend (Prisma + PostgreSQL).

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

Two databases are supported, both configured in `.env`:

| Command | Database |
| --- | --- |
| `npm run dev` | Local Postgres |
| `npm run dev:cloud` | Neon (cloud) |

First time setup for either one: `npm run db:setup`.

Never run raw `prisma migrate`/`db push` commands directly — use the scripts below, which also handle initialization:

| Command | Use for |
| --- | --- |
| `npm run db:setup` | Deploy migrations + initialize (production/first-time) |
| `npm run db:migrate` | Create a new dev migration + initialize |
| `npm run db:reset` | Full reset — **destroys all data** |
| `npm run initialize` | Rerun initialization (idempotent, safe) |
| `npm run db:verify` | Verify required records exist |

## Deploy

Deploy on [Vercel](https://vercel.com/new). Run `npm run db:setup` against production before first boot.
