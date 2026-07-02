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
      <article className="article-wrap">
        <div className="article-eyebrow">{note.category}</div>
        <h1 className="article-title">{note.title}</h1>
        <div className="article-meta">
          <span>{note.publishDate}</span>
          {note.tags.map((tag) => (
            <Link to={`/tags/${encodeURIComponent(tag)}`} key={tag}>
              <span className="dot" /> {tag}
            </Link>
          ))}
        </div>
        <div ref={bodyRef}>
          <MarkdownBody content={note.content} />
        </div>
      </article>
      <TableOfContents containerRef={bodyRef} deps={[note.slug]} />
      <SeriesNav notes={seriesNotes} currentSlug={note.slug} />
    </div>
  );
}
