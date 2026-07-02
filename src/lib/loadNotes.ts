import matter from "gray-matter";

export interface NoteMeta {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  series?: string;
  seriesOrder?: number;
  publishDate: string;
  draft?: boolean;
  content: string;
}

const modules = import.meta.glob("/src/content/notes/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

export function loadAllNotes(): NoteMeta[] {
  return Object.entries(modules)
    .map(([path, raw]) => {
      const { data, content } = matter(raw);
      const slug = path.split("/").pop()!.replace(".md", "");
      const meta = data as Omit<NoteMeta, "slug" | "content">;
      // js-yaml 會把未加引號的日期字串解析成 Date 物件，統一轉回 YYYY-MM-DD 字串
      const rawPublishDate = meta.publishDate as unknown;
      const publishDate =
        rawPublishDate instanceof Date
          ? rawPublishDate.toISOString().slice(0, 10)
          : meta.publishDate;
      return { slug, content: content.trim(), ...meta, publishDate };
    })
    .filter((note) => !note.draft)
    .sort((a, b) => b.publishDate.localeCompare(a.publishDate));
}
