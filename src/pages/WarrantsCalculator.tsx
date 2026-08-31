import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Calculator, TriangleAlert } from "lucide-react";

// Define the warrant interface based on the HTML logic
interface Warrant {
  權證代號?: string;
  WarrantId?: string;
  權證簡稱?: string;
  warrant_name?: string;
  WarrantName?: string;
  "最新履約價格(元)/履約指數"?: string | number;
  strike_price?: string | number;
  StrikePrice?: string | number;
  權證類型?: string;
  warrant_type?: string;
  WarrantType?: string;
  "最新標的履約配發數量(每仟單位權證)"?: string | number;
  exercise_ratio?: string | number;
  ExerciseRatio?: string | number;
  "標的證券/指數"?: string;
  underlying_asset?: string;
  UnderlyingAsset?: string;
}

interface DBStatus {
  exists: boolean;
  count: number;
  lastUpdated: string;
}

// 建立表單欄位錯誤提示的 interface
interface FormErrors {
  strikePrice?: boolean;
  ratio?: boolean;
  amount?: boolean;
  cost?: boolean;
  targetPrice?: boolean;
  spotPrice?: boolean;
  volatility?: boolean;
  riskFreeRate?: boolean;
  remainingDays?: boolean;
}

type CalculationMode = "expiry" | "valuation";

interface ValuationResult {
  theoreticalValue: number;
  intrinsicValue: number;
  timeValue: number;
  delta: number;
  remainingDays: number;
  scenarios: Array<{
    change: number;
    spotPrice: number;
    theoreticalValue: number;
    changeRate: number;
  }>;
}

const normalCdf = (value: number) => {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t) *
      Math.exp(-x * x);

  return 0.5 * (1 + sign * erf);
};

const blackScholes = (
  optionType: "call" | "put",
  spot: number,
  strike: number,
  years: number,
  volatility: number,
  riskFreeRate: number,
) => {
  if (years <= 0 || volatility <= 0) {
    return {
      price:
        optionType === "call"
          ? Math.max(spot - strike, 0)
          : Math.max(strike - spot, 0),
      delta:
        optionType === "call"
          ? spot > strike
            ? 1
            : 0
          : spot < strike
            ? -1
            : 0,
    };
  }

  const sqrtYears = Math.sqrt(years);
  const d1 =
    (Math.log(spot / strike) +
      (riskFreeRate + (volatility * volatility) / 2) * years) /
    (volatility * sqrtYears);
  const d2 = d1 - volatility * sqrtYears;
  const discountedStrike = strike * Math.exp(-riskFreeRate * years);

  if (optionType === "call") {
    return {
      price: spot * normalCdf(d1) - discountedStrike * normalCdf(d2),
      delta: normalCdf(d1),
    };
  }

  return {
    price: discountedStrike * normalCdf(-d2) - spot * normalCdf(-d1),
    delta: normalCdf(d1) - 1,
  };
};

export default function WarrantsCalculator() {
  const [mode, setMode] = useState<CalculationMode>("expiry");
  const [warrantId, setWarrantId] = useState("");
  const [warrantName, setWarrantName] = useState("");
  const [underlyingPrice, setUnderlyingPrice] = useState<number | null>(null);
  const [type, setType] = useState<"call" | "put">("call");
  const [strikePrice, setStrikePrice] = useState<number | "">("");
  const [ratio, setRatio] = useState<number | "">("");
  const [amount, setAmount] = useState<number | "">("");
  const [cost, setCost] = useState<number | "">("");
  const [targetPrice, setTargetPrice] = useState<number | "">("");
  const [spotPrice, setSpotPrice] = useState<number | "">("");
  const [volatility, setVolatility] = useState<number | "">(30);
  const [riskFreeRate, setRiskFreeRate] = useState<number | "">(1.5);
  const [remainingDays, setRemainingDays] = useState<number | "">(90);
  const [dbStatus, setDbStatus] = useState<string>("正在確認資料庫狀態...");
  const [stockDbStatus, setStockDbStatus] =
    useState<string>("正在確認股價資料...");
  const [dbExists, setDbExists] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isStockSyncing, setIsStockSyncing] = useState(false);
  const [isLiveFetching, setIsLiveFetching] = useState(false);
  const [isManagementOpen, setIsManagementOpen] = useState(false);

  // 新增錯誤卡控狀態
  const [errors, setErrors] = useState<FormErrors>({});

  const [result, setResult] = useState<{
    unitValue: number;
    totalReturn: number;
    totalCost: number;
    netProfit: number;
    roi: number;
    breakeven: number;
  } | null>(null);
  const [valuationResult, setValuationResult] =
    useState<ValuationResult | null>(null);

  useEffect(() => {
    const initializeStatus = async () => {
      setIsInitializing(true);
      await Promise.allSettled([updateDBStatus(), updateStockDBStatus()]);
      setIsInitializing(false);
    };

    initializeStatus();
  }, []);

  async function updateDBStatus() {
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
        setDbStatus(`權證數據：${status.count} 筆 | 最後更新：${timeStr}`);
      } else {
        setDbStatus("權證數據：尚未建立資料庫，請點擊更新");
      }
    } catch {
      setDbExists(false);
      setDbStatus("伺服器未啟動");
    }
  }

  async function updateStockDBStatus() {
    try {
      const res = await fetch(
        "https://memo-blog.onrender.com/api/stock-status",
      );
      const status: DBStatus = await res.json();
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
        setStockDbStatus(`標的數據：${status.count} 筆 | 最後更新：${timeStr}`);
      } else {
        setStockDbStatus("標的數據：尚未建立資料庫，請更新股價");
      }
    } catch {
      setStockDbStatus("無法獲取股價資料庫狀態");
    }
  }

  const fetchStockPrice = async (assetName: string) => {
    try {
      const response = await fetch(
        "https://memo-blog.onrender.com/api/stock-live",
      );
      if (!response.ok) return;
      const stocks = await response.json();

      const stock = stocks.find(
        (s: any) => s["Name"] === assetName || s["Code"] === assetName,
      );
      if (stock && stock["ClosingPrice"] && stock["ClosingPrice"] !== "--") {
        const cleanPrice = String(stock["ClosingPrice"]).replace(/,/g, "");
        const price = Number(cleanPrice);
        setUnderlyingPrice(price);
        setSpotPrice(price);
        // 自動帶入時清除 targetPrice 的錯誤提示
        setErrors((prev) => ({
          ...prev,
          targetPrice: false,
          spotPrice: false,
        }));
      }
    } catch (err) {
      console.error("抓取股價失敗", err);
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
    const wName =
      warrant["權證簡稱"] || warrant.warrant_name || warrant.WarrantName || "";
    const uAsset =
      warrant["標的證券/指數"] ||
      warrant.underlying_asset ||
      warrant.UnderlyingAsset ||
      "";

    if (sPrice) {
      setStrikePrice(Number(sPrice));
      setErrors((prev) => ({ ...prev, strikePrice: false }));
    }
    if (wName) setWarrantName(String(wName));
    if (uAsset) fetchStockPrice(String(uAsset));
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
      setErrors((prev) => ({ ...prev, ratio: false }));
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
      if (response.status === 404) throw new Error("找不到該權證代號");
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

  const syncStocks = async () => {
    if (!confirm("是否要從證交所下載最新個股/標的收盤價？")) return;
    setIsStockSyncing(true);
    try {
      const response = await fetch(
        "https://memo-blog.onrender.com/api/sync-stocks",
      );
      const result = await response.json();
      alert(result.message || "股價同步成功！");
      updateStockDBStatus();
    } catch (error: any) {
      alert("股價同步失敗: " + error.message);
    } finally {
      setIsStockSyncing(false);
    }
  };

  const calculate = () => {
    // 表單卡控驗證
    const newErrors: FormErrors = {
      strikePrice: strikePrice === "",
      ratio: ratio === "",
      amount: amount === "",
      cost: cost === "",
      targetPrice: targetPrice === "" && underlyingPrice === null, // 若無手動預估，且無參考股價時報錯
    };

    setErrors(newErrors);

    // 如果有任何一欄沒填，阻擋計算
    if (Object.values(newErrors).some((isError) => isError)) {
      return;
    }

    const sP = Number(strikePrice);
    const r = Number(ratio);
    const a = Number(amount);
    const c = Number(cost);
    const tP = targetPrice !== "" ? Number(targetPrice) : underlyingPrice || 0;

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
    const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

    const costPerUnit = c;
    const breakeven =
      type === "call" ? sP + costPerUnit / r : sP - costPerUnit / r;

    setResult({
      unitValue,
      totalReturn,
      totalCost,
      netProfit,
      roi,
      breakeven,
    });
  };

  const calculateValuation = () => {
    const newErrors: FormErrors = {
      strikePrice: strikePrice === "" || Number(strikePrice) <= 0,
      ratio: ratio === "" || Number(ratio) <= 0,
      spotPrice: spotPrice === "" || Number(spotPrice) <= 0,
      volatility: volatility === "" || Number(volatility) <= 0,
      riskFreeRate: riskFreeRate === "",
      remainingDays: remainingDays === "" || Number(remainingDays) < 0,
    };

    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    const spot = Number(spotPrice);
    const strike = Number(strikePrice);
    const exerciseRatio = Number(ratio);
    const years = Number(remainingDays) / 365;
    const annualVolatility = Number(volatility) / 100;
    const annualRiskFreeRate = Number(riskFreeRate) / 100;
    const baseOption = blackScholes(
      type,
      spot,
      strike,
      years,
      annualVolatility,
      annualRiskFreeRate,
    );
    const theoreticalValue = baseOption.price * exerciseRatio;
    const intrinsicValue =
      (type === "call"
        ? Math.max(spot - strike, 0)
        : Math.max(strike - spot, 0)) * exerciseRatio;

    const scenarios = [-10, -5, 0, 5, 10].map((change) => {
      const scenarioSpot = spot * (1 + change / 100);
      const scenarioValue =
        blackScholes(
          type,
          scenarioSpot,
          strike,
          years,
          annualVolatility,
          annualRiskFreeRate,
        ).price * exerciseRatio;

      return {
        change,
        spotPrice: scenarioSpot,
        theoreticalValue: scenarioValue,
        changeRate:
          theoreticalValue > 0
            ? ((scenarioValue - theoreticalValue) / theoreticalValue) * 100
            : 0,
      };
    });

    setValuationResult({
      theoreticalValue,
      intrinsicValue,
      timeValue: Math.max(theoreticalValue - intrinsicValue, 0),
      delta: baseOption.delta * exerciseRatio,
      remainingDays: Number(remainingDays),
      scenarios,
    });
  };

  // 代號改變重置表單
  const handleWarrantIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (value !== warrantId) {
      setWarrantId(value);

      setWarrantName("");
      setUnderlyingPrice(null);
      setStrikePrice("");
      setRatio("");
      setResult(null);
      setValuationResult(null);
      setSpotPrice("");
      setErrors({});
    }
  };

  return (
    <div className="min-h-screen bg-background px-5 py-12">
      <div
        className={cn(
          "mx-auto w-full rounded-[18px] border border-rule bg-card p-8 pt-9 pb-7 shadow-xl transition-[max-width]",
          mode === "expiry" ? "max-w-120" : "max-w-2xl",
        )}
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-brand-soft text-[22px]">
            <Calculator size={22} className="text-brand" />
          </div>
          <h2 className="mb-1 text-xl font-bold tracking-tight text-ink">
            權證試算機
          </h2>
          <p className="text-[12.5px] tracking-tight text-ink-faint">
            {mode === "expiry"
              ? "權證到期損益快速試算"
              : "Black–Scholes 理論估價與標的情境分析"}
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-[10px] bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("expiry");
              setErrors({});
            }}
            className={cn(
              "rounded-[7px] px-3 py-2.5 text-[13px] font-semibold transition",
              mode === "expiry"
                ? "bg-background text-brand shadow-sm"
                : "text-ink-faint hover:text-ink-soft",
            )}
          >
            到期損益
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("valuation");
              setErrors({});
            }}
            className={cn(
              "rounded-[7px] px-3 py-2.5 text-[13px] font-semibold transition",
              mode === "valuation"
                ? "bg-background text-brand shadow-sm"
                : "text-ink-faint hover:text-ink-soft",
            )}
          >
            Black–Scholes 估價
          </button>
        </div>

        {isInitializing && (
          <div className="mb-5 flex items-center justify-center gap-2 rounded-[10px] border border-rule bg-brand-soft px-4 py-3 text-[13px] font-medium text-brand">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            連線中，正在載入資料狀態...
          </div>
        )}

        <div className="mb-5 rounded-[10px] border border-rule bg-muted/20 p-5">
          <div className="mb-3 flex items-center gap-1.5 text-[11.5px] font-bold tracking-widest text-brand uppercase before:inline-block before:h-1 before:w-1 before:rounded-full before:bg-brand before:content-['']">
            代號查詢
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-ink-soft">
                權證代號
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={warrantId}
                  onChange={handleWarrantIdChange}
                  placeholder="請輸入代號"
                  disabled={!dbExists}
                  className="flex-2 rounded-[7px] border border-rule bg-background px-3 py-2.5 text-[15px] transition focus:border-brand focus:ring-[3px] focus:ring-brand/15 focus:outline-none disabled:bg-muted disabled:text-ink-faint"
                />
                <button
                  onClick={getData}
                  disabled={!dbExists || isSearching}
                  className="flex-1 rounded-[7px] bg-secondary px-2 py-2.5 text-[13.5px] font-semibold text-secondary-foreground transition hover:bg-ring/30 active:translate-y-px disabled:cursor-not-allowed disabled:bg-muted disabled:text-ink-faint"
                >
                  {isSearching ? "搜尋中..." : "查詢"}
                </button>
              </div>
            </div>

            {warrantName && (
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-ink-soft">
                  權證名稱
                </label>
                <div className="rounded-[7px] border border-rule bg-background/50 px-3 py-2.5 text-[15px] font-medium text-ink">
                  {warrantName}
                </div>
              </div>
            )}

            {underlyingPrice !== null && (
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-ink-soft">
                  標的最新價格 (參考)
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-[7px] border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-[15px] font-bold text-emerald-600 dark:text-emerald-400">
                    {underlyingPrice}
                  </div>
                  <button
                    onClick={() => {
                      if (mode === "expiry") {
                        setTargetPrice(underlyingPrice);
                        setErrors((prev) => ({
                          ...prev,
                          targetPrice: false,
                        }));
                      } else {
                        setSpotPrice(underlyingPrice);
                        setErrors((prev) => ({
                          ...prev,
                          spotPrice: false,
                        }));
                      }
                    }}
                    className="rounded-[7px] bg-emerald-600 px-3 py-2.5 text-[12px] font-bold text-white transition hover:bg-emerald-700"
                  >
                    {mode === "expiry" ? "帶入試算" : "帶入現價"}
                  </button>
                </div>
                {mode === "expiry" &&
                  strikePrice !== "" &&
                  ((type === "call" && underlyingPrice < Number(strikePrice)) ||
                    (type === "put" &&
                      underlyingPrice > Number(strikePrice))) && (
                    <div className="mt-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[12px] font-medium text-amber-600 dark:text-amber-400">
                      <TriangleAlert className="inline-block h-4 w-4" />
                      目前為價外，若維持此股價，到期結算價值將歸零。
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>

        <div className="mb-3 flex items-center gap-1.5 text-[11.5px] font-bold tracking-widest text-brand uppercase before:inline-block before:h-1 before:w-1 before:rounded-full before:bg-brand before:content-['']">
          試算參數
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-ink-soft">
              權證類型
            </label>
            <select
              value={type}
              disabled={!dbExists}
              onChange={(e) => setType(e.target.value as "call" | "put")}
              className="w-full rounded-[7px] border border-rule bg-background px-3 py-2.5 text-[15px] transition focus:border-brand focus:ring-[3px] focus:ring-brand/15 focus:outline-none disabled:bg-muted disabled:text-ink-faint"
            >
              <option value="call">認購 (Call)</option>
              <option value="put">認售 (Put)</option>
            </select>
          </div>

          {/* 最新履約價格 */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-ink-soft">
              最新履約價格 (元) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={strikePrice}
              onChange={(e) => {
                setStrikePrice(
                  e.target.value === "" ? "" : Number(e.target.value),
                );
                if (e.target.value !== "") {
                  setErrors((prev) => ({ ...prev, strikePrice: false }));
                }
              }}
              className={cn(
                "w-full rounded-[7px] border bg-background px-3 py-2.5 text-[15px] transition focus:ring-[3px] focus:outline-none",
                errors.strikePrice
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                  : "border-rule focus:border-brand focus:ring-brand/15",
              )}
            />
            {errors.strikePrice && (
              <p className="text-[11.5px] font-medium text-red-500">
                請輸入最新履約價格
              </p>
            )}
          </div>

          {/* 行使比例 */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-ink-soft">
              行使比例 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.0001"
              value={ratio}
              onChange={(e) => {
                setRatio(e.target.value === "" ? "" : Number(e.target.value));
                if (e.target.value !== "") {
                  setErrors((prev) => ({ ...prev, ratio: false }));
                }
              }}
              className={cn(
                "w-full rounded-[7px] border bg-background px-3 py-2.5 text-[15px] transition focus:ring-[3px] focus:outline-none",
                errors.ratio
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                  : "border-rule focus:border-brand focus:ring-brand/15",
              )}
            />
            {errors.ratio && (
              <p className="text-[11.5px] font-medium text-red-500">
                請輸入行使比例
              </p>
            )}
          </div>

          {mode === "expiry" && (
            <>
          {/* 持有張數 */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-ink-soft">
              持有張數 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value === "" ? "" : Number(e.target.value));
                if (e.target.value !== "") {
                  setErrors((prev) => ({ ...prev, amount: false }));
                }
              }}
              className={cn(
                "w-full rounded-[7px] border bg-background px-3 py-2.5 text-[15px] transition focus:ring-[3px] focus:outline-none",
                errors.amount
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                  : "border-rule focus:border-brand focus:ring-brand/15",
              )}
            />
            {errors.amount && (
              <p className="text-[11.5px] font-medium text-red-500">
                請輸入持有張數
              </p>
            )}
          </div>

          {/* 每單位買進成本 */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-ink-soft">
              每單位買進成本 (元) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => {
                setCost(e.target.value === "" ? "" : Number(e.target.value));
                if (e.target.value !== "") {
                  setErrors((prev) => ({ ...prev, cost: false }));
                }
              }}
              className={cn(
                "w-full rounded-[7px] border bg-background px-3 py-2.5 text-[15px] transition focus:ring-[3px] focus:outline-none",
                errors.cost
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                  : "border-rule focus:border-brand focus:ring-brand/15",
              )}
            />
            {errors.cost && (
              <p className="text-[11.5px] font-medium text-red-500">
                請輸入每單位買進成本
              </p>
            )}
          </div>

          {/* 預估到期日標的股價 */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-ink-soft">
              預估到期日標的股價 (元) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={targetPrice}
              onChange={(e) => {
                setTargetPrice(
                  e.target.value === "" ? "" : Number(e.target.value),
                );
                if (e.target.value !== "" || underlyingPrice !== null) {
                  setErrors((prev) => ({ ...prev, targetPrice: false }));
                }
              }}
              placeholder={
                underlyingPrice ? `未填則帶入參考價 ${underlyingPrice}` : ""
              }
              className={cn(
                "w-full rounded-[7px] border bg-background px-3 py-2.5 text-[15px] transition focus:ring-[3px] focus:outline-none",
                errors.targetPrice
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                  : "border-rule focus:border-brand focus:ring-brand/15",
              )}
            />
            {errors.targetPrice && (
              <p className="text-[11.5px] font-medium text-red-500">
                請輸入預估股價或由上方帶入參考價
              </p>
            )}

            {targetPrice !== "" &&
              strikePrice !== "" &&
              ((type === "call" && Number(targetPrice) < Number(strikePrice)) ||
                (type === "put" &&
                  Number(targetPrice) > Number(strikePrice))) && (
                <div className="mt-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[12px] font-medium text-amber-600 dark:text-amber-400">
                  <TriangleAlert className="inline-block h-4 w-4" />
                  預估值為價外，若以此股價結算，價值將歸零。
                </div>
              )}
          </div>

            </>
          )}

          {mode === "valuation" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[13px] font-semibold text-ink-soft">
                  標的目前價格 (元) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={spotPrice}
                  onChange={(e) => {
                    setSpotPrice(
                      e.target.value === "" ? "" : Number(e.target.value),
                    );
                    if (e.target.value !== "") {
                      setErrors((prev) => ({ ...prev, spotPrice: false }));
                    }
                  }}
                  placeholder={
                    underlyingPrice ? `參考價 ${underlyingPrice}` : "例如 100"
                  }
                  className={cn(
                    "w-full rounded-[7px] border bg-background px-3 py-2.5 text-[15px] transition focus:ring-[3px] focus:outline-none",
                    errors.spotPrice
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                      : "border-rule focus:border-brand focus:ring-brand/15",
                  )}
                />
                {errors.spotPrice && (
                  <p className="text-[11.5px] font-medium text-red-500">
                    請輸入大於 0 的標的目前價格
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-ink-soft">
                  年化波動率 (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={volatility}
                  onChange={(e) => {
                    setVolatility(
                      e.target.value === "" ? "" : Number(e.target.value),
                    );
                    if (e.target.value !== "") {
                      setErrors((prev) => ({ ...prev, volatility: false }));
                    }
                  }}
                  className={cn(
                    "w-full rounded-[7px] border bg-background px-3 py-2.5 text-[15px] transition focus:ring-[3px] focus:outline-none",
                    errors.volatility
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                      : "border-rule focus:border-brand focus:ring-brand/15",
                  )}
                />
                {errors.volatility && (
                  <p className="text-[11.5px] font-medium text-red-500">
                    請輸入大於 0 的年化波動率
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-ink-soft">
                  無風險利率 (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={riskFreeRate}
                  onChange={(e) => {
                    setRiskFreeRate(
                      e.target.value === "" ? "" : Number(e.target.value),
                    );
                    if (e.target.value !== "") {
                      setErrors((prev) => ({ ...prev, riskFreeRate: false }));
                    }
                  }}
                  className={cn(
                    "w-full rounded-[7px] border bg-background px-3 py-2.5 text-[15px] transition focus:ring-[3px] focus:outline-none",
                    errors.riskFreeRate
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                      : "border-rule focus:border-brand focus:ring-brand/15",
                  )}
                />
                {errors.riskFreeRate && (
                  <p className="text-[11.5px] font-medium text-red-500">
                    請輸入無風險利率，可填 0
                  </p>
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[13px] font-semibold text-ink-soft">
                  剩餘天數 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={remainingDays}
                  onChange={(e) => {
                    setRemainingDays(
                      e.target.value === "" ? "" : Number(e.target.value),
                    );
                    if (e.target.value !== "") {
                      setErrors((prev) => ({ ...prev, remainingDays: false }));
                    }
                  }}
                  className={cn(
                    "w-full rounded-[7px] border bg-background px-3 py-2.5 text-[15px] transition focus:ring-[3px] focus:outline-none",
                    errors.remainingDays
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                      : "border-rule focus:border-brand focus:ring-brand/15",
                  )}
                />
                {errors.remainingDays && (
                  <p className="text-[11.5px] font-medium text-red-500">
                    請輸入 0 或正整數天數
                  </p>
                )}
              </div>

              <p className="text-[11.5px] leading-relaxed text-ink-faint sm:col-span-2">
                本模式以無股息 Black–Scholes 模型估算；波動率與利率在所有情境中維持不變。
              </p>
            </div>
          )}

          <button
            onClick={mode === "expiry" ? calculate : calculateValuation}
            className="w-full rounded-[7px] bg-brand p-3 text-[15.5px] font-semibold text-white shadow-lg transition hover:bg-brand-hover active:translate-y-px"
          >
            {mode === "expiry" ? "開始計算結算金額" : "計算理論價值與情境"}
          </button>

          {mode === "expiry" && result && (
            <div className="mt-6 rounded-[10px] border border-rule bg-brand-soft/30 p-5">
              <div className="mb-3.5 border-b border-rule pb-2.5 text-[14px] font-bold tracking-widest text-brand uppercase">
                試算結果
              </div>
              <div className="space-y-3 pt-1">
                <div className="flex justify-between text-[14px] text-ink-soft">
                  <span>每單位權證到期價值：</span>
                  <span className="font-bold text-ink">
                    {result.unitValue.toFixed(4)} 元
                  </span>
                </div>
                <div className="flex justify-between text-[14px] text-ink-soft">
                  <span>可拿回總金額：</span>
                  <span className="font-bold text-ink">
                    {Math.round(result.totalReturn).toLocaleString()} 元
                  </span>
                </div>
                <div className="flex justify-between text-[14px] text-ink-soft">
                  <span>損益平衡標的價：</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {result.breakeven.toFixed(2)} 元
                  </span>
                </div>
                <div className="mt-3 flex justify-between border-t border-dashed border-rule pt-3 text-[14px] text-ink-soft">
                  <span>淨損益 (報酬率)：</span>
                  {Math.round(result.netProfit) > 0 ? (
                    <div className="text-right">
                      <div className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                        獲利 +{Math.round(result.netProfit).toLocaleString()} 元
                      </div>
                      <div className="text-[11px] font-medium text-emerald-600/80">
                        (+{result.roi.toFixed(2)}%)
                      </div>
                    </div>
                  ) : Math.round(result.netProfit) < 0 ? (
                    <div className="text-right">
                      <div className="text-[13px] font-bold text-destructive">
                        虧損 -
                        {Math.round(
                          Math.abs(result.netProfit),
                        ).toLocaleString()}{" "}
                        元
                      </div>
                      <div className="text-[11px] font-medium text-destructive/80">
                        ({result.roi.toFixed(2)}%)
                      </div>
                    </div>
                  ) : (
                    <span className="font-bold text-ink">0 元 (損益兩平)</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {mode === "valuation" && valuationResult && (
            <div className="mt-6 overflow-hidden rounded-[10px] border border-rule bg-brand-soft/30">
              <div className="border-b border-rule px-5 py-4">
                <div className="text-[14px] font-bold tracking-widest text-brand uppercase">
                  Black–Scholes 估價結果
                </div>
                <p className="mt-1 text-[11.5px] text-ink-faint">
                  金額均為每單位權證估值，已乘上行使比例。
                </p>
              </div>

              <div className="grid grid-cols-2 border-b border-rule sm:grid-cols-4">
                {[
                  {
                    label: "理論價值",
                    value: `${valuationResult.theoreticalValue.toFixed(4)} 元`,
                  },
                  {
                    label: "內含價值",
                    value: `${valuationResult.intrinsicValue.toFixed(4)} 元`,
                  },
                  {
                    label: "時間價值",
                    value: `${valuationResult.timeValue.toFixed(4)} 元`,
                  },
                  {
                    label: "Delta",
                    value: valuationResult.delta.toFixed(4),
                  },
                ].map((item, index) => (
                  <div
                    key={item.label}
                    className={cn(
                      "px-4 py-4",
                      index % 2 === 0 && "border-r border-rule",
                      index < 2 && "border-b border-rule sm:border-b-0",
                      index === 1 && "sm:border-r",
                      index === 2 && "sm:border-r",
                    )}
                  >
                    <div className="text-[11px] font-semibold tracking-wide text-ink-faint">
                      {item.label}
                    </div>
                    <div className="mt-1 text-[15px] font-bold tabular-nums text-ink">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-b border-rule px-5 py-3 text-[12px] text-ink-soft">
                <span>剩餘天數</span>
                <span className="font-bold tabular-nums text-ink">
                  {valuationResult.remainingDays} 天
                </span>
              </div>

              <div className="px-5 py-4">
                <div className="mb-3 text-[13px] font-bold text-ink">
                  標的價格情境
                </div>
                <div className="overflow-x-auto rounded-[7px] border border-rule bg-background">
                  <table className="w-full min-w-115 border-collapse text-left text-[12px]">
                    <thead className="bg-muted/40 text-ink-faint">
                      <tr>
                        <th className="px-3 py-2.5 font-semibold">標的變動</th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          標的價格
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          權證理論價
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          相對目前估值
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {valuationResult.scenarios.map((scenario) => (
                        <tr
                          key={scenario.change}
                          className={cn(
                            "border-t border-rule text-ink-soft",
                            scenario.change === 0 && "bg-brand-soft/50 text-ink",
                          )}
                        >
                          <td className="px-3 py-2.5 font-semibold tabular-nums">
                            {scenario.change > 0 ? "+" : ""}
                            {scenario.change}%
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {scenario.spotPrice.toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-ink">
                            {scenario.theoreticalValue.toFixed(4)}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-2.5 text-right font-semibold tabular-nums",
                              scenario.changeRate > 0 &&
                                "text-emerald-600 dark:text-emerald-400",
                              scenario.changeRate < 0 && "text-destructive",
                            )}
                          >
                            {scenario.changeRate > 0 ? "+" : ""}
                            {scenario.changeRate.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
                  此結果為模型估算，不包含隱含波動率變化、股息、流動性、價差與發行商調整。
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-rule pt-4">
            <button
              onClick={() => setIsManagementOpen(!isManagementOpen)}
              className="flex w-full items-center justify-between text-[13px] font-bold text-ink-soft transition hover:text-brand"
            >
              <span className="flex items-center gap-1.5 uppercase tracking-widest before:inline-block before:h-1 before:w-1 before:rounded-full before:bg-brand before:content-['']">
                數據維護與同步
              </span>
              <span
                className={cn(
                  "transition-transform duration-300",
                  isManagementOpen ? "rotate-180" : "",
                )}
              >
                ▼
              </span>
            </button>

            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                isManagementOpen
                  ? "mt-4 max-h-125 opacity-100"
                  : "max-h-0 opacity-0",
              )}
            >
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={getLiveTWSE}
                    disabled={!dbExists || isLiveFetching}
                    className="flex-1 rounded-[7px] bg-brand/80 p-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-hover active:translate-y-px disabled:bg-muted disabled:text-ink-faint"
                  >
                    {isLiveFetching ? "抓取中..." : "即時查詢證交所"}
                  </button>
                  <button
                    onClick={syncData}
                    disabled={!dbExists || isSyncing}
                    className="flex-1 rounded-[7px] bg-brand/20 p-2.5 text-[13px] font-semibold text-ink-soft transition hover:bg-brand/40 active:translate-y-px disabled:bg-muted disabled:text-ink-faint"
                  >
                    {isSyncing ? "同步中..." : "同步權證庫"}
                  </button>
                </div>

                <button
                  onClick={syncStocks}
                  disabled={!dbExists || isStockSyncing}
                  className="w-full rounded-[7px] bg-brand-soft p-2.5 text-[13px] font-semibold text-brand transition hover:opacity-80 active:translate-y-px disabled:bg-muted disabled:text-ink-faint"
                >
                  {isStockSyncing ? "同步中..." : "更新標的收盤價"}
                </button>

                <div
                  className={cn(
                    "flex flex-col gap-1 text-center text-[11px] leading-relaxed text-ink-faint",
                    !dbExists && "text-destructive",
                  )}
                >
                  <div>{dbStatus}</div>
                  <div>{stockDbStatus}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
