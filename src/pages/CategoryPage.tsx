import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useNotesStore } from "@/store/notesStore";
import { ArticleCard } from "@/components/ArticleCard";
import { CategoryFilter } from "@/components/CategoryFilter";

export default function CategoryPage() {
  const { category } = useParams();
  const allNotes = useNotesStore((s) => s.notes);
  const notes = useMemo(() => {
    if (!category) return [];
    const decoded = decodeURIComponent(category);
    return allNotes.filter((n) => n.category === decoded);
  }, [allNotes, category]);

  return (
    <div>
      <header className="hero">
        <div className="hero-eyebrow">分類</div>
        <h1>{category ? decodeURIComponent(category) : ""}</h1>
        <p>共 {notes.length} 篇筆記</p>
      </header>

      <CategoryFilter />

      <main className="list">
        {notes.map((note, index) => (
          <ArticleCard note={note} index={index} key={note.slug} />
        ))}
      </main>
    </div>
  );
}
