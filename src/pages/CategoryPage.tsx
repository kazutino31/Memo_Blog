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
      <header className="mx-auto max-w-[920px] border-b border-[var(--rule)] px-6 pt-[72px] pb-10 max-[640px]:px-5 max-[640px]:pt-12 max-[640px]:pb-8">
        <div className="mb-4.5 text-[13px] font-semibold tracking-wider text-[var(--accent-ink)] uppercase">
          分類
        </div>
        <h1 className="mb-5 max-w-[14ch] text-[clamp(34px,5vw,52px)] leading-[1.12] font-bold tracking-tight text-[var(--ink)] [font-family:var(--serif)]">
          {category ? decodeURIComponent(category) : ""}
        </h1>
        <p className="max-w-[520px] text-xl leading-[1.55] text-[var(--ink-soft)] [font-family:var(--serif)]">
          共 {notes.length} 篇筆記
        </p>
      </header>

      <CategoryFilter />

      <main className="mx-auto max-w-[920px] px-6 pt-2 pb-20">
        {notes.map((note, index) => (
          <ArticleCard note={note} index={index} key={note.slug} />
        ))}
      </main>
    </div>
  );
}
