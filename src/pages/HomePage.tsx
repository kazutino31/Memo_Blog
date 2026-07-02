import { useNotesStore } from "@/store/notesStore";
import { ArticleCard } from "@/components/ArticleCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { SearchBox } from "@/components/SearchBox";

export default function HomePage() {
  const notes = useNotesStore((s) => s.notes);

  return (
    <div>
      <header className="hero">
        <div className="hero-eyebrow">技術手記・全 {notes.length} 篇</div>
        <h1>筆記網站</h1>
        <p>持續累積的技術筆記，含分類、標籤、系列與全文搜尋。</p>
      </header>

      <SearchBox />
      <CategoryFilter />

      <main className="list">
        {notes.map((note, index) => (
          <ArticleCard note={note} index={index} key={note.slug} />
        ))}
      </main>

      <div className="foot-note">
        共 {notes.length} 篇 · 依 category / tags / series 分類整理
      </div>
    </div>
  );
}
