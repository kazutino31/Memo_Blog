---
title: "環境部署 / CI/CD 架構設計"
description: "多環境規劃、前後端各自的部署策略、零停機部署、資料庫遷移協調與回滾機制。"
category: "部署與維運"
tags: ["CI/CD", "Docker", "Kubernetes", "GitHub Actions"]
series: "admin-system"
seriesOrder: 3
publishDate: 2026-06-30
draft: false
---

版本：v1.0（延續前兩份文件）
範圍：多環境規劃、CI/CD Pipeline 設計、前端部署策略、後端部署策略、常見實務問題

---

## 一、整體部署架構概覽

```
開發者 Push Code
      │
      ▼
┌──────────────┐
│  Git Repo     │  (main / develop / feature branches)
└──────┬────────┘
       │ 觸發 CI
       ▼
┌───────────────────────────────────────────────┐
│              CI Pipeline (GitHub Actions /       │
│              GitLab CI / Jenkins)                │
│  1. Lint / Type Check                            │
│  2. 單元測試 (Unit Test)                          │
│  3. Build（前端打包 / 後端編譯或打包 Docker Image） │
│  4. 安全掃描（npm audit / SCA）                    │
└──────┬────────────────────────────────────────┘
       │ 觸發 CD
       ▼
┌───────────────────────────────────────────────┐
│              CD Pipeline                        │
│  依分支/環境部署到：                                │
│  Dev → Staging → Production                     │
└──────┬────────────────────────────────────────┘
       │
       ▼
┌─────────────────┐      ┌─────────────────┐
│  前端 (靜態資源)   │      │  後端 (API 服務)   │
│  CDN + Object     │      │  容器化 + 容器編排  │
│  Storage           │      │  (Docker + K8s /   │
│  (S3/GCS + CloudFront) │  ECS/Cloud Run)      │
└─────────────────┘      └─────────────────┘
```

**核心設計原則**：前端是靜態資源，部署本質是「上傳檔案到 CDN」；後端是常駐服務，部署本質是「換版本、確保服務不中斷」。兩者部署策略完全不同，不能用同一套邏輯思考。

---

## 二、環境規劃（Environment Strategy）

### 2.1 建議環境分層

| 環境           | 用途                       | 分支對應                 | 資料庫                                               |
| -------------- | -------------------------- | ------------------------ | ---------------------------------------------------- |
| Local          | 開發者本機                 | 任意 feature branch      | 本機 Docker 或共用開發庫                             |
| Dev            | 整合測試，功能持續合併驗證 | `develop`                | 專用 Dev DB（可定期清空）                            |
| Staging（UAT） | 模擬正式環境，QA / PM 驗收 | `release/*` 或 `staging` | 資料結構與 Prod 一致，資料量可用近期備份遮罩後的資料 |
| Production     | 正式環境                   | `main`                   | 正式資料庫                                           |

### 2.2 分支策略（Git Flow 簡化版，實務常用）

```
feature/xxx  ──┐
feature/yyy  ──┼──► develop ──► release/x.x ──► main (production)
feature/zzz  ──┘         │
                          ▼
                     Dev 環境自動部署
```

- `feature/*`：開發分支，PR 合併到 `develop` 前須通過 CI（lint/test/build）
- `develop`：合併後自動部署到 Dev 環境
- `release/*`：功能凍結後切出，部署到 Staging 供 QA 驗收
- `main`：驗收通過後合併，觸發 Production 部署，並打上版本 Tag（如 `v1.4.0`）

> 實務提醒：小團隊不一定需要這麼多層，若團隊小於 5 人、發版頻率高，可簡化成 `develop → main` 兩層，Staging 用「手動觸發部署」取代自動化，避免流程過重反而拖慢開發速度。

### 2.3 環境變數管理

- **絕對禁止**把 API URL、金鑰寫死在程式碼或直接 commit 進 repo
- 前端：`.env.development` / `.env.staging` / `.env.production`，由 CI 在 build 階段依環境注入（Vite: `VITE_API_BASE_URL`，CRA: `REACT_APP_API_BASE_URL`）
- 後端：敏感資訊（DB 密碼、JWT Secret、第三方 API Key）一律走 **Secret Manager**（AWS Secrets Manager / GCP Secret Manager / HashiCorp Vault），CI/CD 執行時動態注入環境變數，不落地成檔案存在 repo 或 image 裡

---

## 三、前端部署架構

### 3.1 部署方式：靜態資源 + CDN

前端 build 完就是一堆靜態檔案（HTML/JS/CSS），最佳實務是**不需要伺服器跑 Node 渲染**（純 SPA 情況下），部署架構如下：

```
CI Build (npm run build)
      │
      ▼
 dist/ 靜態檔案
      │
      ▼
Object Storage (S3 / GCS / Azure Blob)
      │
      ▼
CDN (CloudFront / Cloudflare / Fastly)
      │
      ▼
使用者瀏覽器
```

**常見平台選擇**：

- 中大型企業自建雲：S3 + CloudFront（AWS）、Cloud Storage + Cloud CDN（GCP）
- 中小型專案求快：Vercel / Netlify / Cloudflare Pages，內建 CI/CD、Preview 環境、CDN 都幫你處理好，適合前端獨立部署、不需要自己管基礎設施的情況

### 3.2 SPA 路由的部署眉角

後台系統是 SPA，重新整理時瀏覽器會直接對 `/users/123` 發請求，但伺服器上根本沒有這個實體檔案，會導致 404。

**解法**：CDN / 伺服器設定「所有路徑找不到檔案時，一律 fallback 回 `index.html`」，讓前端路由（Vue Router / React Router）自己接管。

- Nginx：`try_files $uri $uri/ /index.html;`
- CloudFront：設定 Error Pages，403/404 導回 `/index.html` 並回傳 200
- Vercel/Netlify：內建 SPA rewrite 規則，設定檔加一行即可

### 3.3 快取策略（前文提過，這裡展開部署層面設定）

| 檔案類型                       | 快取策略                                     | 原因                                             |
| ------------------------------ | -------------------------------------------- | ------------------------------------------------ |
| `index.html`                   | `Cache-Control: no-cache`                    | 每次都要拿到最新版本，才能載入正確的新 hash 資源 |
| `*.[hash].js` / `*.[hash].css` | `Cache-Control: max-age=31536000, immutable` | 檔名含 hash，內容不變，可長快取                  |
| 圖片等靜態資源                 | 依更新頻率設定，通常也可長快取               | -                                                |

### 3.4 CI Pipeline 範例（GitHub Actions，前端）

```yaml
name: Frontend CI/CD

on:
  push:
    branches: [develop, main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test -- --run
      - run: npm run build
        env:
          VITE_API_BASE_URL: ${{ vars.API_BASE_URL }}

      # 上傳到 S3
      - name: Deploy to S3
        run: aws s3 sync ./dist s3://${{ vars.S3_BUCKET }} --delete

      # 使 CDN 快取失效（重點：讓 index.html 立即更新）
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ vars.CF_DISTRIBUTION_ID }} \
            --paths "/index.html"
```

> 重點只 invalidate `/index.html`，帶 hash 的資源不需要（也不該）失效，這樣可以省下大量不必要的 CDN 失效成本。

### 3.5 Preview 環境（強烈建議）

每個 PR 自動部署一個獨立預覽網址（如 `pr-123.preview.yourapp.com`），讓 PM/設計師/QA 不用等合併就能先看到畫面。Vercel/Netlify 原生支援；自建的話可用 S3 動態建 bucket path + CloudFront 搭配 Lambda@Edge 做路徑對應，或簡化用 Docker + Kubernetes 的 ephemeral namespace。

---

## 四、後端部署架構

### 4.1 容器化是目前主流實務標準

不管團隊大小，後端建議一律容器化（Docker），原因：

- 開發、測試、正式環境「環境一致性」問題大幅降低（不再有「我本機可以跑，怎麼線上壞了」）
- 方便水平擴展、方便搭配容器編排工具做零停機部署

```dockerfile
# 範例：Node.js 後端 Dockerfile（Multi-stage build）
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

Multi-stage build 的重點：**build 階段用完就丟**，正式 image 只留執行必要的檔案，降低 image 體積與攻擊面。

### 4.2 部署平台選擇（依團隊規模）

| 團隊規模/需求                        | 建議方案                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 小型團隊，追求簡單、少維運負擔       | Cloud Run（GCP）/ App Runner（AWS）/ Render / Railway，直接丟 Docker image 上去，平台自動處理擴展 |
| 中大型團隊，需要精細控制、多服務治理 | Kubernetes（EKS/GKE/AKS），搭配 Helm Chart 管理部署設定                                           |
| 傳統/過渡型                          | ECS（AWS）+ Fargate，介於兩者之間，不用管 K8s 但比純 Serverless 更可控                            |

**實務建議**：如果團隊沒有專職 DevOps、服務數量不多（1~5 個微服務內），**不要一開始就上 Kubernetes**，維運成本會壓垮小團隊。等服務數量、流量規模真的到一定程度，再考慮遷移。

### 4.3 零停機部署（Zero-downtime Deployment）

後端是常駐服務，部署新版本時不能讓使用者感受到中斷，常見策略：

**滾動更新（Rolling Update）**——最常見、K8s 預設支援

```
舊版 Pod x3 ──► 逐步替換 ──► 新版 Pod x3
（過程中新舊版本同時提供服務，逐一替換，流量不中斷）
```

**藍綠部署（Blue-Green）**——適合需要「一鍵切換、一鍵回滾」的場景

```
Blue（現行版本，接收所有流量）
Green（新版本，先部署但不接流量）
      │  驗證 Green 沒問題後
      ▼
Load Balancer 流量整批切到 Green
（保留 Blue 一段時間，有問題可秒級切回）
```

**金絲雀部署（Canary）**——適合高風險改動，先讓少量使用者承擔風險

```
95% 流量 → 舊版本
 5% 流量 → 新版本
      │ 觀察錯誤率/延遲正常
      ▼
逐步調整比例到 100% 新版本
```

**實務建議**：一般後台管理系統（內部使用、流量可預期）用 **Rolling Update** 就足夠；若是面向大量外部使用者、每次改動風險高，才需要投入 Canary 的複雜度（需要搭配 Service Mesh 如 Istio，或雲平台原生支援如 AWS CodeDeploy 的 Canary 設定）。

### 4.4 資料庫遷移（Migration）與部署的協調問題

**這是實務上最容易出包的環節之一**：新版程式碼依賴新的資料表欄位，但部署順序沒處理好，導致舊版程式碼跑在新資料庫結構上直接壞掉。

**解法：向後相容的遷移策略（Expand-Contract Pattern）**

```
第一次部署：只「新增」欄位/表，不刪除、不改名舊欄位
            （新舊程式碼都能正常運作）
      │
第二次部署：程式碼切換讀寫新欄位
      │
第三次部署（確認穩定後）：才刪除舊欄位
```

不要在單一次部署中「改表結構 + 部署依賴新結構的程式碼」同時發生，尤其是 Rolling Update 過程中新舊版本會並存一段時間，若資料庫已經破壞相容性，舊版本會直接壞掉。

Migration 建議用工具管理（如 Prisma Migrate、TypeORM Migration、Flyway），並在 CI/CD pipeline 中設計成**獨立步驟**，部署新版程式碼前先跑 migration，且 migration 腳本本身要能重複執行不出錯（idempotent）。

### 4.5 後端 CI Pipeline 範例（GitHub Actions）

```yaml
name: Backend CI/CD

on:
  push:
    branches: [develop, main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm run test

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ${{ vars.REGISTRY }}
          username: ${{ secrets.REGISTRY_USER }}
          password: ${{ secrets.REGISTRY_PASS }}

      - run: |
          docker build -t ${{ vars.REGISTRY }}/admin-api:${{ github.sha }} .
          docker push ${{ vars.REGISTRY }}/admin-api:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      # 先跑 DB migration（獨立、可回溯步驟）
      - name: Run DB Migration
        run: |
          docker run --rm ${{ vars.REGISTRY }}/admin-api:${{ github.sha }} \
            npm run migration:run

      # 更新 K8s deployment image（觸發 Rolling Update）
      - name: Deploy to K8s
        run: |
          kubectl set image deployment/admin-api \
            admin-api=${{ vars.REGISTRY }}/admin-api:${{ github.sha }} \
            --namespace=production
          kubectl rollout status deployment/admin-api --namespace=production
```

`kubectl rollout status` 這行很關鍵：**等新版本真的部署成功再讓 pipeline 結束**，如果失敗，`rollout status` 會失敗並讓 CI 紅燈，方便及早發現並回滾。

---

## 五、Secrets 與敏感資訊管理

| 情境                                           | 建議做法                                                                                                   |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| DB 密碼、JWT Secret、第三方 API Key            | Secret Manager（雲平台原生）或 Vault，CI/CD 執行時動態注入，不寫入 repo                                    |
| CI/CD 平台本身的憑證（如部署用的雲端帳號金鑰） | 存在 CI 平台的 Secrets 功能（GitHub Secrets / GitLab CI Variables），並開啟 masking，避免 log 洩漏         |
| 前端環境變數                                   | 前端變數會被打包進靜態檔案，**本質上是公開的**，絕對不能把任何機密塞進 `VITE_*` / `REACT_APP_*` 開頭的變數 |

**重要提醒**：前端環境變數只適合放「非機密的設定值」（如 API Base URL），任何人打開瀏覽器 DevTools 都看得到，這是很多團隊會犯的錯誤（把第三方服務的 Secret Key 誤放進前端環境變數）。

---

## 六、回滾（Rollback）機制設計

### 6.1 前端回滾

因為前端資源都有版本 hash 存在 CDN/Object Storage，回滾本質上就是「把 `index.html` 指回舊版本的資源路徑」：

- 若用 S3 + CloudFront：保留最近幾個版本的 build 產物，`index.html` 出問題時重新上傳舊版 `index.html`（其引用的舊 hash JS/CSS 檔案仍在 S3 上未被刪除即可）
- 若用 Vercel/Netlify：平台本身有「一鍵回滾到前次部署」功能，直接使用即可

### 6.2 後端回滾

- K8s：`kubectl rollout undo deployment/admin-api` 一鍵回滾到前一版本
- 若當次部署包含資料庫遷移，回滾程式碼前要先確認 migration 是否也需要 `down`（回滾腳本），這也是為什麼前面強調 **Expand-Contract Pattern**：只要遷移是向後相容的「新增」，即使程式碼回滾，舊程式碼仍能正常運作在新資料庫結構上，不強制要求 DB 也跟著回滾，大幅降低回滾風險與複雜度

---

## 七、監控與告警（部署後的最後一哩路）

部署完成不代表結束，需要搭配監控才能確認「真的沒問題」：

| 監控項目                        | 工具建議                                                               |
| ------------------------------- | ---------------------------------------------------------------------- |
| 服務健康檢查（Health Check）    | K8s liveness/readiness probe，打 `/health` endpoint                    |
| 應用層錯誤                      | Sentry（前端 + 後端皆可）                                              |
| 基礎設施指標（CPU/記憶體/流量） | Prometheus + Grafana，或雲平台原生（CloudWatch/Cloud Monitoring）      |
| API 延遲/錯誤率                 | APM 工具（Datadog / New Relic），或自建 Prometheus + Grafana Dashboard |
| 部署事件通知                    | Slack/Teams webhook，部署成功/失敗即時通知，方便追溯是哪次部署導致問題 |

**實務建議**：Rolling Update 或 Canary 部署後，建議搭配「自動化健康檢查閘門」——部署後幾分鐘內錯誤率若超過閾值，自動觸發回滾，不完全依賴人工盯著監控畫面。

---

## 八、快速檢查清單

- [ ] Dev / Staging / Production 環境明確分層，環境變數不寫死在程式碼
- [ ] 前端：SPA fallback 路由設定正確、`index.html` no-cache、hash 資源長快取
- [ ] 前端：CDN 部署 + 快取失效流程已納入 CI
- [ ] 後端：Dockerfile 使用 multi-stage build，image 精簡
- [ ] 後端：採用 Rolling Update（或視風險採 Canary/Blue-Green），非直接停機更新
- [ ] 資料庫遷移採 Expand-Contract Pattern，遷移與程式碼部署解耦、可獨立回滾
- [ ] Secrets 全部走 Secret Manager，前端環境變數不含任何機密
- [ ] CI Pipeline 涵蓋 lint / type-check / test / build / 安全掃描，任一失敗即擋下部署
- [ ] 有一鍵回滾機制（前端與後端皆有），且已實際演練過
- [ ] 部署後有自動健康檢查與告警通知，不完全依賴人工確認

---

這份文件的核心思路是：**前端部署本質是「檔案分發問題」，後端部署本質是「服務不中斷換版本問題」**，兩者用完全不同的工具解決，但都要共同遵守「環境變數不寫死」「機密不落地」「有明確回滾路徑」這幾個原則，這是多數團隊上線後才踩到坑、事後才補的部分，建議一開始架構設計時就一併考慮進去。
