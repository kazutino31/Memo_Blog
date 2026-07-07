import { Link, useParams } from "react-router-dom";
import { useNotesStore } from "@/store/notesStore";
import { cn } from "@/lib/utils";

const chipBase =
  "rounded-full border border-[var(--rule-strong)] bg-[var(--paper)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--ink-soft)] no-underline hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-ink)]";
const chipActive =
  "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]";

export function CategoryFilter() {
  const categories = useNotesStore((s) => s.categories);
  const { category: activeCategory } = useParams();

  return (
    <div className="mx-auto flex max-w-[920px] flex-wrap gap-2.5 px-6 pt-6">
      <Link className={cn(chipBase, !activeCategory && chipActive)} to="/">
        全部
      </Link>
      {categories.map((category) => (
        <Link
          className={cn(chipBase, activeCategory === category && chipActive)}
          to={`/category/${encodeURIComponent(category)}`}
          key={category}
        >
          {category}
        </Link>
      ))}
    </div>
  );
}
