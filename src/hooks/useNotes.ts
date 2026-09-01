import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPosts, type ApiPost } from "@/api/posts";
import { estimateReadingTime, type NoteMeta } from "@/lib/loadNotes";
import { useNotesStore } from "@/store/notesStore";

export const postsQueryKey = ["posts"] as const;

function apiPostToNote(post: ApiPost): NoteMeta {
  return {
    slug: post.slug,
    title: post.title,
    description: post.excerpt ?? "",
    category: "文章",
    tags: post.tags.map(({ tag }) => tag.name),
    publishDate: post.createdAt.slice(0, 10),
    content: post.content,
    readingTime: estimateReadingTime(post.content),
  };
}

export function useNotes() {
  const localNotes = useNotesStore((state) => state.notes);
  const postsQuery = useQuery({
    queryKey: postsQueryKey,
    queryFn: getPosts,
  });

  const notes = useMemo(() => {
    const notesBySlug = new Map(
      localNotes.map((note) => [note.slug, note] as const),
    );

    for (const post of postsQuery.data ?? []) {
      if (!notesBySlug.has(post.slug)) {
        notesBySlug.set(post.slug, apiPostToNote(post));
      }
    }

    return [...notesBySlug.values()].sort((a, b) =>
      b.publishDate.localeCompare(a.publishDate),
    );
  }, [localNotes, postsQuery.data]);

  const categories = useMemo(
    () => [...new Set(notes.map((note) => note.category))],
    [notes],
  );

  return {
    notes,
    categories,
    isLoadingApiNotes: postsQuery.isLoading,
    isApiUnavailable: postsQuery.isError,
  };
}
