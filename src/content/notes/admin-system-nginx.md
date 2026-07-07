---
title: "前端靜態部署架構設計：Nginx 自架版"
description: "不依賴 GitHub Pages / Vercel 等第三方託管，改用自己的伺服器（VM/雲端主機）+ Nginx 提供靜態網站服務。"
category: "部署與維運"
tags: ["Nginx", "靜態部署"]
series: "admin-system"
seriesOrder: 4
publishDate: 2026-07-03
draft: false
---

版本：v1.0
情境：不依賴 GitHub Pages / Vercel 等第三方託管，改用自己的伺服器（VM/雲端主機）+ Nginx 提供靜態網站服務
適用對象：React/Vue 純 SPA build 產出的靜態檔案（`dist/`）

---

## 一、為什麼會需要自架 Nginx

| 情境                     | 說明                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| 想要完全掌控伺服器層設定 | 快取策略、安全 headers、壓縮演算法、reverse proxy 規則都能自己精細調整，不受託管平台預設行為限制 |
| 同一台主機要跑多個服務   | 例如前端靜態站 + 後端 API + 其他子系統，用 Nginx 統一做 reverse proxy 入口，架構更集中           |
| 內網/私有部署需求        | 公司內部系統不能對外，必須架在自己的網路環境                                                     |
| 成本考量                 | 已有既存主機資源，不想額外依賴第三方託管額度限制                                                 |

若沒有上述需求，GitHub Pages/Vercel 仍是維護成本更低的選擇；這份規劃針對「確實需要自架」的情境。

---

## 二、整體架構

```
GitHub Actions（CI）
      │  build 產出 dist/
      ▼
透過 SSH 部署到伺服器
      │
      ▼
┌─────────────────────────────────────┐
│              伺服器 (VM)               │
│  ┌─────────────────────────────────┐ │
│  │           Nginx                  │ │
│  │  - 提供靜態檔案                    │ │
│  │  - SPA fallback (try_files)       │ │
│  │  - Gzip/Brotli 壓縮                │ │
│  │  - 快取策略 (Cache-Control)        │ │
│  │  - HTTPS (Let's Encrypt)          │ │
│  │  - 安全 Headers                    │ │
│  └─────────────────────────────────┘ │
│  /var/www/notes-site/                 │
│    ├─ releases/                       │
│    │   ├─ 20260703120000/             │
│    │   ├─ 20260702093000/             │
│    │   └─ ...                          │
│    └─ current -> releases/20260703120000/  (symlink)
└─────────────────────────────────────┘
```

**核心設計：用「多版本目錄 + symlink 切換」做部署**，而不是每次直接覆蓋同一個資料夾。這是自架部署相對於 GitHub Pages/Vercel 最大的差異——沒有平台幫你處理版本與回滾，需要自己設計這套機制。

---

## 三、部署策略：Releases + Symlink（零停機、可回滾）

### 3.1 為什麼不能直接覆蓋檔案

若部署腳本直接把新檔案覆蓋進 Nginx 指向的資料夾，會有兩個問題：

- **覆蓋過程中會有短暫的檔案不完整狀態**，剛好有使用者請求時可能抓到「新舊混合」的檔案（例如新的 `index.html` 但對應的 JS 還沒上傳完），導致白屏或錯誤
- **沒有版本歷史**，出問題想回滾上一版沒有依據

### 3.2 Releases 目錄設計

```
/var/www/notes-site/
 ├─ releases/
 │   ├─ 20260703120000/    ← 這次部署的完整 dist/ 內容
 │   ├─ 20260702093000/    ← 上一次部署（保留供回滾）
 │   └─ 20260701080000/    ← 再上一次（依保留策略決定留幾份）
 └─ current -> releases/20260703120000    ← symlink，Nginx 設定指向這裡
```

Nginx 設定檔的 `root` 指向 `/var/www/notes-site/current`，實際內容則是這個 symlink 指向哪個 release 資料夾。

### 3.3 部署流程

```
1. 新版本檔案先上傳到 releases/{timestamp}/（此時網站流量還在讀舊版本，完全不受影響）
2. 上傳完整後，用 ln -sfn 做「原子性」的 symlink 切換
3. 切換瞬間，Nginx 下一個請求開始就是讀新版本，沒有中間狀態
4. 保留最近 N 份 release（如 5 份），舊的自動清除，需要回滾時改指回舊的 release 目錄即可
```

```bash
# 部署腳本核心邏輯（deploy.sh，實際會由 GitHub Actions 透過 SSH 執行）
RELEASE_DIR="/var/www/notes-site/releases/$(date +%Y%m%d%H%M%S)"
mkdir -p "$RELEASE_DIR"

# 上傳新檔案到這個新目錄（由 CI 端 rsync 完成，見下一節）
# ... rsync 完成後 ...

# 原子性切換 symlink
ln -sfn "$RELEASE_DIR" /var/www/notes-site/current

# 清理舊版本，只保留最近 5 份
cd /var/www/notes-site/releases
ls -t | tail -n +6 | xargs -r rm -rf
```

### 3.4 回滾

```bash
# 回滾只需要把 symlink 指回任一舊版本
ln -sfn /var/www/notes-site/releases/20260702093000 /var/www/notes-site/current
```

不需要重新 build、不需要重新部署，秒級完成，這是自架方案相對於「直接覆蓋檔案」最大的實務價值。

---

## 四、Nginx 設定檔設計

```nginx
# /etc/nginx/sites-available/notes-site.conf

server {
    listen 80;
    server_name notes.example.com;

    # 全部導向 HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name notes.example.com;

    ssl_certificate     /etc/letsencrypt/live/notes.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/notes.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /var/www/notes-site/current;
    index index.html;

    # ---------- 安全 Headers ----------
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    # 若確定所有資源皆自架且無外部腳本依賴，可加上更嚴格的 CSP：
    # add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;

    # ---------- Gzip 壓縮 ----------
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml application/xml+rss text/javascript
               image/svg+xml;

    # ---------- Brotli 壓縮（若有安裝 ngx_brotli 模組，壓縮率優於 gzip）----------
    # brotli on;
    # brotli_comp_level 6;
    # brotli_types text/plain text/css application/json application/javascript
    #              text/xml application/xml text/javascript image/svg+xml;

    # ---------- 快取策略：index.html 不快取 ----------
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        expires -1;
    }

    # ---------- 快取策略：帶 hash 的靜態資源長快取 ----------
    location ~* \.(js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # ---------- SPA Fallback：關鍵設定 ----------
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ---------- 阻擋不必要的檔案存取 ----------
    location ~ /\. {
        deny all;
    }

    access_log /var/log/nginx/notes-site.access.log;
    error_log  /var/log/nginx/notes-site.error.log warn;
}
```

### 4.1 `try_files` 是 SPA 部署的核心

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

這行的邏輯：使用者訪問 `/notes/admin-system-architecture`，Nginx 先找有沒有這個實體檔案（沒有）→ 找有沒有這個資料夾（沒有）→ **都找不到就回傳 `index.html`**，交給前端 React Router 自己處理路由。這是自架 Nginx 相對於 GitHub Pages 的優勢之一——**一行設定就解決**，不需要前面文件裡提到的 `404.html` 編碼路徑的 hack，因為 Nginx 本身就能做伺服器端的 rewrite。

### 4.2 HTTPS 憑證（Let's Encrypt / Certbot）

```bash
# 首次簽發憑證
sudo certbot --nginx -d notes.example.com

# Certbot 會自動設定 cron/systemd timer 定期更新，一般不需要手動介入
# 可用以下指令確認自動更新機制正常
sudo certbot renew --dry-run
```

---

## 五、Docker 化方案（建議優先採用）

比起直接在裸機上裝 Nginx + Certbot + 管理 releases 目錄，**建議把 Nginx 也容器化**，跟前面文件裡後端服務的部署邏輯統一，維運更一致。

### 5.1 Dockerfile（Multi-stage Build）

```dockerfile
# ---------- Stage 1: Build ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- Stage 2: Serve with Nginx ----------
FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

這個方案的好處：**build 出來的 image 本身就是「不可變的部署單位」**，版本管理直接用 Docker image tag 做（如 `notes-site:v1.4.0`），回滾就是換一個 tag 重啟容器，比裸機的 releases/symlink 機制更簡單，也更貼近前面 CI/CD 文件裡後端服務的部署思路，整個系統的部署邏輯可以統一。

### 5.2 搭配 Reverse Proxy（處理 HTTPS 與多服務）

若同一台主機還跑其他服務（如後端 API），建議前面再加一層 Nginx（host 上）或用 **Traefik/Caddy** 當 reverse proxy，統一處理 HTTPS 憑證與路由分流：

```
外部流量
    │
    ▼
Reverse Proxy（Host Nginx / Traefik，處理 HTTPS + 路由）
    ├─ notes.example.com      → notes-site container (內部 port 80)
    └─ api.example.com        → backend-api container
```

容器內的 Nginx 就只專心做「靜態檔案服務」這一件事，不用處理憑證，職責分離更清楚。

### 5.3 GitHub Actions 部署到伺服器

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy to Nginx Server

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and push Docker image
        run: |
          docker build -t ${{ vars.REGISTRY }}/notes-site:${{ github.sha }} .
          echo "${{ secrets.REGISTRY_PASS }}" | docker login ${{ vars.REGISTRY }} -u ${{ secrets.REGISTRY_USER }} --password-stdin
          docker push ${{ vars.REGISTRY }}/notes-site:${{ github.sha }}

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            docker pull ${{ vars.REGISTRY }}/notes-site:${{ github.sha }}
            docker stop notes-site || true
            docker rm notes-site || true
            docker run -d --name notes-site \
              --network web \
              --restart unless-stopped \
              ${{ vars.REGISTRY }}/notes-site:${{ github.sha }}
```

**重點**：SSH 私鑰、伺服器帳密全部走 GitHub Secrets，不落地在 repo 中，這點延續前面文件裡強調過的 Secrets 管理原則。

### 5.4 若不想用 Docker，改用 rsync 直接部署靜態檔案

若堅持裸機 Nginx（不容器化），CI 部署步驟改成 rsync 到 releases 目錄 + symlink 切換：

```yaml
- name: Deploy via rsync
  run: |
    RELEASE=$(date +%Y%m%d%H%M%S)
    rsync -avz --delete ./dist/ \
      ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }}:/var/www/notes-site/releases/$RELEASE/

- name: Switch symlink
  uses: appleboy/ssh-action@v1
  with:
    host: ${{ secrets.SERVER_HOST }}
    username: ${{ secrets.SERVER_USER }}
    key: ${{ secrets.SERVER_SSH_KEY }}
    script: |
      ln -sfn /var/www/notes-site/releases/$(ls -t /var/www/notes-site/releases | head -1) /var/www/notes-site/current
      cd /var/www/notes-site/releases && ls -t | tail -n +6 | xargs -r rm -rf
```

---

## 六、方案比較：Docker 化 vs 裸機 Nginx

| 面向                        | Docker 化（推薦）                        | 裸機 Nginx + rsync                            |
| --------------------------- | ---------------------------------------- | --------------------------------------------- |
| 版本管理                    | Image tag，天然版本化                    | 自己維護 releases 目錄命名規則                |
| 回滾                        | 換 tag 重啟容器，秒級                    | 切換 symlink，同樣秒級，但需自己寫腳本        |
| 環境一致性                  | 開發/測試/正式環境完全一致（同一 image） | 依賴伺服器本身的 Nginx 版本與設定，較易有落差 |
| 與後端服務架構統一性        | 高（同一套容器化思維）                   | 低，前後端部署邏輯不同套                      |
| 初期設定複雜度              | 略高（需要 Registry、容器網路設定）      | 較低，適合單純只有一個靜態站的情境            |
| 多服務共存（前端+API+其他） | 好管理（容器網路 + reverse proxy）       | 需要手動管理多個 Nginx server block           |

**建議**：若伺服器上未來可能還會跑後端 API 或其他服務，優先選 **Docker 化**，部署邏輯與維運方式能跟後端統一；若這台伺服器就只單純服務這個靜態筆記站、不會有其他服務，裸機 Nginx + rsync 也是合理的輕量選擇。

---

## 七、監控與維運

| 項目         | 做法                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| 存活監控     | Nginx 本身可設 `location /health { return 200; }`，外部監控工具（如 UptimeRobot）定期打這個 endpoint |
| Log 管理     | `access.log`/`error.log` 建議搭配 `logrotate` 設定自動輪替，避免無限增長吃滿磁碟                     |
| 憑證到期監控 | Certbot 自動更新通常足夠，但建議額外設一個到期前 7 天的告警（多一層保險）                            |
| 資源監控     | 若主機還跑其他服務，建議裝 `node_exporter` + Prometheus + Grafana，統一監控 CPU/記憶體/磁碟          |
| 部署事件通知 | GitHub Actions 部署完成後加一步 Slack/Discord webhook 通知，方便追蹤是哪次部署                       |

---

## 八、快速檢查清單

- [ ] `try_files $uri $uri/ /index.html;` 已設定，SPA 路由重新整理不會 404
- [ ] `index.html` 設定 `no-cache`，帶 hash 的靜態資源設長快取 `immutable`
- [ ] Gzip（或 Brotli）壓縮已啟用
- [ ] HTTPS 憑證已設定，且確認自動更新機制（`certbot renew --dry-run`）正常
- [ ] 基本安全 Headers（`X-Content-Type-Options`、`X-Frame-Options` 等）已加上
- [ ] 部署機制採用「先上傳新版本、再原子性切換」，不是直接覆蓋檔案
- [ ] 有明確、經過演練的回滾流程（Docker 換 tag 或 symlink 切換）
- [ ] SSH 金鑰 / 伺服器帳密走 GitHub Secrets，未落地在 repo
- [ ] Log 有 logrotate 設定，避免磁碟被日誌塞滿
- [ ] 有基本的存活監控（health check endpoint + 外部監控工具）

---

## 九、與前次 GitHub Pages 方案的差異摘要

| 項目         | GitHub Pages 版                  | Nginx 自架版                               |
| ------------ | -------------------------------- | ------------------------------------------ |
| SPA Fallback | `404.html` 編碼路徑 trick        | Nginx `try_files` 一行設定，更直接         |
| Base Path    | 需設定子路徑（`/repo-name/`）    | 可用自訂網域走根路徑，不受子路徑限制       |
| HTTPS        | GitHub 內建處理                  | 需自行設定 Let's Encrypt/Certbot           |
| 回滾         | 需重新 revert commit 重新觸發 CI | Symlink/Image tag 秒級切換，不需重新 build |
| 維運負擔     | 幾乎零維運                       | 需自行維護伺服器（更新、安全性修補、監控） |
| 多服務整合   | 不適合（純靜態託管）             | 適合，可與後端 API 用同一台主機統一管理    |

若這台伺服器同時也要跑後端服務，Nginx 自架版能讓前後端部署邏輯收斂成一致的架構；若只是單純的個人筆記站、沒有其他服務需求，GitHub Pages 版本維運成本仍然更低。這份文件提供的是「確實需要自架時」的完整設計。

---
