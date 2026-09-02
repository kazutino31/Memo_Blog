import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { getAccessToken, register, removeAccessToken } from "@/api/auth";
import { ApiError } from "@/api/client";

const inputClass = "w-full rounded-lg border border-[var(--rule-strong)] bg-transparent px-4 py-3 text-[var(--ink)] outline-none focus:border-[var(--accent-brand)]";
const errorMessage = (error: unknown) => error instanceof ApiError ? error.message : "帳號建立失敗，請稍後再試";

export default function CreateAccountPage() {
  const [token, setToken] = useState(() => getAccessToken());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: () => register({ name, email, password }, token!),
    onSuccess: () => { setName(""); setEmail(""); setPassword(""); },
    onError: (error) => { if (error instanceof ApiError && error.status === 401) { removeAccessToken(); setToken(null); } },
  });
  if (!token) return <Navigate to="/admin/posts/new" replace />;
  return (
    <main className="mx-auto max-w-[680px] px-6 py-12">
      <header className="mb-8 border-b border-[var(--rule)] pb-8">
        <h1 className="text-4xl font-bold text-[var(--ink)] [font-family:var(--serif)]">建立帳號</h1>
        <p className="mt-3 text-[var(--ink-soft)]">建立新的作者帳號；完成後仍會保持目前的登入狀態。</p>
        <Link className="mt-3 inline-block text-sm font-semibold text-[var(--ink-soft)] underline underline-offset-4 hover:text-[var(--ink)]" to="/admin/account">返回帳號管理</Link>
      </header>
      <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
        <label className="block space-y-2"><span className="text-sm font-semibold">顯示名稱</span><input className={inputClass} required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="block space-y-2"><span className="text-sm font-semibold">Email</span><input className={inputClass} type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="block space-y-2"><span className="text-sm font-semibold">初始密碼</span><input className={inputClass} type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {mutation.isError && <p className="text-sm text-red-600" role="alert">{errorMessage(mutation.error)}</p>}
        {mutation.isSuccess && <p className="text-sm text-green-700" role="status">帳號已建立，可以繼續建立其他帳號。</p>}
        <button className="rounded-lg bg-[var(--accent-brand)] px-5 py-3 font-semibold text-white hover:bg-[var(--accent-brand-hover)] disabled:opacity-60" disabled={mutation.isPending} type="submit">{mutation.isPending ? "建立中…" : "建立帳號"}</button>
      </form>
    </main>
  );
}
