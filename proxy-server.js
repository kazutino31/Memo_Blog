import express from "express";
import cors from "cors";
import fs from "fs"; // Node.js 內建的檔案系統模組，不需額外安裝

const app = express();
const PORT = process.env.PORT || 3001;
const DB_DIR = "./db";
const JSON_FILE_PATH = `${DB_DIR}/warrants.json`;

app.use(cors());

// 從證交所下載資料，並直接寫入 warrants.json 檔案中
// 使用 .all 支援 GET/POST，避免前端呼叫方式不一致的問題
app.all("/api/sync-warrants", async (req, res) => {
  console.log("收到同步請求...");
  try {
    // 確保 db 目錄存在
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    const response = await fetch(
      "https://openapi.twse.com.tw/v1/opendata/t187ap37_L",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      },
    );
    if (!response.ok) throw new Error("證交所連線失敗");

    const twseData = await response.json();
    console.log(`成功同步 ${twseData.length} 筆資料`);

    // 直接把整包陣列轉成字串，寫入本地檔案 (如果檔案不存在會自動建立)
    fs.writeFileSync(
      JSON_FILE_PATH,
      JSON.stringify(twseData, null, 2),
      "utf-8",
    );

    res.json({
      success: true,
      message: `成功同步 ${twseData.length} 筆權證資料至本地 JSON！`,
    });
  } catch (error) {
    console.error("同步失敗:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 直接抓取證交所即時資料 (不存檔)
app.get("/api/twse-live", async (req, res) => {
  try {
    const response = await fetch(
      "https://openapi.twse.com.tw/v1/opendata/t187ap37_L",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      },
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 獲取所有個股日收盤價資訊 (STOCK_DAY_ALL)
app.get("/api/stock-live", async (req, res) => {
  try {
    const response = await fetch(
      "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      },
    );
    if (!response.ok) throw new Error("證交所個股資料讀取失敗");
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 前端輸入代號，後端讀取 JSON 檔案，用 .find() 快速過濾後回傳
app.get("/api/warrant/:id", (req, res) => {
  try {
    if (!fs.existsSync(JSON_FILE_PATH)) {
      return res
        .status(404)
        .json({ message: "尚未同步資料，請先點擊同步按鈕" });
    }

    const rawData = fs.readFileSync(JSON_FILE_PATH, "utf-8");
    const warrants = JSON.parse(rawData);

    // 支援「權證代號」或「WarrantId」鍵名
    const warrant = warrants.find(
      (item) =>
        item["權證代號"] === req.params.id || item.WarrantId === req.params.id,
    );

    if (warrant) {
      res.json(warrant);
    } else {
      res.status(404).json({ message: "找不到該權證代號" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 獲取本地數據庫狀態（更新時間與資料筆數）
app.get("/api/db-status", (req, res) => {
  try {
    if (!fs.existsSync(JSON_FILE_PATH)) {
      return res.json({ exists: false });
    }

    const stats = fs.statSync(JSON_FILE_PATH);
    const rawData = fs.readFileSync(JSON_FILE_PATH, "utf-8");
    const warrants = JSON.parse(rawData);

    res.json({
      exists: true,
      lastUpdated: stats.mtime,
      count: warrants.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 關閉伺服器
app.post("/api/shutdown", (req, res) => {
  res.json({ success: true, message: "伺服器正在關閉，釋放 3001 埠口..." });

  console.log("收到前端關機指令，系統即將登出並關閉...");

  // 延遲 1 秒執行，確保關機成功的 JSON 訊息能順利傳回給前端瀏覽器
  setTimeout(() => {
    process.exit(0); // 0 代表正常退出，這會直接中止 node 程式
  }, 1000);
});

app.listen(PORT, () => console.log(`Proxy 伺服器運行於埠口 ${PORT}`));
