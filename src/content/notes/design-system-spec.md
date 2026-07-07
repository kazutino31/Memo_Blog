---
title: "設計系統規格參考"
description: "基於 Tailwind CSS v4 + shadcn/ui，適用於 Medium 風格閱讀平台"
category: "設計系統"
tags: ["Tailwind CSS", "shadcn/ui", "設計系統"]
series: "admin-system"
seriesOrder: 5
publishDate: 2026-07-06
draft: false
---

版本：v1.0
定位：設計系統規格文件，聚焦「品牌色彩、字體、排版、元件規範」等設計系統核心要素，並提供對應的 Tailwind CSS 實作方式。

---

# 設計系統規格文件

> 基於 Tailwind CSS v4 + shadcn/ui，適用於 Medium 風格閱讀平台

---

## 1. 概述

本設計系統由兩套 token 層組成：

- **shadcn 標準層**：通用 UI 元件（Button、Dialog、Badge...）使用的中性色彩系統
- **品牌層**：文章排版、卡片列表等內容頁面使用的 Serif 閱讀風格系統

兩層並存，互不覆蓋。元件開發時依「這是通用 UI 元件」或「這是內容/排版元件」判斷該用哪一層 token。

---

## 2. Design Token

### 2.1 品牌色彩 Token

| Token             | Light     | Dark      | 用途                |
| ----------------- | --------- | --------- | ------------------- |
| `--ink`           | `#242424` | `#e8e6e1` | 主要文字            |
| `--ink-soft`      | `#5b5b5b` | `#a8a6a1` | 次要文字、說明文    |
| `--ink-faint`     | `#8a8a8a` | `#6b6b6b` | 輔助文字、meta 資訊 |
| `--rule`          | `#e8e6e1` | `#2a2a2e` | 一般分隔線          |
| `--rule-strong`   | `#d8d5cf` | `#38383c` | 強調分隔線、邊框    |
| `--accent-ink`    | `#4298b3` | `#4ade80` | 連結、hover 強調色  |
| `--paper`         | `#fbfaf8` | —         | 卡片/輸入框底色     |
| `--code-bg`       | `#f4f2ee` | `#26262a` | inline code 背景    |
| `--code-block-bg` | `#1e1e1c` | `#0d0d0f` | code block 背景     |

**待補（目前為 magic number，建議 token 化）：**

| Token           | 建議值    | 用途                    |
| --------------- | --------- | ----------------------- |
| `--accent-soft` | `#f0f7ef` | filter chip active 底色 |

### 2.2 shadcn 標準 Token

沿用 shadcn 官方生成規則，不手動修改：

`background` / `foreground` / `card` / `popover` / `primary` / `secondary` / `muted` / `accent` / `destructive` / `border` / `input` / `ring` / `chart-1~5` / `sidebar` 系列

色值格式統一使用 `oklch()`，深色模式透過 `.dark` class 切換。

### 2.3 字體 Token

| Token                                             | 值                                    | 用途                       |
| ------------------------------------------------- | ------------------------------------- | -------------------------- |
| `--font-serif`                                    | `"Source Serif 4", Georgia, serif`    | 文章標題、正文（`.prose`） |
| `--font-sans`（品牌）                             | `"Noto Sans TC", "Inter", sans-serif` | UI 文字、body 預設         |
| `--font-sans`（shadcn，已存在於 `@theme inline`） | `"Geist Variable", sans-serif`        | shadcn 元件字體            |
| `--font-mono`                                     | `"JetBrains Mono", monospace`         | 程式碼、meta 數字          |

> ⚠️ 兩個 `--font-sans` 目前並存但用途不同，不合併，維持現狀。

### 2.4 尺寸 Token

| Token                              | 值         | 用途                |
| ---------------------------------- | ---------- | ------------------- |
| `--spacing-article`（原 `--maxw`） | `700px`    | 文章內容最大寬度    |
| `--radius`                         | `0.625rem` | shadcn 元件圓角基準 |

### 2.5 Tailwind Utility 映射（`@theme inline`）

```css
@theme inline {
  --color-ink: var(--ink);
  --color-ink-soft: var(--ink-soft);
  --color-ink-faint: var(--ink-faint);
  --color-rule: var(--rule);
  --color-rule-strong: var(--rule-strong);
  --color-accent-ink: var(--accent-ink);
  --color-paper: var(--paper);
  --color-code-bg: var(--code-bg);
  --font-serif: var(--serif);
  --font-mono: var(--mono);
  --spacing-article: var(--maxw);
}
```

生成後可用：`text-ink`、`bg-paper`、`border-rule-strong`、`font-serif`、`max-w-article`

---

## 3. 排版規範

### 3.1 標題階層

| 元素          | 字體                         | 大小                       | 字重 | 用途                       |
| ------------- | ---------------------------- | -------------------------- | ---- | -------------------------- |
| Hero H1       | serif                        | `clamp(34px, 5vw, 52px)`   | 700  | 首頁主標                   |
| Article Title | serif                        | `clamp(30px, 4.2vw, 44px)` | 700  | 文章標題                   |
| Card H2       | serif                        | 27px                       | 600  | 列表卡片標題               |
| Prose H1      | serif                        | 1.6em                      | 700  | 文章內 H1                  |
| Prose H2      | serif                        | 1.36em                     | 700  | 文章內 H2                  |
| Prose H3      | sans                         | 1.12em                     | 600  | 文章內 H3                  |
| Prose H4      | sans（大寫、letter-spacing） | 0.8em                      | 700  | 文章內 H4，作為 eyebrow 用 |

### 3.2 正文

- 文章正文（`.prose`）：serif，19px，line-height 1.75
- 卡片摘要：sans，16px，line-height 1.6
- Meta 資訊：sans，13–14px，`--ink-faint`

### 3.3 Eyebrow（分類標籤文字）

統一規則：13px、font-weight 600、uppercase、letter-spacing 0.06em、色彩 `--accent-ink`

---

## 4. 元件規範

### 4.1 分層原則

| 樣式規模                       | 存放位置                 | 技術手段                   |
| ------------------------------ | ------------------------ | -------------------------- |
| 全域 token / reset             | `global.css`             | CSS 變數 + `@layer base`   |
| 通用 UI 元件變體               | `components/ui/*.tsx`    | shadcn + `cva`             |
| 頁面/內容專屬樣式              | 對應元件檔               | Tailwind class（用 token） |
| 無法用 Tailwind 表達的複雜樣式 | 元件同目錄 `.module.css` | CSS Modules（例外情況）    |

### 4.2 既有元件清單與去向

| 原 CSS Class                      | 建議元件                                           | 處理方式                                                                 |
| --------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| `.card`                           | `ArticleCard.tsx`                                  | Tailwind class 改寫                                                      |
| `.hero`                           | `HomeHero.tsx`                                     | Tailwind class 改寫                                                      |
| `.filter-chip`                    | shadcn `Badge`                                     | 新增 `variant: "filter" / "filterActive"`                                |
| `.search-box` / `.search-results` | shadcn `Command` + `Popover`                       | 改用 shadcn 元件取代手刻邏輯                                             |
| `.prose` 全系列                   | —                                                  | 改用 `@tailwindcss/typography` 外掛的 `prose` class，僅保留客製 override |
| `.toc`                            | `TableOfContents.tsx`                              | Tailwind class 改寫，固定定位邏輯保留                                    |
| `.series-nav`                     | `SeriesNav.tsx`                                    | Tailwind class 改寫                                                      |
| `.theme-toggle`                   | shadcn `Button`（`variant="outline" size="icon"`） | 取代自訂樣式                                                             |
| `.topnav`                         | `TopNav.tsx`                                       | Tailwind class + `backdrop-blur` utility                                 |

### 4.3 Button 變體命名規範（範例）

沿用 shadcn `cva` 模式，新增品牌變體時遵循相同結構：

```ts
variant: {
  default: "...",      // shadcn 原生
  outline: "...",      // shadcn 原生
  filter: "...",       // 品牌新增：filter chip 未選中
  filterActive: "...", // 品牌新增：filter chip 選中
}
```

命名規則：小寫駝峰、語義化（狀態或用途），不用顏色命名（避免 `blueButton` 這種寫法）。

---

## 5. 深色模式規範

### 5.1 現況問題

目前存在兩套深色模式切換機制：

- shadcn 標準：`.dark` class（配合 `@custom-variant dark`）
- 品牌 token：`[data-theme="dark"]` attribute

**規範決議：統一採用 `.dark` class**，`[data-theme="dark"]` 選擇器整段廢除，品牌 token 深色值併入 `.dark` 區塊。

### 5.2 深色模式檢查清單

- [ ] Theme toggle 元件只切換一個屬性（`class="dark"`）
- [ ] 所有品牌 token 深色值已併入 `.dark`
- [ ] `.prose img` 的深色濾鏡規則（`brightness(0.85) contrast(1.05)`）保留，選擇器改為 `.dark .prose img`
- [ ] 移除所有 `[data-theme="dark"]` 殘留引用

---

## 6. Response / 斷點規範

| 斷點         | 寬度                | 規則                                       |
| ------------ | ------------------- | ------------------------------------------ |
| Mobile       | `max-width: 640px`  | `.card` 改單欄、隱藏卡片編號、縮減 padding |
| Desktop wide | `min-width: 1240px` | TOC 改為固定定位於文章左側                 |

---

## 7. 待辦事項（Migration Checklist）

- [ ] `.prose` 系列改用 `@tailwindcss/typography`
- [ ] 統一深色模式切換機制為 `.dark`
- [ ] `.filter-chip` 改為 `Badge` variant
- [ ] `.search-box` 改用 shadcn `Command`
- [ ] 逐一將 `.card`、`.hero`、`.toc`、`.series-nav` 搬入對應元件檔
- [ ] Global.css 瘦身完成後，跑一次全站視覺回歸檢查（尤其深色模式）
