# Memo Blog

一個以 Markdown 撰寫筆記、使用 React + Vite 建構的個人技術筆記部落格，支援分類、標籤、系列文章與全文搜尋，並部署於 GitHub Pages。

## 功能特色

- **Markdown 筆記系統**：文章以 Markdown 撰寫，存放於 [src/content/notes](src/content/notes)，透過 frontmatter (`gray-matter`) 定義標題、描述、分類、標籤、系列等 Metadata。
- **分類 / 標籤 / 系列導覽**：支援依分類（[CategoryPage.tsx](src/pages/CategoryPage.tsx)）、標籤（[TagPage.tsx](src/pages/TagPage.tsx)）、系列文章（[SeriesPage.tsx](src/pages/SeriesPage.tsx)）瀏覽筆記。
- **全文搜尋**：使用 `fuse.js` 實作模糊搜尋（[src/lib/search.ts](src/lib/search.ts)）。
- **文章目錄（TOC）**：自動產生文章內的標題目錄（[TableOfContents.tsx](src/components/TableOfContents.tsx)）。
- **Markdown 渲染**：透過 `react-markdown`、`remark-gfm`、`rehype-highlight`、`rehype-slug` 支援 GFM 語法、程式碼高亮與標題錨點。
- **狀態管理**：使用 `zustand` 管理筆記資料狀態（[src/store/notesStore.ts](src/store/notesStore.ts)）。
- **GitHub Pages 部署**：透過 [public/404.html](public/404.html) 處理 SPA 路由重導向。

## 技術棧

- [React 19](https://react.dev/)
- [Vite 8](https://vite.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [React Router](https://reactrouter.com/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Fuse.js](https://www.fusejs.io/)
- [react-markdown](https://github.com/remarkjs/react-markdown) + `remark-gfm` + `rehype-highlight` + `rehype-slug`

## 專案結構

```
src/
├── App.tsx              # 應用程式進入元件
├── main.tsx             # 應用程式進入點
├── components/          # 共用元件（文章卡片、分類篩選、搜尋框、系列導覽、目錄）
├── content/notes/        # Markdown 筆記內容
├── layouts/              # 版面配置
├── lib/                  # 筆記載入 (loadNotes)、Markdown 渲染、搜尋邏輯
├── pages/                # 頁面（首頁、文章、分類、標籤、系列）
├── router/               # 路由設定
├── store/                # Zustand 狀態管理
└── styles/               # 全域樣式
```

## 開始使用

安裝相依套件：

```bash
pnpm install
```

啟動開發伺服器：

```bash
pnpm dev
```

建構正式版本：

```bash
pnpm build
```

預覽建構結果：

```bash
pnpm preview
```

程式碼檢查：

```bash
pnpm lint
```

## 新增一篇筆記

在 [src/content/notes](src/content/notes) 新增一個 `.md` 檔案，並在檔首加入 frontmatter，例如：

```markdown
---
title: "文章標題"
description: "文章描述"
category: "分類名稱"
tags: ["標籤一", "標籤二"]
series: "系列識別碼"
seriesOrder: 1
publishDate: 2026-07-02
draft: false
---

文章內容...
```

- `draft: true` 的筆記不會顯示於清單中。
- `series` / `seriesOrder` 為選填，用於將筆記歸類為同一系列並排序。

## 部署

本專案設定 `base: "/Memo-Blog/"`（見 [vite.config.ts](vite.config.ts)），並搭配 [public/404.html](public/404.html) 處理 GitHub Pages 上 SPA 路由找不到路徑時的重導向。
