---
title: "後台管理系統架構規格設計"
description: "登入功能、使用者創立、畫面權限控管的完整規格，並提供 Vue3 與 React 兩種前端實作對照。"
category: "系統架構"
tags: ["Vue3", "React", "RBAC", "權限設計"]
series: "admin-system"
seriesOrder: 1
publishDate: 2026-06-20
draft: false
---

版本：v1.0
範圍：登入功能、使用者創立、畫面（權限）控管
前端方案：Vue3 / React 雙版本對照

---

## 一、整體架構概覽

### 1.1 系統分層

```
┌─────────────────────────────────────────────┐
│              前端 (Vue3 / React)              │
│  Router → Auth Guard → Layout → Page 元件      │
└───────────────────┬───────────────────────────┘
                    │ HTTPS + JWT (Bearer Token)
┌───────────────────▼───────────────────────────┐
│                後端 API 層                      │
│  Auth Controller / User Controller / Menu API   │
│  Middleware：JWT驗證、權限攔截 (RBAC)             │
└───────────────────┬───────────────────────────┘
                    │
┌───────────────────▼───────────────────────────┐
│                 資料庫層                        │
│  users / roles / permissions / menus / logs     │
└─────────────────────────────────────────────────┘
```

### 1.2 技術選型建議

| 項目         | 建議方案                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------- |
| 後端框架     | Node.js (NestJS/Express) 或 Java Spring Boot 皆可，本文件以 REST API 規格為主，不綁定語言 |
| 資料庫       | PostgreSQL / MySQL                                                                        |
| 認證機制     | JWT（Access Token + Refresh Token）                                                       |
| 權限模型     | RBAC（Role-Based Access Control）                                                         |
| 前端狀態管理 | Vue3 → Pinia；React → Zustand 或 Redux Toolkit                                            |
| 前端路由     | Vue3 → Vue Router；React → React Router                                                   |
| API 溝通     | Axios + 攔截器（Interceptor）                                                             |

### 1.3 核心資料表設計（ER 概念）

```
users            roles           permissions        menus
------           -----           -----------        -----
id               id              id                 id
account          name            code (如 user:read) parent_id
password_hash    description     description        name
name             ...             ...                path
status                                               icon
role_id  ───────►                                    component
                                                       sort
role_permissions (roles ↔ permissions 多對多)
role_menus       (roles ↔ menus 多對多，控制選單可見性)
```

- **users**：使用者帳號資料
- **roles**：角色（如 超級管理員 / 一般管理員 / 客服）
- **permissions**：功能權限碼（按鈕層級，如 `user:create`、`user:delete`）
- **menus**：畫面（頁面/選單）資料，決定側邊欄與路由是否顯示
- **role_menus / role_permissions**：角色與選單/權限的對應表，是「畫面控管」的核心

---

## 二、登入功能設計

### 2.1 流程

1. 使用者輸入帳密 → 前端呼叫 `POST /api/auth/login`
2. 後端驗證帳密 → 產生 **Access Token（短效，如 15 分鐘）** 與 **Refresh Token（長效，如 7 天）**
3. 前端將 Token 存入記憶體 / Pinia-Store（Access Token）與 HttpOnly Cookie（Refresh Token，較安全）
4. 之後每次 API 請求，於 Header 帶上 `Authorization: Bearer <token>`
5. Access Token 過期時，前端自動用 Refresh Token 呼叫 `/api/auth/refresh` 換新
6. 登出時呼叫 `/api/auth/logout`，後端將 Refresh Token 加入黑名單

### 2.2 API 規格範例

| Method | Endpoint            | 說明                                                           |
| ------ | ------------------- | -------------------------------------------------------------- |
| POST   | `/api/auth/login`   | 帳密登入，回傳 accessToken、refreshToken、使用者資訊、角色權限 |
| POST   | `/api/auth/refresh` | 用 refreshToken 換新 accessToken                               |
| POST   | `/api/auth/logout`  | 登出，撤銷 refreshToken                                        |
| GET    | `/api/auth/me`      | 取得目前登入者資訊、角色、可存取選單/權限清單                  |

**登入回傳範例**：

```json
{
  "accessToken": "xxxxx.yyyyy.zzzzz",
  "refreshToken": "xxxxx",
  "user": {
    "id": 1,
    "account": "admin",
    "name": "系統管理員",
    "roleId": 1,
    "roleName": "超級管理員"
  },
  "permissions": ["user:create", "user:delete", "menu:manage"],
  "menus": [
    { "id": 1, "name": "使用者管理", "path": "/users", "icon": "user" },
    { "id": 2, "name": "角色管理", "path": "/roles", "icon": "role" }
  ]
}
```

> 關鍵設計重點：**登入時就一併把該角色可見的 menus 與 permissions 回傳**，前端據此動態產生路由與選單，這是畫面控管的基礎。

---

## 三、使用者創立（User Management）

### 3.1 功能項目

- 使用者列表（分頁、搜尋、依角色篩選）
- 新增使用者（帳號、姓名、密碼、指定角色、狀態）
- 編輯 / 停用 / 刪除使用者
- 重設密碼
- 密碼規則後端驗證（長度、複雜度），密碼一律 **雜湊儲存（bcrypt / argon2）**，不可明碼儲存

### 3.2 API 規格範例

| Method | Endpoint                        | 說明               |
| ------ | ------------------------------- | ------------------ |
| GET    | `/api/users?page=1&keyword=`    | 使用者列表（分頁） |
| POST   | `/api/users`                    | 新增使用者         |
| PUT    | `/api/users/:id`                | 編輯使用者         |
| PATCH  | `/api/users/:id/status`         | 停用/啟用          |
| DELETE | `/api/users/:id`                | 刪除使用者         |
| POST   | `/api/users/:id/reset-password` | 重設密碼           |

**新增使用者請求範例**：

```json
{
  "account": "john",
  "name": "John Chen",
  "password": "InitPass123!",
  "roleId": 2,
  "status": "active"
}
```

### 3.3 權限控制原則

- 建立使用者的操作本身也是一個「權限碼」，例如 `user:create`
- 只有角色具備該權限碼的人，前端才會顯示「新增使用者」按鈕，後端 API 也要**再次驗證**（前端隱藏按鈕只是 UX，後端才是真正防線，兩者缺一不可）

---

## 四、畫面控管（Screen / Menu Access Control）

這是後台系統的核心：**同一套系統，不同角色登入後看到的選單、頁面、按鈕都不同。**

### 4.1 控管層級

分成三層，由粗到細：

1. **路由層級（頁面能不能進）**：例如「客服」角色無法進入「系統設定」頁面
2. **選單層級（側邊欄顯示什麼）**：沒有權限的選單直接不顯示
3. **元件/按鈕層級（頁面內的操作能不能做）**：例如同樣進入使用者列表頁，有的角色看得到「刪除」按鈕，有的看不到

### 4.2 實作策略

- 後端登入時回傳「當前角色的 menus 清單」與「permissions 清單」
- 前端依 menus 清單**動態註冊路由**（而非把所有路由寫死在前端，避免使用者用 URL 硬闖）
- 前端另外用「路由守衛（Router Guard）」在每次切換頁面時做二次檢查
- 按鈕層級則用一個共用的**權限指令 / 權限 Hook**（如 `v-permission="'user:delete'"` 或 `usePermission('user:delete')`）包住 UI 元件

---

## 五、Vue3 實作範例

### 5.1 專案結構

```
src/
 ├─ api/            # axios 封裝、各模組 API
 ├─ stores/          # Pinia：auth.store.js, permission.store.js
 ├─ router/          # 靜態路由 + 動態路由合併邏輯
 ├─ directives/       # v-permission 自訂指令
 ├─ layouts/          # 含側邊欄的 Layout
 └─ views/            # 各頁面元件
```

### 5.2 Axios 攔截器（自動帶 Token / 處理過期）

```js
// api/http.js
import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";

const http = axios.create({ baseURL: "/api" });

http.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const auth = useAuthStore();
      await auth.refreshToken(); // 失敗則導回登入頁
    }
    return Promise.reject(error);
  },
);

export default http;
```

### 5.3 Pinia：儲存登入狀態與權限

```js
// stores/auth.store.js
import { defineStore } from "pinia";
import http from "@/api/http";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    accessToken: "",
    user: null,
    menus: [],
    permissions: [],
  }),
  actions: {
    async login(account, password) {
      const { data } = await http.post("/auth/login", { account, password });
      this.accessToken = data.accessToken;
      this.user = data.user;
      this.menus = data.menus;
      this.permissions = data.permissions;
    },
    hasPermission(code) {
      return this.permissions.includes(code);
    },
  },
});
```

### 5.4 動態路由（登入後依 menus 產生路由）

```js
// router/index.js
import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";

const staticRoutes = [
  { path: "/login", component: () => import("@/views/Login.vue") },
];

const router = createRouter({
  history: createWebHistory(),
  routes: staticRoutes,
});

// 依後端回傳的 menus 動態新增路由（元件用動態 import 對應 component 欄位）
export function generateDynamicRoutes(menus) {
  menus.forEach((menu) => {
    router.addRoute({
      path: menu.path,
      name: menu.name,
      component: () => import(`@/views${menu.component}.vue`),
      meta: { requiresAuth: true, permission: menu.code },
    });
  });
}

router.beforeEach((to, from, next) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.accessToken) {
    next("/login");
  } else {
    next();
  }
});

export default router;
```

### 5.5 按鈕層級權限：自訂指令

```js
// directives/permission.js
import { useAuthStore } from "@/stores/auth.store";

export const vPermission = {
  mounted(el, binding) {
    const auth = useAuthStore();
    if (!auth.hasPermission(binding.value)) {
      el.parentNode?.removeChild(el);
    }
  },
};
```

```vue
<!-- 使用方式 -->
<button v-permission="'user:delete'">刪除</button>
```

---

## 六、React 實作範例

### 6.1 專案結構

```
src/
 ├─ api/            # axios 封裝
 ├─ store/           # Zustand: authStore.ts
 ├─ router/          # React Router 動態路由設定
 ├─ hooks/           # usePermission.ts
 ├─ components/      # PermissionButton, ProtectedRoute
 └─ pages/           # 各頁面元件
```

### 6.2 Axios 攔截器

```ts
// api/http.ts
import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const http = axios.create({ baseURL: "/api" });

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await useAuthStore.getState().refreshToken();
    }
    return Promise.reject(error);
  },
);

export default http;
```

### 6.3 Zustand：登入狀態與權限

```ts
// store/authStore.ts
import { create } from "zustand";
import http from "@/api/http";

interface AuthState {
  accessToken: string;
  user: any;
  menus: any[];
  permissions: string[];
  login: (account: string, password: string) => Promise<void>;
  hasPermission: (code: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: "",
  user: null,
  menus: [],
  permissions: [],
  login: async (account, password) => {
    const { data } = await http.post("/auth/login", { account, password });
    set({
      accessToken: data.accessToken,
      user: data.user,
      menus: data.menus,
      permissions: data.permissions,
    });
  },
  hasPermission: (code) => get().permissions.includes(code),
}));
```

### 6.4 動態路由 + 路由守衛（Protected Route）

```tsx
// router/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export default function ProtectedRoute() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;
}
```

```tsx
// router/index.tsx
import { createBrowserRouter } from "react-router-dom";
import { lazy } from "react";
import ProtectedRoute from "./ProtectedRoute";
import { useAuthStore } from "@/store/authStore";

// 依 menus 動態組出 route children
function buildDynamicRoutes(menus: any[]) {
  return menus.map((menu) => ({
    path: menu.path,
    element: lazy(() => import(`@/pages${menu.component}.tsx`)),
  }));
}

export function createAppRouter() {
  const menus = useAuthStore.getState().menus;
  return createBrowserRouter([
    { path: "/login", lazy: () => import("@/pages/Login") },
    {
      element: <ProtectedRoute />,
      children: buildDynamicRoutes(menus),
    },
  ]);
}
```

### 6.5 按鈕層級權限：自訂 Hook / 元件

```tsx
// hooks/usePermission.ts
import { useAuthStore } from "@/store/authStore";

export function usePermission(code: string) {
  return useAuthStore((s) => s.permissions.includes(code));
}
```

```tsx
// components/PermissionButton.tsx
import { usePermission } from "@/hooks/usePermission";

export function PermissionButton({ code, children, ...props }: any) {
  const allowed = usePermission(code);
  if (!allowed) return null;
  return <button {...props}>{children}</button>;
}
```

```tsx
// 使用方式
<PermissionButton code="user:delete" onClick={handleDelete}>
  刪除
</PermissionButton>
```

---

## 七、Vue3 vs React 架構對照表

| 功能           | Vue3 方案                             | React 方案                              |
| -------------- | ------------------------------------- | --------------------------------------- |
| 全域狀態管理   | Pinia                                 | Zustand / Redux Toolkit                 |
| 路由           | Vue Router（`addRoute` 動態註冊）     | React Router（動態 `children` 組裝）    |
| 路由守衛       | `router.beforeEach`                   | `ProtectedRoute` + `<Outlet />`         |
| 按鈕權限控制   | 自訂指令 `v-permission`               | 自訂 Hook `usePermission` / 包裝元件    |
| API 攔截       | Axios interceptor（讀取 Pinia store） | Axios interceptor（讀取 Zustand store） |
| Token 自動刷新 | Store action + interceptor 401 攔截   | Store action + interceptor 401 攔截     |

兩者核心邏輯完全一致，差異只在「狀態管理工具」與「路由系統」的 API 用法，這也是後台系統前端框架可替換的原因——**後端 API 規格與權限模型是共用核心，前端只是不同的呈現層**。

---

## 八、安全性補充重點

1. **前端權限控制只是 UX，不是安全機制**：任何按鈕隱藏、路由攔截，後端 API 都必須各自再驗證一次角色權限，否則使用者可直接呼叫 API 繞過前端限制。
2. **密碼**：一律雜湊（bcrypt/argon2）+ salt，禁止明碼儲存或明碼傳輸日誌。
3. **Token**：Access Token 建議放記憶體/Store（不落地 localStorage，降低 XSS 風險）；Refresh Token 建議放 HttpOnly Cookie。
4. **操作紀錄（Audit Log）**：建議加一張 `operation_logs` 表，記錄誰在何時對哪筆資料做了什麼操作，後台系統常見稽核需求。
5. **細粒度權限**：若未來需求變複雜，可考慮從 RBAC 升級為 RBAC + 資料範圍（如「只能看自己部門的資料」），此時需在 permissions 設計上加入 `scope` 欄位。

---

以上是完整的架構規格草案，涵蓋資料庫設計、API 規格、以及 Vue3 / React 雙版本前端實作細節，可作為專案啟動前的技術規格文件（Tech Spec）基礎。
