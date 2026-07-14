---
title: "playwright-cli 使用指南"
description: "給搭配 Claude Code / GitHub Copilot 進行開發、測試、debug 使用。"
category: "AI 開發工具"
tags: ["Claude Code", "GitHub Copilot", "playwright-cli", "測試工具"]
series: "admin-system"
seriesOrder: 7
publishDate: 2026-07-09
draft: false
---

版本：v1.0
定位：AI 開發工具使用指南，針對 playwright-cli 的安裝、使用、提示詞撰寫方式做說明。

---

# playwright-cli 使用指南

> 給搭配 Claude Code / GitHub Copilot 進行開發、測試、debug 使用。

---

## 這是什麼

`playwright-cli` 是 Microsoft 官方推出的瀏覽器自動化命令列工具，專為 coding agent（Claude Code、GitHub Copilot 等）設計。相較於 Playwright MCP，它更省 token，因為不會把完整的 accessibility tree、DOM 內容全部塞進 AI 的 context window，而是把 snapshot 存到本機檔案，只在需要時讀取。

**適合的場景**：在現有專案開發新功能時，讓 agent 邊寫程式邊實際打開瀏覽器驗證；或是針對特定 bug，讓 agent 重現操作流程並截圖佐證。

---

## 安裝（只需做一次）

```bash
# 1. 全域安裝 CLI
npm install -g @playwright/cli@latest

# 2. 驗證安裝
playwright-cli --version

# 3. 初始化工作區
playwright-cli install

# 4. 安裝瀏覽器（含系統相依套件）
playwright-cli install-browser --with-deps
```

進入你的專案資料夾後，額外安裝 skills，讓 agent 能讀懂有哪些指令可用：

```bash
cd 你的專案路徑
playwright-cli install --skills
```

這會在專案內產生技能文件（例如 `.claude/skills/playwright-cli/`），之後 agent 會自動參考這份文件，不用每次都現場猜指令。

---

## 核心觀念：你不需要背指令

`playwright-cli` 是設計給 agent 自己摸索、自己組合指令用的。**你只需要在提示詞裡明確講出要用 `playwright-cli`**，agent 就會自己去讀 `--help` 或技能文件，組出對應的操作。

這是最重要的一件事：**不主動提，agent 大概率不會想到要用它**，只會給你文字建議，不會真的打開瀏覽器驗證。

---

## 怎麼下提示詞

### 基本款（日常快速驗證）

```
用 playwright-cli 幫我測試一下登入功能是否正常運作
```

```
請用 playwright-cli 實際打開瀏覽器，確認這個修改後畫面是否正常
```

```
用 playwright-cli 截圖看一下目前這個頁面長怎樣
```

### 完整款（需要多步驟驗證、有明確檢查項目時）

寫清楚以下幾個要素，agent 執行起來會更精準：

1. **要開的網址**
2. **要做的操作步驟**（依序列出）
3. **要檢查的項目**（條列清楚，方便 agent 逐項回報）
4. **希望怎麼呈現結果**（截圖、文字報告）

範例：

```
請使用 playwright-cli 測試 xxx 功能，步驟如下：

1. 開啟 http://localhost:5173，使用 --headed 模式
2. 導航到 /xxx 頁面
3. 輸入帳號密碼並送出表單
4. 截圖記錄結果，確認以下幾點：
   - 是否正確導向 xxx 頁面
   - 錯誤訊息是否正確顯示
   - 按鈕狀態是否正確切換
5. 將截圖和測試結果整理成簡短報告回報給我
```

---

## 常用功能對照

| 需求                                       | 怎麼跟 agent 說                                                   |
| ------------------------------------------ | ----------------------------------------------------------------- |
| 開啟頁面並顯示瀏覽器視窗                   | 「用 playwright-cli 開 xxx 頁面，用 headed 模式讓我看得到」       |
| 截圖                                       | 「截圖記錄目前畫面」                                              |
| 模擬 API 回傳特定狀態碼（不用真的改後端）  | 「攔截 /api/xxx 這支請求，強制回傳 401，看前端會怎麼處理」        |
| 保留登入狀態，重複測試不用每次登入         | 「用 persistent profile 保留登入狀態」                            |
| 同時維護「已登入」和「未登入」兩種測試情境 | 「建立兩個獨立的 session，一個模擬已登入、一個模擬未登入」        |
| 填表單、點按鈕、按鍵盤                     | 「輸入 xxx 到欄位，然後按 Enter / 點擊送出按鈕」                  |
| 檢查某段文字/畫面元素是否顯示              | 「確認畫面上是否出現 xxx 文字/按鈕」                              |
| 視覺化觀察 agent 正在做什麼                | 「開啟 dashboard 讓我即時看你操作」（對應 `playwright-cli show`） |

---

## 確認 agent 真的有在用（很重要）

如果你不確定 agent 是不是真的呼叫了 CLI 驗證，還是只憑程式碼推測結果，觀察它的執行紀錄：

- **正常情況**：介面上會出現實際執行的終端機指令（例如 `playwright-cli open ...`）和對應輸出
- **可疑情況**：只有一段文字說「測試通過」，完全沒看到任何指令被執行

如果懷疑沒有真的測試，直接追問：

```
你剛才有沒有實際用 playwright-cli 打開瀏覽器測試？請顯示執行的指令和截圖結果。
```

---

## 實用小提醒

- **先確認 dev server 有跑起來**（`npm run dev`），再請 agent 開網址測試，不然會連不上
- **預設是 headless（看不到瀏覽器）**，如果你想親眼確認畫面，記得請 agent 加上 `--headed`
- **Session 預設是記憶體暫存**，瀏覽器關閉後 cookie/登入狀態就會遺失；如果要跨多次測試保留登入狀態，要提醒 agent 用 persistent 模式
- **測試完記得請 agent 關閉瀏覽器 session**，避免累積過多背景瀏覽器進程佔用資源：
  ```
  測試完了，幫我關閉所有 playwright-cli 的瀏覽器 session
  ```

---

## 快速檢查安裝是否正常

如果懷疑環境有問題，可以自己手動跑這幾行確認：

```bash
playwright-cli --version          # 確認版本
playwright-cli open https://playwright.dev --headed   # 確認能開瀏覽器
playwright-cli screenshot         # 確認能截圖
playwright-cli close-all          # 關閉測試用的瀏覽器
```

全部順利跑完沒有報錯，代表環境沒問題，之後交給 agent 使用就可以了。
