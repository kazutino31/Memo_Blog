import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getAccessToken, removeAccessToken } from "@/api/auth";
import { ApiError } from "@/api/client";
import {
  getManagedPost,
  updatePost,
  type UpdatePostPayload,
} from "@/api/posts";
import { adminPostsQueryKey } from "@/pages/AdminPostsPage";
import { postsQueryKey } from "@/hooks/useNotes";
import { MarkdownBody } from "@/lib/markdown";

const inputClass =
  "w-full rounded-lg border border-[var(--rule-strong)] bg-transparent px-4 py-3 text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent-brand)] focus:ring-2 focus:ring-[var(--accent-brand-soft)]";

const emptyForm: UpdatePostPayload = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  published: false,
  tagNames: [],
};

function toSlug(title: string) {
  return title.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]+/gu, "").replace(/-+/g, "-");
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "儲存失敗，請稍後再試";
}

export default function EditPostPage() {
  const { id } = useParams();
  const postId = Number(id);
  const token = getAccessToken()!;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<UpdatePostPayload>(emptyForm);
  const [tagsInput, setTagsInput] = useState("");
  const [isReady, setIsReady] = useState(false);
  const postQuery = useQuery({
    queryKey: ["managed-post", postId],
    queryFn: () => getManagedPost(postId, token),
    enabled: Number.isInteger(postId) && postId > 0,
  });
  const post = postQuery.data;

  useEffect(() => {
    if (postQuery.error instanceof ApiError && postQuery.error.status === 401) {
      removeAccessToken();
    }
  }, [postQuery.error]);

  useEffect(() => {
    if (!post || isReady) return;
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? "",
      content: post.content,
      published: post.published,
      tagNames: post.tags.map(({ tag }) => tag.name),
    });
    setTagsInput(post.tags.map(({ tag }) => tag.name).join(", "));
    setIsReady(true);
  }, [isReady, post]);

  const mutation = useMutation({
    mutationFn: (payload: UpdatePostPayload) => updatePost(postId, payload, token),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminPostsQueryKey }),
        queryClient.invalidateQueries({ queryKey: postsQueryKey }),
      ]);
      navigate("/admin/posts");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) removeAccessToken();
    },
  });

  if (!Number.isInteger(postId) || postId <= 0) {
    return <main className="mx-auto max-w-[920px] px-6 py-16"><p className="text-red-600">文章編號無效。</p></main>;
  }
  if (postQuery.isLoading) {
    return <main className="mx-auto max-w-[920px] px-6 py-16 text-[var(--ink-soft)]">正在載入文章…</main>;
  }
  if (postQuery.isError || !post) {
    return (
      <main className="mx-auto max-w-[920px] px-6 py-16">
        <h1 className="text-3xl font-bold [font-family:var(--serif)]">找不到文章</h1>
        <p className="mt-3 text-[var(--ink-soft)]">文章可能已不存在，或目前無法載入。</p>
        <Link className="mt-6 inline-block font-semibold text-[var(--accent-ink)] underline underline-offset-4" to="/admin/posts">返回文章管理</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[920px] px-6 py-12">
      <header className="mb-8 flex flex-col gap-4 border-b border-[var(--rule)] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[var(--ink)] [font-family:var(--serif)]">編輯文章</h1>
          <p className="mt-3 text-[var(--ink-soft)]">修改內容與發布狀態，儲存後會回到文章管理。</p>
        </div>
        <Link className="text-sm font-semibold text-[var(--ink-soft)] underline underline-offset-4 hover:text-[var(--ink)]" to="/admin/posts">取消並返回</Link>
      </header>

      <form className="space-y-6" onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate({ ...form, tagNames: tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean) });
      }}>
        <div className="grid gap-6 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-semibold">標題</span>
            <input className={inputClass} required maxLength={200} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">網址代稱（slug）</span>
            <input className={inputClass} required maxLength={200} value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: toSlug(event.target.value) }))} />
          </label>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-semibold">文章描述</span>
          <textarea className={`${inputClass} min-h-24 resize-y`} maxLength={500} value={form.excerpt} onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold">標籤</span>
          <input className={inputClass} placeholder="React, API, 筆記（以逗號分隔）" value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold">Markdown 內容</span>
          <textarea className={`${inputClass} min-h-80 resize-y font-mono`} required value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} />
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
          <input type="checkbox" checked={form.published} onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))} />
          {form.published ? "文章目前會公開顯示" : "文章目前為草稿"}
        </label>
        {mutation.isError && <p className="text-sm text-red-600" role="alert">{errorMessage(mutation.error)}</p>}
        <button className="rounded-lg bg-[var(--accent-brand)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--accent-brand-hover)] disabled:opacity-60" disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "儲存中…" : "儲存變更"}
        </button>
      </form>

      {form.content && (
        <section className="mt-12 border-t border-[var(--rule)] pt-8">
          <h2 className="mb-6 text-2xl font-bold [font-family:var(--serif)]">內容預覽</h2>
          <MarkdownBody content={form.content} />
        </section>
      )}
    </main>
  );
}
