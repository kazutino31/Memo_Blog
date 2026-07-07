import { useRef } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useNotesStore } from "@/store/notesStore";
import { MarkdownBody } from "@/lib/markdown";
import { SeriesNav } from "@/components/SeriesNav";
import { TableOfContents } from "@/components/TableOfContents";

export default function ArticlePage() {
  const { slug } = useParams();
  const note = useNotesStore((s) => (slug ? s.getBySlug(slug) : undefined));
  const seriesNotes = useNotesStore((s) =>
    note?.series ? s.getBySeries(note.series) : [],
  );
  const bodyRef = useRef<HTMLDivElement>(null);

  if (!note) {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <TableOfContents containerRef={bodyRef} deps={[note.slug]} />
      <article className="mx-auto max-w-[var(--maxw)] px-6 pt-14 pb-[60px] max-[640px]:px-5 max-[640px]:pt-9 max-[640px]:pb-10">
        <div className="mb-4 text-[13px] font-semibold tracking-wider text-[var(--accent-ink)] uppercase">
          {note.category}
        </div>
        <h1 className="mb-5 text-[clamp(30px,4.2vw,44px)] leading-[1.15] font-bold tracking-tight text-[var(--ink)] [font-family:var(--serif)]">
          {note.title}
        </h1>
        <div className="mb-10 flex flex-wrap items-center gap-3.5 border-b border-[var(--rule)] pb-8 text-sm text-[var(--ink-faint)]">
          <span>{note.publishDate}</span>
          {note.tags.map((tag) => (
            <Link
              className="inline-flex items-center gap-1.5 text-[var(--ink-faint)] hover:text-[var(--accent-ink)]"
              to={`/tags/${encodeURIComponent(tag)}`}
              key={tag}
            >
              <span className="h-[3px] w-[3px] rounded-full bg-[var(--ink-faint)]" />{" "}
              {tag}
            </Link>
          ))}
        </div>
        <div ref={bodyRef}>
          <MarkdownBody content={note.content} />
        </div>
      </article>
      <SeriesNav notes={seriesNotes} currentSlug={note.slug} />
    </div>
  );
}
