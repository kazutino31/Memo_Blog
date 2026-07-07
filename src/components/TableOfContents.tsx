import { useEffect, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";

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
    <nav className="mx-auto mb-10 max-w-[var(--maxw)] px-6 min-[1240px]:fixed min-[1240px]:top-24 min-[1240px]:left-[calc(50%-var(--maxw)/2-232px)] min-[1240px]:m-0 min-[1240px]:max-h-[calc(100vh-128px)] min-[1240px]:w-[200px] min-[1240px]:max-w-[200px] min-[1240px]:overflow-y-auto min-[1240px]:p-0">
      <div className="mb-2.5 text-xs font-bold tracking-wider text-[var(--ink-faint)] uppercase">
        目錄
      </div>
      <ul className="m-0 list-none p-0">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn("mb-1.5", item.level === 3 && "pl-4")}
          >
            <a
              href={`#${item.id}`}
              className="text-sm text-[var(--ink-soft)] no-underline hover:text-[var(--accent-ink)]"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
