import { Link } from "react-router-dom";
import type { NoteMeta } from "@/lib/loadNotes";

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function ArticleCard({
  note,
  index,
}: {
  note: NoteMeta;
  index: number;
}) {
  return (
    <Link
      className="group grid grid-cols-[64px_1fr] gap-6 py-11 border-b border-[var(--rule)] text-inherit no-underline last:border-b-0 max-[640px]:grid-cols-1 max-[640px]:gap-2"
      to={`/notes/${note.slug}`}
    >
      <div className="pt-1.5 font-mono text-sm text-[var(--ink-faint)] max-[640px]:hidden">
        {pad(index + 1)}
      </div>
      <div>
        <div className="mb-2.5 text-[13px] font-semibold tracking-wider text-[var(--accent-ink)] uppercase">
          {note.category}
        </div>
        <h2 className="mb-2.5 text-[27px] leading-[1.28] font-semibold tracking-tight text-[var(--ink)] [font-family:var(--serif)] transition-colors group-hover:text-[var(--accent-ink)]">
          {note.title}
        </h2>
        <p className="mb-4 max-w-[600px] text-base leading-relaxed text-[var(--ink-soft)]">
          {note.description}
        </p>
        <div className="flex flex-wrap items-center gap-3.5 text-[13px] text-[var(--ink-faint)]">
          <span>{note.publishDate}</span>
          {note.tags.slice(0, 3).map((tag) => (
            <span className="inline-flex items-center gap-3.5" key={tag}>
              <span className="h-[3px] w-[3px] rounded-full bg-[var(--ink-faint)]" />{" "}
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-3.5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-ink)]">
          閱讀全文
          <svg
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
