-- A pending Google identity lives in account_link_intents, never in users.
-- Refuse to guess or invent passwords for any unexpected legacy row.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "users" WHERE "password_hash" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require users.password_hash: passwordless users require manual review';
  END IF;
END $$;

ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL;
