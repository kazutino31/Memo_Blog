import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

export default function BaseLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isReading = location.pathname.startsWith("/notes/");
  const [progress, setProgress] = useState(0);

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
    <div className={isReading ? "reading" : undefined}>
      <div id="progress" style={{ width: `${progress}%` }} />
      <nav className="topnav">
        <div className="topnav-inner">
          <Link className="brand" to="/">
            Memo<span>Blog</span>
          </Link>
          <button className="back-link" onClick={() => navigate("/")}>
            <svg
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
      </nav>
      <Outlet />
    </div>
  );
}
