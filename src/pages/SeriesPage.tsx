import { useParams } from "react-router-dom";
import { useNotesStore } from "@/store/notesStore";
import { ArticleCard } from "@/components/ArticleCard";

const EMPTY: never[] = [];

export default function SeriesPage() {
  const { series } = useParams();
  const notes = useNotesStore((s) =>
    series ? (s.series[series] ?? EMPTY) : EMPTY,
  );

  return (
    <div>
      <header className="mx-auto max-w-[920px] border-b border-[var(--rule)] px-6 pt-[72px] pb-10 max-[640px]:px-5 max-[640px]:pt-12 max-[640px]:pb-8">
        <div className="mb-4.5 text-[13px] font-semibold tracking-wider text-[var(--accent-ink)] uppercase">
          系列
        </div>
        <h1 className="mb-5 max-w-[14ch] text-[clamp(34px,5vw,52px)] leading-[1.12] font-bold tracking-tight text-[var(--ink)] [font-family:var(--serif)]">
          {series}
        </h1>
        <p className="max-w-[520px] text-xl leading-[1.55] text-[var(--ink-soft)] [font-family:var(--serif)]">
          共 {notes.length} 篇筆記，依系列順序排列
        </p>
      </header>

      <main className="mx-auto max-w-[920px] px-6 pt-2 pb-20">
        {notes.map((note, index) => (
          <ArticleCard note={note} index={index} key={note.slug} />
        ))}
      </main>
    </div>
  );
}
