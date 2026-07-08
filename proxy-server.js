import express from "express";
import cors from "cors";
import apiRouter from "@/routes/api.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json()); // 送 JSON body 時解析

// 掛載 API 模組 (自動帶有 /api 前綴)
app.use("/api", apiRouter);

// 啟動伺服器
app.listen(PORT, () => console.log(`Proxy 伺服器運行於埠口 ${PORT}`));
