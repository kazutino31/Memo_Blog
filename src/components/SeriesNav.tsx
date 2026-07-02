import { Link } from "react-router-dom";
import type { NoteMeta } from "@/lib/loadNotes";

export function SeriesNav({
  notes,
  currentSlug,
}: {
  notes: NoteMeta[];
  currentSlug: string;
}) {
  const others = notes.filter((n) => n.slug !== currentSlug);
  if (others.length === 0) return null;

  return (
    <div className="series-nav">
      {others.map((note) => (
        <Link
          className="series-nav-item"
          to={`/notes/${note.slug}`}
          key={note.slug}
        >
          <div>
            <div className="sns">
              系列第 {note.seriesOrder ?? "?"} 篇・{note.category}
            </div>
            <div className="snl">{note.title}</div>
          </div>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      ))}
    </div>
  );
}
