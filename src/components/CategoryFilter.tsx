import { Link, useParams } from "react-router-dom";
import { useNotesStore } from "@/store/notesStore";

export function CategoryFilter() {
  const categories = useNotesStore((s) => s.categories);
  const { category: activeCategory } = useParams();

  return (
    <div className="filter-bar">
      <Link className={`filter-chip${!activeCategory ? " active" : ""}`} to="/">
        全部
      </Link>
      {categories.map((category) => (
        <Link
          className={`filter-chip${activeCategory === category ? " active" : ""}`}
          to={`/category/${encodeURIComponent(category)}`}
          key={category}
        >
          {category}
        </Link>
      ))}
    </div>
  );
}
