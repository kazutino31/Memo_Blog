import express from "express";
import fs from "fs";

const router = express.Router();

const DB_DIR = "./db";
const JSON_FILE_PATH = `${DB_DIR}/warrants.json`;
const STOCK_JSON_FILE_PATH = `${DB_DIR}/stockDayAll.json`;

// 工具函式：確保資料夾存在
const ensureDbDir = () => {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
};

// 1. 同步權證資料
router.all("/sync-warrants", async (req, res) => {
  console.log("收到同步請求...");
  try {
    ensureDbDir();
    const response = await fetch("https://openapi.twse.com.tw/v1/opendata/t187ap37_L", {
      headers: { "User-Agent": "Mozilla/5.0..." },
    });
    if (!response.ok) throw new Error("證交所連線失敗");

    const twseData = await response.json();
    console.log(`成功同步 ${twseData.length} 筆資料`);

    fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(twseData, null, 2), "utf-8");
    res.json({ success: true, message: `成功同步 ${twseData.length} 筆權證資料至本地 JSON！` });
  } catch (error) {
    console.error("同步失敗:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. 同步個股資料
router.all("/sync-stocks", async (req, res) => {
  console.log("收到個股同步請求...");
  try {
    ensureDbDir();
    const response = await fetch("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL", {
      headers: { "User-Agent": "Mozilla/5.0..." },
    });
    if (!response.ok) throw new Error("證交所連線失敗");

    const stockData = await response.json();
    console.log(`成功同步 ${stockData.length} 筆個股資料`);

    fs.writeFileSync(STOCK_JSON_FILE_PATH, JSON.stringify(stockData, null, 2), "utf-8");
    res.json({ success: true, message: `成功同步 ${stockData.length} 筆個股資料至本地 JSON！` });
  } catch (error) {
    console.error("個股同步失敗:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 3. 權證即時資料 (不存檔)
router.get("/twse-live", async (req, res) => {
  try {
    const response = await fetch("https://openapi.twse.com.tw/v1/opendata/t187ap37_L", {
      headers: { "User-Agent": "Mozilla/5.0..." },
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. 個股即時資料 (優先讀取本地)
router.get("/stock-live", async (req, res) => {
  try {
    if (fs.existsSync(STOCK_JSON_FILE_PATH)) {
      const rawData = fs.readFileSync(STOCK_JSON_FILE_PATH, "utf-8");
      return res.json(JSON.parse(rawData));
    }

    const response = await fetch("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL", {
      headers: { "User-Agent": "Mozilla/5.0..." },
    });
    if (!response.ok) throw new Error("證交所個股資料讀取失敗");
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. 獲取本地個股數據庫狀態
router.get("/stock-status", (req, res) => {
  try {
    if (!fs.existsSync(STOCK_JSON_FILE_PATH)) return res.json({ exists: false });

    const stats = fs.statSync(STOCK_JSON_FILE_PATH);
    const rawData = fs.readFileSync(STOCK_JSON_FILE_PATH, "utf-8");
    res.json({ exists: true, lastUpdated: stats.mtime, count: JSON.parse(rawData).length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. 依代號快速過濾權證
router.get("/warrant/:id", (req, res) => {
  try {
    if (!fs.existsSync(JSON_FILE_PATH)) {
      return res.status(404).json({ message: "尚未同步資料，請先點擊同步按鈕" });
    }

    const warrants = JSON.parse(fs.readFileSync(JSON_FILE_PATH, "utf-8"));
    const warrant = warrants.find(item => item["權證代號"] === req.params.id || item.WarrantId === req.params.id);

    if (warrant) {
      res.json(warrant);
    } else {
      res.status(404).json({ message: "找不到該權證代號" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. 獲取本地權證數據庫狀態
router.get("/db-status", (req, res) => {
  try {
    if (!fs.existsSync(JSON_FILE_PATH)) return res.json({ exists: false });

    const stats = fs.statSync(JSON_FILE_PATH);
    const warrants = JSON.parse(fs.readFileSync(JSON_FILE_PATH, "utf-8"));
    res.json({ exists: true, lastUpdated: stats.mtime, count: warrants.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. 關閉伺服器
router.post("/shutdown", (req, res) => {
  res.json({ success: true, message: "伺服器正在關閉，釋放 3001 埠口..." });
  console.log("收到前端關機指令，系統即將登出並關閉...");
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

export default router;