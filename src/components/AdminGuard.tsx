import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";
import {
  AUTH_CHANGED_EVENT,
  getAccessToken,
  login,
  saveAccessToken,
} from "@/api/auth";
import { ApiError } from "@/api/client";

const inputClass =
  "w-full rounded-lg border border-[var(--rule-strong)] bg-transparent px-4 py-3 text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent-brand)] focus:ring-2 focus:ring-[var(--accent-brand-soft)]";

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "登入失敗，請稍後再試";
}

export default function AdminGuard() {
  const [token, setToken] = useState(() => getAccessToken());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: () => login({ email, password }),
    onSuccess: (accessToken) => {
      saveAccessToken(accessToken);
      setToken(accessToken);
      setPassword("");
    },
  });

  useEffect(() => {
    const syncAuth = () => setToken(getAccessToken());
    window.addEventListener(AUTH_CHANGED_EVENT, syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  if (token) return <Outlet />;

  return (
    <main className="mx-auto max-w-[520px] px-6 py-16">
      <h1 className="mb-3 text-4xl font-bold text-[var(--ink)] [font-family:var(--serif)]">
        作者登入
      </h1>
      <p className="mb-8 text-[var(--ink-soft)]">
        文章管理、編輯與發布功能僅限登入後使用。
      </p>
      <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
        <label className="block space-y-2">
          <span className="text-sm font-semibold">Email</span>
          <input className={inputClass} type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold">密碼</span>
          <input className={inputClass} type="password" autoComplete="current-password" required maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {mutation.isError && <p className="text-sm text-red-600" role="alert">{errorMessage(mutation.error)}</p>}
        <button className="rounded-lg bg-[var(--accent-brand)] px-5 py-3 font-semibold text-white transition-colors hover:bg-[var(--accent-brand-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-brand)] disabled:opacity-60" disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "登入中…" : "登入管理後台"}
        </button>
      </form>
    </main>
  );
}
