import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNotesStore } from "@/store/notesStore";
import { createSearchIndex } from "@/lib/search";

export function SearchBox() {
  const notes = useNotesStore((s) => s.notes);
  const [query, setQuery] = useState("");
  const fuse = useMemo(() => createSearchIndex(notes), [notes]);
  const results = query.trim()
    ? fuse
        .search(query)
        .slice(0, 8)
        .map((r) => r.item)
    : [];

  return (
    <div className="search-box">
      <input
        type="text"
        placeholder="搜尋筆記標題、描述、標籤或內容..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length > 0 && (
        <div className="search-results">
          {results.map((note) => (
            <Link
              className="search-result-item"
              to={`/notes/${note.slug}`}
              key={note.slug}
              onClick={() => setQuery("")}
            >
              <div className="srl-title">{note.title}</div>
              <div className="srl-desc">{note.description}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
