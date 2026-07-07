import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// Define the warrant interface based on the HTML logic
interface Warrant {
  權證代號?: string;
  WarrantId?: string;
  "最新履約價格(元)/履約指數"?: string | number;
  strike_price?: string | number;
  StrikePrice?: string | number;
  權證類型?: string;
  warrant_type?: string;
  WarrantType?: string;
  "最新標的履約配發數量(每仟單位權證)"?: string | number;
  exercise_ratio?: string | number;
  ExerciseRatio?: string | number;
}

interface DBStatus {
  exists: boolean;
  count: number;
  lastUpdated: string;
}

export default function WarrantsCalculator() {
  const [warrantId, setWarrantId] = useState("");
  const [type, setType] = useState<"call" | "put">("call");
  const [strikePrice, setStrikePrice] = useState<number | "">("");
  const [ratio, setRatio] = useState<number | "">("");
  const [amount, setAmount] = useState<number | "">("");
  const [cost, setCost] = useState<number | "">("");
  const [targetPrice, setTargetPrice] = useState<number | "">("");
  const [dbStatus, setDbStatus] = useState<string>("正在確認資料庫狀態...");
  const [dbExists, setDbExists] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLiveFetching, setIsLiveFetching] = useState(false);

  const [result, setResult] = useState<{
    unitValue: number;
    totalReturn: number;
    totalCost: number;
    netProfit: number;
  } | null>(null);

  useEffect(() => {
    updateDBStatus();
  }, []);

  const updateDBStatus = async () => {
    try {
      const res = await fetch("https://memo-blog.onrender.com/api/db-status");
      const status: DBStatus = await res.json();
      setDbExists(true);
      if (status.exists) {
        const date = new Date(status.lastUpdated);
        const timeStr = date.toLocaleString("zh-TW", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setDbStatus(`本地數據：${status.count} 筆 | 最後更新：${timeStr}`);
      } else {
        setDbStatus("本地數據：尚未建立資料庫，請點擊更新");
      }
    } catch {
      setDbExists(false);
      setDbStatus("伺服器未啟動");
    }
  };

  const applyWarrantData = (warrant: Warrant) => {
    const sPrice =
      warrant["最新履約價格(元)/履約指數"] ||
      warrant.strike_price ||
      warrant.StrikePrice;
    const tStr =
      warrant["權證類型"] || warrant.warrant_type || warrant.WarrantType || "";
    const rVal =
      warrant["最新標的履約配發數量(每仟單位權證)"] ||
      warrant.exercise_ratio ||
      warrant.ExerciseRatio;

    if (sPrice) setStrikePrice(Number(sPrice));
    if (tStr) {
      setType(
        tStr.includes("認售") || tStr.toLowerCase().includes("put")
          ? "put"
          : "call",
      );
    }
    if (rVal) {
      const parsedRatio = parseFloat(String(rVal));
      setRatio(
        parsedRatio > 1 ? Number((parsedRatio / 1000).toFixed(4)) : parsedRatio,
      );
    }
  };

  const getData = async () => {
    if (!warrantId.trim()) {
      alert("請先輸入權證代號");
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://memo-blog.onrender.com/api/warrant/${warrantId.trim()}`,
      );
      if (response.status === 404)
        throw new Error("資料庫中找不到該權證代號，請按下方『更新資料庫』按鈕");
      if (!response.ok) throw new Error("代理伺服器回傳錯誤");
      const warrant = await response.json();
      applyWarrantData(warrant);
    } catch (error: any) {
      alert(error.message || "抓取失敗，請確認後端 Proxy 是否已啟動。");
    } finally {
      setIsSearching(false);
    }
  };

  const getLiveTWSE = async () => {
    if (!warrantId.trim()) {
      alert("請先輸入權證代號");
      return;
    }
    setIsLiveFetching(true);
    try {
      const response = await fetch(
        `https://memo-blog.onrender.com/api/twse-live`,
      );
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("證交所回傳格式錯誤");
      const warrant = data.find(
        (item: any) =>
          item["權證代號"] === warrantId.trim() ||
          item.WarrantId === warrantId.trim(),
      );
      if (warrant) {
        applyWarrantData(warrant);
        alert(`已成功從證交所即時抓取 ${warrantId} 的資料！`);
      } else {
        alert("證交所即時資料中找不到該代號");
      }
    } catch (error: any) {
      alert("即時抓取失敗: " + error.message);
    } finally {
      setIsLiveFetching(false);
    }
  };

  const syncData = async () => {
    if (!confirm("是否要從證交所下載最新資料並同步至資料庫？")) return;
    setIsSyncing(true);
    try {
      const response = await fetch(
        "https://memo-blog.onrender.com/api/sync-warrants",
      );
      const result = await response.json();
      alert(result.message || "同步成功！");
      updateDBStatus();
    } catch (error: any) {
      alert("同步失敗: " + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const shutdownServer = async () => {
    if (
      !confirm(
        "確定要停止後端 Proxy 服務嗎？停止後將無法查詢代號，需手動重新啟動。",
      )
    )
      return;
    try {
      const response = await fetch(
        "https://memo-blog.onrender.com/api/shutdown",
        {
          method: "POST",
        },
      );
      const result = await response.json();
      if (result.success) {
        alert("伺服器已停止");
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      alert("無法連接到伺服器，可能伺服器原本就已經是關閉狀態。");
    }
  };

  const calculate = () => {
    const sP = Number(strikePrice);
    const r = Number(ratio);
    const a = Number(amount);
    const c = Number(cost);
    const tP = Number(targetPrice);

    const totalUnits = a * 1000;
    const totalCost = c * totalUnits;

    let unitValue = 0;
    if (type === "call") {
      unitValue = (tP - sP) * r;
    } else {
      unitValue = (sP - tP) * r;
    }

    if (unitValue < 0) unitValue = 0;

    const totalReturn = unitValue * totalUnits;
    const netProfit = totalReturn - totalCost;

    setResult({
      unitValue,
      totalReturn,
      totalCost,
      netProfit,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e9f2f9] via-[#f6fafd] to-[#f6fafd] px-5 py-12">
      <div className="mx-auto w-full max-w-[480px] rounded-[18px] border border-[#e8f0f6] bg-white p-8 pt-9 pb-7 shadow-[0_20px_40px_-20px_rgba(91,147,196,0.25),0_4px_10px_-4px_rgba(91,147,196,0.12)]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#eaf3fa] to-[#dcebf6] text-[22px]">
            🧮
          </div>
          <h2 className="mb-1 text-xl font-bold tracking-tight text-[#2c4258]">
            到期結算金額試算機
          </h2>
          <p className="text-[12.5px] tracking-tight text-[#a9bccb]">
            權證到期損益快速試算
          </p>
        </div>

        <div className="mb-5 rounded-[10px] border border-[#e8f0f6] bg-[#f2f7fb] p-5">
          <div className="mb-3 flex items-center gap-1.5 text-[11.5px] font-bold tracking-widest text-[#4a7cab] uppercase before:inline-block before:h-1 before:w-1 before:rounded-full before:bg-[#5b93c4] before:content-['']">
            代號查詢
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-[#7691a8]">
                權證代號
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={warrantId}
                  onChange={(e) => setWarrantId(e.target.value)}
                  placeholder="請輸入代號"
                  disabled={!dbExists}
                  className="flex-[2] rounded-[7px] border border-[#dce8f1] bg-white px-3 py-2.5 text-[15px] transition focus:border-[#5b93c4] focus:ring-[3px] focus:ring-[#5b93c4]/15 focus:outline-none disabled:bg-[#eef2f5] disabled:text-[#a9bccb]"
                />
                <button
                  onClick={getData}
                  disabled={!dbExists || isSearching}
                  className="flex-1 rounded-[7px] bg-[#6c8499] px-2 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-[#587389] active:translate-y-px disabled:cursor-not-allowed disabled:bg-[#dbe4ea] disabled:text-[#a9bccb]"
                >
                  {isSearching ? "搜尋中..." : "查詢代號"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3 flex items-center gap-1.5 text-[11.5px] font-bold tracking-widest text-[#4a7cab] uppercase before:inline-block before:h-1 before:w-1 before:rounded-full before:bg-[#5b93c4] before:content-['']">
          試算參數
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-[#7691a8]">
              權證類型
            </label>
            <select
              value={type}
              disabled={!dbExists}
              onChange={(e) => setType(e.target.value as "call" | "put")}
              className="w-full rounded-[7px] border border-[#dce8f1] bg-white px-3 py-2.5 text-[15px] transition focus:border-[#5b93c4] focus:ring-[3px] focus:ring-[#5b93c4]/15 focus:outline-none disabled:bg-[#eef2f5] disabled:text-[#a9bccb]"
            >
              <option value="call">認購 (Call)</option>
              <option value="put">認售 (Put)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-[#7691a8]">
              最新履約價格 (元)
            </label>
            <input
              type="number"
              step="0.01"
              value={strikePrice}
              onChange={(e) =>
                setStrikePrice(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="w-full rounded-[7px] border border-[#dce8f1] bg-white px-3 py-2.5 text-[15px] transition focus:border-[#5b93c4] focus:ring-[3px] focus:ring-[#5b93c4]/15 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-[#7691a8]">
              行使比例
            </label>
            <input
              type="number"
              step="0.0001"
              value={ratio}
              onChange={(e) =>
                setRatio(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full rounded-[7px] border border-[#dce8f1] bg-white px-3 py-2.5 text-[15px] transition focus:border-[#5b93c4] focus:ring-[3px] focus:ring-[#5b93c4]/15 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-[#7691a8]">
              持有張數
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full rounded-[7px] border border-[#dce8f1] bg-white px-3 py-2.5 text-[15px] transition focus:border-[#5b93c4] focus:ring-[3px] focus:ring-[#5b93c4]/15 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-[#7691a8]">
              每單位買進成本 (元)
            </label>
            <input
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) =>
                setCost(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full rounded-[7px] border border-[#dce8f1] bg-white px-3 py-2.5 text-[15px] transition focus:border-[#5b93c4] focus:ring-[3px] focus:ring-[#5b93c4]/15 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-[#7691a8]">
              預估到期日標的股價 (元)
            </label>
            <input
              type="number"
              step="0.1"
              value={targetPrice}
              onChange={(e) =>
                setTargetPrice(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="w-full rounded-[7px] border border-[#dce8f1] bg-white px-3 py-2.5 text-[15px] transition focus:border-[#5b93c4] focus:ring-[3px] focus:ring-[#5b93c4]/15 focus:outline-none"
            />
          </div>

          <button
            onClick={calculate}
            className="w-full rounded-[7px] bg-[#5b93c4] p-3 text-[15.5px] font-semibold text-white shadow-[0_8px_16px_-8px_rgba(91,147,196,0.6)] transition hover:bg-[#4a7cab] active:translate-y-px"
          >
            開始計算結算金額
          </button>

          <div className="flex gap-2 pt-3">
            <button
              onClick={getLiveTWSE}
              disabled={!dbExists || isLiveFetching}
              className="flex-1 rounded-[7px] bg-[#79a6cf] p-2.5 text-[13px] font-semibold text-white transition hover:bg-[#6893bd] active:translate-y-px disabled:bg-[#dbe4ea] disabled:text-[#a9bccb]"
            >
              {isLiveFetching ? "抓取中..." : "即時抓取證交所"}
            </button>
            <button
              onClick={syncData}
              disabled={!dbExists || isSyncing}
              className="flex-1 rounded-[7px] bg-[#98b3c9] p-2.5 text-[13px] font-semibold text-white transition hover:bg-[#86a2b9] active:translate-y-px disabled:bg-[#dbe4ea] disabled:text-[#a9bccb]"
            >
              {isSyncing ? "同步中..." : "更新本地數據庫"}
            </button>
          </div>

          {/* <button
            onClick={shutdownServer}
            disabled={!dbExists}
            className="mt-3 w-full rounded-[7px] border border-[#dce8f1] bg-transparent p-2.5 text-[12.5px] font-semibold text-[#a9bccb] transition hover:border-[#f3d3d1] hover:bg-[#fdeeed] hover:text-[#e0716b] disabled:bg-[#dbe4ea] disabled:text-[#a9bccb]"
          >
            停止服務 (釋放 Port)
          </button> */}

          <div
            className={cn(
              "mt-2.5 text-center text-[11.5px] text-[#a9bccb]",
              !dbExists && "text-[#e0716b]",
            )}
          >
            {dbStatus}
          </div>

          {result && (
            <div className="mt-6 rounded-[10px] border border-[#d9e9f5] bg-gradient-to-br from-[#eaf3fa] to-[#f5faff] p-5">
              <div className="mb-3.5 border-b border-[#d9e9f5] pb-2.5 text-[14px] font-bold tracking-widest text-[#4a7cab] uppercase">
                試算結果
              </div>
              <div className="space-y-3 pt-1">
                <div className="flex justify-between text-[14px] text-[#7691a8]">
                  <span>每單位權證到期價值：</span>
                  <span className="font-bold text-[#33475b]">
                    {result.unitValue.toFixed(4)} 元
                  </span>
                </div>
                <div className="flex justify-between text-[14px] text-[#7691a8]">
                  <span>可拿回總金額：</span>
                  <span className="font-bold text-[#33475b]">
                    {Math.round(result.totalReturn).toLocaleString()} 元
                  </span>
                </div>
                <div className="flex justify-between text-[14px] text-[#7691a8]">
                  <span>總投入成本：</span>
                  <span className="font-bold text-[#33475b]">
                    {Math.round(result.totalCost).toLocaleString()} 元
                  </span>
                </div>
                <div className="mt-3 flex justify-between border-t border-dashed border-[#c9dded] pt-3 text-[14px] text-[#7691a8]">
                  <span>淨損益 (扣除成本)：</span>
                  {result.netProfit > 0 ? (
                    <span className="rounded-[20px] bg-[#eaf7f1] px-2.5 py-0.5 text-[13px] font-bold text-[#4caf82]">
                      獲利 +{Math.round(result.netProfit).toLocaleString()} 元
                    </span>
                  ) : result.netProfit < 0 ? (
                    <span className="rounded-[20px] bg-[#fdeeed] px-2.5 py-0.5 text-[13px] font-bold text-[#e0716b]">
                      虧損 -
                      {Math.round(Math.abs(result.netProfit)).toLocaleString()}{" "}
                      元
                    </span>
                  ) : (
                    <span className="font-bold text-[#33475b]">
                      0 元 (損益兩平)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
