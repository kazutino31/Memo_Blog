---
title: "技術選型與實務問題解決方案"
description: "Token 併發刷新、權限即時生效、樂觀鎖、快取策略——聚焦上線後真正會遇到的問題與解法。"
category: "實務踩坑"
tags: ["JWT", "RBAC", "效能優化", "API設計"]
series: "admin-system"
seriesOrder: 2
publishDate: 2026-06-25
draft: false
---

版本：v1.0（延續《後台管理系統架構規格設計》）
定位：實務踩坑筆記，聚焦「上線後真正會遇到的問題」與對應解法

---

## 一、認證機制（Auth）常見問題

### 1.1 問題：Access Token 過期時，多個 API 同時發出，導致「多次刷新 Token」的競態問題

**情境**：使用者切換頁面時，畫面同時打了 5 支 API，Token 剛好過期，5 支 API 都收到 401，前端若沒處理，會同時呼叫 5 次 `/auth/refresh`，可能導致後端 Refresh Token 被判定重複使用而全部失效。

**解法：請求佇列 + 單一刷新鎖**

```js
// axios interceptor 加上「刷新中」旗標
let isRefreshing = false;
let requestQueue = []; // 暫存等待中的請求

http.interceptors.response.use(null, async (error) => {
  if (error.response?.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newToken = await refreshToken();
        requestQueue.forEach((cb) => cb(newToken));
        requestQueue = [];
      } finally {
        isRefreshing = false;
      }
    }
    // 其餘請求先排隊，等 refresh 完成再重送
    return new Promise((resolve) => {
      requestQueue.push((token) => {
        error.config.headers.Authorization = `Bearer ${token}`;
        resolve(http(error.config));
      });
    });
  }
  return Promise.reject(error);
});
```

這是後台系統最常見、也最容易被忽略的坑，Vue3 / React 都適用同一套邏輯（差別只在 store 呼叫方式）。

### 1.2 問題：多分頁（Tab）同時開啟，一個分頁登出，其他分頁還在「假登入」狀態

**解法**：用 `BroadcastChannel` 或監聽 `storage` 事件同步登出狀態。

```js
// 登出時廣播
const channel = new BroadcastChannel("auth");
channel.postMessage({ type: "LOGOUT" });

// 其他分頁監聽
channel.onmessage = (e) => {
  if (e.data.type === "LOGOUT") {
    // 清空 store，導回登入頁
  }
};
```

### 1.3 問題：暴力破解 / 密碼猜測攻擊

**實務解法**：

- 帳號連續登入失敗 N 次（如 5 次）後鎖定該帳號 15 分鐘
- 搭配 IP 層級的 rate limiting（如 Nginx `limit_req` 或後端中介層）
- 登入頁加驗證碼（reCAPTCHA），但建議「失敗達一定次數才出現」，避免一開始就影響體驗

---

## 二、權限模型（RBAC）實務問題

### 2.1 問題：角色權限樹狀結構很深，每次登入都要組出巢狀選單，效能變差 / 邏輯複雜

**解法**：

- 後端資料庫存**扁平結構**（每筆 menu 有 `parent_id`），但 API 回傳時就先組好樹狀 JSON，不要丟給前端自己遞迴組（前端遞迴在大量資料時容易卡頓，且邏輯應該收斂在後端一份即可，避免前後端邏輯不一致）
- 選單資料變動不頻繁，可以加 Redis 快取（key 為 `role_id`），角色權限異動時主動清快取

### 2.2 問題：權限異動後，已登入使用者的 Token 裡的舊權限還在生效

**情境**：管理員把某使用者的角色權限拿掉了，但該使用者 Access Token 還沒過期，仍可操作已被收回的功能。

**解法（依安全需求選一種）**：

- **折衷方案**：Access Token 有效期設短（如 15 分鐘），可接受短暫延遲生效
- **即時方案**：權限異動時，後端主動將該使用者的 Token/Session 加入黑名單（Redis），強制其下次請求都要重新登入
- 對「敏感操作」（如刪除、金流），建議**每次操作都即時查資料庫權限**，不只信任 Token 裡的快取權限

### 2.3 問題：按鈕權限判斷邏輯散落在各頁面，難以維護

**解法**：統一由「權限碼表」驅動，程式碼中不要出現 `if (user.role === 'admin')` 這種寫死角色的判斷，一律用權限碼 `hasPermission('user:delete')`。角色與權限碼的對應關係全部收斂在後端資料庫，前端永遠只認權限碼，未來角色怎麼調整都不用改前端程式碼。

### 2.4 問題：資料範圍權限（Data Scope）——不只是「能不能看這頁」，還要「能看哪些資料列」

**情境**：業務主管只能看自己部門員工的資料，RBAC 的頁面/按鈕權限無法處理這種「列級別」的限制。

**解法**：在 permissions 表額外加 `scope` 欄位（如 `self` / `department` / `all`），後端查詢時依此動態加 SQL 條件（`WHERE department_id = :userDept`），這部分**務必在後端做**，前端做篩選只是輔助 UX，不能當作安全邊界。

---

## 三、前端效能與體驗問題

### 3.1 問題：路由全部一次載入，首屏 bundle 過大，白屏時間長

**解法**：

- 路由層級一律用動態 import（懶加載），Vue3 / React 範例前文已有
- 依角色動態產生的路由，本來就只會載入該角色有權限的頁面，天然減少不必要的 bundle
- 進一步可用 Vite 的 `manualChunks` 或 CRA/Webpack 的 splitChunks，把第三方套件（如 echarts、antd）拆成獨立 chunk

### 3.2 問題：後台常見大量表格資料，一次載入上萬筆導致畫面卡死

**解法**：

- 後端一律分頁（`page` + `pageSize`），前端不做「一次抓全部再前端分頁」
- 若真的需要看大量資料（如報表），改用虛擬滾動（Virtual Scroll），Vue 可用 `vue-virtual-scroller`，React 可用 `react-window` / `react-virtualized`
- 匯出 Excel 這種大量資料操作，建議**丟到後端非同步任務**，前端輪詢或用 WebSocket 通知完成，而不是前端直接組大量資料轉檔（容易記憶體爆炸、瀏覽器卡死）

### 3.3 問題：表單欄位很多、巢狀很深（如「訂單編輯」含多個子表單），狀態管理混亂

**解法**：

- Vue3：用 `VeeValidate` + `yup` 做 schema 驗證，搭配 `reactive` 集中管理表單狀態
- React：用 `React Hook Form` + `zod`，效能優於 Formik（減少不必要的 re-render）
- 前後端共用同一份驗證 schema（如用 zod 定義，後端 Node.js 可直接複用；若後端是別的語言，至少規則要一致，避免前端過了但後端擋掉造成使用者困惑）

---

## 四、API 設計與前後端協作問題

### 4.1 問題：前後端型別不同步，後端改欄位名稱，前端沒跟上導致線上錯誤

**解法**：

- 後端提供 OpenAPI/Swagger 規格，前端用工具自動產生 TypeScript 型別（如 `openapi-typescript`），杜絕手動維護 interface 造成的落差
- CI 流程中加一道「型別產生 + build」的檢查，型別對不上直接讓 PR 失敗

### 4.2 問題：多人同時編輯同一筆資料，後編輯的把先編輯的覆蓋掉（Lost Update）

**解法**：**樂觀鎖（Optimistic Lock）**

- 資料表加 `version` 欄位，前端讀取資料時一併拿到 version
- 更新時把 version 一起送回，後端比對：`UPDATE ... WHERE id=:id AND version=:version`，若影響筆數為 0，代表資料已被別人改過，回傳 409 衝突，前端提示「資料已被異動，請重新整理後再試」

### 4.3 問題：API 錯誤格式不統一，前端要為每支 API 寫不同的錯誤處理

**解法**：後端統一錯誤回應格式，前端在 axios 攔截器統一處理，各頁面不用重複寫錯誤解析邏輯。

```json
{
  "success": false,
  "errorCode": "USER_NOT_FOUND",
  "message": "找不到此使用者",
  "traceId": "a1b2c3"
}
```

`traceId` 建議一定要加，方便對照後端日誌，出問題時客服/工程師可以快速定位。

---

## 五、系統穩定性與維運問題

### 5.1 問題：操作紀錄缺失，出問題時無法追溯是誰改的

**解法**：加一張 `operation_logs` 表，記錄 `操作人 / 操作時間 / 操作類型 / 目標資料 / 異動前後內容(JSON diff)`。實作上建議用**後端中介層自動攔截寫入類 API（POST/PUT/DELETE）**統一記錄，不要靠每個 Controller 各自手動加 log，容易漏掉。

### 5.2 問題：前端錯誤只有使用者看得到，工程師不知道線上發生什麼錯誤

**解法**：導入前端錯誤監控（Sentry 是業界常見選擇），Vue3 / React 都有對應 SDK，可以捕捉：

- 未處理的 Promise rejection
- 元件渲染錯誤（Vue `errorHandler` / React `ErrorBoundary`）
- API 呼叫失敗的詳細 context（含 traceId，串聯後端日誌）

### 5.3 問題：多環境（dev/staging/prod）設定容易搞混，曾發生正式環境打到測試 API 的事故

**解法**：

- 環境變數統一由 `.env.[mode]` 管理（Vite / CRA 都原生支援），**不要把環境判斷邏輯寫死在程式碼裡**（如 `if (window.location.host === 'xxx')`）
- CI/CD pipeline 針對不同分支自動帶入對應環境變數並部署，人工不介入設定切換，降低人為疏失

### 5.4 問題：系統改版/欄位異動，舊版前端快取（Service Worker / 瀏覽器快取）沒更新，使用者看到壞掉的畫面

**解法**：

- 打包時檔名加 hash（Vite/Webpack 預設行為），確保新版本檔名不同、瀏覽器一定會抓新檔
- `index.html` 本身設定 `no-cache`，其餘帶 hash 的靜態資源設長快取，兩者搭配才能兼顧「更新即時性」與「載入效能」

---

## 六、架構規模化考量（系統變大之後）

### 6.1 何時該考慮微前端（Micro Frontend）

**實務判斷標準**，不是「系統大」就要上微前端，而是符合以下情況才考慮：

- 多個團隊各自負責不同模組，需要獨立開發、獨立部署，不想互相卡 Release
- 系統中有明顯可切割的業務邊界（如「訂單模組」「金流模組」「報表模組」各自獨立）

若只是單一團隊維護、模組間耦合度高，**不建議**貿然導入微前端（如 qiankun、Module Federation），會顯著增加建置與除錯複雜度，投入產出比不划算。多數中小型後台系統用「單一 SPA + 動態路由懶加載」就足夠。

### 6.2 State 管理隨模組增加而混亂

**解法**：

- Pinia / Zustand 都建議**依模組拆 store**（`useUserStore`、`useOrderStore`），不要把所有狀態塞進一個全域 store
- 頁面內部、不需要跨頁共享的狀態，優先用元件內部 state（`ref`/`useState`），不要什麼都往全域 store 塞，避免不相關頁面互相污染

### 6.3 國際化（i18n）常見坑

- 後台系統常忽略「日期時區」問題：資料庫存 UTC，前端依使用者瀏覽器時區顯示，不要直接把後端字串原封不動顯示
- 翻譯檔案隨系統變大會很肥，建議依模組拆檔案並用動態載入，而非一次載入所有語系全部內容

---

## 七、快速檢查清單（上線前 Review 重點）

- [ ] Access Token 短效 + Refresh Token 機制，且已處理併發刷新競態
- [ ] 所有寫入類 API（POST/PUT/DELETE）後端皆有二次權限驗證，不只依賴前端隱藏 UI
- [ ] 密碼雜湊儲存，登入失敗有鎖定機制
- [ ] 敏感操作（刪除/金流/權限變更）有 operation log
- [ ] 大量資料一律分頁，匯出功能走非同步
- [ ] 多人編輯同一筆資料有樂觀鎖或提示機制
- [ ] 前端有錯誤監控（Sentry 等），API 錯誤格式統一且帶 traceId
- [ ] 環境設定走 CI/CD 自動帶入，無人工手動切換
- [ ] 靜態資源打包有 hash，`index.html` 設定 no-cache

---

這份文件的重點是：**多數問題不是技術選型選錯，而是「前後端各自都要做一次驗證」「狀態同步」「快取策略」這幾類細節被忽略**。架構設計時把這些實務點提前考慮進去，比事後重構要省成本很多。
