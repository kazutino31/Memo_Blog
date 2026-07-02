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
    <Link className="card" to={`/notes/${note.slug}`}>
      <div className="card-num">{pad(index + 1)}</div>
      <div>
        <div className="card-eyebrow">{note.category}</div>
        <h2>{note.title}</h2>
        <p>{note.description}</p>
        <div className="card-meta">
          <span>{note.publishDate}</span>
          {note.tags.slice(0, 3).map((tag) => (
            <span key={tag}>
              <span className="dot" /> {tag}
            </span>
          ))}
        </div>
        <div className="card-arrow">
          閱讀全文
          <svg
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
