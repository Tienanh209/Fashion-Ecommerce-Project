import { Bell, Search } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext"
import { imgUrl } from "../../utils/image";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router";



function DashboardHeader() {
    const { user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();
  return (
    <header className="border-b bg-white">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Search */}
        <div className="flex-1">
          <div className="relative w-full max-w-lg">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search products, orders, customers..."
              className="h-10 w-full rounded-md border border-neutral-300 bg-neutral-50 pl-10 pr-4 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-neutral-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Bell */}
          <button
            aria-label="Notifications"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-300"
          >
            <Bell className="h-6 w-6 text-neutral-700" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" />
          </button>

          {/* Avatar + name */}
          <div className="flex items-center gap-5">
            <div>
                <button onClick={() => (user ? setMenuOpen((s) => !s) : navigate("/login"))}>
                    {user?.avatar_url == null ? (
                    <img
                    src={imgUrl(user.avatar_url)}
                    alt="avatar"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-700"
                    />) :(
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-700">
                    AD
                    </div>)}
                </button>
                {user && menuOpen && (
                <div
                    className="absolute right-0 mt-2 me-1 w-40 rounded-xl border bg-white shadow-lg"
                    onMouseLeave={() => setMenuOpen(false)}
                >
                    <button
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50 text-red-700"
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
            <div className="leading-tight me-3">
              <p className="text-lg font-medium text-neutral-900">{user.fullname}</p>
              <p className="text-md text-neutral-500">Store Manager</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
