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
    <div className="mx-auto max-w-[920px] px-6 pt-6">
      <input
        type="text"
        placeholder="搜尋筆記標題、描述、標籤或內容..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-[var(--rule-strong)] px-4 py-3 text-base text-[var(--ink)] outline-none [font-family:var(--sans)] focus:border-[var(--accent)]"
      />
      {results.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-lg border border-[var(--rule)]">
          {results.map((note) => (
            <Link
              className="block border-b border-[var(--rule)] px-4 py-3.5 text-[var(--ink)] no-underline last:border-b-0 hover:bg-[var(--paper)]"
              to={`/notes/${note.slug}`}
              key={note.slug}
              onClick={() => setQuery("")}
            >
              <div className="text-base font-semibold [font-family:var(--serif)]">
                {note.title}
              </div>
              <div className="mt-1 text-[13px] text-[var(--ink-soft)]">
                {note.description}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
