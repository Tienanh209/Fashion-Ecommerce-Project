import { useMemo, useState } from "react";
import { Bell, Search, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { imgUrl } from "../../utils/image";
import { useNavigate } from "react-router";

const SEARCH_DESTINATIONS = [
  {
    title: "Dashboard Overview",
    description: "View sales summaries and alerts",
    path: "/admin",
    keywords: ["dashboard", "overview", "home"],
  },
  {
    title: "Inventory",
    description: "Manage products and stock levels",
    path: "/admin/inventory",
    keywords: ["inventory", "product", "stock", "kho"],
  },
  {
    title: "Customers",
    description: "View customer profiles and loyalty tiers",
    path: "/admin/customers",
    keywords: ["customer", "khach", "user"],
  },
  {
    title: "Orders",
    description: "Track and fulfill recent orders",
    path: "/admin/orders",
    keywords: ["order", "don hang"],
  },
  {
    title: "Sales & Promotions",
    description: "Configure campaign banners and discounts",
    path: "/admin/sales",
    keywords: ["sale", "promotion", "khuyen mai"],
  },
  {
    title: "Reviews",
    description: "Moderate customer reviews",
    path: "/admin/reviews",
    keywords: ["review", "feedback", "danh gia"],
  },
  {
    title: "Add Product",
    description: "Create new product listings",
    path: "/admin/addproduct",
    keywords: ["add", "product", "create"],
  },
];

const ACTIVITY_FEED = [
  {
    id: 1,
    title: "New order #54812",
    detail: "2 sản phẩm tổng 1.950.000₫",
    timestamp: "2 phút trước",
  },
  {
    id: 2,
    title: "Try-on video đã sẵn sàng",
    detail: "Khách hàng Trang L. vừa tạo video mới",
    timestamp: "25 phút trước",
  },
  {
    id: 3,
    title: "Sale Weekend 9.9",
    detail: "Tự động bắt đầu lúc 00:00 hôm nay",
    timestamp: "1 giờ trước",
  },
  {
    id: 4,
    title: "Low stock: Denim Jacket L",
    detail: "Chỉ còn 3 sản phẩm trong kho",
    timestamp: "3 giờ trước",
  },
];

const getInitials = (name = "") => {
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase())
    .slice(0, 2);
  return parts.join("") || "AD";
};

function DashboardHeader() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activities] = useState(ACTIVITY_FEED);
  const navigate = useNavigate();

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return SEARCH_DESTINATIONS.filter((item) =>
      [item.title, item.description, ...(item.keywords || [])]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(query))
    );
  }, [searchQuery]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (!searchResults.length) return;
    const destination = searchResults[0];
    navigate(destination.path);
    setSearchQuery("");
    setSearchFocused(false);
  };

  const handleSelectResult = (result) => {
    navigate(result.path);
    setSearchQuery("");
    setSearchFocused(false);
  };

  const avatarInitials = getInitials(user?.fullname || "");
  const avatarUrl = user?.avatar_url ? imgUrl(user.avatar_url) : "";

  return (
    <header className="border-b bg-white">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Search */}
        <div className="flex-1">
          <form
            className="relative w-full max-w-lg"
            onSubmit={handleSearchSubmit}
            autoComplete="off"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search products, orders, customers..."
              className="h-10 w-full rounded-md border border-neutral-300 bg-neutral-50 pl-10 pr-4 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-neutral-400"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchFocused && searchResults.length > 0 ? (
              <div className="absolute left-0 right-0 top-11 z-20 rounded-xl border border-neutral-200 bg-white shadow-xl">
                {searchResults.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    className="w-full px-4 py-3 text-left text-sm hover:bg-neutral-50"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelectResult(item)}
                  >
                    <p className="font-semibold text-neutral-900">{item.title}</p>
                    <p className="text-xs text-neutral-500">{item.description}</p>
                  </button>
                ))}
              </div>
            ) : null}
            {searchFocused && searchQuery.trim() && searchResults.length === 0 ? (
              <div className="absolute left-0 right-0 top-11 z-20 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-500 shadow-xl">
                Không tìm thấy mục phù hợp.
              </div>
            ) : null}
          </form>
        </div>

        <div className="flex items-center gap-4">
          {/* Bell */}
          <button
            aria-label="Notifications"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-300"
            onClick={() => setNotificationsOpen(true)}
          >
            <Bell className="h-6 w-6 text-neutral-700" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" />
          </button>

          {/* Avatar + name */}
          <div className="flex items-center gap-5">
            <div>
              <button
                className="relative"
                onClick={() => (user ? setMenuOpen((s) => !s) : navigate("/login"))}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700">
                    {avatarInitials}
                  </div>
                )}
              </button>
              {user && menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-40 rounded-xl border bg-white shadow-lg"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <button
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-red-700 hover:bg-neutral-50"
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
              <p className="text-lg font-medium text-neutral-900">
                {user?.fullname || "Store Manager"}
              </p>
              <p className="text-md text-neutral-500">Store Manager</p>
            </div>
          </div>
        </div>
      </div>

      {notificationsOpen ? (
        <div className="fixed inset-0 z-30">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setNotificationsOpen(false)}
          />
          <div className="absolute right-6 top-16 w-full max-w-md rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Hoạt động mới
                </p>
                <p className="text-lg font-semibold text-neutral-900">
                  Trung tâm thông báo
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100"
                onClick={() => setNotificationsOpen(false)}
                aria-label="Đóng thông báo"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              {activities.length === 0 ? (
                <p className="py-6 text-center text-sm text-neutral-500">
                  Không có thông báo mới.
                </p>
              ) : (
                <ul className="space-y-3">
                  {activities.map((activity) => (
                    <li
                      key={activity.id}
                      className="rounded-2xl border border-neutral-200 p-4 hover:border-neutral-300"
                    >
                      <p className="text-sm font-semibold text-neutral-900">
                        {activity.title}
                      </p>
                      <p className="text-xs text-neutral-500">{activity.detail}</p>
                      <p className="mt-2 text-xs font-medium text-neutral-400">
                        {activity.timestamp}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export default DashboardHeader;
