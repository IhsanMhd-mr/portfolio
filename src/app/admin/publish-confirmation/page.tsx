"use client";

import { useEffect, useState } from "react";
import { UploadCloud, CheckCircle, ArrowRight, LayoutGrid } from "lucide-react";
import Link from "next/link";

interface PublishDiff {
  hasUnpublishedChanges: boolean;
  draftTemplate: string;
  draftTemplateKey: string;
  publishedTemplate: string;
  hasTemplateDiff: boolean;
  draftSectionsCount: number;
  publishedSectionsCount: number;
  hasSectionsDiff: boolean;
  hasContentDiff: boolean;
  changedEntities: { type: string; label: string }[];
  sectionsList: {
    id: string;
    label: string;
    type: string;
    visible: boolean;
    order: number;
  }[];
}

export default function PublishConfirmationPage() {
  const [diff, setDiff] = useState<PublishDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDiff() {
      try {
        const res = await fetch("/api/publish");
        if (res.ok) {
          const data = await res.json();
          setDiff(data);
        } else {
          setError("Failed to compile layout differences.");
        }
      } catch (err) {
        console.error(err);
        setError("Network error fetching compilation details.");
      } finally {
        setLoading(false);
      }
    }
    loadDiff();
  }, []);

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPublishSuccess(data.version);
      } else {
        setError(data.error || "Failed to publish page.");
      }
    } catch (err) {
      console.error(err);
      setError("A network error occurred while publishing.");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--a-soft)] font-mono text-xs">
        <span>Compiling draft layout differences...</span>
      </div>
    );
  }

  if (publishSuccess !== null) {
    return (
      <div 
        className="max-w-2xl mx-auto p-8 border border-solid border-[var(--a-success-ink)]/20 bg-[var(--a-success-bg)] rounded-[var(--a-r-md)] text-center space-y-6"
        style={{ boxShadow: "var(--a-shadow)" }}
      >
        <div className="flex justify-center text-[var(--a-success-ink)]">
          <CheckCircle size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[var(--a-ink)]">Deployment Succeeded!</h2>
          <p className="text-xs text-[var(--a-soft)] font-mono">
            SNAPSHOT VERSION #{publishSuccess} IS NOW LIVE
          </p>
        </div>
        <p className="text-sm text-[var(--a-soft)] max-w-md mx-auto">
          Your draft sections, page order, and template configurations have been snapshot-saved and bound to the public homepage router.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--a-primary)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] border-none"
          >
            Visit Live Site
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 border border-solid border-[var(--a-line)] text-[var(--a-soft)] text-xs font-semibold rounded-[var(--a-r-sm)]"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // A real draft-vs-live comparison, not the sticky `hasUnpublishedChanges`
  // latch — that flag stayed true after an edit was reverted (e.g. switching
  // template A→B→A), which is why this page used to keep asking to publish
  // when nothing had actually changed.
  const pendingChanges =
    diff?.hasTemplateDiff || diff?.hasSectionsDiff || diff?.hasContentDiff;

  // Name what changed rather than just asserting that something did.
  const changeSummary = (() => {
    if (!diff) return "";
    const parts: string[] = [];
    if (diff.hasTemplateDiff) parts.push("the template");
    if (diff.hasSectionsDiff) parts.push("the homepage layout");
    if (diff.hasContentDiff) {
      const n = diff.changedEntities.length;
      parts.push(`${n} content item${n === 1 ? "" : "s"}`);
    }
    if (parts.length === 0) return "";
    const list =
      parts.length === 1
        ? parts[0]
        : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
    return `Waiting to go live: ${list}.`;
  })();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Publish Live Layout</h1>
        <p className="text-sm text-[var(--a-soft)] mt-1.5 font-sans">
          Verify and deployment-snapshot all layout, components sequencing, and theme templates to the public route.
        </p>
      </div>

      {error && (
        <div className="p-4 border border-solid border-[var(--a-danger-ink)]/20 bg-[var(--a-danger-bg)] text-[var(--a-danger-ink)] rounded-[var(--a-r-sm)] text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Comparison Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Template differences */}
        <div 
          className={`p-6 border border-solid rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-4 ${
            diff?.hasTemplateDiff ? "border-[var(--a-warn-ink)]/40 bg-[var(--a-warn-bg)]" : "border-[var(--a-line)]"
          }`}
          style={{ boxShadow: "var(--a-shadow)" }}
        >
          <h3 className="font-bold text-sm text-[var(--a-ink)] flex items-center gap-2">
            <LayoutGrid size={16} className="text-[var(--a-primary)]" />
            Template Stylesheet
          </h3>
          
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <p className="text-[9px] text-[var(--a-faint)] uppercase">Published Live</p>
              <p className="font-semibold text-[var(--a-ink)] mt-0.5 uppercase">{diff?.publishedTemplate}</p>
            </div>
            <div>
              <p className="text-[9px] text-[var(--a-faint)] uppercase">Draft Pending</p>
              <p className={`font-semibold mt-0.5 uppercase ${diff?.hasTemplateDiff ? "text-[var(--a-warn-ink)] font-bold" : "text-[var(--a-ink)]"}`}>
                {diff?.draftTemplateKey.replace("_", " ")}
              </p>
            </div>
          </div>
          {diff?.hasTemplateDiff && (
            <p className="text-[10px] text-[var(--a-warn-ink)] bg-[var(--a-warn-bg)] p-2.5 rounded border border-solid border-[var(--a-warn-ink)]/20 font-medium">
              ⚠️ Template style will be switched to {diff.draftTemplateKey}.
            </p>
          )}
        </div>

        {/* Homepage layout differences — the comparison is a deep one over the
            whole snapshot, so it catches reordering and per-section settings
            edits, not just a change in how many sections there are. */}
        <div
          className={`p-6 border border-solid rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-4 ${
            diff?.hasSectionsDiff ? "border-[var(--a-warn-ink)]/40 bg-[var(--a-warn-bg)]" : "border-[var(--a-line)]"
          }`}
          style={{ boxShadow: "var(--a-shadow)" }}
        >
          <h3 className="font-bold text-sm text-[var(--a-ink)] flex items-center gap-2">
            <UploadCloud size={16} className="text-[var(--a-primary)]" />
            Homepage Layout
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <p className="text-[9px] text-[var(--a-faint)] uppercase">Published Live</p>
              <p className="font-semibold text-[var(--a-ink)] mt-0.5">{diff?.publishedSectionsCount} Sections</p>
            </div>
            <div>
              <p className="text-[9px] text-[var(--a-faint)] uppercase">Draft Pending</p>
              <p className={`font-semibold mt-0.5 ${diff?.hasSectionsDiff ? "text-[var(--a-warn-ink)] font-bold" : "text-[var(--a-ink)]"}`}>
                {diff?.draftSectionsCount} Sections
              </p>
            </div>
          </div>
          {diff?.hasSectionsDiff && (
            <p className="text-[10px] text-[var(--a-warn-ink)] bg-[var(--a-warn-bg)] p-2.5 rounded border border-solid border-[var(--a-warn-ink)]/20 font-medium">
              {diff.publishedSectionsCount !== diff.draftSectionsCount
                ? `⚠️ Total sections rendering will change from ${diff.publishedSectionsCount} to ${diff.draftSectionsCount}.`
                : "⚠️ Section order or settings have changed since the last publish."}
            </p>
          )}
        </div>
      </div>

      {/* Sections breakdown sequence */}
      <div className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-4" style={{ boxShadow: "var(--a-shadow)" }}>
        <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3">
          Pending Homepage Sections Sequence
        </h3>
        
        <div className="space-y-3 font-mono text-[10px]">
          {diff?.sectionsList.map((sec, idx) => (
            <div key={sec.id} className="flex items-center justify-between p-3 border border-solid border-[var(--a-line)] rounded bg-[var(--a-bg)]">
              <div className="flex items-center gap-3">
                <span className="text-[var(--a-faint)]">#{idx + 1}</span>
                <span className="font-bold text-[var(--a-ink)]">{sec.label}</span>
                <span className="text-[8px] bg-[var(--a-inset)] px-1.5 py-0.5 rounded text-[var(--a-faint)]">{sec.type}</span>
              </div>
              <span className={sec.visible ? "text-[var(--a-success-ink)] font-bold" : "text-[var(--a-danger-ink)]"}>
                {sec.visible ? "VISIBLE" : "HIDDEN"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation and Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-inset)]">
        <div className="space-y-1">
          <h4 className="font-bold text-sm text-[var(--a-ink)]">Ready to release?</h4>
          <p className="text-xs text-[var(--a-soft)]">
            {pendingChanges ? changeSummary : "No unpublished changes detected."}
          </p>
          {pendingChanges && diff && diff.changedEntities.length > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-1.5 list-none p-0 m-0">
              {diff.changedEntities.slice(0, 8).map((c, i) => (
                <li
                  key={`${c.type}-${c.label}-${i}`}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded-[var(--a-r-sm)] bg-[var(--a-inset)] text-[var(--a-soft)]"
                >
                  {c.type}: {c.label}
                </li>
              ))}
              {diff.changedEntities.length > 8 && (
                <li className="text-[10px] font-mono px-1.5 py-0.5 text-[var(--a-faint)]">
                  +{diff.changedEntities.length - 8} more
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex items-center gap-1.5 px-6 py-2 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] cursor-pointer disabled:opacity-50 transition-colors border-none"
          >
            <UploadCloud size={14} />
            {publishing ? "Publishing..." : "Confirm & Go Live"}
          </button>
        </div>
      </div>
    </div>
  );
}
