import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_MEDIA_MAX_BYTES = 5 * 1024 * 1024;

export const SUPABASE_MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
  "application/pdf",
] as const;

type StorageConfig = {
  url: string;
  secretKey: string;
  bucket: string;
};

let storageClient: SupabaseClient | null = null;
let bucketReady: Promise<void> | null = null;

export function isSupabaseStorageConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim() &&
      (process.env.SUPABASE_STORAGE_BUCKET || "images").trim()
  );
}

function getStorageConfig(): StorageConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secretKey = (
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  )?.trim();
  const bucket = (process.env.SUPABASE_STORAGE_BUCKET || "images").trim();

  if (!url) {
    throw new Error("Supabase Storage is not configured: NEXT_PUBLIC_SUPABASE_URL is missing.");
  }
  if (!secretKey) {
    throw new Error(
      "Supabase Storage writes require the server-only SUPABASE_SECRET_KEY. " +
        "Create one in the Supabase project API settings; do not expose it to browser code."
    );
  }
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(bucket)) {
    throw new Error("SUPABASE_STORAGE_BUCKET contains unsupported characters.");
  }

  return { url, secretKey, bucket };
}

function getStorageClient() {
  if (storageClient) return storageClient;

  const { url, secretKey } = getStorageConfig();
  storageClient = createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return storageClient;
}

function isNotFound(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { status?: number; statusCode?: string; code?: string };
  return value.status === 404 || value.statusCode === "404" || value.code === "NoSuchBucket";
}

async function prepareBucket() {
  const client = getStorageClient();
  const { bucket } = getStorageConfig();
  const current = await client.storage.getBucket(bucket);

  if (current.data) {
    if (!current.data.public) {
      throw new Error(
        `Supabase bucket '${bucket}' exists but is private. MediaAsset URLs require a public bucket.`
      );
    }
    return;
  }

  if (!isNotFound(current.error)) {
    throw new Error(`Unable to inspect Supabase bucket '${bucket}': ${current.error?.message}`);
  }

  const created = await client.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: SUPABASE_MEDIA_MAX_BYTES,
    allowedMimeTypes: [...SUPABASE_MEDIA_MIME_TYPES],
  });

  if (created.error) {
    throw new Error(`Unable to create Supabase bucket '${bucket}': ${created.error.message}`);
  }
}

async function ensureBucket() {
  if (!bucketReady) bucketReady = prepareBucket();
  try {
    await bucketReady;
  } catch (error) {
    bucketReady = null;
    throw error;
  }
}

export async function uploadMediaObject(
  objectPath: string,
  body: Buffer,
  contentType: string
) {
  await ensureBucket();
  const client = getStorageClient();
  const { bucket } = getStorageConfig();
  const result = await client.storage.from(bucket).upload(objectPath, body, {
    contentType,
    cacheControl: "31536000",
    upsert: false,
  });

  if (result.error) {
    throw new Error(`Supabase upload failed: ${result.error.message}`);
  }

  const { data } = client.storage.from(bucket).getPublicUrl(result.data.path);
  return { objectPath: result.data.path, publicUrl: data.publicUrl };
}

export async function removeMediaObject(objectPath: string) {
  const client = getStorageClient();
  const { bucket } = getStorageConfig();
  const result = await client.storage.from(bucket).remove([objectPath]);
  if (result.error) {
    throw new Error(`Supabase delete failed: ${result.error.message}`);
  }
}

export function mediaObjectPathFromPublicUrl(publicUrl: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const bucket = (process.env.SUPABASE_STORAGE_BUCKET || "images").trim();
  if (!url) return null;

  try {
    const assetUrl = new URL(publicUrl);
    const projectUrl = new URL(url);
    const prefix = `/storage/v1/object/public/${bucket}/`;
    if (assetUrl.origin !== projectUrl.origin || !assetUrl.pathname.startsWith(prefix)) {
      return null;
    }

    const objectPath = decodeURIComponent(assetUrl.pathname.slice(prefix.length));
    if (!objectPath.startsWith("images/") || objectPath.includes("..") || objectPath.includes("\\")) {
      return null;
    }
    return objectPath;
  } catch {
    return null;
  }
}
