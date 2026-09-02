import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { getAccessToken, removeAccessToken } from "@/api/auth";
import { ApiError } from "@/api/client";
import {
  getAdminPosts,
  type ApiPost,
  updatePostPublished,
} from "@/api/posts";
import { postsQueryKey } from "@/hooks/useNotes";

export const adminPostsQueryKey = ["admin-posts"] as const;
type StatusFilter = "all" | "published" | "draft";

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "操作失敗，請稍後再試";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminPostsPage() {
  const token = getAccessToken()!;
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [changingId, setChangingId] = useState<number | null>(null);
  const postsQuery = useQuery({
    queryKey: adminPostsQueryKey,
    queryFn: () => getAdminPosts(token),
  });
  useEffect(() => {
    if (postsQuery.error instanceof ApiError && postsQuery.error.status === 401) {
      removeAccessToken();
    }
  }, [postsQuery.error]);
  const statusMutation = useMutation({
    mutationFn: ({ post, published }: { post: ApiPost; published: boolean }) => {
      setChangingId(post.id);
      return updatePostPublished(post.id, published, token);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminPostsQueryKey }),
        queryClient.invalidateQueries({ queryKey: postsQueryKey }),
      ]);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) removeAccessToken();
    },
    onSettled: () => setChangingId(null),
  });

  const posts = useMemo(() => {
    const items = postsQuery.data ?? [];
    if (filter === "published") return items.filter((post) => post.published);
    if (filter === "draft") return items.filter((post) => !post.published);
    return items;
  }, [filter, postsQuery.data]);
  const totals = useMemo(() => {
    const items = postsQuery.data ?? [];
    return {
      all: items.length,
      published: items.filter((post) => post.published).length,
      draft: items.filter((post) => !post.published).length,
    };
  }, [postsQuery.data]);

  return (
    <main className="mx-auto max-w-[920px] px-6 py-12">
      <header className="mb-8 flex flex-col gap-5 border-b border-[var(--rule)] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[var(--ink)] [font-family:var(--serif)]">
            文章管理
          </h1>
          <p className="mt-3 text-[var(--ink-soft)]">
            管理草稿與已發布文章，最後更新時間會顯示在每篇文章旁。
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent-brand)] px-5 py-2.5 font-semibold text-white no-underline transition-colors hover:bg-[var(--accent-brand-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-brand)]"
          to="/admin/posts/new"
        >
          <Plus aria-hidden="true" size={18} />
          新增文章
        </Link>
      </header>

      <div className="mb-3 flex flex-wrap gap-2" aria-label="文章狀態篩選">
        {([
          ["all", "全部"],
          ["published", "已發布"],
          ["draft", "草稿"],
        ] as const).map(([value, label]) => (
          <button
            className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors ${filter === value ? "border-[var(--accent-brand)] bg-[var(--accent-brand-soft)] text-[var(--accent-ink)]" : "border-[var(--rule)] text-[var(--ink-soft)] hover:border-[var(--rule-strong)] hover:text-[var(--ink)]"}`}
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label} {totals[value]}
          </button>
        ))}
      </div>

      {postsQuery.isLoading && <p className="py-12 text-[var(--ink-soft)]">正在載入文章…</p>}
      {postsQuery.isError && (
        <div className="my-8 border-y border-red-200 py-6 text-red-700" role="alert">
          <p className="font-semibold">無法載入文章管理列表</p>
          <p className="mt-1 text-sm">{errorMessage(postsQuery.error)}</p>
          <button className="mt-4 text-sm font-semibold underline underline-offset-4" type="button" onClick={() => postsQuery.refetch()}>
            重新載入
          </button>
        </div>
      )}
      {!postsQuery.isLoading && !postsQuery.isError && posts.length === 0 && (
        <div className="my-8 border-y border-[var(--rule)] py-14 text-center">
          <p className="text-lg font-semibold text-[var(--ink)]">這個分類目前沒有文章</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">可以切換分類，或新增第一篇文章。</p>
        </div>
      )}

      {posts.length > 0 && (
        <div className="border-t border-[var(--rule)]">
          {posts.map((post) => {
            const isChanging = statusMutation.isPending && changingId === post.id;
            return (
              <article className="grid gap-5 border-b border-[var(--rule)] py-7 md:grid-cols-[1fr_auto] md:items-center" key={post.id}>
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${post.published ? "bg-[var(--accent-brand-soft)] text-[var(--accent-ink)]" : "bg-[var(--paper)] text-[var(--ink-soft)]"}`}>
                      {post.published ? "已發布" : "草稿"}
                    </span>
                    <span className="text-xs text-[var(--ink-faint)]">更新於 {formatDate(post.updatedAt)}</span>
                  </div>
                  <h2 className="truncate text-xl font-bold text-[var(--ink)] [font-family:var(--serif)]">{post.title}</h2>
                  <p className="mt-1 truncate text-sm text-[var(--ink-soft)]">/{post.slug}</p>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--rule-strong)] px-4 text-sm font-semibold text-[var(--ink)] no-underline transition-colors hover:bg-[var(--paper)]" to={`/admin/posts/${post.id}/edit`}>
                    <Pencil aria-hidden="true" size={16} /> 編輯
                  </Link>
                  <button
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--accent-brand)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-brand-hover)] disabled:opacity-60"
                    type="button"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ post, published: !post.published })}
                  >
                    {post.published ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
                    {isChanging ? "更新中…" : post.published ? "下架" : "發布"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {statusMutation.isError && (
        <p className="mt-5 text-sm text-red-600" role="alert">{errorMessage(statusMutation.error)}</p>
      )}
    </main>
  );
}
