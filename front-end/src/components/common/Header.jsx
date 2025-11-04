import { NavLink, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { imgUrl } from "../../utils/image";
import { getCart } from "../../services/carts";

function formatInitials(source) {
  const trimmed = (source || "").trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    const first = Array.from(words[0] || "")[0] || "";
    const second = Array.from(words[1] || "")[0] || "";
    const combined = `${first}${second}`.trim();
    if (combined) return combined.toUpperCase();
  }

  const letters = Array.from((words[0] || trimmed).replace(/\s+/g, ""));
  if (letters.length === 0) return "";
  if (letters.length === 1) {
    const char = letters[0];
    return `${char}${char}`.toUpperCase();
  }
  return `${letters[0]}${letters[1]}`.toUpperCase();
}

function getUserInitials(info) {
  if (!info) return "";

  const candidates = [
    info.fullname,
    "TA"
  ];
  for (const candidate of candidates) {
    const value = formatInitials(candidate);
    if (value) return value;
  }

  const emailCandidates = [info.email, info.user?.email]
    .filter(Boolean)
    .map((email) => email.split("@")[0] || email);
  for (const candidate of emailCandidates) {
    const value = formatInitials(candidate);
    if (value) return value;
  }

  return "??";
}

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [term, setTerm] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [hasNewOrder, setHasNewOrder] = useState(
    () => localStorage.getItem("hasNewOrder") === "1"
  );

  // Search
  const onSubmit = (e) => {
    e.preventDefault();
    const q = term.trim();
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  };

  // Sum qty for cart badge
  function computeCount(lines) {
    return (lines || []).reduce((s, it) => s + Number(it.quantity || 0), 0);
  }

  // Load cart count (mặc định 0 khi chưa đăng nhập)
  async function refreshCartCount() {
    try {
      if (!user) {
        setCartCount(0);
        return;
      }
      const uid =
        user?.user_id ??
        user?.id ??
        user?.user?.user_id ??
        user?.user?.id ??
        null;
      if (!uid) return;
      const { items = [] } = await getCart(uid);
      setCartCount(computeCount(items));
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    refreshCartCount();
  }, [user]);

  useEffect(() => {
    const onCount = (e) => {
      if (typeof e?.detail?.count === "number") {
        setCartCount(e.detail.count);
      }
    };
    const onRefresh = () => refreshCartCount();

    window.addEventListener("cart:count", onCount);
    window.addEventListener("cart:refresh", onRefresh);
    return () => {
      window.removeEventListener("cart:count", onCount);
      window.removeEventListener("cart:refresh", onRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setHasNewOrder(localStorage.getItem("hasNewOrder") === "1");
    }, 800);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="container mx-auto flex items-center justify-between px-6 py-3">
        <div
          className="font-extrabold text-3xl tracking-tight cursor-pointer"
          onClick={() => navigate("/")}
        >
          TA.<span className="text-gray-400">SHOP</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-[18px] font-medium text-gray-700">
          <NavLink to="/" className="relative group">
            Home
            <span className="absolute bottom-[-4px] left-0 w-0 h-[2px] bg-black transition-all group-hover:w-full" />
          </NavLink>
          <NavLink to="/shop" className="relative group">
            Shop
            <span className="absolute bottom-[-4px] left-0 w-0 h-[2px] bg-black transition-all group-hover:w-full" />
          </NavLink>
          <NavLink to="/virtual-tryon" className="relative group">
            Virtual Try-on
            <span className="absolute bottom-[-4px] left-0 w-0 h-[2px] bg-black transition-all group-hover:w-full" />
          </NavLink>
          <NavLink to="/about-us" className="relative group">
            About Us
            <span className="absolute bottom-[-4px] left-0 w-0 h-[2px] bg-black transition-all group-hover:w-full" />
          </NavLink>
        </nav>

        <div className="flex items-center gap-4">
          {/* Search */}
          <form onSubmit={onSubmit} className="hidden md:block relative z-10">
            <div className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 focus-within:ring-1 focus-within:ring-black/50 transition">
              <button type="submit" aria-label="Search">
                <svg width="18" height="18" viewBox="0 0 24 24" className="text-gray-500">
                  <path
                    fill="currentColor"
                    d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.471 6.471 0 0 0 4.23-1.57l.27.28v.79L20 21.49 21.49 20zM9.5 14A4.5 4.5 0 1 1 14 9.5 4.505 4.505 0 0 1 9.5 14"
                  />
                </svg>
              </button>
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-40 lg:w-56 outline-none text-sm bg-transparent placeholder:text-gray-400"
                placeholder="Search for products…"
              />
            </div>
          </form>

          {/* Account */}
          <div className="relative">
            <button
              aria-label="Account"
              onClick={() => (user ? setMenuOpen((s) => !s) : navigate("/login"))}
              className="relative p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              {user ? (
                user?.avatar_url == null ? (
                  <img
                    src={imgUrl(user.avatar_url)}
                    alt="avatar"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-md font-semibold uppercase text-gray-700">
                    {getUserInitials(user)}
                  </span>
                )
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-800"
                >
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
              {user && hasNewOrder && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-600" />
              )}
            </button>

            {/* Dropdown (click) */}
            {user && menuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-2xl border bg-white shadow-lg p-3"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <div className="px-2 py-1 text-sm text-gray-500">Hello,</div>
                <div className="px-2 pb-2 font-semibold truncate">
                  {user.fullname || user.email}
                </div>
                <div className="h-px bg-gray-100 my-2" />

                <button
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/account");
                  }}
                >
                  See profile
                </button>

                <button
                  className="relative w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50"
                  onClick={() => {
                    localStorage.removeItem("hasNewOrder");
                    setHasNewOrder(false);
                    setMenuOpen(false);
                    navigate("/orders");
                  }}
                >
                  <span className="relative inline-block">
                    Orders
                    {hasNewOrder && (
                      <span className="absolute -top-1 -right-2 h-2.5 w-2.5 rounded-full bg-red-600" />
                    )}
                  </span>
                </button>

                <button
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50 text-red-600"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>

          {/* Cart */}
          <button
            aria-label="Cart"
            onClick={() => navigate("/cart")}
            className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="25"
              height="25"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-800"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>

            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-[18px] text-center">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
