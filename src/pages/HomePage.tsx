import { useNotesStore } from "@/store/notesStore";
import { ArticleCard } from "@/components/ArticleCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { SearchBox } from "@/components/SearchBox";

export default function HomePage() {
  const notes = useNotesStore((s) => s.notes);

  return (
    <div>
      <header className="mx-auto max-w-[920px] border-b border-[var(--rule)] px-6 pt-[72px] pb-10 max-[640px]:px-5 max-[640px]:pt-12 max-[640px]:pb-8">
        <div className="mb-4.5 text-[13px] font-semibold tracking-wider text-[var(--accent-ink)] uppercase">
          技術手記・全 {notes.length} 篇
        </div>
        <h1 className="mb-5 max-w-[14ch] text-[clamp(34px,5vw,52px)] leading-[1.12] font-bold tracking-tight text-[var(--ink)] [font-family:var(--serif)]">
          Note
        </h1>
        <p className="max-w-[520px] text-xl leading-[1.55] text-[var(--ink-soft)] [font-family:var(--serif)]">
          持續累積的技術筆記，含分類、標籤、系列與全文搜尋。
        </p>
      </header>

      <SearchBox />
      <CategoryFilter />

      <main className="mx-auto max-w-[920px] px-6 pt-2 pb-20">
        {notes.map((note, index) => (
          <ArticleCard note={note} index={index} key={note.slug} />
        ))}
      </main>

      <div className="mx-auto max-w-[920px] border-t border-[var(--rule)] px-6 pt-10 pb-[60px] text-[13px] text-[var(--ink-faint)]">
        共 {notes.length} 篇 · 依 category / tags / series 分類整理
      </div>
    </div>
  );
}
