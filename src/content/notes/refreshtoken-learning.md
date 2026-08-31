---
title: "RefreshToken學習重點"
description: "分析RefreshToken難處及多種處理方式。"
category: "前端開發"
tags: ["Frontend", "Token", "RefreshToken", "JWT"]
series: "admin-system"
seriesOrder: 9
publishDate: 2026-08-14
draft: false
---

# RefreshToken 學習重點

## 核心觀念

Token 存放方式沒有「最佳解」，只有「權衡」。真正的難點不在發 token，而在瀏覽器儲存、多分頁協調、長連線、登出時序、跨網域、SSR 這六個維度互相糾纏。

---

## 1. 儲存方式

| 方式            | 問題                                    |
| --------------- | --------------------------------------- |
| localStorage    | JS 可讀 → XSS 可直接偷走 token          |
| httpOnly cookie | JS 讀不到，但**依賴同網域**才送得到後端 |

**重點**：跨網域（如 `myapp.com` 打 `api.vendor.io`）時 cookie 變第三方 cookie，Safari/Firefox 預設封鎖，Chrome 也可關閉 → 這是先天就會壞掉的地基。

---

## 2. 併發風暴（三種層次）

1. **單頁面併發**：同時多個請求收到 401 → 各自觸發 refresh → 後端輪替機制判定為重放攻擊 → 全部登出。
   - 解法：用共用 Promise，確保同時間只有一個 refresh 在飛。
2. **跨分頁併發**：單頁面的鎖管不到其他分頁 → 多分頁同時 refresh。
   - 解法：`navigator.locks` 或 `BroadcastChannel`，搶鎖後廣播新 token。
3. **喚醒風暴**：休眠恢復/切回前景時，所有背景分頁同時發現過期 → 同時 refresh。
   - 本質同上，但觸發點是「使用者回來了」。

---

## 3. 長連線（WebSocket / SSE）

- 握手當下 token 有效，但連線期間會過期。
- 不像 HTTP 請求會吃到 401 觸發攔截器，長連線**不報錯、默默失效**。
- 症狀：即時功能停止更新，卻毫無錯誤訊息。
- 解法：refresh 成功後主動用新 token 重建長連線。

---

## 4. 登出時序

- 登出不是瞬間，是一串動作（取消請求 → 清記憶體 → 撤銷 → 清快取 → 導頁）。
- 若登出當下背景正有 refresh 在飛，refresh 完成會把新 token 寫回 → 產生「畫面已登出、憑證仍存活」的殭屍狀態。
- **正確順序**：先用 `AbortController` 中斷進行中的 refresh，再清 token。

---

## 5. SSR（Next / Nuxt）

三個框架限制：

1. **render 階段不能改 cookie**：refresh 邏輯被迫搬到 middleware / route handler。
2. **沒有到期時間可判斷**：middleware 只能「猜」token 是否有效，不是真正「知道」。
3. **server 端與 browser 端邏輯不同**：cookie 取得方式、header 處理方式都不同，最終常需拆成兩套 client。

---

## 一句話總結

> 使用者「莫名其妙被登出」的 bug，幾乎都能歸因到這五類：儲存/跨域、併發、長連線、登出時序、SSR 限制中的某一環沒處理到。
