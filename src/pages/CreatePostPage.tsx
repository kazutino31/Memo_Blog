import { type FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  changePassword,
  getAccessToken,
  login,
  registerAndLogin,
  removeAccessToken,
  saveAccessToken,
} from "@/api/auth";
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
  const [token, setToken] = useState(() => getAccessToken());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
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
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordValidationError, setPasswordValidationError] = useState("");

  const authMutation = useMutation({
    mutationFn: () =>
      isRegistering
        ? registerAndLogin({ name, email, password })
        : login({ email, password }),
    onSuccess: (accessToken) => {
      saveAccessToken(accessToken);
      setToken(accessToken);
      setPassword("");
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreatePostPayload) => createPost(payload, token!),
    onSuccess: async (post, payload) => {
      await queryClient.invalidateQueries({ queryKey: postsQueryKey });
      navigate(payload.published ? `/notes/${post.slug}` : "/");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        removeAccessToken();
        setToken(null);
      }
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => changePassword({ currentPassword, newPassword }, token!),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordValidationError("");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        removeAccessToken();
        setToken(null);
      }
    },
  });

  function handleLogin(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    authMutation.mutate();
  }

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

  function handlePasswordSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    passwordMutation.reset();

    if (newPassword !== confirmPassword) {
      setPasswordValidationError("兩次輸入的新密碼不一致");
      return;
    }

    setPasswordValidationError("");
    passwordMutation.mutate();
  }

  if (!token) {
    return (
      <main className="mx-auto max-w-[520px] px-6 py-16">
        <h1 className="mb-3 text-4xl font-bold text-[var(--ink)] [font-family:var(--serif)]">
          {isRegistering ? "建立帳號" : "登入"}
        </h1>
        <p className="mb-8 text-[var(--ink-soft)]">
          {isRegistering ? "建立帳號後會自動登入。" : "新增文章前需先登入。"}
        </p>
        <form className="space-y-5" onSubmit={handleLogin}>
          {isRegistering && (
            <label className="block space-y-2">
              <span className="text-sm font-semibold">顯示名稱</span>
              <input
                className={inputClass}
                required
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Email</span>
            <input
              className={inputClass}
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">密碼</span>
            <input
              className={inputClass}
              type="password"
              required
              minLength={isRegistering ? 8 : undefined}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {authMutation.isError && (
            <p className="text-sm text-red-600" role="alert">
              {errorMessage(authMutation.error)}
            </p>
          )}
          <button
            className="rounded-lg bg-[var(--accent-brand)] px-5 py-3 font-semibold text-white hover:bg-[var(--accent-brand-hover)] disabled:opacity-60"
            disabled={authMutation.isPending}
            type="submit"
          >
            {authMutation.isPending
              ? isRegistering
                ? "建立中…"
                : "登入中…"
              : isRegistering
                ? "建立帳號並登入"
                : "登入"}
          </button>
          <button
            className="ml-4 text-sm text-[var(--accent-ink)] underline"
            type="button"
            onClick={() => {
              authMutation.reset();
              setIsRegistering((current) => !current);
            }}
          >
            {isRegistering ? "已有帳號，返回登入" : "還沒有帳號？建立帳號"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[920px] px-6 py-12">
      <div className="mb-8 flex items-start justify-between gap-4 border-b border-[var(--rule)] pb-8">
        <div>
          <div className="mb-3 text-[13px] font-semibold tracking-wider text-[var(--accent-ink)] uppercase">
            作者工具
          </div>
          <h1 className="text-4xl font-bold text-[var(--ink)] [font-family:var(--serif)]">
            新增文章
          </h1>
        </div>
        <button
          className="text-sm text-[var(--ink-soft)] underline"
          type="button"
          onClick={() => {
            removeAccessToken();
            setToken(null);
          }}
        >
          登出
        </button>
      </div>

      <section className="mb-10 rounded-xl border border-[var(--rule)] bg-[var(--paper)] p-5">
        <button
          className="flex w-full items-center justify-between bg-transparent text-left font-semibold text-[var(--ink)]"
          type="button"
          aria-expanded={isPasswordFormOpen}
          onClick={() => {
            passwordMutation.reset();
            setPasswordValidationError("");
            setIsPasswordFormOpen((current) => !current);
          }}
        >
          修改密碼
          <span aria-hidden="true">{isPasswordFormOpen ? "−" : "+"}</span>
        </button>
        {isPasswordFormOpen && (
          <form
            className="mt-5 grid gap-4 md:grid-cols-3"
            onSubmit={handlePasswordSubmit}
          >
            <label className="block space-y-2">
              <span className="text-sm font-semibold">目前密碼</span>
              <input
                className={inputClass}
                type="password"
                required
                maxLength={72}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold">新密碼</span>
              <input
                className={inputClass}
                type="password"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold">再次輸入新密碼</span>
              <input
                className={inputClass}
                type="password"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
            <div className="md:col-span-3">
              {(passwordValidationError || passwordMutation.isError) && (
                <p className="mb-3 text-sm text-red-600" role="alert">
                  {passwordValidationError ||
                    errorMessage(passwordMutation.error)}
                </p>
              )}
              {passwordMutation.isSuccess && (
                <p className="mb-3 text-sm text-green-700" role="status">
                  密碼已更新
                </p>
              )}
              <button
                className="rounded-lg bg-[var(--accent-brand)] px-5 py-2.5 font-semibold text-white hover:bg-[var(--accent-brand-hover)] disabled:opacity-60"
                disabled={passwordMutation.isPending}
                type="submit"
              >
                {passwordMutation.isPending ? "更新中…" : "更新密碼"}
              </button>
            </div>
          </form>
        )}
      </section>

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
