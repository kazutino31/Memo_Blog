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
      <header className="hero">
        <div className="hero-eyebrow">系列</div>
        <h1>{series}</h1>
        <p>共 {notes.length} 篇筆記，依系列順序排列</p>
      </header>

      <main className="list">
        {notes.map((note, index) => (
          <ArticleCard note={note} index={index} key={note.slug} />
        ))}
      </main>
    </div>
  );
}
