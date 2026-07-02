import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useNotesStore } from "@/store/notesStore";
import { ArticleCard } from "@/components/ArticleCard";

export default function TagPage() {
  const { tag } = useParams();
  const allNotes = useNotesStore((s) => s.notes);
  const notes = useMemo(() => {
    if (!tag) return [];
    const decoded = decodeURIComponent(tag);
    return allNotes.filter((n) => n.tags.includes(decoded));
  }, [allNotes, tag]);

  return (
    <div>
      <header className="hero">
        <div className="hero-eyebrow">標籤</div>
        <h1>#{tag ? decodeURIComponent(tag) : ""}</h1>
        <p>共 {notes.length} 篇筆記</p>
      </header>

      <main className="list">
        {notes.map((note, index) => (
          <ArticleCard note={note} index={index} key={note.slug} />
        ))}
      </main>
    </div>
  );
}
