import {
  LayoutGrid,
  ClipboardList,
  Boxes,
  SquarePlus,
  Users,
  BarChart2,
  Settings as SettingsIcon,
  Store,
  Tags,
  MessageSquare,
  Truck,
} from "lucide-react";
import { NavLink } from "react-router";

const nav = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid, to: "/admin", end: true },
  { key: "order-management", label: "Order Management", icon: ClipboardList, to: "/admin/orders" },
  { key: "inventory", label: "Inventory", icon: Boxes, to: "/admin/inventory" },
  { key: "purchase-orders", label: "Purchase Orders", icon: Truck, to: "/admin/purchase-orders" },
  { key: "add-product", label: "Add Product", icon: SquarePlus, to: "/admin/addproduct" },
  { key: "sales", label: "Sales", icon: Tags, to: "/admin/sales" },
  { key: "reviews", label: "Reviews", icon: MessageSquare, to: "/admin/reviews" },
  { key: "customers", label: "Customers", icon: Users, to: "/admin/customers" },
  { key: "analytics", label: "Analytics", icon: BarChart2, to: "/admin/analytics" },
  { key: "settings", label: "Settings", icon: SettingsIcon, to: "/admin/settings" },
];

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col bg-[#181615] text-neutral-200">
      {/* Brand block */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#C9A06A] text-[#1b1817]">
            <Store className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-bold tracking-wide text-neutral-50">
              TA.<span className="text-gray-400">LAB</span>
            </div>
            <div className="text-xs text-neutral-400">Admin</div>
          </div>
        </div>
        <div className="mt-4 border-b border-white/10" />
      </div>

      {/* Menu */}
      <nav className="px-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-neutral-400">
          Menu
        </p>
        <ul className="flex flex-col gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-neutral-300 hover:bg-white/5 hover:text-white",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={[
                          "h-4 w-4 shrink-0",
                          isActive ? "text-white" : "text-neutral-300",
                        ].join(" ")}
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* spacer để đẩy menu lên trên nếu cần */}
      <div className="flex-1" />
    </aside>
  );
}
