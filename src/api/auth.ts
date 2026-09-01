import { api } from "@/api/client";

const TOKEN_KEY = "memo_blog_access_token";
export const AUTH_CHANGED_EVENT = "memo-blog-auth-changed";

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload extends LoginPayload {
  name: string;
}

interface LoginResponse {
  data: {
    token: string;
  };
}

export async function login(payload: LoginPayload) {
  const response = await api.post<LoginResponse>("/auth/login", payload);
  return response.data.token;
}

export async function register(payload: RegisterPayload, token?: string) {
  await api.post("/auth/register", payload, { token });
}

export async function registerAndLogin(payload: RegisterPayload) {
  await register(payload);
  return login({ email: payload.email, password: payload.password });
}

export async function changePassword(
  payload: { currentPassword: string; newPassword: string },
  token: string,
) {
  await api.put<null>("/auth/password", payload, { token });
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveAccessToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function removeAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}
