import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Server-rendered pager (plain <Link>s, no client JS). `buildHref` lets each
 * caller decide how to carry its own filters/search params across page changes.
 */
export default function Pagination({
  currentPage,
  totalPages,
  buildHref,
}: {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const atStart = currentPage <= 1;
  const atEnd = currentPage >= totalPages;

  const linkCls = (disabled: boolean) =>
    `flex items-center gap-1 px-3 py-1.5 rounded-[var(--a-r-sm)] border border-solid border-[var(--a-line)] text-xs font-semibold transition-colors ${
      disabled
        ? "pointer-events-none opacity-30"
        : "text-[var(--a-soft)] hover:text-[var(--a-ink)] hover:border-[var(--a-ink)]"
    }`;

  return (
    <div className="flex items-center justify-between pt-4 mt-4 border-t border-solid border-[var(--a-line)]">
      <Link href={buildHref(Math.max(1, currentPage - 1))} className={linkCls(atStart)} aria-disabled={atStart}>
        <ChevronLeft size={14} /> Prev
      </Link>
      <span className="text-xs text-[var(--a-faint)] font-mono">
        Page {currentPage} of {totalPages}
      </span>
      <Link href={buildHref(Math.min(totalPages, currentPage + 1))} className={linkCls(atEnd)} aria-disabled={atEnd}>
        Next <ChevronRight size={14} />
      </Link>
    </div>
  );
}
