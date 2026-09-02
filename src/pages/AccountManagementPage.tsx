import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  changePassword,
  getAccessToken,
  removeAccessToken,
} from "@/api/auth";
import { ApiError } from "@/api/client";

const inputClass =
  "w-full rounded-lg border border-[var(--rule-strong)] bg-transparent px-4 py-3 text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent-brand)] focus:ring-2 focus:ring-[var(--accent-brand-soft)]";

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "密碼更新失敗，請稍後再試";
}

export default function AccountManagementPage() {
  const navigate = useNavigate();
  const token = getAccessToken()!;
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");
  const mutation = useMutation({
    mutationFn: () => changePassword({ currentPassword, newPassword }, token),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setValidationError("");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) removeAccessToken();
    },
  });

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.reset();
    if (newPassword !== confirmPassword) {
      setValidationError("兩次輸入的新密碼不一致");
      return;
    }
    setValidationError("");
    mutation.mutate();
  }

  return (
    <main className="mx-auto max-w-[680px] px-6 py-12">
      <header className="mb-10 border-b border-[var(--rule)] pb-8">
        <h1 className="text-4xl font-bold text-[var(--ink)] [font-family:var(--serif)]">帳號管理</h1>
        <p className="mt-3 text-[var(--ink-soft)]">管理登入密碼與作者帳號。</p>
      </header>

      <section aria-labelledby="password-heading">
        <h2 id="password-heading" className="text-2xl font-bold text-[var(--ink)] [font-family:var(--serif)]">修改密碼</h2>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">新密碼至少需要 8 個字元。</p>
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">目前密碼</span>
            <input className={inputClass} type="password" required maxLength={72} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">新密碼</span>
            <input className={inputClass} type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">再次輸入新密碼</span>
            <input className={inputClass} type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </label>
          {(validationError || mutation.isError) && <p className="text-sm text-red-600" role="alert">{validationError || errorMessage(mutation.error)}</p>}
          {mutation.isSuccess && <p className="text-sm text-green-700" role="status">密碼已更新。</p>}
          <button className="rounded-lg bg-[var(--accent-brand)] px-5 py-3 font-semibold text-white transition-colors hover:bg-[var(--accent-brand-hover)] disabled:opacity-60" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? "更新中…" : "更新密碼"}
          </button>
        </form>
      </section>

      <section className="mt-12 border-t border-[var(--rule)] pt-8" aria-labelledby="authors-heading">
        <h2 id="authors-heading" className="text-xl font-bold text-[var(--ink)] [font-family:var(--serif)]">作者帳號</h2>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">為其他作者建立可登入後台的帳號。</p>
        <Link className="mt-4 inline-block font-semibold text-[var(--accent-ink)] underline underline-offset-4" to="/admin/accounts/new">建立新帳號</Link>
      </section>

      <section className="mt-10 border-t border-[var(--rule)] pt-8" aria-labelledby="session-heading">
        <h2 id="session-heading" className="text-xl font-bold text-[var(--ink)] [font-family:var(--serif)]">登入狀態</h2>
        <button className="mt-4 rounded-lg border border-[var(--rule-strong)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper)]" type="button" onClick={() => { removeAccessToken(); navigate("/"); }}>
          登出目前帳號
        </button>
      </section>
    </main>
  );
}
