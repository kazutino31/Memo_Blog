import { useEffect, useState, type RefObject } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents({
  containerRef,
  deps,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  deps: unknown[];
}) {
  const [items, setItems] = useState<TocItem[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const headings = Array.from(
      container.querySelectorAll("h2, h3"),
    ) as HTMLElement[];
    setItems(
      headings.map((h) => ({
        id: h.id,
        text: h.textContent ?? "",
        level: h.tagName === "H2" ? 2 : 3,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  if (items.length === 0) return null;

  return (
    <nav className="toc">
      <div className="toc-title">目錄</div>
      <ul>
        {items.map((item) => (
          <li
            key={item.id}
            className={item.level === 3 ? "toc-level-3" : undefined}
          >
            <a href={`#${item.id}`}>{item.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
