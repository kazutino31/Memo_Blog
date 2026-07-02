import { create } from "zustand";
import { loadAllNotes, type NoteMeta } from "@/lib/loadNotes";

interface NotesState {
  notes: NoteMeta[];
  categories: string[];
  tags: string[];
  series: Record<string, NoteMeta[]>;
  getBySlug: (slug: string) => NoteMeta | undefined;
  getByCategory: (category: string) => NoteMeta[];
  getByTag: (tag: string) => NoteMeta[];
  getBySeries: (series: string) => NoteMeta[];
}

const notes = loadAllNotes();

export const useNotesStore = create<NotesState>((_set, get) => ({
  notes,
  categories: [...new Set(notes.map((n) => n.category))],
  tags: [...new Set(notes.flatMap((n) => n.tags))],
  series: notes.reduce(
    (acc, n) => {
      if (!n.series) return acc;
      acc[n.series] = [...(acc[n.series] || []), n].sort(
        (a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0),
      );
      return acc;
    },
    {} as Record<string, NoteMeta[]>,
  ),
  getBySlug: (slug) => get().notes.find((n) => n.slug === slug),
  getByCategory: (category) =>
    get().notes.filter((n) => n.category === category),
  getByTag: (tag) => get().notes.filter((n) => n.tags.includes(tag)),
  getBySeries: (series) => get().series[series] ?? [],
}));
