-- Establish canonical account identity and authorization state without
-- deleting or merging any existing users or OAuth identities.
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "GoogleAuthIntentKind" AS ENUM ('LOGIN', 'LINK');
CREATE TYPE "GoogleAuthIntentState" AS ENUM ('STARTED', 'NEW_ACCOUNT', 'EXISTING_ACCOUNT');

ALTER TABLE "users"
  ADD COLUMN "email_normalized" TEXT,
  ADD COLUMN "email_verified" TIMESTAMP(3),
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER',
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "users"
SET
  "email_normalized" = lower(trim("email")),
  "role" = CASE
    WHEN "password_locked" = true THEN 'SUPERADMIN'::"UserRole"
    ELSE 'ADMIN'::"UserRole"
  END;

ALTER TABLE "users" ALTER COLUMN "email_normalized" SET NOT NULL;
CREATE UNIQUE INDEX "users_email_normalized_key" ON "users"("email_normalized");

ALTER TABLE "account_link_intents"
  ALTER COLUMN "user_id" DROP NOT NULL,
  ADD COLUMN "kind" "GoogleAuthIntentKind" NOT NULL DEFAULT 'LOGIN',
  ADD COLUMN "state" "GoogleAuthIntentState" NOT NULL DEFAULT 'STARTED',
  ADD COLUMN "provider_account_id" TEXT,
  ADD COLUMN "verified_email" TEXT,
  ADD COLUMN "display_name" TEXT,
  ADD COLUMN "callback_url" TEXT,
  ADD COLUMN "attempt_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "account_link_intents"
  ADD CONSTRAINT "account_link_intents_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
