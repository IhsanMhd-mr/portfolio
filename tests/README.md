# Tests

Two suites with deliberately different costs.

| Command | Runs | Time | Needs |
| --- | --- | --- | --- |
| `npm test` | `tests/contract/**` — service-level | ~15 s | local Postgres |
| `npm run test:http` | contract **+** `tests/http/**` | ~2 min | local Postgres + a production build |

## The test database

Everything runs against a dedicated **`portfolio_test`** database, derived from
`DATABASE_URL_LOCAL` by appending `_test`. It is dropped and recreated on every
run, so no test can pass because of state left by a previous one.

`tests/setup/test-db-url.ts` refuses any database whose name does not end in
`_test`, and every destructive step calls that guard first — a misconfigured
`.env` fails the run instead of dropping your development data.

Override with `TEST_DATABASE_URL` (CI). The `_test` suffix is still enforced.

## Why two suites

Some invariants are not observable from the service layer. `PublicContentService`
filters hidden rows correctly, yet `/projects/[slug]` runs its own query and can
still serve them; and the homepage components re-sort data the service already
ordered. Only a real HTTP response shows those, which is what `tests/http/**` is
for — and why it pays for a production build.

Compare **rendered DOM**, not the raw response: Next embeds the RSC flight
payload in inline scripts, so every string appears at least twice in the HTML.
Use the helpers in `tests/http/dom.ts`.

## `it.fails` — known bugs

A test that documents a bug we have not fixed yet is marked `it.fails`: it
asserts the behaviour we *want*, and the marker records that the code does not
do it. When the bug is fixed the test starts failing **because it passes**,
which forces whoever fixed it to remove the marker. A `skip` would rot silently.

There are currently **no** `it.fails` markers — B1 (hidden project served at its
detail URL) and B2 (homepage discarding the admin `order` column) have both been
fixed and their tests now assert the corrected behaviour directly.

## Fixture

`tests/fixtures/seed.ts`. Note that education/experience rows are seeded so
`order` and `startDate` **disagree** — a fixture where they agree would pass
whichever sort the code happened to use, which is exactly bug B2.

## Shared state

Test files run serially against one database. Any file that mutates fixture
rows must restore them — `tests/contract/unpublished-changes.test.ts` creates
and reorders groups, and cleans up in `afterAll`, so that
`section-composition.test.ts` (which asserts an exact rendered sequence) does
not depend on which file happened to run first.
