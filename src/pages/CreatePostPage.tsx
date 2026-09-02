import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { getAccessToken, removeAccessToken } from "@/api/auth";
import { ApiError } from "@/api/client";
import { createPost, type CreatePostPayload } from "@/api/posts";
import { MarkdownBody } from "@/lib/markdown";
import { postsQueryKey } from "@/hooks/useNotes";

const inputClass =
  "w-full rounded-lg border border-[var(--rule-strong)] bg-transparent px-4 py-3 text-[var(--ink)] outline-none focus:border-[var(--accent-brand)]";

function toSlug(title: string) {
  return title
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-");
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "操作失敗，請稍後再試";
}

export default function CreatePostPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = getAccessToken()!;
  const [form, setForm] = useState<CreatePostPayload>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    published: true,
    tagNames: [],
  });
  const [tagsInput, setTagsInput] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  const createMutation = useMutation({
    mutationFn: (payload: CreatePostPayload) => createPost(payload, token!),
    onSuccess: async (post, payload) => {
      await queryClient.invalidateQueries({ queryKey: postsQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      navigate(payload.published ? `/notes/${post.slug}` : "/admin/posts");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        removeAccessToken();
      }
    },
  });

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate({
      ...form,
      tagNames: tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
  }

  return (
    <main className="mx-auto max-w-[920px] px-6 py-12">
      <div className="mb-8 border-b border-[var(--rule)] pb-8">
        <div>
          <h1 className="text-4xl font-bold text-[var(--ink)] [font-family:var(--serif)]">
            新增文章
          </h1>
          <Link className="mt-3 inline-block text-sm font-semibold text-[var(--ink-soft)] underline underline-offset-4 hover:text-[var(--ink)]" to="/admin/posts">
            返回文章管理
          </Link>
        </div>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-semibold">標題</span>
            <input
              className={inputClass}
              required
              maxLength={200}
              value={form.title}
              onChange={(event) => {
                const title = event.target.value;
                setForm((current) => ({
                  ...current,
                  title,
                  slug: slugEdited ? current.slug : toSlug(title),
                }));
              }}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">網址代稱（slug）</span>
            <input
              className={inputClass}
              required
              maxLength={200}
              value={form.slug}
              onChange={(event) => {
                setSlugEdited(true);
                setForm((current) => ({
                  ...current,
                  slug: toSlug(event.target.value),
                }));
              }}
            />
          </label>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-semibold">文章描述</span>
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            maxLength={500}
            value={form.excerpt}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                excerpt: event.target.value,
              }))
            }
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold">標籤</span>
          <input
            className={inputClass}
            placeholder="React, API, 筆記（以逗號分隔）"
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold">Markdown 內容</span>
          <textarea
            className={`${inputClass} min-h-80 resize-y font-mono`}
            required
            value={form.content}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                content: event.target.value,
              }))
            }
          />
        </label>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                published: event.target.checked,
              }))
            }
          />
          立即發布
        </label>
        {createMutation.isError && (
          <p className="text-sm text-red-600" role="alert">
            {errorMessage(createMutation.error)}
          </p>
        )}
        <button
          className="rounded-lg bg-[var(--accent-brand)] px-6 py-3 font-semibold text-white hover:bg-[var(--accent-brand-hover)] disabled:opacity-60"
          disabled={createMutation.isPending}
          type="submit"
        >
          {createMutation.isPending
            ? "儲存中…"
            : form.published
              ? "發布文章"
              : "儲存草稿"}
        </button>
      </form>

      {form.content && (
        <section className="mt-12 border-t border-[var(--rule)] pt-8">
          <h2 className="mb-6 text-2xl font-bold [font-family:var(--serif)]">
            內容預覽
          </h2>
          <MarkdownBody content={form.content} />
        </section>
      )}
    </main>
  );
}
