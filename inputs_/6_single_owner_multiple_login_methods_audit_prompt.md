# Single-Owner Authentication with Multiple Login Methods and Edit Audit Log

## Codebase Audit and Implementation Prompt

Inspect the existing portfolio authentication system and update it for a **single-owner portfolio**.

There is only one real person who can access the admin panel: the portfolio owner.

Do not implement:

- Roles
- Multiple permission levels
- Editors
- Admin teams
- Public user registration
- Pending user approval
- Multi-user account management

The system must support multiple login methods for the same owner:

- Username and password
- One or more linked Google accounts
- Additional login identities added later by the owner

All login methods must provide access to the same admin account, the same dashboard, the same portfolio data, and the same owner profile.

Also implement an audit log that records:

- Login activity
- Logout activity
- Failed login attempts
- Google account linking and unlinking
- Project edits
- Page-builder changes
- Template changes
- Media changes
- Publishing actions
- Deletions and restorations
- Site-setting changes

Do not request access to Gmail inbox data.

Use Google OAuth/OpenID Connect only for identity authentication with the minimum scopes:

```text
openid
email
profile
```

---

# 1. Final Authentication Model

Use this concept:

```text
Single Portfolio Owner
├── Username/password login
├── Google account 1
├── Google account 2
├── Google account 3
└── Future linked login methods
```

All identities must map to one canonical owner account.

Recommended architecture:

```text
Owner
  ├── Local Credential
  ├── Google Identity A
  ├── Google Identity B
  └── Google Identity C
```

Do not create separate portfolio data for each login method.

Do not treat each Google account as a different admin person.

---

# 2. Authentication Terminology

Use these terms consistently.

## Owner

The single real person who owns and manages the portfolio.

## Login Identity

A method the owner can use to prove their identity.

Examples:

- Username/password
- Personal Google account
- University Google account
- Work Google account

## Session

A temporary authenticated browser session created after a successful login.

## Audit Event

A record of an authentication or content-management action.

---

# 3. Required Routes

Use or adapt these routes:

```text
/admin/login
/admin/dashboard
/admin/settings/security
/admin/settings/security/add-google
/admin/settings/security/change-password
/admin/settings/security/sessions
/admin/audit-log
```

Authentication API routes may include:

```text
/api/auth/login
/api/auth/logout
/api/auth/session
/api/auth/google
/api/auth/google/callback
/api/auth/link-google
/api/auth/unlink-google
```

If Auth.js is already used, adapt these routes to the installed version rather than creating duplicate auth endpoints.

---

# 4. Admin Login Page

Route:

```text
/admin/login
```

The login page must provide:

```text
Portfolio Admin

Username or Email
[________________________]

Password
[____________________] [Show]

[Sign In]

──────────── OR ────────────

[Continue with Google]

[Back to Portfolio]
```

## Login Options

### Username Login

The owner enters:

- Username or primary email
- Password

### Google Login

The owner chooses a Google account.

Only previously linked Google identities may access the dashboard.

Unknown Google accounts must be rejected.

Do not show a public registration option.

Do not automatically create a new admin account from an unknown Google login.

---

# 5. Initial Username Login

Create a safe one-time owner initialization command.

Example:

```text
npm run admin:init
```

Use environment variables only for initialization:

```env
INITIAL_ADMIN_USERNAME=
INITIAL_ADMIN_EMAIL=
INITIAL_ADMIN_PASSWORD=
```

The command must:

1. Check whether the owner account already exists.
2. Refuse duplicate initialization.
3. Validate username and email.
4. Enforce a strong password.
5. Hash the password using Argon2id or bcrypt.
6. Create one canonical owner record.
7. Create the local username/password identity.
8. Mark `mustChangePassword` as true.
9. Avoid printing the password.
10. Instruct the developer to remove the plaintext password from environment files afterward.

Do not:

- Hard-code credentials
- Commit credentials
- Create the owner on every application startup
- Expose owner creation as a public API
- Allow open username registration

---

# 6. First Login Flow

```text
Run admin initialization command
→ Owner record created
→ Open /admin/login
→ Enter username and password
→ Server verifies password
→ Session created
→ If mustChangePassword is true
→ Redirect to change-password page
→ Open dashboard
```

After the first login, the owner can link Google accounts.

---

# 7. Google OAuth Login

Add:

```text
Continue with Google
```

Use Google OAuth/OpenID Connect.

Request only:

```text
openid
email
profile
```

Do not request:

- Gmail read access
- Gmail send access
- Google Contacts
- Google Drive
- Google Calendar

## Existing Linked Google Account Flow

```text
Click Continue with Google
→ Select Google account
→ Google verifies identity
→ Application receives callback
→ Verify Google email
→ Find linked login identity
→ Confirm it belongs to the owner
→ Create session
→ Redirect to /admin/dashboard
```

## Unknown Google Account Flow

```text
Click Continue with Google
→ Google verifies identity
→ No linked login identity found
→ Reject admin login
→ Show safe error
```

Use a message such as:

```text
This Google account is not linked to the portfolio owner account.
```

Do not create a new owner account automatically.

---

# 8. Adding Another Google Login

Additional Google accounts must be linked from inside the authenticated admin panel.

Route:

```text
/admin/settings/security
```

Provide:

```text
Linked Login Methods

Username: ihsan
Primary Email: owner@example.com

Google Accounts
- personal@gmail.com
- university@example.com

[Link Another Google Account]
```

## Link Flow

```text
Owner logs in
→ Opens Security Settings
→ Clicks Link Another Google Account
→ Re-enters password or confirms recent authentication
→ Application creates secure link state
→ Google OAuth starts
→ Owner selects Google account
→ Callback verifies state and Google identity
→ New Google identity linked to existing owner
→ Audit event recorded
```

Requirements:

- Linking must begin from an authenticated owner session.
- Use OAuth state protection.
- Verify the returned Google email.
- Prevent duplicate provider identities.
- Prevent the same Google account from being linked twice.
- Do not create a second portfolio owner.
- Show the newly linked account in Security Settings.

---

# 9. Optional “Register Login Method” Wording

The interface may use:

```text
Add Login Method
```

or:

```text
Link Another Google Account
```

Avoid:

```text
Register New User
```

because there is no second user.

The owner is registering another way to log in, not another person.

---

# 10. Unlinking a Google Account

The owner may unlink a Google identity.

Flow:

```text
Security Settings
→ Select linked Google account
→ Click Unlink
→ Confirm current password or recent authentication
→ Verify another login method remains
→ Remove provider link
→ Revoke local session references where needed
→ Record audit event
```

Rules:

- Never allow removal of the final available login method.
- Keep username/password login as the recovery method.
- Do not allow unlinking from an unauthenticated page.
- Require re-authentication for unlinking.
- Show the Google email being removed.

---

# 11. Single-Owner Database Design

Use one canonical owner record.

## Owner

```text
Owner
-----
id
username
primaryEmail
displayName
profileImage
passwordHash
mustChangePassword
failedLoginAttempts
lockedUntil
lastLoginAt
createdAt
updatedAt
```

Only one active owner record should exist.

Enforce this at the application level and, where practical, through a singleton key or fixed owner identifier.

## LoginIdentity

```text
LoginIdentity
-------------
id
ownerId
provider
providerAccountId
email
emailVerified
displayName
profileImage
isEnabled
linkedAt
lastUsedAt
createdAt
updatedAt
```

Possible providers:

```text
LOCAL
GOOGLE
```

For the local identity:

- `providerAccountId` may be the normalized username.
- Password hash may remain on `Owner` or a separate `LocalCredential` model.

For Google:

- Store the Google subject/provider account ID.
- Store the verified email.
- Store only the identity information required for login.

Do not store long-lived Gmail access tokens unless a future feature genuinely requires Google API access.

## Session

```text
Session
-------
id
ownerId
loginIdentityId
sessionTokenHash
expiresAt
createdAt
lastSeenAt
ipAddress
userAgent
revokedAt
```

## AuditLog

```text
AuditLog
--------
id
ownerId
loginIdentityId
action
entityType
entityId
summary
beforeJson
afterJson
ipAddress
userAgent
createdAt
```

---

# 12. Alternative Auth.js-Compatible Schema

If the installed auth library requires a standard `User` table, use one user record for the owner and multiple provider accounts.

```text
User
----
id
username
email
name
image
passwordHash
mustChangePassword
createdAt
updatedAt
```

```text
Account
-------
id
userId
provider
providerAccountId
type
createdAt
updatedAt
```

All `Account.userId` values must point to the same owner `User.id`.

Do not create one separate `User` row per Google account unless the existing library makes it unavoidable.

If separate auth-user rows already exist, link them through one canonical `ownerId` and ensure portfolio data still belongs to the same owner.

---

# 13. Session Data

The authenticated session should contain safe information only:

```text
owner.id
owner.username
owner.primaryEmail
owner.displayName
owner.profileImage
loginIdentity.id
loginIdentity.provider
loginIdentity.email
```

Do not store:

- Password hash
- Raw session token
- Google client secret
- OAuth authorization code
- Sensitive database fields

Every protected server action must verify the session server-side.

---

# 14. Protected Admin Routes

Protect:

```text
/admin/dashboard
/admin/page-builder
/admin/templates
/admin/projects
/admin/technologies
/admin/timeline
/admin/education
/admin/experience
/admin/media
/admin/messages
/admin/game
/admin/settings
/admin/settings/security
/admin/audit-log
/admin/preview
/admin/publish-confirmation
```

Protection flow:

```text
Admin request
→ Read secure session cookie
→ Verify session
→ Confirm owner exists
→ Confirm login identity is enabled
→ Allow request
```

If invalid:

```text
Redirect to /admin/login
```

There are no role checks because there is only one owner.

---

# 15. Username and Password Security

Use:

- Argon2id, or
- bcrypt with an appropriate work factor

Implement:

- Minimum password length
- Strong-password validation
- Failed-attempt tracking
- Temporary lockout
- Password change
- Current-password confirmation
- Session revocation after password change
- `mustChangePassword` after initialization

Do not:

- Store plaintext passwords
- Log passwords
- Email passwords
- Return password hashes
- Trust client-side authentication flags

---

# 16. Google OAuth Configuration

Use environment variables such as:

```env
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
DATABASE_URL=

INITIAL_ADMIN_USERNAME=
INITIAL_ADMIN_EMAIL=
INITIAL_ADMIN_PASSWORD=
```

Document Google Cloud Console setup:

1. Create or select a Google Cloud project.
2. Configure the OAuth consent screen.
3. Create a Web application OAuth client.
4. Add local authorized origin.
5. Add production authorized origin.
6. Add the exact callback URL.
7. Copy client ID and secret into environment variables.

A typical callback may resemble:

```text
http://localhost:3000/api/auth/callback/google
https://your-domain.com/api/auth/callback/google
```

Verify the exact callback route from the installed authentication library.

Never commit real secrets.

---

# 17. Security Settings Page

Route:

```text
/admin/settings/security
```

Recommended sections:

## Local Login

Show:

- Username
- Primary email
- Password last changed
- Change Password button

## Linked Google Accounts

Show:

- Google email
- Display name
- Profile image
- Linked date
- Last used date
- Unlink button

## Active Sessions

Show:

- Browser or device
- Approximate IP or location where appropriate
- Login method
- Created date
- Last active date
- Revoke button

## Security Activity

Show recent:

- Successful logins
- Failed logins
- Password changes
- Google links
- Google unlinks
- Session revocations

---

# 18. Edit Audit Log

Create a dedicated audit log page:

```text
/admin/audit-log
```

The audit log must record important content edits.

## Actions to Record

### Authentication

```text
LOGIN_SUCCESS
LOGIN_FAILED
LOGOUT
PASSWORD_CHANGED
GOOGLE_LINKED
GOOGLE_UNLINKED
SESSION_REVOKED
```

### Projects

```text
PROJECT_CREATED
PROJECT_UPDATED
PROJECT_HIDDEN
PROJECT_SHOWN
PROJECT_DELETED
PROJECT_RESTORED
```

### Page Builder

```text
SECTION_ADDED
SECTION_UPDATED
SECTION_REORDERED
SECTION_HIDDEN
SECTION_SHOWN
SECTION_DELETED
SECTION_DUPLICATED
```

### Templates

```text
TEMPLATE_SELECTED
TEMPLATE_SETTINGS_UPDATED
```

### Other Content

```text
TECHNOLOGY_CREATED
TECHNOLOGY_UPDATED
TIMELINE_UPDATED
EDUCATION_UPDATED
EXPERIENCE_UPDATED
MEDIA_UPLOADED
MEDIA_REPLACED
MEDIA_DELETED
SITE_SETTINGS_UPDATED
PORTFOLIO_PUBLISHED
```

---

# 19. Audit Log Data Requirements

Each audit event should include:

```text
Timestamp
Login method used
Linked Google email or username
Action
Entity type
Entity ID
Human-readable summary
Before state, when useful
After state, when useful
IP address
User agent
```

Example:

```text
14 July 2026, 9:15 PM
Login method: Google
Identity: personal@gmail.com
Action: PROJECT_UPDATED
Entity: LIVEDET
Summary: Updated project summary and GitHub URL
```

Even though every identity is the same person, storing the login identity shows which account or method was used.

---

# 20. Audit Log UI

Route:

```text
/admin/audit-log
```

Features:

- Search
- Date filter
- Action filter
- Entity-type filter
- Login-method filter
- Expand event details
- Show before and after values
- Pagination
- Read-only access

Example table:

```text
Date       Login Method   Identity              Action             Entity
14 Jul     Google         personal@gmail.com    PROJECT_UPDATED    LIVEDET
14 Jul     Username       ihsan                  SECTION_REORDERED  Homepage
13 Jul     Google         university@email.com  MEDIA_UPLOADED     hero.webp
```

Do not allow normal deletion or editing of audit records from the admin UI.

---

# 21. Audit Logging Implementation

Use a central audit service.

Example responsibility:

```text
auditService.record({
  ownerId,
  loginIdentityId,
  action,
  entityType,
  entityId,
  summary,
  before,
  after,
  requestContext
})
```

Do not manually implement unrelated audit logic differently in every feature.

Call the audit service from:

- Project service
- Page-builder service
- Template service
- Media service
- Site-settings service
- Authentication service
- Publishing service

Avoid storing huge binary or file content in audit JSON.

For sensitive fields:

- Redact passwords
- Redact session tokens
- Redact secrets
- Redact OAuth tokens

---

# 22. Authentication Audit Flow

## Successful Username Login

```text
Username/password verified
→ Session created
→ Record LOGIN_SUCCESS
→ loginIdentity = LOCAL
```

## Successful Google Login

```text
Google identity verified
→ Linked identity found
→ Session created
→ Record LOGIN_SUCCESS
→ loginIdentity = selected Google account
```

## Failed Login

```text
Login rejected
→ Record LOGIN_FAILED
→ Do not store entered password
```

---

# 23. Content Edit Audit Flow

Example project edit:

```text
Admin submits edit
→ Server verifies session
→ Load current project
→ Validate new data
→ Update project
→ Record before and after values
→ Return success
```

Example page reorder:

```text
Admin drags section
→ Save draft positions
→ Record old order
→ Record new order
→ Action = SECTION_REORDERED
```

---

# 24. Folder Structure

Adapt to the existing repository.

Suggested structure:

```text
src/
├── app/
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   ├── settings/
│   │   │   └── security/
│   │   │       └── page.tsx
│   │   └── audit-log/
│   │       └── page.tsx
│   └── api/
│       └── auth/
├── components/
│   └── admin/
│       ├── auth/
│       │   ├── AdminLoginForm.tsx
│       │   ├── GoogleLoginButton.tsx
│       │   ├── LinkedIdentityCard.tsx
│       │   └── ActiveSessionCard.tsx
│       └── audit/
│           ├── AuditTable.tsx
│           ├── AuditFilters.tsx
│           └── AuditDetails.tsx
├── lib/
│   ├── auth.ts
│   ├── session.ts
│   ├── password.ts
│   ├── google-linking.ts
│   ├── request-context.ts
│   └── audit.ts
├── services/
│   ├── auth.service.ts
│   ├── audit.service.ts
│   └── security.service.ts
├── repositories/
│   ├── owner.repository.ts
│   ├── login-identity.repository.ts
│   └── audit.repository.ts
├── scripts/
│   └── initialize-owner.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── middleware.ts
```

---

# 25. Required Login Flows

## Username Login

```text
/admin/login
→ Enter username/password
→ Server verifies local credential
→ Session created
→ Audit LOGIN_SUCCESS
→ /admin/dashboard
```

## Google Login

```text
/admin/login
→ Continue with Google
→ Select linked Google account
→ Google verifies identity
→ Server finds linked identity
→ Session created
→ Audit LOGIN_SUCCESS
→ /admin/dashboard
```

## Unknown Google Login

```text
Continue with Google
→ Google verifies identity
→ No linked identity
→ Reject login
→ Audit LOGIN_FAILED
→ Return to login
```

## Add Another Google Login

```text
Login first
→ Security Settings
→ Link Another Google Account
→ Re-authenticate
→ Google OAuth
→ Link to same owner
→ Audit GOOGLE_LINKED
```

---

# 26. Tests

Add tests for:

## Local Login

- Correct username/password
- Incorrect username
- Incorrect password
- Locked account
- Password hashing
- First-login password-change flow
- Session persistence
- Logout

## Google Login

- Linked Google account succeeds
- Unknown Google account is rejected
- Disabled Google identity is rejected
- Duplicate link is prevented
- New Google identity links to same owner
- Unlink works
- Final login method cannot be removed

## Sessions

- Protected admin route requires session
- Revoked session fails
- Expired session fails
- Session records login identity
- Password change revokes other sessions

## Audit Log

- Login success recorded
- Login failure recorded
- Google link recorded
- Project edit recorded
- Page reorder recorded
- Media deletion recorded
- Before and after values saved
- Sensitive fields redacted
- Audit log is read-only

---

# 27. Acceptance Criteria

The implementation is complete only when:

- Exactly one canonical owner account exists
- Username/password login works
- Google login works for linked accounts
- Multiple Google accounts can be linked
- All login methods open the same dashboard
- Unknown Google accounts cannot become admins
- No public registration exists
- No roles exist
- No multi-user permission system exists
- Username/password remains available as recovery
- The final login method cannot be removed
- Sessions record the login identity used
- Edit actions create audit records
- Login actions create audit records
- Audit logs show which login identity was used
- Protected routes and APIs verify the owner session
- Passwords and secrets are never logged
- Existing portfolio features remain working
- Migrations and tests pass

---

# 28. Required Implementation Report

After updating the repository, provide:

1. Existing authentication approach found
2. New canonical owner model
3. Login identity model
4. Username initialization command
5. Google OAuth setup
6. Google account linking flow
7. Unknown Google rejection behavior
8. Session changes
9. Audit-log model
10. Features now audited
11. Routes added or changed
12. Environment variables
13. Google callback URLs
14. Database migration
15. Tests completed
16. Remaining manual setup

Do not claim Google OAuth is complete unless valid OAuth credentials and the callback flow were tested.

---

# 29. Final Instruction to the Code Editor

Inspect the current repository and implement this directly.

Do not create roles.

Do not create a public registration system.

Do not create multiple portfolio owners.

Use one owner account with multiple linked login identities.

Each linked username or Google account may be represented as a separate authentication identity record, but all identities must map to the same owner.

Record which identity was used for each login and edit action.

Preserve working authentication and portfolio code where possible, but remove any conflicting multi-user or role-based logic that is not needed.
