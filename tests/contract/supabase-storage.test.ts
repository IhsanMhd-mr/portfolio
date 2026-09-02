import { afterEach, describe, expect, it } from "vitest";
import {
  isSupabaseStorageConfigured,
  mediaObjectPathFromPublicUrl,
} from "@/lib/supabase-storage";

const ORIGINAL = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  secret: process.env.SUPABASE_SECRET_KEY,
  legacySecret: process.env.SUPABASE_SERVICE_ROLE_KEY,
  bucket: process.env.SUPABASE_STORAGE_BUCKET,
};

afterEach(() => {
  setOrDelete("NEXT_PUBLIC_SUPABASE_URL", ORIGINAL.url);
  setOrDelete("SUPABASE_SECRET_KEY", ORIGINAL.secret);
  setOrDelete("SUPABASE_SERVICE_ROLE_KEY", ORIGINAL.legacySecret);
  setOrDelete("SUPABASE_STORAGE_BUCKET", ORIGINAL.bucket);
});

function setOrDelete(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe("Supabase Storage configuration", () => {
  it("requires a server-only secret before reporting writes as configured", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_STORAGE_BUCKET = "images";
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(isSupabaseStorageConfigured()).toBe(false);

    process.env.SUPABASE_SECRET_KEY = "server-only-test-value";
    expect(isSupabaseStorageConfigured()).toBe(true);
  });

  it("extracts only this project's managed media object paths", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_STORAGE_BUCKET = "images";

    expect(
      mediaObjectPathFromPublicUrl(
        "https://project.supabase.co/storage/v1/object/public/images/images/2026/photo.png"
      )
    ).toBe("images/2026/photo.png");
    expect(
      mediaObjectPathFromPublicUrl(
        "https://other.supabase.co/storage/v1/object/public/images/images/2026/photo.png"
      )
    ).toBeNull();
    expect(
      mediaObjectPathFromPublicUrl(
        "https://project.supabase.co/storage/v1/object/public/images/other/photo.png"
      )
    ).toBeNull();
  });
});
