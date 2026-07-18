This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Database Workflow (Mandatory)

Never run raw Prisma database commands (`prisma migrate dev`, `prisma migrate reset`, `prisma db push`, …) for the normal project workflow. Every controlled command below performs the database operation, then **automatically runs `scripts/initialize.js` and `scripts/verify-initialization.js`**. If any step fails, the whole command fails — the database is never silently left half-ready.

| Command | Use for |
| --- | --- |
| `npm run db:setup` | Existing production/deployment database — applies migrations, initializes, verifies |
| `npm run db:migrate` | Creating development migrations (`prisma migrate dev` + init + verify) |
| `npm run db:push` | Intentionally syncing the dev schema without migration files |
| `npm run db:reset` | Complete development reset — **destroys all data**, requires `-- --yes` |
| `npm run initialize` | Manually rerun safe, idempotent initialization |
| `npm run db:verify` | Verify all required records exist |

Initialization is **idempotent**: it creates the canonical owner (printing a temporary username/password **once** — only when no owner exists), the three templates, the site profile, the homepage with default sections, an initial published page version, and game settings. Existing records — including the owner's password and Google links — are always preserved; ordinary migrations never regenerate credentials. To deliberately regenerate a lost owner password, run `npm run initialize -- --reset`.

Production deployments should run `npm run db:setup` (or `npm run deploy:setup`) once per deploy, before starting the app — never regenerate credentials on server restart.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
