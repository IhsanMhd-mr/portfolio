# Checkpoint 010: Canonical Authentication & Account Linking

**Date:** August 28, 2026
**Status:** Complete - local verification and GitHub CI run #27 pass

---

## 1. Authentication architecture discovered

- Next.js 16.2 uses Auth.js 5 with the Prisma adapter and PostgreSQL.
- `User` is the application identity and authorization source.
- Auth.js `Account` rows represent linked providers such as Google.
- `TrackedSession` stores revocable local and Google session state.
- Passwords use the existing PBKDF2-SHA256 format and are never stored or
  returned as plaintext.
- Roles are resolved from `User`; provider email addresses never grant roles.

## 2. Canonical account model

The final invariant is one human/account = one `User` row. The same account can
authenticate with:

- username + password;
- normalized email + password; and
- a linked Google identity.

The schema now includes unique `username`, unique `emailNormalized`, display
email, required `passwordHash`, email verification state, `UserRole`,
`UserStatus`, and timestamps. Database constraints prevent duplicate normalized
emails and duplicate provider identities.

Two migrations implement the data model:

- `20260828010000_auth_account_identity`
- `20260828020000_require_user_password_hash`

The second migration fails closed when a legacy passwordless user exists rather
than inventing or silently assigning a password.

## 3. Credentials login

- Username and normalized email resolve the same canonical account.
- Incorrect passwords and unknown identifiers return the same generic failure.
- Disabled accounts cannot authenticate.
- Password hashes remain server-only.
- Existing identifier and IP rate limits remain active.

## 4. Google OAuth and account linking

Google is a login method, not a user type.

### New Google identity

1. Google must provide a verified email.
2. The provider identity remains in a short-lived pending intent.
3. Account completion requires username, password and password confirmation.
4. Username/email uniqueness and password policy are validated.
5. The canonical `User` and Google `Account` link are created together.
6. Later Google and local credential logins resolve the same User ID.

No permanent passwordless application account is created during this flow.

### Existing credentials account

1. A verified Google email may identify an existing canonical User.
2. Email equality alone does not permanently attach the provider identity.
3. The current account password must confirm ownership.
4. The Google identity is linked only after successful confirmation.
5. Later Google logins resolve the already-linked User without asking for the
   password again.

An authenticated Admin can also start an explicit Google connection from the
security settings page. Provider emails that are not verified are rejected.

## 5. Password behavior

- New Google users must create a local password.
- Password change requires the current password, new password and confirmation.
- A successful password change revokes other active sessions.
- Google authentication alone is not accepted as password-reset proof.
- The password policy requires at least 12 characters and at least three of the
  uppercase, lowercase, digit and special-character classes.

## 6. Forgot-password and OTP boundary

The forgot-password page, route and service boundary exist, but recovery remains
intentionally unavailable until a real OTP transport and verifier are integrated.
The current endpoint:

- returns a generic, non-enumerating unavailable response;
- does not look up or disclose an account;
- does not issue a universal or development OTP;
- does not expose a password-reset endpoint without ownership proof; and
- excludes Super Admin.

Email and SMS delivery, hashed OTP challenge storage, expiry, one-time use,
attempt limits, resend cooldown and rate limiting remain deferred. Forced
temporary-password replacement still requires the current temporary password
until verified OTP delivery exists.

## 7. Super Admin credential rules

Super Admin is credentials-only and its password is immutable from inside the
application.

Server-side checks reject:

- normal password-change requests;
- forgot-password/recovery requests;
- Google login and linking;
- login-method mutation; and
- crafted account-management requests attempting to alter the credential.

The permanent credential is configured outside normal application editing. No
plaintext fallback is embedded in source. The historical Super Admin Google
identity was removed from local PostgreSQL and Neon, and two active Neon Google
sessions for that account were revoked. The normal Admin Google identity was
preserved.

## 8. Database deployment and integrity

Both authentication migrations were applied to local PostgreSQL and the
configured Neon database.

Post-deployment verification confirmed:

| Check | Local | Neon |
|---|---:|---:|
| Applied migrations | 9 | 9 |
| Canonical users | 2 | 2 |
| Passwordless users | 0 | 0 |
| Normalized-email conflicts | 0 | 0 |
| Provider-identity conflicts | 0 | 0 |
| Admin Google identities | 1 | 1 |
| Super Admin Google identities | 0 | 0 |
| Active Super Admin Google sessions | 0 | 0 |

The database role used for deployment was verified to have connection, DML,
schema creation and migration privileges. Neon migrations used the direct
endpoint; the application continues using its pooled endpoint.

## 9. CI build-database repair

The CI PostgreSQL service starts with an empty `portfolio` database for the
production build. Once passwordless users were prohibited, initialization
correctly refused to create the owner without `INITIAL_PASSWORD`.

The workflow now generates a cryptographically random, one-run build credential,
masks it in GitHub Actions and passes it only to the ephemeral initializer. No
real, reusable or plaintext owner password is committed.

The complete empty-database chain was reproduced locally:

1. create an isolated `_test` database;
2. apply all nine migrations;
3. create the canonical owner with an ephemeral password;
4. initialize required singleton/content-structure records;
5. run initialization verification; and
6. remove the throwaway database.

GitHub Actions CI run #27 passed on commit `bfba9fa`.

## 10. Verification

| Check | Result |
|---|---|
| Empty database migration + initialization + verification | Passed |
| `npm test` | 163 passed, 23 intentionally skipped |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run check:promoted` | 5 models, 81 columns, no drift |
| Production build | Passed |
| Neon `db:verify` | Passed |
| GitHub Actions CI #27 | Passed |

The authentication contract tests cover credential lookup, generic rejection,
new Google account completion, existing-account ownership confirmation,
duplicate prevention, password change, recovery unavailability and Super Admin
server-side protections.

## 11. Documentation

`privateReadme.md` now records:

- the canonical identity architecture;
- implemented credentials and Google behavior;
- deployed migration state;
- completed Super Admin identity reconciliation;
- current password-management rules;
- pending email/SMS OTP integration and security requirements; and
- provider/environment work still required.

## 12. Remaining work

- Integrate a real email and/or SMS OTP transport.
- Add hashed OTP challenge persistence, expiry, single-use invalidation, resend
  cooldown, request limits and verification-attempt limits.
- Add verified OTP as an alternative for Google linking and password change.
- Replace forced temporary-password confirmation with verified OTP.
- Confirm access before securely removing any legacy
  `.admin-credentials.local` file left by the old initializer.

No OTP delivery or password reset is claimed as functional until those controls
are implemented and verified.
