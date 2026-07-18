import { Mail, Globe, Link2 } from "lucide-react";
import { GithubIcon, LinkedinIcon, XIcon } from "@/components/ui/BrandIcons";

export const PLATFORM_KEYS = ["github", "linkedin", "twitter", "email", "website", "custom"] as const;
export type PlatformKey = (typeof PLATFORM_KEYS)[number];

interface PlatformMeta {
  key: PlatformKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  /** Hostname substring expected in the URL, for a non-blocking client warning. Null = no check (email/website/custom). */
  domainHint: string | null;
  placeholder: string;
}

export const PLATFORM_META: Record<PlatformKey, PlatformMeta> = {
  github: { key: "github", label: "GitHub", icon: GithubIcon, domainHint: "github.com", placeholder: "https://github.com/yourname" },
  linkedin: { key: "linkedin", label: "LinkedIn", icon: LinkedinIcon, domainHint: "linkedin.com", placeholder: "https://linkedin.com/in/yourname" },
  twitter: { key: "twitter", label: "Twitter / X", icon: XIcon, domainHint: null, placeholder: "https://x.com/yourname" },
  email: { key: "email", label: "Email", icon: Mail, domainHint: null, placeholder: "you@example.com" },
  website: { key: "website", label: "Website", icon: Globe, domainHint: null, placeholder: "https://yoursite.com" },
  custom: { key: "custom", label: "Custom", icon: Link2, domainHint: null, placeholder: "https://..." },
};

export function isPlatformKey(value: string): value is PlatformKey {
  return (PLATFORM_KEYS as readonly string[]).includes(value);
}

export function getPlatformMeta(platform: string): PlatformMeta {
  return isPlatformKey(platform) ? PLATFORM_META[platform] : PLATFORM_META.custom;
}

/** Best-effort, non-blocking check — used for a client-side warning only, never rejects. */
export function domainMismatchWarning(platform: string, url: string): string | null {
  const meta = getPlatformMeta(platform);
  if (!meta.domainHint) return null;
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (!host.includes(meta.domainHint)) {
      return `This doesn't look like a ${meta.label} URL (expected something with "${meta.domainHint}").`;
    }
  } catch {
    // Not a parseable URL yet — let required-field/URL validation handle it.
  }
  return null;
}
