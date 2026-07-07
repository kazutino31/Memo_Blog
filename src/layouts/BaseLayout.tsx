import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export default function BaseLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isReading = location.pathname.startsWith("/notes/");
  const [progress, setProgress] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    function onScroll() {
      if (!isReading) {
        setProgress(0);
        return;
      }
      const h = document.documentElement;
      const scrolled =
        (h.scrollTop / (h.scrollHeight - h.clientHeight || 1)) * 100;
      setProgress(scrolled);
    }
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isReading]);

  return (
    <div>
      <div
        className="fixed top-0 left-0 z-[200] h-0.5 bg-[var(--accent)] transition-[width] duration-100 ease-linear"
        style={{ width: `${progress}%` }}
      />
      <nav className="sticky top-0 z-[100] border-b border-[var(--rule)] bg-white/88 backdrop-blur-md dark:bg-[#16161a]/88">
        <div className="mx-auto flex max-w-[920px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link
              className={cn(
                "cursor-pointer text-[19px] font-bold tracking-tight text-[var(--ink)] no-underline select-none [font-family:var(--serif)]",
                isReading && "hidden",
              )}
              to="/"
            >
              <span className="text-[var(--accent-ink)]">Memo</span>
            </Link>
            <button
              className={cn(
                "hidden cursor-pointer items-center gap-1.5 border-none bg-transparent text-sm font-medium text-[var(--ink-soft)] no-underline hover:text-[var(--ink)]",
                isReading && "inline-flex",
              )}
              onClick={() => navigate("/")}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              返回目錄
            </button>
          </div>
          <div className="flex items-center gap-4">
            {location.pathname === "/" && (
              <Link
                to="/calculator"
                className="hidden sm:inline-block text-sm font-medium text-[var(--ink-soft)] no-underline hover:text-[var(--ink)] transition-colors"
              >
                權證試算
              </Link>
            )}
            {location.pathname === "/" && (
            <ThemeToggle />
            )}
            {/* 漢堡選單（手機端） */}
            {location.pathname === "/" && (
            <button
              className="sm:hidden cursor-pointer border-none bg-transparent p-0 text-[var(--ink-soft)] hover:text-[var(--ink)]"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="開啟選單"
            >
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                {isMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <>
                    <path d="M3 6h18" />
                    <path d="M3 12h18" />
                    <path d="M3 18h18" />
                  </>
                )}
              </svg>
            </button>
            )}
          </div>
        </div>
        {/* 下拉菜單（手機端） */}
        {isMenuOpen && location.pathname === "/" && (
          <div className="sm:hidden border-t border-[var(--rule)] bg-white/88 backdrop-blur-md dark:bg-[#16161a]/88">
            <div className="mx-auto max-w-[920px] px-6 py-3">
              <Link
                to="/calculator"
                className="block text-sm font-medium text-[var(--ink-soft)] no-underline hover:text-[var(--ink)] transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                權證試算
              </Link>
            </div>
          </div>
        )}
      </nav>
      <Outlet />
    </div>
  );
}
