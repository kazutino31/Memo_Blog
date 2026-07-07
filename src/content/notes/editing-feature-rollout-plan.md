---
title: "線上編輯功能 導入方案規格"
description: "適用場景：個人部落格/文章紀錄平台，管理者專屬 WYSIWYG 編輯，部署於 Vercel/Netlify"
category: "系統架構"
tags: ["Tailwind CSS", "shadcn/ui", "系統架構"]
series: "admin-system"
seriesOrder: 6
publishDate: 2026-07-06
draft: false
---

版本：v1.0
定位：線上編輯功能導入方案規格。

---

# 線上編輯功能 導入方案規格（GitHub Pages 版）

> 適用場景：個人部落格/文章紀錄平台，管理者專屬 WYSIWYG 編輯
> 部署環境：GitHub Pages（純靜態託管，無伺服器端執行環境）
> 前端框架：Vite + React（SPA）

---

## 1. 方案總覽

| 項目     | 決策                                                 |
| -------- | ---------------------------------------------------- |
| 編輯權限 | 僅管理者（單一使用者）                               |
| 編輯範圍 | 整篇文章（標題、正文、排版）                         |
| 編輯體驗 | 所見即所得（WYSIWYG，Notion 風格）                   |
| 編輯器   | Tiptap（基於 ProseMirror）                           |
| 資料儲存 | **Supabase**（Postgres + Auth + RLS）                |
| 存取方式 | 瀏覽器端直接呼叫 Supabase Client SDK，**無自建後端** |
| 現況     | 內容目前為專案內 `.md` 檔案，需遷移                  |

### 1.1 為何是 Supabase，不是 Neon

這是本方案與前一版最關鍵的差異。GitHub Pages 只能託管靜態檔案（HTML/CSS/JS），沒有任何伺服器端程式碼執行能力，因此原本規劃的 API route（`PATCH /api/articles/[slug]`）完全無法運作——那種寫法需要 Vercel/Netlify 的 serverless function 承接。

| 方案                  | 是否適合純靜態託管 | 原因                                                                                                  |
| --------------------- | ------------------ | ----------------------------------------------------------------------------------------------------- |
| Neon + 自建 API route | 不適合             | 需要伺服器端程式碼保護連線字串，GitHub Pages 沒有這一層                                               |
| Neon + 前端直連       | 不建議             | 連線字串必須放進瀏覽器 JS，等同公開資料庫完整存取權限                                                 |
| Supabase + RLS        | 適合               | 前端只帶公開的 anon key，實際權限控管在資料庫端的 Row Level Security 規則，金鑰外洩也無法繞過權限檢查 |

**結論：靜態站 + 需要寫入功能，是 Supabase 這類 BaaS（Backend-as-a-Service）設計要解決的標準情境，直接採用。**

### 1.2 這個架構額外簡化了什麼

- 內容改為執行時（runtime）從 Supabase 抓取，不是 build time 寫進靜態檔案，存檔即時生效，不需要等重新部署
- 不再需要 GitHub API commit 流程，也不會有「commit 歷史被打字過程灌爆」的問題
- Vite SPA 本來就是執行時抓資料的架構，改動幅度小

---

## 2. 技術選型

### 2.1 資料庫 + 後端服務：Supabase

| 項目     | 說明                                                |
| -------- | --------------------------------------------------- |
| 類型     | Postgres + Auth + 自動生成 REST API（PostgREST）    |
| 免費額度 | 500MB 資料庫、50K 月活躍用戶、1GB 檔案儲存          |
| 權限機制 | Row Level Security（RLS），規則寫在資料庫端強制執行 |
| 前端 SDK | @supabase/supabase-js，可安全直接在瀏覽器使用       |
| 閒置行為 | 免費專案閒置 7 天會暫停，需手動至後台恢復一次       |

> 閒置暫停對個人偶爾使用的情境是唯一缺點，但影響有限：暫停後首次存取會提示恢復，操作一次即可，不影響資料完整性。

### 2.2 編輯器：Tiptap（不變）

| 項目          | 說明                                                  |
| ------------- | ----------------------------------------------------- |
| 核心套件      | @tiptap/react、@tiptap/starter-kit                    |
| 格式擴充      | @tiptap/extension-link、@tiptap/extension-placeholder |
| Markdown 支援 | tiptap-markdown（輸出 Markdown，與現有 .md 內容相容） |
| 樣式套用      | 沿用既有 .prose class，確保編輯模式與閱讀模式視覺一致 |

### 2.3 身分驗證：Supabase Auth

取代原本自訂的 session 判斷邏輯，改用 supabase.auth.getUser() 取得登入狀態，isAdmin 判斷方式為「是否為登入且 UID 符合預先指定的管理者帳號」。

---

## 3. 資料結構

```sql
create table articles (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  content text not null,        -- Tiptap 輸出的 Markdown
  draft boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

RLS 規則：

```sql
alter table articles enable row level security;

-- 已發布文章任何人可讀，草稿僅管理者可讀
create policy "公開讀取"
on articles for select
using (draft = false or auth.uid() = 'YOUR_ADMIN_USER_ID');

-- 僅管理者可寫入
create policy "管理者可新增"
on articles for insert
with check (auth.uid() = 'YOUR_ADMIN_USER_ID');

create policy "管理者可修改"
on articles for update
using (auth.uid() = 'YOUR_ADMIN_USER_ID');
```

YOUR_ADMIN_USER_ID 在建立你自己的 Supabase Auth 帳號後，於 Supabase 後台的 Authentication 頁面取得，直接寫進 SQL policy（單一管理者情境下不需要額外查表判斷角色，直接比對 UID 最簡單）。

---

## 4. 前端串接（取代原本的 API route 設計）

### 4.1 建立 client

```ts
// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY, // 公開金鑰，可放進前端 bundle
);
```

.env 中的 VITE*SUPABASE_URL、VITE_SUPABASE_ANON_KEY 因為 Vite 的 VITE* 前綴會被打包進最終的靜態檔案，這是預期行為——這兩個值本來就設計成可公開，安全性由 RLS 承擔，不是靠隱藏金鑰。

### 4.2 登入

```ts
async function login(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}
```

### 4.3 讀取文章（列表 / 單篇）

```ts
async function getArticles() {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
```

### 4.4 存檔（取代原本的 PATCH API route）

```ts
async function saveArticle(slug: string, patch: Partial<Article>) {
  const { error } = await supabase
    .from("articles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("slug", slug);
  if (error) throw error;
}
```

RLS 會在資料庫端擋下非管理者的寫入嘗試，即使有人繞過前端直接呼叫這個函式，沒有管理者登入 session 也無法寫入——這是與前一版方案最大的差異：權限檢查不再依賴「前端有沒有顯示編輯按鈕」，而是資料庫本身強制執行。

### 4.5 Tiptap 整合（與前版相同，不需調整）

編輯器本體、BubbleMenu 工具列、EditableTitle 元件的實作方式不受此次架構變更影響，僅存檔目標從 API route 改為直接呼叫 4.4 的函式。

---

## 5. 導入階段規劃

### 階段一：Supabase 建置

- [ ] 建立 Supabase 專案
- [ ] 建立 articles 表與 RLS 規則（見第 3 節）
- [ ] 於 Authentication 建立管理者帳號，取得 UID 填入 policy
- [ ] 安裝 @supabase/supabase-js，設定 .env
- [ ] 本機測試登入與讀寫

### 階段二：資料遷移

- [ ] 撰寫 Node.js 腳本，讀取 content/articles/\*.md
- [ ] 解析 frontmatter（gray-matter），透過 Supabase JS SDK 逐筆寫入
- [ ] 人工抽查 3–5 篇文章確認內容完整性
- [ ] 保留原始 .md 檔案作為備份，暫不刪除
- [ ] 將原本讀取檔案系統的元件改為呼叫 getArticles() / getArticleBySlug()

### 階段三：編輯器整合

- [ ] 建立 AuthProvider，包裝 supabase.auth 狀態
- [ ] 實作 EditableTitle（標題 contentEditable）
- [ ] 實作 ArticleBodyEditor（Tiptap + tiptap-markdown）
- [ ] 實作 BubbleMenuToolbar（沿用 shadcn Toggle/Popover 樣式）
- [ ] Tiptap 相關套件動態載入（React.lazy + Suspense），避免非管理者載入編輯器 bundle

### 階段四：存檔邏輯

- [ ] 串接 4.4 的存檔函式，debounce 約 1 秒自動存檔草稿
- [ ] 「發布」按鈕，明確將 draft 改為 false
- [ ] 文章列表查詢加入 draft = false 過濾（管理者檢視時可切換顯示草稿）

### 階段五：驗收與上線

- [ ] 測試：管理者登入後可編輯、存檔、發布
- [ ] 測試：登出狀態下嘗試直接呼叫存檔函式，確認被 RLS 擋下
- [ ] 測試：草稿內容不會出現在公開文章列表
- [ ] 確認深色模式下編輯器樣式正常
- [ ] git push 部署至 GitHub Pages，正式關閉 .md 檔案讀取路徑

---

## 6. 安全與權限檢查清單

- [ ] RLS 規則已針對 select/insert/update 三種操作分別設定，並實際測試過未登入情況下無法寫入
- [ ] .env 中僅存放 anon key（公開金鑰），絕不能使用 Supabase 的 service_role key（該金鑰會繞過 RLS，具備完整權限，不可出現在前端任何程式碼或 bundle 中）
- [ ] Markdown 轉譯為 HTML 顯示時，注意 XSS 風險，避免未過濾內容直接 dangerouslySetInnerHTML

---

## 7. 風險與應變

| 風險                             | 應變方案                                                       |
| -------------------------------- | -------------------------------------------------------------- |
| Supabase 免費專案閒置 7 天後暫停 | 個人使用時，暫停後首次存取手動至後台恢復一次即可，資料不會遺失 |
| Supabase 免費額度用盡（500MB）   | 個人文字內容極不易達到此量，若發生可升級付費方案或評估遷移     |
| anon key 誤用 service_role key   | 開發階段建立檢查清單（見第 6 節），code review 時特別確認      |
| 遷移過程資料遺失                 | 階段二保留原始 .md 檔案備份，不做刪除性操作                    |
| 編輯中網路中斷導致內容遺失       | Debounce 自動存檔頻率設為 1 秒，將遺失範圍控制在最小           |

---

## 8. 後續可選擴充（非本次範圍）

- 版本歷史（每次發布保留一筆歷史記錄，供回溯）
- 圖片上傳（Supabase Storage，免費額度內含 1GB）
- 多作者協作（RLS policy 改為查表判斷角色，而非單一 UID 比對）

---

## 9. 相關文件

本文件對應「設計系統規格文件」中第 8 節（編輯功能架構），實作時請同步參照該節的元件樣式規範，確保編輯器 UI 與既有設計系統一致。
